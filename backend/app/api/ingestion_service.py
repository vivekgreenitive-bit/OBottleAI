import re
import csv
import io
import time
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

@app.post("/api/v1/ingestions/upload")
async def upload_file(file: UploadFile = File(...), source: str = Form("CSV_Upload"), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV uploads supported.")
        
    contents = await file.read()
    decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    records_count = 0
    now = datetime.utcnow()
    
    try:
        # Helper to look up key dynamically (case-insensitive, ignoring underscores/spaces/hyphens)
        def find_field(row: dict, keys: list, default=None):
            normalized_row = {str(k).lower().replace(" ", "").replace("_", "").replace("-", ""): v for k, v in row.items()}
            for k in keys:
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
            
            raw_owner = find_field(row, ["owner", "assignee"], "Unassigned")
            redacted_owner = re.sub(r'[\w\.-]+@[\w\.-]+', '[REDACTED_EMAIL]', str(raw_owner))
            
            record = OperationalRecord(
                source=source,
                entity_type=find_field(row, ["entity_type", "type"], "task"),
                entity_id=find_field(row, ["entity_id", "id", "issue_key", "ticket_id", "key"], f"TASK-{int(time.time())}-{records_count}"),
                project=find_field(row, ["project", "project_name"], "Default"),
                task_name=find_field(row, ["task_name", "summary", "title", "name", "subject"], "Ingested Task"),
                owner=redacted_owner,
                team=find_field(row, ["team", "group", "department"], "Unassigned"),
                status=find_field(row, ["status", "state"], "To Do"),
                priority=find_field(row, ["priority", "severity"], "medium"),
                created_date=parse_date(find_field(row, ["created_date", "created", "created_at"])) or now,
                due_date=parse_date(find_field(row, ["due_date", "due", "due_at", "deadline"])),
                completed_date=parse_date(find_field(row, ["completed_date", "completed", "completed_at", "resolved", "resolved_at"])),
                dependencies=find_field(row, ["dependencies", "depends_on", "dependency"]),
                estimated_effort=float(find_field(row, ["estimated_effort", "estimated", "effort", "story_points", "estimate"], 0.0) or 0.0),
                actual_effort=float(find_field(row, ["actual_effort", "actual", "time_spent"], 0.0) or 0.0),
                blocked_duration=float(find_field(row, ["blocked_duration", "blocked", "blocked_time", "blocked_days"], 0.0) or 0.0),
                revenue_impact=float(find_field(row, ["revenue_impact", "revenue"], 0.0) or 0.0),
                cost_impact=float(find_field(row, ["cost_impact", "cost"], 0.0) or 0.0)
            )
            db.add(record)
            records_count += 1
            
        db.commit()
        return {"status": "success", "message": f"Successfully ingested {records_count} operational records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.get("/api/v1/ingestions", response_model=list[OperationalRecordResponse])
def get_ingested_records(db: Session = Depends(get_db)):
    return db.query(OperationalRecord).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
