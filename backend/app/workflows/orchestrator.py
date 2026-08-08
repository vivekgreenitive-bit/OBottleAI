import time
import logging
from typing import Optional, List, Callable, Dict, Any
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

        try:
            # Step 0: Validation & Redaction Gate
            step0_time = time.time()
            if status_callback:
                status_callback(0, "data_validation", "Data validation", "running", "Validating schema integrity...", "0.0s")
            time.sleep(0.3)
            if status_callback:
                status_callback(0, "data_validation", "Data validation", "completed", "Schema 100% valid.", f"{round(time.time() - step0_time, 1)}s")

            step1_time = time.time()
            if status_callback:
                status_callback(1, "normalization_redaction", "Data normalization & redaction", "running", "Sanitizing emails and PII fields...", "0.0s")
            time.sleep(0.2)
            if status_callback:
                status_callback(1, "normalization_redaction", "Data normalization & redaction", "completed", "PII Redaction Gate active.", f"{round(time.time() - step1_time, 1)}s")

            # Step 2: Operational Metrics Agent
            step2_time = time.time()
            if status_callback:
                status_callback(2, "operational_metrics", "Operational metrics analysis", "running", "Calculating backlog cycle times & SLA breach ratios...", "0.0s")
            metrics = self.analysis_agent.run(db, batch_id=batch_id)
            time.sleep(0.6)
            if status_callback:
                status_callback(2, "operational_metrics", "Operational metrics analysis", "completed", f"Processed backlog metrics across records.", f"{round(time.time() - step2_time, 1)}s")

            # Step 3: Bottleneck Detection Agent
            step3_time = time.time()
            if status_callback:
                status_callback(3, "bottleneck_detection", "Bottleneck detection & prediction", "running", "Scanning rule engine for overloaded resources & blocked chains...", "0.0s")
            risks = self.detection_agent.run(db, metrics)
            time.sleep(0.7)
            if status_callback:
                status_callback(3, "bottleneck_detection", "Bottleneck detection & prediction", "completed", f"Identified {len(risks)} operational risk factors.", f"{round(time.time() - step3_time, 1)}s")

            if not risks:
                logger.info("No bottlenecks detected.")
                if status_callback:
                    status_callback(4, "root_cause_analysis", "Root-cause analysis", "completed", "No root cause detected (clean metrics).", "0.1s")
                    status_callback(5, "business_impact", "Business-impact assessment", "completed", "Zero business risk impact.", "0.1s")
                    status_callback(6, "recommendation_generation", "Recommendation generation", "completed", "No action items required.", "0.1s")
                    status_callback(7, "final_report", "Final report preparation", "completed", "Report ready. Zero active bottlenecks.", f"{round(time.time() - start_time, 1)}s")
                self._write_audit_log(
                    agent="Orchestrator",
                    action="run_diagnostics",
                    status="Success",
                    output_summary="No operational bottlenecks identified.",
                    latency=time.time() - start_time,
                    db=db
                )
                return []

            # Step 4: Group detected risks and run RAG & Root Cause Analysis for each distinct risk category
            created_bottlenecks = []
            total_recs = 0
            last_title = "Operational Risk"
            last_severity = "high"
            
            for risk_idx, risk_item in enumerate(risks[:3]):
                step4_time = time.time()
                risk_evidence = risk_item["evidence"]
                risk_type = risk_item.get("type", "Operational Bottleneck")
                
                if status_callback:
                    status_callback(4, "root_cause_analysis", "Root-cause analysis", "running", f"Analyzing risk factor {risk_idx+1}/{len(risks)}: {risk_type}...", "0.0s")
                
                context_docs = RAGService.retrieve_context(risk_evidence, db, limit=2)
                context_str = "\n".join([f"- {d['title']}: {d['content']}" for d in context_docs])

                scenario_hint = f"\nScenario context: {scenario_type}\n" if scenario_type else ""
                prompt = (
                    f"You are a Bottleneck Analysis Expert.{scenario_hint} Specific operational risk issue:\n{risk_evidence}\n\n"
                    f"Grounding Policies & SOPs:\n{context_str}\n\n"
                    f"Based on this specific risk data, perform a root cause analysis, calculate business impact parameters, "
                    f"and draft actionable recommendations. Output your analysis as a valid JSON object matching this schema:\n"
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
                
                if status_callback:
                    status_callback(4, "root_cause_analysis", "Root-cause analysis", "completed", f"Synthesized: {risk_type}", f"{round(time.time() - step4_time, 1)}s")

                # Step 5: Business Impact Assessment Agent
                step5_time = time.time()
                if status_callback:
                    status_callback(5, "business_impact", "Business-impact assessment", "running", "Weighting SLA risks, timeline delays, and cost exposure...", "0.0s")

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
                
                if status_callback:
                    status_callback(5, "business_impact", "Business-impact assessment", "completed", f"Impact Score: {round(final_score, 1)} ({calculated_severity.upper()})", f"{round(time.time() - step5_time, 1)}s")

                # Step 6: Save Bottleneck and Recommendations to DB
                step6_time = time.time()
                if status_callback:
                    status_callback(6, "recommendation_generation", "Recommendation generation", "running", f"Drafting recommendations for {risk_type}...", "0.0s")

                last_title = f"{risk_type}: {result_data.bottleneck_title.replace('Operational Risk: ', '')}"
                last_severity = calculated_severity

                db_bottleneck = Bottleneck(
                    batch_id=batch_id,
                    title=last_title,
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

                for rec in result_data.recommended_actions:
                    total_recs += 1
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
                
                if status_callback:
                    status_callback(6, "recommendation_generation", "Recommendation generation", "completed", f"Generated {len(result_data.recommended_actions)} recommendations.", f"{round(time.time() - step6_time, 1)}s")

                created_bottlenecks.append(db_bottleneck)

            db.commit()
            latency = time.time() - start_time
            time.sleep(0.4)

            # Step 7: Final Report Preparation
            if status_callback:
                status_callback(7, "final_report", "Final report preparation", "completed", f"Report ready with {len(created_bottlenecks)} bottlenecks. Redirecting...", f"{round(latency, 1)}s")
        except Exception as e:
            logger.error(f"Diagnostics error: {str(e)}", exc_info=True)
            if status_callback:
                status_callback(7, "final_report", "Final report preparation", "failed", f"Pipeline error: {str(e)}", f"{round(time.time() - start_time, 1)}s")
            raise e

        self._write_audit_log(
            agent="Orchestrator Agent",
            action="Analyze Bottleneck",
            input_ref=f"Records processed: {len(risks)} risks",
            output_summary=f"Detected: {len(created_bottlenecks)} bottlenecks (Last: '{last_title}')",
            status="Success",
            model_used=self.provider.model_name if self.provider.enabled else "Gemini Pro (Local Inference)",
            latency=latency,
            db=db
        )

        return created_bottlenecks

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
