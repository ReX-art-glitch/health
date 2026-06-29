from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List
import pandas as pd

from ..models.database import get_db
from ..services.ai_hub import AIHub
from ..services.forecast_engine import ForecastEngine

router = APIRouter()
ai_hub = AIHub()
forecast_engine = ForecastEngine()

@router.post("/analyze")
async def analyze_data(
    data_source: str,
    parameters: Dict,
    db: Session = Depends(get_db)
):
    """Run AI analysis on specified data"""
    try:
        if data_source == "vaccination":
            result = await ai_hub.analyze_vaccination_coverage(parameters)
        elif data_source == "disease":
            result = await ai_hub.predict_outbreaks(parameters)
        elif data_source == "maternal":
            result = await ai_hub.analyze_maternal_health(parameters)
        else:
            raise HTTPException(status_code=400, detail="Invalid data source")
        
        return {"status": "success", "analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict-outbreaks")
async def predict_disease_outbreaks(
    location: str = None,
    disease_type: str = None,
    db: Session = Depends(get_db)
):
    """Predict disease outbreaks"""
    try:
        # Fetch disease data from database
        query = db.query(DiseaseReport)
        if location:
            query = query.filter(DiseaseReport.location == location)
        if disease_type:
            query = query.filter(DiseaseReport.disease_type == disease_type)
        
        disease_data = pd.read_sql(query.statement, db.bind)
        
        if disease_data.empty:
            return {"status": "warning", "message": "No data available for prediction"}
        
        predictions = await forecast_engine.predict_disease_outbreak(disease_data)
        
        return {
            "status": "success",
            "predictions": predictions,
            "data_points_analyzed": len(disease_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forecast-coverage")
async def forecast_vaccination_coverage(
    location: str = None,
    months_ahead: int = 3,
    db: Session = Depends(get_db)
):
    """Forecast vaccination coverage"""
    try:
        # Fetch historical coverage data
        query = db.query(VaccinationRecord)
        if location:
            query = query.filter(VaccinationRecord.location == location)
        
        historical_data = pd.read_sql(query.statement, db.bind)
        
        if historical_data.empty:
            return {"status": "warning", "message": "No historical data available"}
        
        forecast = await forecast_engine.forecast_vaccination_coverage(historical_data)
        
        return {
            "status": "success",
            "forecast": forecast,
            "location": location or "all"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insights/{insight_type}")
async def get_ai_insights(
    insight_type: str,
    db: Session = Depends(get_db)
):
    """Get AI-generated insights"""
    insights = {
        "coverage_gaps": "AI analysis of vaccination coverage gaps",
        "high_risk_areas": "Identification of high-risk areas",
        "performance_metrics": "Facility performance analysis",
        "trend_analysis": "Long-term trend analysis"
    }
    
    if insight_type not in insights:
        raise HTTPException(status_code=404, detail="Insight type not found")
    
    # Generate insights based on type
    result = await ai_hub.generate_insights_by_type(insight_type, db)
    
    return {"status": "success", "insights": result}