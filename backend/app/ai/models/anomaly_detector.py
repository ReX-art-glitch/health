"""
Anomaly Detector - Detects anomalies, outliers, and unusual patterns in public health data
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler
from scipy import stats
import logging
import warnings

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)

class AnomalyDetector:
    """
    AI model for detecting anomalies in health data.
    Supports multiple detection methods:
    - Statistical (Z-score, IQR, modified Z-score)
    - Machine Learning (Isolation Forest, LOF)
    - Domain-specific (health indicator thresholds)
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_forest = None
        self.lof = None
        self.contamination = 0.1  # expected proportion of outliers
        self.methods = ['zscore', 'iqr', 'isolation_forest', 'lof']

    async def detect(self, data: pd.DataFrame, columns: List[str] = None, method: str = 'auto') -> Dict:
        """
        Main anomaly detection entry point.
        
        Args:
            data: DataFrame containing health data
            columns: specific columns to check; if None, all numeric columns are used
            method: detection method(s) to use ('auto', 'zscore', 'iqr', 'isolation_forest', 'lof', 'all')
            
        Returns:
            Dictionary with detected anomalies, scores, and summary
        """
        try:
            if data.empty:
                return {'error': 'Empty dataset', 'anomalies': []}

            # Select numeric columns
            if columns is None:
                numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
            else:
                numeric_cols = [c for c in columns if c in data.columns and pd.api.types.is_numeric_dtype(data[c])]

            if not numeric_cols:
                return {'error': 'No numeric columns found', 'anomalies': []}

            results = {
                'timestamp': datetime.utcnow().isoformat(),
                'method': method,
                'total_records': len(data),
                'anomalies': [],
                'anomaly_indices': [],
                'anomaly_scores': {},
                'summary': {}
            }

            if method == 'auto':
                # Use all methods and combine results
                methods_to_run = self.methods
            elif method == 'all':
                methods_to_run = self.methods
            elif method in self.methods:
                methods_to_run = [method]
            else:
                return {'error': f'Unknown method: {method}', 'anomalies': []}

            all_anomalies = []
            anomaly_scores = {}

            for col in numeric_cols:
                series = data[col].dropna()
                if len(series) < 5:
                    continue

                col_anomalies = []
                for m in methods_to_run:
                    if m == 'zscore':
                        res = self._zscore_anomalies(series, col)
                    elif m == 'iqr':
                        res = self._iqr_anomalies(series, col)
                    elif m == 'isolation_forest':
                        res = self._isolation_forest_anomalies(data[numeric_cols].fillna(data[numeric_cols].median()), col)
                    elif m == 'lof':
                        res = self._lof_anomalies(data[numeric_cols].fillna(data[numeric_cols].median()), col)
                    else:
                        continue
                    if res:
                        col_anomalies.extend(res)

                # Deduplicate anomalies for the column
                unique_anomalies = self._deduplicate_anomalies(col_anomalies)
                all_anomalies.extend(unique_anomalies)

                # Store scores if needed
                if col not in anomaly_scores:
                    anomaly_scores[col] = [a.get('score', 0) for a in unique_anomalies]

            # Sort by severity/score
            all_anomalies.sort(key=lambda x: x.get('severity_score', 0), reverse=True)
            results['anomalies'] = all_anomalies
            results['anomaly_indices'] = list(set(a['index'] for a in all_anomalies if 'index' in a))
            results['anomaly_scores'] = anomaly_scores

            # Generate summary
            results['summary'] = self._summarize_anomalies(results)

            return results

        except Exception as e:
            logger.error(f"Anomaly detection error: {e}", exc_info=True)
            return {'error': str(e), 'anomalies': []}

    def _zscore_anomalies(self, series: pd.Series, column: str, threshold: float = 3.0) -> List[Dict]:
        """Detect anomalies using Z-score method"""
        try:
            z_scores = np.abs(stats.zscore(series))
            anomalies = []
            for i, (idx, z) in enumerate(zip(series.index, z_scores)):
                if z > threshold:
                    anomalies.append({
                        'index': int(idx) if isinstance(idx, (int, np.integer)) else i,
                        'column': column,
                        'value': float(series.loc[idx]),
                        'method': 'zscore',
                        'score': float(z),
                        'severity': 'high' if z > 4 else 'medium',
                        'severity_score': float(z) / 6.0,  # normalize roughly to 0-1
                        'description': f'Value {series.loc[idx]:.2f} is {z:.1f} standard deviations from mean'
                    })
            return anomalies
        except Exception as e:
            logger.error(f"Z-score anomaly error: {e}")
            return []

    def _iqr_anomalies(self, series: pd.Series, column: str, multiplier: float = 1.5) -> List[Dict]:
        """Detect anomalies using IQR method"""
        try:
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - multiplier * IQR
            upper_bound = Q3 + multiplier * IQR
            anomalies = []
            for idx in series.index:
                val = series.loc[idx]
                if val < lower_bound or val > upper_bound:
                    # Calculate normalized distance
                    if val < lower_bound:
                        distance = (lower_bound - val) / IQR if IQR > 0 else 0
                    else:
                        distance = (val - upper_bound) / IQR if IQR > 0 else 0
                    anomalies.append({
                        'index': int(idx) if isinstance(idx, (int, np.integer)) else list(series.index).index(idx),
                        'column': column,
                        'value': float(val),
                        'method': 'iqr',
                        'score': float(distance),
                        'severity': 'high' if distance > 3 else 'medium' if distance > 2 else 'low',
                        'severity_score': min(1.0, float(distance) / 5.0),
                        'description': f'Value {val:.2f} outside IQR bounds [{lower_bound:.2f}, {upper_bound:.2f}]'
                    })
            return anomalies
        except Exception as e:
            logger.error(f"IQR anomaly error: {e}")
            return []

    def _isolation_forest_anomalies(self, data: pd.DataFrame, column: str) -> List[Dict]:
        """Detect anomalies using Isolation Forest"""
        try:
            if len(data) < 10:
                return []
            # Fit Isolation Forest on all numeric columns
            X = self.scaler.fit_transform(data)
            self.isolation_forest = IsolationForest(contamination=self.contamination, random_state=42)
            predictions = self.isolation_forest.fit_predict(X)
            scores = self.isolation_forest.score_samples(X)
            
            # Only return anomalies for the specific column
            anomalies = []
            for i, (pred, score) in enumerate(zip(predictions, scores)):
                if pred == -1:  # anomaly
                    anomalies.append({
                        'index': int(data.index[i]) if isinstance(data.index[i], (int, np.integer)) else i,
                        'column': column,
                        'value': float(data[column].iloc[i]),
                        'method': 'isolation_forest',
                        'score': float(-score),  # higher score = more anomalous
                        'severity': 'high' if -score > 0.5 else 'medium',
                        'severity_score': min(1.0, float(-score) / 0.7),
                        'description': 'Multivariate anomaly detected by Isolation Forest'
                    })
            return anomalies
        except Exception as e:
            logger.error(f"Isolation Forest error: {e}")
            return []

    def _lof_anomalies(self, data: pd.DataFrame, column: str, n_neighbors: int = 20) -> List[Dict]:
        """Detect anomalies using Local Outlier Factor"""
        try:
            if len(data) < n_neighbors + 1:
                return []
            X = self.scaler.fit_transform(data)
            self.lof = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=self.contamination)
            predictions = self.lof.fit_predict(X)
            scores = -self.lof.negative_outlier_factor_
            
            anomalies = []
            for i, (pred, score) in enumerate(zip(predictions, scores)):
                if pred == -1:
                    anomalies.append({
                        'index': int(data.index[i]) if isinstance(data.index[i], (int, np.integer)) else i,
                        'column': column,
                        'value': float(data[column].iloc[i]),
                        'method': 'lof',
                        'score': float(score),
                        'severity': 'high' if score > 2 else 'medium',
                        'severity_score': min(1.0, float(score) / 3.0),
                        'description': 'Local outlier detected by LOF'
                    })
            return anomalies
        except Exception as e:
            logger.error(f"LOF error: {e}")
            return []

    def _deduplicate_anomalies(self, anomalies: List[Dict]) -> List[Dict]:
        """Remove duplicate anomaly entries for the same index and column, keeping the most severe"""
        if not anomalies:
            return []
        unique = {}
        for a in anomalies:
            key = (a['index'], a['column'])
            if key not in unique or a.get('severity_score', 0) > unique[key].get('severity_score', 0):
                unique[key] = a
        return list(unique.values())

    def _summarize_anomalies(self, results: Dict) -> Dict:
        """Create a summary of detected anomalies"""
        anomalies = results.get('anomalies', [])
        if not anomalies:
            return {'message': 'No anomalies detected', 'count': 0}

        # Group by column
        by_column = {}
        for a in anomalies:
            col = a['column']
            if col not in by_column:
                by_column[col] = {'count': 0, 'high_severity': 0, 'values': []}
            by_column[col]['count'] += 1
            if a.get('severity') == 'high':
                by_column[col]['high_severity'] += 1
            by_column[col]['values'].append(a['value'])

        summary = {
            'total_anomalies': len(anomalies),
            'anomalous_records': len(set(a['index'] for a in anomalies if 'index' in a)),
            'by_column': by_column,
            'most_anomalous_column': max(by_column, key=lambda x: by_column[x]['count']) if by_column else None,
            'detection_methods': list(set(a['method'] for a in anomalies)),
            'alert': None
        }

        # Generate alert if critical
        if summary['total_anomalies'] > len(results.get('anomaly_indices', [])) * 0.3:
            summary['alert'] = f"High anomaly rate: {summary['total_anomalies']} anomalies detected across {summary['anomalous_records']} records"

        return summary