"""
Main Application Settings
Loads configuration from environment variables with fallbacks
"""
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from datetime import timedelta

class Settings(BaseSettings):
    """Main application settings"""
    
    # Application
    APP_NAME: str = "AI Public Health Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Comprehensive AI-powered public health monitoring and intelligence system"
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    ENVIRONMENT: str = Field(default="development", description="Environment (development, staging, production)")
    SECRET_KEY: str = Field(default="change-this-secret-key-in-production", description="Application secret key")
    
    # Server
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    WORKERS: int = Field(default=4, description="Number of worker processes")
    RELOAD: bool = Field(default=False, description="Auto-reload on code changes")
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    REPORT_DIR: Path = BASE_DIR / "reports"
    LOG_DIR: Path = BASE_DIR / "logs"
    MODEL_DIR: Path = BASE_DIR / "models"
    STATIC_DIR: Path = BASE_DIR / "static"
    TEMPLATE_DIR: Path = BASE_DIR / "templates"
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql://public_health_user:password@localhost:5432/public_health_db",
        description="Database connection URL"
    )
    DATABASE_POOL_SIZE: int = Field(default=20, description="Database connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=40, description="Max pool overflow")
    DATABASE_POOL_TIMEOUT: int = Field(default=30, description="Pool timeout in seconds")
    DATABASE_ECHO: bool = Field(default=False, description="SQL query logging")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")
    REDIS_MAX_CONNECTIONS: int = Field(default=10, description="Max Redis connections")
    REDIS_SOCKET_TIMEOUT: int = Field(default=5, description="Redis socket timeout")
    
    # OpenAI
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")
    OPENAI_MODEL: str = Field(default="gpt-4", description="Default OpenAI model")
    OPENAI_MAX_TOKENS: int = Field(default=2000, description="Max tokens for completion")
    OPENAI_TEMPERATURE: float = Field(default=0.3, description="Model temperature")
    OPENAI_TIMEOUT: int = Field(default=30, description="API timeout in seconds")
    
    # Azure Form Recognizer
    AZURE_FORM_RECOGNIZER_ENDPOINT: Optional[str] = Field(default=None, description="Azure endpoint URL")
    AZURE_FORM_RECOGNIZER_KEY: Optional[str] = Field(default=None, description="Azure API key")
    AZURE_TIMEOUT: int = Field(default=30, description="Azure API timeout")
    
    # AWS
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, description="AWS access key")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, description="AWS secret key")
    AWS_REGION: str = Field(default="us-east-1", description="AWS region")
    AWS_S3_BUCKET: Optional[str] = Field(default=None, description="S3 bucket name")
    AWS_TEXTRACT_TIMEOUT: int = Field(default=30, description="Textract timeout")
    
    # Twilio (SMS)
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default=None, description="Twilio account SID")
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default=None, description="Twilio auth token")
    TWILIO_PHONE_NUMBER: Optional[str] = Field(default=None, description="Twilio phone number")
    
    # SendGrid (Email)
    SENDGRID_API_KEY: Optional[str] = Field(default=None, description="SendGrid API key")
    EMAIL_FROM: str = Field(default="alerts@publichealthai.com", description="From email address")
    EMAIL_FROM_NAME: str = Field(default="Public Health AI Platform", description="From name")
    
    # JWT Authentication
    JWT_SECRET_KEY: str = Field(default="change-this-jwt-secret", description="JWT secret key")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Token expiry in minutes")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token expiry in days")
    
    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0", description="Celery broker URL")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/1", description="Celery result backend")
    CELERY_TASK_TIME_LIMIT: int = Field(default=1800, description="Task time limit in seconds")
    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(default=1500, description="Soft time limit in seconds")
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="Enable rate limiting")
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, description="Requests per minute")
    RATE_LIMIT_BURST: int = Field(default=100, description="Burst allowance")
    
    # File Upload
    MAX_UPLOAD_SIZE: int = Field(default=10485760, description="Max upload size (10MB)")
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = Field(
        default=[".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png", ".pdf", ".docx", ".doc"],
        description="Allowed file extensions"
    )
    MAX_FILES_PER_REQUEST: int = Field(default=10, description="Max files per request")
    
    # Cache
    CACHE_ENABLED: bool = Field(default=True, description="Enable caching")
    CACHE_TTL: int = Field(default=300, description="Cache TTL in seconds")
    CACHE_PREFIX: str = Field(default="phai:", description="Cache key prefix")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
    PROMETHEUS_ENABLED: bool = Field(default=False, description="Enable Prometheus metrics")
    PROMETHEUS_PORT: int = Field(default=9090, description="Prometheus metrics port")
    
    # Security
    CORS_ORIGINS: List[str] = Field(default=["*"], description="Allowed CORS origins")
    CORS_METHODS: List[str] = Field(default=["*"], description="Allowed CORS methods")
    CORS_HEADERS: List[str] = Field(default=["*"], description="Allowed CORS headers")
    
    # Data Retention
    DATA_RETENTION_DAYS: int = Field(default=2555, description="Data retention in days (7 years)")
    LOG_RETENTION_DAYS: int = Field(default=365, description="Log retention in days")
    REPORT_RETENTION_DAYS: int = Field(default=730, description="Report retention in days")
    
    # AI Model Settings
    MODEL_CONFIDENCE_THRESHOLD: float = Field(default=0.7, description="Minimum model confidence")
    MODEL_RETRAINING_INTERVAL: int = Field(default=7, description="Retraining interval in days")
    PREDICTION_HORIZON: int = Field(default=90, description="Forecast horizon in days")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._create_directories()
        self._validate_settings()
    
    def _create_directories(self):
        """Create necessary directories"""
        directories = [
            self.UPLOAD_DIR,
            self.REPORT_DIR,
            self.LOG_DIR,
            self.MODEL_DIR,
            self.STATIC_DIR,
            self.TEMPLATE_DIR
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def _validate_settings(self):
        """Validate critical settings"""
        if self.ENVIRONMENT == 'production':
            assert self.SECRET_KEY != "change-this-secret-key-in-production", \
                "SECRET_KEY must be changed in production!"
            assert self.JWT_SECRET_KEY != "change-this-jwt-secret", \
                "JWT_SECRET_KEY must be changed in production!"
            assert self.DEBUG == False, \
                "DEBUG must be False in production!"
            
            if self.OPENAI_API_KEY == "":
                raise ValueError("OPENAI_API_KEY is required in production!")
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == 'production'
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == 'development'
    
    @property
    def database_config(self) -> Dict[str, Any]:
        """Get database configuration"""
        return {
            'url': self.DATABASE_URL,
            'pool_size': self.DATABASE_POOL_SIZE,
            'max_overflow': self.DATABASE_MAX_OVERFLOW,
            'pool_timeout': self.DATABASE_POOL_TIMEOUT,
            'echo': self.DATABASE_ECHO
        }
    
    @property
    def redis_config(self) -> Dict[str, Any]:
        """Get Redis configuration"""
        return {
            'url': self.REDIS_URL,
            'max_connections': self.REDIS_MAX_CONNECTIONS,
            'socket_timeout': self.REDIS_SOCKET_TIMEOUT
        }
    
    @property
    def celery_config(self) -> Dict[str, Any]:
        """Get Celery configuration"""
        return {
            'broker_url': self.CELERY_BROKER_URL,
            'result_backend': self.CELERY_RESULT_BACKEND,
            'task_time_limit': self.CELERY_TASK_TIME_LIMIT,
            'task_soft_time_limit': self.CELERY_TASK_SOFT_TIME_LIMIT
        }

# Create global settings instance
settings = Settings()