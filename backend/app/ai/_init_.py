"""
AI Engine for Public Health Intelligence Platform
Handles all AI/ML operations including:
- Disease prediction and outbreak detection
- Vaccination coverage analysis
- Risk assessment
- NLP for reports and chatbot
- OCR for paper forms
- Time series forecasting
"""

from .engine import AIEngine
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

__all__ = [
    'AIEngine',
    'DiseasePredictor',
    'CoverageAnalyzer',
    'RiskAssessor',
    'TrendDetector',
    'AnomalyDetector',
    'AICopilot',
    'NLPReportGenerator',
    'InsightExtractor',
    'OCRProcessor',
    'FormRecognizer',
    'ImageAnalyzer',
    'OutbreakPredictor',
    'DemandForecaster',
    'CoverageForecaster',
]