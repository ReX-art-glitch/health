from celery import Celery
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy.orm import Session

from .config import settings
from .models.database import get_db, AIAnalysis, Alert
from .services.ai_hub import AIHub
from .services.report_generator import ReportGenerator
from .services.alerts import AlertService

celery_app = Celery(
    'public_health_tasks',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,
)

@celery_app.task(name="process_excel_upload")
def process_excel_upload(file_path: str):
    """Process uploaded Excel file in background"""
    try:
        ai_hub = AIHub()
        result = ai_hub.analyze_excel_data(file_path)
        
        # Save results
        db = next(get_db())
        analysis = AIAnalysis(
            analysis_type="excel_upload",
            results=result,
            created_at=datetime.utcnow()
        )
        db.add(analysis)
        db.commit()
        
        return {"status": "completed", "analysis_id": analysis.id}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

@celery_app.task(name="generate_weekly_reports")
def generate_weekly_reports():
    """Generate weekly reports for all facilities"""
    try:
        db = next(get_db())
        report_gen = ReportGenerator()
        
        # Gather data
        facilities = db.query(Facility).all()
        
        for facility in facilities:
            data = gather_facility_data(db, facility.id)
            report = report_gen.generate_weekly_report(data)
            
            # Save report
            save_report(db, facility.id, 'weekly', report)
        
        return {"status": "completed", "facilities_processed": len(facilities)}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

@celery_app.task(name="run_daily_ai_analysis")
def run_daily_ai_analysis():
    """Run daily AI analysis on all data"""
    try:
        db = next(get_db())
        ai_hub = AIHub()
        
        # Analyze vaccination coverage
        vaccination_data = pd.read_sql(
            "SELECT * FROM vaccination_records",
            db.bind
        )
        coverage_analysis = ai_hub.analyze_vaccination_coverage(vaccination_data)
        
        # Detect anomalies
        anomalies = ai_hub.detect_anomalies(vaccination_data)
        
        # Check for alerts
        if coverage_analysis['overall_coverage'] < 80:
            AlertService.send_alert({
                'type': 'coverage_drop',
                'severity': 'high',
                'coverage': coverage_analysis['overall_coverage']
            })
        
        # Save analysis
        analysis = AIAnalysis(
            analysis_type="daily_analysis",
            results={
                'coverage': coverage_analysis,
                'anomalies': anomalies
            },
            created_at=datetime.utcnow()
        )
        db.add(analysis)
        db.commit()
        
        return {"status": "completed"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

@celery_app.task(name="predict_outbreaks")
def predict_outbreaks():
    """Run outbreak prediction models"""
    try:
        db = next(get_db())
        ai_hub = AIHub()
        
        disease_data = pd.read_sql(
            "SELECT * FROM disease_reports WHERE date_reported >= NOW() - INTERVAL '90 days'",
            db.bind
        )
        
        predictions = ai_hub.predict_outbreaks(disease_data)
        
        # Check for high-risk predictions
        for disease, pred in predictions.items():
            if pred.get('alert_threshold', 0) > 0.8:
                AlertService.send_alert({
                    'type': 'outbreak_prediction',
                    'severity': 'high',
                    'disease': disease,
                    'probability': pred['alert_threshold']
                })
        
        return {"status": "completed", "predictions": predictions}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

# Celery Beat schedule
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'generate-weekly-reports': {
        'task': 'generate_weekly_reports',
        'schedule': crontab(hour=0, minute=0, day_of_week='monday'),
    },
    'daily-ai-analysis': {
        'task': 'run_daily_ai_analysis',
        'schedule': crontab(hour=1, minute=0),
    },
    'predict-outbreaks': {
        'task': 'predict_outbreaks',
        'schedule': crontab(hour='*/6', minute=0),  # Every 6 hours
    },
}