import React from 'react';
import { useSystem } from '../context/SystemState';
import { FileText, Cpu, Clock } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { auditLogs } = useSystem();

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: '700' }}>System Audit Trail</h1>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 className="card-title" style={{ marginBottom: '16px' }}>Agent Activity & Decisions</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {auditLogs.map((log) => (
            <div 
              key={log.id} 
              className="glass-panel" 
              style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '20px', 
                borderLeft: '4px solid var(--color-primary)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                  <Cpu size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>{log.agent_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {log.latency.toFixed(2)}s
                  </span>
                  <span>Model: {log.model_used || 'Deterministic Engine'}</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '8px' }}>
                Action: <span style={{ color: 'var(--color-primary)' }}>{log.action_performed}</span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {log.output_summary}
              </div>

              {log.input_ref && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                  Reference: {log.input_ref}
                </div>
              )}
            </div>
          ))}

          {auditLogs.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No audit logs recorded yet. Trigger diagnostics to generate runs.</p>
          )}
        </div>
      </div>
    </div>
  );
};
