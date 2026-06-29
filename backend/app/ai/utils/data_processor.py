"""
Data Processor - Data preprocessing and transformation utilities
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    """Data preprocessing and transformation for AI models"""
    
    def __init__(self):
        self.scalers = {}
        self.encoders = {}
        self.default_date_formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y',
            '%Y-%m-%d %H:%M:%S', '%d-%m-%Y',
            '%Y/%m/%d', '%B %d, %Y'
        ]
    
    def summarize_data(self, data: pd.DataFrame) -> Dict:
        """Generate comprehensive data summary"""
        summary = {
            'shape': {
                'rows': len(data),
                'columns': len(data.columns)
            },
            'columns': {},
            'missing_data': {},
            'data_types': {},
            'basic_stats': {}
        }
        
        for column in data.columns:
            # Column info
            col_info = {
                'dtype': str(data[column].dtype),
                'unique_values': int(data[column].nunique()),
                'missing_count': int(data[column].isnull().sum()),
                'missing_percentage': float(data[column].isnull().sum() / len(data) * 100)
            }
            
            # Add statistics for numeric columns
            if pd.api.types.is_numeric_dtype(data[column]):
                col_info['stats'] = {
                    'mean': float(data[column].mean()) if not data[column].isnull().all() else None,
                    'std': float(data[column].std()) if not data[column].isnull().all() else None,
                    'min': float(data[column].min()) if not data[column].isnull().all() else None,
                    'max': float(data[column].max()) if not data[column].isnull().all() else None,
                    'median': float(data[column].median()) if not data[column].isnull().all() else None,
                    'quartiles': {
                        'q1': float(data[column].quantile(0.25)),
                        'q3': float(data[column].quantile(0.75))
                    }
                }
            
            summary['columns'][column] = col_info
        
        # Overall missing data
        total_missing = data.isnull().sum().sum()
        total_cells = data.size
        summary['missing_data'] = {
            'total_missing': int(total_missing),
            'total_cells': int(total_cells),
            'overall_percentage': float(total_missing / total_cells * 100) if total_cells > 0 else 0
        }
        
        # Data types summary
        summary['data_types'] = {
            'numeric': int(len(data.select_dtypes(include=[np.number]).columns)),
            'categorical': int(len(data.select_dtypes(include=['object']).columns)),
            'datetime': int(len(data.select_dtypes(include=['datetime64']).columns)),
            'boolean': int(len(data.select_dtypes(include=['bool']).columns))
        }
        
        return summary
    
    def clean_data(
        self,
        data: pd.DataFrame,
        config: Dict = None
    ) -> pd.DataFrame:
        """
        Clean and preprocess data
        
        Args:
            data: DataFrame to clean
            config: Cleaning configuration options
            
        Returns:
            Cleaned DataFrame
        """
        config = config or {}
        
        df = data.copy()
        
        # Remove completely empty rows and columns
        if config.get('remove_empty', True):
            df = df.dropna(how='all').dropna(axis=1, how='all')
        
        # Remove duplicate rows
        if config.get('remove_duplicates', True):
            df = df.drop_duplicates()
        
        # Handle missing values
        if config.get('fill_missing', True):
            df = self._fill_missing_values(df, config.get('fill_strategy', 'auto'))
        
        # Standardize column names
        if config.get('standardize_columns', True):
            df.columns = self._standardize_column_names(df.columns)
        
        # Convert data types
        if config.get('convert_types', True):
            df = self._convert_data_types(df)
        
        # Remove outliers
        if config.get('remove_outliers', False):
            df = self._remove_outliers(df)
        
        return df
    
    def _fill_missing_values(
        self,
        df: pd.DataFrame,
        strategy: str = 'auto'
    ) -> pd.DataFrame:
        """Fill missing values based on strategy"""
        for column in df.columns:
            if df[column].isnull().any():
                if pd.api.types.is_numeric_dtype(df[column]):
                    if strategy == 'mean':
                        df[column] = df[column].fillna(df[column].mean())
                    elif strategy == 'median':
                        df[column] = df[column].fillna(df[column].median())
                    elif strategy == 'zero':
                        df[column] = df[column].fillna(0)
                    else:  # auto
                        if df[column].skew() > 1:
                            df[column] = df[column].fillna(df[column].median())
                        else:
                            df[column] = df[column].fillna(df[column].mean())
                else:
                    df[column] = df[column].fillna(df[column].mode().iloc[0] if not df[column].mode().empty else 'Unknown')
        
        return df
    
    def _standardize_column_names(self, columns: List[str]) -> List[str]:
        """Standardize column names"""
        standardized = []
        for col in columns:
            # Convert to lowercase
            clean = col.lower()
            # Replace spaces and special chars with underscore
            clean = ''.join(c if c.isalnum() else '_' for c in clean)
            # Remove consecutive underscores
            while '__' in clean:
                clean = clean.replace('__', '_')
            # Remove leading/trailing underscores
            clean = clean.strip('_')
            standardized.append(clean)
        return standardized
    
    def _convert_data_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """Convert columns to appropriate data types"""
        for column in df.columns:
            # Try to convert to datetime
            if df[column].dtype == 'object':
                # Check if it's a date column
                if self._is_date_column(df[column]):
                    df[column] = pd.to_datetime(df[column], errors='coerce')
                    continue
                
                # Try numeric conversion
                try:
                    df[column] = pd.to_numeric(df[column])
                except:
                    pass
        
        return df
    
    def _is_date_column(self, series: pd.Series) -> bool:
        """Check if a column contains dates"""
        if series.empty:
            return False
        
        # Sample non-null values
        sample = series.dropna().head(10)
        if len(sample) == 0:
            return False
        
        # Try parsing with different formats
        date_count = 0
        for value in sample:
            if isinstance(value, str):
                for fmt in self.default_date_formats:
                    try:
                        datetime.strptime(value, fmt)
                        date_count += 1
                        break
                    except:
                        continue
        
        return date_count / len(sample) > 0.7
    
    def _remove_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove outliers using IQR method"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
        
        return df
    
    def normalize_data(
        self,
        data: pd.DataFrame,
        method: str = 'standard',
        columns: List[str] = None
    ) -> pd.DataFrame:
        """Normalize/normalize data"""
        df = data.copy()
        
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if method == 'standard':
            scaler = StandardScaler()
            df[columns] = scaler.fit_transform(df[columns])
            self.scalers['standard'] = scaler
        
        elif method == 'minmax':
            scaler = MinMaxScaler()
            df[columns] = scaler.fit_transform(df[columns])
            self.scalers['minmax'] = scaler
        
        return df
    
    def encode_categorical(
        self,
        data: pd.DataFrame,
        columns: List[str] = None
    ) -> pd.DataFrame:
        """Encode categorical variables"""
        df = data.copy()
        
        if columns is None:
            columns = df.select_dtypes(include=['object']).columns.tolist()
        
        for col in columns:
            if col in df.columns:
                encoder = LabelEncoder()
                df[col] = encoder.fit_transform(df[col].astype(str))
                self.encoders[col] = encoder
        
        return df
    
    def split_data(
        self,
        data: pd.DataFrame,
        target: str,
        test_size: float = 0.2,
        val_size: float = 0.1,
        time_series: bool = False
    ) -> Dict[str, pd.DataFrame]:
        """Split data into train/val/test sets"""
        if time_series and 'date' in data.columns:
            data = data.sort_values('date')
            
            n = len(data)
            train_end = int(n * (1 - test_size - val_size))
            val_end = int(n * (1 - test_size))
            
            return {
                'train': data.iloc[:train_end],
                'val': data.iloc[train_end:val_end],
                'test': data.iloc[val_end:],
                'X_train': data.iloc[:train_end].drop(columns=[target]),
                'y_train': data.iloc[:train_end][target],
                'X_val': data.iloc[train_end:val_end].drop(columns=[target]),
                'y_val': data.iloc[train_end:val_end][target],
                'X_test': data.iloc[val_end:].drop(columns=[target]),
                'y_test': data.iloc[val_end:][target]
            }
        else:
            from sklearn.model_selection import train_test_split
            
            # First split: separate test set
            train_val, test = train_test_split(
                data, test_size=test_size, random_state=42
            )
            
            # Second split: separate validation set
            val_ratio = val_size / (1 - test_size)
            train, val = train_test_split(
                train_val, test_size=val_ratio, random_state=42
            )
            
            return {
                'train': train,
                'val': val,
                'test': test,
                'X_train': train.drop(columns=[target]),
                'y_train': train[target],
                'X_val': val.drop(columns=[target]),
                'y_val': val[target],
                'X_test': test.drop(columns=[target]),
                'y_test': test[target]
            }
    
    def aggregate_temporal(
        self,
        data: pd.DataFrame,
        date_column: str,
        freq: str = 'D',
        agg_dict: Dict = None
    ) -> pd.DataFrame:
        """Aggregate data by time periods"""
        df = data.copy()
        df[date_column] = pd.to_datetime(df[date_column])
        
        if agg_dict is None:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            agg_dict = {col: 'sum' for col in numeric_cols if col != date_column}
        
        return df.groupby(pd.Grouper(key=date_column, freq=freq)).agg(agg_dict).reset_index()
    
    def detect_anomalies(
        self,
        data: pd.DataFrame,
        column: str,
        method: str = 'iqr'
    ) -> pd.DataFrame:
        """Detect anomalies in data"""
        df = data.copy()
        
        if method == 'iqr':
            Q1 = df[column].quantile(0.25)
            Q3 = df[column].quantile(0.75)
            IQR = Q3 - Q1
            
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            
            df['is_anomaly'] = (df[column] < lower) | (df[column] > upper)
            df['anomaly_score'] = np.abs(df[column] - df[column].median()) / IQR
        
        elif method == 'zscore':
            from scipy import stats
            z_scores = np.abs(stats.zscore(df[column].fillna(df[column].mean())))
            df['is_anomaly'] = z_scores > 3
            df['anomaly_score'] = z_scores
        
        return df