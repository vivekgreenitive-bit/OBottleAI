import time
import logging
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Bottleneck, BottleneckEvidence, RootCauseHypothesis, Recommendation, AuditLog, ActionExecution, Approval
from app.agents.agents import (
    DataAnalysisAgent, BottleneckDetectionAgent, BusinessImpactAgent, 
    GeminiOrchestratorSchema
)
from app.rag.rag_service import RAGService
from app.core.gemini_provider import GeminiProvider

logger = logging.getLogger(__name__)

class WorkflowOrchestrator:
    def __init__(self):
        self.provider = GeminiProvider()
        self.analysis_agent = DataAnalysisAgent()
        self.detection_agent = BottleneckDetectionAgent()
        self.impact_agent = BusinessImpactAgent()

    def run_diagnostics(self, db: Session, scenario_type: Optional[str] = None, batch_id: Optional[str] = None) -> List[Bottleneck]:
        """
        Runs the full end-to-end diagnostic workflow for the specified batch (or latest uploaded data):
        1. Read operational database records for batch.
        2. Calculate metrics (Data Analysis Agent).
        3. Identify risks (Bottleneck Detection Agent).
        4. Retrieve context (RAG/Knowledge Agent).
        5. Invoke Gemini Pro reasoning for root cause & recommendations.
        6. Calculate Business Impact scores.
        7. Save the bottleneck outputs to DB tagged with batch_id.
        8. Record in Audit Log.
        """
        start_time = time.time()
        logger.info(f"Starting Multi-Agent Diagnostics workflow for batch_id: {batch_id}...")

        metrics = self.analysis_agent.run(db, batch_id=batch_id)
        
        # Step 3: Identify risks
        risks = self.detection_agent.run(db, metrics)
        
        if not risks:
            logger.info("No bottlenecks detected.")
            # Record audit log
            self._write_audit_log(
                agent="Orchestrator",
                action="run_diagnostics",
                status="Success",
                output="No operational bottlenecks identified.",
                latency=time.time() - start_time,
                db=db
            )
            return []

        # Step 4: Retrieve context documents from RAG based on detected risks
        risk_descriptions = " ".join([r["evidence"] for r in risks])
            
        context_docs = RAGService.retrieve_context(risk_descriptions, db, limit=2)
        context_str = "\n".join([f"- {d['title']}: {d['content']}" for d in context_docs])

        # Step 5: Construct reasoning prompt for Gemini
        scenario_hint = f"\nScenario context: {scenario_type}\n" if scenario_type else ""
        prompt = (
            f"You are a Bottleneck Analysis Expert.{scenario_hint} Here are the detected operational issues:\n{risk_descriptions}\n\n"
            f"Grounding Policies & SOPs:\n{context_str}\n\n"
            f"Based on this operational data, perform a comprehensive root cause analysis, calculate business impact parameters, "
            f"and draft actionable recommendations. You must output your analysis exactly as a valid JSON object matching this schema:\n"
            f"{GeminiOrchestratorSchema.schema_json()}\n"
        )
        
        system_instruction = (
            "You are a precise Operational Architect. You generate structured outputs detailing root causes "
            "and recommendations for bottlenecks. Your responses must be grounded strictly in facts and policies."
        )

        # Step 6: Call Gemini
        result_data: GeminiOrchestratorSchema = self.provider.generate_structured(
            prompt=prompt,
            schema=GeminiOrchestratorSchema,
            system_instruction=system_instruction
        )
        
        latency = time.time() - start_time

        # Calculate final business impact score using formula
        cust_impact = 90.0 if result_data.severity == "critical" else (70.0 if result_data.severity == "high" else 40.0)
        sla_risk = 95.0 if result_data.sla_risk == "critical" else (75.0 if result_data.sla_risk == "high" else 45.0)
        delay_risk = result_data.estimated_delay_days * 15.0 # e.g. 5 days = 75
        cost_impact = min(result_data.estimated_cost_impact / 200.0, 100.0) # Scale cost
        revenue_risk = 80.0 if result_data.severity == "critical" else 40.0
        scope_impact = 70.0

        final_score, calculated_severity = self.impact_agent.calculate_score(
            customer_impact=cust_impact,
            sla_risk=sla_risk,
            delay_risk=delay_risk,
            cost_impact=cost_impact,
            revenue_risk=revenue_risk,
            scope_impact=scope_impact
        )

        # Save to database with batch_id
        db_bottleneck = Bottleneck(
            batch_id=batch_id,
            title=result_data.bottleneck_title,
            summary=result_data.summary,
            process=result_data.process,
            severity=calculated_severity,
            impact_score=final_score,
            confidence=result_data.confidence,
            estimated_delay_days=result_data.estimated_delay_days,
            estimated_cost_impact=result_data.estimated_cost_impact,
            sla_risk=result_data.sla_risk,
            status="Active",
            detected_time=datetime.utcnow()
        )
        db.add(db_bottleneck)
        db.flush() # Populate db_bottleneck.id

        # Save evidence
        for detail in result_data.evidence:
            ev = BottleneckEvidence(bottleneck_id=db_bottleneck.id, details=detail)
            db.add(ev)

        # Save root causes
        for cause in result_data.root_causes:
            rc = RootCauseHypothesis(bottleneck_id=db_bottleneck.id, hypothesis=cause, confidence=result_data.confidence)
            db.add(rc)

        # Save recommendations
        for idx, rec in enumerate(result_data.recommended_actions):
            db_rec = Recommendation(
                bottleneck_id=db_bottleneck.id,
                priority=rec.priority,
                action=rec.action,
                owner=rec.owner,
                deadline=rec.deadline,
                expected_outcome=rec.expected_outcome,
                expected_risk_reduction=rec.expected_risk_reduction,
                approval_required=rec.approval_required,
                status="Pending Approval" if rec.approval_required else "Auto-Approved"
            )
            db.add(db_rec)

        db.commit()

        # Step 8: Log Audit
        self._write_audit_log(
            agent="Orchestrator Agent",
            action="Analyze Bottleneck",
            input_ref=f"Records processed: {len(risks)} risks",
            output_summary=f"Detected: '{result_data.bottleneck_title}' with severity {calculated_severity}",
            status="Success",
            model_used=self.provider.model_name if self.provider.enabled else "Gemini Pro (Local Inference)",
            latency=latency,
            db=db
        )

        return [db_bottleneck]

    def _write_audit_log(self, agent: str, action: str, status: str, output_summary: str, latency: float, 
                         input_ref: Optional[str] = None, model_used: Optional[str] = None, db: Session = None):
        if db:
            try:
                log = AuditLog(
                    agent_name=agent,
                    action_performed=action,
                    input_ref=input_ref,
                    output_summary=output_summary,
                    status=status,
                    model_used=model_used,
                    latency=latency
                )
                db.add(log)
                db.commit()
            except Exception as e:
                logger.error(f"Failed to write audit log to database: {e}")
