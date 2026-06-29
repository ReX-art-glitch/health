"""
Storage Configuration
"""
import os
from pathlib import Path
from typing import Dict, List, Optional, Any, BinaryIO
from datetime import datetime, timedelta
import shutil
import hashlib
import mimetypes
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class StorageConfig:
    """File storage configuration and management"""
    
    def __init__(self, settings=None):
        self.settings = settings
        
        # Storage backends
        self.backends = {
            'local': self._local_storage,
            's3': self._s3_storage if settings and settings.AWS_S3_BUCKET else None
        }
        
        # Active backend
        self.active_backend = 's3' if settings and settings.AWS_S3_BUCKET else 'local'
        
        # File type configurations
        self.file_types = {
            'documents': {
                'extensions': ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.xls'],
                'max_size': 10 * 1024 * 1024,  # 10MB
                'path': 'documents'
            },
            'images': {
                'extensions': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'],
                'max_size': 5 * 1024 * 1024,  # 5MB
                'path': 'images'
            },
            'reports': {
                'extensions': ['.pdf', '.docx', '.xlsx', '.html'],
                'max_size': 20 * 1024 * 1024,  # 20MB
                'path': 'reports'
            },
            'data': {
                'extensions': ['.csv', '.json', '.xml', '.xlsx'],
                'max_size': 50 * 1024 * 1024,  # 50MB
                'path': 'data'
            },
            'models': {
                'extensions': ['.pkl', '.joblib', '.h5', '.pb', '.onnx'],
                'max_size': 100 * 1024 * 1024,  # 100MB
                'path': 'models'
            },
            'backups': {
                'extensions': ['.sql', '.dump', '.gz', '.tar', '.zip'],
                'max_size': 500 * 1024 * 1024,  # 500MB
                'path': 'backups'
            }
        }
        
        # Storage quotas
        self.quotas = {
            'documents': 1024 * 1024 * 1024,  # 1GB
            'images': 512 * 1024 * 1024,      # 512MB
            'reports': 2 * 1024 * 1024 * 1024, # 2GB
            'data': 5 * 1024 * 1024 * 1024,    # 5GB
            'models': 10 * 1024 * 1024 * 1024,  # 10GB
            'backups': 50 * 1024 * 1024 * 1024  # 50GB
        }
    
    def get_storage_path(self, file_type: str) -> Path:
        """Get storage path for file type"""
        from .settings import settings
        
        if file_type in self.file_types:
            path = settings.UPLOAD_DIR / self.file_types[file_type]['path']
        else:
            path = settings.UPLOAD_DIR / 'other'
        
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    def generate_filename(self, original_filename: str) -> str:
        """Generate unique filename"""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        file_hash = hashlib.md5(original_filename.encode()).hexdigest()[:8]
        extension = Path(original_filename).suffix.lower()
        
        return f"{timestamp}_{file_hash}{extension}"
    
    def validate_file(
        self,
        filename: str,
        file_size: int,
        file_type: str
    ) -> Dict[str, Any]:
        """Validate file before storage"""
        result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Check file type
        if file_type not in self.file_types:
            result['errors'].append(f'Invalid file type: {file_type}')
            result['is_valid'] = False
            return result
        
        type_config = self.file_types[file_type]
        
        # Check extension
        extension = Path(filename).suffix.lower()
        if extension not in type_config['extensions']:
            result['errors'].append(f'File extension {extension} not allowed for {file_type}')
            result['is_valid'] = False
        
        # Check size
        if file_size > type_config['max_size']:
            max_mb = type_config['max_size'] / (1024 * 1024)
            file_mb = file_size / (1024 * 1024)
            result['errors'].append(
                f'File size ({file_mb:.1f}MB) exceeds maximum ({max_mb:.1f}MB)'
            )
            result['is_valid'] = False
        
        # Check quota
        if not self._check_quota(file_type, file_size):
            result['errors'].append(f'Storage quota exceeded for {file_type}')
            result['is_valid'] = False
        
        return result
    
    def _check_quota(self, file_type: str, additional_size: int) -> bool:
        """Check if adding file would exceed quota"""
        if file_type not in self.quotas:
            return True
        
        current_size = self._get_directory_size(self.get_storage_path(file_type))
        return (current_size + additional_size) <= self.quotas[file_type]
    
    def _get_directory_size(self, path: Path) -> int:
        """Get total size of directory"""
        total_size = 0
        if path.exists():
            for file_path in path.rglob('*'):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
        return total_size
    
    async def save_file(
        self,
        file_data: bytes,
        filename: str,
        file_type: str,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """Save file to storage"""
        try:
            # Generate unique filename
            unique_filename = self.generate_filename(filename)
            
            # Get storage path
            storage_path = self.get_storage_path(file_type)
            file_path = storage_path / unique_filename
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            # Calculate file hash
            file_hash = hashlib.sha256(file_data).hexdigest()
            
            # Get MIME type
            mime_type, _ = mimetypes.guess_type(filename)
            
            # Create metadata file
            if metadata:
                metadata_path = file_path.with_suffix('.meta.json')
                metadata.update({
                    'original_filename': filename,
                    'stored_filename': unique_filename,
                    'file_type': file_type,
                    'file_size': len(file_data),
                    'mime_type': mime_type,
                    'hash': file_hash,
                    'uploaded_at': datetime.utcnow().isoformat()
                })
                
                with open(metadata_path, 'w') as f:
                    json.dump(metadata, f, indent=2)
            
            logger.info(f"File saved: {unique_filename}")
            
            return {
                'status': 'success',
                'filename': unique_filename,
                'original_filename': filename,
                'file_path': str(file_path),
                'file_size': len(file_data),
                'mime_type': mime_type,
                'hash': file_hash
            }
            
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def get_file(self, filename: str, file_type: str) -> Optional[bytes]:
        """Get file from storage"""
        try:
            file_path = self.get_storage_path(file_type) / filename
            
            if file_path.exists():
                with open(file_path, 'rb') as f:
                    return f.read()
            
            return None
            
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            return None
    
    def delete_file(self, filename: str, file_type: str) -> bool:
        """Delete file from storage"""
        try:
            file_path = self.get_storage_path(file_type) / filename
            metadata_path = file_path.with_suffix('.meta.json')
            
            if file_path.exists():
                file_path.unlink()
                
                if metadata_path.exists():
                    metadata_path.unlink()
                
                logger.info(f"File deleted: {filename}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False
    
    def list_files(
        self,
        file_type: str,
        pattern: str = None
    ) -> List[Dict]:
        """List files in storage"""
        try:
            path = self.get_storage_path(file_type)
            files = []
            
            for file_path in path.glob(pattern or '*'):
                if file_path.is_file() and not file_path.suffix == '.meta.json':
                    stat = file_path.stat()
                    files.append({
                        'filename': file_path.name,
                        'size': stat.st_size,
                        'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
            
            return files
            
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        stats = {
            'total_size': 0,
            'file_count': 0,
            'by_type': {}
        }
        
        for file_type, config in self.file_types.items():
            path = self.get_storage_path(file_type)
            type_size = self._get_directory_size(path)
            file_count = len(list(path.glob('*')))
            
            stats['by_type'][file_type] = {
                'size': type_size,
                'file_count': file_count,
                'quota': self.quotas.get(file_type, 0),
                'usage_percent': (type_size / self.quotas[file_type] * 100) if file_type in self.quotas else 0
            }
            
            stats['total_size'] += type_size
            stats['file_count'] += file_count
        
        return stats
    
    def cleanup_old_files(self, days: int = 30) -> int:
        """Clean up files older than specified days"""
        cleaned_count = 0
        cutoff_date = datetime.now() - timedelta(days=days)
        
        for file_type in self.file_types:
            path = self.get_storage_path(file_type)
            
            for file_path in path.glob('*'):
                if file_path.is_file():
                    modified_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if modified_time < cutoff_date:
                        file_path.unlink()
                        cleaned_count += 1
        
        logger.info(f"Cleaned up {cleaned_count} old files")
        return cleaned_count

# Create global storage config instance
from .settings import settings
storage_config = StorageConfig(settings)