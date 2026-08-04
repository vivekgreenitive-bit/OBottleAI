# REST API Reference — OBottleAI

The OBottleAI backend server runs by default on port `8080` exposing REST endpoints.

## 1. System Health & Observability
- **GET `/health`**: Returns system liveliness state.
- **GET `/ready`**: Returns server readiness state.
- **GET `/metrics`**: Returns agent count, success records, and average response latency.

## 2. Connectors & Ingestion
- **POST `/api/v1/ingestions/sample?scenario={name}`**:
  - Seeds database records for a scenario (`release_delay`, `support_backlog`, `vendor_dependency`, `resource_overload`).
- **POST `/api/v1/ingestions/upload`**:
  - Ingests raw CSV file upload via multipart form-data.
- **GET `/api/v1/ingestions`**:
  - Lists all currently ingested operational records.

## 3. Diagnostic Runs & Analysis
- **POST `/api/v1/analysis/run?scenario_type={bias}`**:
  - Activates the multi-agent diagnostic cycle.
- **GET `/api/v1/bottlenecks`**:
  - Retrieves all active identified bottlenecks.
- **GET `/api/v1/bottlenecks/{id}`**:
  - Retrieves comprehensive metrics, evidence lists, root causes, and recommendations for a bottleneck.

## 4. Human Approval Queue
- **GET `/api/v1/approvals`**:
  - Lists all recommended actions awaiting authorization.
- **POST `/api/v1/approvals/{id}/approve`**:
  - Authorizes the action. Triggers task execution.
- **POST `/api/v1/approvals/{id}/reject`**:
  - Rejects the action.
