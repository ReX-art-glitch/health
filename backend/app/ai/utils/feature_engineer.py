"""
Feature Engineer - Create features for ML models
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import PCA
import logging

logger = logging.getLogger(__name__)

class FeatureEngineer:
    """Feature engineering for public health ML models"""
    
    def __init__(self):
        self.vectorizers = {}
        self.pca_transformers = {}
        
        # Feature groups
        self.feature_groups = {
            'temporal': [
                'day_of_week', 'month', 'quarter', 'year',
                'is_weekend', 'is_month_start', 'is_month_end',
                'days_since_start', 'week_of_year', 'day_of_year'
            ],
            'statistical': [
                'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30',
                'rolling_std_7', 'rolling_std_14',
                'momentum', 'acceleration',
                'pct_change_7', 'pct_change_14'
            ],
            'health_specific': [
                'cases_per_1000', 'mortality_rate',
                'recovery_rate', 'active_cases_ratio',
                'test_positivity_rate', 'r_effective'
            ]
        }
    
    def create_features(
        self,
        data: pd.DataFrame,
        feature_config: Dict = None
    ) -> pd.DataFrame:
        """
        Create features for ML models
        
        Args:
            data: Input data
            feature_config: Feature creation configuration
            
        Returns:
            DataFrame with engineered features
        """
        feature_config = feature_config or {
            'temporal': True,
            'statistical': True,
            'health_specific': True,
            'encode_categorical': True,
            'interactions': True
        }
        
        df = data.copy()
        feature_list = []
        
        # Add temporal features
        if feature_config.get('temporal', True) and self._has_date_column(df):
            temporal_features = self._create_temporal_features(df)
            feature_list.append(temporal_features)
        
        # Add statistical features
        if feature_config.get('statistical', True):
            stat_features = self._create_statistical_features(df)
            feature_list.append(stat_features)
        
        # Add health-specific features
        if feature_config.get('health_specific', True):
            health_features = self._create_health_features(df)
            feature_list.append(health_features)
        
        # Encode categorical
        if feature_config.get('encode_categorical', True):
            df = self._encode_categorical(df)
        
        # Create interaction features
        if feature_config.get('interactions', True) and len(feature_list) > 0:
            interaction_features = self._create_interactions(df)
            if interaction_features is not None:
                feature_list.append(interaction_features)
        
        # Combine all features
        if feature_list:
            all_features = pd.concat(feature_list, axis=1)
            # Remove duplicate columns
            all_features = all_features.loc[:, ~all_features.columns.duplicated()]
            return all_features
        
        return df
    
    def _has_date_column(self, df: pd.DataFrame) -> bool:
        """Check if DataFrame has date column"""
        date_cols = ['date', 'date_reported', 'date_administered', 'date_of_birth']
        return any(col in df.columns for col in date_cols)
    
    def _find_date_column(self, df: pd.DataFrame) -> Optional[str]:
        """Find the date column"""
        for col in ['date', 'date_reported', 'date_administered']:
            if col in df.columns:
                return col
        
        # Check datetime columns
        datetime_cols = df.select_dtypes(include=['datetime64']).columns
        if len(datetime_cols) > 0:
            return datetime_cols[0]
        
        return None
    
    def _create_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create temporal features"""
        features = pd.DataFrame(index=df.index)
        
        date_col = self._find_date_column(df)
        if date_col is None:
            return features
        
        dates = pd.to_datetime(df[date_col])
        
        features['year'] = dates.dt.year
        features['month'] = dates.dt.month
        features['quarter'] = dates.dt.quarter
        features['day_of_week'] = dates.dt.dayofweek
        features['day_of_month'] = dates.dt.day
        features['week_of_year'] = dates.dt.isocalendar().week.astype(int)
        features['day_of_year'] = dates.dt.dayofyear
        
        # Weekend flag
        features['is_weekend'] = (dates.dt.dayofweek >= 5).astype(int)
        
        # Month boundaries
        features['is_month_start'] = dates.dt.is_month_start.astype(int)
        features['is_month_end'] = dates.dt.is_month_end.astype(int)
        
        # Cyclic encoding for cyclical features
        features['month_sin'] = np.sin(2 * np.pi * dates.dt.month / 12)
        features['month_cos'] = np.cos(2 * np.pi * dates.dt.month / 12)
        features['day_sin'] = np.sin(2 * np.pi * dates.dt.dayofweek / 7)
        features['day_cos'] = np.cos(2 * np.pi * dates.dt.dayofweek / 7)
        
        # Season
        features['season'] = dates.dt.month.apply(self._get_season)
        
        return features
    
    def _get_season(self, month: int) -> str:
        """Get season from month"""
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'fall'
    
    def _create_statistical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create statistical features"""
        features = pd.DataFrame(index=df.index)
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if col not in ['year', 'month', 'quarter', 'day_of_week']:
                # Rolling statistics
                features[f'{col}_rolling_mean_7'] = df[col].rolling(7, min_periods=1).mean()
                features[f'{col}_rolling_mean_14'] = df[col].rolling(14, min_periods=1).mean()
                features[f'{col}_rolling_mean_30'] = df[col].rolling(30, min_periods=1).mean()
                
                features[f'{col}_rolling_std_7'] = df[col].rolling(7, min_periods=1).std()
                features[f'{col}_rolling_std_14'] = df[col].rolling(14, min_periods=1).std()
                
                # Rolling min/max
                features[f'{col}_rolling_min_7'] = df[col].rolling(7, min_periods=1).min()
                features[f'{col}_rolling_max_7'] = df[col].rolling(7, min_periods=1).max()
                
                # Percentage changes
                features[f'{col}_pct_change_7'] = df[col].pct_change(7)
                features[f'{col}_pct_change_14'] = df[col].pct_change(14)
                
                # Momentum and acceleration
                features[f'{col}_momentum'] = df[col] - df[col].shift(7)
                features[f'{col}_acceleration'] = features[f'{col}_momentum'] - features[f'{col}_momentum'].shift(7)
                
                # Exponential moving averages
                features[f'{col}_ema_7'] = df[col].ewm(span=7, adjust=False).mean()
                features[f'{col}_ema_14'] = df[col].ewm(span=14, adjust=False).mean()
                
                # Cumulatives
                features[f'{col}_cumsum'] = df[col].cumsum()
                features[f'{col}_cummax'] = df[col].cummax()
                
                # Expanding statistics
                features[f'{col}_expanding_mean'] = df[col].expanding().mean()
                features[f'{col}_expanding_std'] = df[col].expanding().std()
        
        # Fill NaN values
        features = features.fillna(0)
        
        return features
    
    def _create_health_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create health-specific features"""
        features = pd.DataFrame(index=df.index)
        
        # Vaccination-specific features
        if 'vaccinated' in df.columns and 'eligible' in df.columns:
            features['coverage_rate'] = (
                df['vaccinated'] / df['eligible'] * 100
            ).clip(0, 100)
            
            features['coverage_gap'] = 90 - features['coverage_rate']
            features['above_target'] = (features['coverage_rate'] >= 90).astype(int)
        
        # Disease-specific features
        if 'cases' in df.columns:
            if 'population' in df.columns:
                features['cases_per_1000'] = df['cases'] / df['population'] * 1000
            
            if 'deaths' in df.columns:
                features['mortality_rate'] = (
                    df['deaths'] / (df['cases'] + 1) * 100
                )
            
            if 'recovered' in df.columns:
                features['recovery_rate'] = (
                    df['recovered'] / (df['cases'] + 1) * 100
                )
            
            if 'tests' in df.columns and df['tests'].sum() > 0:
                features['test_positivity_rate'] = (
                    df['cases'] / df['tests'] * 100
                )
        
        # Maternal health features
        if 'anc_visits' in df.columns:
            features['anc_completion'] = (df['anc_visits'] >= 4).astype(int)
        
        if 'deliveries' in df.columns and 'live_births' in df.columns:
            features['facility_delivery_rate'] = (
                df['deliveries'] / df['live_births'] * 100
            )
        
        # Drug inventory features
        if 'current_stock' in df.columns and 'monthly_consumption' in df.columns:
            features['months_of_stock'] = (
                df['current_stock'] / df['monthly_consumption']
            )
            features['stock_status'] = pd.cut(
                features['months_of_stock'],
                bins=[-float('inf'), 1, 2, 3, float('inf')],
                labels=['critical', 'low', 'adequate', 'surplus']
            )
        
        return features
    
    def _encode_categorical(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode categorical variables"""
        df_encoded = df.copy()
        
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        
        for col in categorical_cols:
            if col not in ['date', 'date_reported']:
                # One-hot encoding for low cardinality
                if df[col].nunique() <= 10:
                    dummies = pd.get_dummies(df[col], prefix=col, drop_first=True)
                    df_encoded = pd.concat([df_encoded, dummies], axis=1)
                    df_encoded = df_encoded.drop(columns=[col])
                else:
                    # Label encoding for high cardinality
                    from sklearn.preprocessing import LabelEncoder
                    encoder = LabelEncoder()
                    df_encoded[col] = encoder.fit_transform(df[col].astype(str))
        
        return df_encoded
    
    def _create_interactions(self, df: pd.DataFrame) -> Optional[pd.DataFrame]:
        """Create interaction features"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) < 2:
            return None
        
        features = pd.DataFrame(index=df.index)
        
        # Select top features for interactions (to avoid explosion)
        important_cols = numeric_cols[:5]  # Limit to first 5 numeric columns
        
        for i, col1 in enumerate(important_cols):
            for col2 in important_cols[i+1:]:
                # Multiplication interaction
                features[f'{col1}_{col2}_mult'] = df[col1] * df[col2]
                
                # Division interaction (avoid division by zero)
                features[f'{col1}_{col2}_div'] = df[col1] / (df[col2] + 1)
                
                # Difference interaction
                features[f'{col1}_{col2}_diff'] = df[col1] - df[col2]
        
        return features
    
    def reduce_dimensions(
        self,
        data: pd.DataFrame,
        n_components: int = 10,
        method: str = 'pca'
    ) -> pd.DataFrame:
        """Reduce dimensionality of features"""
        numeric_data = data.select_dtypes(include=[np.number])
        
        if method == 'pca':
            pca = PCA(n_components=min(n_components, len(numeric_data.columns)))
            reduced = pca.fit_transform(numeric_data)
            
            columns = [f'pca_{i+1}' for i in range(reduced.shape[1])]
            result = pd.DataFrame(reduced, columns=columns, index=data.index)
            
            self.pca_transformers['default'] = pca
            
            return result
        
        return data