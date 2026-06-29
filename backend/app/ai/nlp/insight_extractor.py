"""
Insight Extractor - AI-powered insight generation from health data analysis
"""
import openai
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

class InsightExtractor:
    """Extract meaningful insights and recommendations from health data analyses"""
    
    def __init__(self, model: str = "gpt-4", temperature: float = 0.3):
        self.model = model
        self.temperature = temperature
        self.client = openai.OpenAI()
        
        # Predefined insight categories
        self.insight_categories = [
            'coverage_gaps',
            'disease_hotspots',
            'high_risk_areas',
            'performance_issues',
            'resource_gaps',
            'trend_reversals',
            'anomalies_detected'
        ]
    
    async def extract_insights(
        self,
        raw_data: pd.DataFrame,
        analysis_results: Dict,
        context: Dict = None
    ) -> Dict:
        """
        Extract comprehensive insights from raw data and analysis results
        
        Args:
            raw_data: Original DataFrame before analysis
            analysis_results: Dictionary containing results from various analyses
            context: Additional context (e.g., location, time period)
            
        Returns:
            Dictionary with categorized insights, key findings, and recommendations
        """
        try:
            insights = {
                'timestamp': datetime.utcnow().isoformat(),
                'summary': None,
                'categorized_insights': {},
                'key_findings': [],
                'priority_actions': [],
                'confidence': 0.0
            }
            
            # Extract structured data summaries
            data_summary = self._summarize_analysis(analysis_results)
            
            # Generate AI-powered summary
            ai_summary = await self._generate_ai_summary(data_summary, context)
            insights['summary'] = ai_summary.get('summary', '')
            insights['confidence'] = ai_summary.get('confidence', 0.8)
            
            # Categorize insights
            insights['categorized_insights'] = self._categorize_insights(
                data_summary, analysis_results
            )
            
            # Extract key findings (most critical)
            insights['key_findings'] = self._extract_key_findings(
                insights['categorized_insights']
            )
            
            # Generate priority actions
            insights['priority_actions'] = await self._generate_priority_actions(
                insights['key_findings'], context
            )
            
            return insights
            
        except Exception as e:
            logger.error(f"Error extracting insights: {e}")
            return self._get_fallback_insights()
    
    async def _generate_ai_summary(
        self,
        data_summary: Dict,
        context: Dict = None
    ) -> Dict:
        """Generate an executive summary using OpenAI"""
        try:
            context_str = json.dumps(context, default=str) if context else "No additional context"
            
            prompt = f"""
            You are a public health intelligence analyst. Based on the following data analysis summary, 
            provide a concise executive summary (3-5 paragraphs) highlighting:
            - Most critical findings
            - Significant trends or changes
            - Areas requiring immediate attention
            - Positive developments
            
            Data Summary:
            {json.dumps(data_summary, indent=2, default=str)}
            
            Additional Context:
            {context_str}
            
            Format your response as a JSON object with keys:
            - "summary": string (the executive summary)
            - "confidence": float (0-1, your confidence in the insights)
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a public health data analyst."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=800,
                temperature=self.temperature
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error(f"AI summary generation error: {e}")
            return {
                'summary': self._generate_fallback_summary(data_summary),
                'confidence': 0.6
            }
    
    def _summarize_analysis(self, analysis_results: Dict) -> Dict:
        """Create a structured summary of analysis results"""
        summary = {
            'data_points': 0,
            'coverage': {},
            'disease': {},
            'risk': {},
            'trends': {},
            'anomalies': {}
        }
        
        # Extract coverage info
        if 'coverage' in analysis_results:
            cov = analysis_results['coverage']
            summary['coverage'] = {
                'overall': cov.get('overall_coverage'),
                'status': cov.get('status'),
                'gaps_count': len(cov.get('gaps', [])),
                'high_priority_locations': [
                    loc for loc, data in cov.get('by_location', {}).items()
                    if data.get('coverage', 100) < 80
                ][:5]
            }
        
        # Extract disease info
        if 'disease' in analysis_results:
            dis = analysis_results['disease']
            summary['disease'] = {
                'outbreak_risk': dis.get('outbreak_risk', {}).get('overall_risk', 0),
                'hotspots': dis.get('hotspots', [])[:5],
                'trending_diseases': [
                    d for d, data in dis.get('disease_distribution', {}).items()
                    if data.get('trend') == 'increasing'
                ][:3]
            }
        
        # Extract risk info
        if 'risk' in analysis_results:
            risk = analysis_results['risk']
            summary['risk'] = {
                'overall_level': risk.get('overall_risk_level'),
                'high_risk_count': len(risk.get('high_risk_areas', [])),
                'critical_issues': risk.get('risk_factors', [])[:5]
            }
        
        # Extract trends
        if 'trends' in analysis_results:
            trends = analysis_results['trends']
            summary['trends'] = {
                'significant_trends': [
                    t for t in trends.get('detected_trends', [])
                    if t.get('significance', '') == 'high'
                ][:5]
            }
        
        # Extract anomalies
        if 'anomalies' in analysis_results:
            anom = analysis_results['anomalies']
            summary['anomalies'] = {
                'total_anomalies': len(anom.get('anomalies', [])),
                'critical_anomalies': [
                    a for a in anom.get('anomalies', [])
                    if a.get('severity') == 'critical'
                ][:5]
            }
        
        return summary
    
    def _categorize_insights(
        self,
        data_summary: Dict,
        analysis_results: Dict
    ) -> Dict:
        """Organize insights into categories"""
        categorized = {
            'coverage_gaps': [],
            'disease_hotspots': [],
            'high_risk_areas': [],
            'performance_issues': [],
            'resource_gaps': [],
            'trend_reversals': [],
            'anomalies_detected': []
        }
        
        # Coverage gaps
        cov = data_summary.get('coverage', {})
        if cov.get('gaps_count', 0) > 0:
            categorized['coverage_gaps'].append({
                'description': f"Coverage gaps detected in {cov['gaps_count']} areas",
                'priority_locations': cov.get('high_priority_locations', []),
                'severity': 'high' if cov.get('overall', 100) < 70 else 'medium'
            })
        
        # Disease hotspots
        dis = data_summary.get('disease', {})
        if dis.get('hotspots'):
            categorized['disease_hotspots'].append({
                'description': f"{len(dis['hotspots'])} disease hotspots identified",
                'locations': [h.get('location') for h in dis['hotspots']],
                'risk': dis.get('outbreak_risk', 0)
            })
        
        # High risk areas
        risk = data_summary.get('risk', {})
        if risk.get('high_risk_count', 0) > 0:
            categorized['high_risk_areas'].append({
                'description': f"{risk['high_risk_count']} high-risk areas identified",
                'severity': risk.get('overall_level', 'medium')
            })
        
        # Trend reversals
        trends = data_summary.get('trends', {})
        if trends.get('significant_trends'):
            categorized['trend_reversals'].append({
                'description': "Significant trend changes detected",
                'details': trends['significant_trends']
            })
        
        # Anomalies
        anom = data_summary.get('anomalies', {})
        if anom.get('critical_anomalies'):
            categorized['anomalies_detected'].append({
                'description': f"{len(anom['critical_anomalies'])} critical anomalies found",
                'anomalies': anom['critical_anomalies']
            })
        
        return categorized
    
    def _extract_key_findings(self, categorized_insights: Dict) -> List[Dict]:
        """Extract the most critical findings across categories"""
        findings = []
        
        # Coverage is usually the most critical
        if categorized_insights.get('coverage_gaps'):
            for gap in categorized_insights['coverage_gaps']:
                findings.append({
                    'category': 'coverage',
                    'priority': gap.get('severity', 'high'),
                    'finding': gap['description'],
                    'affected_locations': gap.get('priority_locations', []),
                    'action': 'Investigate causes and implement catch-up campaigns'
                })
        
        # Disease hotspots
        if categorized_insights.get('disease_hotspots'):
            for hotspot in categorized_insights['disease_hotspots']:
                findings.append({
                    'category': 'disease',
                    'priority': 'critical' if hotspot.get('risk', 0) > 0.7 else 'high',
                    'finding': hotspot['description'],
                    'locations': hotspot.get('locations', []),
                    'action': 'Activate enhanced surveillance and response'
                })
        
        # Anomalies
        if categorized_insights.get('anomalies_detected'):
            for anom in categorized_insights['anomalies_detected']:
                findings.append({
                    'category': 'anomaly',
                    'priority': 'critical',
                    'finding': anom['description'],
                    'details': anom.get('anomalies', []),
                    'action': 'Immediate investigation required'
                })
        
        # Sort by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        findings.sort(key=lambda x: priority_order.get(x.get('priority', 'medium'), 3))
        
        return findings[:7]  # Return top 7 most critical findings
    
    async def _generate_priority_actions(
        self,
        key_findings: List[Dict],
        context: Dict = None
    ) -> List[Dict]:
        """Generate priority actions based on key findings"""
        try:
            if not key_findings:
                return []
            
            prompt = f"""
            Based on these key findings from a public health analysis:
            {json.dumps(key_findings, indent=2)}
            
            Generate a list of 3-5 specific, actionable priority actions. For each action provide:
            - "priority": critical/high/medium
            - "action": clear description of the action
            - "timeline": when it should be done (immediate/within 24 hours/within 1 week/within 1 month)
            - "expected_impact": what outcome is expected
            - "responsible": suggested responsible party (e.g., LGA health officer, State epidemiologist)
            
            Return as JSON array of objects.
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a public health emergency coordinator."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=500,
                temperature=self.temperature
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get('actions', result) if isinstance(result, dict) else result
            
        except Exception as e:
            logger.error(f"Priority actions generation error: {e}")
            return self._generate_fallback_actions(key_findings)
    
    def _generate_fallback_summary(self, data_summary: Dict) -> str:
        """Generate a basic summary without AI"""
        parts = []
        
        cov = data_summary.get('coverage', {})
        if cov.get('overall'):
            parts.append(f"Vaccination coverage is at {cov['overall']:.1f}%.")
        if cov.get('gaps_count', 0) > 0:
            parts.append(f"Coverage gaps exist in {cov['gaps_count']} areas requiring attention.")
        
        dis = data_summary.get('disease', {})
        if dis.get('outbreak_risk', 0) > 0.5:
            parts.append(f"Elevated disease outbreak risk ({dis['outbreak_risk']:.0%}).")
        
        risk = data_summary.get('risk', {})
        if risk.get('overall_level') in ['high', 'critical']:
            parts.append(f"Overall risk level is {risk['overall_level']}.")
        
        return ' '.join(parts) if parts else "Analysis completed. Review detailed reports for insights."
    
    def _generate_fallback_actions(self, findings: List[Dict]) -> List[Dict]:
        """Generate basic actions without AI"""
        actions = []
        
        for finding in findings[:3]:
            if finding['category'] == 'coverage':
                actions.append({
                    'priority': 'high',
                    'action': f"Deploy mobile vaccination teams to {', '.join(finding.get('affected_locations', ['affected areas']))}",
                    'timeline': 'Within 1 week',
                    'expected_impact': 'Improve coverage by 10-15%'
                })
            elif finding['category'] == 'disease':
                actions.append({
                    'priority': 'critical',
                    'action': 'Activate outbreak response protocol',
                    'timeline': 'Immediate',
                    'expected_impact': 'Contain spread within 48 hours'
                })
            elif finding['category'] == 'anomaly':
                actions.append({
                    'priority': 'critical',
                    'action': 'Launch immediate investigation into detected anomalies',
                    'timeline': 'Within 24 hours',
                    'expected_impact': 'Identify and resolve data quality or health threats'
                })
        
        return actions
    
    def _get_fallback_insights(self) -> Dict:
        """Return fallback insights when extraction fails"""
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'summary': 'Unable to generate automated insights. Please review raw analysis.',
            'categorized_insights': {},
            'key_findings': [],
            'priority_actions': [],
            'confidence': 0.0
        }