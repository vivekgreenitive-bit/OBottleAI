import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import KnowledgeDocument

logger = logging.getLogger(__name__)

# Prepopulated knowledge bank for demo out of the box
DEFAULT_KNOWLEDGE = [
    {
        "title": "SLA-POL-03: Premium Tier Service Credits Policy",
        "content": "For Premium Tier Customers (Acme Corp, GlobalTech), a delivery delay exceeding 4 days or a critical ticket SLA breach (resolution > 4 hours) triggers a 10% service credit penalty per business day. Operations must proactively reallocate staff or escalate platform bottlenecks to prevent breaches.",
        "type": "SLA"
    },
    {
        "title": "ESC-MAT-01: Tier 1 Operational Incidents & Escalation Matrix",
        "content": "Critical workflow bottlenecks and blocked release candidates must be escalated to the Director of Engineering within 2 hours of detection. If a single resource is assigned to more than 6 active development sprint tasks, a task reassignment ticket must be auto-generated.",
        "type": "Incident"
    },
    {
        "title": "SOP-SUP-10: Session Troubleshooting and Rollback Protocol",
        "content": "If token timeout or session validation errors spike by 50% post-deployment, DevOps should immediately trigger a rollback of the API Gateway configuration to the last known stable state and assign the investigation to the Security Engineering lead.",
        "type": "SOP"
    },
    {
        "title": "PLAY-AGL-02: Agile Sprint Planning & Load Balancing Guidelines",
        "content": "Sprint capacity should not assign more than 5 critical story points or 4 active concurrent tasks to a single engineer. When overloaded, project managers must reassign non-critical documentation, refactoring, or testing tasks to secondary engineers.",
        "type": "Playbook"
    },
    {
        "title": "ESC-VND-04: Vendor Integration Delay Management Protocol",
        "content": "If a critical external vendor (e.g. payment SDK, authentication gateway) deliverable is overdue by 5+ working days, developers must construct a local mock integration/sandbox adapter. This allows internal checkout testing to proceed while vendor alignment meetings are conducted by Partner Management.",
        "type": "Playbook"
    }
]

class RAGService:
    @staticmethod
    def init_knowledge_base(db: Session):
        """Pre-populates the database with default SOPs/SLA guidelines if empty."""
        try:
            count = db.query(KnowledgeDocument).count()
            if count == 0:
                for doc in DEFAULT_KNOWLEDGE:
                    db_doc = KnowledgeDocument(
                        title=doc["title"],
                        content=doc["content"],
                        type=doc["type"]
                    )
                    db.add(db_doc)
                db.commit()
                logger.info("Knowledge Base initialized with default operational guides.")
        except Exception as e:
            logger.error(f"Error initializing Knowledge Base: {e}")

    @staticmethod
    def retrieve_context(query: str, db: Session, limit: int = 2) -> List[Dict[str, Any]]:
        """
        Performs keyword-based retrieval on operational knowledge documents.
        This provides a zero-dependency, highly robust search for the hackathon prototype.
        """
        docs = db.query(KnowledgeDocument).all()
        query_words = set(query.lower().split())
        
        scored_docs = []
        for doc in docs:
            # Score based on keyword overlaps in title and content
            score = 0
            title_lower = doc.title.lower()
            content_lower = doc.content.lower()
            
            for word in query_words:
                if len(word) < 3: # Skip small words
                    continue
                if word in title_lower:
                    score += 3
                if word in content_lower:
                    score += 1
            
            if score > 0:
                scored_docs.append((score, doc))
        
        # Sort by score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        # If no query keyword match, return default top documents
        results = []
        if not scored_docs:
            selected_docs = docs[:limit]
        else:
            selected_docs = [doc for score, doc in scored_docs[:limit]]
            
        for doc in selected_docs:
            results.append({
                "title": doc.title,
                "content": doc.content,
                "type": doc.type
            })
            
        return results
