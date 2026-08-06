import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemState';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Legend, Bar, Line } from 'recharts';
import { ShieldAlert, Users, DollarSign, Clock, CheckCircle2, ArrowRight, ClipboardList, HelpCircle, Layers } from 'lucide-react';

interface DashboardProps {
  onSelectBottleneck: (id: number) => void;
  setActiveTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectBottleneck, setActiveTab }) => {
  const { stats, bottlenecks, selectedBottleneck, selectBottleneckById, batches, activeBatchId, setActiveBatchId, fetchDashboard } = useSystem();

  // Load first bottleneck details by default if available and none selected
  useEffect(() => {
    if (bottlenecks.length > 0 && !selectedBottleneck) {
      selectBottleneckById(bottlenecks[0].id);
    }
  }, [bottlenecks, selectedBottleneck]);

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === 'ALL' ? null : e.target.value;
    setActiveBatchId(val);
    fetchDashboard(val);
  };

  if (!stats || (stats.active_bottlenecks_count === 0 && bottlenecks.length === 0)) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '40px auto 0 auto' }}>
        <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>No Analyses Yet</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Upload operational logs or load a sample scenario to begin bottleneck detection.
        </p>
        <button className="btn btn-primary" onClick={() => setActiveTab?.('ingestion')} style={{ margin: '0 auto' }}>
          <span>Start New Analysis</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const businessValueData = bottlenecks.map(b => ({
    name: b.title.length > 15 ? b.title.substring(0, 15) + "..." : b.title,
    "Financial Risk ($)": b.estimated_cost_impact,
    "Timeline Delay (Days)": b.estimated_delay_days
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Operations Results Dashboard</h1>
        {batches.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--glass-bg)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <Layers size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Log History:</span>
            <select
              value={activeBatchId || 'ALL'}
              onChange={handleBatchChange}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '350px'
              }}
            >
              <option value="ALL" style={{ background: '#111827', color: '#fff' }}>All Log Scans Combined</option>
              {[...batches].reverse().map(b => {
                const match = b.batch_id.match(/^BATCH-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(.*)$/);
                let label = b.batch_id;
                if (match) {
                  const [_, y, m, d, hh, mm, ss, fname] = match;
                  label = `${fname} [${y}-${m}-${d} ${hh}:${mm}:${ss}]`;
                }
                return (
                  <option key={b.batch_id} value={b.batch_id} style={{ background: '#111827', color: '#fff' }}>
                    {label} ({b.record_count} rows)
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Health metrics grid */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>Operational Health</span>
            <CheckCircle2 style={{ color: 'var(--color-success)' }} size={18} />
          </div>
          <div className="metric-value" style={{ color: 'var(--color-success)', fontSize: '1.75rem', fontWeight: '800' }}>
            {stats.operational_health_score}%
          </div>
          <p className="metric-trend trend-up">Stable flow</p>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>Active Bottlenecks</span>
            <ShieldAlert style={{ color: 'var(--color-warning)' }} size={18} />
          </div>
          <div className="metric-value" style={{ color: 'var(--color-warning)', fontSize: '1.75rem', fontWeight: '800' }}>
            {stats.active_bottlenecks_count} Active
          </div>
          <p className="metric-trend trend-down">{stats.critical_bottlenecks_count} Critical Risks</p>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>SLA Breaches / At Risk</span>
            <Clock style={{ color: 'var(--color-danger)' }} size={18} />
          </div>
          <div className="metric-value" style={{ color: 'var(--color-danger)', fontSize: '1.75rem', fontWeight: '800' }}>
            {stats.predicted_sla_breaches}
          </div>
          <p className="metric-trend trend-down">{stats.affected_customers_count} Customers Impacted</p>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-title">
            <span>Financial Penalty Exposure</span>
            <DollarSign style={{ color: 'var(--color-primary)' }} size={18} />
          </div>
          <div className="metric-value" style={{ fontSize: '1.75rem', fontWeight: '800' }}>
            ${stats.estimated_cost_impact.toLocaleString()}
          </div>
          <p className="metric-trend trend-down">{stats.estimated_delay_days} Days Timeline Delay</p>
        </div>
      </div>

      {/* Business Value Chart Section */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 className="card-title" style={{ marginBottom: '8px' }}>Quantified Business Value & Timeline Impact</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          This visual represents the financial risk and project delivery timeline delay predicted by the agents for each bottleneck.
        </p>
        <div style={{ width: '100%', height: '200px' }}>
          {businessValueData.length > 0 ? (
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
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No operational bottlenecks detected. Go to New Analysis to upload a custom CSV file or load a sample dataset.
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
            {bottlenecks.map((b, idx) => (
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
            {bottlenecks.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>No bottlenecks found.</p>
            )}
          </div>
        </div>

        {/* Right Column: In-Depth Details */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {selectedBottleneck ? (
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
                  <span>Authorize Mitigation Center</span>
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Select a report to view analysis.</p>
          )}
        </div>
      </div>
    </div>
  );
};
