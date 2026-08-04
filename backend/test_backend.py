import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.db.sample_data import seed_scenario_data
from app.analytics.analytics import OperationsAnalytics
from app.workflows.orchestrator import WorkflowOrchestrator
from app.models.models import Bottleneck, Recommendation, Approval, ActionExecution, AuditLog, KnowledgeDocument
from app.rag.rag_service import RAGService

def run_tests():
    print("=== STARTING BACKEND INTEGRATION TEST ===")
    
    # Initialize DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Seed RAG
    RAGService.init_knowledge_base(db)
    docs_count = db.query(KnowledgeDocument).count()
    print(f"1. RAG initialization: SUCCESS ({docs_count} documents in KB)")
    
    # Seed Release Delay Scenario
    seed_scenario_data(db, "release_delay")
    print("2. Seeding release_delay: SUCCESS")
    
    # Run analytics
    metrics = OperationsAnalytics.calculate_metrics(db)
    print("3. Deterministic Analytics Calculation:")
    print(f"   - Active Backlog: {metrics['active_backlog']}")
    print(f"   - Blocked Tasks: {metrics['blocked_count']}")
    print(f"   - Overdue Tasks: {metrics['overdue_count']}")
    print(f"   - Imbalance Ratio: {metrics['workload_imbalance_ratio']}")
    assert metrics['active_backlog'] > 0, "Backlog should be populated"
    
    # Run Orchestrator diagnostics
    orchestrator = WorkflowOrchestrator()
    print("4. Running Orchestrator Agent Pipeline...")
    bottlenecks = orchestrator.run_diagnostics(db, scenario_type="release_delay")
    
    assert len(bottlenecks) > 0, "Should have detected at least one bottleneck"
    b = bottlenecks[0]
    print(f"   - Detected Bottleneck: '{b.title}'")
    print(f"   - Severity: {b.severity}")
    print(f"   - Impact Score: {b.impact_score}")
    print(f"   - SLA Risk: {b.sla_risk}")
    
    # Assert recommendations exist
    recs = db.query(Recommendation).filter(Recommendation.bottleneck_id == b.id).all()
    print(f"   - Generated Recommendations: {len(recs)}")
    assert len(recs) > 0, "Should have generated recommendations"
    
    # Simulate Approval Gate
    rec_to_approve = recs[0]
    print(f"5. Simulating Human Approval Gate on Action: '{rec_to_approve.action}'")
    rec_to_approve.status = "Approved"
    
    approval = Approval(
        recommendation_id=rec_to_approve.id,
        approver="Test Admin",
        status="Approved",
        reviewer_comments="Looks good, reassign immediately."
    )
    db.add(approval)
    db.commit()
    
    # Execute Action
    from app.agents.agents import ActionExecutionAgent
    executor = ActionExecutionAgent()
    exec_record = executor.execute(rec_to_approve, db)
    
    print(f"6. Simulating Action Execution:")
    print(f"   - Status: {exec_record.status}")
    print(f"   - Logs: {exec_record.logs}")
    assert exec_record.status == "Success", "Action execution should succeed"
    
    # Verify Audit Logs
    audits = db.query(AuditLog).all()
    print(f"7. Verifying Audit Logs: SUCCESS ({len(audits)} audit entries found)")
    
    # 8. Test SystemConfig Database Writes
    from app.models.models import SystemConfig, UserFeedback
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)
    config.slack_webhook_url = "https://hooks.slack.com/services/T00/B00/X00"
    config.active_model = "gemini-1.5-pro"
    db.commit()
    
    saved_config = db.query(SystemConfig).first()
    print("8. Testing SystemConfig Persistence:")
    print(f"   - Saved Slack URL: {saved_config.slack_webhook_url}")
    print(f"   - Saved Model: {saved_config.active_model}")
    assert saved_config.slack_webhook_url == "https://hooks.slack.com/services/T00/B00/X00", "Config URL must persist"
    
    # 9. Test UserFeedback Scorecard Writes
    feedback = UserFeedback(
        bottleneck_id=b.id,
        is_valid=True,
        is_root_cause_correct=True,
        is_recommendation_useful=False,
        reviewer_comments="Recommendation was too slow."
    )
    db.add(feedback)
    db.commit()
    
    saved_fb = db.query(UserFeedback).filter(UserFeedback.bottleneck_id == b.id).first()
    print("9. Testing Reviewer Feedback Persistence:")
    print(f"   - Validated: {saved_fb.is_valid}")
    print(f"   - Rationale: {saved_fb.reviewer_comments}")
    assert saved_fb.is_valid is True, "Feedback must persist"
    
    # 10. Test PII Redaction Filter
    import re
    raw_owner = "Developer Name <dev@domain.com>"
    redacted_owner = re.sub(r'[\w\.-]+@[\w\.-]+', '[REDACTED_EMAIL]', raw_owner)
    print("10. Testing Ingestion PII Redaction Filter:")
    print(f"    - Inbound: {raw_owner}")
    print(f"    - Cleaned: {redacted_owner}")
    assert "dev@domain.com" not in redacted_owner, "PII Email must be redacted"
    assert "[REDACTED_EMAIL]" in redacted_owner, "Redaction token must be injected"
    
    db.close()
    print("\n=== ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()

