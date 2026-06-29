from sqlalchemy import (
    create_engine, Column, Integer, String, Float, 
    DateTime, Boolean, ForeignKey, Text, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/public_health_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Facility(Base):
    __tablename__ = "facilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    lga = Column(String, index=True)
    state = Column(String)
    type = Column(String)  # Primary, Secondary, Tertiary
    coordinates = Column(JSON)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

class HealthWorker(Base):
    __tablename__ = "health_workers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    role = Column(String)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    phone = Column(String)
    email = Column(String)
    status = Column(String, default="active")
    
    facility = relationship("Facility")

class VaccinationRecord(Base):
    __tablename__ = "vaccination_records"
    
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(String, index=True)
    child_name = Column(String)
    date_of_birth = Column(DateTime)
    vaccine_type = Column(String)
    dose_number = Column(Integer)
    date_administered = Column(DateTime)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    location = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class MaternalHealthRecord(Base):
    __tablename__ = "maternal_health_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    name = Column(String)
    lmp = Column(DateTime)  # Last Menstrual Period
    edd = Column(DateTime)  # Expected Delivery Date
    risk_level = Column(String)  # Low, Medium, High
    anc_visits = Column(Integer, default=0)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class DiseaseReport(Base):
    __tablename__ = "disease_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    disease_type = Column(String, index=True)
    cases = Column(Integer)
    deaths = Column(Integer)
    date_reported = Column(DateTime)
    location = Column(String)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    status = Column(String, default="reported")
    created_at = Column(DateTime, default=datetime.utcnow)

class DrugInventory(Base):
    __tablename__ = "drug_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    drug_name = Column(String, index=True)
    quantity = Column(Integer)
    unit = Column(String)
    expiry_date = Column(DateTime)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    reorder_level = Column(Integer)
    last_updated = Column(DateTime, default=datetime.utcnow)

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_type = Column(String)
    parameters = Column(JSON)
    results = Column(JSON)
    insights = Column(Text)
    recommendations = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)  # outbreak, stockout, coverage_drop
    severity = Column(String)  # low, medium, high, critical
    message = Column(Text)
    location = Column(String)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, director, health_worker, etc.
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    facility = relationship("Facility")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    type = Column(String)  # weekly, monthly, donor, custom
    parameters = Column(JSON)
    file_path = Column(String)
    generated_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="generated")  # draft, generated, approved, submitted
    
    generator = relationship("User")

class SyncLog(Base):
    __tablename__ = "sync_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    records_synced = Column(Integer)
    sync_type = Column(String)  # full, incremental
    status = Column(String)  # success, partial, failed
    errors = Column(JSON, nullable=True)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    table_name = Column(String)
    record_id = Column(Integer, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables
Base.metadata.create_all(bind=engine)