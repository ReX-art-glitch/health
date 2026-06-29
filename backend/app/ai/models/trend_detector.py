"""
Trend Detector - Detects statistical trends and patterns in public health time series data
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Union
from datetime import datetime, timedelta
from scipy import stats
from scipy.signal import find_peaks
import logging
import warnings

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)

class TrendDetector:
    """
    AI model for detecting and analyzing trends in public health data.
    Supports detection of linear trends, seasonal patterns, change points,
    and acceleration/deceleration in time series.
    """

    def __init__(self):
        self.min_data_points = 7  # minimum points required for trend analysis
        self.significance_level = 0.05
        self.trend_strength_thresholds = {
            'strong': 0.7,
            'moderate': 0.4,
            'weak': 0.2
        }

    async def detect(self, data: pd.DataFrame, target_column: str = None) -> Dict:
        """
        Main entry point for trend detection.
        
        Args:
            data: DataFrame with time series data
            target_column: specific column to analyze; if None, all numeric columns are analyzed
            
        Returns:
            Dictionary containing comprehensive trend analysis
        """
        try:
            if data.empty:
                return {'error': 'Empty dataset', 'trends': []}

            results = {
                'timestamp': datetime.utcnow().isoformat(),
                'trends': [],
                'summary': {},
                'seasonality_detected': False,
                'change_points': [],
                'forecast_suggestion': None
            }

            # Identify date column
            date_col = self._identify_date_column(data)
            if date_col is None:
                # Without date, still can analyze numeric sequence
                numeric_cols = data.select_dtypes(include=[np.number]).columns
                for col in numeric_cols:
                    trend = self._analyze_sequence_trend(data[col].dropna(), col)
                    if trend:
                        results['trends'].append(trend)
            else:
                data = data.sort_values(date_col)
                numeric_cols = data.select_dtypes(include=[np.number]).columns
                # If target column specified, analyze only that, else all numeric
                cols_to_analyze = [target_column] if target_column and target_column in numeric_cols else numeric_cols

                for col in cols_to_analyze:
                    if col == date_col:
                        continue
                    series = data[col].dropna()
                    if len(series) < self.min_data_points:
                        continue

                    trend = self._analyze_temporal_trend(data, date_col, col)
                    if trend:
                        results['trends'].append(trend)

            # Summarize across all trends
            results['summary'] = self._summarize_trends(results['trends'])
            
            # Detect seasonality and change points
            if date_col and target_column:
                series = data.set_index(date_col)[target_column].dropna()
                if len(series) >= 14:
                    results['seasonality_detected'] = self._detect_seasonality(series)
                    results['change_points'] = self._detect_change_points(series)

            return results

        except Exception as e:
            logger.error(f"Trend detection error: {e}", exc_info=True)
            return {'error': str(e), 'trends': []}

    def _identify_date_column(self, data: pd.DataFrame) -> Optional[str]:
        """Find the date column in the DataFrame"""
        for col in data.columns:
            if pd.api.types.is_datetime64_any_dtype(data[col]):
                return col
            if 'date' in col.lower() or 'time' in col.lower():
                try:
                    pd.to_datetime(data[col])
                    return col
                except:
                    pass
        return None

    def _analyze_temporal_trend(self, data: pd.DataFrame, date_col: str, value_col: str) -> Dict:
        """Analyze trend in a temporal column"""
        try:
            series = data.set_index(date_col)[value_col].dropna()
            if len(series) < self.min_data_points:
                return None

            trend_info = {
                'column': value_col,
                'data_points': len(series),
                'direction': 'stable',
                'strength': 0.0,
                'p_value': 1.0,
                'slope': 0.0,
                'change_percent': 0.0,
                'recent_value': float(series.iloc[-1]),
                'earliest_value': float(series.iloc[0]),
                'moving_averages': self._calculate_moving_averages(series),
                'confidence_interval': None
            }

            # Mann-Kendall trend test (non-parametric)
            mk_result = self._mann_kendall(series.values)
            trend_info.update(mk_result)

            # Linear regression for slope and R²
            reg_result = self._linear_regression_trend(series)
            trend_info.update(reg_result)

            # Determine overall direction
            if trend_info['p_value'] < self.significance_level:
                if trend_info['slope'] > 0:
                    trend_info['direction'] = 'increasing'
                else:
                    trend_info['direction'] = 'decreasing'
            else:
                trend_info['direction'] = 'stable'

            # Strength classification
            trend_info['strength'] = self._calculate_trend_strength(series, trend_info)

            # Recent change (last 3 points vs first 3 points)
            if len(series) >= 6:
                recent_avg = series.iloc[-3:].mean()
                early_avg = series.iloc[:3].mean()
                if early_avg != 0:
                    trend_info['change_percent'] = float(((recent_avg - early_avg) / early_avg) * 100)

            return trend_info

        except Exception as e:
            logger.error(f"Temporal trend analysis error for {value_col}: {e}")
            return None

    def _analyze_sequence_trend(self, series: pd.Series, column_name: str) -> Optional[Dict]:
        """Analyze trend in a simple sequence without timestamps"""
        if len(series) < self.min_data_points:
            return None

        x = np.arange(len(series))
        y = series.values
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

        trend_info = {
            'column': column_name,
            'data_points': len(series),
            'direction': 'stable',
            'slope': float(slope),
            'p_value': float(p_value),
            'r_squared': float(r_value**2),
            'recent_value': float(series.iloc[-1]),
            'earliest_value': float(series.iloc[0])
        }

        if p_value < self.significance_level:
            trend_info['direction'] = 'increasing' if slope > 0 else 'decreasing'

        trend_info['strength'] = abs(r_value)

        return trend_info

    def _mann_kendall(self, values: np.ndarray) -> Dict:
        """Perform Mann-Kendall trend test"""
        try:
            from pymannkendall import original_test
            result = original_test(values)
            return {
                'mk_trend': result.trend,
                'mk_p_value': result.p,
                'mk_slope': result.slope if hasattr(result, 'slope') else 0.0,
                'mk_statistic': result.s if hasattr(result, 's') else 0
            }
        except ImportError:
            # Fallback: use scipy's kendalltau
            n = len(values)
            if n < 2:
                return {'mk_trend': 'no trend', 'mk_p_value': 1.0}
            
            tau, p_value = stats.kendalltau(np.arange(n), values)
            trend = 'increasing' if tau > 0.1 else 'decreasing' if tau < -0.1 else 'no trend'
            return {
                'mk_trend': trend,
                'mk_p_value': p_value if p_value is not None else 1.0,
                'mk_slope': tau * np.std(values) / np.std(np.arange(n)) if n > 1 else 0.0,
                'mk_statistic': tau
            }

    def _linear_regression_trend(self, series: pd.Series) -> Dict:
        """Perform linear regression on time series"""
        x = np.arange(len(series))
        y = series.values
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        # Confidence interval (95%)
        from scipy.stats import t
        n = len(x)
        dof = n - 2
        t_crit = t.ppf(0.975, dof)
        conf_interval = t_crit * std_err
        
        return {
            'slope': float(slope),
            'intercept': float(intercept),
            'r_squared': float(r_value**2),
            'p_value': float(p_value),
            'std_err': float(std_err),
            'confidence_interval_95': [float(slope - conf_interval), float(slope + conf_interval)]
        }

    def _calculate_trend_strength(self, series: pd.Series, trend_info: Dict) -> float:
        """Calculate normalized trend strength (0-1)"""
        r_squared = trend_info.get('r_squared', 0)
        p_value = trend_info.get('p_value', 1.0)
        
        # Combine R² and significance
        significance_weight = max(0, 1 - p_value/self.significance_level)
        strength = r_squared * 0.6 + significance_weight * 0.4
        
        return min(1.0, max(0.0, strength))

    def _calculate_moving_averages(self, series: pd.Series) -> Dict:
        """Calculate moving averages for smoothing"""
        mas = {}
        for window in [3, 7, 14, 30]:
            if len(series) >= window:
                mas[f'{window}day'] = series.rolling(window=window, min_periods=1).mean().tolist()
        return mas

    def _detect_seasonality(self, series: pd.Series) -> bool:
        """Detect if seasonality exists in the series using autocorrelation"""
        if len(series) < 14:
            return False
        try:
            from statsmodels.tsa.stattools import acf
            acf_values = acf(series.dropna(), nlags=min(len(series)//2, 30))
            # Check if any lag (except lag 0) has absolute autocorrelation > 0.3
            for lag in range(1, len(acf_values)):
                if abs(acf_values[lag]) > 0.3:
                    return True
            return False
        except ImportError:
            # Fallback: check variance of month-of-year means
            if hasattr(series.index, 'month'):
                monthly_means = series.groupby(series.index.month).mean()
                if monthly_means.std() > monthly_means.mean() * 0.2:
                    return True
            return False

    def _detect_change_points(self, series: pd.Series) -> List[Dict]:
        """Detect change points in time series using PELT or simple gradient method"""
        change_points = []
        try:
            from ruptures import Pelt
            # Use PELT algorithm
            model = Pelt(model="rbf").fit(series.values)
            result = model.predict(pen=3)
            for cp in result[:-1]:  # last point is end of series
                if cp < len(series):
                    change_points.append({
                        'index': int(cp),
                        'date': str(series.index[cp]) if hasattr(series.index, '__getitem__') else None,
                        'value_before': float(series.iloc[cp-1]) if cp > 0 else None,
                        'value_after': float(series.iloc[cp]) if cp < len(series) else None,
                    })
        except ImportError:
            # Fallback: use simple difference threshold
            values = series.values
            if len(values) > 5:
                diffs = np.abs(np.diff(values))
                threshold = np.mean(diffs) + 2 * np.std(diffs)
                for i in range(1, len(diffs)):
                    if diffs[i] > threshold:
                        change_points.append({
                            'index': i + 1,
                            'date': str(series.index[i+1]) if hasattr(series.index, '__getitem__') else None,
                            'magnitude': float(diffs[i])
                        })
        return change_points

    def _summarize_trends(self, trends: List[Dict]) -> Dict:
        """Create summary of all detected trends"""
        if not trends:
            return {'message': 'No significant trends detected'}

        increasing = [t for t in trends if t.get('direction') == 'increasing']
        decreasing = [t for t in trends if t.get('direction') == 'decreasing']
        stable = [t for t in trends if t.get('direction') == 'stable']

        # Identify most significant trend
        strongest = max(trends, key=lambda t: t.get('strength', 0)) if trends else None

        summary = {
            'total_analyzed': len(trends),
            'increasing_count': len(increasing),
            'decreasing_count': len(decreasing),
            'stable_count': len(stable),
            'dominant_direction': 'increasing' if len(increasing) > len(decreasing) else 'decreasing' if len(decreasing) > len(increasing) else 'stable',
            'most_significant_trend': strongest['column'] if strongest else None,
            'strongest_magnitude': float(strongest['strength']) if strongest else 0,
            'alert': None
        }

        # Generate alert for critical decreasing trends
        critical_decreases = [t for t in decreasing if t.get('strength', 0) > 0.6]
        if critical_decreases:
            summary['alert'] = f"Strong decreasing trend in {', '.join([t['column'] for t in critical_decreases])}"

        return summary