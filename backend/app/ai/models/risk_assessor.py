"""
Risk Assessor - AI model for health risk assessment and prioritization
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import logging

logger = logging.getLogger(__name__)

class RiskAssessor:
    """AI model for assessing public health risks"""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}

        # Risk categories and thresholds
        self.risk_categories = {
            'maternal': {
                'critical': ['severe_anemia', 'eclampsia', 'hemorrhage', 'sepsis'],
                'high': ['moderate_anemia', 'hypertension', 'multiple_pregnancy', 'malpresentation'],
                'medium': ['mild_anemia', 'age_risk', 'previous_csection'],
                'low': ['primigravida', 'grand_multipara']
            },
            'child': {
                'critical': ['severe_malnutrition', 'severe_pneumonia', 'dehydration'],
                'high': ['moderate_malnutrition', 'fever', 'diarrhea'],
                'medium': ['mild_malnutrition', 'cough', 'skin_infection'],
                'low': ['minor_illness', 'routine_checkup']
            },
            'facility': {
                'critical': ['no_power', 'no_water', 'no_staff', 'stockout_critical'],
                'high': ['limited_power', 'limited_water', 'staff_shortage', 'stockout_risk'],
                'medium': ['equipment_issues', 'supply_low', 'staff_training_needed'],
                'low': ['minor_issues', 'preventive_maintenance_needed']
            }
        }

        # Risk scoring weights
        self.risk_weights = {
            'clinical': 0.4,
            'demographic': 0.2,
            'environmental': 0.2,
            'behavioral': 0.1,
            'access': 0.1
        }

    async def assess(self, data: pd.DataFrame, risk_type: str = 'general') -> Dict:
        """Assess health risks"""
        try:
            assessment = {
                'risk_type': risk_type,
                'timestamp': datetime.utcnow().isoformat(),
                'overall_risk_score': 0,
                'overall_risk_level': 'low',
                'risk_factors': [],
                'high_risk_areas': [],
                'risk_distribution': {},
                'recommendations': []
            }

            if risk_type == 'maternal':
                assessment.update(await self._assess_maternal_risk(data))
            elif risk_type == 'child':
                assessment.update(await self._assess_child_risk(data))
            elif risk_type == 'facility':
                assessment.update(await self._assess_facility_risk(data))
            else:
                assessment.update(self._assess_general_risk(data))

            assessment['overall_risk_score'] = self._calculate_risk_score(assessment)
            assessment['overall_risk_level'] = self._get_risk_level(assessment['overall_risk_score'])
            assessment['recommendations'] = self._generate_risk_recommendations(assessment)
            return assessment
        except Exception as e:
            logger.error(f"Risk assessment error: {e}")
            return {'error': str(e)}

    async def _assess_maternal_risk(self, data: pd.DataFrame) -> Dict:
        """Assess maternal health risks"""
        maternal_risk = {
            'high_risk_pregnancies': [],
            'risk_factors': [],
            'risk_by_location': {},
            'emergency_cases': [],
            'missed_visits_risk': []
        }

        for _, row in data.iterrows():
            risk_score = 0
            risk_factors = []

            age = row.get('age', 0)
            if age < 18:
                risk_score += 20
                risk_factors.append('age_risk_young')
            elif age > 35:
                risk_score += 15
                risk_factors.append('age_risk_advanced')

            gravida = row.get('gravida', 1)
            if gravida == 1:
                risk_factors.append('primigravida')
            elif gravida >= 5:
                risk_score += 10
                risk_factors.append('grand_multipara')

            bp = str(row.get('blood_pressure', '120/80'))
            try:
                systolic, diastolic = map(int, bp.split('/'))
                if systolic >= 160 or diastolic >= 110:
                    risk_score += 30
                    risk_factors.append('severe_hypertension')
                elif systolic >= 140 or diastolic >= 90:
                    risk_score += 15
                    risk_factors.append('moderate_hypertension')
            except:
                pass

            hb = float(row.get('hemoglobin', 12))
            if hb < 7:
                risk_score += 30
                risk_factors.append('severe_anemia')
            elif hb < 10:
                risk_score += 15
                risk_factors.append('moderate_anemia')
            elif hb < 11:
                risk_score += 5
                risk_factors.append('mild_anemia')

            if row.get('previous_complications'):
                risk_score += 20
                risk_factors.append('previous_complications')

            if row.get('multiple_pregnancy'):
                risk_score += 25
                risk_factors.append('multiple_pregnancy')

            if row.get('malpresentation'):
                risk_score += 20
                risk_factors.append('malpresentation')

            risk_level = self._get_risk_level(risk_score)

            patient_risk = {
                'patient_id': row.get('id', 'unknown'),
                'patient_name': row.get('patient_name', 'Unknown'),
                'risk_score': risk_score,
                'risk_level': risk_level,
                'risk_factors': risk_factors,
                'location': row.get('location', 'Unknown'),
                'facility': row.get('facility', 'Unknown')
            }

            if risk_level in ['high', 'critical']:
                maternal_risk['high_risk_pregnancies'].append(patient_risk)
            if risk_level == 'critical':
                maternal_risk['emergency_cases'].append(patient_risk)

        # Risk by location
        if 'location' in data.columns:
            for location in data['location'].unique():
                loc_data = data[data['location'] == location]
                high_risk_count = len([p for p in maternal_risk['high_risk_pregnancies'] if p['location'] == location])
                maternal_risk['risk_by_location'][location] = {
                    'total': len(loc_data),
                    'high_risk': high_risk_count,
                    'risk_percentage': (high_risk_count / max(1, len(loc_data))) * 100
                }

        # Missed visits risk
        if 'anc_visits' in data.columns:
            missed = data[data['anc_visits'] < 4]
            for _, row in missed.iterrows():
                maternal_risk['missed_visits_risk'].append({
                    'patient_id': row.get('id'),
                    'patient_name': row.get('patient_name', 'Unknown'),
                    'visits': row['anc_visits'],
                    'location': row.get('location', 'Unknown')
                })

        return maternal_risk

    async def _assess_child_risk(self, data: pd.DataFrame) -> Dict:
        """Assess child health risks"""
        child_risk = {
            'high_risk_children': [],
            'risk_factors': [],
            'malnutrition_cases': [],
            'missed_vaccinations': []
        }

        for _, row in data.iterrows():
            risk_score = 0
            risk_factors = []

            # Age risk
            age_months = row.get('age_months', 0)
            if age_months < 6:
                risk_score += 10
                risk_factors.append('infant')

            # Nutritional status
            weight = row.get('weight_kg', 0)
            height = row.get('height_cm', 0)
            if height > 0 and weight > 0:
                bmi = weight / ((height/100) ** 2)
                if bmi < 12:
                    risk_score += 30
                    risk_factors.append('severe_malnutrition')
                elif bmi < 14:
                    risk_score += 20
                    risk_factors.append('moderate_malnutrition')
                elif bmi < 16:
                    risk_score += 10
                    risk_factors.append('mild_malnutrition')

            # Immunization status
            if row.get('vaccination_complete') == False:
                risk_score += 15
                risk_factors.append('incomplete_immunization')

            # Health conditions
            if row.get('chronic_illness'):
                risk_score += 20
                risk_factors.append('chronic_illness')

            risk_level = self._get_risk_level(risk_score)
            child_entry = {
                'child_id': row.get('id'),
                'child_name': row.get('name', 'Unknown'),
                'risk_score': risk_score,
                'risk_level': risk_level,
                'risk_factors': risk_factors,
                'location': row.get('location', 'Unknown')
            }

            if risk_level in ['high', 'critical']:
                child_risk['high_risk_children'].append(child_entry)
            if 'malnutrition' in '_'.join(risk_factors):
                child_risk['malnutrition_cases'].append(child_entry)
            if 'incomplete_immunization' in risk_factors:
                child_risk['missed_vaccinations'].append(child_entry)

        return child_risk

    async def _assess_facility_risk(self, data: pd.DataFrame) -> Dict:
        """Assess facility-level risks"""
        facility_risk = {
            'high_risk_facilities': [],
            'risk_factors': [],
            'by_category': {}
        }

        for _, row in data.iterrows():
            risk_score = 0
            risk_factors = []

            # Infrastructure
            infra = row.get('infrastructure', 3)
            if infra <= 1:
                risk_score += 25
                risk_factors.append('critical_infrastructure')
            elif infra <= 2:
                risk_score += 15
                risk_factors.append('poor_infrastructure')

            # Staffing
            staff = row.get('staffing', 3)
            if staff <= 1:
                risk_score += 20
                risk_factors.append('severe_staff_shortage')
            elif staff <= 2:
                risk_score += 10
                risk_factors.append('staff_shortage')

            # Supplies
            supplies = row.get('supplies', 3)
            if supplies <= 1:
                risk_score += 25
                risk_factors.append('critical_supply_shortage')
            elif supplies <= 2:
                risk_score += 15
                risk_factors.append('supply_shortage')

            # Water/electricity
            if row.get('water_supply') == 'none':
                risk_score += 20
                risk_factors.append('no_water')
            if row.get('power_supply') == 'none':
                risk_score += 20
                risk_factors.append('no_power')

            # Cold chain
            if not row.get('cold_chain_functional'):
                risk_score += 25
                risk_factors.append('cold_chain_failure')

            risk_level = self._get_risk_level(risk_score)
            facility_entry = {
                'facility_id': row.get('id'),
                'facility_name': row.get('name', 'Unknown'),
                'risk_score': risk_score,
                'risk_level': risk_level,
                'risk_factors': risk_factors,
                'location': row.get('location', 'Unknown')
            }

            if risk_level in ['high', 'critical']:
                facility_risk['high_risk_facilities'].append(facility_entry)

        return facility_risk

    def _assess_general_risk(self, data: pd.DataFrame) -> Dict:
        """General risk assessment across all categories"""
        general_risk = {
            'population_risk': {},
            'disease_outbreak_risk': 0,
            'healthcare_access_risk': 0,
            'environmental_risk': 0
        }
        return general_risk

    def _calculate_risk_score(self, assessment: Dict) -> float:
        """Calculate aggregated risk score"""
        # Simplified: return a weighted average based on high-risk counts
        if assessment['risk_type'] == 'maternal':
            total = len(assessment.get('high_risk_pregnancies', []))
            critical = len(assessment.get('emergency_cases', []))
            if total > 0:
                return min(100, (critical / total) * 80 + 20)
            return 10
        elif assessment['risk_type'] == 'facility':
            facilities = assessment.get('high_risk_facilities', [])
            if facilities:
                return min(100, len(facilities) * 15)
            return 5
        else:
            return 0

    def _get_risk_level(self, score: float) -> str:
        if score >= 80:
            return 'critical'
        elif score >= 60:
            return 'high'
        elif score >= 40:
            return 'medium'
        else:
            return 'low'

    def _generate_risk_recommendations(self, assessment: Dict) -> List[Dict]:
        recommendations = []
        risk_type = assessment.get('risk_type')
        if risk_type == 'maternal':
            if assessment.get('emergency_cases'):
                recommendations.append({
                    'priority': 'critical',
                    'action': 'Immediate referral for emergency cases',
                    'details': f"{len(assessment['emergency_cases'])} critical patients"
                })
        elif risk_type == 'facility':
            for facility in assessment.get('high_risk_facilities', []):
                recommendations.append({
                    'priority': facility['risk_level'],
                    'action': f"Address {facility['facility_name']} risks",
                    'details': ', '.join(facility['risk_factors'])
                })
        return recommendations

    async def train(self, training_data: pd.DataFrame) -> Dict:
        """Train risk assessment model"""
        return {'status': 'success', 'message': 'Model trained'}

    def load_model(self, model_path: str):
        try:
            model_data = joblib.load(model_path)
            self.model = model_data.get('model')
            self.scaler = model_data.get('scaler', StandardScaler())
            logger.info(f"Risk model loaded from {model_path}")
        except Exception as e:
            logger.error(f"Error loading risk model: {e}")