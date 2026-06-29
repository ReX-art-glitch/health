from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        current_time = time.time()
        
        # Clean old entries
        self.requests = {
            ip: timestamps 
            for ip, timestamps in self.requests.items()
            if any(t > current_time - self.window_seconds for t in timestamps)
        }
        
        # Check rate limit
        if client_ip in self.requests:
            recent_requests = [t for t in self.requests[client_ip] if t > current_time - self.window_seconds]
            if len(recent_requests) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."}
                )
            recent_requests.append(current_time)
            self.requests[client_ip] = recent_requests
        else:
            self.requests[client_ip] = [current_time]
        
        response = await call_next(request)
        return response

class AuditLogMiddleware(BaseHTTPMiddleware):
    """Audit logging middleware"""
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        # Log request
        logger.info(
            f"{request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Time: {process_time:.2f}s"
        )
        
        return response

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Global error handling middleware"""
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
        except Exception as e:
            logger.error(f"Unhandled error: {str(e)}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "error_id": str(uuid.uuid4())
                }
            )