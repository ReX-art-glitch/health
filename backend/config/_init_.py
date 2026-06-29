"""
Configuration module for AI Public Health Intelligence Platform
Centralizes all configuration settings and provides easy access
"""

from .settings import Settings, settings
from .database import DatabaseConfig, database_config
from .logging_config import LoggingConfig, logging_config
from .celery_config import CeleryConfig, celery_config
from .security import SecurityConfig, security_config
from .cors import CORSConfig, cors_config
from .email_config import EmailConfig, email_config
from .storage_config import StorageConfig, storage_config
from .api_config import APIConfig, api_config

__all__ = [
    'Settings', 'settings',
    'DatabaseConfig', 'database_config',
    'LoggingConfig', 'logging_config',
    'CeleryConfig', 'celery_config',
    'SecurityConfig', 'security_config',
    'CORSConfig', 'cors_config',
    'EmailConfig', 'email_config',
    'StorageConfig', 'storage_config',
    'APIConfig', 'api_config',
]

# Configuration version
CONFIG_VERSION = '1.0.0'

# Environment detection
import os
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
IS_PRODUCTION = ENVIRONMENT == 'production'
IS_STAGING = ENVIRONMENT == 'staging'
IS_DEVELOPMENT = ENVIRONMENT == 'development'
IS_TESTING = ENVIRONMENT == 'testing'

# Feature flags based on environment
FEATURE_FLAGS = {
    'ai_insights': True,
    'ocr_processing': True,
    'real_time_alerts': IS_PRODUCTION or IS_STAGING,
    'advanced_analytics': IS_PRODUCTION or IS_STAGING,
    'debug_mode': IS_DEVELOPMENT or IS_TESTING,
    'performance_monitoring': IS_PRODUCTION,
    'rate_limiting': IS_PRODUCTION or IS_STAGING,
    'cache_enabled': IS_PRODUCTION or IS_STAGING,
    'background_tasks': True,
    'email_notifications': IS_PRODUCTION or IS_STAGING,
    'sms_alerts': IS_PRODUCTION,
    'audit_logging': IS_PRODUCTION or IS_STAGING,
}