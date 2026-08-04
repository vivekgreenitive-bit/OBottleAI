from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(String, default="Analyst")  # Viewer, Analyst, Operations Manager, Approver, Administrator

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)  # Jira, Support, KPI, CSV, JSON
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

class OperationalRecord(Base):
    __tablename__ = "operational_records"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)  # Jira, GitHub, support_tickets, kpi
    entity_type = Column(String)  # task, ticket, PR
    entity_id = Column(String, index=True)
    project = Column(String, index=True)
    task_name = Column(String)
    owner = Column(String)
    team = Column(String, index=True)
    status = Column(String)
    priority = Column(String)
    created_date = Column(DateTime)
    due_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    dependencies = Column(String, nullable=True)  # Comma separated IDs
    sla_target = Column(DateTime, nullable=True)
    sla_status = Column(String, nullable=True)  # Met, Breached, At Risk
    customer = Column(String, nullable=True)
    estimated_effort = Column(Float, default=0.0)
    actual_effort = Column(Float, default=0.0)
    blocked_duration = Column(Float, default=0.0)  # In hours/days
    customer_impact = Column(String, nullable=True)
    revenue_impact = Column(Float, default=0.0)
    cost_impact = Column(Float, default=0.0)
    meta_data = Column(JSON, nullable=True)

class Bottleneck(Base):
    __tablename__ = "bottlenecks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    summary = Column(Text)
    process = Column(String, index=True)
    severity = Column(String)  # low, medium, high, critical
    impact_score = Column(Float, default=0.0)
    confidence = Column(Float, default=1.0)
    estimated_delay_days = Column(Integer, default=0)
    estimated_cost_impact = Column(Float, default=0.0)
    sla_risk = Column(String)  # low, medium, high, critical
    status = Column(String, default="Active")  # Active, Resolved, Ignored
    detected_time = Column(DateTime, default=datetime.utcnow)

    # Relationships
    evidence = relationship("BottleneckEvidence", back_populates="bottleneck", cascade="all, delete-orphan")
    root_causes = relationship("RootCauseHypothesis", back_populates="bottleneck", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="bottleneck", cascade="all, delete-orphan")

class BottleneckEvidence(Base):
    __tablename__ = "bottleneck_evidence"
    id = Column(Integer, primary_key=True, index=True)
    bottleneck_id = Column(Integer, ForeignKey("bottlenecks.id"))
    details = Column(Text)

    bottleneck = relationship("Bottleneck", back_populates="evidence")

class RootCauseHypothesis(Base):
    __tablename__ = "root_cause_hypotheses"
    id = Column(Integer, primary_key=True, index=True)
    bottleneck_id = Column(Integer, ForeignKey("bottlenecks.id"))
    hypothesis = Column(Text)
    confidence = Column(Float, default=1.0)

    bottleneck = relationship("Bottleneck", back_populates="root_causes")

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    bottleneck_id = Column(Integer, ForeignKey("bottlenecks.id"))
    priority = Column(Integer, default=1)
    action = Column(Text)
    owner = Column(String)
    deadline = Column(String)
    expected_outcome = Column(Text)
    expected_risk_reduction = Column(Float, default=0.0)
    approval_required = Column(Boolean, default=True)
    status = Column(String, default="Pending Approval")  # Pending Approval, Approved, Executed, Rejected

    bottleneck = relationship("Bottleneck", back_populates="recommendations")
    approvals = relationship("Approval", back_populates="recommendation", cascade="all, delete-orphan")
    executions = relationship("ActionExecution", back_populates="recommendation", cascade="all, delete-orphan")

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"))
    approver = Column(String)
    status = Column(String)  # Approved, Rejected, Modified
    reviewer_comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="approvals")

class ActionExecution(Base):
    __tablename__ = "action_executions"
    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"))
    action_type = Column(String)  # Jira, Slack, Email, Webhook
    status = Column(String, default="Pending")  # Pending, Executing, Success, Failed
    logs = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="executions")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    type = Column(String)  # SOP, SLA, Incident, Playbook
    meta_data = Column(JSON, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String, index=True)
    action_performed = Column(String)
    input_ref = Column(String, nullable=True)
    output_summary = Column(Text)
    status = Column(String)  # Success, Failure
    timestamp = Column(DateTime, default=datetime.utcnow)
    approver = Column(String, nullable=True)
    model_used = Column(String, nullable=True)
    latency = Column(Float, default=0.0)  # In seconds
    error_details = Column(Text, nullable=True)

class UserFeedback(Base):
    __tablename__ = "user_feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    bottleneck_id = Column(Integer, ForeignKey("bottlenecks.id"))
    is_valid = Column(Boolean, default=True)
    is_root_cause_correct = Column(Boolean, default=True)
    is_recommendation_useful = Column(Boolean, default=True)
    outcome_feedback = Column(Text, nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SystemConfig(Base):
    __tablename__ = "system_configs"
    id = Column(Integer, primary_key=True, index=True)
    sla_weight_customer = Column(Float, default=0.25)
    sla_weight_sla = Column(Float, default=0.20)
    sla_weight_delay = Column(Float, default=0.15)
    sla_weight_cost = Column(Float, default=0.15)
    sla_weight_revenue = Column(Float, default=0.15)
    sla_weight_scope = Column(Float, default=0.10)
    slack_webhook_url = Column(String, nullable=True)
    active_model = Column(String, default="gemini-1.5-pro")

