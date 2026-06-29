"""
OCR Processor - Multi-engine OCR for paper forms and documents
"""
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np
import base64
from io import BytesIO
from typing import Dict, List, Optional, Any, Tuple
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class OCRProcessor:
    """Multi-engine OCR processor with preprocessing pipeline"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=3)
        self.daily_count = 0
        self.last_reset = datetime.now()
        
        # OCR configuration
        self.tesseract_config = {
            'oem': 3,  # LSTM + Legacy engine
            'psm': 6,  # Assume uniform block of text
            'lang': 'eng',
            'config': '--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()-/ '
        }
        
        # Field patterns for health forms
        self.field_patterns = {
            'patient_name': r'(?:Name|Patient)[:\s]*([A-Za-z\s]+)',
            'age': r'(?:Age)[:\s]*(\d+)',
            'date': r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            'vaccine_type': r'(?:Vaccine|Immunization)[:\s]*([A-Za-z\s]+)',
            'dose': r'(?:Dose|Number)[:\s]*(\d+)',
            'facility': r'(?:Facility|Clinic|Center)[:\s]*([A-Za-z\s]+)',
            'weight': r'(?:Weight)[:\s]*(\d+\.?\d*)\s*(?:kg|kgs|kilograms)?',
            'temperature': r'(?:Temperature|Temp)[:\s]*(\d+\.?\d*)',
            'blood_pressure': r'(?:BP|Blood Pressure)[:\s]*(\d+/\d+)',
            'diagnosis': r'(?:Diagnosis|Condition)[:\s]*([A-Za-z\s]+)',
            'medication': r'(?:Medication|Drug|Prescribed)[:\s]*([A-Za-z\s]+)',
            'referral': r'(?:Referral|Referred to)[:\s]*([A-Za-z\s]+)'
        }
    
    async def process(self, image_data: bytes) -> Dict:
        """
        Process image with OCR
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            # Increment counter
            self._check_daily_reset()
            self.daily_count += 1
            
            # Load image
            image = Image.open(BytesIO(image_data))
            
            # Preprocess image
            processed_images = await self._preprocess_image(image)
            
            # Run OCR with multiple configurations
            ocr_results = await self._run_multi_ocr(processed_images)
            
            # Post-process results
            final_result = self._post_process(ocr_results)
            
            # Extract structured fields
            structured_data = self._extract_fields(final_result['text'])
            
            # Assess quality
            quality = self._assess_quality(final_result)
            
            return {
                'text': final_result['text'],
                'confidence': final_result['confidence'],
                'structured_data': structured_data,
                'quality': quality,
                'needs_review': quality['score'] < 0.7,
                'processing_time': final_result['processing_time'],
                'image_quality': self._assess_image_quality(image)
            }
            
        except Exception as e:
            logger.error(f"OCR processing error: {e}")
            return {
                'text': '',
                'confidence': 0,
                'error': str(e),
                'needs_review': True
            }
    
    async def _preprocess_image(self, image: Image.Image) -> Dict[str, np.ndarray]:
        """Preprocess image for better OCR accuracy"""
        try:
            # Convert to numpy array
            img_array = np.array(image)
            
            # Convert to grayscale if needed
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            processed = {}
            
            # Original grayscale
            processed['original'] = gray
            
            # Denoised
            processed['denoised'] = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            
            # Adaptive thresholding
            processed['adaptive'] = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                11, 2
            )
            
            # Otsu's thresholding
            _, processed['otsu'] = cv2.threshold(
                gray, 0, 255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
            
            # Sharpened
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            processed['sharpened'] = cv2.filter2D(gray, -1, kernel)
            
            # Contrast enhanced
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            processed['contrast'] = clahe.apply(gray)
            
            # Morphological operations (remove noise)
            kernel = np.ones((1, 1), np.uint8)
            processed['morph'] = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
            
            return processed
            
        except Exception as e:
            logger.error(f"Image preprocessing error: {e}")
            return {'original': np.array(image)}
    
    async def _run_multi_ocr(self, processed_images: Dict[str, np.ndarray]) -> List[Dict]:
        """Run OCR with multiple preprocessing variants"""
        results = []
        
        for variant_name, img_array in processed_images.items():
            try:
                # Convert back to PIL Image
                pil_image = Image.fromarray(img_array)
                
                # Run Tesseract OCR
                text = pytesseract.image_to_string(
                    pil_image,
                    config=self.tesseract_config['config']
                )
                
                # Get confidence scores
                data = pytesseract.image_to_data(
                    pil_image,
                    config=self.tesseract_config['config'],
                    output_type=pytesseract.Output.DICT
                )
                
                # Calculate confidence
                confidences = [
                    int(conf) for conf in data['conf'] 
                    if conf != '-1' and int(conf) > 0
                ]
                
                avg_confidence = np.mean(confidences) / 100 if confidences else 0
                
                results.append({
                    'text': text,
                    'confidence': avg_confidence,
                    'variant': variant_name,
                    'word_count': len(text.split()),
                    'char_count': len(text)
                })
                
            except Exception as e:
                logger.error(f"OCR error for variant {variant_name}: {e}")
                results.append({
                    'text': '',
                    'confidence': 0,
                    'variant': variant_name
                })
        
        return results
    
    def _post_process(self, ocr_results: List[Dict]) -> Dict:
        """Post-process OCR results"""
        if not ocr_results:
            return {
                'text': '',
                'confidence': 0,
                'processing_time': 0
            }
        
        # Filter out poor results
        valid_results = [r for r in ocr_results if r['confidence'] > 0.3]
        
        if not valid_results:
            valid_results = ocr_results
        
        # Find best result by confidence and text length
        best_result = max(
            valid_results,
            key=lambda x: (x['confidence'] * 0.7 + min(x['char_count'] / 1000, 1) * 0.3)
        )
        
        # Clean text
        cleaned_text = self._clean_text(best_result['text'])
        
        return {
            'text': cleaned_text,
            'confidence': best_result['confidence'],
            'variant_used': best_result['variant'],
            'all_results': ocr_results,
            'processing_time': 0  # Would be calculated
        }
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        if not text:
            return ''
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters (keep basic punctuation)
        text = re.sub(r'[^\w\s.,;:!?()\-/]', '', text)
        
        # Fix common OCR errors
        replacements = {
            '0': 'O',  # Zero to O (context-dependent)
            '1': 'l',  # One to l
            '|': 'I',  # Pipe to I
        }
        
        # Don't apply replacements globally as it depends on context
        
        # Strip whitespace
        text = text.strip()
        
        return text
    
    def _extract_fields(self, text: str) -> Dict:
        """Extract structured fields from OCR text"""
        fields = {}
        
        for field_name, pattern in self.field_patterns.items():
            try:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    if value:
                        fields[field_name] = value
            except:
                pass
        
        # Extract table data if present
        tables = self._extract_tables(text)
        if tables:
            fields['tables'] = tables
        
        # Extract lists
        lists = self._extract_lists(text)
        if lists:
            fields['lists'] = lists
        
        return fields
    
    def _extract_tables(self, text: str) -> List[Dict]:
        """Extract table structures from text"""
        tables = []
        
        # Look for tabular patterns (numbers aligned in columns)
        lines = text.split('\n')
        current_table = []
        
        for line in lines:
            # Check if line looks like table row (multiple numbers/words separated by spaces)
            parts = line.split()
            if len(parts) >= 3 and any(p.replace('.', '').isdigit() for p in parts):
                current_table.append(parts)
            else:
                if len(current_table) >= 2:  # At least header + data row
                    tables.append({
                        'headers': current_table[0] if current_table else [],
                        'rows': current_table[1:] if len(current_table) > 1 else [],
                        'row_count': len(current_table) - 1
                    })
                current_table = []
        
        # Don't forget last table
        if len(current_table) >= 2:
            tables.append({
                'headers': current_table[0],
                'rows': current_table[1:],
                'row_count': len(current_table) - 1
            })
        
        return tables
    
    def _extract_lists(self, text: str) -> List[str]:
        """Extract list items from text"""
        lists = []
        
        # Look for numbered or bulleted lists
        list_patterns = [
            r'^\s*[\d]+[\.\)]\s+(.+)',  # Numbered: 1. Item
            r'^\s*[\-\*•]\s+(.+)',       # Bulleted: - Item
            r'^\s*[a-zA-Z][\.\)]\s+(.+)' # Lettered: a. Item
        ]
        
        for line in text.split('\n'):
            for pattern in list_patterns:
                match = re.match(pattern, line)
                if match:
                    lists.append(match.group(1).strip())
                    break
        
        return lists
    
    def _assess_quality(self, ocr_result: Dict) -> Dict:
        """Assess OCR quality"""
        quality = {
            'score': ocr_result.get('confidence', 0),
            'level': 'poor',
            'issues': []
        }
        
        # Determine quality level
        if quality['score'] >= 0.85:
            quality['level'] = 'good'
        elif quality['score'] >= 0.7:
            quality['level'] = 'fair'
        else:
            quality['level'] = 'poor'
        
        # Check for common issues
        text = ocr_result.get('text', '')
        
        if len(text) < 10:
            quality['issues'].append('Very little text extracted')
        
        if '?' in text or '???' in text:
            quality['issues'].append('Contains unrecognized characters')
        
        # Check for garbled text
        non_alpha_ratio = sum(1 for c in text if not c.isalnum() and c != ' ') / max(len(text), 1)
        if non_alpha_ratio > 0.3:
            quality['issues'].append('High ratio of non-alphanumeric characters')
        
        # Check word coherence
        words = text.split()
        if words:
            avg_word_length = sum(len(w) for w in words) / len(words)
            if avg_word_length > 15:
                quality['issues'].append('Abnormally long words (possible merged text)')
            elif avg_word_length < 2:
                quality['issues'].append('Abnormally short words (possible fragmented text)')
        
        return quality
    
    def _assess_image_quality(self, image: Image.Image) -> Dict:
        """Assess input image quality"""
        img_array = np.array(image.convert('L'))  # Convert to grayscale
        
        quality = {
            'resolution': f"{image.size[0]}x{image.size[1]}",
            'is_blurry': False,
            'has_good_contrast': False,
            'is_skewed': False,
            'lighting': 'adequate'
        }
        
        # Check resolution
        if image.size[0] < 500 or image.size[1] < 500:
            quality['resolution_warning'] = 'Low resolution may affect OCR accuracy'
        
        # Check blur
        laplacian_var = cv2.Laplacian(img_array, cv2.CV_64F).var()
        quality['is_blurry'] = laplacian_var < 100
        
        # Check contrast
        contrast = img_array.std()
        quality['has_good_contrast'] = contrast > 50
        
        # Check lighting
        mean_brightness = img_array.mean()
        if mean_brightness < 50:
            quality['lighting'] = 'too_dark'
        elif mean_brightness > 200:
            quality['lighting'] = 'too_bright'
        
        return quality
    
    def _check_daily_reset(self):
        """Reset daily counter if needed"""
        now = datetime.now()
        if now.date() != self.last_reset.date():
            self.daily_count = 0
            self.last_reset = now
    
    def get_daily_count(self) -> int:
        """Get daily OCR processing count"""
        self._check_daily_reset()
        return self.daily_count
    
    async def process_batch(self, images: List[bytes]) -> List[Dict]:
        """Process multiple images in parallel"""
        tasks = [self.process(img) for img in images]
        return await asyncio.gather(*tasks)