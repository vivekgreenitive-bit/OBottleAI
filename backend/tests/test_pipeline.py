import pytest
import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.db.database import SessionLocal, engine, Base
from app.db.sample_data import seed_scenario_data
from app.analytics.analytics import OperationsAnalytics
from app.workflows.orchestrator import WorkflowOrchestrator
from app.models.models import Bottleneck, Recommendation, Approval, AuditLog, KnowledgeDocument, SystemConfig
from app.rag.rag_service import RAGService
from app.agents.agents import ActionExecutionAgent

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_rag_initialization(db_session):
    RAGService.init_knowledge_base(db_session)
    count = db_session.query(KnowledgeDocument).count()
    assert count > 0, "RAG Knowledge base should contain initial SOP documents"

def test_scenario_seeding_and_analytics(db_session):
    seed_scenario_data(db_session, "release_delay")
    metrics = OperationsAnalytics.calculate_metrics(db_session)
    
    assert metrics['active_backlog'] > 0, "Active backlog should contain records"
    assert metrics['blocked_count'] >= 0, "Blocked count must be a non-negative integer"
    assert 'workload_imbalance_ratio' in metrics, "Metrics must include workload imbalance"

def test_orchestrator_diagnostics(db_session):
    orchestrator = WorkflowOrchestrator()
    bottlenecks = orchestrator.run_diagnostics(db_session, scenario_type="release_delay")
    
    assert len(bottlenecks) > 0, "Orchestrator must detect at least one bottleneck"
    b = bottlenecks[0]
    assert b.title is not None, "Bottleneck title must be populated"
    assert b.severity in ["critical", "high", "medium", "low"], "Severity must be valid level"
    assert b.impact_score >= 0.0, "Impact score must be non-negative"

def test_recommendation_and_approval_flow(db_session):
    orchestrator = WorkflowOrchestrator()
    bottlenecks = orchestrator.run_diagnostics(db_session, scenario_type="release_delay")
    b = bottlenecks[0]
    
    recs = db_session.query(Recommendation).filter(Recommendation.bottleneck_id == b.id).all()
    assert len(recs) > 0, "Recommendations must be generated for detected bottleneck"
    
    rec = recs[0]
    rec.status = "Approved"
    
    approval = Approval(
        recommendation_id=rec.id,
        approver="Automated Pytest Runner",
        status="Approved",
        reviewer_comments="Pytest approval simulation"
    )
    db_session.add(approval)
    db_session.commit()
    
    executor = ActionExecutionAgent()
    exec_record = executor.execute(rec, db_session)
    assert exec_record.status == "Success", "Action execution must complete with Success status"

def test_audit_logs_persistence(db_session):
    audits = db_session.query(AuditLog).all()
    assert len(audits) > 0, "Audit logs must record system events and agent executions"

def test_system_config_persistence(db_session):
    config = db_session.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db_session.add(config)
    config.active_model = "gemini-1.5-pro"
    db_session.commit()
    
    saved = db_session.query(SystemConfig).first()
    assert saved.active_model == "gemini-1.5-pro", "SystemConfig active model must persist"
