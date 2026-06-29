"""
Security Configuration
"""
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import secrets
import hashlib
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class SecurityConfig:
    """Security configuration and utilities"""
    
    def __init__(self, settings=None):
        self.settings = settings
        
        # Password hashing
        self.pwd_context = CryptContext(
            schemes=["bcrypt", "argon2"],
            deprecated="auto",
            bcrypt__rounds=12
        )
        
        # Encryption
        self._fernet = None
        
        # Rate limiting
        self.rate_limits = {}
        
        # Token blacklist (for logout)
        self.token_blacklist = set()
    
    @property
    def fernet(self) -> Fernet:
        """Get Fernet encryption instance"""
        if self._fernet is None:
            from .settings import settings
            
            # Derive encryption key from secret key
            salt = b'public_health_ai_salt'
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000
            )
            key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
            self._fernet = Fernet(key)
        
        return self._fernet
    
    def hash_password(self, password: str) -> str:
        """Hash password"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(
        self,
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        from .settings import settings
        
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token"""
        from .settings import settings
        
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token"""
        from .settings import settings
        
        # Check blacklist
        if token in self.token_blacklist:
            return None
        
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            return payload
        except JWTError:
            return None
    
    def blacklist_token(self, token: str):
        """Add token to blacklist"""
        self.token_blacklist.add(token)
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.fernet.decrypt(encrypted_data.encode()).decode()
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate secure random token"""
        return secrets.token_hex(length)
    
    def generate_api_key(self) -> str:
        """Generate API key"""
        return f"phai_{secrets.token_hex(24)}"
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    def sanitize_input(self, input_str: str) -> str:
        """Sanitize user input"""
        import re
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>\'";]', '', input_str)
        
        # Remove SQL injection patterns
        sql_patterns = [
            r'\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b',
            r'--',
            r'/\*.*\*/'
        ]
        
        for pattern in sql_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        return sanitized.strip()
    
    def check_rate_limit(
        self,
        key: str,
        max_requests: int = 60,
        window_seconds: int = 60
    ) -> bool:
        """Check rate limit"""
        from time import time
        
        current_time = time()
        
        # Clean old entries
        if key in self.rate_limits:
            self.rate_limits[key] = [
                t for t in self.rate_limits[key]
                if t > current_time - window_seconds
            ]
        else:
            self.rate_limits[key] = []
        
        # Check limit
        if len(self.rate_limits[key]) >= max_requests:
            return False
        
        # Add new request
        self.rate_limits[key].append(current_time)
        return True
    
    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """Validate password strength"""
        import re
        
        result = {
            'is_valid': True,
            'score': 0,
            'issues': []
        }
        
        # Length check
        if len(password) < 8:
            result['issues'].append('Password must be at least 8 characters')
            result['is_valid'] = False
        elif len(password) >= 12:
            result['score'] += 2
        else:
            result['score'] += 1
        
        # Complexity checks
        if re.search(r'[A-Z]', password):
            result['score'] += 1
        else:
            result['issues'].append('Add uppercase letters')
        
        if re.search(r'[a-z]', password):
            result['score'] += 1
        else:
            result['issues'].append('Add lowercase letters')
        
        if re.search(r'\d', password):
            result['score'] += 1
        else:
            result['issues'].append('Add numbers')
        
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            result['score'] += 1
        else:
            result['issues'].append('Add special characters')
        
        # Common password check
        common_passwords = ['password', '123456', 'qwerty', 'admin']
        if password.lower() in common_passwords:
            result['is_valid'] = False
            result['issues'].append('Password is too common')
        
        result['strength'] = (
            'weak' if result['score'] < 3
            else 'medium' if result['score'] < 5
            else 'strong'
        )
        
        return result
    
    def mask_sensitive_data(self, data: str, mask_char: str = '*') -> str:
        """Mask sensitive data for logging"""
        if len(data) <= 4:
            return mask_char * len(data)
        
        return data[:2] + mask_char * (len(data) - 4) + data[-2:]

# Create global security config instance
from .settings import settings
security_config = SecurityConfig(settings)