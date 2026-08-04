# Product Requirements Document (PRD) — OBottleAI

## 1. Executive Summary
Operational bottlenecks in software releases, support ticket resolution, vendor deliverables, and sprint execution are frequently detected late—after they cause SLA penalties, delay customer features, or increase operational costs. 

**OBottleAI** is an agentic platform designed to scan operational metrics, predict bottlenecks, isolate root causes using LLM reasoning (Gemini Pro), assess business impact, and suggest actionable mitigation tasks under a human-controlled approval loop.

## 2. Personas
- **Operations & Delivery Managers**: Needs clear warnings about SLA risk, estimated delay cost, and staff workload distribution.
- **Approvers / Directors**: Requires concrete reasoning, high-confidence evidence, and safe options before signing off on reassignments or rollbacks.
- **Analysts & Engineers**: Resolves the action items and updates the status of underlying issues.

## 3. Product Workflows
1. **Data Ingest**: Input raw developer logs, tickets, or telemetry. Normalise to database.
2. **Analysis Agent**: Compute deterministic cycle times.
3. **Detection Agent**: Alert on rule-based anomalies (e.g. queue sizes > 5, blocked tasks > 0).
4. **Root Cause Analysis (RAG + Gemini)**: Fetch SLA rules and SOPs, then generate hypotheses.
5. **Mitigation Recommendations**: Generate owner assignment proposals and deadliness.
6. **Human Gate**: Authorization checks for critical mitigations.
7. **Action Execution**: Call mock adapters for Jira ticket creations and Slack triggers.

## 4. Key Performance Objectives
- Proactive warning of delays (at least 2 days before SLA breach).
- Instant multi-agent root cause analysis report generation.
- Clear business-value translation (quantified delay days and financial risks).
