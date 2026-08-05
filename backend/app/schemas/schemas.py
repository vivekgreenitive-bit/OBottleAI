from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class OperationalRecordCreate(BaseModel):
    source: str
    entity_type: str
    entity_id: str
    project: str
    task_name: str
    owner: str
    team: str
    status: str
    priority: str
    created_date: datetime
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    dependencies: Optional[str] = None
    sla_target: Optional[datetime] = None
    sla_status: Optional[str] = None
    customer: Optional[str] = None
    estimated_effort: float = 0.0
    actual_effort: float = 0.0
    blocked_duration: float = 0.0
    customer_impact: Optional[str] = None
    revenue_impact: float = 0.0
    cost_impact: float = 0.0
    meta_data: Optional[Dict[str, Any]] = None

class OperationalRecordResponse(OperationalRecordCreate):
    id: int
    batch_id: Optional[str] = None

    class Config:
        from_attributes = True

class RecommendationResponse(BaseModel):
    id: int
    bottleneck_id: int
    priority: int
    action: str
    owner: str
    deadline: str
    expected_outcome: str
    expected_risk_reduction: float
    approval_required: bool
    status: str

    class Config:
        from_attributes = True

class BottleneckEvidenceResponse(BaseModel):
    id: int
    details: str

    class Config:
        from_attributes = True

class RootCauseHypothesisResponse(BaseModel):
    id: int
    hypothesis: str
    confidence: float

    class Config:
        from_attributes = True

class BottleneckResponse(BaseModel):
    id: int
    batch_id: Optional[str] = None
    title: str
    summary: str
    process: str
    severity: str
    impact_score: float
    confidence: float
    estimated_delay_days: int
    estimated_cost_impact: float
    sla_risk: str
    status: str
    detected_time: datetime
    evidence: List[BottleneckEvidenceResponse] = []
    root_causes: List[RootCauseHypothesisResponse] = []
    recommendations: List[RecommendationResponse] = []

    class Config:
        from_attributes = True

class ApprovalRequest(BaseModel):
    approver: str
    status: str  # Approved, Rejected, Modified
    reviewer_comments: Optional[str] = None

class ApprovalResponse(BaseModel):
    id: int
    recommendation_id: int
    approver: str
    status: str
    reviewer_comments: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class ActionExecutionResponse(BaseModel):
    id: int
    recommendation_id: int
    action_type: str
    status: str
    logs: Optional[str]
    executed_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    agent_name: str
    action_performed: str
    input_ref: Optional[str]
    output_summary: str
    status: str
    timestamp: datetime
    approver: Optional[str]
    model_used: Optional[str]
    latency: float
    error_details: Optional[str]

    class Config:
        from_attributes = True

class UserFeedbackCreate(BaseModel):
    bottleneck_id: int
    is_valid: bool
    is_root_cause_correct: bool
    is_recommendation_useful: bool
    outcome_feedback: Optional[str] = None
    reviewer_comments: Optional[str] = None

class DashboardStats(BaseModel):
    operational_health_score: float
    active_bottlenecks_count: int
    critical_bottlenecks_count: int
    predicted_sla_breaches: int
    affected_customers_count: int
    estimated_delay_days: int
    estimated_cost_impact: float
    trend_summary: str
    severity_distribution: Dict[str, int]
    source_distribution: Dict[str, int]

class KnowledgeDocumentCreate(BaseModel):
    title: str
    content: str
    type: str  # SOP, SLA, Incident, Playbook
    meta_data: Optional[Dict[str, Any]] = None

class KnowledgeDocumentResponse(KnowledgeDocumentCreate):
    id: int

    class Config:
        from_attributes = True

class SystemConfigCreate(BaseModel):
    sla_weight_customer: float = 0.25
    sla_weight_sla: float = 0.20
    sla_weight_delay: float = 0.15
    sla_weight_cost: float = 0.15
    sla_weight_revenue: float = 0.15
    sla_weight_scope: float = 0.10
    slack_webhook_url: Optional[str] = None
    active_model: str = "gemini-1.5-pro"

class SystemConfigResponse(SystemConfigCreate):
    id: int

    class Config:
        from_attributes = True

