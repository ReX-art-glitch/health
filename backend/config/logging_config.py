"""
Logging Configuration
"""
import logging
import logging.config
import os
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import json
import sys

class LoggingConfig:
    """Centralized logging configuration"""
    
    def __init__(self, settings=None):
        self.settings = settings
        self._configured = False
        
        # Log levels
        self.LOG_LEVELS = {
            'DEBUG': logging.DEBUG,
            'INFO': logging.INFO,
            'WARNING': logging.WARNING,
            'ERROR': logging.ERROR,
            'CRITICAL': logging.CRITICAL
        }
    
    def configure(self, log_level: str = None):
        """Configure logging"""
        if self._configured:
            return
        
        from .settings import settings
        
        level = log_level or (logging.DEBUG if settings.DEBUG else logging.INFO)
        
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'default': {
                    'format': '[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                },
                'detailed': {
                    'format': '[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(module)s.%(funcName)s: %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                },
                'json': {
                    'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                    'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                },
                'simple': {
                    'format': '%(levelname)s: %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'formatter': 'default',
                    'level': level,
                    'stream': sys.stdout
                },
                'console_error': {
                    'class': 'logging.StreamHandler',
                    'formatter': 'default',
                    'level': logging.ERROR,
                    'stream': sys.stderr
                },
                'file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': settings.LOG_DIR / 'app.log',
                    'maxBytes': 10485760,  # 10MB
                    'backupCount': 10,
                    'formatter': 'detailed',
                    'level': level
                },
                'file_error': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': settings.LOG_DIR / 'error.log',
                    'maxBytes': 10485760,
                    'backupCount': 10,
                    'formatter': 'detailed',
                    'level': logging.ERROR
                },
                'file_json': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': settings.LOG_DIR / 'app.json.log',
                    'maxBytes': 10485760,
                    'backupCount': 5,
                    'formatter': 'json',
                    'level': level
                },
                'audit': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': settings.LOG_DIR / 'audit.log',
                    'maxBytes': 52428800,  # 50MB
                    'backupCount': 30,
                    'formatter': 'detailed',
                    'level': logging.INFO
                }
            },
            'loggers': {
                '': {  # Root logger
                    'handlers': ['console', 'file', 'file_error'],
                    'level': level,
                    'propagate': True
                },
                'app': {
                    'handlers': ['console', 'file', 'file_error', 'file_json'],
                    'level': level,
                    'propagate': False
                },
                'app.ai': {
                    'handlers': ['console', 'file', 'file_error'],
                    'level': level,
                    'propagate': False
                },
                'app.api': {
                    'handlers': ['console', 'file', 'file_error'],
                    'level': level,
                    'propagate': False
                },
                'app.services': {
                    'handlers': ['console', 'file', 'file_error'],
                    'level': level,
                    'propagate': False
                },
                'audit': {
                    'handlers': ['audit'],
                    'level': logging.INFO,
                    'propagate': False
                },
                'sqlalchemy': {
                    'handlers': ['console'],
                    'level': logging.WARNING,
                    'propagate': False
                },
                'celery': {
                    'handlers': ['console', 'file'],
                    'level': logging.INFO,
                    'propagate': False
                },
                'uvicorn': {
                    'handlers': ['console'],
                    'level': logging.INFO,
                    'propagate': False
                }
            }
        }
        
        # Add Sentry handler if configured
        if settings.SENTRY_DSN and settings.is_production:
            config['handlers']['sentry'] = {
                'class': 'sentry_sdk.integrations.logging.EventHandler',
                'level': logging.ERROR
            }
            for logger_name in config['loggers']:
                if logger_name not in ['', 'sqlalchemy', 'celery']:
                    config['loggers'][logger_name]['handlers'].append('sentry')
        
        logging.config.dictConfig(config)
        self._configured = True
        
        # Log startup
        logger = logging.getLogger(__name__)
        logger.info(f"Logging configured with level: {logging.getLevelName(level)}")
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get logger instance"""
        if not self._configured:
            self.configure()
        return logging.getLogger(name)
    
    def get_audit_logger(self) -> logging.Logger:
        """Get audit logger"""
        return logging.getLogger('audit')
    
    def log_audit(
        self,
        action: str,
        user_id: str = None,
        details: Dict[str, Any] = None,
        ip_address: str = None
    ):
        """Log audit event"""
        audit_logger = self.get_audit_logger()
        
        audit_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'action': action,
            'user_id': user_id or 'system',
            'ip_address': ip_address or 'unknown',
            'details': details or {}
        }
        
        audit_logger.info(json.dumps(audit_data))
    
    def set_level(self, logger_name: str, level: str):
        """Set log level for specific logger"""
        if level.upper() in self.LOG_LEVELS:
            logger = logging.getLogger(logger_name)
            logger.setLevel(self.LOG_LEVELS[level.upper()])

# Create global logging config instance
from .settings import settings
logging_config = LoggingConfig(settings)

# Initialize logging
logging_config.configure()