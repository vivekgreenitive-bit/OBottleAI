import os
import httpx
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.database import Base, engine, get_db
from app.models.models import Bottleneck, OperationalRecord
from app.schemas.schemas import DashboardStats
from app.analytics.analytics import OperationsAnalytics
from app.rag.rag_service import RAGService

# Service Routing configuration (Environment overrides for Docker Compose)
INGESTION_URL = os.getenv("INGESTION_SERVICE_URL", "http://localhost:8081")
ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_SERVICE_URL", "http://localhost:8082")
EXECUTION_URL = os.getenv("EXECUTION_SERVICE_URL", "http://localhost:8083")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="OBottleAI API Gateway",
    description="Central API Gateway routing requests to respective service containers",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database default SOPs
@app.on_event("startup")
def startup_event():
    db = next(get_db())
    RAGService.init_knowledge_base(db)

@app.get("/health")
def health():
    return {"status": "healthy", "gateway": "active", "timestamp": datetime.utcnow()}

@app.get("/ready")
def ready():
    return {"status": "ready"}

# Dashboard stats calculated directly via shared DB volume
@app.get("/api/v1/dashboard", response_model=DashboardStats)
def get_dashboard_data(batch_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    metrics = OperationsAnalytics.calculate_metrics(db, batch_id=batch_id)
    
    health_score = 100.0
    health_score -= metrics["overdue_count"] * 5
    health_score -= metrics["blocked_count"] * 10
    health_score -= metrics["sla_violations"] * 15
    health_score = max(min(health_score, 100.0), 0.0)

    b_query = db.query(Bottleneck).filter(Bottleneck.status == "Active")
    if batch_id:
        b_query = b_query.filter(Bottleneck.batch_id == batch_id)
    active_bottlenecks = b_query.all()
    
    severities = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for b in active_bottlenecks:
        severities[b.severity] = severities.get(b.severity, 0) + 1

    r_query = db.query(OperationalRecord)
    if batch_id:
        r_query = r_query.filter(OperationalRecord.batch_id == batch_id)
    records = r_query.all()
    
    sources = {}
    for r in records:
        sources[r.source] = sources.get(r.source, 0) + 1

    total_cost = sum([b.estimated_cost_impact for b in active_bottlenecks])
    total_delay = sum([b.estimated_delay_days for b in active_bottlenecks])

    return DashboardStats(
        operational_health_score=health_score,
        active_bottlenecks_count=len(active_bottlenecks),
        critical_bottlenecks_count=severities["critical"],
        predicted_sla_breaches=metrics["sla_violations"],
        affected_customers_count=sum([len(b.summary.split(",")) for b in active_bottlenecks]),
        estimated_delay_days=total_delay,
        estimated_cost_impact=total_cost,
        trend_summary="SLA breach risks elevated due to QA backlogs." if severities["critical"] > 0 else "All pipelines active.",
        severity_distribution=severities,
        source_distribution=sources
    )

# Dynamic Proxy Client
client = httpx.AsyncClient()

async def proxy_request(target_url: str, request: Request):
    """Generic reverse proxy forwarding request headers, params, and body payload."""
    url = f"{target_url}{request.url.path}"
    if request.url.query:
        url += f"?{request.url.query}"
        
    headers = dict(request.headers)
    # Host header must match destination to prevent validation errors
    headers.pop("host", None)
    
    req = client.build_request(
        method=request.method,
        url=url,
        headers=headers,
        content=await request.body()
    )
    
    resp = await client.send(req, stream=True)
    return StreamingResponse(
        resp.aiter_raw(),
        status_code=resp.status_code,
        headers=dict(resp.headers)
    )

# Routing Maps
@app.api_route("/api/v1/ingestions/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_ingestions(request: Request):
    return await proxy_request(INGESTION_URL, request)

@app.api_route("/api/v1/ingestions", methods=["GET", "POST"])
async def route_ingestions_root(request: Request):
    return await proxy_request(INGESTION_URL, request)

@app.api_route("/api/v1/analysis/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_orchestration(request: Request):
    return await proxy_request(ORCHESTRATOR_URL, request)

@app.api_route("/api/v1/bottlenecks/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_bottlenecks(request: Request):
    return await proxy_request(ORCHESTRATOR_URL, request)

@app.api_route("/api/v1/bottlenecks", methods=["GET"])
async def route_bottlenecks_root(request: Request):
    return await proxy_request(ORCHESTRATOR_URL, request)

@app.api_route("/api/v1/audit-logs", methods=["GET"])
async def route_audit_logs(request: Request):
    return await proxy_request(ORCHESTRATOR_URL, request)

@app.api_route("/api/v1/knowledge", methods=["GET"])
async def route_knowledge(request: Request):
    return await proxy_request(ORCHESTRATOR_URL, request)

@app.api_route("/api/v1/approvals/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_approvals(request: Request):
    return await proxy_request(EXECUTION_URL, request)

@app.api_route("/api/v1/approvals", methods=["GET"])
async def route_approvals_root(request: Request):
    return await proxy_request(EXECUTION_URL, request)

@app.api_route("/api/v1/actions/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_actions(request: Request):
    return await proxy_request(EXECUTION_URL, request)

@app.api_route("/api/v1/actions", methods=["GET"])
async def route_actions_root(request: Request):
    return await proxy_request(EXECUTION_URL, request)

@app.api_route("/api/v1/config", methods=["GET", "POST"])
async def route_config(request: Request):
    return await proxy_request(EXECUTION_URL, request)

@app.api_route("/api/v1/feedback", methods=["POST"])
async def route_feedback(request: Request):
    return await proxy_request(EXECUTION_URL, request)

