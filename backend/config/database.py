"""
Database Configuration
"""
import os
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, NullPool
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration and connection management"""
    
    def __init__(self, settings=None):
        self.settings = settings
        self._engine = None
        self._session_factory = None
        self._read_engine = None
        self._read_session_factory = None
    
    def get_engine(self, read_only: bool = False):
        """Get database engine"""
        if read_only:
            if self._read_engine is None:
                self._read_engine = self._create_engine(read_only=True)
            return self._read_engine
        
        if self._engine is None:
            self._engine = self._create_engine()
        return self._engine
    
    def _create_engine(self, read_only: bool = False):
        """Create database engine"""
        from .settings import settings
        
        database_url = settings.DATABASE_URL
        
        # For read replicas in production
        if read_only and settings.is_production:
            read_url = os.getenv('DATABASE_READ_URL', database_url)
            if read_url != database_url:
                database_url = read_url
        
        # Connection arguments
        connect_args = {}
        
        # SQLite specific
        if 'sqlite' in database_url:
            connect_args['check_same_thread'] = False
        
        # PostgreSQL specific
        if 'postgresql' in database_url:
            connect_args['application_name'] = settings.APP_NAME
            connect_args['options'] = '-c statement_timeout=30000'  # 30 second timeout
        
        # Create engine
        engine = create_engine(
            database_url,
            poolclass=QueuePool if not read_only else NullPool,
            pool_size=settings.DATABASE_POOL_SIZE if not read_only else 5,
            max_overflow=settings.DATABASE_MAX_OVERFLOW if not read_only else 2,
            pool_timeout=settings.DATABASE_POOL_TIMEOUT,
            pool_pre_ping=True,  # Verify connections before using
            pool_recycle=3600,   # Recycle connections every hour
            echo=settings.DATABASE_ECHO,
            connect_args=connect_args
        )
        
        # Add event listeners
        self._add_engine_events(engine)
        
        return engine
    
    def _add_engine_events(self, engine):
        """Add event listeners to engine"""
        
        @event.listens_for(engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            """Log connection events"""
            logger.debug("Database connection established")
        
        @event.listens_for(engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Log connection checkout"""
            logger.debug("Database connection checked out from pool")
        
        @event.listens_for(engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Log connection checkin"""
            logger.debug("Database connection returned to pool")
    
    def get_session_factory(self, read_only: bool = False):
        """Get session factory"""
        if read_only:
            if self._read_session_factory is None:
                engine = self.get_engine(read_only=True)
                self._read_session_factory = sessionmaker(
                    bind=engine,
                    autocommit=False,
                    autoflush=False
                )
            return self._read_session_factory
        
        if self._session_factory is None:
            engine = self.get_engine()
            self._session_factory = sessionmaker(
                bind=engine,
                autocommit=False,
                autoflush=False
            )
        return self._session_factory
    
    @contextmanager
    def get_session(self, read_only: bool = False) -> Session:
        """Get database session as context manager"""
        session_factory = self.get_session_factory(read_only)
        session = session_factory()
        
        try:
            yield session
            if not read_only:
                session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            engine = self.get_engine()
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status"""
        engine = self.get_engine()
        pool = engine.pool
        
        return {
            'size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'total': pool.size() + pool.overflow()
        }
    
    def dispose_engine(self):
        """Dispose database engine"""
        if self._engine:
            self._engine.dispose()
            self._engine = None
            self._session_factory = None
        
        if self._read_engine:
            self._read_engine.dispose()
            self._read_engine = None
            self._read_session_factory = None
        
        logger.info("Database engines disposed")

# Create global database config instance
from .settings import settings
database_config = DatabaseConfig(settings)

# Dependency for FastAPI
def get_db():
    """Dependency to get database session"""
    with database_config.get_session() as session:
        yield session

def get_read_db():
    """Dependency to get read-only database session"""
    with database_config.get_session(read_only=True) as session:
        yield session