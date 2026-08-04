# Live Demo Presentation Script — OBottleAI (3 Minutes)

This script outlines how to present OBottleAI to the judges for the National Final in Bengaluru.

## 0:00 - 0:45: The Problem & Value Proposition
- **Speech**: *"Good afternoon judges. Today, operational bottlenecks—like resource overloads or blocked dependencies—are usually noticed after a release gets delayed or a customer files a complaint. OBottleAI solves this by finding, explaining, and resolving bottlenecks before they reach your customers."*
- **Action**: Open the UI to the **Data Pipeline** tab. Load **Scenario 1: Release Delay (QA Capacity)**. Point out the loaded raw database records representing tasks, assignees, and blocked flags.

## 0:45 - 1:30: Multi-Agent Analysis
- **Speech**: *"Let's run diagnostics. OBottleAI activates a multi-agent system. The Ingestion Agent redacts sensitive details; the Analytics Agent calculates cycle times; the Detection Agent flags overloaded QA resources; the RAG Agent fetches the team's SLA guides; and Gemini reasons on the root cause."*
- **Action**: Click **Trigger Diagnostic Cycle**. Show the step-by-step trace executing in the UI.

## 1:30 - 2:15: Deep Dive: Root Cause & Impact
- **Speech**: *"Our analysis is complete. Here, OBottleAI has identified a high-risk bottleneck: The Q3 Release is blocked because of a QA capacity limitation. The SLA risk is critical, with Acme Corp impacted and a potential cost of $15,000. Gemini has identified the root cause: Sarah Jenkins is assigned to 9 staging tasks, and she is the only person who can sign off on database migrations."*
- **Action**: Navigate to the **Operations Dashboard** and click the active alert to inspect the details panel.

## 2:15 - 3:00: Human-in-the-Loop Mitigations & Execution
- **Speech**: *"Instead of just alerting, we recommend actions. We propose reassigning sanity tests to Michael Chang to free up Sarah's time. Because this reassigns resources, it requires approval. I will authorize it."*
- **Action**: Go to the **Approval Gate** tab, click **Authorize**. Point out the success toast representing Slack and Jira updates, then open the **System Audit Logs** tab to show the fully logged audit trail.
- **Speech**: *"That is OBottleAI: Detect, Explain, and Resolve."*
