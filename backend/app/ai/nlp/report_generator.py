"""
NLP Report Generator - AI-powered report generation
"""
import openai
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import json
import logging
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from fpdf import FPDF
import io
import matplotlib.pyplot as plt
import seaborn as sns
from collections import defaultdict

logger = logging.getLogger(__name__)

class NLPReportGenerator:
    """AI-powered report generation for public health"""
    
    def __init__(self):
        self.report_templates = {
            'weekly': self._weekly_report_template,
            'monthly': self._monthly_report_template,
            'donor': self._donor_report_template,
            'executive': self._executive_summary_template,
            'field': self._field_report_template,
            'evaluation': self._evaluation_report_template
        }
        
        self.visualization_config = {
            'style': 'seaborn',
            'figsize': (10, 6),
            'dpi': 100,
            'color_palette': 'Set2'
        }
    
    async def generate(
        self,
        data: Dict,
        report_type: str,
        format: str = 'docx'
    ) -> Dict:
        """
        Generate AI-powered report
        
        Args:
            data: Report data
            report_type: Type of report (weekly, monthly, donor, etc.)
            format: Output format (docx, pdf, html)
            
        Returns:
            Dictionary with report metadata and file content
        """
        try:
            # Validate report type
            if report_type not in self.report_templates:
                return {
                    'status': 'error',
                    'message': f'Invalid report type: {report_type}'
                }
            
            # Generate report content using AI
            content = await self._generate_content(data, report_type)
            
            # Generate visualizations
            visualizations = self._generate_visualizations(data, report_type)
            
            # Generate document based on format
            if format == 'docx':
                file_content = self._generate_docx(content, visualizations, report_type)
                filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
                mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif format == 'pdf':
                file_content = self._generate_pdf(content, visualizations, report_type)
                filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                mime_type = 'application/pdf'
            elif format == 'html':
                file_content = self._generate_html(content, visualizations, report_type)
                filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                mime_type = 'text/html'
            else:
                return {
                    'status': 'error',
                    'message': f'Invalid format: {format}'
                }
            
            return {
                'status': 'success',
                'filename': filename,
                'content': file_content,
                'mime_type': mime_type,
                'metadata': {
                    'report_type': report_type,
                    'generated_at': datetime.utcnow().isoformat(),
                    'sections': list(content.keys()),
                    'page_count': len(content) // 2  # Rough estimate
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    async def _generate_content(self, data: Dict, report_type: str) -> Dict:
        """Generate report content using AI"""
        try:
            # Get template
            template_func = self.report_templates[report_type]
            
            # Prepare data summary for AI
            data_summary = self._prepare_data_summary(data)
            
            # Generate each section
            sections = {}
            template_sections = template_func()
            
            for section_name, section_prompt in template_sections.items():
                # Use AI to generate section content
                content = await self._generate_section(
                    section_name,
                    section_prompt,
                    data_summary
                )
                sections[section_name] = content
            
            # Add AI-generated insights
            sections['ai_insights'] = await self._generate_insights_section(data)
            
            # Add recommendations
            sections['recommendations'] = await self._generate_recommendations_section(data)
            
            return sections
            
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            return self._get_fallback_content(report_type)
    
    def _weekly_report_template(self) -> Dict:
        """Weekly report template"""
        return {
            'executive_summary': """Generate a concise executive summary for a weekly public health report.
            Include key highlights, critical issues, and overall assessment. Keep under 300 words.
            Use professional public health terminology.""",
            
            'vaccination_coverage': """Analyze vaccination coverage data for the week.
            Compare with previous week and monthly targets.
            Identify trends and areas of concern.
            Include specific numbers and percentages.""",
            
            'disease_surveillance': """Summarize disease surveillance data for the week.
            Highlight any unusual patterns or outbreaks.
            Compare with historical data.
            Include case counts and mortality if applicable.""",
            
            'maternal_health': """Report on maternal health indicators.
            Include ANC coverage, deliveries, complications.
            Identify high-risk cases and referrals.
            Highlight any maternal deaths.""",
            
            'drug_inventory': """Report on drug and supply inventory status.
            Identify stockout risks and expired items.
            List critical shortages.
            Include procurement recommendations.""",
            
            'facility_operations': """Summarize facility operations.
            Report on staffing, equipment, and infrastructure.
            Identify facilities needing support.
            Include any incidents or challenges.""",
            
            'action_items': """List priority action items for the coming week.
            Include responsible parties and deadlines.
            Prioritize by urgency and impact.
            Reference specific data that supports each action."""
        }
    
    def _monthly_report_template(self) -> Dict:
        """Monthly report template"""
        return {
            'executive_summary': """Generate a comprehensive executive summary for monthly report.
            Include month-over-month comparisons, trend analysis, and strategic insights.
            Keep under 500 words.""",
            
            'program_performance': """Analyze overall program performance for the month.
            Include all key indicators with targets and achievements.
            Provide variance analysis and explanations.
            Compare with previous month and same month last year.""",
            
            'coverage_analysis': """Detailed vaccination coverage analysis.
            Break down by antigen, location, and demographic.
            Include dropout rates and follow-up rates.
            Analyze reasons for missed vaccinations.""",
            
            'disease_trends': """Comprehensive disease trend analysis.
            Include epidemiological curves and patterns.
            Analyze seasonal variations.
            Compare with regional and national data.""",
            
            'supply_chain': """Supply chain performance report.
            Include procurement, distribution, and consumption data.
            Analyze stockout patterns and causes.
            Report on cold chain performance.""",
            
            'financial_overview': """Budget utilization and financial performance.
            Include expenditure by category.
            Highlight variances and projections.
            Report on donor fund utilization.""",
            
            'challenges_and_solutions': """Document key challenges encountered.
            Analyze root causes and impacts.
            Propose evidence-based solutions.
            Include lessons learned.""",
            
            'next_month_plan': """Detailed plan for the coming month.
            Include targets, activities, and resource requirements.
            Identify priority areas based on data analysis.
            Include risk mitigation strategies."""
        }
    
    def _donor_report_template(self) -> Dict:
        """Donor report template"""
        return {
            'executive_summary': """Generate donor-focused executive summary.
            Highlight achievements and impact.
            Include key metrics and success stories.
            Keep under 400 words.""",
            
            'project_overview': """Provide project overview and context.
            Include objectives, timeline, and scope.
            Describe implementation approach.
            Highlight innovations and best practices.""",
            
            'key_achievements': """Detail key achievements during the reporting period.
            Include quantitative results and qualitative impacts.
            Compare with targets and milestones.
            Include beneficiary stories and testimonials.""",
            
            'challenges_and_mitigation': """Describe challenges encountered.
            Explain mitigation strategies implemented.
            Include lessons learned and adaptations.
            Be transparent about any delays or issues.""",
            
            'financial_report': """Detailed financial report.
            Include budget vs actual expenditure.
            Provide variance explanations.
            Include forecast for remaining period.
            Report on cost-effectiveness metrics.""",
            
            'monitoring_and_evaluation': """Present M&E results and findings.
            Include indicator performance.
            Share evaluation results.
            Describe data quality improvements.""",
            
            'sustainability_plan': """Describe sustainability strategy.
            Include capacity building activities.
            Report on partnerships and collaborations.
            Outline exit strategy if applicable.""",
            
            'next_period_plan': """Detailed plan for next reporting period.
            Include activities, targets, and budget.
            Identify risks and mitigation measures.
            Include support needed from donor."""
        }
    
    def _executive_summary_template(self) -> Dict:
        """Executive summary template"""
        return {
            'key_findings': """Summarize key findings in bullet points.
            Include most critical information first.
            Use data to support each point.
            Keep under 200 words.""",
            
            'critical_issues': """Highlight critical issues requiring immediate attention.
            Include potential impact if not addressed.
            Provide recommended actions.
            Include timeline for resolution.""",
            
            'performance_summary': """Summarize overall performance.
            Include top 3-5 key performance indicators.
            Show trends and comparisons.
            Highlight significant changes.""",
            
            'strategic_recommendations': """Provide strategic recommendations.
            Include rationale and expected impact.
            Prioritize by importance and feasibility.
            Include resource implications."""
        }
    
    def _field_report_template(self) -> Dict:
        """Field report template"""
        return {
            'activity_summary': """Summarize field activities conducted.
            Include locations visited and populations reached.
            Report on services provided.
            Include any incidents or challenges.""",
            
            'observations': """Document key observations from the field.
            Include community feedback and concerns.
            Report on facility conditions.
            Note any security or access issues.""",
            
            'data_collected': """Summarize data collected during field visits.
            Include number of records collected.
            Report on data quality.
            Note any discrepancies found.""",
            
            'immediate_actions': """List immediate actions taken or required.
            Include follow-up needs.
            Report on referrals made.
            Note any urgent issues."""
        }
    
    def _evaluation_report_template(self) -> Dict:
        """Evaluation report template"""
        return {
            'executive_summary': """Generate evaluation executive summary.
            Include evaluation purpose, methodology, and key findings.
            Summarize recommendations.
            Keep under 500 words.""",
            
            'background': """Provide evaluation background and context.
            Include program description and objectives.
            Describe evaluation questions.
            Explain methodology.""",
            
            'findings': """Present evaluation findings.
            Organize by evaluation questions or themes.
            Include both quantitative and qualitative data.
            Provide evidence for each finding.""",
            
            'conclusions': """Draw conclusions from findings.
            Relate to evaluation objectives.
            Identify patterns and themes.
            Assess overall program effectiveness.""",
            
            'recommendations': """Provide actionable recommendations.
            Prioritize by importance and feasibility.
            Include timeline and responsibility.
            Reference specific findings that support each recommendation."""
        }
    
    async def _generate_section(
        self,
        section_name: str,
        prompt: str,
        data_summary: Dict
    ) -> str:
        """Generate a report section using AI"""
        try:
            client = openai.OpenAI()
            
            # Prepare the full prompt
            full_prompt = f"""
            {prompt}
            
            Available Data:
            {json.dumps(data_summary, indent=2, default=str)}
            
            Generate a professional, well-structured section for a public health report.
            Use specific numbers and data points from the available data.
            Include analysis and interpretation, not just data presentation.
            Write in professional public health language.
            """
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert public health report writer."},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=800,
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating section {section_name}: {e}")
            return f"[Section generated automatically - {section_name}]"
    
    async def _generate_insights_section(self, data: Dict) -> str:
        """Generate AI insights section"""
        try:
            client = openai.OpenAI()
            
            prompt = f"""
            Based on the following public health data, generate 5-7 key insights:
            
            {json.dumps(data, indent=2, default=str)}
            
            For each insight:
            1. State the finding clearly
            2. Provide supporting data
            3. Explain the significance
            4. Suggest implications
            
            Focus on actionable insights that can improve public health outcomes.
            """
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a public health data analyst."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            return "AI insights generation unavailable."
    
    async def _generate_recommendations_section(self, data: Dict) -> str:
        """Generate recommendations section"""
        try:
            client = openai.OpenAI()
            
            prompt = f"""
            Based on the following public health data and analysis, generate prioritized recommendations:
            
            {json.dumps(data, indent=2, default=str)}
            
            For each recommendation:
            1. State the recommendation clearly
            2. Provide rationale based on data
            3. Suggest implementation approach
            4. Indicate expected impact
            5. Provide timeline (immediate, short-term, long-term)
            
            Prioritize recommendations that address the most critical issues.
            """
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a public health strategy advisor."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return "Recommendations generation unavailable."
    
    def _generate_visualizations(self, data: Dict, report_type: str) -> Dict:
        """Generate visualizations for the report"""
        visualizations = {}
        
        try:
            # Set style
            plt.style.use(self.visualization_config['style'])
            sns.set_palette(self.visualization_config['color_palette'])
            
            # Coverage trend chart
            if 'coverage_data' in data:
                fig, ax = plt.subplots(figsize=self.visualization_config['figsize'])
                coverage_df = pd.DataFrame(data['coverage_data'])
                coverage_df.plot(ax=ax)
                ax.set_title('Vaccination Coverage Trend')
                ax.set_ylabel('Coverage (%)')
                ax.set_xlabel('Date')
                visualizations['coverage_trend'] = self._fig_to_bytes(fig)
                plt.close(fig)
            
            # Disease distribution pie chart
            if 'disease_distribution' in data:
                fig, ax = plt.subplots(figsize=(8, 8))
                disease_data = data['disease_distribution']
                ax.pie(
                    disease_data.values(),
                    labels=disease_data.keys(),
                    autopct='%1.1f%%'
                )
                ax.set_title('Disease Distribution')
                visualizations['disease_pie'] = self._fig_to_bytes(fig)
                plt.close(fig)
            
            # Performance bar chart
            if 'facility_performance' in data:
                fig, ax = plt.subplots(figsize=self.visualization_config['figsize'])
                perf_df = pd.DataFrame(data['facility_performance'])
                perf_df.plot(kind='bar', ax=ax)
                ax.set_title('Facility Performance Comparison')
                ax.set_ylabel('Score')
                visualizations['performance_bar'] = self._fig_to_bytes(fig)
                plt.close(fig)
            
        except Exception as e:
            logger.error(f"Error generating visualizations: {e}")
        
        return visualizations
    
    def _fig_to_bytes(self, fig) -> bytes:
        """Convert matplotlib figure to bytes"""
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=self.visualization_config['dpi'], bbox_inches='tight')
        buf.seek(0)
        return buf.read()
    
    def _generate_docx(
        self,
        content: Dict,
        visualizations: Dict,
        report_type: str
    ) -> bytes:
        """Generate DOCX report"""
        doc = Document()
        
        # Title
        title = doc.add_heading(f'Public Health {report_type.capitalize()} Report', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Date
        doc.add_paragraph(f'Generated: {datetime.now().strftime("%B %d, %Y")}')
        doc.add_paragraph('')
        
        # Add each section
        for section_name, section_content in content.items():
            # Section heading
            heading = section_name.replace('_', ' ').title()
            doc.add_heading(heading, level=1)
            
            # Section content
            doc.add_paragraph(section_content)
            
            # Add visualization if available
            if section_name in visualizations:
                doc.add_picture(
                    io.BytesIO(visualizations[section_name]),
                    width=Inches(6)
                )
            
            doc.add_paragraph('')  # Spacing
        
        # Add footer
        doc.add_paragraph('_' * 50)
        doc.add_paragraph(
            'This report was generated automatically by the AI Public Health Intelligence Platform'
        )
        
        # Save to bytes
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read()
    
    def _generate_pdf(
        self,
        content: Dict,
        visualizations: Dict,
        report_type: str
    ) -> bytes:
        """Generate PDF report"""
        pdf = FPDF()
        pdf.add_page()
        
        # Title
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 10, f'Public Health {report_type.capitalize()} Report', 0, 1, 'C')
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 10, f'Generated: {datetime.now().strftime("%B %d, %Y")}', 0, 1, 'C')
        pdf.ln(10)
        
        # Add sections
        for section_name, section_content in content.items():
            # Section heading
            pdf.set_font('Arial', 'B', 14)
            pdf.cell(0, 10, section_name.replace('_', ' ').title(), 0, 1)
            pdf.ln(5)
            
            # Section content
            pdf.set_font('Arial', '', 11)
            pdf.multi_cell(0, 6, section_content)
            pdf.ln(10)
        
        # Output to bytes
        return pdf.output(dest='S').encode('latin1')
    
    def _generate_html(
        self,
        content: Dict,
        visualizations: Dict,
        report_type: str
    ) -> bytes:
        """Generate HTML report"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Public Health {report_type.capitalize()} Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 20px; }}
                h1 {{ color: #333; text-align: center; }}
                h2 {{ color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
                .section {{ margin: 20px 0; }}
                .visualization {{ text-align: center; margin: 20px 0; }}
                .footer {{ margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #999; }}
            </style>
        </head>
        <body>
            <h1>Public Health {report_type.capitalize()} Report</h1>
            <p style="text-align: center; color: #666;">
                Generated: {datetime.now().strftime("%B %d, %Y")}
            </p>
        """
        
        for section_name, section_content in content.items():
            html += f"""
            <div class="section">
                <h2>{section_name.replace('_', ' ').title()}</h2>
                <p>{section_content}</p>
            """
            
            if section_name in visualizations:
                import base64
                img_base64 = base64.b64encode(visualizations[section_name]).decode()
                html += f"""
                <div class="visualization">
                    <img src="data:image/png;base64,{img_base64}" alt="{section_name}" style="max-width: 100%;">
                </div>
                """
            
            html += "</div>"
        
        html += """
            <div class="footer">
                This report was generated automatically by the AI Public Health Intelligence Platform
            </div>
        </body>
        </html>
        """
        
        return html.encode()
    
    def _prepare_data_summary(self, data: Dict) -> Dict:
        """Prepare data summary for AI processing"""
        summary = {}
        
        # Extract key metrics
        if 'vaccination' in data:
            vax = data['vaccination']
            summary['vaccination'] = {
                'coverage': vax.get('coverage', 'N/A'),
                'target': vax.get('target', 90),
                'trend': vax.get('trend', 'stable'),
                'dropout_rate': vax.get('dropout_rate', 'N/A')
            }
        
        if 'disease' in data:
            dis = data['disease']
            summary['disease'] = {
                'total_cases': dis.get('total_cases', 0),
                'active_outbreaks': dis.get('active_outbreaks', 0),
                'mortality_rate': dis.get('mortality_rate', 'N/A')
            }
        
        if 'maternal' in data:
            mat = data['maternal']
            summary['maternal'] = {
                'anc_coverage': mat.get('anc_coverage', 'N/A'),
                'deliveries': mat.get('deliveries', 0),
                'maternal_deaths': mat.get('maternal_deaths', 0)
            }
        
        if 'inventory' in data:
            inv = data['inventory']
            summary['inventory'] = {
                'stockout_risk': inv.get('stockout_risk', 0),
                'average_stock_level': inv.get('avg_stock', 'N/A')
            }
        
        return summary
    
    def _get_fallback_content(self, report_type: str) -> Dict:
        """Get fallback content when AI generation fails"""
        return {
            'executive_summary': 'Report generation encountered an error. Please try again or contact technical support.',
            'error': 'AI generation failed',
            'timestamp': datetime.utcnow().isoformat()
        }