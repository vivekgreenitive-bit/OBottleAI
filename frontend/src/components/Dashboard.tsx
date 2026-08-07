import React, { useEffect } from 'react';
import { useSystem } from '../context/SystemState';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Legend, Bar, Line } from 'recharts';
import { ShieldAlert, DollarSign, Clock, CheckCircle2, ArrowRight, ClipboardList, Layers, Info } from 'lucide-react';

interface DashboardProps {
  onSelectBottleneck: (id: number) => void;
  setActiveTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectBottleneck, setActiveTab }) => {
  const { stats, bottlenecks, selectedBottleneck, selectBottleneckById, batches, activeBatchId, setActiveBatchId, fetchDashboard } = useSystem();

  // Load first bottleneck details when batch changes or bottlenecks update
  useEffect(() => {
    if (bottlenecks.length > 0) {
      selectBottleneckById(bottlenecks[0].id);
    }
  }, [bottlenecks]);

  const handleBatchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === '' ? null : e.target.value;
    setActiveBatchId(val);
    await fetchDashboard(val);
  };

  const hasSelectedData = activeBatchId !== null && stats !== null;

  const businessValueData = hasSelectedData ? bottlenecks.map(b => ({
    name: b.title.length > 15 ? b.title.substring(0, 15) + "..." : b.title,
    "Financial Risk ($)": b.estimated_cost_impact,
    "Timeline Delay (Days)": b.estimated_delay_days
  })) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Operations Results Dashboard</h1>
        
        {/* Prominent Log History Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(59, 130, 246, 0.08)', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--color-primary)' }}>
          <Layers size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '700' }}>Log History Scans:</span>
          <select
            value={activeBatchId || ''}
            onChange={handleBatchChange}
            style={{
              background: '#111827 url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%233b82f6\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 10px center',
              backgroundSize: '16px',
              color: '#ffffff',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              padding: '6px 32px 6px 12px',
              fontSize: '0.85rem',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '380px',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none'
            }}
          >
            <option value="" style={{ background: '#111827', color: '#fff' }}>No scan selected</option>
            <option value="ALL" style={{ background: '#111827', color: '#fff' }}>All Log Scans Combined</option>
            {[...batches].reverse().map(b => {
              const match = b.batch_id.match(/^BATCH-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(.*)$/);
              let label = b.batch_id;
              if (match) {
                const [_, y, m, d, hh, mm, ss, fname] = match;
                label = `Scan - ${fname} [${y}-${m}-${d} ${hh}:${mm}:${ss}]`;
              }
              return (
                <option key={b.batch_id} value={b.batch_id} style={{ background: '#111827', color: '#fff' }}>
                  {label} ({b.record_count} rows)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {!hasSelectedData && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Info size={20} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Upload an operational dataset and run an Agent Scan to begin analysis.
            </span>
          </div>
          <button className="btn btn-primary" onClick={() => setActiveTab?.('ingestion')} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            <span>Start Analysis</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Health metrics grid */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>Operational Health</span>
            <CheckCircle2 style={{ color: hasSelectedData ? 'var(--color-success)' : 'var(--text-muted)' }} size={18} />
          </div>
          <div className="metric-value" style={{ color: hasSelectedData ? 'var(--color-success)' : 'var(--text-muted)', fontSize: '1.75rem', fontWeight: '800' }}>
            {hasSelectedData ? `${stats.operational_health_score}%` : '--'}
          </div>
          <p className="metric-trend trend-up">{hasSelectedData ? 'Stable flow' : '--'}</p>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>Active Bottlenecks</span>
            <ShieldAlert style={{ color: hasSelectedData ? 'var(--color-warning)' : 'var(--text-muted)' }} size={18} />
          </div>
          <div className="metric-value" style={{ color: hasSelectedData ? 'var(--color-warning)' : 'var(--text-muted)', fontSize: '1.75rem', fontWeight: '800' }}>
            {hasSelectedData ? `${stats.active_bottlenecks_count} Active` : '--'}
          </div>
          <p className="metric-trend trend-down">{hasSelectedData ? `${stats.critical_bottlenecks_count} Critical Risks` : '--'}</p>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>SLA Breaches / At Risk</span>
            <Clock style={{ color: hasSelectedData ? 'var(--color-danger)' : 'var(--text-muted)' }} size={18} />
          </div>
          <div className="metric-value" style={{ color: hasSelectedData ? 'var(--color-danger)' : 'var(--text-muted)', fontSize: '1.75rem', fontWeight: '800' }}>
            {hasSelectedData ? stats.predicted_sla_breaches : '--'}
          </div>
          <p className="metric-trend trend-down">{hasSelectedData ? `${stats.affected_customers_count} Customers Impacted` : '--'}</p>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>Financial Penalty Exposure</span>
            <DollarSign style={{ color: hasSelectedData ? 'var(--color-primary)' : 'var(--text-muted)' }} size={18} />
          </div>
          <div className="metric-value" style={{ color: hasSelectedData ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '1.75rem', fontWeight: '800' }}>
            {hasSelectedData ? `$${stats.estimated_cost_impact.toLocaleString()}` : '--'}
          </div>
          <p className="metric-trend trend-down">{hasSelectedData ? `${stats.estimated_delay_days} Days Timeline Delay` : '--'}</p>
        </div>
      </div>

      {/* Business Value Chart Section */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 className="card-title" style={{ marginBottom: '8px' }}>Quantified Business Value & Timeline Impact</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          This visual represents the financial risk and project delivery timeline delay predicted by the agents for each bottleneck.
        </p>
        <div style={{ width: '100%', height: '200px' }}>
          {hasSelectedData && businessValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={businessValueData}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis yAxisId="left" stroke="var(--color-primary)" fontSize={11} label={{ value: 'Cost Risk ($)', angle: -90, position: 'insideLeft', fill: 'var(--color-primary)' }} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--color-warning)" fontSize={11} label={{ value: 'Delay (Days)', angle: 90, position: 'insideRight', fill: 'var(--color-warning)' }} />
                <Tooltip contentStyle={{ background: '#0a0e17', border: '1px solid var(--glass-border)' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="Financial Risk ($)" fill="var(--color-primary-glow)" stroke="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="Timeline Delay (Days)" stroke="var(--color-warning)" strokeWidth={3} dot={{ fill: 'var(--color-warning)', r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No analysis available yet.
            </div>
          )}
        </div>
      </div>

      {/* Split Details Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        {/* Left Column: Ranked Checklist */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Ranked Bottlenecks Checklist</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {hasSelectedData && bottlenecks.map((b, idx) => (
              <div 
                key={b.id} 
                className={`glass-panel list-item ${selectedBottleneck?.id === b.id ? 'active' : ''}`}
                onClick={() => selectBottleneckById(b.id)}
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  padding: '16px', 
                  cursor: 'pointer',
                  borderLeft: b.severity === 'critical' ? '4px solid var(--color-danger)' : '4px solid var(--color-warning)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                  <span className={`badge badge-${b.severity}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{b.severity}</span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>{b.title}</h4>
              </div>
            ))}
            {(!hasSelectedData || bottlenecks.length === 0) && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                Run an Agent Scan to identify operational bottlenecks.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: In-Depth Details */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {hasSelectedData && selectedBottleneck ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Section A: What is happening */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '4px' }}>{selectedBottleneck.title}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Domain: {selectedBottleneck.process}</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '12px', lineHeight: '1.5' }}>
                  <strong>A. What is happening:</strong> {selectedBottleneck.summary}
                </p>
              </div>

              {/* Section C: Business Impact */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' }}>C. Business Impact</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="glass-panel" style={{ padding: '12px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Risk Index</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-danger)' }}>{selectedBottleneck.impact_score}/100</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '12px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delay Timeline</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-warning)' }}>{selectedBottleneck.estimated_delay_days} Days</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '12px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Financial Risk</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-primary)' }}>${selectedBottleneck.estimated_cost_impact.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Section B: Why it is happening */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' }}>B. Why it is happening (Root Cause)</h4>
                <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedBottleneck.root_causes.map((rc, idx) => (
                    <li key={idx} style={{ marginBottom: '6px', lineHeight: '1.4' }}>
                      {rc.hypothesis} <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>({Math.round(rc.confidence*100)}% confidence)</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section D: Evidence */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' }}>D. Evidence & Symptoms</h4>
                <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedBottleneck.evidence.map((ev, idx) => (
                    <li key={idx} style={{ marginBottom: '6px', lineHeight: '1.4' }}>{ev.details}</li>
                  ))}
                </ul>
              </div>

              {/* Section E: Recommended Actions */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' }}>E. Recommended Actions</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 4px' }}>Mitigation Checklist</th>
                        <th style={{ padding: '8px 4px' }}>Assignee</th>
                        <th style={{ padding: '8px 4px' }}>Improvement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBottleneck.recommendations.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '8px 4px', fontWeight: '500' }}>{rec.action}</td>
                          <td style={{ padding: '8px 4px' }}>{rec.owner}</td>
                          <td style={{ padding: '8px 4px', color: 'var(--color-success)' }}>-{rec.expected_risk_reduction}% Risk</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section F: Approval and execution link */}
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setActiveTab?.('approvals')}
                >
                  <span>Proceed to Approval Center</span>
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
              Recommendations will appear after analysis.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
