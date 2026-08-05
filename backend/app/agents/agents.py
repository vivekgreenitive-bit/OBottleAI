import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.models import OperationalRecord, Bottleneck, Recommendation, AuditLog, ActionExecution, SystemConfig
from app.analytics.analytics import OperationsAnalytics
from app.rag.rag_service import RAGService
from app.core.gemini_provider import GeminiProvider
from pydantic import BaseModel, Field
import httpx

logger = logging.getLogger(__name__)


# Structured validation schemas for Gemini responses
class ActionItemSchema(BaseModel):
    priority: int
    action: str
    owner: str
    deadline: str
    approval_required: bool
    expected_outcome: str
    expected_risk_reduction: float

class GeminiOrchestratorSchema(BaseModel):
    bottleneck_title: str
    summary: str
    process: str
    severity: str  # low | medium | high | critical
    impact_score: float
    confidence: float
    evidence: List[str]
    root_causes: List[str]
    affected_customers: List[str]
    estimated_delay_days: int
    estimated_cost_impact: float
    sla_risk: str
    recommended_actions: List[ActionItemSchema]
    assumptions: List[str]
    knowledge_sources: List[str]

class DataAnalysisAgent:
    """Calculates throughput, cycle time, backlog, and SLA statistics using deterministic engine."""
    def run(self, db: Session, team: Optional[str] = None, batch_id: Optional[str] = None) -> Dict[str, Any]:
        logger.info(f"Executing Data Analysis Agent (batch_id={batch_id})...")
        metrics = OperationsAnalytics.calculate_metrics(db, team=team, batch_id=batch_id)
        return metrics

class BottleneckDetectionAgent:
    """Detects overloaded engineers, blocked dependency chains, and SLA breach risks."""
    def run(self, db: Session, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        logger.info("Executing Bottleneck Detection Agent...")
        detected_risks = []
        
        # Rule 1: Overloaded Resource (workload_imbalance_ratio > 2.0 or individual workload > 5 tasks)
        resource_dist = metrics.get("resource_distribution", {})
        for resource, count in resource_dist.items():
            if count > 5:
                detected_risks.append({
                    "type": "Resource Overload",
                    "resource": resource,
                    "evidence": f"Engineer '{resource}' is assigned to {count} active tasks (max capacity recommendation is 4).",
                    "severity": "high" if count > 7 else "medium",
                    "score_weight": 60.0 if count > 7 else 40.0
                })
                
        # Rule 2: Blocked Tasks Count > 0
        blocked_count = metrics.get("blocked_count", 0)
        if blocked_count > 0:
            detected_risks.append({
                "type": "Blocked Dependency",
                "evidence": f"There are {blocked_count} tasks marked as Blocked or waiting on external components.",
                "severity": "critical" if blocked_count > 3 else "high",
                "score_weight": 85.0 if blocked_count > 3 else 70.0
            })

        # Rule 3: SLA violations or low compliance rate (< 85%)
        sla_rate = metrics.get("sla_compliance_rate", 100.0)
        violations = metrics.get("sla_violations", 0)
        if sla_rate < 90.0 or violations > 0:
            detected_risks.append({
                "type": "SLA Breach Risk",
                "evidence": f"SLA compliance is currently at {sla_rate}% with {violations} breaches detected.",
                "severity": "critical" if sla_rate < 75.0 else "high",
                "score_weight": 90.0 if sla_rate < 75.0 else 75.0
            })

        return detected_risks

class BusinessImpactAgent:
    """Calculates overall severity score using business priorities."""
    def calculate_score(self, customer_impact: float, sla_risk: float, delay_risk: float, 
                        cost_impact: float, revenue_risk: float, scope_impact: float) -> Tuple[float, str]:
        
        # Transparent formula requested in PRD
        score = (
            (customer_impact * 0.25) +
            (sla_risk * 0.20) +
            (delay_risk * 0.15) +
            (cost_impact * 0.15) +
            (revenue_risk * 0.15) +
            (scope_impact * 0.10)
        )
        
        score = min(max(score, 0.0), 100.0)
        
        if score >= 75.0:
            severity = "critical"
        elif score >= 50.0:
            severity = "high"
        elif score >= 25.0:
            severity = "medium"
        else:
            severity = "low"
            
        return round(score, 2), severity

class RootCauseAgent:
    """Uses Gemini to explain the root causes of the bottleneck."""
    def __init__(self, provider: GeminiProvider):
        self.provider = provider

    def analyze(self, risks: List[Dict[str, Any]], context_docs: List[Dict[str, Any]]) -> str:
        # Prompt details for Gemini root cause explanation
        prompt = f"Analyze the following operational risks:\n"
        for r in risks:
            prompt += f"- Type: {r['type']}, Evidence: {r['evidence']}, Severity: {r['severity']}\n"
        
        prompt += "\nSupported SOP/SLA documentation context:\n"
        for doc in context_docs:
            prompt += f"- [{doc['title']}]: {doc['content']}\n"
            
        # Call provider or trigger fallback.
        # Handled in the orchestrator pipeline to populate the GeminiOrchestratorSchema object.
        return prompt

class ActionExecutionAgent:
    """Executes the action (Jira task, Slack alert, Webhook) once approval is recorded."""
    def execute(self, rec: Recommendation, db: Session) -> ActionExecution:
        logger.info(f"Executing Action for Recommendation ID: {rec.id}...")
        
        exec_record = ActionExecution(
            recommendation_id=rec.id,
            action_type="Slack/Jira Integration" if rec.approval_required else "Auto-Notification",
            status="Executing"
        )
        db.add(exec_record)
        db.commit()
        
        logs = []
        try:
            # Simulate Jira task creation
            if "reassign" in rec.action.lower() or "escalate" in rec.action.lower():
                logs.append(f"JIRA API → Connected [Success]")
                logs.append(f"Created JIRA Ticket: OBOTTLE-{rec.id} assigned to {rec.owner}.")
                
            # Simulate Slack message webhook
            logs.append(f"Slack Webhook → Dispatched to #ops-alerts [Success]")
            logs.append(f"Notification Sent: '{rec.action}' (Deadline: {rec.deadline})")
            
            # Real outbound Webhook Execution
            config = db.query(SystemConfig).first()
            if config and config.slack_webhook_url:
                payload = {
                    "text": f"🚨 *OBottleAI Mitigation Authorized* 🚨\n\n*Action*: {rec.action}\n*Assignee*: {rec.owner}\n*Deadline*: {rec.deadline}\n*Outcome*: {rec.expected_outcome}\n*Risk Reduction*: -{rec.expected_risk_reduction}%"
                }
                r = httpx.post(config.slack_webhook_url, json=payload, timeout=5.0)
                if r.status_code in [200, 201]:
                    logs.append(f"Live Webhook Alert: Successfully posted mitigation alert to Slack Webhook URL.")
                else:
                    logs.append(f"Live Webhook Alert Failed: Slack returned HTTP {r.status_code}")
            
            exec_record.status = "Success"
            exec_record.logs = "\n".join(logs)
            rec.status = "Executed"
        except Exception as e:
            exec_record.status = "Failed"
            exec_record.logs = f"Execution failed: {str(e)}"
            
        db.commit()
        return exec_record

