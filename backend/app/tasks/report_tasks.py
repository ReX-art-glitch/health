from celery import shared_task
from ..models.database import get_db, Report
from ..services.report_generator import ReportGenerator
from datetime import datetime, timedelta
import pandas as pd
import logging

logger = logging.getLogger(__name__)

@shared_task(name="generate_daily_summary")
def generate_daily_summary():
    """Generate daily summary report"""
    db = next(get_db())
    try:
        report_gen = ReportGenerator()
        today = datetime.now()
        
        data = gather_daily_data(db, today)
        report = report_gen.generate_weekly_report(data)
        
        # Save report
        report_record = Report(
            title=f"Daily Summary - {today.strftime('%Y-%m-%d')}",
            type="daily",
            file_path=f"reports/daily_{today.strftime('%Y%m%d')}.docx",
            status="generated",
        )
        db.add(report_record)
        db.commit()
        
        return {"status": "success", "report_id": report_record.id}
    except Exception as e:
        logger.error(f"Daily report generation error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="generate_weekly_reports")
def generate_weekly_reports():
    """Generate weekly reports for all facilities"""
    db = next(get_db())
    try:
        report_gen = ReportGenerator()
        
        facilities = db.query(Facility).all()
        for facility in facilities:
            data = gather_facility_weekly_data(db, facility.id)
            report = report_gen.generate_weekly_report(data)
        
        return {"status": "success", "facilities_processed": len(facilities)}
    except Exception as e:
        logger.error(f"Weekly report generation error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="generate_monthly_reports")
def generate_monthly_reports():
    """Generate monthly reports"""
    db = next(get_db())
    try:
        report_gen = ReportGenerator()
        data = gather_monthly_data(db)
        report = report_gen.generate_monthly_report(data)
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Monthly report generation error: {e}")
        return {"status": "error", "message": str(e)}

def gather_daily_data(db, date):
    """Gather daily data for reports"""
    return {
        "date": date.isoformat(),
        "vaccination": {},
        "diseases": {},
        "maternal": {},
    }

def gather_facility_weekly_data(db, facility_id):
    """Gather weekly facility data"""
    return {"facility_id": facility_id}

def gather_monthly_data(db):
    """Gather monthly data"""
    return {}