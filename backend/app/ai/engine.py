"""
Main AI Engine - Orchestrates all AI operations for public health intelligence
"""
import asyncio
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from concurrent.futures import ThreadPoolExecutor
import joblib
import json
import os

from .models.disease_predictor import DiseasePredictor
from .models.coverage_analyzer import CoverageAnalyzer
from .models.risk_assessor import RiskAssessor
from .models.trend_detector import TrendDetector
from .models.anomaly_detector import AnomalyDetector
from .nlp.copilot import AICopilot
from .nlp.report_generator import NLPReportGenerator
from .nlp.insight_extractor import InsightExtractor
from .vision.ocr_processor import OCRProcessor
from .vision.form_recognizer import FormRecognizer
from .vision.image_analyzer import ImageAnalyzer
from .forecasting.outbreak_predictor import OutbreakPredictor
from .forecasting.demand_forecaster import DemandForecaster
from .forecasting.coverage_forecaster import CoverageForecaster
from .utils.data_processor import DataProcessor
from .utils.feature_engineer import FeatureEngineer
from .utils.model_manager import ModelManager

logger = logging.getLogger(__name__)

class AIEngine:
    """
    Central AI Engine that coordinates all AI/ML operations
    for the Public Health Intelligence Platform.
    """
    
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Initialize all components
        self.disease_predictor = DiseasePredictor()
        self.coverage_analyzer = CoverageAnalyzer()
        self.risk_assessor = RiskAssessor()
        self.trend_detector = TrendDetector()
        self.anomaly_detector = AnomalyDetector()
        self.copilot = AICopilot()
        self.report_generator = NLPReportGenerator()
        self.insight_extractor = InsightExtractor()
        self.ocr_processor = OCRProcessor()
        self.form_recognizer = FormRecognizer()
        self.image_analyzer = ImageAnalyzer()
        self.outbreak_predictor = OutbreakPredictor()
        self.demand_forecaster = DemandForecaster()
        self.coverage_forecaster = CoverageForecaster()
        
        # Utilities
        self.data_processor = DataProcessor()
        self.feature_engineer = FeatureEngineer()
        self.model_manager = ModelManager()
        
        # Model cache
        self.model_cache = {}
        
        # Initialize models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize or load pre-trained models"""
        try:
            model_path = self.config.get('model_path', './models')
            
            if os.path.exists(model_path):
                self.disease_predictor.load_model(f"{model_path}/disease_model.pkl")
                self.risk_assessor.load_model(f"{model_path}/risk_model.pkl")
                logger.info("Loaded pre-trained models from %s", model_path)
            else:
                logger.info("No pre-trained models found, using defaults")
        
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    async def analyze_health_data(
        self, 
        data: pd.DataFrame, 
        analysis_types: List[str] = None
    ) -> Dict:
        """
        Comprehensive health data analysis
        
        Args:
            data: DataFrame with health data
            analysis_types: List of analyses to perform (coverage, disease, risk, trends, anomalies)
            
        Returns:
            Dictionary with complete analysis results
        """
        if analysis_types is None:
            analysis_types = ['all']
        
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'data_summary': self.data_processor.summarize_data(data),
            'analyses': {}
        }
        
        tasks = []
        
        if 'all' in analysis_types or 'coverage' in analysis_types:
            tasks.append(self._analyze_coverage(data))
        
        if 'all' in analysis_types or 'disease' in analysis_types:
            tasks.append(self._analyze_disease(data))
        
        if 'all' in analysis_types or 'risk' in analysis_types:
            tasks.append(self._assess_risk(data))
        
        if 'all' in analysis_types or 'trends' in analysis_types:
            tasks.append(self._detect_trends(data))
        
        if 'all' in analysis_types or 'anomalies' in analysis_types:
            tasks.append(self._detect_anomalies(data))
        
        # Run analyses concurrently
        analysis_results = await asyncio.gather(*tasks)
        
        for result in analysis_results:
            results['analyses'].update(result)
        
        # Generate comprehensive insights
        results['insights'] = await self.insight_extractor.extract_insights(
            data, results['analyses']
        )
        
        # Generate actionable recommendations
        results['recommendations'] = await self._generate_recommendations(results)
        
        return results
    
    async def _analyze_coverage(self, data: pd.DataFrame) -> Dict:
        """Analyze vaccination coverage"""
        return {
            'coverage': await self.coverage_analyzer.analyze(data)
        }
    
    async def _analyze_disease(self, data: pd.DataFrame) -> Dict:
        """Analyze disease patterns"""
        return {
            'disease': await self.disease_predictor.analyze_patterns(data)
        }
    
    async def _assess_risk(self, data: pd.DataFrame) -> Dict:
        """Assess health risks"""
        return {
            'risk': await self.risk_assessor.assess(data)
        }
    
    async def _detect_trends(self, data: pd.DataFrame) -> Dict:
        """Detect trends in health data"""
        return {
            'trends': await self.trend_detector.detect(data)
        }
    
    async def _detect_anomalies(self, data: pd.DataFrame) -> Dict:
        """Detect anomalies"""
        return {
            'anomalies': await self.anomaly_detector.detect(data)
        }
    
    async def _generate_recommendations(self, results: Dict) -> List[Dict]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        # Coverage recommendations
        if 'coverage' in results.get('analyses', {}):
            coverage = results['analyses']['coverage']
            if coverage.get('overall_coverage', 100) < 80:
                recommendations.append({
                    'priority': 'high',
                    'category': 'vaccination',
                    'action': 'Implement catch-up vaccination campaigns',
                    'details': f"Coverage at {coverage['overall_coverage']:.1f}% is below 80% target",
                    'timeline': 'Immediate',
                    'impact': 'Prevent further coverage decline'
                })
            
            # Location-specific recommendations
            for location, loc_data in coverage.get('by_location', {}).items():
                if loc_data.get('coverage', 100) < 80:
                    recommendations.append({
                        'priority': 'high',
                        'category': 'vaccination',
                        'action': f'Targeted intervention in {location}',
                        'details': f'Coverage at {loc_data["coverage"]:.1f}%',
                        'location': location,
                        'timeline': 'Within 1 week'
                    })
        
        # Disease recommendations
        if 'disease' in results.get('analyses', {}):
            disease = results['analyses']['disease']
            if disease.get('outbreak_risk', {}).get('overall_risk', 0) > 0.7:
                recommendations.append({
                    'priority': 'critical',
                    'category': 'disease_surveillance',
                    'action': 'Activate outbreak response protocol',
                    'details': f"High outbreak risk detected: {disease.get('risk_factors', [])}",
                    'timeline': 'Within 24 hours'
                })
        
        # Risk recommendations
        if 'risk' in results.get('analyses', {}):
            risk = results['analyses']['risk']
            for area in risk.get('high_risk_areas', []):
                recommendations.append({
                    'priority': 'high',
                    'category': 'risk_mitigation',
                    'action': f"Deploy resources to {area['name']}",
                    'details': f"Risk score: {area['score']}",
                    'location': area['name'],
                    'timeline': 'Within 1 week'
                })
        
        return recommendations
    
    async def predict_outbreaks(
        self, 
        disease_data: pd.DataFrame,
        location: str = None
    ) -> Dict:
        """Predict disease outbreaks"""
        return await self.outbreak_predictor.predict(disease_data, location)
    
    async def process_document(self, image_data: bytes) -> Dict:
        """Process document/paper form using OCR"""
        ocr_result = await self.ocr_processor.process(image_data)
        form_result = await self.form_recognizer.recognize(ocr_result)
        
        return {
            'ocr': ocr_result,
            'form': form_result,
            'confidence': (ocr_result.get('confidence', 0) + form_result.get('confidence', 0)) / 2
        }
    
    async def analyze_image(self, image_data: bytes) -> Dict:
        """Analyze medical/health images"""
        return await self.image_analyzer.analyze(image_data)
    
    async def chat_response(self, query: str, context: Dict = None) -> Dict:
        """Get AI copilot response"""
        return await self.copilot.get_response(query, context)
    
    async def generate_report(
        self, 
        data: Dict, 
        report_type: str,
        format: str = 'docx'
    ) -> Dict:
        """Generate AI-powered report"""
        return await self.report_generator.generate(data, report_type, format)
    
    async def forecast_demand(self, inventory_data: pd.DataFrame) -> Dict:
        """Forecast drug/inventory demand"""
        return await self.demand_forecaster.forecast(inventory_data)
    
    async def forecast_coverage(
        self, 
        historical_data: pd.DataFrame,
        months_ahead: int = 3
    ) -> Dict:
        """Forecast vaccination coverage"""
        return await self.coverage_forecaster.forecast(historical_data, months_ahead)
    
    async def train_models(self, training_data: Dict) -> Dict:
        """Train or update AI models"""
        results = {}
        
        if 'disease' in training_data:
            results['disease_model'] = await self.disease_predictor.train(
                training_data['disease']
            )
        
        if 'risk' in training_data:
            results['risk_model'] = await self.risk_assessor.train(
                training_data['risk']
            )
        
        # Save trained models
        await self.model_manager.save_models(results)
        
        return {
            'status': 'success',
            'models_trained': list(results.keys()),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_model_performance(self) -> Dict:
        """Get performance metrics for all models"""
        return self.model_manager.get_performance_metrics()
    
    def get_system_status(self) -> Dict:
        """Get AI engine system status"""
        return {
            'status': 'operational',
            'models_loaded': len(self.model_cache),
            'last_training': self.model_manager.get_last_training_time(),
            'api_usage': {
                'openai_calls_today': self.copilot.get_daily_usage(),
                'ocr_processed_today': self.ocr_processor.get_daily_count()
            },
            'timestamp': datetime.utcnow().isoformat()
        }