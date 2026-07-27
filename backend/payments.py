import os
import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from enum import Enum
from sqlalchemy import Column, String, Float, DateTime, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()


class SubscriptionTier(str, Enum):
    """Subscription tier options"""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class PaymentStatus(str, Enum):
    """Payment status tracking"""
    PENDING = "pending"
    SUCCESSFUL = "successful"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class SubscriptionStatus(str, Enum):
    """Subscription status tracking"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SubscriptionModel(Base):
    """Database model for user subscriptions"""
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, unique=True, index=True)
    tier = Column(SQLEnum(SubscriptionTier), default=SubscriptionTier.FREE)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    renewal_date = Column(DateTime, nullable=True)
    auto_renew = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PaymentTransactionModel(Base):
    """Database model for payment transactions"""
    __tablename__ = "payment_transactions"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    subscription_id = Column(String, nullable=True, index=True)
    flutterwave_reference = Column(String, unique=True, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    subscription_tier = Column(SQLEnum(SubscriptionTier), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FlutterwaveConfig:
    """Flutterwave API configuration"""
    
    def __init__(self):
        self.base_url = "https://api.flutterwave.com/v3"
        self.secret_key = os.getenv("FLUTTERWAVE_SECRET_KEY", "")
        self.public_key = os.getenv("FLUTTERWAVE_PUBLIC_KEY", "")
        self.encryption_key = os.getenv("FLUTTERWAVE_ENCRYPTION_KEY", "")
        
        if not self.secret_key:
            logger.warning("FLUTTERWAVE_SECRET_KEY not configured")


class SubscriptionTierPricing:
    """Pricing for different subscription tiers"""
    
    PRICING = {
        SubscriptionTier.FREE: {
            "price": 0.0,
            "currency": "USD",
            "duration_days": 30,
            "features": [
                "Basic health data entry",
                "Mobile app access",
                "Basic reports",
            ]
        },
        SubscriptionTier.BASIC: {
            "price": 4.99,
            "currency": "USD",
            "duration_days": 30,
            "features": [
                "All Free features",
                "Advanced AI insights",
                "Facility assessment",
                "Up to 5 health facilities",
            ]
        },
        SubscriptionTier.PROFESSIONAL: {
            "price": 14.99,
            "currency": "USD",
            "duration_days": 30,
            "features": [
                "All Basic features",
                "Priority support",
                "Custom reports",
                "Up to 50 health facilities",
                "Data analytics dashboard",
            ]
        },
        SubscriptionTier.ENTERPRISE: {
            "price": 99.99,
            "currency": "USD",
            "duration_days": 30,
            "features": [
                "All Professional features",
                "Dedicated account manager",
                "API access",
                "Unlimited facilities",
                "Custom integrations",
            ]
        },
    }

    @classmethod
    def get_tier_info(cls, tier: SubscriptionTier) -> Dict[str, Any]:
        """Get pricing information for a subscription tier"""
        return cls.PRICING.get(tier, cls.PRICING[SubscriptionTier.FREE])


class FlutterwavePaymentGateway:
    """Flutterwave payment gateway integration"""
    
    def __init__(self):
        self.config = FlutterwaveConfig()
        self.headers = {
            "Authorization": f"Bearer {self.config.secret_key}",
            "Content-Type": "application/json",
        }

    def initiate_payment(
        self,
        user_id: str,
        email: str,
        full_name: str,
        subscription_tier: SubscriptionTier,
        phone_number: str,
        redirect_url: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Initiate a payment transaction with Flutterwave
        
        Args:
            user_id: Unique user identifier
            email: User's email address
            full_name: User's full name
            subscription_tier: Subscription tier to purchase
            phone_number: User's phone number
            redirect_url: URL to redirect after payment
            
        Returns:
            Payment initialization response with payment link
        """
        try:
            pricing = SubscriptionTierPricing.get_tier_info(subscription_tier)
            
            payload = {
                "amount": int(pricing["price"] * 100),  # Flutterwave expects amount in cents
                "currency": pricing["currency"],
                "redirect_url": redirect_url,
                "customer": {
                    "email": email,
                    "name": full_name,
                    "phonenumber": phone_number,
                },
                "customizations": {
                    "title": "Public Health AI - Subscription",
                    "description": f"{subscription_tier.value.capitalize()} Subscription Plan",
                    "logo": "https://example.com/logo.png",  # Update with your logo
                },
                "meta": {
                    "user_id": user_id,
                    "subscription_tier": subscription_tier.value,
                    "plan_type": "subscription",
                },
                "tx_ref": self._generate_transaction_ref(user_id),
            }

            response = requests.post(
                f"{self.config.base_url}/payments",
                json=payload,
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Error initiating payment: {str(e)}")
            return None

    def verify_payment(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Verify a payment transaction with Flutterwave
        
        Args:
            transaction_id: Flutterwave transaction ID
            
        Returns:
            Transaction details if successful
        """
        try:
            response = requests.get(
                f"{self.config.base_url}/transactions/{transaction_id}/verify",
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Error verifying payment: {str(e)}")
            return None

    def create_subscription(
        self,
        user_id: str,
        email: str,
        subscription_tier: SubscriptionTier,
        billing_cycle: str = "monthly",
    ) -> Optional[Dict[str, Any]]:
        """
        Create a recurring subscription with Flutterwave
        
        Args:
            user_id: Unique user identifier
            email: User's email address
            subscription_tier: Subscription tier
            billing_cycle: Billing cycle (monthly, yearly)
            
        Returns:
            Subscription creation response
        """
        try:
            pricing = SubscriptionTierPricing.get_tier_info(subscription_tier)
            
            payload = {
                "amount": int(pricing["price"] * 100),
                "currency": pricing["currency"],
                "duration": 1,
                "period": billing_cycle,
                "plan_name": f"Health AI {subscription_tier.value.capitalize()} - {billing_cycle}",
                "plan_interval": 1,
                "plan_duration": 0,  # 0 means no end date for recurring
                "meta": {
                    "user_id": user_id,
                    "subscription_tier": subscription_tier.value,
                },
            }

            response = requests.post(
                f"{self.config.base_url}/subscription-plans",
                json=payload,
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Error creating subscription: {str(e)}")
            return None

    def cancel_subscription(self, subscription_id: str) -> bool:
        """
        Cancel a subscription
        
        Args:
            subscription_id: Flutterwave subscription ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            response = requests.put(
                f"{self.config.base_url}/subscriptions/{subscription_id}/cancel",
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            
            return response.status_code in [200, 204]
            
        except requests.RequestException as e:
            logger.error(f"Error cancelling subscription: {str(e)}")
            return False

    def process_webhook(self, payload: Dict[str, Any], signature: str) -> bool:
        """
        Process and validate webhook from Flutterwave
        
        Args:
            payload: Webhook payload
            signature: Webhook signature for verification
            
        Returns:
            True if signature is valid
        """
        try:
            hash_object = self._generate_hash(json.dumps(payload))
            return hash_object == signature
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return False

    @staticmethod
    def _generate_transaction_ref(user_id: str) -> str:
        """Generate a unique transaction reference"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"HEALTH_AI_{user_id}_{timestamp}"

    @staticmethod
    def _generate_hash(payload: str) -> str:
        """Generate hash for webhook verification"""
        import hashlib
        # This is a simplified version; adjust based on Flutterwave's actual requirements
        return hashlib.sha256(payload.encode()).hexdigest()


# Pydantic models for API requests/responses

class SubscriptionTierResponse(BaseModel):
    """Response model for subscription tier information"""
    tier: SubscriptionTier
    price: float
    currency: str
    duration_days: int
    features: list


class InitiatePaymentRequest(BaseModel):
    """Request model to initiate payment"""
    email: str
    full_name: str
    subscription_tier: SubscriptionTier
    phone_number: str
    redirect_url: str = Field(..., description="URL to redirect after payment")


class VerifyPaymentRequest(BaseModel):
    """Request model to verify payment"""
    transaction_id: str


class WebhookPayload(BaseModel):
    """Webhook payload from Flutterwave"""
    event: str
    data: Dict[str, Any]


class SubscriptionResponse(BaseModel):
    """Response model for subscription details"""
    user_id: str
    tier: SubscriptionTier
    status: SubscriptionStatus
    start_date: datetime
    end_date: Optional[datetime]
    renewal_date: Optional[datetime]
    auto_renew: bool
