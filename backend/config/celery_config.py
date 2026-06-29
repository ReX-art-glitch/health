"""
Celery Configuration
"""
from celery import Celery
from celery.schedules import crontab
from datetime import timedelta
from typing import Dict, Any
import os

class CeleryConfig:
    """Celery task queue configuration"""
    
    def __init__(self, settings=None):
        self.settings = settings
        self._app = None
    
    def create_app(self) -> Celery:
        """Create Celery application"""
        from .settings import settings
        
        app = Celery(
            'public_health_ai',
            broker=settings.CELERY_BROKER_URL,
            backend=settings.CELERY_RESULT_BACKEND,
            include=[
                'app.tasks.data_processing',
                'app.tasks.ai_tasks',
                'app.tasks.report_tasks',
                'app.tasks.notification_tasks',
                'app.tasks.maintenance_tasks'
            ]
        )
        
        # Configure Celery
        app.conf.update(
            task_serializer='json',
            accept_content=['json'],
            result_serializer='json',
            timezone='UTC',
            enable_utc=True,
            
            # Task settings
            task_track_started=True,
            task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
            task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
            task_acks_late=True,
            task_reject_on_worker_lost=True,
            task_default_retry_delay=300,  # 5 minutes
            task_max_retries=3,
            
            # Worker settings
            worker_prefetch_multiplier=1,
            worker_max_tasks_per_child=1000,
            worker_concurrency=4,
            
            # Result backend settings
            result_expires=timedelta(days=7),
            result_extended=True,
            
            # Beat schedule
            beat_schedule={
                # Daily tasks
                'daily-ai-analysis': {
                    'task': 'app.tasks.ai_tasks.run_daily_analysis',
                    'schedule': crontab(hour=1, minute=0),
                    'options': {'queue': 'ai_tasks'}
                },
                'daily-data-cleanup': {
                    'task': 'app.tasks.maintenance_tasks.cleanup_old_data',
                    'schedule': crontab(hour=2, minute=0),
                    'options': {'queue': 'maintenance'}
                },
                'daily-report-generation': {
                    'task': 'app.tasks.report_tasks.generate_daily_summary',
                    'schedule': crontab(hour=6, minute=0),
                    'options': {'queue': 'reports'}
                },
                
                # Weekly tasks
                'weekly-report-generation': {
                    'task': 'app.tasks.report_tasks.generate_weekly_reports',
                    'schedule': crontab(hour=7, minute=0, day_of_week='monday'),
                    'options': {'queue': 'reports'}
                },
                'weekly-model-retraining': {
                    'task': 'app.tasks.ai_tasks.retrain_models',
                    'schedule': crontab(hour=0, minute=0, day_of_week='sunday'),
                    'options': {'queue': 'ai_tasks'}
                },
                
                # Monthly tasks
                'monthly-report-generation': {
                    'task': 'app.tasks.report_tasks.generate_monthly_reports',
                    'schedule': crontab(hour=8, minute=0, day_of_month=1),
                    'options': {'queue': 'reports'}
                },
                
                # Frequent tasks
                'check-outbreak-alerts': {
                    'task': 'app.tasks.ai_tasks.check_outbreak_alerts',
                    'schedule': crontab(minute='*/30'),  # Every 30 minutes
                    'options': {'queue': 'ai_tasks'}
                },
                'sync-mobile-data': {
                    'task': 'app.tasks.data_processing.sync_mobile_data',
                    'schedule': crontab(minute='*/15'),  # Every 15 minutes
                    'options': {'queue': 'data_processing'}
                },
                'check-inventory-alerts': {
                    'task': 'app.tasks.ai_tasks.check_inventory_levels',
                    'schedule': crontab(hour='*/6', minute=0),  # Every 6 hours
                    'options': {'queue': 'ai_tasks'}
                },
                'send-notification-digest': {
                    'task': 'app.tasks.notification_tasks.send_daily_digest',
                    'schedule': crontab(hour=8, minute=0),
                    'options': {'queue': 'notifications'}
                },
                'backup-database': {
                    'task': 'app.tasks.maintenance_tasks.backup_database',
                    'schedule': crontab(hour=3, minute=0),
                    'options': {'queue': 'maintenance'}
                },
                'health-check': {
                    'task': 'app.tasks.maintenance_tasks.health_check',
                    'schedule': crontab(minute='*/5'),  # Every 5 minutes
                    'options': {'queue': 'maintenance'}
                }
            },
            
            # Task routes
            task_routes={
                'app.tasks.ai_tasks.*': {'queue': 'ai_tasks'},
                'app.tasks.data_processing.*': {'queue': 'data_processing'},
                'app.tasks.report_tasks.*': {'queue': 'reports'},
                'app.tasks.notification_tasks.*': {'queue': 'notifications'},
                'app.tasks.maintenance_tasks.*': {'queue': 'maintenance'}
            },
            
            # Task annotations (rate limits)
            task_annotations={
                'app.tasks.ai_tasks.run_daily_analysis': {
                    'rate_limit': '1/h'
                },
                'app.tasks.notification_tasks.send_bulk_sms': {
                    'rate_limit': '10/m'
                }
            }
        )
        
        self._app = app
        return app
    
    def get_app(self) -> Celery:
        """Get Celery application instance"""
        if self._app is None:
            self._app = self.create_app()
        return self._app
    
    def send_task(self, name: str, args: tuple = None, kwargs: dict = None, **options):
        """Send task to Celery"""
        app = self.get_app()
        return app.send_task(name, args=args, kwargs=kwargs, **options)
    
    def get_task_info(self, task_id: str) -> Dict[str, Any]:
        """Get task information"""
        app = self.get_app()
        result = app.AsyncResult(task_id)
        
        info = {
            'id': task_id,
            'status': result.status,
            'ready': result.ready(),
            'successful': result.successful() if result.ready() else None,
            'failed': result.failed() if result.ready() else None
        }
        
        if result.ready():
            if result.successful():
                info['result'] = result.result
            else:
                info['error'] = str(result.info)
        
        return info
    
    def revoke_task(self, task_id: str, terminate: bool = False):
        """Revoke a task"""
        app = self.get_app()
        app.control.revoke(task_id, terminate=terminate)
    
    def get_active_tasks(self) -> list:
        """Get list of active tasks"""
        app = self.get_app()
        inspect = app.control.inspect()
        
        active_tasks = []
        
        try:
            active = inspect.active()
            if active:
                for worker, tasks in active.items():
                    for task in tasks:
                        active_tasks.append({
                            'worker': worker,
                            'task_id': task['id'],
                            'task_name': task['name'],
                            'args': task['args'],
                            'started_at': task.get('time_start')
                        })
        except:
            pass
        
        return active_tasks
    
    def get_queue_sizes(self) -> Dict[str, int]:
        """Get queue sizes"""
        app = self.get_app()
        inspect = app.control.inspect()
        
        queue_sizes = {}
        
        try:
            stats = inspect.stats()
            if stats:
                for worker, worker_stats in stats.items():
                    for queue, size in worker_stats.get('queues', {}).items():
                        queue_sizes[queue] = queue_sizes.get(queue, 0) + size
        except:
            pass
        
        return queue_sizes

# Create global Celery config instance
from .settings import settings
celery_config = CeleryConfig(settings)
celery_app = celery_config.get_app()