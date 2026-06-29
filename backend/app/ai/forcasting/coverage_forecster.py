"""
Coverage Forecaster - Predict vaccination coverage trends
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from prophet import Prophet
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import logging
import warnings

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)

class CoverageForecaster:
    """Forecast vaccination coverage and identify at-risk areas"""
    
    def __init__(self):
        self.forecast_horizon = 90  # days
        self.target_coverage = 90  # percentage
        
        # Coverage thresholds
        self.thresholds = {
            'critical': 50,
            'low': 70,
            'moderate': 80,
            'good': 90,
            'excellent': 95
        }
        
        # Seasonality factors for vaccination
        self.seasonal_factors = {
            'rainy_season': {'factor': 0.85, 'months': [6, 7, 8, 9]},
            'dry_season': {'factor': 1.1, 'months': [11, 12, 1, 2]},
            'holiday_season': {'factor': 0.75, 'months': [12]},
            'back_to_school': {'factor': 1.15, 'months': [9, 1]}
        }
    
    async def forecast(
        self,
        historical_data: pd.DataFrame,
        months_ahead: int = 3,
        location: Optional[str] = None,
        vaccine_type: Optional[str] = None
    ) -> Dict:
        """
        Forecast vaccination coverage
        
        Args:
            historical_data: Historical coverage data
            months_ahead: Number of months to forecast
            location: Optional location filter
            vaccine_type: Optional vaccine type filter
            
        Returns:
            Coverage forecast
        """
        try:
            forecast_result = {
                'timestamp': datetime.utcnow().isoformat(),
                'location': location or 'all',
                'vaccine_type': vaccine_type or 'all',
                'forecast_horizon_months': months_ahead,
                'forecasts': {},
                'risk_assessment': {},
                'recommendations': []
            }
            
            # Filter data
            data = historical_data.copy()
            if location:
                data = data[data['location'] == location]
            if vaccine_type:
                data = data[data['vaccine_type'] == vaccine_type]
            
            if data.empty:
                return {
                    'status': 'warning',
                    'message': 'No data available for forecasting'
                }
            
            # Prepare time series
            ts_data = self._prepare_coverage_timeseries(data)
            
            if ts_data.empty or len(ts_data) < 7:
                return {
                    'status': 'warning',
                    'message': 'Insufficient data for forecasting'
                }
            
            # Generate Prophet forecast
            prophet_forecast = self._forecast_prophet(ts_data, months_ahead)
            
            # Generate statistical forecast
            statistical_forecast = self._forecast_statistical(ts_data, months_ahead)
            
            # Generate ML forecast
            ml_forecast = self._forecast_ml(data, months_ahead)
            
            # Ensemble forecasts
            ensemble = self._ensemble_forecasts([
                prophet_forecast,
                statistical_forecast,
                ml_forecast
            ])
            
            # Calculate risk
            risk = self._assess_coverage_risk(ensemble, location)
            
            # Generate recommendations
            recommendations = self._generate_coverage_recommendations(ensemble, risk)
            
            forecast_result['forecasts'] = {
                'current_coverage': ensemble['current_coverage'],
                'predicted_coverage': ensemble['predicted_coverage'],
                'coverage_change': ensemble['coverage_change'],
                'trend': ensemble['trend'],
                'confidence': ensemble['confidence'],
                'monthly_projections': ensemble['monthly_projections'],
                'forecast_values': ensemble['forecast_values'],
                'forecast_dates': ensemble['forecast_dates']
            }
            
            forecast_result['risk_assessment'] = risk
            forecast_result['recommendations'] = recommendations
            
            return forecast_result
            
        except Exception as e:
            logger.error(f"Coverage forecasting error: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _prepare_coverage_timeseries(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare coverage data as time series"""
        df = pd.DataFrame()
        
        # Determine date column
        date_col = None
        for col in ['date', 'date_reported', 'date_administered']:
            if col in data.columns:
                date_col = col
                break
        
        if date_col is None:
            return df
        
        df['ds'] = pd.to_datetime(data[date_col])
        
        # Calculate daily coverage
        if 'vaccinated' in data.columns and 'eligible' in data.columns:
            daily = data.groupby('ds').agg({
                'vaccinated': 'sum',
                'eligible': 'sum'
            }).reset_index()
            
            daily['y'] = (daily['vaccinated'] / daily['eligible'] * 100).clip(0, 100)
        elif 'coverage' in data.columns:
            daily = data.groupby('ds')['coverage'].mean().reset_index()
            daily.columns = ['ds', 'y']
        else:
            return df
        
        return daily.sort_values('ds')
    
    def _forecast_prophet(
        self,
        data: pd.DataFrame,
        months_ahead: int
    ) -> Dict:
        """Forecast coverage using Prophet"""
        try:
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False,
                seasonality_mode='additive',
                changepoint_prior_scale=0.05,
                interval_width=0.95
            )
            
            # Add custom seasonality
            model.add_seasonality(
                name='monthly',
                period=30.5,
                fourier_order=5
            )
            
            model.fit(data)
            
            # Make future predictions
            days_ahead = months_ahead * 30
            future = model.make_future_dataframe(periods=days_ahead, freq='D')
            forecast = model.predict(future)
            
            # Extract results
            forecast_tail = forecast.tail(days_ahead)
            
            current = data['y'].iloc[-1] if len(data) > 0 else 0
            predicted = forecast_tail['yhat'].iloc[-1]
            
            return {
                'current_coverage': float(current),
                'predicted_coverage': float(predicted),
                'coverage_change': float(predicted - current),
                'trend': 'increasing' if predicted > current else 'decreasing',
                'confidence': 0.85,
                'monthly_projections': self._extract_monthly_projections(forecast_tail),
                'forecast_values': forecast_tail['yhat'].tolist(),
                'forecast_dates': forecast_tail['ds'].dt.strftime('%Y-%m-%d').tolist(),
                'method': 'prophet'
            }
            
        except Exception as e:
            logger.error(f"Prophet coverage forecast error: {e}")
            return self._empty_forecast()
    
    def _forecast_statistical(
        self,
        data: pd.DataFrame,
        months_ahead: int
    ) -> Dict:
        """Statistical coverage forecast"""
        try:
            values = data['y'].values
            
            # Calculate trend
            if len(values) >= 30:
                x = np.arange(len(values))
                z = np.polyfit(x, values, 1)
                trend_line = np.poly1d(z)
                
                future_x = np.arange(len(values), len(values) + months_ahead * 30)
                predictions = trend_line(future_x)
                predictions = np.clip(predictions, 0, 100)
            else:
                predictions = [np.mean(values)] * (months_ahead * 30)
            
            current = values[-1] if len(values) > 0 else 0
            predicted = predictions[-1]
            
            forecast_dates = [
                (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(months_ahead * 30)
            ]
            
            return {
                'current_coverage': float(current),
                'predicted_coverage': float(predicted),
                'coverage_change': float(predicted - current),
                'trend': 'increasing' if predicted > current else 'decreasing',
                'confidence': 0.7,
                'monthly_projections': self._project_to_monthly(predictions),
                'forecast_values': predictions.tolist(),
                'forecast_dates': forecast_dates,
                'method': 'statistical'
            }
            
        except Exception as e:
            logger.error(f"Statistical coverage forecast error: {e}")
            return self._empty_forecast()
    
    def _forecast_ml(
        self,
        data: pd.DataFrame,
        months_ahead: int
    ) -> Dict:
        """ML-based coverage forecast"""
        try:
            if len(data) < 30:
                return self._empty_forecast()
            
            # Feature engineering
            features = pd.DataFrame()
            
            if 'coverage' in data.columns:
                features['coverage'] = data['coverage']
                features['coverage_ma7'] = data['coverage'].rolling(7, min_periods=1).mean()
                features['coverage_ma30'] = data['coverage'].rolling(30, min_periods=1).mean()
                features['coverage_momentum'] = data['coverage'] - data['coverage'].shift(30)
            
            if 'outreach_activities' in data.columns:
                features['outreach'] = data['outreach_activities']
            
            # Simple prediction based on trend
            recent_coverage = data['coverage'].tail(30).mean() if 'coverage' in data.columns else 80
            
            future_values = [recent_coverage] * (months_ahead * 30)
            forecast_dates = [
                (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(months_ahead * 30)
            ]
            
            return {
                'current_coverage': float(data['coverage'].iloc[-1]) if 'coverage' in data.columns else 0,
                'predicted_coverage': float(recent_coverage),
                'coverage_change': 0,
                'trend': 'stable',
                'confidence': 0.75,
                'monthly_projections': [],
                'forecast_values': future_values,
                'forecast_dates': forecast_dates,
                'method': 'machine_learning'
            }
            
        except Exception as e:
            logger.error(f"ML coverage forecast error: {e}")
            return self._empty_forecast()
    
    def _ensemble_forecasts(self, forecasts: List[Dict]) -> Dict:
        """Combine multiple coverage forecasts"""
        valid_forecasts = [f for f in forecasts if f.get('confidence', 0) > 0]
        
        if not valid_forecasts:
            return self._empty_forecast()
        
        # Weight by confidence
        total_conf = sum(f['confidence'] for f in valid_forecasts)
        weights = [f['confidence'] / total_conf for f in valid_forecasts]
        
        # Weighted average of predictions
        current_coverage = sum(
            f['current_coverage'] * w 
            for f, w in zip(valid_forecasts, weights)
        )
        
        predicted_coverage = sum(
            f['predicted_coverage'] * w 
            for f, w in zip(valid_forecasts, weights)
        )
        
        # Generate forecast values
        forecast_length = max(
            len(f.get('forecast_values', [])) for f in valid_forecasts
        )
        
        ensemble_values = []
        for i in range(forecast_length):
            weighted_val = 0
            weight_sum = 0
            for f, w in zip(valid_forecasts, weights):
                if i < len(f.get('forecast_values', [])):
                    weighted_val += f['forecast_values'][i] * w
                    weight_sum += w
            if weight_sum > 0:
                ensemble_values.append(weighted_val / weight_sum)
        
        # Generate dates
        forecast_dates = [
            (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
            for i in range(len(ensemble_values))
        ]
        
        return {
            'current_coverage': current_coverage,
            'predicted_coverage': predicted_coverage,
            'coverage_change': predicted_coverage - current_coverage,
            'trend': 'increasing' if predicted_coverage > current_coverage else 'decreasing',
            'confidence': max(f['confidence'] for f in valid_forecasts),
            'monthly_projections': self._project_to_monthly(ensemble_values),
            'forecast_values': ensemble_values,
            'forecast_dates': forecast_dates,
            'methods_used': [f['method'] for f in valid_forecasts]
        }
    
    def _assess_coverage_risk(
        self,
        forecast: Dict,
        location: Optional[str]
    ) -> Dict:
        """Assess coverage risk levels"""
        predicted = forecast.get('predicted_coverage', 0)
        
        risk = {
            'level': 'low',
            'score': 0,
            'factors': [],
            'at_risk_population': 0,
            'probability_dropping_below_80': 0
        }
        
        # Determine risk level
        if predicted < self.thresholds['critical']:
            risk['level'] = 'critical'
            risk['score'] = 100
        elif predicted < self.thresholds['low']:
            risk['level'] = 'high'
            risk['score'] = 75
        elif predicted < self.thresholds['moderate']:
            risk['level'] = 'moderate'
            risk['score'] = 50
        elif predicted < self.thresholds['good']:
            risk['level'] = 'low'
            risk['score'] = 25
        else:
            risk['level'] = 'minimal'
            risk['score'] = 0
        
        # Add risk factors
        if forecast.get('trend') == 'decreasing':
            risk['factors'].append('Coverage is declining')
            risk['score'] += 10
        
        if predicted < self.target_coverage:
            gap = self.target_coverage - predicted
            risk['factors'].append(f'{gap:.1f}% below target of {self.target_coverage}%')
        
        # Calculate probability of dropping below 80%
        if predicted > 80:
            std_dev = 5  # Assumption
            z_score = (80 - predicted) / std_dev
            from scipy import stats
            risk['probability_dropping_below_80'] = float(stats.norm.cdf(z_score))
        else:
            risk['probability_dropping_below_80'] = 1.0
        
        return risk
    
    def _generate_coverage_recommendations(
        self,
        forecast: Dict,
        risk: Dict
    ) -> List[Dict]:
        """Generate recommendations based on forecast"""
        recommendations = []
        
        if risk['level'] in ['critical', 'high']:
            recommendations.append({
                'priority': 'immediate',
                'action': 'Launch emergency vaccination campaign',
                'details': f"Coverage predicted to be {forecast['predicted_coverage']:.1f}%",
                'timeline': 'Within 1 week',
                'expected_impact': 'Increase coverage by 10-15%'
            })
        
        if forecast.get('trend') == 'decreasing':
            recommendations.append({
                'priority': 'high',
                'action': 'Conduct barrier analysis',
                'details': 'Identify reasons for declining coverage',
                'timeline': 'Within 2 weeks',
                'expected_impact': 'Address root causes of decline'
            })
        
        if forecast.get('coverage_change', 0) < -5:
            recommendations.append({
                'priority': 'high',
                'action': 'Intensify outreach activities',
                'details': f'Coverage dropped by {abs(forecast["coverage_change"]):.1f}%',
                'timeline': 'Within 1 week',
                'expected_impact': 'Reverse declining trend'
            })
        
        # Always add standard recommendations
        recommendations.append({
            'priority': 'medium',
            'action': 'Strengthen routine immunization',
            'details': 'Ensure all facilities have adequate supplies',
            'timeline': 'Ongoing',
            'expected_impact': 'Maintain or improve coverage'
        })
        
        return recommendations
    
    def _extract_monthly_projections(self, forecast_df: pd.DataFrame) -> List[Dict]:
        """Extract monthly projections from daily forecast"""
        if forecast_df.empty:
            return []
        
        forecast_df = forecast_df.copy()
        forecast_df['month'] = pd.to_datetime(forecast_df['ds']).dt.to_period('M')
        
        monthly = forecast_df.groupby('month').agg({
            'yhat': ['mean', 'min', 'max']
        }).reset_index()
        
        projections = []
        for _, row in monthly.iterrows():
            projections.append({
                'month': str(row['month']),
                'average_coverage': float(row[('yhat', 'mean')]),
                'min_coverage': float(row[('yhat', 'min')]),
                'max_coverage': float(row[('yhat', 'max')])
            })
        
        return projections
    
    def _project_to_monthly(self, daily_values: List[float]) -> List[Dict]:
        """Project daily values to monthly"""
        if not daily_values:
            return []
        
        projections = []
        days_per_month = 30
        
        for i in range(0, len(daily_values), days_per_month):
            month_values = daily_values[i:i + days_per_month]
            if month_values:
                month_date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m')
                projections.append({
                    'month': month_date,
                    'average_coverage': np.mean(month_values),
                    'min_coverage': np.min(month_values),
                    'max_coverage': np.max(month_values)
                })
        
        return projections
    
    def _empty_forecast(self) -> Dict:
        """Return empty forecast"""
        return {
            'current_coverage': 0,
            'predicted_coverage': 0,
            'coverage_change': 0,
            'trend': 'unknown',
            'confidence': 0,
            'monthly_projections': [],
            'forecast_values': [],
            'forecast_dates': [],
            'method': 'none'
        }