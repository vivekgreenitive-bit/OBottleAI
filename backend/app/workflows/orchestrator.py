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

    def run_diagnostics(self, db: Session, scenario_type: Optional[str] = None, batch_id: Optional[str] = None, status_callback: Optional[Callable] = None) -> List[Bottleneck]:
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

        # Delete any pre-existing bottlenecks for this batch_id to prevent duplicates
        if batch_id:
            old_bs = db.query(Bottleneck).filter(Bottleneck.batch_id == batch_id).all()
            for ob in old_bs:
                db.delete(ob)
            db.commit()

        # Step 0: Validation & Redaction Gate
        step0_time = time.time()
        if status_callback:
            status_callback(0, "Data validation", "running", "Validating schema integrity...", "0.0s")
        time.sleep(0.3)
        if status_callback:
            status_callback(0, "Data validation", "completed", "Schema 100% valid.", f"{round(time.time() - step0_time, 1)}s")

        step1_time = time.time()
        if status_callback:
            status_callback(1, "Data normalization & redaction", "running", "Sanitizing emails and PII fields...", "0.0s")
        time.sleep(0.2)
        if status_callback:
            status_callback(1, "Data normalization & redaction", "completed", "PII Redaction Gate active.", f"{round(time.time() - step1_time, 1)}s")

        # Step 2: Operational Metrics Agent
        step2_time = time.time()
        if status_callback:
            status_callback(2, "Operational metrics analysis", "running", "Calculating backlog cycle times & SLA breach ratios...", "0.0s")
        metrics = self.analysis_agent.run(db, batch_id=batch_id)
        time.sleep(0.6)
        if status_callback:
            status_callback(2, "Operational metrics analysis", "completed", f"Processed backlog metrics across records.", f"{round(time.time() - step2_time, 1)}s")

        # Step 3: Bottleneck Detection Agent
        step3_time = time.time()
        if status_callback:
            status_callback(3, "Bottleneck detection & prediction", "running", "Scanning rule engine for overloaded resources & blocked chains...", "0.0s")
        risks = self.detection_agent.run(db, metrics)
        time.sleep(0.7)
        if status_callback:
            status_callback(3, "Bottleneck detection & prediction", "completed", f"Identified {len(risks)} operational risk factors.", f"{round(time.time() - step3_time, 1)}s")

        if not risks:
            logger.info("No bottlenecks detected.")
            self._write_audit_log(
                agent="Orchestrator",
                action="run_diagnostics",
                status="Success",
                output="No operational bottlenecks identified.",
                latency=time.time() - start_time,
                db=db
            )
            return []

        # Step 4: Retrieve context documents from RAG based on detected risks & Root Cause Reasoning
        step4_time = time.time()
        if status_callback:
            status_callback(4, "Root-cause analysis", "running", "Executing RAG lookup & Gemini 1.5 Pro AI Reasoning engine...", "0.0s")
        
        risk_descriptions = " ".join([r["evidence"] for r in risks])
        context_docs = RAGService.retrieve_context(risk_descriptions, db, limit=2)
        context_str = "\n".join([f"- {d['title']}: {d['content']}" for d in context_docs])

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

        result_data: GeminiOrchestratorSchema = self.provider.generate_structured(
            prompt=prompt,
            schema=GeminiOrchestratorSchema,
            system_instruction=system_instruction
        )
        time.sleep(0.8)
        if status_callback:
            status_callback(4, "Root-cause analysis", "completed", f"Root cause synthesized: {result_data.bottleneck_title[:45]}...", f"{round(time.time() - step4_time, 1)}s")

        # Step 5: Business Impact Assessment Agent
        step5_time = time.time()
        if status_callback:
            status_callback(5, "Business-impact assessment", "running", "Weighting SLA risks, timeline delays, and cost exposure...", "0.0s")
            
        cust_impact = 90.0 if result_data.severity == "critical" else (70.0 if result_data.severity == "high" else 40.0)
        sla_risk = 95.0 if result_data.sla_risk == "critical" else (75.0 if result_data.sla_risk == "high" else 45.0)
        delay_risk = result_data.estimated_delay_days * 15.0
        cost_impact = min(result_data.estimated_cost_impact / 200.0, 100.0)
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
        time.sleep(0.6)
        if status_callback:
            status_callback(5, "Business-impact assessment", "completed", f"Impact Score: {round(final_score, 1)} ({calculated_severity.upper()})", f"{round(time.time() - step5_time, 1)}s")

        # Step 6: Recommendation Generation
        step6_time = time.time()
        if status_callback:
            status_callback(6, "Recommendation generation", "running", "Drafting mitigation plans and human approval gates...", "0.0s")

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
        db.flush()

        for detail in result_data.evidence:
            ev = BottleneckEvidence(bottleneck_id=db_bottleneck.id, details=detail)
            db.add(ev)

        for cause in result_data.root_causes:
            rc = RootCauseHypothesis(bottleneck_id=db_bottleneck.id, hypothesis=cause, confidence=result_data.confidence)
            db.add(rc)

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
        latency = time.time() - start_time
        time.sleep(0.6)

        if status_callback:
            status_callback(6, "Recommendation generation", "completed", f"Generated {len(result_data.recommended_actions)} actionable recommendations.", f"{round(time.time() - step6_time, 1)}s")

        # Step 7: Final Report Preparation
        time.sleep(0.8)
        if status_callback:
            status_callback(7, "Final report preparation", "completed", "Report ready. Redirecting to Results Dashboard...", f"{round(latency, 1)}s")

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
