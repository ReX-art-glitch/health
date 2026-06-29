from celery import shared_task
from ..models.database import get_db, AIAnalysis, Alert
from ..services.ai_hub import AIHub
from ..services.forecast_engine import ForecastEngine
from ..services.alerts import AlertService
import pandas as pd
import logging

logger = logging.getLogger(__name__)

@shared_task(name="run_daily_analysis")
def run_daily_analysis():
    """Run daily AI analysis on all data"""
    db = next(get_db())
    try:
        ai_hub = AIHub()
        
        # Analyze vaccination coverage
        vaccination_data = pd.read_sql("SELECT * FROM vaccination_records", db.bind)
        coverage_analysis = ai_hub.analyze_vaccination_coverage(vaccination_data)
        
        # Save analysis
        analysis = AIAnalysis(
            analysis_type="daily_analysis",
            results={"coverage": coverage_analysis},
        )
        db.add(analysis)
        db.commit()
        
        # Check for alerts
        if coverage_analysis.get('overall_coverage', 100) < 80:
            AlertService.send_alert({
                'type': 'coverage_drop',
                'severity': 'high',
                'message': f"Coverage dropped to {coverage_analysis['overall_coverage']}%",
            })
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Daily analysis error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="check_outbreak_alerts")
def check_outbreak_alerts():
    """Check for disease outbreak alerts"""
    db = next(get_db())
    try:
        forecast_engine = ForecastEngine()
        disease_data = pd.read_sql(
            "SELECT * FROM disease_reports WHERE date_reported >= NOW() - INTERVAL '30 days'",
            db.bind
        )
        
        if not disease_data.empty:
            predictions = forecast_engine.predict_disease_outbreak(disease_data)
            
            if predictions.get('outbreak_probability', 0) > 0.7:
                AlertService.send_alert({
                    'type': 'outbreak_prediction',
                    'severity': 'critical',
                    'message': f"High outbreak probability: {predictions['outbreak_probability']}",
                })
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Outbreak check error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="check_inventory_levels")
def check_inventory_levels():
    """Check drug inventory levels"""
    db = next(get_db())
    try:
        inventory_data = pd.read_sql("SELECT * FROM drug_inventory", db.bind)
        
        low_stock = inventory_data[inventory_data['quantity'] <= inventory_data['reorder_level']]
        
        for _, item in low_stock.iterrows():
            AlertService.send_alert({
                'type': 'stockout_risk',
                'severity': 'high',
                'message': f"Low stock alert: {item['drug_name']} at {item['quantity']} units",
            })
        
        return {"status": "success", "low_stock_items": len(low_stock)}
    except Exception as e:
        logger.error(f"Inventory check error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="retrain_models")
def retrain_models():
    """Retrain AI models with latest data"""
    db = next(get_db())
    try:
        ai_hub = AIHub()
        
        training_data = {
            'disease': pd.read_sql("SELECT * FROM disease_reports", db.bind),
            'risk': pd.read_sql("SELECT * FROM maternal_health_records", db.bind),
        }
        
        results = ai_hub.train_models(training_data)
        return {"status": "success", "results": results}
    except Exception as e:
        logger.error(f"Model retraining error: {e}")
        return {"status": "error", "message": str(e)}