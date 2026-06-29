from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
import re

class DataValidator:
    """Validate incoming health data"""
    
    @staticmethod
    async def validate_immunization(data: dict) -> dict:
        """Validate immunization records"""
        required_fields = ['child_name', 'vaccine_type', 'dose_number', 'facility_id']
        
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate age
        if 'date_of_birth' in data:
            age = (datetime.now() - data['date_of_birth']).days
            if age > 1825:  # 5 years
                raise ValueError("Child exceeds maximum age for routine immunization")
        
        # Validate vaccine schedule
        vaccine_schedule = {
            'BCG': {'min_age': 0, 'max_age': 14},
            'OPV': {'min_age': 0, 'max_age': 14, 'doses': 4},
            'Penta': {'min_age': 42, 'max_age': 365, 'doses': 3},
            'Measles': {'min_age': 270, 'max_age': 365},
            'Yellow Fever': {'min_age': 270, 'max_age': 365}
        }
        
        if data['vaccine_type'] in vaccine_schedule:
            schedule = vaccine_schedule[data['vaccine_type']]
            if 'date_of_birth' in data:
                age_days = (datetime.now() - data['date_of_birth']).days
                if age_days < schedule['min_age']:
                    raise ValueError(f"Child too young for {data['vaccine_type']}")
        
        return data
    
    @staticmethod
    async def validate_maternal_health(data: dict) -> dict:
        """Validate maternal health records"""
        if 'lmp' in data:
            # Calculate EDD
            from datetime import timedelta
            lmp = datetime.fromisoformat(data['lmp'])
            data['edd'] = lmp + timedelta(days=280)
            
            # Determine trimester
            gestational_age = (datetime.now() - lmp).days / 7
            if gestational_age <= 13:
                data['trimester'] = 1
            elif gestational_age <= 26:
                data['trimester'] = 2
            else:
                data['trimester'] = 3
        
        return data
    
    @staticmethod
    async def validate_disease_report(data: dict) -> dict:
        """Validate disease surveillance reports"""
        notifiable_diseases = [
            'cholera', 'measles', 'polio', 'yellow_fever',
            'meningitis', 'lassa_fever', 'ebola', 'covid_19'
        ]
        
        if data.get('disease_type', '').lower() in notifiable_diseases:
            data['priority'] = 'high'
            data['requires_immediate_notification'] = True
        
        return data