from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
import json

from ..models.database import get_db, VaccinationRecord, MaternalHealthRecord
from ..services.validation import DataValidator

router = APIRouter()
validator = DataValidator()

@router.post("/sync")
async def sync_mobile_data(
    data: Dict,
    db: Session = Depends(get_db)
):
    """Sync data from mobile app"""
    try:
        synced_records = []
        errors = []
        
        # Process immunization records
        if 'immunizations' in data:
            for record in data['immunizations']:
                try:
                    validated = await validator.validate_immunization(record)
                    db_record = VaccinationRecord(**validated)
                    db.add(db_record)
                    synced_records.append({
                        "type": "immunization",
                        "id": record.get('local_id'),
                        "status": "synced"
                    })
                except Exception as e:
                    errors.append({
                        "type": "immunization",
                        "id": record.get('local_id'),
                        "error": str(e)
                    })
        
        # Process maternal health records
        if 'maternal_health' in data:
            for record in data['maternal_health']:
                try:
                    validated = await validator.validate_maternal_health(record)
                    db_record = MaternalHealthRecord(**validated)
                    db.add(db_record)
                    synced_records.append({
                        "type": "maternal_health",
                        "id": record.get('local_id'),
                        "status": "synced"
                    })
                except Exception as e:
                    errors.append({
                        "type": "maternal_health",
                        "id": record.get('local_id'),
                        "error": str(e)
                    })
        
        db.commit()
        
        return {
            "status": "success",
            "synced": len(synced_records),
            "errors": len(errors),
            "details": {
                "synced_records": synced_records,
                "errors": errors
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/offline-queue")
async def process_offline_queue(
    queue_data: List[Dict],
    db: Session = Depends(get_db)
):
    """Process offline queue from mobile app"""
    results = {
        "processed": 0,
        "failed": 0,
        "details": []
    }
    
    for item in queue_data:
        try:
            # Process based on type
            if item['type'] == 'immunization':
                record = VaccinationRecord(**item['data'])
                db.add(record)
                results['processed'] += 1
            elif item['type'] == 'maternal_health':
                record = MaternalHealthRecord(**item['data'])
                db.add(record)
                results['processed'] += 1
            
            results['details'].append({
                "local_id": item.get('local_id'),
                "status": "success"
            })
        except Exception as e:
            results['failed'] += 1
            results['details'].append({
                "local_id": item.get('local_id'),
                "error": str(e)
            })
    
    db.commit()
    return results