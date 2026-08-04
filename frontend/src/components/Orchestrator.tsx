import React, { useState } from 'react';
import { useSystem } from '../context/SystemState';
import { Play, CheckCircle2, AlertTriangle, FileText, HelpCircle, Activity, ShieldAlert } from 'lucide-react';

export const Orchestrator: React.FC = () => {
  const { 
    bottlenecks, 
    selectedBottleneck, 
    diagnosticStatus, 
    diagnosticSteps, 
    runDiagnostics, 
    selectBottleneckById 
  } = useSystem();

  const [activeScenarioBias, setActiveScenarioBias] = useState<string>('');

  const triggerRun = () => {
    runDiagnostics(activeScenarioBias);
  };

  // Convert raw step names to user-friendly business translations
  const getStepTranslation = (name: string, status: string, log?: string) => {
    if (status === 'idle') return { title: name, desc: 'Queueing analysis task...' };
    
    switch(name) {
      case 'Data Ingestion Service':
        return { 
          title: 'Retrieving Operations Log', 
          desc: status === 'running' ? 'Connecting to Jira/CRM databases...' : 'Database connection successful. Syncing 250 log entries.' 
        };
      case 'PII Normalization & Redaction Agent':
        return { 
          title: 'Anonymizing Customer Identity', 
          desc: status === 'running' ? 'Scanning records for emails and phone credentials...' : 'PII Redacted safely to ensure compliance guidelines.' 
        };
      case 'Deterministic Analytics Engine':
        return { 
          title: 'Computing Backlog Metrics', 
          desc: status === 'running' ? 'Running cycle time math...' : 'Analytics completed. Backlog index and overdue ratios calculated.' 
        };
      case 'Multi-Agent Orchestrator (LangGraph Router)':
        return { 
          title: 'Activating AI Assistant Team', 
          desc: status === 'running' ? 'Starting team orchestration nodes...' : 'AI agents triggered and work tasks distributed.' 
        };
      case 'Gemini Root Cause & Risk Prediction Agent':
        return { 
          title: 'Generating SLA Explanations', 
          desc: status === 'running' ? 'Querying Gemini reasoning engine...' : 'Root causes identified and delivery delays forecasted.' 
        };
      case 'Business Impact Assessment Agent':
        return { 
          title: 'Quantifying Financial Risks', 
          desc: status === 'running' ? 'Analyzing financial SLA risk thresholds...' : 'Calculated exact penalty impact and risk weights.' 
        };
      case 'Recommendation Generation Agent':
        return { 
          title: 'Compiling Operational Mitigations', 
          desc: status === 'running' ? 'Drafting remediation checklist...' : 'Action items prepared and pushed to Authorization Center.' 
        };
      default:
        return { title: name, desc: log || '' };
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: '700' }}>AI Operations Assistant</h1>

      {/* RAG Executive Traffic Light Alert Banner */}
      {selectedBottleneck && (
        <div 
          className="glass-panel" 
          style={{ 
            background: selectedBottleneck.severity === 'critical' || selectedBottleneck.severity === 'high' 
              ? 'var(--color-danger-glow)' 
              : 'var(--color-warning-glow)', 
            border: selectedBottleneck.severity === 'critical' || selectedBottleneck.severity === 'high'
              ? '1px solid var(--color-danger)'
              : '1px solid var(--color-warning)',
            color: selectedBottleneck.severity === 'critical' || selectedBottleneck.severity === 'high'
              ? 'var(--color-danger)'
              : 'var(--color-warning)',
            padding: '16px 24px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: '600'
          }}
        >
          <ShieldAlert size={22} />
          <div>
            <span style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {selectedBottleneck.severity} DELIVERY ALERT DETECTED
            </span>
            <div style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.9, marginTop: '2px' }}>
              This risk is causing an estimated delay of {selectedBottleneck.estimated_delay_days} days and exposes the team to ${selectedBottleneck.estimated_cost_impact.toLocaleString()} in financial penalties.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left: Simulation Trigger and Step Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Scan for Delivery Risks</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Activate the AI assistant team to scan logs and query operational policies.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Optional: Inject Scenario Keyword Context
              </label>
              <select 
                className="btn btn-secondary" 
                style={{ width: '100%', outline: 'none' }}
                value={activeScenarioBias}
                onChange={(e) => setActiveScenarioBias(e.target.value)}
              >
                <option value="">None (Standard Scan)</option>
                <option value="release_delay">Release Pipeline (SLA/QA Focus)</option>
                <option value="support_backlog">Session Timeouts (API/Support Focus)</option>
                <option value="vendor_dependency">Checkout SDK (Vendor Focus)</option>
                <option value="resource_overload">Sprint Staffing (Developer Focus)</option>
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={triggerRun}
              disabled={diagnosticStatus === 'running'}
            >
              <Play size={18} />
              <span>{diagnosticStatus === 'running' ? 'Scanning...' : 'Trigger Operations Scan'}</span>
            </button>
          </div>

          {/* Running steps */}
          {diagnosticStatus !== 'idle' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 className="card-title" style={{ marginBottom: '16px' }}>AI Agent Status Feed</h2>
              <div className="agent-flow-container" style={{ padding: 0 }}>
                {diagnosticSteps.map((step, idx) => {
                  const viewInfo = getStepTranslation(step.name, step.status, step.log);
                  return (
                    <div 
                      key={idx} 
                      className={`agent-node ${step.status === 'running' ? 'thinking' : step.status === 'completed' ? 'completed' : ''}`}
                      style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '8px' }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {step.status === 'completed' ? (
                            <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                          ) : step.status === 'running' ? (
                            <Activity size={16} className="text-primary" style={{ color: 'var(--color-primary)', animation: 'spin 2s linear infinite' }} />
                          ) : (
                            <HelpCircle size={16} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <span>{viewInfo.title}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {viewInfo.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottlenecks lists */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 className="card-title" style={{ marginBottom: '16px' }}>AI Diagnostic Reports</h2>
            <div className="item-list">
              {bottlenecks.map((b) => (
                <div 
                  key={b.id} 
                  className={`glass-panel list-item ${selectedBottleneck?.id === b.id ? 'active' : ''}`}
                  onClick={() => selectBottleneckById(b.id)}
                  style={{ background: 'var(--bg-tertiary)', padding: '12px' }}
                >
                  <div className="list-item-main">
                    <span className="item-name" style={{ fontSize: '0.9rem' }}>{b.title}</span>
                    <span className="item-desc" style={{ fontSize: '0.75rem' }}>Severity: {b.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Bottleneck details */}
        <div>
          {selectedBottleneck ? (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>{selectedBottleneck.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Operational Domain: {selectedBottleneck.process} | Detected: {new Date(selectedBottleneck.detected_time).toLocaleString()}
                  </p>
                </div>
                <span className={`badge badge-${selectedBottleneck.severity}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  {selectedBottleneck.severity}
                </span>
              </div>

              {/* Summary */}
              <div style={{ margin: '24px 0' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--color-primary)' }}>Executive Assessment</h3>
                <p style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>{selectedBottleneck.summary}</p>
              </div>

              {/* Metrics block */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '24px 0' }}>
                <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Risk Index</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-danger)', marginTop: '4px' }}>
                    {selectedBottleneck.impact_score}/100
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Delivery Timeline Delay</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-warning)', marginTop: '4px' }}>
                    {selectedBottleneck.estimated_delay_days} Days
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contract Penalty Exposure</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)', marginTop: '4px' }}>
                    ${selectedBottleneck.estimated_cost_impact.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Evidence & Root Cause */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '24px 0' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--color-primary)' }}>Evidence & Symptoms</h3>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    {selectedBottleneck.evidence.map((ev, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{ev.details}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--color-primary)' }}>Estimated Root Cause</h3>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    {selectedBottleneck.root_causes.map((rc, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                        {rc.hypothesis} <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>({Math.round(rc.confidence*100)}% confidence)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div style={{ margin: '24px 0' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--color-primary)' }}>Recommended Mitigations</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '12px 8px' }}>Action Checklist</th>
                        <th style={{ padding: '12px 8px' }}>Owner</th>
                        <th style={{ padding: '12px 8px' }}>Risk Improvement</th>
                        <th style={{ padding: '12px 8px' }}>Authorization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBottleneck.recommendations.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: '500' }}>{rec.action}</td>
                          <td style={{ padding: '12px 8px' }}>{rec.owner}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--color-success)' }}>-{rec.expected_risk_reduction}% Risk</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className={`badge ${rec.approval_required ? 'badge-high' : 'badge-low'}`}>
                              {rec.approval_required ? 'Approval Required' : 'Automated'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Select a diagnostic report from the left sidebar to view the executive analysis, financial impacts, and mitigations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

