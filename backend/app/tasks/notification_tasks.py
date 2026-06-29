from celery import shared_task
from ..services.alerts import AlertService
from ..models.database import get_db, User, Alert
from ..config.email_config import email_config
import logging

logger = logging.getLogger(__name__)

@shared_task(name="send_daily_digest")
def send_daily_digest():
    """Send daily notification digest"""
    db = next(get_db())
    try:
        # Get active alerts
        active_alerts = db.query(Alert).filter(Alert.status == 'active').all()
        
        if active_alerts:
            # Get users who should receive digest
            users = db.query(User).filter(User.is_active == True).all()
            
            for user in users:
                if user.email:
                    send_digest_email(user, active_alerts)
        
        return {"status": "success", "alerts_count": len(active_alerts)}
    except Exception as e:
        logger.error(f"Daily digest error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="send_bulk_sms")
def send_bulk_sms(recipients: list, message: str):
    """Send bulk SMS notifications"""
    try:
        for recipient in recipients:
            AlertService.send_sms_alert({
                'recipient': recipient,
                'message': message,
            })
        return {"status": "success", "recipients": len(recipients)}
    except Exception as e:
        logger.error(f"Bulk SMS error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="send_email_notification")
def send_email_notification(to_email: str, subject: str, body: str):
    """Send email notification"""
    try:
        email_config.send_email(to_email, subject, body)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Email notification error: {e}")
        return {"status": "error", "message": str(e)}

def send_digest_email(user, alerts):
    """Send digest email to user"""
    # Implementation would use email_config
    pass