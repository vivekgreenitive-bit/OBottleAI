# Security & Governance Model — OBottleAI

OBottleAI implements security abstractions to ensure data integrity and governance compliance.

## 1. Role-Based Access Control (RBAC)
The application defines five security roles:
- **Viewer**: Read-only access to dashboards and metrics.
- **Analyst**: Access to data connections and pipeline configs.
- **Operations Manager**: Triggers diagnostic cycles and reviews root cause analyses.
- **Approver**: Reviews, modifies, authorizes, or rejects recommended mitigations.
- **Administrator**: Complete control over configurations and thresholds.

## 2. Data Protection & PII Redaction
- During ingestion, data rows are passed through a redaction filter. 
- Email addresses and access tokens detected inside text blocks (e.g. Owner name or summaries) are replaced with `[REDACTED_EMAIL]` tokens before write storage.

## 3. LLM Safety Bounds
- Prompt patterns are structured using strict schemas (`pydantic` validations) to avoid prompt injection attempts.
- No direct retraining is executed dynamically from raw customer feedback to prevent data poisoning.
- Sensitive external actions (like rolling back gateways or reassigning tickets) require human approval by default before calling outbound webhooks.
