"""
AI Copilot - Natural Language Interface for Public Health Data
"""
import openai
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
import logging
import asyncio
from collections import defaultdict
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

class AICopilot:
    """AI-powered copilot for public health decision support"""
    
    def __init__(self):
        self.conversation_history = defaultdict(list)
        self.max_history = 10
        self.daily_usage = 0
        self.last_reset = datetime.now()
        
        # System prompts for different contexts
        self.system_prompts = {
            'general': """You are an expert AI Public Health Copilot. You help public health officials by:
            - Analyzing health data and trends
            - Identifying areas needing intervention
            - Explaining coverage drops and disease patterns
            - Suggesting resource allocation
            - Generating report summaries
            - Answering queries about health indicators
            
            Be concise, data-driven, and actionable. Use professional public health terminology.
            When providing recommendations, prioritize by urgency and impact.
            Always cite data when available.""" ,
            
            'technical': """You are a technical public health analyst. Provide detailed statistical analysis,
            epidemiological interpretations, and evidence-based recommendations. Include confidence intervals
            and statistical significance when relevant.""" ,
            
            'executive': """You are briefing public health executives. Provide high-level summaries with key
            metrics, strategic recommendations, and actionable insights. Focus on decision-critical information.
            Use clear, non-technical language and emphasize business/health impact.""" ,
            
            'field_worker': """You are assisting community health workers. Provide practical, actionable guidance
            for field operations. Focus on protocols, best practices, and immediate actions. Use simple language
            and step-by-step instructions when appropriate."""
        }
        
        # Common query patterns and handlers
        self.query_patterns = {
            'coverage': ['coverage', 'vaccination', 'immunization', 'drop', 'decline'],
            'disease': ['disease', 'outbreak', 'cases', 'infection', 'epidemic'],
            'inventory': ['stock', 'inventory', 'drug', 'supply', 'shortage'],
            'facility': ['facility', 'hospital', 'clinic', 'center', 'phc'],
            'maternal': ['maternal', 'pregnancy', 'anc', 'delivery', 'postnatal'],
            'report': ['report', 'generate', 'summary', 'brief', 'analysis'],
            'alert': ['alert', 'warning', 'emergency', 'critical', 'urgent'],
            'performance': ['performance', 'metric', 'kpi', 'target', 'indicator']
        }
    
    async def get_response(
        self,
        query: str,
        context: Optional[Dict] = None,
        user_role: str = 'general',
        session_id: str = None
    ) -> Dict:
        """
        Get AI copilot response
        
        Args:
            query: User's question or request
            context: Additional context data
            user_role: Role of the user (general, technical, executive, field_worker)
            session_id: Session identifier for conversation history
            
        Returns:
            Dictionary with response and metadata
        """
        try:
            # Reset daily counter if needed
            self._check_daily_reset()
            
            # Classify query intent
            intent = self._classify_intent(query)
            
            # Get relevant context
            enriched_context = await self._enrich_context(query, context, intent)
            
            # Get conversation history
            history = self._get_history(session_id)
            
            # Generate response
            response_text = await self._generate_response(
                query,
                enriched_context,
                user_role,
                history
            )
            
            # Extract structured data if present
            structured_data = self._extract_structured_data(response_text)
            
            # Generate follow-up suggestions
            suggestions = self._generate_suggestions(query, intent)
            
            # Update history
            if session_id:
                self._update_history(session_id, query, response_text)
            
            # Increment usage counter
            self.daily_usage += 1
            
            return {
                'response': response_text,
                'intent': intent,
                'confidence': self._calculate_confidence(response_text),
                'structured_data': structured_data,
                'suggestions': suggestions,
                'timestamp': datetime.utcnow().isoformat(),
                'session_id': session_id
            }
            
        except Exception as e:
            logger.error(f"Error generating copilot response: {e}")
            return {
                'response': "I apologize, but I'm having difficulty processing your request. Please try rephrasing or contact technical support if the issue persists.",
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _classify_intent(self, query: str) -> str:
        """Classify the intent of the user's query"""
        query_lower = query.lower()
        
        # Check each pattern
        scores = {}
        for intent, keywords in self.query_patterns.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            if score > 0:
                scores[intent] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        return 'general'
    
    async def _enrich_context(
        self,
        query: str,
        context: Optional[Dict],
        intent: str
    ) -> Dict:
        """Enrich context with relevant data"""
        enriched = {
            'original_context': context or {},
            'intent': intent,
            'query_timestamp': datetime.utcnow().isoformat(),
            'relevant_data': {}
        }
        
        # Add intent-specific context
        if intent == 'coverage' and context:
            enriched['relevant_data']['coverage_stats'] = await self._get_coverage_stats(context)
        elif intent == 'disease' and context:
            enriched['relevant_data']['disease_stats'] = await self._get_disease_stats(context)
        elif intent == 'inventory' and context:
            enriched['relevant_data']['inventory_stats'] = await self._get_inventory_stats(context)
        elif intent == 'facility' and context:
            enriched['relevant_data']['facility_stats'] = await self._get_facility_stats(context)
        
        return enriched
    
    async def _generate_response(
        self,
        query: str,
        context: Dict,
        user_role: str,
        history: List[Dict]
    ) -> str:
        """Generate AI response using OpenAI"""
        try:
            # Select appropriate system prompt
            system_prompt = self.system_prompts.get(
                user_role,
                self.system_prompts['general']
            )
            
            # Prepare messages
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add conversation history
            for entry in history[-self.max_history:]:
                messages.append({"role": "user", "content": entry['query']})
                messages.append({"role": "assistant", "content": entry['response']})
            
            # Add current query with context
            context_str = json.dumps(context.get('relevant_data', {}), indent=2)
            user_message = f"""Context Data:
            {context_str}
            
            User Query: {query}
            
            Provide a helpful, data-driven response. If you identify critical issues, highlight them clearly.
            Include specific numbers and percentages when available from the context data.
            """
            
            messages.append({"role": "user", "content": user_message})
            
            # Call OpenAI API
            client = openai.OpenAI()
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=1000,
                temperature=0.3,
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            
            # Fallback responses based on intent
            return self._get_fallback_response(context.get('intent', 'general'), query)
    
    def _extract_structured_data(self, response: str) -> Dict:
        """Extract structured data from AI response"""
        structured = {}
        
        # Extract percentages
        import re
        percentages = re.findall(r'(\d+(?:\.\d+)?)\s*%', response)
        if percentages:
            structured['percentages'] = [float(p) for p in percentages]
        
        # Extract numbers (potential statistics)
        numbers = re.findall(r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:cases|deaths|children|facilities|doses)', response)
        if numbers:
            structured['statistics'] = [n.replace(',', '') for n in numbers]
        
        # Extract locations
        locations = re.findall(r'(?:in|at|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', response)
        if locations:
            structured['locations'] = locations
        
        # Extract actions
        action_keywords = ['recommend', 'suggest', 'should', 'must', 'need to', 'implement']
        actions = []
        for line in response.split('\n'):
            if any(keyword in line.lower() for keyword in action_keywords):
                actions.append(line.strip())
        if actions:
            structured['recommended_actions'] = actions
        
        return structured
    
    def _generate_suggestions(self, query: str, intent: str) -> List[str]:
        """Generate follow-up question suggestions"""
        suggestions_map = {
            'coverage': [
                "Show coverage trend for the last 6 months",
                "Which areas have the lowest coverage?",
                "What factors contributed to the coverage drop?",
                "Generate a coverage improvement plan"
            ],
            'disease': [
                "Show disease trend analysis",
                "What are the current hotspots?",
                "Predict outbreak risk for next month",
                "Compare with previous year data"
            ],
            'inventory': [
                "Show facilities with critical stock levels",
                "Forecast drug demand for next quarter",
                "What items need immediate procurement?",
                "Show stockout history"
            ],
            'facility': [
                "Compare facility performance",
                "Show facilities needing support",
                "What are the capacity gaps?",
                "Generate facility assessment report"
            ],
            'maternal': [
                "Show ANC coverage trends",
                "Identify high-risk pregnancies",
                "What are the maternal mortality factors?",
                "Generate maternal health report"
            ],
            'report': [
                "Generate executive summary",
                "Create weekly progress report",
                "Prepare donor update",
                "Export data for analysis"
            ],
            'alert': [
                "Show all active alerts",
                "What triggered this alert?",
                "Who needs to be notified?",
                "View alert response protocol"
            ],
            'performance': [
                "Show performance trends",
                "Compare with targets",
                "Identify underperforming areas",
                "Generate performance improvement plan"
            ]
        }
        
        return suggestions_map.get(intent, [
            "Show me the latest data",
            "What are the key issues?",
            "Generate a summary report",
            "What actions should be taken?"
        ])
    
    def _calculate_confidence(self, response: str) -> float:
        """Calculate confidence score for the response"""
        confidence = 0.7  # Base confidence
        
        # Increase confidence if response contains specific data
        if any(char.isdigit() for char in response):
            confidence += 0.1
        
        # Increase confidence if response is detailed
        if len(response) > 200:
            confidence += 0.1
        
        # Increase confidence if response contains actionable items
        action_keywords = ['recommend', 'should', 'implement', 'action', 'step']
        if any(keyword in response.lower() for keyword in action_keywords):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _get_fallback_response(self, intent: str, query: str) -> str:
        """Get fallback response when AI is unavailable"""
        fallbacks = {
            'coverage': "Based on the available data, I recommend reviewing the vaccination coverage reports for the last 3 months. Key areas to focus on include identifying low-coverage locations and planning targeted outreach programs.",
            'disease': "For disease surveillance, I recommend checking the latest disease reports and monitoring any unusual patterns. Ensure all cases are being reported through the standard channels.",
            'inventory': "I recommend reviewing the current stock levels and comparing them against minimum thresholds. Priority should be given to facilities with critical stock levels.",
            'facility': "Please review the facility performance dashboard for detailed metrics. Key indicators to monitor include patient visits, stock levels, and staff availability.",
            'general': "I understand your query about the public health system. While I'm processing your request, I recommend checking the main dashboard for the latest updates and metrics."
        }
        
        return fallbacks.get(intent, fallbacks['general'])
    
    def _get_history(self, session_id: str) -> List[Dict]:
        """Get conversation history for session"""
        if session_id and session_id in self.conversation_history:
            return self.conversation_history[session_id]
        return []
    
    def _update_history(self, session_id: str, query: str, response: str):
        """Update conversation history"""
        if session_id:
            self.conversation_history[session_id].append({
                'query': query,
                'response': response,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Keep only recent history
            if len(self.conversation_history[session_id]) > self.max_history:
                self.conversation_history[session_id] = \
                    self.conversation_history[session_id][-self.max_history:]
    
    async def _get_coverage_stats(self, context: Dict) -> Dict:
        """Extract coverage statistics from context"""
        stats = {
            'overall_coverage': context.get('vaccination_coverage', 'N/A'),
            'coverage_change': context.get('coverage_change', 0),
            'target': 90,
            'below_target_areas': context.get('low_coverage_areas', []),
            'trend': context.get('coverage_trend', 'stable')
        }
        
        # Calculate gap
        if isinstance(stats['overall_coverage'], (int, float)):
            stats['gap_to_target'] = stats['target'] - stats['overall_coverage']
            
            if stats['gap_to_target'] > 10:
                stats['severity'] = 'critical'
            elif stats['gap_to_target'] > 5:
                stats['severity'] = 'high'
            else:
                stats['severity'] = 'moderate'
        
        return stats
    
    async def _get_disease_stats(self, context: Dict) -> Dict:
        """Extract disease statistics from context"""
        return {
            'active_outbreaks': context.get('active_outbreaks', 0),
            'total_cases': context.get('total_cases', 0),
            'disease_distribution': context.get('disease_distribution', {}),
            'hotspots': context.get('hotspots', []),
            'trend_direction': context.get('disease_trend', 'stable')
        }
    
    async def _get_inventory_stats(self, context: Dict) -> Dict:
        """Extract inventory statistics from context"""
        return {
            'stockout_risk_facilities': context.get('stockout_risk', []),
            'average_stock_level': context.get('avg_stock', 0),
            'critical_items': context.get('critical_items', []),
            'expiring_soon': context.get('expiring_items', [])
        }
    
    async def _get_facility_stats(self, context: Dict) -> Dict:
        """Extract facility statistics from context"""
        return {
            'total_facilities': context.get('total_facilities', 0),
            'active_facilities': context.get('active_facilities', 0),
            'performance_ratings': context.get('performance', {}),
            'staffing_levels': context.get('staffing', {})
        }
    
    def _check_daily_reset(self):
        """Reset daily usage counter if needed"""
        now = datetime.now()
        if now.date() != self.last_reset.date():
            self.daily_usage = 0
            self.last_reset = now
    
    def get_daily_usage(self) -> int:
        """Get daily API usage count"""
        self._check_daily_reset()
        return self.daily_usage
    
    def clear_history(self, session_id: str = None):
        """Clear conversation history"""
        if session_id:
            self.conversation_history.pop(session_id, None)
        else:
            self.conversation_history.clear()