import pytesseract
from PIL import Image
import cv2
import numpy as np
from typing import Dict, List, Any
import base64
from io import BytesIO
import openai
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
import boto3

from ..config import settings

class OCREngine:
    """Multi-engine OCR processing for paper forms"""
    
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Azure Form Recognizer
        if settings.AZURE_FORM_RECOGNIZER_ENDPOINT:
            self.azure_client = DocumentAnalysisClient(
                endpoint=settings.AZURE_FORM_RECOGNIZER_ENDPOINT,
                credential=AzureKeyCredential(settings.AZURE_FORM_RECOGNIZER_KEY)
            )
        
        # AWS Textract
        if settings.AWS_ACCESS_KEY_ID:
            self.textract_client = boto3.client(
                'textract',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
    
    async def initialize(self):
        """Initialize OCR engines"""
        pass
    
    async def process_image(self, image_file) -> Dict:
        """Process image with multiple OCR engines for best results"""
        
        # Read image
        image_bytes = await image_file.read()
        image = Image.open(BytesIO(image_bytes))
        
        results = {}
        
        # 1. OpenAI Vision
        try:
            openai_result = await self.process_with_openai_vision(image_bytes)
            results['openai_vision'] = openai_result
        except Exception as e:
            results['openai_vision'] = {"error": str(e)}
        
        # 2. Tesseract OCR
        try:
            tesseract_result = self.process_with_tesseract(image)
            results['tesseract'] = tesseract_result
        except Exception as e:
            results['tesseract'] = {"error": str(e)}
        
        # 3. Azure Form Recognizer
        try:
            if hasattr(self, 'azure_client'):
                azure_result = await self.process_with_azure(image_bytes)
                results['azure'] = azure_result
        except Exception as e:
            results['azure'] = {"error": str(e)}
        
        # Combine results using best confidence
        final_result = self.combine_ocr_results(results)
        
        return final_result
    
    async def process_with_openai_vision(self, image_bytes: bytes) -> Dict:
        """Process image using OpenAI Vision"""
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Extract all public health data from this form image.
                            Look for:
                            - Tables
                            - Handwritten numbers and text
                            - Dates
                            - Locations
                            - Health indicators
                            - Patient demographics
                            - Vaccination records
                            - Drug inventory counts
                            
                            Provide the extracted text and confidence level."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        return {
            "text": response.choices[0].message.content,
            "confidence": 0.9,
            "engine": "openai_vision"
        }
    
    def process_with_tesseract(self, image: Image.Image) -> Dict:
        """Process image using Tesseract OCR"""
        # Preprocess image
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply thresholding
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(thresh)
        
        # OCR
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(denoised, config=custom_config)
        
        # Get confidence
        data = pytesseract.image_to_data(denoised, config=custom_config, output_type=pytesseract.Output.DICT)
        confidence = np.mean([int(conf) for conf in data['conf'] if conf != '-1']) / 100
        
        return {
            "text": text,
            "confidence": confidence,
            "engine": "tesseract"
        }
    
    async def process_with_azure(self, image_bytes: bytes) -> Dict:
        """Process image using Azure Form Recognizer"""
        poller = self.azure_client.begin_analyze_document(
            "prebuilt-document",
            document=image_bytes
        )
        result = poller.result()
        
        text = ""
        for page in result.pages:
            for line in page.lines:
                text += line.content + "\n"
        
        return {
            "text": text,
            "confidence": result.pages[0].lines[0].confidence if result.pages[0].lines else 0.9,
            "engine": "azure"
        }
    
    def combine_ocr_results(self, results: Dict) -> Dict:
        """Combine results from multiple OCR engines"""
        texts = []
        confidences = []
        
        for engine, result in results.items():
            if 'error' not in result and result.get('text'):
                texts.append(result['text'])
                confidences.append(result.get('confidence', 0))
        
        if not texts:
            return {
                "text": "",
                "confidence": 0,
                "needs_human_review": True
            }
        
        # Use text with highest confidence
        best_idx = confidences.index(max(confidences))
        best_text = texts[best_idx]
        best_confidence = confidences[best_idx]
        
        return {
            "text": best_text,
            "confidence": best_confidence,
            "needs_human_review": best_confidence < 0.85,
            "all_results": results
        }
    