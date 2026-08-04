from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import OperationalRecord

class OperationsAnalytics:
    @staticmethod
    def calculate_metrics(db: Session, team: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculates cycle times, queue sizes, overdue indicators, and workload distributions.
        """
        query = db.query(OperationalRecord)
        if team:
            query = query.filter(OperationalRecord.team == team)
        records = query.all()

        if not records:
            return {
                "throughput": 0.0,
                "avg_cycle_time_days": 0.0,
                "active_backlog": 0,
                "overdue_count": 0,
                "blocked_count": 0,
                "sla_compliance_rate": 100.0,
                "workload_imbalance_ratio": 0.0,
                "resource_distribution": {},
                "sla_violations": 0
            }

        # Counters and lists
        completed_records = [r for r in records if r.completed_date is not None]
        active_records = [r for r in records if r.completed_date is None]
        overdue_records = []
        blocked_records = [r for r in records if r.blocked_duration > 0 or r.status == "Blocked"]
        
        now = datetime.utcnow()
        for r in active_records:
            if r.due_date and r.due_date < now:
                overdue_records.append(r)

        # Cycle Time
        cycle_times = []
        for r in completed_records:
            if r.created_date and r.completed_date:
                delta = r.completed_date - r.created_date
                cycle_times.append(delta.total_seconds() / 86400.0) # Convert to days
        
        avg_cycle_time = sum(cycle_times) / len(cycle_times) if cycle_times else 0.0

        # Workload Distribution
        workload: Dict[str, int] = {}
        for r in active_records:
            if r.owner:
                workload[r.owner] = workload.get(r.owner, 0) + 1

        # Workload Imbalance Ratio (Max workload vs Average workload)
        if workload:
            max_workload = max(workload.values())
            avg_workload = sum(workload.values()) / len(workload)
            workload_imbalance = max_workload / avg_workload if avg_workload > 0 else 0.0
        else:
            workload_imbalance = 0.0

        # SLA Compliance
        sla_checked = 0
        sla_met = 0
        for r in completed_records:
            if r.sla_target:
                sla_checked += 1
                if r.completed_date <= r.sla_target:
                    sla_met += 1
                    
        for r in active_records:
            if r.sla_target:
                sla_checked += 1
                # If already breached
                if now > r.sla_target:
                    pass
                else:
                    sla_met += 1

        sla_rate = (sla_met / sla_checked * 100.0) if sla_checked > 0 else 100.0
        sla_violations = sla_checked - sla_met

        return {
            "throughput": len(completed_records),
            "avg_cycle_time_days": round(avg_cycle_time, 2),
            "active_backlog": len(active_records),
            "overdue_count": len(overdue_records),
            "blocked_count": len(blocked_records),
            "sla_compliance_rate": round(sla_rate, 2),
            "workload_imbalance_ratio": round(workload_imbalance, 2),
            "resource_distribution": workload,
            "sla_violations": sla_violations
        }
