from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.database import Base, engine, get_db
from app.models.models import Bottleneck, AuditLog, KnowledgeDocument
from app.schemas.schemas import BottleneckResponse, AuditLogResponse, KnowledgeDocumentResponse
from app.workflows.orchestrator import WorkflowOrchestrator
from app.rag.rag_service import RAGService

# Initialize schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OBottleAI Orchestrator Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = WorkflowOrchestrator()

@app.post("/api/v1/analysis/run")
def run_analysis(scenario_type: Optional[str] = Query(None), batch_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    try:
        results = orchestrator.run_diagnostics(db, scenario_type=scenario_type, batch_id=batch_id)
        return {"status": "success", "message": f"Diagnostics completed. Generated {len(results)} bottlenecks."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagnostic runner failed: {str(e)}")

@app.get("/api/v1/bottlenecks", response_model=List[BottleneckResponse])
def get_bottlenecks(batch_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Bottleneck)
    if batch_id:
        query = query.filter(Bottleneck.batch_id == batch_id)
    return query.all()

@app.get("/api/v1/bottlenecks/{id}", response_model=BottleneckResponse)
def get_bottleneck(id: int, db: Session = Depends(get_db)):
    bottleneck = db.query(Bottleneck).filter(Bottleneck.id == id).first()
    if not bottleneck:
        raise HTTPException(status_code=404, detail="Bottleneck not found.")
    return bottleneck

@app.get("/api/v1/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()

@app.get("/api/v1/knowledge", response_model=List[KnowledgeDocumentResponse])
def get_knowledge_docs(db: Session = Depends(get_db)):
    return db.query(KnowledgeDocument).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)
