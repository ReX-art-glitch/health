"""
Model Manager - Manage AI model lifecycle
"""
import joblib
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import hashlib
from pathlib import Path

logger = logging.getLogger(__name__)

class ModelManager:
    """Manage AI model saving, loading, and versioning"""
    
    def __init__(self, base_path: str = './models'):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Model registry
        self.registry_path = self.base_path / 'registry.json'
        self.registry = self._load_registry()
        
        # Performance tracking
        self.performance_path = self.base_path / 'performance.json'
        self.performance = self._load_performance()
    
    def _load_registry(self) -> Dict:
        """Load model registry"""
        if self.registry_path.exists():
            with open(self.registry_path, 'r') as f:
                return json.load(f)
        return {'models': {}, 'versions': {}}
    
    def _save_registry(self):
        """Save model registry"""
        with open(self.registry_path, 'w') as f:
            json.dump(self.registry, f, indent=2, default=str)
    
    def _load_performance(self) -> Dict:
        """Load performance tracking"""
        if self.performance_path.exists():
            with open(self.performance_path, 'r') as f:
                return json.load(f)
        return {'metrics': [], 'last_updated': None}
    
    def _save_performance(self):
        """Save performance tracking"""
        with open(self.performance_path, 'w') as f:
            json.dump(self.performance, f, indent=2, default=str)
    
    def save_model(
        self,
        model: Any,
        model_name: str,
        metadata: Dict = None
    ) -> str:
        """
        Save model to disk
        
        Args:
            model: Trained model object
            model_name: Name of the model
            metadata: Additional metadata
            
        Returns:
            Model version ID
        """
        try:
            # Create version
            version = self._create_version(model_name)
            
            # Create model directory
            model_dir = self.base_path / model_name
            model_dir.mkdir(exist_ok=True)
            
            # Save model file
            model_path = model_dir / f'v{version}.pkl'
            
            # Prepare save data
            save_data = {
                'model': model,
                'metadata': metadata or {},
                'version': version,
                'saved_at': datetime.utcnow().isoformat(),
                'model_hash': self._compute_hash(model)
            }
            
            joblib.dump(save_data, model_path)
            
            # Update registry
            self.registry['models'][model_name] = {
                'current_version': version,
                'latest_path': str(model_path),
                'total_versions': self.registry['models'].get(model_name, {}).get('total_versions', 0) + 1,
                'last_updated': datetime.utcnow().isoformat()
            }
            
            self.registry['versions'][f'{model_name}_v{version}'] = {
                'path': str(model_path),
                'created_at': datetime.utcnow().isoformat(),
                'metadata': metadata or {}
            }
            
            self._save_registry()
            
            logger.info(f"Model {model_name} v{version} saved successfully")
            return f"{model_name}_v{version}"
            
        except Exception as e:
            logger.error(f"Error saving model {model_name}: {e}")
            raise
    
    def load_model(self, model_name: str, version: str = None) -> Optional[Dict]:
        """
        Load model from disk
        
        Args:
            model_name: Name of the model
            version: Specific version to load (None for latest)
            
        Returns:
            Dictionary with model and metadata
        """
        try:
            if version:
                version_key = f'{model_name}_v{version}'
                if version_key not in self.registry['versions']:
                    logger.error(f"Model version {version_key} not found")
                    return None
                
                model_path = self.registry['versions'][version_key]['path']
            else:
                if model_name not in self.registry['models']:
                    logger.error(f"Model {model_name} not found")
                    return None
                
                model_path = self.registry['models'][model_name]['latest_path']
            
            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return None
            
            model_data = joblib.load(model_path)
            
            logger.info(f"Model {model_name} loaded successfully")
            return model_data
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            return None
    
    async def save_models(self, models: Dict[str, Any]) -> Dict:
        """
        Save multiple models
        
        Args:
            models: Dictionary of model_name: model_object
            
        Returns:
            Dictionary with save results
        """
        results = {}
        
        for model_name, model_data in models.items():
            try:
                if isinstance(model_data, dict):
                    model = model_data.get('model')
                    metadata = model_data.get('metadata', {})
                else:
                    model = model_data
                    metadata = {}
                
                version_id = self.save_model(model, model_name, metadata)
                results[model_name] = {
                    'status': 'success',
                    'version': version_id
                }
            except Exception as e:
                results[model_name] = {
                    'status': 'failed',
                    'error': str(e)
                }
        
        return results
    
    def get_performance_metrics(self) -> Dict:
        """Get model performance metrics"""
        return {
            'metrics': self.performance.get('metrics', []),
            'last_updated': self.performance.get('last_updated'),
            'models_tracked': len(self.registry.get('models', {}))
        }
    
    def get_last_training_time(self) -> Optional[str]:
        """Get last model training time"""
        return self.registry.get('last_training_time')
    
    def log_performance(
        self,
        model_name: str,
        metrics: Dict,
        dataset_info: Dict = None
    ):
        """Log model performance metrics"""
        performance_entry = {
            'model_name': model_name,
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': metrics,
            'dataset_info': dataset_info or {}
        }
        
        self.performance['metrics'].append(performance_entry)
        self.performance['last_updated'] = datetime.utcnow().isoformat()
        
        # Keep only last 1000 entries
        if len(self.performance['metrics']) > 1000:
            self.performance['metrics'] = self.performance['metrics'][-1000:]
        
        self._save_performance()
    
    def _create_version(self, model_name: str) -> int:
        """Create new version number for model"""
        if model_name in self.registry['models']:
            return self.registry['models'][model_name]['total_versions'] + 1
        return 1
    
    def _compute_hash(self, model: Any) -> str:
        """Compute hash of model for integrity checking"""
        try:
            model_bytes = joblib.dumps(model)
            return hashlib.sha256(model_bytes).hexdigest()
        except:
            return 'hash_unavailable'
    
    def list_models(self) -> Dict:
        """List all registered models"""
        models = {}
        for name, info in self.registry.get('models', {}).items():
            models[name] = {
                'current_version': info.get('current_version'),
                'last_updated': info.get('last_updated'),
                'total_versions': info.get('total_versions', 0)
            }
        return models
    
    def cleanup_old_versions(self, keep_last: int = 5):
        """Remove old model versions"""
        for model_name in self.registry.get('models', {}):
            model_dir = self.base_path / model_name
            if model_dir.exists():
                versions = sorted([
                    int(f.stem.replace('v', ''))
                    for f in model_dir.glob('v*.pkl')
                ])
                
                # Keep only recent versions
                versions_to_remove = versions[:-keep_last] if len(versions) > keep_last else []
                
                for version in versions_to_remove:
                    file_path = model_dir / f'v{version}.pkl'
                    if file_path.exists():
                        file_path.unlink()
                        logger.info(f"Removed old model version: {file_path}")