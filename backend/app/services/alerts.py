from twilio.rest import Client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import asyncio
from typing import Dict
from datetime import datetime

from ..config import settings

class AlertService:
    """Multi-channel alert system"""
    
    @staticmethod
    async def send_sms_alert(alert_data: Dict):
        """Send SMS alert via Twilio"""
        if not settings.TWILIO_ACCOUNT_SID:
            return
        
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        message = f"""
        [PUBLIC HEALTH ALERT]
        Type: {alert_data['type']}
        Severity: {alert_data['severity']}
        Location: {alert_data.get('location', 'Unknown')}
        Details: {alert_data.get('disease', '')} - {alert_data.get('cases', 0)} cases
        
        Action Required: Immediate investigation
        """
        
        # Send to predefined list of health officials
        emergency_contacts = [
            '+234XXXXXXXXXX',  # State epidemiologist
            '+234XXXXXXXXXX',  # LGA health officer
        ]
        
        for contact in emergency_contacts:
            try:
                client.messages.create(
                    body=message,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=contact
                )
            except Exception as e:
                print(f"Failed to send SMS to {contact}: {e}")
    
    @staticmethod
    async def send_email_alert(alert_data: Dict):
        """Send email alert via SendGrid"""
        if not settings.SENDGRID_API_KEY:
            return
        
        message = Mail(
            from_email='alerts@publichealthai.com',
            to_emails=['director@healthministry.gov', 'who@countryoffice.org'],
            subject=f'[URGENT] Public Health Alert: {alert_data.get("disease", "Unknown")}',
            html_content=f"""
            <h2>Public Health Alert</h2>
            <p><strong>Type:</strong> {alert_data['type']}</p>
            <p><strong>Severity:</strong> {alert_data['severity']}</p>
            <p><strong>Location:</strong> {alert_data.get('location')}</p>
            <p><strong>Cases:</strong> {alert_data.get('cases')}</p>
            <p><strong>Timestamp:</strong> {datetime.utcnow()}</p>
            <hr>
            <p>Please log into the dashboard for detailed analysis.</p>
            """
        )
        
        try:
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            sg.send(message)
        except Exception as e:
            print(f"Failed to send email: {e}")
    
    @staticmethod
    async def push_dashboard_alert(alert_data: Dict):
        """Push real-time alert to dashboard via WebSocket"""
        # WebSocket implementation for real-time updates
        pass
    
    @staticmethod
    async def generate_alert_summary(db_session) -> Dict:
        """Generate alert summary for dashboard"""
        from ..models.database import Alert
        
        active_alerts = db_session.query(Alert).filter(
            Alert.status == 'active'
        ).all()
        
        summary = {
            "total_active": len(active_alerts),
            "critical": len([a for a in active_alerts if a.severity == 'critical']),
            "by_type": {},
            "by_location": {}
        }
        
        for alert in active_alerts:
            summary["by_type"][alert.type] = summary["by_type"].get(alert.type, 0) + 1
            summary["by_location"][alert.location] = summary["by_location"].get(alert.location, 0) + 1
        
        return summary