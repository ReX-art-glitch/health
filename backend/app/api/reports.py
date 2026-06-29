from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict
from datetime import datetime
import io

from ..models.database import get_db
from ..services.report_generator import ReportGenerator

router = APIRouter()
report_generator = ReportGenerator()

@router.post("/generate-weekly")
async def generate_weekly_report(
    data: Dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate weekly public health report"""
    try:
        report_bytes = await report_generator.generate_weekly_report(data)
        
        # Save to file
        filename = f"weekly_report_{datetime.now().strftime('%Y%m%d')}.docx"
        with open(f"reports/{filename}", "wb") as f:
            f.write(report_bytes)
        
        return {
            "status": "success",
            "filename": filename,
            "message": "Weekly report generated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-monthly")
async def generate_monthly_report(
    month: str = None,
    year: int = None,
    db: Session = Depends(get_db)
):
    """Generate monthly report"""
    try:
        if not month:
            month = datetime.now().strftime("%B")
        if not year:
            year = datetime.now().year
        
        # Gather monthly data
        monthly_data = await gather_monthly_data(db, month, year)
        
        report_bytes = await report_generator.generate_monthly_report(monthly_data)
        
        filename = f"monthly_report_{month}_{year}.docx"
        with open(f"reports/{filename}", "wb") as f:
            f.write(report_bytes)
        
        return {
            "status": "success",
            "filename": filename,
            "month": month,
            "year": year
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-donor")
async def generate_donor_report(
    donor_name: str,
    period: str,
    db: Session = Depends(get_db)
):
    """Generate donor-specific report"""
    try:
        donor_data = await prepare_donor_report_data(db, donor_name, period)
        report_bytes = await report_generator.generate_donor_report(donor_data)
        
        filename = f"donor_report_{donor_name}_{period}.pdf"
        with open(f"reports/{filename}", "wb") as f:
            f.write(report_bytes)
        
        return {"status": "success", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{filename}")
async def download_report(filename: str):
    """Download generated report"""
    file_path = f"reports/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report not found")
    
    return FileResponse(
        file_path,
        media_type='application/octet-stream',
        filename=filename
    )

async def gather_monthly_data(db: Session, month: str, year: int):
    """Gather monthly data for report"""
    # This would query the database for all relevant monthly data
    return {
        "month": month,
        "year": year,
        "vaccination": {},
        "diseases": {},
        "maternal": {},
        "inventory": {}
    }

async def prepare_donor_report_data(db: Session, donor: str, period: str):
    """Prepare donor-specific report data"""
    return {
        "donor": donor,
        "period": period,
        "metrics": {},
        "activities": [],
        "financials": {}
    }from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict
from datetime import datetime
import io

from ..models.database import get_db
from ..services.report_generator import ReportGenerator

router = APIRouter()
report_generator = ReportGenerator()

@router.post("/generate-weekly")
async def generate_weekly_report(
    data: Dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate weekly public health report"""
    try:
        report_bytes = await report_generator.generate_weekly_report(data)
        
        # Save to file
        filename = f"weekly_report_{datetime.now().strftime('%Y%m%d')}.docx"
        with open(f"reports/{filename}", "wb") as f:
            f.write(report_bytes)
        
        return {
            "status": "success",
            "filename": filename,
            "message": "Weekly report generated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-monthly")
async def generate_monthly_report(
    month: str = None,
    year: int = None,
    db: Session = Depends(get_db)
):
    """Generate monthly report"""
    try:
        if not month:
            month = datetime.now().strftime("%B")
        if not year:
            year = datetime.now().year
        
        # Gather monthly data
        monthly_data = await gather_monthly_data(db, month, year)
        
        report_bytes = await report_generator.generate_monthly_report(monthly_data)
        
        filename = f"monthly_report_{month}_{year}.docx"
        with open(f"reports/{filename}", "wb") as f:
            f.write(report_bytes)
        
        return {
            "status": "success",
            "filename": filename,
            "month": month,
            "year": year
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-donor")
async def generate_donor_report(
    donor_name: str,
    period: str,
    db: Session = Depends(get_db)
):
    """Generate donor-specific report"""
    try:
        donor_data = await prepare_donor_report_data(db, donor_name, period)
        report_bytes = await report_generator.generate_donor_report(donor_data)
        
        filename = f"donor_report_{donor_name}_{period}.pdf"
        with open(f"reports/{filename}", "wb") as f:
            f.write(report_bytes)
        
        return {"status": "success", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{filename}")
async def download_report(filename: str):
    """Download generated report"""
    file_path = f"reports/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report not found")
    
    return FileResponse(
        file_path,
        media_type='application/octet-stream',
        filename=filename
    )

async def gather_monthly_data(db: Session, month: str, year: int):
    """Gather monthly data for report"""
    # This would query the database for all relevant monthly data
    return {
        "month": month,
        "year": year,
        "vaccination": {},
        "diseases": {},
        "maternal": {},
        "inventory": {}
    }

async def prepare_donor_report_data(db: Session, donor: str, period: str):
    """Prepare donor-specific report data"""
    return {
        "donor": donor,
        "period": period,
        "metrics": {},
        "activities": [],
        "financials": {}
    }