"""
Image Analyzer - Analyze health-related images
"""
import cv2
import numpy as np
from PIL import Image
from io import BytesIO
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
import base64
import openai

logger = logging.getLogger(__name__)

class ImageAnalyzer:
    """Analyze medical and health-related images"""
    
    def __init__(self):
        self.analysis_types = {
            'document': self._analyze_document,
            'facility': self._analyze_facility,
            'chart': self._analyze_chart,
            'medicine': self._analyze_medicine,
            'general': self._analyze_general
        }
    
    async def analyze(self, image_data: bytes, analysis_type: str = 'auto') -> Dict:
        """
        Analyze image
        
        Args:
            image_data: Image bytes
            analysis_type: Type of analysis or 'auto' for automatic detection
            
        Returns:
            Analysis results
        """
        try:
            # Load image
            image = Image.open(BytesIO(image_data))
            img_array = np.array(image)
            
            # Auto-detect type if needed
            if analysis_type == 'auto':
                analysis_type = self._detect_image_type(img_array)
            
            # Perform analysis
            if analysis_type in self.analysis_types:
                result = await self.analysis_types[analysis_type](img_array)
            else:
                result = await self._analyze_general(img_array)
            
            # Get AI description if needed
            if result.get('needs_description', False):
                description = await self._get_ai_description(image_data, analysis_type)
                result['ai_description'] = description
            
            return {
                'analysis_type': analysis_type,
                'result': result,
                'timestamp': datetime.utcnow().isoformat(),
                'confidence': result.get('confidence', 0.8)
            }
            
        except Exception as e:
            logger.error(f"Image analysis error: {e}")
            return {
                'analysis_type': 'error',
                'error': str(e),
                'confidence': 0
            }
    
    def _detect_image_type(self, img_array: np.ndarray) -> str:
        """Auto-detect the type of image"""
        # Convert to grayscale for analysis
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Check for text density (document)
        edges = cv2.Canny(gray, 50, 150)
        text_density = np.sum(edges > 0) / edges.size
        
        if text_density > 0.1:
            return 'document'
        
        # Check for chart patterns
        if self._has_chart_patterns(gray):
            return 'chart'
        
        # Check color distribution for facility photos
        if len(img_array.shape) == 3:
            color_var = np.std(img_array, axis=(0, 1)).mean()
            if color_var > 50:
                return 'facility'
        
        return 'general'
    
    def _has_chart_patterns(self, gray: np.ndarray) -> bool:
        """Detect if image contains charts/graphs"""
        # Look for horizontal and vertical lines (axis)
        horizontal = cv2.filter2D(gray, -1, np.array([[-1,-1,-1],[2,2,2],[-1,-1,-1]]))
        vertical = cv2.filter2D(gray, -1, np.array([[-1,2,-1],[-1,2,-1],[-1,2,-1]]))
        
        h_lines = np.sum(np.abs(horizontal) > 100) / horizontal.size
        v_lines = np.sum(np.abs(vertical) > 100) / vertical.size
        
        return h_lines > 0.05 or v_lines > 0.05
    
    async def _analyze_document(self, img_array: np.ndarray) -> Dict:
        """Analyze document image quality"""
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        analysis = {
            'type': 'document',
            'quality_metrics': {}
        }
        
        # Check sharpness
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        analysis['quality_metrics']['sharpness'] = {
            'value': float(laplacian_var),
            'status': 'good' if laplacian_var > 100 else 'poor'
        }
        
        # Check contrast
        contrast = gray.std()
        analysis['quality_metrics']['contrast'] = {
            'value': float(contrast),
            'status': 'good' if contrast > 50 else 'poor'
        }
        
        # Check skew
        coords = np.column_stack(np.where(gray < 128))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = 90 + angle
            analysis['quality_metrics']['skew'] = {
                'value': float(angle),
                'status': 'good' if abs(angle) < 5 else 'needs_correction'
            }
        
        # Check completeness
        border_pixels = np.concatenate([
            gray[0, :], gray[-1, :], gray[:, 0], gray[:, -1]
        ])
        completeness = 1 - (np.sum(border_pixels < 50) / len(border_pixels))
        analysis['quality_metrics']['completeness'] = {
            'value': float(completeness),
            'status': 'good' if completeness > 0.9 else 'incomplete'
        }
        
        # Overall quality
        metrics = analysis['quality_metrics']
        good_metrics = sum(
            1 for m in metrics.values()
            if m['status'] == 'good'
        )
        analysis['overall_quality'] = good_metrics / len(metrics)
        analysis['is_usable'] = analysis['overall_quality'] >= 0.5
        
        return analysis
    
    async def _analyze_facility(self, img_array: np.ndarray) -> Dict:
        """Analyze facility photos"""
        analysis = {
            'type': 'facility',
            'detected_items': [],
            'conditions': {}
        }
        
        # Detect common facility items
        # This would use object detection models in production
        # For now, using basic image analysis
        
        # Color analysis for cleanliness
        if len(img_array.shape) == 3:
            mean_colors = img_array.mean(axis=(0, 1))
            brightness = mean_colors.mean()
            
            analysis['conditions']['lighting'] = {
                'brightness': float(brightness),
                'assessment': 'adequate' if 50 < brightness < 200 else 'poor'
            }
        
        return analysis
    
    async def _analyze_chart(self, img_array: np.ndarray) -> Dict:
        """Analyze charts and graphs"""
        analysis = {
            'type': 'chart',
            'chart_type': 'unknown',
            'data_extracted': False
        }
        
        # Detect chart type
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Look for pie charts (circular shapes)
        circles = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=100,
            param1=50,
            param2=30,
            minRadius=50,
            maxRadius=500
        )
        
        if circles is not None:
            analysis['chart_type'] = 'pie_chart'
            analysis['detected_segments'] = len(circles[0])
        
        # Look for bar charts (rectangular bars)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        rectangles = 0
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = w / h if h > 0 else 0
            if 0.2 < aspect_ratio < 5 and w > 20 and h > 20:
                rectangles += 1
        
        if rectangles > 3:
            analysis['chart_type'] = 'bar_chart'
            analysis['detected_bars'] = rectangles
        
        return analysis
    
    async def _analyze_medicine(self, img_array: np.ndarray) -> Dict:
        """Analyze medicine/drug images"""
        analysis = {
            'type': 'medicine',
            'detected': []
        }
        
        # Look for text labels
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Text detection (simplified)
        mser = cv2.MSER_create()
        regions, _ = mser.detectRegions(gray)
        
        text_regions = len(regions)
        analysis['text_regions_detected'] = text_regions
        analysis['has_identifiable_text'] = text_regions > 5
        
        return analysis
    
    async def _analyze_general(self, img_array: np.ndarray) -> Dict:
        """General image analysis"""
        analysis = {
            'type': 'general',
            'properties': {},
            'needs_description': True
        }
        
        # Basic properties
        analysis['properties']['dimensions'] = {
            'width': img_array.shape[1],
            'height': img_array.shape[0]
        }
        
        if len(img_array.shape) == 3:
            analysis['properties']['channels'] = img_array.shape[2]
            analysis['properties']['color'] = True
            
            # Color distribution
            mean_colors = img_array.mean(axis=(0, 1))
            analysis['properties']['mean_colors'] = {
                'red': float(mean_colors[0]),
                'green': float(mean_colors[1]),
                'blue': float(mean_colors[2])
            }
        else:
            analysis['properties']['color'] = False
        
        # Brightness
        if len(img_array.shape) == 3:
            brightness = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY).mean()
        else:
            brightness = img_array.mean()
        
        analysis['properties']['brightness'] = float(brightness)
        
        return analysis
    
    async def _get_ai_description(self, image_data: bytes, image_type: str) -> str:
        """Get AI description of image using OpenAI Vision"""
        try:
            client = openai.OpenAI()
            
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            response = client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Describe this {image_type} image in the context of public health. Note any relevant details, issues, or observations."
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
                max_tokens=300
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI description error: {e}")
            return "AI description unavailable"