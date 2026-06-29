from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..services.ai_hub import AIHub
from ..models.database import get_db

router = APIRouter()
ai_hub = AIHub()

class ChatQuery(BaseModel):
    query: str
    context: Optional[dict] = None
    user_role: Optional[str] = "director"

class ChatResponse(BaseModel):
    response: str
    confidence: str
    timestamp: str
    suggested_actions: Optional[list] = None

@router.post("/ask", response_model=ChatResponse)
async def ask_copilot(chat_query: ChatQuery):
    """AI Public Health Copilot - ask questions about health data"""
    try:
        # Process query through AI
        result = await ai_hub.chat_response(
            query=chat_query.query,
            context=chat_query.context
        )
        
        # Generate suggested actions based on query
        suggested_actions = await generate_suggested_actions(chat_query.query)
        
        return ChatResponse(
            response=result["response"],
            confidence=result["confidence"],
            timestamp=result["timestamp"],
            suggested_actions=suggested_actions
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-coverage")
async def analyze_coverage_drop(query: dict):
    """Specifically analyze vaccination coverage drops"""
    try:
        location = query.get("location", "")
        timeframe = query.get("timeframe", "current_month")
        
        # Simulate detailed analysis
        analysis = {
            "location": location,
            "current_coverage": 85,
            "previous_coverage": 92,
            "change": -7,
            "affected_children": 2100,
            "primary_areas": ["Ikot Abasi", "Eastern Obolo"],
            "causes": [
                "Reduced outreach activities",
                "Vaccine hesitancy in specific communities",
                "Logistics challenges in remote areas"
            ],
            "recommendations": [
                "Deploy mobile vaccination teams immediately",
                "Conduct community sensitization campaigns",
                "Strengthen supply chain to remote areas",
                "Partner with community leaders for advocacy"
            ]
        }
        
        return analysis
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-donor-report")
async def generate_donor_report(params: dict):
    """Generate donor-specific report"""
    try:
        report_type = params.get("type", "monthly")
        donor = params.get("donor", "general")
        month = params.get("month", "May")
        
        # Generate report structure
        report = {
            "title": f"Donor Report - {month}",
            "donor": donor,
            "sections": [
                {
                    "title": "Program Overview",
                    "content": "Summary of activities and achievements"
                },
                {
                    "title": "Key Performance Indicators",
                    "indicators": {
                        "vaccination_coverage": "85%",
                        "antenatal_care": "78%",
                        "disease_surveillance": "Active",
                        "drug_availability": "92%"
                    }
                },
                {
                    "title": "Challenges",
                    "items": [
                        "Vaccination coverage decline in Akwa Ibom",
                        "Stock-outs in 3 facilities"
                    ]
                },
                {
                    "title": "Financial Overview",
                    "content": "Budget utilization and projections"
                },
                {
                    "title": "Next Steps",
                    "actions": [
                        "Targeted interventions in low-coverage areas",
                        "Supply chain strengthening",
                        "Community engagement programs"
                    ]
                }
            ]
        }
        
        return report
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/identify-lga-intervention")
async def identify_lga_needing_intervention(params: dict):
    """Identify LGAs requiring immediate intervention"""
    try:
        # AI analysis of all LGAs
        lgas = [
            {
                "name": "Ikot Abasi",
                "risk_score": 95,
                "issues": ["Low vaccination coverage", "Vaccine stockout risk"],
                "priority": "Critical"
            },
            {
                "name": "Eastern Obolo",
                "risk_score": 88,
                "issues": ["Declining ANC attendance", "Disease outbreak risk"],
                "priority": "High"
            },
            {
                "name": "Mkpat Enin",
                "risk_score": 75,
                "issues": ["Drug inventory gaps", "Staff shortage"],
                "priority": "Medium"
            }
        ]
        
        return {
            "critical_lgas": [lga for lga in lgas if lga["priority"] == "Critical"],
            "high_priority_lgas": [lga for lga in lgas if lga["priority"] == "High"],
            "total_needing_intervention": len([lga for lga in lgas if lga["risk_score"] > 70]),
            "recommended_actions": [
                "Immediate deployment of emergency response teams",
                "Expedited vaccine supply to critical areas",
                "Enhanced surveillance in high-risk areas"
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def generate_suggested_actions(query: str) -> list:
    """Generate suggested follow-up actions based on query"""
    if "coverage" in query.lower():
        return [
            "View coverage trend analysis",
            "Generate vaccination report",
            "Identify low-coverage facilities",
            "Schedule outreach programs"
        ]
    elif "stock" in query.lower() or "inventory" in query.lower():
        return [
            "View current stock levels",
            "Identify facilities at risk of stockout",
            "Generate procurement list",
            "Track delivery status"
        ]
    elif "outbreak" in query.lower() or "disease" in query.lower():
        return [
            "View disease surveillance dashboard",
            "Check alert thresholds",
            "Review response protocols",
            "Contact response team"
        ]
    else:
        return [
            "View executive dashboard",
            "Generate latest report",
            "Check system alerts",
            "Review recent data"
        ]