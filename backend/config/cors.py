"""
CORS Configuration
"""
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import re

class CORSConfig:
    """CORS configuration management"""
    
    def __init__(self, settings=None):
        self.settings = settings
        
        # Default CORS settings
        self.default_origins = [
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
        ]
        
        # Production origins (configure as needed)
        self.production_origins = [
            "https://your-domain.com",
            "https://admin.your-domain.com",
            "https://api.your-domain.com",
        ]
        
        # Allowed methods
        self.allowed_methods = [
            "GET", "POST", "PUT", "DELETE", 
            "PATCH", "OPTIONS", "HEAD"
        ]
        
        # Allowed headers
        self.allowed_headers = [
            "Content-Type",
            "Authorization",
            "X-Request-ID",
            "X-API-Key",
            "X-Client-Version",
            "Accept",
            "Origin",
            "X-Requested-With",
        ]
        
        # Exposed headers
        self.exposed_headers = [
            "X-Request-ID",
            "X-Response-Time",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        ]
        
        # Cache control
        self.max_age = 3600  # 1 hour
    
    def get_allowed_origins(self) -> List[str]:
        """Get allowed origins based on environment"""
        from .settings import settings, IS_PRODUCTION, IS_DEVELOPMENT
        
        if IS_PRODUCTION:
            origins = self.production_origins.copy()
            # Add any environment-specific origins
            if settings.CORS_ORIGINS and settings.CORS_ORIGINS != ["*"]:
                origins.extend(settings.CORS_ORIGINS)
            return origins
        
        if IS_DEVELOPMENT:
            return ["*"]  # Allow all in development
        
        # Staging/Testing
        return self.default_origins + (settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else [])
    
    def create_cors_middleware(self, app):
        """Create CORS middleware"""
        allowed_origins = self.get_allowed_origins()
        
        return CORSMiddleware(
            app,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=self.allowed_methods,
            allow_headers=self.allowed_headers,
            expose_headers=self.exposed_headers,
            max_age=self.max_age,
        )
    
    def is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed"""
        allowed_origins = self.get_allowed_origins()
        
        if "*" in allowed_origins:
            return True
        
        return origin in allowed_origins
    
    def add_origin(self, origin: str, temporary: bool = False):
        """Add allowed origin"""
        if temporary:
            # Add to temporary list (not persisted)
            pass
        else:
            if origin not in self.production_origins:
                self.production_origins.append(origin)
    
    def remove_origin(self, origin: str):
        """Remove allowed origin"""
        if origin in self.production_origins:
            self.production_origins.remove(origin)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Cache control for sensitive data
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        
        return response

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add request ID to requests and responses"""
    
    async def dispatch(self, request: Request, call_next):
        import uuid
        
        # Get or create request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response
        response.headers["X-Request-ID"] = request_id
        
        return response

class ResponseTimeMiddleware(BaseHTTPMiddleware):
    """Add response time header"""
    
    async def dispatch(self, request: Request, call_next):
        import time
        
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        response.headers["X-Response-Time"] = f"{process_time:.3f}s"
        
        return response

# Create global CORS config instance
from .settings import settings
cors_config = CORSConfig(settings)