from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
from datetime import datetime

from ..models.database import get_db, VaccinationRecord, DiseaseReport, MaternalHealthRecord
from ..services.ai_hub import AIHub
from ..services.validation import DataValidator

router = APIRouter()
ai_hub = AIHub()
validator = DataValidator()

@router.post("/immunization")
async def add_immunization(data: dict, db: Session = Depends(get_db)):
    """Add immunization record"""
    try:
        # Validate data
        validated = await validator.validate_immunization(data)
        
        # Save to database
        record = VaccinationRecord(**validated)
        db.add(record)
        db.commit()
        
        # Trigger AI analysis
        await ai_hub.analyze_immunization_trends(db)
        
        return {"status": "success", "record_id": record.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/maternal-health")
async def add_maternal_record(data: dict, db: Session = Depends(get_db)):
    """Add maternal health record"""
    record = MaternalHealthRecord(**data)
    db.add(record)
    db.commit()
    
    # Risk assessment
    risk = await ai_hub.assess_maternal_risk(data)
    
    return {"status": "success", "record_id": record.id, "risk_assessment": risk}

@router.post("/disease-surveillance")
async def report_disease(data: dict, db: Session = Depends(get_db)):
    """Report disease case for surveillance"""
    record = DiseaseReport(**data)
    db.add(record)
    db.commit()
    
    # Check for outbreak
    outbreak_alert = await ai_hub.check_outbreak_threshold(data)
    if outbreak_alert:
        from ..services.alerts import AlertService
        await AlertService.send_alert(outbreak_alert)
    
    return {"status": "success", "alert_triggered": bool(outbreak_alert)}

@router.post("/facility-assessment")
async def assess_facility(data: dict, db: Session = Depends(get_db)):
    """Submit facility assessment"""
    # Process assessment
    assessment_result = await ai_hub.analyze_facility(data)
    
    return {"status": "success", "assessment": assessment_result}