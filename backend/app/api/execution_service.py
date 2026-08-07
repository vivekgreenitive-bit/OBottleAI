from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.db.database import Base, engine, get_db
from app.models.models import Recommendation, Approval, ActionExecution, SystemConfig, UserFeedback, Bottleneck
from app.schemas.schemas import (
    ApprovalRequest, ApprovalResponse, ActionExecutionResponse,
    SystemConfigCreate, SystemConfigResponse, UserFeedbackCreate
)
from app.agents.agents import ActionExecutionAgent

# Initialize schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OBottleAI Execution Service", version="1.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

action_executor = ActionExecutionAgent()

@app.get("/api/v1/approvals")
def get_pending_approvals(batch_id: Optional[str] = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(Recommendation).filter(Recommendation.status == "Pending Approval")
    if batch_id and batch_id not in ('ALL', 'NONE', ''):
        query = query.join(Bottleneck).filter(Bottleneck.batch_id == batch_id)
        
    recs = query.all()
    results = []
    for r in recs:
        results.append({
            "id": r.id,
            "bottleneck_title": r.bottleneck.title if r.bottleneck else "Operational Risk",
            "action": r.action,
            "owner": r.owner,
            "deadline": r.deadline,
            "expected_outcome": r.expected_outcome,
            "expected_risk_reduction": r.expected_risk_reduction,
            "priority": r.priority
        })
    return results

@app.post("/api/v1/approvals/{id}/approve", response_model=ApprovalResponse)
def approve_action(id: int, req: ApprovalRequest, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")
        
    rec.status = "Approved"
    
    approval = Approval(
        recommendation_id=rec.id,
        approver=req.approver,
        status="Approved",
        reviewer_comments=req.reviewer_comments,
        timestamp=datetime.utcnow()
    )
    db.add(approval)
    db.flush()
    
    action_executor.execute(rec, db)
    
    db.commit()
    return approval

@app.post("/api/v1/approvals/{id}/reject", response_model=ApprovalResponse)
def reject_action(id: int, req: ApprovalRequest, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")
        
    rec.status = "Rejected"
    
    approval = Approval(
        recommendation_id=rec.id,
        approver=req.approver,
        status="Rejected",
        reviewer_comments=req.reviewer_comments,
        timestamp=datetime.utcnow()
    )
    db.add(approval)
    db.commit()
    return approval

@app.post("/api/v1/approvals/{id}/modify")
def modify_action(id: int, action: str = Query(...), owner: str = Query(...), db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")
        
    rec.action = action
    rec.owner = owner
    rec.status = "Pending Approval"
    db.commit()
    return {"status": "success", "message": "Recommendation parameters modified."}

@app.get("/api/v1/actions", response_model=List[ActionExecutionResponse])
def get_executed_actions(db: Session = Depends(get_db)):
    return db.query(ActionExecution).all()

@app.get("/api/v1/config", response_model=SystemConfigResponse)
def get_config(db: Session = Depends(get_db)):
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@app.post("/api/v1/config", response_model=SystemConfigResponse)
def update_config(req: SystemConfigCreate, db: Session = Depends(get_db)):
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)
    
    config.sla_weight_customer = req.sla_weight_customer
    config.sla_weight_sla = req.sla_weight_sla
    config.sla_weight_delay = req.sla_weight_delay
    config.sla_weight_cost = req.sla_weight_cost
    config.sla_weight_revenue = req.sla_weight_revenue
    config.sla_weight_scope = req.sla_weight_scope
    config.slack_webhook_url = req.slack_webhook_url
    config.active_model = req.active_model
    
    db.commit()
    db.refresh(config)
    return config

@app.post("/api/v1/feedback")
def submit_feedback(req: UserFeedbackCreate, db: Session = Depends(get_db)):
    fb = UserFeedback(
        bottleneck_id=req.bottleneck_id,
        is_valid=req.is_valid,
        is_root_cause_correct=req.is_root_cause_correct,
        is_recommendation_useful=req.is_recommendation_useful,
        outcome_feedback=req.outcome_feedback,
        reviewer_comments=req.reviewer_comments
    )
    db.add(fb)
    db.commit()
    return {"status": "success", "message": "Feedback submitted successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8083)

