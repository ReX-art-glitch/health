"""
Form Recognizer - Intelligent form structure recognition
"""
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
import logging
from datetime import datetime
import re
import json

logger = logging.getLogger(__name__)

class FormRecognizer:
    """Recognize and extract structured data from forms"""
    
    def __init__(self):
        self.form_templates = {
            'vaccination_record': {
                'fields': [
                    'child_name', 'date_of_birth', 'vaccine_type',
                    'dose_number', 'date_administered', 'facility',
                    'batch_number', 'administered_by'
                ],
                'keywords': ['vaccine', 'immunization', 'dose', 'child']
            },
            'maternal_health': {
                'fields': [
                    'patient_name', 'lmp', 'edd', 'gravida',
                    'para', 'anc_visits', 'risk_factors',
                    'blood_pressure', 'hemoglobin'
                ],
                'keywords': ['pregnancy', 'anc', 'maternal', 'antenatal']
            },
            'disease_report': {
                'fields': [
                    'disease_type', 'patient_name', 'age', 'gender',
                    'date_of_onset', 'symptoms', 'diagnosis',
                    'treatment', 'outcome'
                ],
                'keywords': ['disease', 'diagnosis', 'symptoms', 'treatment']
            },
            'drug_inventory': {
                'fields': [
                    'drug_name', 'quantity', 'unit', 'expiry_date',
                    'batch_number', 'supplier', 'received_date'
                ],
                'keywords': ['drug', 'inventory', 'stock', 'supply']
            },
            'facility_assessment': {
                'fields': [
                    'facility_name', 'assessment_date', 'assessor',
                    'equipment_status', 'staff_count', 'services',
                    'infrastructure_rating', 'recommendations'
                ],
                'keywords': ['facility', 'assessment', 'equipment', 'infrastructure']
            }
        }
        
        # Field validators
        self.validators = {
            'date': lambda x: bool(re.match(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}', str(x))),
            'name': lambda x: bool(re.match(r'^[A-Za-z\s]{2,}$', str(x))),
            'number': lambda x: str(x).replace('.', '').isdigit(),
            'bp': lambda x: bool(re.match(r'\d{2,3}/\d{2,3}', str(x))),
        }
    
    async def recognize(self, ocr_result: Dict) -> Dict:
        """
        Recognize form structure from OCR results
        
        Args:
            ocr_result: OCR processing result
            
        Returns:
            Structured form data
        """
        try:
            text = ocr_result.get('text', '')
            confidence = ocr_result.get('confidence', 0)
            
            # Identify form type
            form_type = self._identify_form_type(text)
            
            # Extract fields based on form type
            if form_type:
                fields = self._extract_form_fields(text, form_type)
            else:
                fields = self._extract_generic_fields(text)
            
            # Validate extracted fields
            validated_fields = self._validate_fields(fields)
            
            # Structure the data
            structured_data = self._structure_data(validated_fields, form_type)
            
            # Calculate confidence
            field_confidence = self._calculate_field_confidence(validated_fields)
            
            return {
                'form_type': form_type or 'unknown',
                'fields': validated_fields,
                'structured_data': structured_data,
                'confidence': (confidence + field_confidence) / 2,
                'completeness': len(validated_fields) / max(len(fields), 1),
                'needs_verification': field_confidence < 0.7
            }
            
        except Exception as e:
            logger.error(f"Form recognition error: {e}")
            return {
                'form_type': 'unknown',
                'fields': {},
                'confidence': 0,
                'error': str(e)
            }
    
    def _identify_form_type(self, text: str) -> Optional[str]:
        """Identify the type of health form"""
        text_lower = text.lower()
        
        scores = {}
        for form_type, template in self.form_templates.items():
            score = sum(
                1 for keyword in template['keywords']
                if keyword in text_lower
            )
            if score > 0:
                scores[form_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        return None
    
    def _extract_form_fields(self, text: str, form_type: str) -> Dict:
        """Extract fields specific to form type"""
        if form_type not in self.form_templates:
            return {}
        
        template = self.form_templates[form_type]
        fields = {}
        
        for field in template['fields']:
            # Create field label variations
            field_label = field.replace('_', ' ')
            patterns = [
                rf'{field_label}[:\s]*([^\n]+)',
                rf'{field}[:\s]*([^\n]+)',
                rf'(?i){field_label}[:\s]*([^\n]+)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    value = match.group(1).strip()
                    if value and len(value) > 1:
                        fields[field] = value
                        break
        
        # Extract table data if present in OCR result
        if 'tables' in self._get_ocr_structured_data(text):
            fields['tables'] = self._extract_table_fields(
                self._get_ocr_structured_data(text)['tables'],
                form_type
            )
        
        return fields
    
    def _extract_generic_fields(self, text: str) -> Dict:
        """Extract fields without known form type"""
        fields = {}
        
        # Look for common patterns
        patterns = {
            'name': r'(?:Name|Patient)[:\s]*([A-Za-z\s]+)',
            'date': r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            'age': r'(?:Age)[:\s]*(\d+)',
            'gender': r'(?:Gender|Sex)[:\s]*(Male|Female|M|F)',
            'facility': r'(?:Facility|Hospital|Clinic)[:\s]*([A-Za-z\s]+)',
            'phone': r'(?:Phone|Tel|Contact)[:\s]*([\d\-+()\s]+)',
            'id_number': r'(?:ID|Number|#)[:\s]*([A-Za-z0-9\-]+)',
        }
        
        for field_name, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields[field_name] = match.group(1).strip()
        
        return fields
    
    def _extract_table_fields(self, tables: List[Dict], form_type: str) -> List[Dict]:
        """Extract structured data from tables"""
        table_data = []
        
        for table in tables:
            if table.get('row_count', 0) > 0:
                processed_table = {
                    'headers': table.get('headers', []),
                    'rows': []
                }
                
                for row in table.get('rows', []):
                    # Map row data to headers
                    row_dict = {}
                    for i, value in enumerate(row):
                        if i < len(processed_table['headers']):
                            row_dict[processed_table['headers'][i]] = value
                        else:
                            row_dict[f'column_{i}'] = value
                    
                    processed_table['rows'].append(row_dict)
                
                table_data.append(processed_table)
        
        return table_data
    
    def _validate_fields(self, fields: Dict) -> Dict:
        """Validate extracted field values"""
        validated = {}
        
        for field_name, value in fields.items():
            if isinstance(value, str):
                # Date validation
                if 'date' in field_name.lower():
                    if self.validators['date'](value):
                        validated[field_name] = {
                            'value': value,
                            'valid': True,
                            'type': 'date'
                        }
                    else:
                        validated[field_name] = {
                            'value': value,
                            'valid': False,
                            'type': 'date',
                            'error': 'Invalid date format'
                        }
                
                # Name validation
                elif 'name' in field_name.lower():
                    if self.validators['name'](value):
                        validated[field_name] = {
                            'value': value,
                            'valid': True,
                            'type': 'name'
                        }
                    else:
                        validated[field_name] = {
                            'value': value,
                            'valid': False,
                            'type': 'name',
                            'error': 'Invalid name format'
                        }
                
                # Blood pressure validation
                elif 'blood_pressure' in field_name.lower() or 'bp' in field_name.lower():
                    if self.validators['bp'](value):
                        validated[field_name] = {
                            'value': value,
                            'valid': True,
                            'type': 'blood_pressure'
                        }
                    else:
                        validated[field_name] = {
                            'value': value,
                            'valid': False,
                            'type': 'blood_pressure',
                            'error': 'Invalid BP format'
                        }
                
                else:
                    validated[field_name] = {
                        'value': value,
                        'valid': True,
                        'type': 'text'
                    }
            
            elif isinstance(value, (int, float)):
                validated[field_name] = {
                    'value': str(value),
                    'valid': True,
                    'type': 'number'
                }
            
            elif isinstance(value, list):
                validated[field_name] = {
                    'value': value,
                    'valid': True,
                    'type': 'list'
                }
        
        return validated
    
    def _structure_data(self, fields: Dict, form_type: Optional[str]) -> Dict:
        """Structure extracted data into standardized format"""
        structured = {
            'form_type': form_type or 'unknown',
            'data': {},
            'metadata': {
                'extraction_timestamp': datetime.utcnow().isoformat(),
                'fields_extracted': len(fields),
                'valid_fields': sum(1 for f in fields.values() if f.get('valid', False)),
                'needs_verification': False
            }
        }
        
        # Extract values
        for field_name, field_data in fields.items():
            if isinstance(field_data, dict):
                structured['data'][field_name] = field_data.get('value')
            else:
                structured['data'][field_name] = field_data
        
        # Check if verification needed
        invalid_fields = [
            f for f, d in fields.items()
            if isinstance(d, dict) and not d.get('valid', True)
        ]
        
        if invalid_fields:
            structured['metadata']['needs_verification'] = True
            structured['metadata']['invalid_fields'] = invalid_fields
        
        return structured
    
    def _calculate_field_confidence(self, fields: Dict) -> float:
        """Calculate confidence based on field validation"""
        if not fields:
            return 0.0
        
        valid_count = sum(
            1 for f in fields.values()
            if isinstance(f, dict) and f.get('valid', True)
        )
        
        return valid_count / len(fields)
    
    def _get_ocr_structured_data(self, text: str) -> Dict:
        """Extract any structured data already in OCR result"""
        # This would parse structured data if already present
        return {
            'tables': [],
            'lists': []
        }
    
    async def train_template(self, template_name: str, sample_forms: List[Dict]):
        """Train form recognition for new template"""
        # This would implement template learning from examples
        pass