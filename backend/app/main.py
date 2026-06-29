from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import datetime

from .api import (
    data_collection, ai_engine, reports, dashboards, 
    chatbot, alerts, mobile_sync
)
from .models.database import engine, get_db
from .services.ai_hub import AIHub
from .services.ocr_engine import OCREngine
from .services.report_generator import ReportGenerator
from .config import settings

app = FastAPI(
    title="AI Public Health Intelligence Platform",
    version="1.0.0",
    description="Comprehensive public health monitoring and intelligence system"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ai_hub = AIHub()
ocr_engine = OCREngine()
report_generator = ReportGenerator()

# Include routers
app.include_router(data_collection.router, prefix="/api/v1/data", tags=["Data Collection"])
app.include_router(ai_engine.router, prefix="/api/v1/ai", tags=["AI Engine"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(dashboards.router, prefix="/api/v1/dashboards", tags=["Dashboards"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["AI Copilot"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(mobile_sync.router, prefix="/api/v1/mobile", tags=["Mobile"])

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await ai_hub.initialize()
    await ocr_engine.initialize()

@app.get("/")
async def root():
    return {
        "system": "AI Public Health Intelligence Platform",
        "status": "operational",
        "version": "1.0.0"
    }

@app.post("/api/v1/upload/excel")
async def upload_excel(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Upload and process Excel files with AI analysis"""
    try:
        # Save file
        file_path = await save_upload_file(file)
        
        # Process with AI
        ai_results = await ai_hub.analyze_excel_data(file_path)
        
        # Queue report generation
        if background_tasks:
            background_tasks.add_task(
                report_generator.generate_initial_reports,
                ai_results
            )
        
        return {
            "status": "success",
            "message": "File processed successfully",
            "analysis_id": ai_results["id"],
            "findings": ai_results["findings"],
            "quality_metrics": ai_results["quality_metrics"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/upload/paper-form")
async def process_paper_form(
    image: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Process paper form images using AI OCR"""
    try:
        # OCR Processing
        ocr_result = await ocr_engine.process_image(image)
        
        # Structure data
        structured_data = await ai_hub.structure_health_data(ocr_result)
        
        return {
            "status": "success",
            "extracted_data": structured_data,
            "confidence_scores": ocr_result["confidence"],
            "requires_review": ocr_result["needs_human_review"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected",
            "ai_engine": "operational",
            "ocr_service": "operational"
        }
    }