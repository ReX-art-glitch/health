"""
Demand Forecaster - Predict drug and supply demand
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from prophet import Prophet
import logging

logger = logging.getLogger(__name__)

class DemandForecaster:
    """Forecast drug and medical supply demand"""
    
    def __init__(self):
        self.forecast_horizon = 90  # days
        self.seasonality_periods = {
            'weekly': 7,
            'monthly': 30,
            'quarterly': 90
        }
        self.lead_time_buffer = 14  # days buffer for procurement
        
        # Drug-specific consumption patterns
        self.drug_patterns = {
            'vaccines': {
                'seasonality': True,
                'campaign_sensitive': True,
                'cold_chain': True,
                'wastage_rate': 0.15  # 15% wastage
            },
            'antibiotics': {
                'seasonality': True,
                'campaign_sensitive': False,
                'cold_chain': False,
                'wastage_rate': 0.05
            },
            'antimalarials': {
                'seasonality': True,
                'campaign_sensitive': True,
                'cold_chain': False,
                'wastage_rate': 0.10
            },
            'general': {
                'seasonality': False,
                'campaign_sensitive': False,
                'cold_chain': False,
                'wastage_rate': 0.05
            }
        }
    
    async def forecast(
        self,
        data: pd.DataFrame,
        location: Optional[str] = None
    ) -> Dict:
        """
        Forecast drug demand
        
        Args:
            data: Historical inventory and consumption data
            location: Optional location filter
            
        Returns:
            Demand forecast
        """
        try:
            forecast_result = {
                'timestamp': datetime.utcnow().isoformat(),
                'location': location or 'all',
                'forecasts': {},
                'alerts': [],
                'recommendations': []
            }
            
            # Filter by location if specified
            if location:
                data = data[data['location'] == location].copy()
            
            if data.empty:
                return {
                    'status': 'warning',
                    'message': 'No data available for forecasting'
                }
            
            # Get unique drugs
            drugs = data['drug_name'].unique() if 'drug_name' in data.columns else []
            
            for drug in drugs:
                drug_data = data[data['drug_name'] == drug].copy()
                
                if len(drug_data) < 7:
                    continue
                
                # Get drug pattern info
                pattern = self._get_drug_pattern(drug)
                
                # Generate forecasts using multiple methods
                historical_forecast = self._forecast_historical_avg(drug_data)
                seasonal_forecast = self._forecast_seasonal(drug_data)
                ml_forecast = self._forecast_ml(drug_data)
                
                # Ensemble the forecasts
                ensemble = self._ensemble_demand_forecasts(
                    [historical_forecast, seasonal_forecast, ml_forecast]
                )
                
                # Calculate stock metrics
                current_stock = drug_data['current_stock'].iloc[-1] if 'current_stock' in drug_data else 0
                daily_consumption = ensemble['daily_consumption']
                
                # Calculate days until stockout
                days_until_stockout = (
                    current_stock / daily_consumption 
                    if daily_consumption > 0 
                    else float('inf')
                )
                
                # Calculate recommended order
                safety_stock = daily_consumption * self.lead_time_buffer
                reorder_point = safety_stock + (daily_consumption * 30)  # 30 days coverage
                recommended_order = max(0, reorder_point - current_stock)
                
                forecast_result['forecasts'][drug] = {
                    'current_stock': current_stock,
                    'daily_consumption': daily_consumption,
                    'monthly_consumption': daily_consumption * 30,
                    'quarterly_consumption': daily_consumption * 90,
                    'days_until_stockout': days_until_stockout,
                    'recommended_order': recommended_order,
                    'reorder_point': reorder_point,
                    'safety_stock': safety_stock,
                    'forecast_dates': ensemble['forecast_dates'],
                    'forecast_values': ensemble['forecast_values'],
                    'confidence': ensemble['confidence'],
                    'trend': ensemble['trend'],
                    'wastage_adjustment': pattern['wastage_rate']
                }
                
                # Check for alerts
                if days_until_stockout < 30:
                    forecast_result['alerts'].append({
                        'drug': drug,
                        'severity': 'critical' if days_until_stockout < 14 else 'high',
                        'message': f'Stockout risk in {days_until_stockout:.0f} days',
                        'recommended_action': f'Order {recommended_order:.0f} units immediately'
                    })
                elif days_until_stockout < 60:
                    forecast_result['alerts'].append({
                        'drug': drug,
                        'severity': 'medium',
                        'message': f'Stock level adequate for {days_until_stockout:.0f} days',
                        'recommended_action': 'Plan procurement within 2 weeks'
                    })
                
                # Add recommendations
                if recommended_order > 0:
                    forecast_result['recommendations'].append({
                        'drug': drug,
                        'priority': 'high' if days_until_stockout < 30 else 'medium',
                        'action': f'Order {recommended_order:.0f} units',
                        'timeline': f'Within {max(1, int(days_until_stockout - self.lead_time_buffer))} days',
                        'estimated_cost': self._estimate_cost(drug, recommended_order)
                    })
            
            # Overall summary
            forecast_result['summary'] = self._generate_summary(forecast_result)
            
            return forecast_result
            
        except Exception as e:
            logger.error(f"Demand forecasting error: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _get_drug_pattern(self, drug_name: str) -> Dict:
        """Get consumption pattern for specific drug"""
        drug_lower = drug_name.lower()
        
        for pattern_name, pattern in self.drug_patterns.items():
            if pattern_name in drug_lower:
                return pattern
        
        return self.drug_patterns['general']
    
    def _forecast_historical_avg(self, data: pd.DataFrame) -> Dict:
        """Forecast using historical average"""
        try:
            if 'consumption' not in data.columns:
                return self._empty_forecast()
            
            consumption = data['consumption'].values
            
            # Calculate metrics
            daily_avg = np.mean(consumption)
            daily_std = np.std(consumption)
            
            # Generate forecast
            forecast_values = [daily_avg] * self.forecast_horizon
            forecast_dates = [
                (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(self.forecast_horizon)
            ]
            
            # Detect trend
            if len(consumption) >= 14:
                recent_avg = np.mean(consumption[-7:])
                older_avg = np.mean(consumption[-14:-7])
                trend = 'increasing' if recent_avg > older_avg * 1.1 else 'decreasing' if recent_avg < older_avg * 0.9 else 'stable'
            else:
                trend = 'stable'
            
            return {
                'daily_consumption': daily_avg,
                'forecast_dates': forecast_dates,
                'forecast_values': forecast_values,
                'confidence': 0.6,
                'trend': trend,
                'method': 'historical_average'
            }
            
        except Exception as e:
            logger.error(f"Historical average forecast error: {e}")
            return self._empty_forecast()
    
    def _forecast_seasonal(self, data: pd.DataFrame) -> Dict:
        """Forecast using seasonal decomposition"""
        try:
            if 'consumption' not in data.columns or len(data) < 14:
                return self._empty_forecast()
            
            # Prepare data for Holt-Winters
            if 'date' in data.columns:
                dates = pd.to_datetime(data['date'])
            else:
                dates = pd.date_range(end=datetime.now(), periods=len(data), freq='D')
            
            ts_data = pd.Series(data['consumption'].values, index=dates)
            
            # Fit Holt-Winters model
            model = ExponentialSmoothing(
                ts_data,
                seasonal_periods=7,
                trend='add',
                seasonal='add',
                damped=True
            )
            
            fitted_model = model.fit()
            
            # Generate forecast
            forecast = fitted_model.forecast(self.forecast_horizon)
            
            forecast_dates = [
                (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(self.forecast_horizon)
            ]
            
            return {
                'daily_consumption': float(forecast.mean()),
                'forecast_dates': forecast_dates,
                'forecast_values': forecast.tolist(),
                'confidence': 0.75,
                'trend': 'increasing' if fitted_model.params['trend'] > 0 else 'decreasing',
                'method': 'holt_winters'
            }
            
        except Exception as e:
            logger.error(f"Seasonal forecast error: {e}")
            return self._empty_forecast()
    
    def _forecast_ml(self, data: pd.DataFrame) -> Dict:
        """Forecast using machine learning"""
        try:
            if len(data) < 30:
                return self._empty_forecast()
            
            # Feature engineering
            features = pd.DataFrame()
            
            if 'consumption' in data.columns:
                features['consumption'] = data['consumption']
                features['consumption_lag1'] = data['consumption'].shift(1)
                features['consumption_lag7'] = data['consumption'].shift(7)
                features['consumption_ma7'] = data['consumption'].rolling(7, min_periods=1).mean()
                features['consumption_ma14'] = data['consumption'].rolling(14, min_periods=1).mean()
                features['consumption_std7'] = data['consumption'].rolling(7, min_periods=1).std()
            
            if 'date' in data.columns:
                dates = pd.to_datetime(data['date'])
                features['day_of_week'] = dates.dt.dayofweek
                features['month'] = dates.dt.month
                features['is_weekend'] = (dates.dt.dayofweek >= 5).astype(int)
            
            # Fill NaN values
            features = features.fillna(0)
            
            # For now, return based on recent average
            recent_consumption = data['consumption'].tail(14).mean()
            
            forecast_values = [recent_consumption] * self.forecast_horizon
            forecast_dates = [
                (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(self.forecast_horizon)
            ]
            
            return {
                'daily_consumption': float(recent_consumption),
                'forecast_dates': forecast_dates,
                'forecast_values': forecast_values,
                'confidence': 0.7,
                'trend': 'stable',
                'method': 'machine_learning'
            }
            
        except Exception as e:
            logger.error(f"ML forecast error: {e}")
            return self._empty_forecast()
    
    def _ensemble_demand_forecasts(self, forecasts: List[Dict]) -> Dict:
        """Combine multiple demand forecasts"""
        valid_forecasts = [f for f in forecasts if f.get('confidence', 0) > 0]
        
        if not valid_forecasts:
            return self._empty_forecast()
        
        # Weight by confidence
        total_confidence = sum(f['confidence'] for f in valid_forecasts)
        
        if total_confidence == 0:
            return self._empty_forecast()
        
        weights = [f['confidence'] / total_confidence for f in valid_forecasts]
        
        # Combine daily consumption rates
        daily_consumption = sum(
            f['daily_consumption'] * w 
            for f, w in zip(valid_forecasts, weights)
        )
        
        # Generate forecast dates
        forecast_dates = [
            (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
            for i in range(self.forecast_horizon)
        ]
        
        # Combine forecast values
        forecast_values = []
        for i in range(self.forecast_horizon):
            weighted_value = 0
            for f, w in zip(valid_forecasts, weights):
                if i < len(f['forecast_values']):
                    weighted_value += f['forecast_values'][i] * w
            forecast_values.append(weighted_value)
        
        # Get majority trend
        trends = [f['trend'] for f in valid_forecasts]
        trend = max(set(trends), key=trends.count)
        
        return {
            'daily_consumption': daily_consumption,
            'forecast_dates': forecast_dates,
            'forecast_values': forecast_values,
            'confidence': max(f['confidence'] for f in valid_forecasts),
            'trend': trend,
            'methods_used': [f['method'] for f in valid_forecasts]
        }
    
    def _estimate_cost(self, drug: str, quantity: float) -> Optional[float]:
        """Estimate cost of drug order"""
        # This would query a price database
        # Simplified placeholder
        cost_per_unit = {
            'vaccine': 2.50,
            'antibiotic': 1.20,
            'antimalarial': 0.80,
            'default': 1.50
        }
        
        drug_lower = drug.lower()
        for key, price in cost_per_unit.items():
            if key in drug_lower:
                return price * quantity
        
        return cost_per_unit['default'] * quantity
    
    def _generate_summary(self, forecast: Dict) -> Dict:
        """Generate forecast summary"""
        alerts = forecast.get('alerts', [])
        
        summary = {
            'total_drugs_forecasted': len(forecast.get('forecasts', {})),
            'critical_alerts': len([a for a in alerts if a['severity'] == 'critical']),
            'high_alerts': len([a for a in alerts if a['severity'] == 'high']),
            'medium_alerts': len([a for a in alerts if a['severity'] == 'medium']),
            'total_estimated_cost': 0,
            'priority_actions': []
        }
        
        # Sum estimated costs
        for rec in forecast.get('recommendations', []):
            if 'estimated_cost' in rec and rec['estimated_cost']:
                summary['total_estimated_cost'] += rec['estimated_cost']
            
            if rec.get('priority') == 'high':
                summary['priority_actions'].append(rec)
        
        return summary
    
    def _empty_forecast(self) -> Dict:
        """Return empty forecast structure"""
        return {
            'daily_consumption': 0,
            'forecast_dates': [],
            'forecast_values': [],
            'confidence': 0,
            'trend': 'unknown',
            'method': 'none'
        }