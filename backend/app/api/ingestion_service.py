import re
import csv
import io
import time
from typing import Optional
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.database import Base, engine, get_db
from app.models.models import OperationalRecord
from app.schemas.schemas import OperationalRecordResponse
from app.db.sample_data import seed_scenario_data

# Initialize schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OBottleAI Ingestion Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/ingestions/sample")
def load_sample(scenario: str = Query(...), db: Session = Depends(get_db)):
    try:
        seed_scenario_data(db, scenario)
        return {"status": "success", "message": f"Successfully loaded scenario: {scenario}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.core.gemini_provider import GeminiProvider

gemini_provider = GeminiProvider()

@app.post("/api/v1/ingestions/upload")
async def upload_file(file: UploadFile = File(...), source: str = Form("CSV_Upload"), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV uploads supported.")
        
    contents = await file.read()
    decoded = contents.decode('utf-8').strip()
    # Strip wrapping quotes around entire lines if exported with outer quotes
    cleaned_lines = []
    for line in decoded.splitlines():
        line_str = line.strip()
        if line_str.startswith('"') and line_str.endswith('"') and line_str.count('"') == 2:
            line_str = line_str[1:-1]
        cleaned_lines.append(line_str)
    cleaned_csv = "\n".join(cleaned_lines)
    
    reader = csv.DictReader(io.StringIO(cleaned_csv))
    headers = reader.fieldnames or []
    
    # Call Gemini LLM to map arbitrary column headers dynamically
    llm_map = gemini_provider.map_csv_headers(headers)
    
    records_count = 0
    now = datetime.utcnow()
    timestamp_str = now.strftime("%Y%m%d-%H%M%S")
    clean_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
    batch_id = f"BATCH-{timestamp_str}-{clean_filename}"
    
    try:
        def find_field(row: dict, target_name: str, fallback_keys: list, default=None):
            # 1. First check if Gemini LLM provided a direct header mapping
            if target_name in llm_map:
                mapped_header = llm_map[target_name]
                if mapped_header in row and row[mapped_header] is not None and str(row[mapped_header]).strip() != "":
                    return row[mapped_header]
            
            # 2. Fall back to heuristic dynamic matcher
            normalized_row = {str(k).lower().replace(" ", "").replace("_", "").replace("-", ""): v for k, v in row.items()}
            for k in fallback_keys:
                norm_k = k.lower().replace(" ", "").replace("_", "").replace("-", "")
                if norm_k in normalized_row:
                    val = normalized_row[norm_k]
                    if val is not None and str(val).strip() != "":
                        return val
            return default

        for row in reader:
            def parse_date(d_str):
                if not d_str: return None
                d_str = str(d_str).strip()
                for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                    try:
                        return datetime.strptime(d_str, fmt)
                    except:
                        continue
                return None
            
            def parse_float(val):
                if val is None:
                    return 0.0
                val_str = str(val).strip().lower()
                if val_str in ("yes", "true", "y", "t"):
                    return 1.0
                if val_str in ("no", "false", "n", "f", ""):
                    return 0.0
                try:
                    return float(val)
                except ValueError:
                    return 0.0
            
            raw_owner = find_field(row, "owner", ["owner", "assignee", "engineer", "person_assigned", "user", "lead", "resource"], "Unassigned")
            redacted_owner = re.sub(r'[\w\.-]+@[\w\.-]+', '[REDACTED_EMAIL]', str(raw_owner))
            
            record = OperationalRecord(
                batch_id=batch_id,
                source=source,
                entity_type=find_field(row, "entity_type", ["entity_type", "type", "kind", "issue_type"], "task"),
                entity_id=find_field(row, "entity_id", ["entity_id", "id", "issue_key", "ticket_id", "key", "number", "code"], f"TASK-{int(time.time())}-{records_count}"),
                project=find_field(row, "project", ["project", "project_name", "module", "system", "component", "application"], "Default"),
                task_name=find_field(row, "task_name", ["task_name", "summary", "title", "name", "subject", "description", "issue_summary", "work_item", "headline", "task"], "Ingested Task"),
                owner=redacted_owner,
                team=find_field(row, "team", ["team", "group", "department", "org", "squad"], "Unassigned"),
                status=find_field(row, "status", ["status", "state", "progress", "stage"], "To Do"),
                priority=find_field(row, "priority", ["priority", "severity", "urgency", "impact"], "medium"),
                created_date=parse_date(find_field(row, "created_date", ["created_date", "created", "created_at", "open_date", "start_date"])) or now,
                due_date=parse_date(find_field(row, "due_date", ["due_date", "due", "due_at", "deadline", "target_date"])),
                completed_date=parse_date(find_field(row, "completed_date", ["completed_date", "completed", "completed_at", "resolved", "resolved_at", "finish_date"])),
                dependencies=find_field(row, "dependencies", ["dependencies", "depends_on", "dependency", "blocker", "blocked_by"]),
                estimated_effort=parse_float(find_field(row, "estimated_effort", ["estimated_effort", "estimated", "effort", "story_points", "estimate", "estimated_hours"])),
                actual_effort=parse_float(find_field(row, "actual_effort", ["actual_effort", "actual", "time_spent", "actual_hours"])),
                blocked_duration=parse_float(find_field(row, "blocked_duration", ["blocked_duration", "blocked", "blocked_time", "blocked_days", "days_open", "delay_days"])),
                customer=find_field(row, "customer", ["customer", "client", "company", "account"]),
                revenue_impact=parse_float(find_field(row, "revenue_impact", ["revenue_impact", "revenue", "financial_impact"])),
                cost_impact=parse_float(find_field(row, "cost_impact", ["cost_impact", "cost", "risk_cost"]))
            )
            db.add(record)
            records_count += 1
            
        db.commit()
        return {"status": "success", "batch_id": batch_id, "message": f"Successfully ingested {records_count} operational records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

from app.schemas.schemas import WebhookIngestRequest

@app.post("/api/v1/ingestions/webhook")
async def ingest_webhook(payload: WebhookIngestRequest, db: Session = Depends(get_db)):
    if not payload.records:
        raise HTTPException(status_code=400, detail="No records provided in webhook payload.")
        
    now = datetime.utcnow()
    timestamp_str = now.strftime("%Y%m%d-%H%M%S")
    source_clean = re.sub(r'[^a-zA-Z0-9._-]', '_', payload.source_name or "Webhook")
    batch_id = f"BATCH-{timestamp_str}-{source_clean}"
    
    records_count = 0
    try:
        def parse_date_str(d_str):
            if not d_str: return None
            d_str = str(d_str).strip()
            for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                try:
                    return datetime.strptime(d_str, fmt)
                except:
                    continue
            return None

        for item in payload.records:
            records_count += 1
            rec_id = item.entity_id or f"WH-{int(time.time())}-{records_count}"
            redacted_owner = re.sub(r'[\w\.-]+@[\w\.-]+', '[REDACTED_EMAIL]', str(item.owner or "Unassigned"))
            
            record = OperationalRecord(
                batch_id=batch_id,
                source=f"External REST API: {source_clean}",
                entity_type="task",
                entity_id=rec_id,
                project=item.project or "Default",
                task_name=item.task_name or f"Live Ingested Task {records_count}",
                owner=redacted_owner,
                team=item.team or "Engineering",
                status=item.status or "In Progress",
                priority=item.priority or "Medium",
                created_date=parse_date_str(item.created_date) or now,
                due_date=parse_date_str(item.due_date),
                blocked_duration=item.blocked_duration or 0.0,
                customer=item.customer or "External System"
            )
            db.add(record)
            
        db.commit()
        return {
            "status": "success",
            "batch_id": batch_id,
            "message": f"Successfully ingested {records_count} operational records from external source '{source_clean}'."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Webhook ingestion failed: {str(e)}")

@app.get("/api/v1/ingestions/batches")
def get_batches(db: Session = Depends(get_db)):
    records = db.query(OperationalRecord.batch_id, OperationalRecord.source, OperationalRecord.created_date).all()
    batches_map = {}
    for r in records:
        b_id = r.batch_id or "default"
        if b_id not in batches_map:
            batches_map[b_id] = {
                "batch_id": b_id,
                "source": r.source,
                "record_count": 0,
                "created_date": r.created_date.isoformat() if r.created_date else None
            }
        batches_map[b_id]["record_count"] += 1
    return list(batches_map.values())

@app.get("/api/v1/ingestions", response_model=list[OperationalRecordResponse])
def get_ingested_records(batch_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(OperationalRecord)
    if batch_id:
        query = query.filter(OperationalRecord.batch_id == batch_id)
    return query.all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
