# OBottleAI — Operational Bottleneck Detection AI

OBottleAI is a proactive agentic operations platform designed to detect workflow delays, blocked dependencies, SLA breaches, and workload imbalances before they impact delivery targets. The platform utilizes deterministic Python calculations combined with Google Gemini reasoning to explain root causes and recommend actionable mitigations.

## Repository Structure

```
OBottleAI/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints mapping
│   │   ├── agents/         # Data Analysis, Bottleneck Detection, Root Cause, Impact, Rec agents
│   │   ├── analytics/      # Deterministic mathematical engine
│   │   ├── db/             # Database model definitions & seeder scripts
│   │   ├── core/           # Gemini provider integration and configurations
│   │   ├── rag/            # Grounded vector search context
│   │   └── workflows/      # Multi-agent orchestrator lifecycle
│   ├── test_backend.py     # Backend validation tests
│   └── venv/               # Local virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/     # UI screens (Dashboard, Orchestrator, Approvals, Ingestion, Audit)
│   │   ├── context/        # Shared state context manager
│   │   ├── styles/         # Global custom glassmorphism styles
│   │   ├── App.tsx         # Main entry controller
│   │   └── main.tsx        # React mounting script
│   └── package.json
└── README.md
```

## Getting Started

### 1. Backend Server Setup
From the `backend/` directory:
```bash
# Create virtual environment (already set up in workspace)
python3 -m venv venv
source venv/bin/activate

# Install dependencies (already set up in workspace)
pip install fastapi uvicorn pydantic sqlalchemy google-generativeai python-multipart

# Execute the test suite
python3 test_backend.py

# Run the backend FastAPI server
uvicorn app.main:app --port 8080 --host 0.0.0.0
```

### 2. Frontend Dashboard Setup
From the `frontend/` directory:
```bash
# Install dependencies (already set up in workspace)
npm install

# Start the Vite React development server
npm run dev
```
Open `http://localhost:5173/` in your browser.

## Configuration & Environment Variables
If you wish to run the reasoning agent using live Gemini API calls, set the following environment variables:
```bash
export GEMINI_API_KEY="your_api_key_here"
export GEMINI_MODEL="gemini-1.5-pro"
```
*Note: If no API key is provided, the backend automatically falls back to an intelligent, high-fidelity mock reasoning generator, ensuring the demo works flawlessly offline or without credentials.*

## Live Hackathon Demo Flow (3 Minutes)
1. **Ingest Data**: Go to the **Data Pipeline** tab, choose one of the four scenarios (e.g. *Release Delay* or *Support Backlog*), and click to load.
2. **Execute Diagnostics**: Go to the **Agent Orchestration** tab, select your scenario and click **Trigger Diagnostic Cycle**. Watch each agent execute in the trace panel.
3. **Inspect Root Cause**: View the generated bottleneck card. Read the *Root Cause Hypothesis* and the *Business Impact* metrics.
4. **Mitigate & Approve**: Go to the **Approval Gate** tab, verify the recommended action, add comments, and click **Authorize**.
5. **Audit Trail**: View the executed steps in the **System Audit Logs** tab.
