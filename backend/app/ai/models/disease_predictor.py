"""
Disease Prediction and Pattern Analysis Model
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import logging

logger = logging.getLogger(__name__)

class DiseasePredictor:
    """AI model for disease prediction and outbreak detection"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = []
        self.disease_thresholds = {
            'cholera': {'cases': 5, 'mortality_rate': 0.02},
            'measles': {'cases': 10, 'mortality_rate': 0.01},
            'polio': {'cases': 1, 'mortality_rate': 0.05},
            'yellow_fever': {'cases': 3, 'mortality_rate': 0.15},
            'meningitis': {'cases': 5, 'mortality_rate': 0.10},
            'lassa_fever': {'cases': 1, 'mortality_rate': 0.20},
            'ebola': {'cases': 1, 'mortality_rate': 0.50},
            'covid_19': {'cases': 20, 'mortality_rate': 0.02},
            'malaria': {'cases': 50, 'mortality_rate': 0.01},
            'tuberculosis': {'cases': 10, 'mortality_rate': 0.05}
        }
        
    def load_model(self, model_path: str):
        """Load pre-trained model"""
        try:
            model_data = joblib.load(model_path)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.label_encoder = model_data['encoder']
            self.feature_columns = model_data['features']
            logger.info(f"Model loaded from {model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self._initialize_default_model()
    
    def _initialize_default_model(self):
        """Initialize default model"""
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
    
    async def analyze_patterns(self, data: pd.DataFrame) -> Dict:
        """
        Analyze disease patterns in health data
        
        Args:
            data: DataFrame with disease surveillance data
            
        Returns:
            Dictionary with disease pattern analysis
        """
        patterns = {
            'disease_distribution': self._analyze_disease_distribution(data),
            'temporal_patterns': self._analyze_temporal_patterns(data),
            'geographic_hotspots': self._identify_hotspots(data),
            'risk_factors': self._identify_risk_factors(data),
            'outbreak_risk': await self._calculate_outbreak_risk(data),
            'trends': self._analyze_disease_trends(data)
        }
        
        return patterns
    
    def _analyze_disease_distribution(self, data: pd.DataFrame) -> Dict:
        """Analyze distribution of diseases"""
        distribution = {}
        
        if 'disease_type' in data.columns:
            disease_counts = data['disease_type'].value_counts()
            
            for disease, count in disease_counts.items():
                disease_data = data[data['disease_type'] == disease]
                
                distribution[disease] = {
                    'total_cases': int(count),
                    'active_cases': int(disease_data['cases'].sum()) if 'cases' in disease_data else 0,
                    'mortality': int(disease_data['deaths'].sum()) if 'deaths' in disease_data else 0,
                    'prevalence': float(count / len(data) * 100),
                    'mortality_rate': float(
                        disease_data['deaths'].sum() / disease_data['cases'].sum() * 100
                    ) if 'cases' in disease_data and disease_data['cases'].sum() > 0 else 0
                }
        
        return distribution
    
    def _analyze_temporal_patterns(self, data: pd.DataFrame) -> Dict:
        """Analyze temporal patterns of diseases"""
        temporal = {}
        
        if 'date_reported' in data.columns:
            data['date'] = pd.to_datetime(data['date_reported'])
            
            # Daily patterns
            daily = data.groupby('date').agg({
                'cases': 'sum',
                'deaths': 'sum'
            }).to_dict()
            
            temporal['daily'] = daily
            
            # Weekly patterns
            data['week'] = data['date'].dt.isocalendar().week
            weekly = data.groupby('week').agg({
                'cases': 'sum',
                'deaths': 'sum'
            })
            
            # Calculate week-over-week change
            weekly['cases_change'] = weekly['cases'].pct_change() * 100
            weekly['deaths_change'] = weekly['deaths'].pct_change() * 100
            
            temporal['weekly'] = weekly.to_dict()
            
            # Monthly patterns
            data['month'] = data['date'].dt.month
            monthly = data.groupby('month').agg({
                'cases': 'sum',
                'deaths': 'sum'
            }).to_dict()
            
            temporal['monthly'] = monthly
        
        return temporal
    
    def _identify_hotspots(self, data: pd.DataFrame) -> List[Dict]:
        """Identify disease hotspots"""
        hotspots = []
        
        if 'location' in data.columns and 'disease_type' in data.columns:
            # Group by location and disease
            location_stats = data.groupby(['location', 'disease_type']).agg({
                'cases': 'sum',
                'deaths': 'sum'
            }).reset_index()
            
            # Calculate risk scores
            for _, row in location_stats.iterrows():
                disease = row['disease_type']
                threshold = self.disease_thresholds.get(disease, {'cases': 10})
                
                risk_score = min(100, (
                    (row['cases'] / threshold['cases']) * 50 +
                    (row['deaths'] / max(1, row['cases'])) * 50
                ))
                
                if risk_score > 50:  # Hotspot threshold
                    hotspots.append({
                        'location': row['location'],
                        'disease': disease,
                        'cases': int(row['cases']),
                        'deaths': int(row['deaths']),
                        'risk_score': float(risk_score),
                        'risk_level': 'high' if risk_score > 75 else 'medium',
                        'requires_action': risk_score > 75
                    })
        
        return sorted(hotspots, key=lambda x: x['risk_score'], reverse=True)
    
    def _identify_risk_factors(self, data: pd.DataFrame) -> Dict:
        """Identify risk factors for diseases"""
        risk_factors = {
            'environmental': [],
            'demographic': [],
            'behavioral': [],
            'seasonal': []
        }
        
        # Seasonal patterns
        if 'date_reported' in data.columns and 'cases' in data.columns:
            data['date'] = pd.to_datetime(data['date_reported'])
            data['month'] = data['date'].dt.month
            
            monthly_cases = data.groupby('month')['cases'].sum()
            
            if len(monthly_cases) > 0:
                high_months = monthly_cases[monthly_cases > monthly_cases.mean() + monthly_cases.std()]
                
                if len(high_months) > 0:
                    risk_factors['seasonal'].append({
                        'factor': 'Seasonal increase',
                        'months': high_months.index.tolist(),
                        'significance': 'high'
                    })
        
        # Geographic clustering
        if 'location' in data.columns and 'cases' in data.columns:
            location_cases = data.groupby('location')['cases'].sum()
            high_risk_locations = location_cases[
                location_cases > location_cases.mean() + location_cases.std()
            ]
            
            if len(high_risk_locations) > 0:
                risk_factors['environmental'].append({
                    'factor': 'Geographic clustering',
                    'locations': high_risk_locations.index.tolist(),
                    'significance': 'high'
                })
        
        # Case fatality rate analysis
        if 'cases' in data.columns and 'deaths' in data.columns:
            total_cases = data['cases'].sum()
            total_deaths = data['deaths'].sum()
            
            if total_cases > 0:
                cfr = (total_deaths / total_cases) * 100
                
                if cfr > 5:  # High CFR threshold
                    risk_factors['behavioral'].append({
                        'factor': 'High case fatality rate',
                        'cfr': f"{cfr:.1f}%",
                        'significance': 'critical'
                    })
        
        return risk_factors
    
    async def _calculate_outbreak_risk(self, data: pd.DataFrame) -> Dict:
        """Calculate outbreak risk using ML model"""
        outbreak_risk = {
            'overall_risk': 0,
            'disease_specific': {},
            'location_specific': {},
            'risk_level': 'low',
            'confidence': 0
        }
        
        if self.model is not None and len(data) > 0:
            try:
                # Feature engineering
                features = self._engineer_features(data)
                
                if features is not None and len(features) > 0:
                    # Scale features
                    scaled_features = self.scaler.transform(features)
                    
                    # Predict
                    predictions = self.model.predict_proba(scaled_features)
                    
                    outbreak_risk['overall_risk'] = float(np.mean(predictions[:, 1]))
                    outbreak_risk['confidence'] = float(np.std(predictions[:, 1]))
                    
                    # Determine risk level
                    if outbreak_risk['overall_risk'] > 0.7:
                        outbreak_risk['risk_level'] = 'critical'
                    elif outbreak_risk['overall_risk'] > 0.5:
                        outbreak_risk['risk_level'] = 'high'
                    elif outbreak_risk['overall_risk'] > 0.3:
                        outbreak_risk['risk_level'] = 'medium'
                    else:
                        outbreak_risk['risk_level'] = 'low'
                    
                    # Disease-specific risks
                    if 'disease_type' in data.columns:
                        for disease in data['disease_type'].unique():
                            disease_data = data[data['disease_type'] == disease]
                            if len(disease_data) > 0:
                                disease_features = self._engineer_features(disease_data)
                                if disease_features is not None:
                                    disease_predictions = self.model.predict_proba(
                                        self.scaler.transform(disease_features)
                                    )
                                    outbreak_risk['disease_specific'][disease] = {
                                        'risk': float(np.mean(disease_predictions[:, 1])),
                                        'trend': 'increasing' if disease_predictions[-1, 1] > disease_predictions[0, 1] else 'decreasing'
                                    }
                
            except Exception as e:
                logger.error(f"Error calculating outbreak risk: {e}")
        
        return outbreak_risk
    
    def _analyze_disease_trends(self, data: pd.DataFrame) -> Dict:
        """Analyze disease trends over time"""
        trends = {}
        
        if 'date_reported' in data.columns and 'cases' in data.columns:
            data['date'] = pd.to_datetime(data['date_reported'])
            data = data.sort_values('date')
            
            # Moving averages
            data['cases_7d_avg'] = data['cases'].rolling(7).mean()
            data['cases_14d_avg'] = data['cases'].rolling(14).mean()
            
            # Trend direction
            if len(data) > 14:
                recent = data['cases_7d_avg'].iloc[-1]
                previous = data['cases_7d_avg'].iloc[-8]
                
                change = ((recent - previous) / max(1, previous)) * 100
                
                trends['direction'] = 'increasing' if change > 5 else 'decreasing' if change < -5 else 'stable'
                trends['change_percentage'] = float(change)
                trends['current_7day_avg'] = float(recent) if not pd.isna(recent) else 0
                
                # Acceleration
                if len(data) > 21:
                    recent_change = data['cases_7d_avg'].iloc[-1] - data['cases_7d_avg'].iloc[-8]
                    older_change = data['cases_7d_avg'].iloc[-8] - data['cases_7d_avg'].iloc[-15]
                    
                    trends['acceleration'] = 'accelerating' if recent_change > older_change else 'decelerating'
        
        return trends
    
    def _engineer_features(self, data: pd.DataFrame) -> Optional[pd.DataFrame]:
        """Engineer features for ML model"""
        try:
            features = pd.DataFrame()
            
            # Basic statistics
            if 'cases' in data.columns:
                features['cases'] = data['cases']
                features['cases_log'] = np.log1p(data['cases'])
                features['cases_rolling_mean_7'] = data['cases'].rolling(7, min_periods=1).mean()
                features['cases_rolling_std_7'] = data['cases'].rolling(7, min_periods=1).std()
                features['cases_momentum'] = data['cases'] - data['cases'].shift(1)
            
            if 'deaths' in data.columns:
                features['deaths'] = data['deaths']
                features['mortality_ratio'] = data['deaths'] / (data['cases'] + 1)
            
            # Temporal features
            if 'date_reported' in data.columns:
                dates = pd.to_datetime(data['date_reported'])
                features['day_of_week'] = dates.dt.dayofweek
                features['month'] = dates.dt.month
                features['quarter'] = dates.dt.quarter
                features['day_of_year'] = dates.dt.dayofyear
            
            # Fill NaN values
            features = features.fillna(0)
            
            return features
            
        except Exception as e:
            logger.error(f"Error engineering features: {e}")
            return None
    
    async def train(self, training_data: pd.DataFrame) -> Dict:
        """Train the disease prediction model"""
        try:
            # Prepare features and target
            features = self._engineer_features(training_data)
            
            if features is None or 'cases' not in features:
                return {'status': 'failed', 'error': 'Invalid training data'}
            
            # Create target variable (outbreak indicator)
            outbreak_threshold = features['cases'].quantile(0.9)
            target = (features['cases'] > outbreak_threshold).astype(int)
            
            # Remove target from features
            feature_cols = [col for col in features.columns if col != 'cases']
            X = features[feature_cols]
            y = target
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Initialize and train model
            self.model = GradientBoostingClassifier(
                n_estimators=200,
                learning_rate=0.05,
                max_depth=5,
                min_samples_split=5,
                random_state=42
            )
            
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate
            train_score = self.model.score(X_train_scaled, y_train)
            test_score = self.model.score(X_test_scaled, y_test)
            
            y_pred = self.model.predict(X_test_scaled)
            
            return {
                'status': 'success',
                'train_accuracy': float(train_score),
                'test_accuracy': float(test_score),
                'classification_report': classification_report(y_test, y_pred, output_dict=True),
                'feature_importance': dict(zip(feature_cols, self.model.feature_importances_)),
                'training_samples': len(X_train),
                'test_samples': len(X_test)
            }
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {'status': 'failed', 'error': str(e)}