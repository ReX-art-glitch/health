"""
Coverage Analyzer - Analyzes vaccination coverage patterns and gaps
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import logging
import warnings

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)

class CoverageAnalyzer:
    """AI model for vaccination coverage analysis"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.coverage_thresholds = {
            'critical': 50,
            'low': 70,
            'moderate': 80,
            'good': 90,
            'excellent': 95
        }
        self.target_coverage = 90
        
    async def analyze(self, data: pd.DataFrame) -> Dict:
        """
        Analyze vaccination coverage
        
        Args:
            data: DataFrame with vaccination records
            
        Returns:
            Dictionary with comprehensive coverage analysis
        """
        try:
            analysis = {
                'overall_coverage': self._calculate_overall_coverage(data),
                'by_location': self._analyze_by_location(data),
                'by_vaccine_type': self._analyze_by_vaccine_type(data),
                'by_demographics': self._analyze_by_demographics(data),
                'trends': self._analyze_coverage_trends(data),
                'gaps': self._identify_coverage_gaps(data),
                'dropout_analysis': self._analyze_dropouts(data),
                'performance': self._assess_performance(data),
                'recommendations': []
            }
            
            # Generate recommendations based on analysis
            analysis['recommendations'] = self._generate_recommendations(analysis)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Coverage analysis error: {e}")
            return {'error': str(e)}
    
    def _calculate_overall_coverage(self, data: pd.DataFrame) -> float:
        """Calculate overall vaccination coverage"""
        if 'vaccinated' in data.columns and 'eligible' in data.columns:
            total_vaccinated = data['vaccinated'].sum()
            total_eligible = data['eligible'].sum()
            if total_eligible > 0:
                return float((total_vaccinated / total_eligible) * 100)
        
        # Alternative calculation
        if 'coverage' in data.columns:
            return float(data['coverage'].mean())
        
        return 0.0
    
    def _analyze_by_location(self, data: pd.DataFrame) -> Dict:
        """Analyze coverage by location"""
        if 'location' not in data.columns:
            return {}
        
        location_analysis = {}
        
        # Group by location
        for location in data['location'].unique():
            loc_data = data[data['location'] == location]
            
            if 'vaccinated' in loc_data.columns and 'eligible' in loc_data.columns:
                vaccinated = loc_data['vaccinated'].sum()
                eligible = loc_data['eligible'].sum()
                coverage = (vaccinated / eligible * 100) if eligible > 0 else 0
            elif 'coverage' in loc_data.columns:
                coverage = loc_data['coverage'].mean()
            else:
                coverage = 0
            
            # Determine status
            status = self._get_coverage_status(coverage)
            
            # Calculate gap to target
            gap = max(0, self.target_coverage - coverage)
            
            # Estimate affected children
            estimated_children = int(gap / 100 * eligible) if 'eligible' in loc_data.columns else 0
            
            location_analysis[location] = {
                'coverage': float(coverage),
                'status': status,
                'gap_to_target': float(gap),
                'estimated_affected': estimated_children,
                'needs_intervention': coverage < 80,
                'priority': 'high' if coverage < 70 else 'medium' if coverage < 80 else 'low'
            }
        
        return location_analysis
    
    def _analyze_by_vaccine_type(self, data: pd.DataFrame) -> Dict:
        """Analyze coverage by vaccine type"""
        if 'vaccine_type' not in data.columns:
            return {}
        
        vaccine_analysis = {}
        
        for vaccine in data['vaccine_type'].unique():
            vaccine_data = data[data['vaccine_type'] == vaccine]
            
            if 'vaccinated' in vaccine_data.columns and 'eligible' in vaccine_data.columns:
                vaccinated = vaccine_data['vaccinated'].sum()
                eligible = vaccine_data['eligible'].sum()
                coverage = (vaccinated / eligible * 100) if eligible > 0 else 0
            elif 'coverage' in vaccine_data.columns:
                coverage = vaccine_data['coverage'].mean()
            else:
                coverage = 0
            
            # Check for dropout (comparing dose 1 vs subsequent doses)
            dropout_rate = 0
            if 'dose_number' in vaccine_data.columns:
                dose1 = vaccine_data[vaccine_data['dose_number'] == 1]
                dose2 = vaccine_data[vaccine_data['dose_number'] == 2]
                if len(dose1) > 0 and len(dose2) > 0:
                    dose1_count = dose1['vaccinated'].sum() if 'vaccinated' in dose1.columns else len(dose1)
                    dose2_count = dose2['vaccinated'].sum() if 'vaccinated' in dose2.columns else len(dose2)
                    if dose1_count > 0:
                        dropout_rate = float((1 - dose2_count / dose1_count) * 100)
            
            vaccine_analysis[vaccine] = {
                'coverage': float(coverage),
                'dropout_rate': float(dropout_rate),
                'status': self._get_coverage_status(coverage)
            }
        
        return vaccine_analysis
    
    def _analyze_by_demographics(self, data: pd.DataFrame) -> Dict:
        """Analyze coverage by demographic factors"""
        demographics = {}
        
        # By gender
        if 'gender' in data.columns:
            gender_analysis = {}
            for gender in data['gender'].unique():
                gender_data = data[data['gender'] == gender]
                if 'vaccinated' in gender_data.columns and 'eligible' in gender_data.columns:
                    vaccinated = gender_data['vaccinated'].sum()
                    eligible = gender_data['eligible'].sum()
                    coverage = (vaccinated / eligible * 100) if eligible > 0 else 0
                    gender_analysis[gender] = float(coverage)
            demographics['by_gender'] = gender_analysis
        
        # By age group
        if 'age' in data.columns or 'date_of_birth' in data.columns:
            age_analysis = {}
            data_copy = data.copy()
            
            if 'date_of_birth' in data_copy.columns:
                data_copy['age_months'] = (
                    (pd.to_datetime('now') - pd.to_datetime(data_copy['date_of_birth'])).dt.days / 30
                )
                age_col = 'age_months'
            else:
                age_col = 'age'
            
            age_groups = {
                '0-2 months': (0, 2),
                '2-6 months': (2, 6),
                '6-12 months': (6, 12),
                '12-24 months': (12, 24),
                '24+ months': (24, 60)
            }
            
            for group_name, (min_age, max_age) in age_groups.items():
                group_data = data_copy[
                    (data_copy[age_col] >= min_age) & (data_copy[age_col] < max_age)
                ]
                if len(group_data) > 0:
                    if 'vaccinated' in group_data.columns:
                        coverage = group_data['vaccinated'].sum() / max(1, len(group_data)) * 100
                        age_analysis[group_name] = float(coverage)
            
            demographics['by_age'] = age_analysis
        
        return demographics
    
    def _analyze_coverage_trends(self, data: pd.DataFrame) -> Dict:
        """Analyze coverage trends over time"""
        trends = {}
        
        date_col = None
        for col in ['date', 'date_administered', 'date_reported', 'created_at']:
            if col in data.columns:
                date_col = col
                break
        
        if date_col is None:
            return trends
        
        data_copy = data.copy()
        data_copy[date_col] = pd.to_datetime(data_copy[date_col])
        data_copy = data_copy.sort_values(date_col)
        
        # Monthly trends
        data_copy['month'] = data_copy[date_col].dt.to_period('M')
        
        monthly_coverage = []
        for month in data_copy['month'].unique():
            month_data = data_copy[data_copy['month'] == month]
            
            if 'vaccinated' in month_data.columns and 'eligible' in month_data.columns:
                vaccinated = month_data['vaccinated'].sum()
                eligible = month_data['eligible'].sum()
                coverage = (vaccinated / eligible * 100) if eligible > 0 else 0
            elif 'coverage' in month_data.columns:
                coverage = month_data['coverage'].mean()
            else:
                coverage = 0
            
            monthly_coverage.append({
                'month': str(month),
                'coverage': float(coverage),
                'vaccinated': int(vaccinated) if 'vaccinated' in month_data.columns else 0
            })
        
        trends['monthly'] = monthly_coverage
        
        # Calculate trend direction
        if len(monthly_coverage) >= 2:
            recent = monthly_coverage[-1]['coverage']
            previous = monthly_coverage[-2]['coverage']
            change = recent - previous
            
            trends['direction'] = 'increasing' if change > 2 else 'decreasing' if change < -2 else 'stable'
            trends['change'] = float(change)
            trends['change_percentage'] = float((change / previous * 100) if previous > 0 else 0)
        
        return trends
    
    def _identify_coverage_gaps(self, data: pd.DataFrame) -> List[Dict]:
        """Identify coverage gaps and areas needing attention"""
        gaps = []
        
        # Location-based gaps
        if 'location' in data.columns:
            location_analysis = self._analyze_by_location(data)
            
            for location, analysis in location_analysis.items():
                if analysis['coverage'] < 80:
                    gaps.append({
                        'type': 'location',
                        'name': location,
                        'coverage': analysis['coverage'],
                        'gap': analysis['gap_to_target'],
                        'priority': analysis['priority'],
                        'estimated_affected': analysis.get('estimated_affected', 0)
                    })
        
        # Vaccine-specific gaps
        if 'vaccine_type' in data.columns:
            vaccine_analysis = self._analyze_by_vaccine_type(data)
            
            for vaccine, analysis in vaccine_analysis.items():
                if analysis['coverage'] < 80:
                    gaps.append({
                        'type': 'vaccine',
                        'name': vaccine,
                        'coverage': analysis['coverage'],
                        'priority': 'high' if analysis['coverage'] < 70 else 'medium'
                    })
        
        # Sort by priority
        gaps.sort(key=lambda x: x['coverage'])
        
        return gaps
    
    def _analyze_dropouts(self, data: pd.DataFrame) -> Dict:
        """Analyze vaccination dropout rates"""
        dropout_analysis = {
            'overall_dropout_rate': 0,
            'by_location': {},
            'by_vaccine': {}
        }
        
        if 'dose_number' not in data.columns or 'child_id' not in data.columns:
            return dropout_analysis
        
        # Overall dropout (dose 1 to last dose)
        children_doses = data.groupby('child_id')['dose_number'].max()
        children_with_multiple = children_doses[children_doses > 1]
        
        if len(children_doses) > 0:
            completed = len(children_doses[children_doses >= 4])  # Assuming 4 doses is complete
            dropout_analysis['overall_dropout_rate'] = float(
                (1 - completed / len(children_doses)) * 100
            )
        
        # By location
        if 'location' in data.columns:
            for location in data['location'].unique():
                loc_data = data[data['location'] == location]
                loc_children = loc_data.groupby('child_id')['dose_number'].max()
                loc_completed = len(loc_children[loc_children >= 4])
                dropout_analysis['by_location'][location] = float(
                    (1 - loc_completed / max(1, len(loc_children))) * 100
                )
        
        return dropout_analysis
    
    def _assess_performance(self, data: pd.DataFrame) -> Dict:
        """Assess vaccination program performance"""
        performance = {
            'overall_score': 0,
            'metrics': {},
            'strengths': [],
            'weaknesses': []
        }
        
        overall_coverage = self._calculate_overall_coverage(data)
        performance['metrics']['overall_coverage'] = overall_coverage
        
        # Score based on coverage
        if overall_coverage >= self.target_coverage:
            performance['overall_score'] = 90
            performance['strengths'].append('Coverage meets or exceeds target')
        elif overall_coverage >= 80:
            performance['overall_score'] = 70
            performance['weaknesses'].append('Coverage below target')
        elif overall_coverage >= 70:
            performance['overall_score'] = 50
            performance['weaknesses'].append('Significant coverage gaps')
        else:
            performance['overall_score'] = 30
            performance['weaknesses'].append('Critical coverage levels')
        
        # Check dropout rate
        dropout = self._analyze_dropouts(data)
        if dropout.get('overall_dropout_rate', 0) < 10:
            performance['strengths'].append('Low dropout rate')
        else:
            performance['weaknesses'].append(f"High dropout rate: {dropout['overall_dropout_rate']:.1f}%")
        
        # Check trend
        trends = self._analyze_coverage_trends(data)
        if trends.get('direction') == 'increasing':
            performance['strengths'].append('Coverage trending upward')
        elif trends.get('direction') == 'decreasing':
            performance['weaknesses'].append('Coverage trending downward')
        
        return performance
    
    def _generate_recommendations(self, analysis: Dict) -> List[Dict]:
        """Generate evidence-based recommendations"""
        recommendations = []
        
        overall = analysis.get('overall_coverage', 0)
        
        if overall < 70:
            recommendations.append({
                'priority': 'critical',
                'action': 'Launch emergency vaccination campaign',
                'details': f'Overall coverage at {overall:.1f}% requires immediate intervention',
                'timeline': 'Immediate'
            })
        
        # Location-specific recommendations
        for location, loc_data in analysis.get('by_location', {}).items():
            if loc_data.get('coverage', 100) < 70:
                recommendations.append({
                    'priority': 'high',
                    'action': f'Deploy mobile vaccination teams to {location}',
                    'details': f'Coverage at {loc_data["coverage"]:.1f}% - estimated {loc_data.get("estimated_affected", 0)} children affected',
                    'timeline': 'Within 1 week'
                })
        
        # Dropout recommendations
        dropout = analysis.get('dropout_analysis', {})
        if dropout.get('overall_dropout_rate', 0) > 15:
            recommendations.append({
                'priority': 'high',
                'action': 'Implement defaulter tracing system',
                'details': f'Dropout rate at {dropout["overall_dropout_rate"]:.1f}%',
                'timeline': 'Within 2 weeks'
            })
        
        return recommendations
    
    def _get_coverage_status(self, coverage: float) -> str:
        """Get coverage status label"""
        if coverage >= self.thresholds['excellent']:
            return 'excellent'
        elif coverage >= self.thresholds['good']:
            return 'good'
        elif coverage >= self.thresholds['moderate']:
            return 'moderate'
        elif coverage >= self.thresholds['low']:
            return 'low'
        else:
            return 'critical'
    
    def load_model(self, model_path: str):
        """Load pre-trained model"""
        try:
            model_data = joblib.load(model_path)
            self.model = model_data.get('model')
            self.scaler = model_data.get('scaler', StandardScaler())
            logger.info(f"Coverage model loaded from {model_path}")
        except Exception as e:
            logger.error(f"Error loading coverage model: {e}")