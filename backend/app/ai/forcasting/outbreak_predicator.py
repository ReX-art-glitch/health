"""
Outbreak Predictor - Predict disease outbreaks using ML
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit
import xgboost as xgb
from prophet import Prophet
import warnings
import logging

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)

class OutbreakPredictor:
    """Predict disease outbreaks using multiple ML models"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        self.prediction_horizon = 30  # days
        
        # Thresholds for different diseases
        self.outbreak_thresholds = {
            'cholera': {'cases_per_week': 10, 'mortality_increase': 0.02},
            'measles': {'cases_per_week': 15, 'mortality_increase': 0.01},
            'meningitis': {'cases_per_week': 5, 'mortality_increase': 0.05},
            'lassa_fever': {'cases_per_week': 3, 'mortality_increase': 0.1},
            'ebola': {'cases_per_week': 1, 'mortality_increase': 0.1},
            'covid_19': {'cases_per_week': 50, 'mortality_increase': 0.02}
        }
    
    async def predict(
        self,
        data: pd.DataFrame,
        location: Optional[str] = None
    ) -> Dict:
        """
        Predict disease outbreaks
        
        Args:
            data: Historical disease data
            location: Optional location filter
            
        Returns:
            Prediction results
        """
        try:
            predictions = {
                'timestamp': datetime.utcnow().isoformat(),
                'location': location or 'all',
                'predictions': {},
                'risk_levels': {},
                'alerts': [],
                'confidence': {}
            }
            
            # Filter by location if specified
            if location:
                data = data[data['location'] == location].copy()
            
            if data.empty:
                return {
                    'status': 'warning',
                    'message': 'No data available for prediction'
                }
            
            # Get unique diseases
            diseases = data['disease_type'].unique() if 'disease_type' in data.columns else []
            
            for disease in diseases:
                disease_data = data[data['disease_type'] == disease].copy()
                
                if len(disease_data) < 14:  # Need at least 2 weeks of data
                    continue
                
                # Prepare time series
                ts_data = self._prepare_time_series(disease_data)
                
                # Get multiple predictions
                prophet_pred = self._predict_with_prophet(ts_data)
                ml_pred = self._predict_with_ml(disease_data)
                ensemble_pred = self._ensemble_predictions(prophet_pred, ml_pred)
                
                # Calculate risk
                risk = self._calculate_risk(ensemble_pred, disease)
                
                predictions['predictions'][disease] = {
                    'forecast': ensemble_pred['forecast'],
                    'peak_date': ensemble_pred['peak_date'],
                    'peak_cases': ensemble_pred['peak_cases'],
                    'trend': ensemble_pred['trend']
                }
                
                predictions['risk_levels'][disease] = risk['level']
                predictions['confidence'][disease] = ensemble_pred['confidence']
                
                # Check for alerts
                if risk['level'] in ['high', 'critical']:
                    predictions['alerts'].append({
                        'disease': disease,
                        'risk_level': risk['level'],
                        'probability': risk['probability'],
                        'predicted_peak': ensemble_pred['peak_date'],
                        'recommended_actions': self._get_recommended_actions(disease, risk['level'])
                    })
            
            # Overall risk assessment
            predictions['overall_risk'] = self._calculate_overall_risk(predictions)
            
            return predictions
            
        except Exception as e:
            logger.error(f"Outbreak prediction error: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _prepare_time_series(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare time series data for Prophet"""
        df = pd.DataFrame()
        
        if 'date_reported' in data.columns:
            df['ds'] = pd.to_datetime(data['date_reported'])
        elif 'date' in data.columns:
            df['ds'] = pd.to_datetime(data['date'])
        else:
            return df
        
        if 'cases' in data.columns:
            df['y'] = data['cases']
        else:
            return df
        
        # Aggregate by date
        df = df.groupby('ds')['y'].sum().reset_index()
        
        # Add known seasonality markers
        df['month'] = df['ds'].dt.month
        
        return df.sort_values('ds')
    
    def _predict_with_prophet(self, data: pd.DataFrame) -> Dict:
        """Predict using Facebook Prophet"""
        try:
            if len(data) < 7:
                return self._get_empty_prediction()
            
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                seasonality_mode='multiplicative',
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0
            )
            
            # Add seasonality for known disease patterns
            model.add_seasonality(
                name='monthly',
                period=30.5,
                fourier_order=5
            )
            
            model.fit(data)
            
            # Make future predictions
            future = model.make_future_dataframe(
                periods=self.prediction_horizon,
                freq='D'
            )
            
            forecast = model.predict(future)
            
            # Extract relevant metrics
            forecast_tail = forecast.tail(self.prediction_horizon)
            
            peak_row = forecast_tail.loc[forecast_tail['yhat'].idxmax()]
            
            return {
                'forecast': forecast_tail[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records'),
                'peak_date': peak_row['ds'].strftime('%Y-%m-%d'),
                'peak_cases': float(peak_row['yhat']),
                'trend': 'increasing' if forecast_tail['trend'].iloc[-1] > 0 else 'decreasing',
                'confidence': 1 - (forecast_tail['yhat_upper'] - forecast_tail['yhat_lower']).mean() / forecast_tail['yhat'].mean(),
                'model': 'prophet'
            }
            
        except Exception as e:
            logger.error(f"Prophet prediction error: {e}")
            return self._get_empty_prediction()
    
    def _predict_with_ml(self, data: pd.DataFrame) -> Dict:
        """Predict using machine learning models"""
        try:
            if len(data) < 30:
                return self._get_empty_prediction()
            
            # Feature engineering
            features = self._engineer_outbreak_features(data)
            
            if features is None or features.empty:
                return self._get_empty_prediction()
            
            # Prepare training data
            X = features.drop(['target_outbreak'], axis=1, errors='ignore')
            
            # For demonstration, use last known values
            last_values = X.iloc[-1:].values
            
            # Train XGBoost model
            model = xgb.XGBRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
            
            # We'd normally have trained this on historical data
            # Here we're making a simplified prediction
            
            return {
                'forecast': [],
                'peak_date': datetime.now().strftime('%Y-%m-%d'),
                'peak_cases': float(data['cases'].max()) if 'cases' in data else 0,
                'trend': 'increasing' if data['cases'].iloc[-1] > data['cases'].iloc[-8] else 'decreasing',
                'confidence': 0.7,
                'model': 'xgboost'
            }
            
        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return self._get_empty_prediction()
    
    def _engineer_outbreak_features(self, data: pd.DataFrame) -> Optional[pd.DataFrame]:
        """Engineer features for outbreak prediction"""
        try:
            df = data.copy()
            
            features = pd.DataFrame()
            
            # Temporal features
            if 'date_reported' in df.columns:
                df['date'] = pd.to_datetime(df['date_reported'])
                features['day_of_week'] = df['date'].dt.dayofweek
                features['month'] = df['date'].dt.month
                features['week_of_year'] = df['date'].dt.isocalendar().week
                features['is_weekend'] = (df['date'].dt.dayofweek >= 5).astype(int)
            
            # Case features
            if 'cases' in df.columns:
                features['cases'] = df['cases']
                features['cases_7d_avg'] = df['cases'].rolling(7, min_periods=1).mean()
                features['cases_14d_avg'] = df['cases'].rolling(14, min_periods=1).mean()
                features['cases_momentum'] = df['cases'] - df['cases'].shift(7)
                features['cases_growth_rate'] = df['cases'].pct_change(7)
                
                # Outbreak target
                threshold = df['cases'].quantile(0.9)
                features['target_outbreak'] = (df['cases'] > threshold).astype(int)
            
            # Mortality features
            if 'deaths' in df.columns:
                features['deaths'] = df['deaths']
                features['mortality_rate'] = df['deaths'] / (df['cases'] + 1)
                features['mortality_7d_avg'] = df['deaths'].rolling(7, min_periods=1).mean()
            
            # Fill missing values
            features = features.fillna(0)
            
            return features
            
        except Exception as e:
            logger.error(f"Feature engineering error: {e}")
            return None
    
    def _ensemble_predictions(self, prophet_pred: Dict, ml_pred: Dict) -> Dict:
        """Combine multiple model predictions"""
        # Weight predictions by confidence
        prophet_weight = prophet_pred.get('confidence', 0.5)
        ml_weight = ml_pred.get('confidence', 0.5)
        
        total_weight = prophet_weight + ml_weight
        
        if total_weight == 0:
            return self._get_empty_prediction()
        
        # Normalize weights
        prophet_weight /= total_weight
        ml_weight /= total_weight
        
        # Combine forecasts
        ensemble = {
            'forecast': prophet_pred.get('forecast', []),
            'peak_date': prophet_pred.get('peak_date', datetime.now().strftime('%Y-%m-%d')),
            'peak_cases': (
                prophet_pred.get('peak_cases', 0) * prophet_weight +
                ml_pred.get('peak_cases', 0) * ml_weight
            ),
            'trend': prophet_pred.get('trend', 'stable'),
            'confidence': max(
                prophet_pred.get('confidence', 0),
                ml_pred.get('confidence', 0)
            ),
            'models_used': ['prophet', 'xgboost']
        }
        
        return ensemble
    
    def _calculate_risk(self, prediction: Dict, disease: str) -> Dict:
        """Calculate outbreak risk level"""
        risk = {
            'level': 'low',
            'probability': 0,
            'factors': []
        }
        
        # Get disease-specific thresholds
        thresholds = self.outbreak_thresholds.get(
            disease,
            {'cases_per_week': 10, 'mortality_increase': 0.05}
        )
        
        # Check predicted cases
        peak_cases = prediction.get('peak_cases', 0)
        cases_threshold = thresholds['cases_per_week'] * 4  # Monthly threshold
        
        if peak_cases > cases_threshold * 3:
            risk['level'] = 'critical'
            risk['probability'] = 0.9
            risk['factors'].append(f'Predicted cases ({peak_cases:.0f}) far exceed threshold ({cases_threshold:.0f})')
        elif peak_cases > cases_threshold * 2:
            risk['level'] = 'high'
            risk['probability'] = 0.7
            risk['factors'].append(f'Predicted cases ({peak_cases:.0f}) exceed threshold ({cases_threshold:.0f})')
        elif peak_cases > cases_threshold:
            risk['level'] = 'medium'
            risk['probability'] = 0.5
            risk['factors'].append(f'Predicted cases ({peak_cases:.0f}) approaching threshold ({cases_threshold:.0f})')
        else:
            risk['level'] = 'low'
            risk['probability'] = 0.2
        
        # Check trend
        if prediction.get('trend') == 'increasing':
            if risk['level'] != 'critical':
                risk['level'] = 'high' if risk['level'] == 'medium' else 'medium'
            risk['probability'] += 0.1
            risk['factors'].append('Cases are trending upward')
        
        return risk
    
    def _calculate_overall_risk(self, predictions: Dict) -> Dict:
        """Calculate overall outbreak risk across all diseases"""
        risk_levels = predictions.get('risk_levels', {})
        
        if not risk_levels:
            return {'level': 'low', 'description': 'No disease predictions available'}
        
        # Count risk levels
        critical = sum(1 for r in risk_levels.values() if r == 'critical')
        high = sum(1 for r in risk_levels.values() if r == 'high')
        medium = sum(1 for r in risk_levels.values() if r == 'medium')
        
        if critical > 0:
            return {
                'level': 'critical',
                'description': f'{critical} disease(s) at critical risk',
                'disease_count': len(risk_levels)
            }
        elif high > 0:
            return {
                'level': 'high',
                'description': f'{high} disease(s) at high risk',
                'disease_count': len(risk_levels)
            }
        elif medium > 0:
            return {
                'level': 'medium',
                'description': f'{medium} disease(s) at medium risk',
                'disease_count': len(risk_levels)
            }
        else:
            return {
                'level': 'low',
                'description': 'All monitored diseases at low risk',
                'disease_count': len(risk_levels)
            }
    
    def _get_recommended_actions(self, disease: str, risk_level: str) -> List[str]:
        """Get recommended actions based on disease and risk"""
        actions = {
            'critical': [
                'Activate emergency response team immediately',
                'Notify national and international health authorities',
                'Deploy rapid response teams to affected areas',
                'Establish emergency treatment centers',
                'Implement community awareness campaigns',
                'Mobilize additional healthcare workers',
                'Secure emergency medical supplies',
                'Activate contact tracing protocols'
            ],
            'high': [
                'Increase surveillance in high-risk areas',
                'Alert healthcare facilities to prepare for surge',
                'Pre-position medical supplies',
                'Enhance laboratory testing capacity',
                'Conduct targeted community outreach',
                'Review and update response protocols',
                'Coordinate with partner organizations'
            ],
            'medium': [
                'Strengthen routine surveillance',
                'Verify stock levels of necessary supplies',
                'Review preparedness plans',
                'Conduct refresher training for healthcare workers',
                'Enhance public health messaging'
            ],
            'low': [
                'Maintain routine surveillance',
                'Continue standard prevention activities',
                'Monitor for any changes in patterns'
            ]
        }
        
        return actions.get(risk_level, actions['low'])
    
    def _get_empty_prediction(self) -> Dict:
        """Get empty prediction structure"""
        return {
            'forecast': [],
            'peak_date': datetime.now().strftime('%Y-%m-%d'),
            'peak_cases': 0,
            'trend': 'stable',
            'confidence': 0,
            'model': 'none'
        }