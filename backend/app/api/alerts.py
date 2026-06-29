from fastapi import APIRouter, BackgroundTasks, Depends
from typing import List
from ..services.alerts import AlertService
from ..models.database import get_db, Alert

router = APIRouter()

@router.post("/send-outbreak-alert")
async def send_outbreak_alert(
    location: str,
    disease: str,
    cases: int,
    background_tasks: BackgroundTasks
):
    """Send outbreak alert via multiple channels"""
    alert_data = {
        "type": "outbreak",
        "severity": "critical",
        "location": location,
        "disease": disease,
        "cases": cases,
        "timestamp": datetime.utcnow()
    }
    
    # Send via all channels
    background_tasks.add_task(AlertService.send_sms_alert, alert_data)
    background_tasks.add_task(AlertService.send_email_alert, alert_data)
    background_tasks.add_task(AlertService.push_dashboard_alert, alert_data)
    
    return {"status": "alerts_dispatched"}

@router.get("/active-alerts")
async def get_active_alerts(db: Session = Depends(get_db)):
    """Get all active alerts"""
    alerts = db.query(Alert).filter(Alert.status == "active").all()
    return alerts