#!/bin/bash
# OBottleAI Master Startup & Health Script

echo "=================================================="
echo "   OBottleAI Master Multi-Service Starter"
echo "=================================================="

# 1. Kill any existing instances on target ports
echo "[1/4] Stopping stale server instances..."
pkill -9 -f uvicorn 2>/dev/null || true
pkill -9 -f vite 2>/dev/null || true
sleep 1

# 2. Activate Python Virtual Environment & Start FastAPI Backend Microservices
echo "[2/4] Launching FastAPI Microservices (Gateway: 8080)..."
source backend/venv/bin/activate

(cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8080 > ../backend_gateway.log 2>&1 &)
(cd backend && uvicorn app.api.ingestion_service:app --host 0.0.0.0 --port 8081 > ../backend_ingestion.log 2>&1 &)
(cd backend && uvicorn app.api.orchestrator_service:app --host 0.0.0.0 --port 8082 > ../backend_orchestrator.log 2>&1 &)
(cd backend && uvicorn app.api.execution_service:app --host 0.0.0.0 --port 8083 > ../backend_execution.log 2>&1 &)

sleep 3

# 3. Start Frontend Server
echo "[3/4] Launching Frontend Server (Port: 5173)..."
if [ -d "frontend/dist" ]; then
  (cd frontend/dist && python3 -m http.server 5173 --bind 0.0.0.0 > ../../frontend_dev.log 2>&1 &)
else
  (cd frontend && npx vite --port 5173 --host 0.0.0.0 > ../frontend_dev.log 2>&1 &)
fi
sleep 2

# 4. Perform Health Check Verification
echo "[4/4] Verifying Service Health Status..."
GATEWAY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/dashboard)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/)

echo "--------------------------------------------------"
if [ "$GATEWAY_STATUS" = "200" ]; then
  echo "✅ FastAPI Backend Gateway (8080) : HEALTHY (HTTP 200)"
else
  echo "❌ FastAPI Backend Gateway (8080) : UNHEALTHY (HTTP $GATEWAY_STATUS)"
fi

if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "✅ Vite Frontend Server (5173)   : HEALTHY (HTTP 200)"
else
  echo "❌ Vite Frontend Server (5173)   : UNHEALTHY (HTTP $FRONTEND_STATUS)"
fi
echo "--------------------------------------------------"
echo "🚀 OBottleAI Platform Ready at: http://localhost:5173/#/analysis"
echo "=================================================="
