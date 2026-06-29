from celery import shared_task
from ..models.database import get_db, Alert, Report
from ..config import settings
from datetime import datetime, timedelta
import subprocess
import logging
import os

logger = logging.getLogger(__name__)

@shared_task(name="cleanup_old_data")
def cleanup_old_data():
    """Clean up old data based on retention policies"""
    db = next(get_db())
    try:
        # Archive old alerts
        cutoff = datetime.now() - timedelta(days=settings.DATA_RETENTION_DAYS)
        db.query(Alert).filter(
            Alert.created_at < cutoff,
            Alert.status == 'active'
        ).update({"status": "archived"})
        
        # Clean old reports
        reports_cutoff = datetime.now() - timedelta(days=settings.REPORT_RETENTION_DAYS)
        old_reports = db.query(Report).filter(Report.created_at < reports_cutoff).all()
        for report in old_reports:
            if os.path.exists(report.file_path):
                os.remove(report.file_path)
            db.delete(report)
        
        db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Cleanup error: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}

@shared_task(name="backup_database")
def backup_database():
    """Create database backup"""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"backups/db_backup_{timestamp}.sql"
        
        # PostgreSQL backup command
        cmd = f"pg_dump {settings.DATABASE_URL} > {backup_path}"
        subprocess.run(cmd, shell=True, check=True)
        
        # Keep only last 7 backups
        backup_dir = "backups"
        backups = sorted(os.listdir(backup_dir))
        while len(backups) > 7:
            os.remove(os.path.join(backup_dir, backups.pop(0)))
        
        return {"status": "success", "backup_path": backup_path}
    except Exception as e:
        logger.error(f"Backup error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="health_check")
def health_check():
    """System health check"""
    db = next(get_db())
    checks = {
        "database": False,
        "redis": False,
        "disk_space": False,
        "memory": False,
    }
    
    try:
        # Check database
        db.execute("SELECT 1")
        checks["database"] = True
        
        # Check Redis
        import redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        checks["redis"] = True
        
        # Check disk space
        import shutil
        disk = shutil.disk_usage("/")
        checks["disk_space"] = disk.free > 1024 * 1024 * 100  # 100MB free
        
        # Check memory
        import psutil
        mem = psutil.virtual_memory()
        checks["memory"] = mem.percent < 90
        
        all_healthy = all(checks.values())
        
        if not all_healthy:
            logger.warning(f"Health check failed: {checks}")
            # Send alert if critical
            if not checks["database"] or not checks["redis"]:
                AlertService.send_alert({
                    'type': 'system_health',
                    'severity': 'critical',
                    'message': f"Health check failed: {checks}",
                })
        
        return {"status": "healthy" if all_healthy else "unhealthy", "checks": checks}
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name="rotate_logs")
def rotate_logs():
    """Rotate and compress old log files"""
    try:
        log_dir = settings.LOG_DIR
        cutoff = datetime.now() - timedelta(days=settings.LOG_RETENTION_DAYS)
        
        for log_file in os.listdir(log_dir):
            file_path = os.path.join(log_dir, log_file)
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff:
                    os.remove(file_path)
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Log rotation error: {e}")
        return {"status": "error", "message": str(e)}