import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemState';
import { Settings as SettingsIcon, Save, Key, Share2, Users } from 'lucide-react';

export const Settings: React.FC = () => {

  const { config, activeRole, setActiveRole, saveConfig } = useSystem();

  const [slackUrl, setSlackUrl] = useState('');
  const [model, setModel] = useState('gemini-1.5-pro');
  const [weights, setWeights] = useState({
    customer: 0.25,
    sla: 0.20,
    delay: 0.15,
    cost: 0.15,
    revenue: 0.15,
    scope: 0.10
  });

  useEffect(() => {
    if (config) {
      setSlackUrl(config.slack_webhook_url || '');
      setModel(config.active_model);
      setWeights({
        customer: config.sla_weight_customer,
        sla: config.sla_weight_sla,
        delay: config.sla_weight_delay,
        cost: config.sla_weight_cost,
        revenue: config.sla_weight_revenue,
        scope: config.sla_weight_scope
      });
    }
  }, [config]);

  const handleSave = async () => {
    await saveConfig({
      sla_weight_customer: weights.customer,
      sla_weight_sla: weights.sla,
      sla_weight_delay: weights.delay,
      sla_weight_cost: weights.cost,
      sla_weight_revenue: weights.revenue,
      sla_weight_scope: weights.scope,
      slack_webhook_url: slackUrl || null,
      active_model: model
    });
    alert('System settings updated successfully!');
  };

  const handleWeightChange = (key: keyof typeof weights, value: string) => {
    const val = parseFloat(value) || 0.0;
    setWeights({ ...weights, [key]: val });
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: '700' }}>System Config & Governance</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Role Selection & Slack Connect */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Role-Based Access Control (RBAC)</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Change the active session role. Approver role is required to authorize mitigation actions.
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {['Viewer', 'Analyst', 'Approver'].map((role) => (
                <button
                  key={role}
                  className={`btn ${activeRole === role ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                  onClick={() => setActiveRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Integrations webhook</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Slack Incoming Webhook URL
                </label>
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/..."
                  className="btn btn-secondary"
                  style={{ width: '100%', cursor: 'text', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                If set, approving an action item will fire a real block message to this channel.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Analytical Weights & Model Configuration */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Business Impact Weights</span>
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>Customer SLA Tier (0.0 to 1.0)</span>
              <input 
                type="number" step="0.05" className="btn btn-secondary" style={{ cursor: 'text' }}
                value={weights.customer} onChange={(e) => handleWeightChange('customer', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>SLA Target Compliance (0.0 to 1.0)</span>
              <input 
                type="number" step="0.05" className="btn btn-secondary" style={{ cursor: 'text' }}
                value={weights.sla} onChange={(e) => handleWeightChange('sla', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>Schedule Delay Timeline (0.0 to 1.0)</span>
              <input 
                type="number" step="0.05" className="btn btn-secondary" style={{ cursor: 'text' }}
                value={weights.delay} onChange={(e) => handleWeightChange('delay', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>Financial Cost Impact (0.0 to 1.0)</span>
              <input 
                type="number" step="0.05" className="btn btn-secondary" style={{ cursor: 'text' }}
                value={weights.cost} onChange={(e) => handleWeightChange('cost', e.target.value)}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={16} />
              <span>Save System Config</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
