import React from 'react';
import { LayoutDashboard, ShieldCheck, Database, FileText, Settings as SettingsIcon, Activity, Home as HomeIcon, Play } from 'lucide-react';
import { useSystem } from '../context/SystemState';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { activeRole } = useSystem();
  
  const menuItems = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'ingestion', label: 'New Analysis', icon: Database },
    { id: 'dashboard', label: 'Results', icon: LayoutDashboard },
    { id: 'approvals', label: 'Approval', icon: ShieldCheck },
    { id: 'actions', label: 'Actions', icon: Play },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'System (Advanced)', icon: SettingsIcon }
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
              >
                <Icon size={20} />
                <span>{item.label}</span>
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

