from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime, timedelta

from ..models.database import get_db, Facility, VaccinationRecord, DiseaseReport, Alert

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        # Count facilities
        total_facilities = db.query(Facility).count()
        active_facilities = db.query(Facility).filter(Facility.status == 'active').count()
        
        # Vaccination stats
        total_vaccinated = db.query(VaccinationRecord).count()
        this_month = db.query(VaccinationRecord).filter(
            VaccinationRecord.created_at >= datetime.now().replace(day=1)
        ).count()
        
        # Coverage calculation
        coverage = calculate_coverage(db)
        
        # Active alerts
        active_alerts = db.query(Alert).filter(Alert.status == 'active').count()
        critical_alerts = db.query(Alert).filter(
            Alert.status == 'active',
            Alert.severity == 'critical'
        ).count()
        
        return {
            "total_facilities": total_facilities,
            "active_facilities": active_facilities,
            "vaccination_coverage": coverage,
            "coverage_change": calculate_coverage_change(db),
            "children_vaccinated": total_vaccinated,
            "this_month_vaccinations": this_month,
            "active_alerts": active_alerts,
            "critical_alerts": critical_alerts,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/coverage-trend")
async def get_coverage_trend(
    months: int = 12,
    location: str = None,
    db: Session = Depends(get_db)
):
    """Get vaccination coverage trend"""
    try:
        trend_data = []
        
        for i in range(months):
            month_date = datetime.now() - timedelta(days=30 * i)
            month_start = month_date.replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            
            query = db.query(VaccinationRecord).filter(
                VaccinationRecord.created_at >= month_start,
                VaccinationRecord.created_at < month_end
            )
            
            if location:
                query = query.filter(VaccinationRecord.location == location)
            
            vaccinations = query.count()
            
            trend_data.append({
                "month": month_start.strftime("%B %Y"),
                "coverage": min(100, (vaccinations / 1000) * 100),  # Simplified calculation
                "vaccinations": vaccinations
            })
        
        return trend_data[::-1]  # Reverse to chronological order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/disease-surveillance")
async def get_disease_data(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get disease surveillance data"""
    try:
        since_date = datetime.now() - timedelta(days=days)
        
        diseases = db.query(DiseaseReport).filter(
            DiseaseReport.date_reported >= since_date
        ).all()
        
        # Group by disease and location
        disease_map = {}
        for disease in diseases:
            key = f"{disease.disease_type}_{disease.location}"
            if key not in disease_map:
                disease_map[key] = {
                    "disease": disease.disease_type,
                    "location": disease.location,
                    "cases": 0,
                    "deaths": 0
                }
            disease_map[key]["cases"] += disease.cases
            disease_map[key]["deaths"] += disease.deaths
        
        disease_list = list(disease_map.values())
        
        # Add risk levels
        for item in disease_list:
            if item["cases"] > 100:
                item["risk_level"] = "High"
            elif item["cases"] > 50:
                item["risk_level"] = "Medium"
            else:
                item["risk_level"] = "Low"
        
        return disease_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/facility-performance")
async def get_facility_performance(db: Session = Depends(get_db)):
    """Get facility performance metrics"""
    try:
        facilities = db.query(Facility).filter(Facility.status == 'active').all()
        
        performance = []
        for facility in facilities:
            # Calculate metrics for each facility
            vaccinations = db.query(VaccinationRecord).filter(
                VaccinationRecord.facility_id == facility.id
            ).count()
            
            performance.append({
                "facility_name": facility.name,
                "lga": facility.lga,
                "vaccinations": vaccinations,
                "coverage": min(100, (vaccinations / 500) * 100),  # Simplified
                "status": "Good" if vaccinations > 400 else "Needs Improvement"
            })
        
        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def calculate_coverage(db: Session) -> float:
    """Calculate vaccination coverage percentage"""
    total_vaccinated = db.query(VaccinationRecord).count()
    # This would normally compare against target population
    estimated_target = 10000  # Example target
    return min(100, (total_vaccinated / estimated_target) * 100)

def calculate_coverage_change(db: Session) -> float:
    """Calculate coverage change from previous month"""
    # Simplified calculation
    return -7.0  # Example value