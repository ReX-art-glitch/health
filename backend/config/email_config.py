"""
Email Configuration
"""
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime
import os
import json
import logging

logger = logging.getLogger(__name__)

class EmailConfig:
    """Email configuration and template management"""
    
    def __init__(self, settings=None):
        self.settings = settings
        
        # Email providers
        self.providers = {
            'sendgrid': {
                'name': 'SendGrid',
                'api_key_env': 'SENDGRID_API_KEY',
                'max_recipients': 1000,
                'templates_supported': True
            },
            'smtp': {
                'name': 'SMTP',
                'host_env': 'SMTP_HOST',
                'port_env': 'SMTP_PORT',
                'user_env': 'SMTP_USER',
                'pass_env': 'SMTP_PASSWORD',
                'max_recipients': 100,
                'templates_supported': False
            },
            'ses': {
                'name': 'AWS SES',
                'region_env': 'AWS_REGION',
                'key_env': 'AWS_ACCESS_KEY_ID',
                'secret_env': 'AWS_SECRET_ACCESS_KEY',
                'max_recipients': 50,
                'templates_supported': True
            }
        }
        
        # Default email templates
        self.templates = {
            'alert': {
                'subject': '[{{severity}}] Public Health Alert: {{alert_type}}',
                'body_html': '''
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <div style="background-color: {{alert_color}}; padding: 20px;">
                        <h2 style="color: white;">{{severity}} Alert</h2>
                    </div>
                    <div style="padding: 20px;">
                        <h3>{{alert_title}}</h3>
                        <p><strong>Location:</strong> {{location}}</p>
                        <p><strong>Date:</strong> {{date}}</p>
                        <p><strong>Details:</strong> {{details}}</p>
                        {{#if recommendations}}
                        <h4>Recommended Actions:</h4>
                        <ul>
                            {{#each recommendations}}
                            <li>{{this}}</li>
                            {{/each}}
                        </ul>
                        {{/if}}
                        <p style="margin-top: 20px;">
                            <a href="{{dashboard_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                View Dashboard
                            </a>
                        </p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px;">
                        This is an automated alert from the AI Public Health Intelligence Platform
                    </div>
                </body>
                </html>
                '''
            },
            'report': {
                'subject': '{{report_type}} Report - {{date}}',
                'body_html': '''
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <div style="padding: 20px;">
                        <h2>{{report_title}}</h2>
                        <p>Dear {{recipient_name}},</p>
                        <p>Your {{report_type}} report for {{date}} is ready.</p>
                        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0;">
                            <h3>Key Highlights:</h3>
                            <ul>
                                {{#each highlights}}
                                <li>{{this}}</li>
                                {{/each}}
                            </ul>
                        </div>
                        <p>
                            <a href="{{report_url}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                Download Report
                            </a>
                        </p>
                    </div>
                </body>
                </html>
                '''
            },
            'notification': {
                'subject': '{{title}}',
                'body_html': '''
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <div style="padding: 20px;">
                        <h2>{{title}}</h2>
                        <p>{{message}}</p>
                        {{#if action_url}}
                        <p>
                            <a href="{{action_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                {{action_text}}
                            </a>
                        </p>
                        {{/if}}
                    </div>
                </body>
                </html>
                '''
            },
            'welcome': {
                'subject': 'Welcome to AI Public Health Intelligence Platform',
                'body_html': '''
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <div style="padding: 20px;">
                        <h2>Welcome {{user_name}}!</h2>
                        <p>Your account has been created successfully.</p>
                        <p><strong>Username:</strong> {{username}}</p>
                        <p><strong>Role:</strong> {{role}}</p>
                        <p>Please log in to get started:</p>
                        <p>
                            <a href="{{login_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                Log In
                            </a>
                        </p>
                    </div>
                </body>
                </html>
                '''
            },
            'password_reset': {
                'subject': 'Password Reset Request',
                'body_html': '''
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <div style="padding: 20px;">
                        <h2>Password Reset</h2>
                        <p>You have requested to reset your password.</p>
                        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
                        <p>
                            <a href="{{reset_url}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                Reset Password
                            </a>
                        </p>
                        <p>If you did not request this, please ignore this email.</p>
                    </div>
                </body>
                </html>
                '''
            }
        }
        
        # Email routing rules
        self.routing_rules = {
            'critical_alert': {
                'recipients': ['director@health.gov', 'response_team@health.gov'],
                'priority': 'high',
                'template': 'alert',
                'channels': ['email', 'sms']
            },
            'high_alert': {
                'recipients': ['lga_health_officer@health.gov'],
                'priority': 'high',
                'template': 'alert',
                'channels': ['email']
            },
            'report': {
                'recipients': ['stakeholders@health.gov'],
                'priority': 'normal',
                'template': 'report',
                'channels': ['email']
            },
            'notification': {
                'recipients': ['all_staff@health.gov'],
                'priority': 'low',
                'template': 'notification',
                'channels': ['email', 'dashboard']
            }
        }
    
    def get_template(self, template_name: str) -> Optional[Dict]:
        """Get email template"""
        return self.templates.get(template_name)
    
    def add_template(self, name: str, subject: str, body_html: str, body_text: str = None):
        """Add new email template"""
        self.templates[name] = {
            'subject': subject,
            'body_html': body_html,
            'body_text': body_text or self._strip_html(body_html)
        }
    
    def render_template(self, template_name: str, context: Dict) -> Dict:
        """Render email template with context"""
        template = self.get_template(template_name)
        
        if not template:
            return {
                'subject': 'No Subject',
                'body_html': '<p>No template found</p>',
                'body_text': 'No template found'
            }
        
        # Simple template rendering
        subject = template['subject']
        body_html = template['body_html']
        
        # Replace variables
        for key, value in context.items():
            placeholder = f'{{{{{key}}}}}'
            subject = subject.replace(placeholder, str(value))
            body_html = body_html.replace(placeholder, str(value))
        
        # Handle conditionals and loops (simplified)
        body_html = self._process_template_directives(body_html, context)
        
        return {
            'subject': subject,
            'body_html': body_html,
            'body_text': template.get('body_text', self._strip_html(body_html))
        }
    
    def _process_template_directives(self, html: str, context: Dict) -> str:
        """Process template directives (simplified Handlebars-like)"""
        import re
        
        # Handle #if blocks
        if_pattern = r'\{\{#if\s+(\w+)\}\}(.*?)\{\{/if\}\}'
        for match in re.finditer(if_pattern, html, re.DOTALL):
            var_name = match.group(1)
            content = match.group(2)
            if context.get(var_name):
                html = html.replace(match.group(0), content)
            else:
                html = html.replace(match.group(0), '')
        
        # Handle #each blocks
        each_pattern = r'\{\{#each\s+(\w+)\}\}(.*?)\{\{/each\}\}'
        for match in re.finditer(each_pattern, html, re.DOTALL):
            var_name = match.group(1)
            item_template = match.group(2)
            items = context.get(var_name, [])
            
            rendered_items = []
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict):
                        item_html = item_template
                        for key, value in item.items():
                            item_html = item_html.replace(f'{{{{{key}}}}}', str(value))
                        rendered_items.append(item_html)
                    else:
                        rendered_items.append(item_template.replace('{{this}}', str(item)))
            
            html = html.replace(match.group(0), '\n'.join(rendered_items))
        
        return html
    
    def _strip_html(self, html: str) -> str:
        """Strip HTML tags for plain text version"""
        import re
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html)
    
    def get_routing_rule(self, rule_name: str) -> Optional[Dict]:
        """Get email routing rule"""
        return self.routing_rules.get(rule_name)
    
    def get_recipients_for_alert(self, alert_type: str, severity: str) -> List[str]:
        """Get recipients based on alert type and severity"""
        if severity == 'critical':
            return self.routing_rules['critical_alert']['recipients']
        elif severity == 'high':
            return self.routing_rules['high_alert']['recipients']
        else:
            return self.routing_rules['notification']['recipients']
    
    def validate_email(self, email: str) -> bool:
        """Validate email address"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def sanitize_email(self, email: str) -> str:
        """Sanitize email address"""
        return email.lower().strip()
    
    def create_email_batch(
        self,
        recipients: List[str],
        template_name: str,
        context: Dict
    ) -> List[Dict]:
        """Create batch of emails"""
        batch = []
        
        for recipient in recipients:
            if self.validate_email(recipient):
                email = self.render_template(template_name, context)
                email['to'] = self.sanitize_email(recipient)
                batch.append(email)
        
        return batch

# Create global email config instance
from .settings import settings
email_config = EmailConfig(settings)