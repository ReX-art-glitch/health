import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import openai
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from prophet import Prophet
import warnings
warnings.filterwarnings('ignore')

from ..config import settings
from ..models.database import get_db, HealthRecord, Vaccination, DiseaseReport

class AIHub:
    """Central AI Engine for Public Health Intelligence"""
    
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.models = {}
        self.scaler = StandardScaler()
        
    async def initialize(self):
        """Load pre-trained models"""
        self.models['anomaly_detector'] = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        self.models['coverage_predictor'] = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True
        )
    
    async def analyze_excel_data(self, file_path: str) -> Dict:
        """Analyze uploaded Excel data with comprehensive AI checks"""
        df = pd.read_excel(file_path)
        
        analysis = {
            "id": generate_id(),
            "file_info": {
                "rows": len(df),
                "columns": len(df.columns),
                "missing_values": df.isnull().sum().to_dict(),
                "duplicates": df.duplicated().sum()
            },
            "findings": {},
            "quality_metrics": {},
            "trends": {},
            "alerts": []
        }
        
        # Missing values analysis
        missing_pct = (df.isnull().sum() / len(df)) * 100
        analysis["quality_metrics"]["completeness"] = (1 - missing_pct.mean() / 100) * 100
        
        # Duplicate detection
        analysis["quality_metrics"]["uniqueness"] = (1 - df.duplicated().sum() / len(df)) * 100
        
        # Statistical analysis
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        if len(numeric_columns) > 0:
            stats = {}
            for col in numeric_columns:
                stats[col] = {
                    "mean": df[col].mean(),
                    "std": df[col].std(),
                    "min": df[col].min(),
                    "max": df[col].max(),
                    "quartiles": df[col].quantile([0.25, 0.5, 0.75]).to_dict()
                }
            analysis["findings"]["statistics"] = stats
        
        # Anomaly detection
        if len(numeric_columns) >= 2:
            anomalies = self.detect_anomalies(df[numeric_columns])
            analysis["alerts"].extend(anomalies)
        
        # Trend analysis
        analysis["trends"] = self.analyze_trends(df)
        
        # Generate insights
        analysis["insights"] = await self.generate_insights(analysis)
        
        return analysis
    
    def detect_anomalies(self, data: pd.DataFrame) -> List[Dict]:
        """Detect anomalies in health data"""
        anomalies = []
        
        # Fit isolation forest
        scaled_data = self.scaler.fit_transform(data.fillna(data.mean()))
        predictions = self.models['anomaly_detector'].fit_predict(scaled_data)
        
        # Identify anomaly indices
        anomaly_indices = np.where(predictions == -1)[0]
        
        for idx in anomaly_indices:
            anomalies.append({
                "type": "data_anomaly",
                "severity": "medium",
                "index": int(idx),
                "description": f"Unusual pattern detected in record {idx}",
                "values": data.iloc[idx].to_dict()
            })
        
        return anomalies
    
    def analyze_trends(self, df: pd.DataFrame) -> Dict:
        """Analyze temporal trends in health data"""
        trends = {}
        
        # Look for date columns
        date_columns = df.select_dtypes(include=['datetime64']).columns
        
        if len(date_columns) > 0:
            date_col = date_columns[0]
            
            # Vaccination coverage analysis
            if 'vaccination_coverage' in df.columns:
                coverage = df.groupby(df[date_col].dt.month)['vaccination_coverage'].mean()
                
                trends['vaccination'] = {
                    "current_coverage": coverage.iloc[-1],
                    "previous_coverage": coverage.iloc[-2] if len(coverage) > 1 else None,
                    "change": coverage.iloc[-1] - coverage.iloc[-2] if len(coverage) > 1 else 0,
                    "trend": "increasing" if coverage.iloc[-1] > coverage.iloc[-2] else "decreasing"
                }
            
            # Disease surveillance trends
            if 'disease_cases' in df.columns:
                disease_trend = df.groupby([date_col, 'disease_type'])['disease_cases'].sum()
                trends['disease_surveillance'] = disease_trend.to_dict()
        
        return trends
    
    async def generate_insights(self, analysis: Dict) -> Dict:
        """Generate AI insights using GPT-4"""
        prompt = f"""
        Analyze this public health data and provide actionable insights:
        
        Data Quality Metrics: {analysis['quality_metrics']}
        Statistical Findings: {analysis.get('findings', {}).get('statistics', {})}
        Detected Trends: {analysis.get('trends', {})}
        Alerts: {analysis.get('alerts', [])}
        
        Provide:
        1. Key findings and patterns
        2. Risk areas
        3. Recommendations
        4. Priority actions
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a public health intelligence expert analyzing health data."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            insights_text = response.choices[0].message.content
            
            return {
                "summary": insights_text,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {"error": str(e)}
    
    async def predict_outbreaks(self, disease_data: pd.DataFrame) -> Dict:
        """Predict potential disease outbreaks"""
        predictions = {}
        
        for disease in disease_data['disease_type'].unique():
            disease_df = disease_data[disease_data['disease_type'] == disease]
            
            # Prepare data for Prophet
            prophet_df = disease_df[['date', 'cases']].rename(
                columns={'date': 'ds', 'cases': 'y'}
            )
            
            # Fit model
            model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
            model.fit(prophet_df)
            
            # Make future predictions
            future = model.make_future_dataframe(periods=30)
            forecast = model.predict(future)
            
            predictions[disease] = {
                "forecast": forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(30).to_dict('records'),
                "trend": "increasing" if forecast['trend'].iloc[-1] > 0 else "decreasing",
                "alert_threshold": np.percentile(disease_df['cases'], 95)
            }
        
        return predictions
    
    async def analyze_vaccination_coverage(self, data: pd.DataFrame) -> Dict:
        """Analyze vaccination coverage and identify gaps"""
        analysis = {}
        
        # Overall coverage
        analysis['overall_coverage'] = data['vaccinated'].sum() / data['eligible'].sum() * 100
        
        # Coverage by location
        coverage_by_location = data.groupby('location').apply(
            lambda x: x['vaccinated'].sum() / x['eligible'].sum() * 100
        ).to_dict()
        analysis['coverage_by_location'] = coverage_by_location
        
        # Identify low-coverage areas
        low_coverage = {k: v for k, v in coverage_by_location.items() if v < 80}
        analysis['low_coverage_areas'] = low_coverage
        
        # Dropout analysis
        if 'dose_1' in data.columns and 'dose_2' in data.columns:
            dropout_rate = (data['dose_1'].sum() - data['dose_2'].sum()) / data['dose_1'].sum() * 100
            analysis['dropout_rate'] = dropout_rate
        
        # Generate recommendations
        analysis['recommendations'] = await self.generate_coverage_recommendations(analysis)
        
        return analysis
    
    async def generate_coverage_recommendations(self, analysis: Dict) -> List[str]:
        """Generate AI recommendations for improving coverage"""
        prompt = f"""
        Based on the following vaccination coverage analysis:
        - Overall coverage: {analysis['overall_coverage']}%
        - Low coverage areas: {analysis['low_coverage_areas']}
        - Dropout rate: {analysis.get('dropout_rate', 'N/A')}%
        
        Provide specific, actionable recommendations to improve vaccination coverage.
        Focus on the low-coverage areas identified.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a public health specialist."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500
            )
            
            recommendations = response.choices[0].message.content.split('\n')
            return [r.strip('- ') for r in recommendations if r.strip()]
        
        except Exception:
            return [
                "Deploy mobile vaccination teams to low-coverage areas",
                "Strengthen community engagement programs",
                "Improve data collection and follow-up systems",
                "Enhance cold chain management in remote areas"
            ]
    
    async def structure_health_data(self, ocr_result: Dict) -> Dict:
        """Structure OCR-extracted data into health records"""
        raw_text = ocr_result.get('text', '')
        
        prompt = f"""
        Extract and structure public health data from this text:
        {raw_text}
        
        Identify and structure:
        1. Facility information
        2. Patient demographics
        3. Health indicators
        4. Vaccination records
        5. Disease surveillance data
        6. Drug inventory
        7. Maternal health data
        
        Format as structured JSON.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            structured_data = json.loads(response.choices[0].message.content)
            
            return {
                "structured_data": structured_data,
                "confidence": ocr_result.get('confidence', 0),
                "needs_review": ocr_result.get('confidence', 0) < 0.85
            }
        
        except Exception as e:
            return {"error": str(e)}
    
    async def chat_response(self, query: str, context: Dict = None) -> Dict:
        """AI Copilot chat interface"""
        system_prompt = """
        You are an AI Public Health Copilot. You help public health directors and workers by:
        - Analyzing health data and trends
        - Identifying areas needing intervention
        - Explaining coverage drops
        - Suggesting resource allocation
        - Generating report summaries
        - Answering queries about health indicators
        
        Be concise, data-driven, and actionable in your responses.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            return {
                "response": response.choices[0].message.content,
                "timestamp": datetime.utcnow().isoformat(),
                "confidence": "high"
            }
        
        except Exception as e:
            return {
                "response": "I apologize, but I'm having trouble processing your request. Please try again.",
                "error": str(e)
            }