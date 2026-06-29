"""
API Configuration
"""
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class APIConfig:
    """API configuration management"""
    
    def __init__(self, settings=None):
        self.settings = settings
        
        # API metadata
        self.api_metadata = {
            'title': 'AI Public Health Intelligence Platform API',
            'description': '''
            Comprehensive API for AI-powered public health monitoring and intelligence.
            
            ## Features
            - **Data Collection**: Mobile sync, Excel upload, paper form OCR
            - **AI Analysis**: Disease prediction, coverage analysis, risk assessment
            - **Reporting**: Automated report generation in multiple formats
            - **Alerts**: Real-time alerts via SMS, email, and dashboard
            - **AI Copilot**: Natural language interface for health data queries
            
            ## Authentication
            - JWT-based authentication
            - API keys for external integrations
            - Role-based access control
            
            ## Rate Limiting
            - 60 requests per minute for authenticated users
            - 20 requests per minute for unauthenticated requests
            ''',
            'version': '1.0.0',
            'terms_of_service': 'https://your-domain.com/terms',
            'contact': {
                'name': 'API Support',
                'url': 'https://your-domain.com/support',
                'email': 'api-support@your-domain.com'
            },
            'license_info': {
                'name': 'Proprietary',
                'url': 'https://your-domain.com/license'
            }
        }
        
        # API tags
        self.api_tags = [
            {
                'name': 'Authentication',
                'description': 'User authentication and authorization'
            },
            {
                'name': 'Data Collection',
                'description': 'Data input endpoints (mobile, web, OCR)'
            },
            {
                'name': 'AI Engine',
                'description': 'AI analysis and prediction endpoints'
            },
            {
                'name': 'Reports',
                'description': 'Report generation and management'
            },
            {
                'name': 'Dashboards',
                'description': 'Dashboard data and statistics'
            },
            {
                'name': 'Alerts',
                'description': 'Alert management and notifications'
            },
            {
                'name': 'AI Copilot',
                'description': 'Natural language AI assistant'
            },
            {
                'name': 'Mobile Sync',
                'description': 'Mobile app data synchronization'
            },
            {
                'name': 'Admin',
                'description': 'Administrative functions'
            }
        ]
        
        # API versioning
        self.api_versions = {
            'v1': {
                'prefix': '/api/v1',
                'status': 'active',
                'deprecated': False
            }
        }
        
        # Response models
        self.response_models = {
            'success': {
                'status': 'success',
                'message': 'Operation completed successfully',
                'data': None
            },
            'error': {
                'status': 'error',
                'message': 'An error occurred',
                'error_code': 'INTERNAL_ERROR',
                'details': None
            },
            'validation_error': {
                'status': 'error',
                'message': 'Validation failed',
                'error_code': 'VALIDATION_ERROR',
                'errors': []
            }
        }
        
        # Pagination defaults
        self.pagination = {
            'default_page_size': 20,
            'max_page_size': 100,
            'page_param': 'page',
            'size_param': 'size'
        }
    
    def configure_app(self, app: FastAPI):
        """Configure FastAPI application"""
        
        # Add middleware
        self._add_middleware(app)
        
        # Configure OpenAPI
        self._configure_openapi(app)
        
        # Add exception handlers
        self._add_exception_handlers(app)
        
        # Add startup/shutdown events
        self._add_lifecycle_events(app)
    
    def _add_middleware(self, app: FastAPI):
        """Add middleware to application"""
        
        # GZip compression
        app.add_middleware(GZipMiddleware, minimum_size=1000)
        
        # Trusted hosts
        from .settings import settings
        if settings.is_production:
            app.add_middleware(
                TrustedHostMiddleware,
                allowed_hosts=settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else ["*"]
            )
        
        # Security headers
        from .cors import SecurityHeadersMiddleware, RequestIDMiddleware, ResponseTimeMiddleware
        app.add_middleware(SecurityHeadersMiddleware)
        app.add_middleware(RequestIDMiddleware)
        app.add_middleware(ResponseTimeMiddleware)
    
    def _configure_openapi(self, app: FastAPI):
        """Configure OpenAPI documentation"""
        
        def custom_openapi():
            if app.openapi_schema:
                return app.openapi_schema
            
            openapi_schema = get_openapi(
                title=self.api_metadata['title'],
                version=self.api_metadata['version'],
                description=self.api_metadata['description'],
                terms_of_service=self.api_metadata['terms_of_service'],
                contact=self.api_metadata['contact'],
                license_info=self.api_metadata['license_info'],
                routes=app.routes,
                tags=self.api_tags
            )
            
            # Add security schemes
            openapi_schema['components']['securitySchemes'] = {
                'Bearer': {
                    'type': 'http',
                    'scheme': 'bearer',
                    'bearerFormat': 'JWT',
                    'description': 'Enter JWT token'
                },
                'ApiKey': {
                    'type': 'apiKey',
                    'in': 'header',
                    'name': 'X-API-Key',
                    'description': 'Enter API key'
                }
            }
            
            # Add global security
            openapi_schema['security'] = [
                {'Bearer': []},
                {'ApiKey': []}
            ]
            
            app.openapi_schema = openapi_schema
            return app.openapi_schema
        
        app.openapi = custom_openapi
    
    def _add_exception_handlers(self, app: FastAPI):
        """Add exception handlers"""
        from fastapi.responses import JSONResponse
        from fastapi.exceptions import RequestValidationError
        from starlette.exceptions import HTTPException as StarletteHTTPException
        
        @app.exception_handler(StarletteHTTPException)
        async def http_exception_handler(request: Request, exc: StarletteHTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    'status': 'error',
                    'message': exc.detail,
                    'error_code': f'HTTP_{exc.status_code}',
                    'request_id': getattr(request.state, 'request_id', None)
                }
            )
        
        @app.exception_handler(RequestValidationError)
        async def validation_exception_handler(request: Request, exc: RequestValidationError):
            errors = []
            for error in exc.errors():
                errors.append({
                    'field': ' -> '.join(str(loc) for loc in error['loc']),
                    'message': error['msg'],
                    'type': error['type']
                })
            
            return JSONResponse(
                status_code=422,
                content={
                    'status': 'error',
                    'message': 'Validation failed',
                    'error_code': 'VALIDATION_ERROR',
                    'errors': errors,
                    'request_id': getattr(request.state, 'request_id', None)
                }
            )
        
        @app.exception_handler(Exception)
        async def general_exception_handler(request: Request, exc: Exception):
            logger.error(f"Unhandled exception: {exc}", exc_info=True)
            
            return JSONResponse(
                status_code=500,
                content={
                    'status': 'error',
                    'message': 'Internal server error',
                    'error_code': 'INTERNAL_ERROR',
                    'request_id': getattr(request.state, 'request_id', None)
                }
            )
    
    def _add_lifecycle_events(self, app: FastAPI):
        """Add startup and shutdown events"""
        from .database import database_config
        
        @app.on_event("startup")
        async def startup_event():
            """Application startup"""
            logger.info("Starting AI Public Health Intelligence Platform...")
            
            # Test database connection
            if database_config.test_connection():
                logger.info("Database connection successful")
            else:
                logger.error("Database connection failed!")
            
            # Log startup
            logger.info(f"Application started in {self.settings.ENVIRONMENT} mode")
            logger.info(f"API documentation available at /docs")
        
        @app.on_event("shutdown")
        async def shutdown_event():
            """Application shutdown"""
            logger.info("Shutting down application...")
            
            # Dispose database connections
            database_config.dispose_engine()
            
            logger.info("Application shutdown complete")
    
    def create_response(
        self,
        data: Any = None,
        message: str = None,
        status: str = 'success',
        status_code: int = 200,
        pagination: Dict = None
    ) -> Dict:
        """Create standardized API response"""
        response = {
            'status': status,
            'message': message or 'Operation completed successfully',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if data is not None:
            response['data'] = data
        
        if pagination:
            response['pagination'] = pagination
        
        return response
    
    def create_error_response(
        self,
        message: str,
        error_code: str = 'UNKNOWN_ERROR',
        status_code: int = 400,
        details: Any = None
    ) -> Dict:
        """Create error response"""
        return {
            'status': 'error',
            'message': message,
            'error_code': error_code,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details
        }
    
    def paginate_response(
        self,
        items: List,
        total: int,
        page: int,
        page_size: int
    ) -> Dict:
        """Create paginated response"""
        total_pages = (total + page_size - 1) // page_size
        
        return {
            'items': items,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_items': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_previous': page > 1,
                'next_page': page + 1 if page < total_pages else None,
                'previous_page': page - 1 if page > 1 else None
            }
        }

# Create global API config instance
from .settings import settings
api_config = APIConfig(settings)