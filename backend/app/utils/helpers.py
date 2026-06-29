import uuid
from datetime import datetime
from typing import Dict, Any
import hashlib
import json

def generate_id() -> str:
    """Generate unique ID"""
    return str(uuid.uuid4())

def hash_sensitive_data(data: str) -> str:
    """Hash sensitive data for privacy"""
    return hashlib.sha256(data.encode()).hexdigest()

def format_timestamp(dt: datetime = None) -> str:
    """Format timestamp"""
    if dt is None:
        dt = datetime.utcnow()
    return dt.isoformat()

def paginate_query(query, page: int = 1, per_page: int = 20):
    """Paginate database query"""
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }

def validate_coordinates(lat: float, lng: float) -> bool:
    """Validate GPS coordinates"""
    return -90 <= lat <= 90 and -180 <= lng <= 180

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in km"""
    from math import sin, cos, sqrt, atan2, radians
    
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c