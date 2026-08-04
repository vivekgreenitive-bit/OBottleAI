import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react';

interface ActionRecord {
  id: number;
  recommendation_id: number;
  action_type: string;
  status: string;
  executed_at: string;
  logs: string;
}

const formatExecutionTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return 'Pending...';
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return 'Pending...';
  return d.toLocaleString();
};

export const Actions: React.FC = () => {
  const [actions, setActions] = useState<ActionRecord[]>([]);

  const fetchActions = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/v1/actions');
      const data = await res.json();
      setActions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: '700' }}>Executed Mitigations</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Track real-time statuses and integration logs of authorized automated workflows triggered via Slack and Jira APIs.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {actions.map((act) => (
          <div key={act.id} className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-low" style={{ textTransform: 'uppercase', marginBottom: '4px', display: 'inline-block' }}>
                  Workflow #{act.id}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '600' }}>{act.action_type}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: act.status === 'Success' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {act.status === 'Success' ? <CheckCircle size={18} /> : <Clock size={18} />}
                <span style={{ fontWeight: '700' }}>{act.status?.toUpperCase() || 'QUEUED'}</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', lineHeight: '1.4', border: '1px solid var(--glass-border)' }}>
              {act.logs || "Executing mitigation workflow..."}
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Executed on: {formatExecutionTime(act.executed_at)}
              </span>
              {act.status === 'Success' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ExternalLink size={12} /> Notifications Dispatched
                </span>
              )}
            </div>
          </div>
        ))}

        {actions.length === 0 && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>No actions have been executed yet. Approve recommendations to trigger automated workflows.</p>
            <button className="btn btn-primary" onClick={fetchActions} style={{ margin: '0 auto' }}>
              <RefreshCw size={16} />
              <span>Refresh Actions Queue</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default Actions;
