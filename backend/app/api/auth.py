from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from ..models.database import get_db, User
from ..services.auth import AuthService
from ..config import settings

router = APIRouter()

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """User login"""
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not AuthService.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role,
            "facility": user.facility
        }
    }

@router.post("/register")
async def register(user_data: dict, db: Session = Depends(get_db)):
    """Register new user"""
    # Check if user exists
    existing_user = db.query(User).filter(User.username == user_data['username']).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user
    user = User(
        username=user_data['username'],
        email=user_data['email'],
        hashed_password=AuthService.get_password_hash(user_data['password']),
        role=user_data.get('role', 'field_worker'),
        facility_id=user_data.get('facility_id'),
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"status": "success", "user_id": user.id}