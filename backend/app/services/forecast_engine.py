import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.ensemble import GradientBoostingRegressor
from typing import Dict, List
import warnings
warnings.filterwarnings('ignore')

class ForecastEngine:
    """AI Forecasting for public health indicators"""
    
    def __init__(self):
        self.models = {}
    
    async def forecast_vaccination_coverage(self, historical_data: pd.DataFrame) -> Dict:
        """Forecast vaccination coverage"""
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        
        # Prepare data
        df = historical_data.rename(columns={'date': 'ds', 'coverage': 'y'})
        
        # Add regressors
        if 'outreach_activities' in historical_data.columns:
            df['outreach'] = historical_data['outreach_activities']
            model.add_regressor('outreach')
        
        model.fit(df)
        
        # Make future dataframe
        future = model.make_future_dataframe(periods=90)
        if 'outreach_activities' in historical_data.columns:
            future['outreach'] = historical_data['outreach_activities'].mean()
        
        forecast = model.predict(future)
        
        return {
            "forecast": forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(90).to_dict('records'),
            "trend": "increasing" if forecast['trend'].iloc[-1] > 0 else "decreasing",
            "confidence": 0.85,
            "recommendations": self.generate_forecast_recommendations(forecast)
        }
    
    async def predict_disease_outbreak(self, disease_data: pd.DataFrame) -> Dict:
        """Predict disease outbreak likelihood"""
        # Feature engineering
        features = self.engineer_disease_features(disease_data)
        
        # Train model
        model = GradientBoostingRegressor(n_estimators=100)
        
        # Prepare target (cases in next 7 days)
        target = disease_data['cases'].shift(-7).fillna(0)
        
        model.fit(features[:-7], target[:-7])
        
        # Predict
        predictions = model.predict(features.tail(7))
        
        outbreak_probability = self.calculate_outbreak_probability(predictions)
        
        return {
            "outbreak_probability": outbreak_probability,
            "predicted_cases": predictions.tolist(),
            "risk_level": "high" if outbreak_probability > 0.7 else "medium" if outbreak_probability > 0.4 else "low",
            "early_warning": outbreak_probability > 0.6
        }
    
    async def forecast_drug_demand(self, inventory_data: pd.DataFrame) -> Dict:
        """Forecast drug demand for supply chain"""
        demand_forecast = {}
        
        for drug in inventory_data['drug_name'].unique():
            drug_df = inventory_data[inventory_data['drug_name'] == drug]
            
            # Calculate consumption rate
            consumption_rate = drug_df['quantity_used'].diff().mean()
            
            # Forecast demand
            days_until_stockout = drug_df['current_stock'].iloc[-1] / consumption_rate if consumption_rate > 0 else float('inf')
            
            demand_forecast[drug] = {
                "current_stock": drug_df['current_stock'].iloc[-1],
                "daily_consumption": consumption_rate,
                "days_until_stockout": days_until_stockout,
                "recommended_order": max(0, (90 * consumption_rate) - drug_df['current_stock'].iloc[-1]),
                "priority": "high" if days_until_stockout < 30 else "medium" if days_until_stockout < 60 else "low"
            }
        
        return demand_forecast
    
    def engineer_disease_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for disease prediction"""
        features = pd.DataFrame()
        
        features['cases_7day_avg'] = data['cases'].rolling(7).mean()
        features['cases_14day_avg'] = data['cases'].rolling(14).mean()
        features['cases_momentum'] = data['cases'] - data['cases'].shift(7)
        features['seasonality'] = pd.to_datetime(data['date']).dt.month
        features['day_of_week'] = pd.to_datetime(data['date']).dt.dayofweek
        
        return features.fillna(0)
    
    def calculate_outbreak_probability(self, predictions: np.array) -> float:
        """Calculate outbreak probability based on predictions"""
        threshold = np.percentile(predictions, 95)
        exceeding_threshold = np.sum(predictions > threshold)
        return min(exceeding_threshold / len(predictions) * 2, 1.0)  # Scale factor
    
    def generate_forecast_recommendations(self, forecast: pd.DataFrame) -> List[str]:
        """Generate recommendations based on forecast"""
        recommendations = []
        
        trend = forecast['trend'].iloc[-1]
        lower_bound = forecast['yhat_lower'].iloc[-1]
        
        if trend < 0:
            recommendations.append("Coverage is declining - implement catch-up campaigns")
        
        if lower_bound < 80:
            recommendations.append("Risk of dropping below 80% coverage - prepare emergency response")
        
        recommendations.append("Maintain current outreach activities to sustain gains")
        
        return recommendations