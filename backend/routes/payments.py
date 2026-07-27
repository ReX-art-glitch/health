from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import logging
from typing import Optional

from .payments import (
    FlutterwavePaymentGateway,
    SubscriptionTierPricing,
    InitiatePaymentRequest,
    VerifyPaymentRequest,
    WebhookPayload,
    SubscriptionResponse,
    SubscriptionTier,
    SubscriptionStatus,
    PaymentStatus,
    SubscriptionModel,
    PaymentTransactionModel,
)
from ..database import get_db
from ..auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

gateway = FlutterwavePaymentGateway()


@router.get("/subscription-tiers")
async def get_subscription_tiers():
    """Get all available subscription tiers with pricing"""
    tiers = []
    for tier in SubscriptionTier:
        info = SubscriptionTierPricing.get_tier_info(tier)
        tiers.append({
            "tier": tier.value,
            "price": info["price"],
            "currency": info["currency"],
            "duration_days": info["duration_days"],
            "features": info["features"],
        })
    return {"tiers": tiers}


@router.post("/initiate")
async def initiate_payment(
    request: InitiatePaymentRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initiate a payment transaction
    
    Returns:
        Payment link from Flutterwave
    """
    try:
        user_id = current_user.get("id")
        
        # Create payment transaction record
        transaction_id = str(uuid.uuid4())
        transaction = PaymentTransactionModel(
            id=transaction_id,
            user_id=user_id,
            amount=SubscriptionTierPricing.get_tier_info(request.subscription_tier)["price"],
            currency="USD",
            subscription_tier=request.subscription_tier,
            status=PaymentStatus.PENDING,
        )
        db.add(transaction)
        db.commit()
        
        # Initiate payment with Flutterwave
        payment_response = gateway.initiate_payment(
            user_id=user_id,
            email=request.email,
            full_name=request.full_name,
            subscription_tier=request.subscription_tier,
            phone_number=request.phone_number,
            redirect_url=request.redirect_url,
        )
        
        if not payment_response:
            raise HTTPException(status_code=500, detail="Failed to initiate payment")
        
        # Update transaction with Flutterwave reference
        if payment_response.get("data", {}).get("link"):
            transaction.flutterwave_reference = payment_response["data"].get("reference")
            db.commit()
        
        return {
            "status": "success",
            "transaction_id": transaction_id,
            "payment_link": payment_response.get("data", {}).get("link"),
            "reference": payment_response.get("data", {}).get("reference"),
        }
        
    except Exception as e:
        logger.error(f"Error initiating payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate payment")


@router.post("/verify")
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    """
    Verify a payment transaction
    
    Returns:
        Verification status and subscription details
    """
    try:
        user_id = current_user.get("id")
        
        # Verify with Flutterwave
        payment_data = gateway.verify_payment(request.transaction_id)
        
        if not payment_data or not payment_data.get("data"):
            raise HTTPException(status_code=400, detail="Payment verification failed")
        
        payment_info = payment_data["data"]
        
        if payment_info.get("status") != "successful":
            raise HTTPException(status_code=400, detail="Payment was not successful")
        
        # Find and update transaction
        transaction = db.query(PaymentTransactionModel).filter(
            PaymentTransactionModel.flutterwave_reference == payment_info.get("reference")
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        transaction.status = PaymentStatus.SUCCESSFUL
        
        # Create or update subscription
        subscription = db.query(SubscriptionModel).filter(
            SubscriptionModel.user_id == user_id
        ).first()
        
        tier = transaction.subscription_tier
        duration_days = SubscriptionTierPricing.get_tier_info(tier)["duration_days"]
        
        now = datetime.utcnow()
        if subscription:
            # Renew existing subscription
            subscription.tier = tier
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.start_date = now
            subscription.end_date = now + timedelta(days=duration_days)
            subscription.renewal_date = now + timedelta(days=duration_days)
            subscription.updated_at = now
        else:
            # Create new subscription
            subscription = SubscriptionModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                tier=tier,
                status=SubscriptionStatus.ACTIVE,
                start_date=now,
                end_date=now + timedelta(days=duration_days),
                renewal_date=now + timedelta(days=duration_days),
                auto_renew=True,
            )
            db.add(subscription)
        
        transaction.subscription_id = subscription.id
        db.commit()
        
        return {
            "status": "success",
            "message": "Payment verified successfully",
            "subscription": {
                "tier": subscription.tier.value,
                "status": subscription.status.value,
                "start_date": subscription.start_date.isoformat(),
                "end_date": subscription.end_date.isoformat(),
                "renewal_date": subscription.renewal_date.isoformat(),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify payment")


@router.get("/subscription")
async def get_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's subscription details"""
    try:
        user_id = current_user.get("id")
        
        subscription = db.query(SubscriptionModel).filter(
            SubscriptionModel.user_id == user_id
        ).first()
        
        if not subscription:
            # Return free tier if no subscription
            return {
                "tier": SubscriptionTier.FREE.value,
                "status": SubscriptionStatus.ACTIVE.value,
                "features": SubscriptionTierPricing.get_tier_info(SubscriptionTier.FREE)["features"],
            }
        
        pricing_info = SubscriptionTierPricing.get_tier_info(subscription.tier)
        
        return {
            "tier": subscription.tier.value,
            "status": subscription.status.value,
            "start_date": subscription.start_date.isoformat(),
            "end_date": subscription.end_date.isoformat(),
            "renewal_date": subscription.renewal_date.isoformat(),
            "auto_renew": subscription.auto_renew,
            "features": pricing_info["features"],
        }
        
    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscription")


@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel current user's subscription"""
    try:
        user_id = current_user.get("id")
        
        subscription = db.query(SubscriptionModel).filter(
            SubscriptionModel.user_id == user_id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.auto_renew = False
        subscription.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "status": "success",
            "message": "Subscription cancelled successfully",
            "tier": subscription.tier.value,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@router.post("/webhook/flutterwave")
async def flutterwave_webhook(
    payload: WebhookPayload,
    db: Session = Depends(get_db),
):
    """
    Handle Flutterwave webhook events
    
    Updates payment and subscription status based on Flutterwave events
    """
    try:
        event = payload.event
        data = payload.data
        
        logger.info(f"Received Flutterwave webhook: {event}")
        
        if event == "charge.completed":
            # Payment completed - update transaction
            reference = data.get("reference")
            transaction = db.query(PaymentTransactionModel).filter(
                PaymentTransactionModel.flutterwave_reference == reference
            ).first()
            
            if transaction and data.get("status") == "successful":
                transaction.status = PaymentStatus.SUCCESSFUL
                db.commit()
                logger.info(f"Transaction {transaction.id} marked as successful")
        
        elif event == "charge.failed":
            # Payment failed
            reference = data.get("reference")
            transaction = db.query(PaymentTransactionModel).filter(
                PaymentTransactionModel.flutterwave_reference == reference
            ).first()
            
            if transaction:
                transaction.status = PaymentStatus.FAILED
                db.commit()
                logger.warning(f"Transaction {transaction.id} marked as failed")
        
        elif event == "subscription.create":
            # New subscription created
            logger.info("New subscription created via webhook")
        
        elif event == "subscription.cancel":
            # Subscription cancelled
            logger.info("Subscription cancelled via webhook")
        
        return {"status": "success", "message": "Webhook processed"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process webhook")


@router.get("/transaction-history")
async def get_transaction_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10,
):
    """Get user's payment transaction history"""
    try:
        user_id = current_user.get("id")
        
        transactions = db.query(PaymentTransactionModel).filter(
            PaymentTransactionModel.user_id == user_id
        ).order_by(PaymentTransactionModel.created_at.desc()).limit(limit).all()
        
        return {
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "currency": t.currency,
                    "status": t.status.value,
                    "tier": t.subscription_tier.value,
                    "created_at": t.created_at.isoformat(),
                }
                for t in transactions
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching transaction history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch transaction history")
