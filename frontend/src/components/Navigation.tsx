import React from 'react';
import { LayoutDashboard, ShieldCheck, Database, FileText, Settings as SettingsIcon, Activity, Home as HomeIcon, Play } from 'lucide-react';
import { useSystem } from '../context/SystemState';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { activeRole, approvals, bottlenecks } = useSystem();
  
  const pendingApprovalsCount = approvals.length;
  const activeBottlenecksCount = bottlenecks.length;

  const menuItems = [
    { id: 'home', label: 'Home', icon: HomeIcon, badge: 0 },
    { id: 'ingestion', label: 'Analysis & Results', icon: LayoutDashboard, badge: activeBottlenecksCount, color: 'var(--color-primary)' },
    { id: 'approvals', label: 'Approval Gate', icon: ShieldCheck, badge: pendingApprovalsCount, color: '#ef4444' },
    { id: 'actions', label: 'Notifications & Follow-ups', icon: Play, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : 0, color: '#38bdf8' },
    { id: 'audit', label: 'Audit Logs', icon: FileText, badge: 0 },
    { id: 'settings', label: 'System (Advanced)', icon: SettingsIcon, badge: 0 }
  ];

  return (
    <div className="sidebar">
      <div className="logo-container">
        <Activity className="text-primary" size={28} style={{ color: 'var(--color-primary)' }} />
        <div>
          <span className="logo-text">OBottleAI</span>
          <span className="logo-badge">AGENTIC</span>
        </div>
      </div>

      <ul className="nav-links">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <div
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>

                {/* Dynamic Notification Badge Pill with Pulse Effect */}
                {item.badge > 0 && (
                  <span 
                    className="animate-pulse"
                    style={{
                      background: item.color || '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      boxShadow: `0 0 8px ${item.color || '#ef4444'}`,
                      lineHeight: '1.2'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Role:</span>
          <div style={{ 
            fontSize: '0.8rem', 
            fontWeight: '700', 
            color: 'var(--color-primary)', 
            background: 'var(--color-primary-glow)',
            border: '1px solid var(--color-primary)',
            padding: '2px 8px',
            borderRadius: '4px',
            marginTop: '4px',
            textAlign: 'center'
          }}>{activeRole.toUpperCase()}</div>
        </div>
        <p>System Live Demo</p>
        <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Bengaluru National Final</p>
      </div>
    </div>
  );
};

