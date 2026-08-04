from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import OperationalRecord

def seed_scenario_data(db: Session, scenario: str):
    """Seeds the database with operational records corresponding to the selected scenario."""
    # Clear existing operational records first to allow clean scenario swaps
    db.query(OperationalRecord).delete()
    db.commit()

    now = datetime.utcnow()
    records = []

    if scenario == "release_delay":
        # Scenario 1: Release Delay
        # Blocked PLAT-882 dependency & overloaded QA (Sarah Jenkins)
        # Target Customer: Acme Corp, GlobalTech (Premium Tier)
        
        # Blocked DB Migration task
        records.append(OperationalRecord(
            source="Jira", entity_type="task", entity_id="PLAT-882",
            project="Core Platform", task_name="Run database migration scripts v2.4",
            owner="David Vance", team="Platform Core", status="In Progress", priority="high",
            created_date=now - timedelta(days=5),
            due_date=now - timedelta(days=1), # Overdue
            customer="Acme Corp", estimated_effort=8.0, actual_effort=12.0,
            blocked_duration=0.0
        ))
        
        # Blocked QA tasks waiting on PLAT-882
        for i in range(1, 5):
            records.append(OperationalRecord(
                source="Jira", entity_type="task", entity_id=f"QA-{100+i}",
                project="App Release", task_name=f"Verify billing flow checkout patch - Part {i}",
                owner="Sarah Jenkins", team="QA Team", status="Blocked", priority="critical",
                created_date=now - timedelta(days=3),
                due_date=now + timedelta(days=2),
                dependencies="PLAT-882",
                sla_target=now + timedelta(days=1),
                sla_status="At Risk",
                customer="Acme Corp", estimated_effort=4.0, actual_effort=0.0,
                blocked_duration=2.5 # Blocked for 2.5 days
            ))
            
        # Overloaded QA staging tasks assigned to Sarah
        for i in range(5, 10):
            records.append(OperationalRecord(
                source="Jira", entity_type="task", entity_id=f"QA-{100+i}",
                project="App Release", task_name=f"Verify security module patch - Part {i}",
                owner="Sarah Jenkins", team="QA Team", status="In Progress", priority="medium",
                created_date=now - timedelta(days=2),
                due_date=now + timedelta(days=3),
                customer="GlobalTech", estimated_effort=2.0, actual_effort=1.5,
                blocked_duration=0.0
            ))
            
    elif scenario == "support_backlog":
        # Scenario 2: Support Backlog
        # Auth token timeout spike, support queues overflow
        
        # Session token ticket
        records.append(OperationalRecord(
            source="GitHub", entity_type="PR", entity_id="PR-942",
            project="Auth Service", task_name="Implement API Gateway token cache validation",
            owner="Security Lead", team="SecOps", status="Merged", priority="high",
            created_date=now - timedelta(days=3),
            completed_date=now - timedelta(days=2),
            estimated_effort=6.0, actual_effort=8.0
        ))
        
        # Flooded support queue tickets
        for i in range(1, 15):
            records.append(OperationalRecord(
                source="support_tickets", entity_type="ticket", entity_id=f"SUP-{500+i}",
                project="Customer Support", task_name=f"User session disconnected after checkout - Issue {i}",
                owner="Support Agent A" if i % 2 == 0 else "Support Agent B",
                team="Tier-2 Support", status="Open", priority="high",
                created_date=now - timedelta(hours=i * 2),
                due_date=now + timedelta(hours=4),
                sla_target=now - timedelta(hours=2) if i < 5 else now + timedelta(hours=2), # First few breached
                sla_status="Breached" if i < 5 else "At Risk",
                customer="SaaSify Inc" if i % 3 == 0 else "Apex Global",
                blocked_duration=0.0
            ))
            
    elif scenario == "vendor_dependency":
        # Scenario 3: Vendor Dependency
        # SDK overdue by PayGate Co, blocking checkout redesign
        
        # Overdue SDK Deliverable from vendor
        records.append(OperationalRecord(
            source="CRM", entity_type="task", entity_id="VND-80",
            project="Vendor Mgmt", task_name="Receive final Sandbox PayGate Co SDK v3",
            owner="Partner Mgr", team="Partner Mgmt", status="Overdue", priority="high",
            created_date=now - timedelta(days=15),
            due_date=now - timedelta(days=5), # 5 days overdue
            customer="All Users", estimated_effort=0.0, actual_effort=0.0,
            blocked_duration=5.0
        ))
        
        # Blocked internal feature tickets
        for task_id in ["PAY-401", "PAY-402", "PAY-405"]:
            records.append(OperationalRecord(
                source="Jira", entity_type="task", entity_id=task_id,
                project="Checkout Integration", task_name=f"Integrate PayGate SDK to checkout flow: {task_id}",
                owner="Dev Lead", team="Checkout Dev", status="Blocked", priority="high",
                created_date=now - timedelta(days=6),
                due_date=now + timedelta(days=4),
                dependencies="VND-80",
                sla_target=now + timedelta(days=2),
                sla_status="At Risk",
                customer="Merchant Group B", estimated_effort=5.0, actual_effort=0.0,
                blocked_duration=4.0
            ))
            
    else:
        # Scenario 4: Resource Overload (Default)
        # Backend Lead Alex Mercer owns too many critical sprint tasks
        
        # 12 active tasks assigned to Alex
        for i in range(1, 13):
            records.append(OperationalRecord(
                source="Jira", entity_type="task", entity_id=f"BACK-{300+i}",
                project="Sprint 14", task_name=f"Implement backend controller interface - Part {i}",
                owner="Alex Mercer", team="Backend Core", status="In Progress", priority="high" if i < 4 else "medium",
                created_date=now - timedelta(days=i),
                due_date=now + timedelta(days=3),
                customer="New Subscriptions Group", estimated_effort=3.0, actual_effort=2.0
            ))
            
        # Unallocated team members for comparison
        records.append(OperationalRecord(
            source="Jira", entity_type="task", entity_id="BACK-320",
            project="Sprint 14", task_name="Write Swagger API documentation",
            owner="David Vance", team="Backend Core", status="In Progress", priority="low",
            created_date=now - timedelta(days=1),
            due_date=now + timedelta(days=5)
        ))
        records.append(OperationalRecord(
            source="Jira", entity_type="task", entity_id="BACK-321",
            project="Sprint 14", task_name="Refactor logger models",
            owner="Michael Chang", team="Backend Core", status="In Progress", priority="low",
            created_date=now - timedelta(days=1),
            due_date=now + timedelta(days=5)
        ))

    for rec in records:
        db.add(rec)
    db.commit()
