# Graph Report - .  (2026-08-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 300 nodes · 651 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e9f3bdc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- WorkflowOrchestrator
- App.tsx
- execution_service.py
- compilerOptions
- main.py
- devDependencies
- compilerOptions
- package.json
- seed_scenario_data
- orchestrator_service.py
- .generate_structured
- .init_knowledge_base
- .calculate_metrics
- tsconfig.json
- db_session

## God Nodes (most connected - your core abstractions)
1. `WorkflowOrchestrator` - 23 edges
2. `GeminiProvider` - 21 edges
3. `RAGService` - 18 edges
4. `compilerOptions` - 18 edges
5. `ActionExecutionAgent` - 17 edges
6. `OperationalRecord` - 17 edges
7. `Bottleneck` - 17 edges
8. `SystemConfig` - 17 edges
9. `useSystem()` - 17 edges
10. `proxy_request()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ActionItemSchema` --uses--> `OperationsAnalytics`  [INFERRED]
  backend/app/agents/agents.py → backend/app/analytics/analytics.py
- `ActionItemSchema` --uses--> `GeminiProvider`  [INFERRED]
  backend/app/agents/agents.py → backend/app/core/gemini_provider.py
- `ActionItemSchema` --uses--> `ActionExecution`  [INFERRED]
  backend/app/agents/agents.py → backend/app/models/models.py
- `ActionItemSchema` --uses--> `AuditLog`  [INFERRED]
  backend/app/agents/agents.py → backend/app/models/models.py
- `ActionItemSchema` --uses--> `Bottleneck`  [INFERRED]
  backend/app/agents/agents.py → backend/app/models/models.py

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "WorkflowOrchestrator"
Cohesion: 0.14
Nodes (39): ActionExecutionAgent, ActionItemSchema, BottleneckDetectionAgent, BusinessImpactAgent, DataAnalysisAgent, GeminiOrchestratorSchema, BaseModel, Uses Gemini to explain the root causes of the bottleneck. (+31 more)

### Community 1 - "App.tsx"
Cohesion: 0.10
Nodes (30): App(), hashToTab, tabToHash, ActionRecord, Actions(), formatExecutionTime(), AuditLogs(), Dashboard() (+22 more)

### Community 2 - "execution_service.py"
Cohesion: 0.16
Nodes (29): approve_action(), get_config(), get_executed_actions(), get_pending_approvals(), modify_action(), get, post, Session (+21 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 4 - "main.py"
Cohesion: 0.25
Nodes (22): api_route, get_dashboard_data(), health(), proxy_request(), get, Session, Generic reverse proxy forwarding request headers, params, and body payload., ready() (+14 more)

### Community 5 - "devDependencies"
Cohesion: 0.09
Nodes (22): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, devDependencies, oxlint, @types/node (+14 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, lucide-react, react, react-dom, recharts, name, private, scripts (+10 more)

### Community 8 - "seed_scenario_data"
Cohesion: 0.23
Nodes (11): get_batches(), get_ingested_records(), load_sample(), get, post, Session, upload_file(), Session (+3 more)

### Community 9 - "orchestrator_service.py"
Cohesion: 0.35
Nodes (10): get_audit_logs(), get_bottleneck(), get_bottlenecks(), get_knowledge_docs(), get, post, Session, Streams real-time agent execution progress to the frontend EventSource listener. (+2 more)

### Community 10 - ".generate_structured"
Cohesion: 0.24
Nodes (6): BaseModel, Uses Gemini LLM to map arbitrary Excel/CSV column headers to standardized…, Cleans markdown backticks from JSON string if any., Dynamically analyzes the operational prompt text and generates structured…, Multi-Agent Tiered Architecture: - Tier 1: Vertex AI / Google AI Studio (Gemini…, Queries local Ollama inference server if running.

### Community 11 - ".init_knowledge_base"
Cohesion: 0.18
Nodes (8): get_db(), startup_event(), Any, Session, Pre-populates the database with default SOPs/SLA guidelines if empty., Performs keyword-based retrieval on operational knowledge documents. This…, test_rag_initialization(), on_event

### Community 12 - ".calculate_metrics"
Cohesion: 0.22
Nodes (6): Any, Session, Any, Session, Calculates cycle times, queue sizes, overdue indicators, and workload…, test_scenario_seeding_and_analytics()

## Knowledge Gaps
- **74 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GeminiProvider` connect `WorkflowOrchestrator` to `seed_scenario_data`, `.generate_structured`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `plugins` connect `devDependencies` to `App.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `WorkflowOrchestrator` (e.g. with `BottleneckDetectionAgent` and `BusinessImpactAgent`) actually correct?**
  _`WorkflowOrchestrator` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `GeminiProvider` (e.g. with `ActionExecutionAgent` and `ActionItemSchema`) actually correct?**
  _`GeminiProvider` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `RAGService` (e.g. with `ActionExecutionAgent` and `ActionItemSchema`) actually correct?**
  _`RAGService` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `ActionExecutionAgent` (e.g. with `OperationsAnalytics` and `GeminiProvider`) actually correct?**
  _`ActionExecutionAgent` has 9 INFERRED edges - model-reasoned connections that need verification._