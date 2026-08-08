import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { HumanGate } from './components/HumanGate';
import { IngestionPipeline } from './components/IngestionPipeline';
import { Actions } from './components/Actions';
import { AuditLogs } from './components/AuditLogs';
import { Settings } from './components/Settings';
import { useSystem } from './context/SystemState';

// Helper to map tab IDs to URL hashes
const tabToHash: Record<string, string> = {
  home: '#/',
  ingestion: '#/analysis',
  dashboard: '#/analysis',
  approvals: '#/approval',
  actions: '#/actions',
  audit: '#/audit-logs',
  settings: '#/system'
};

// Helper to map URL hashes to tab IDs
const hashToTab: Record<string, string> = {
  '#/': 'home',
  '#/home': 'home',
  '#/analysis': 'ingestion',
  '#/new-analysis': 'ingestion',
  '#/results': 'ingestion',
  '#/approval': 'approvals',
  '#/actions': 'actions',
  '#/audit-logs': 'audit',
  '#/system': 'settings'
};

export const App: React.FC = () => {
  const getTabFromHash = () => {
    const hash = window.location.hash || '#/';
    return hashToTab[hash] || 'home';
  };

  const [activeTab, setActiveTabState] = useState<string>(getTabFromHash);
  const [activeScenario, setActiveScenario] = useState<string>('');
  const { selectBottleneckById, stats, loadScenario } = useSystem();

  // Sync hash changes back to React state (for back/forward browser support or direct link typing)
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTabState(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update active tab & push to window location hash
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    const hash = tabToHash[tab] || '#/';
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  };

  const handleStartDemo = async () => {
    setActiveScenario('release_delay');
    setActiveTab('ingestion');
    await loadScenario('release_delay');
  };

  const handleSelectBottleneck = async (id: number) => {
    await selectBottleneckById(id);
  };

  return (
    <div className="app-container">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        {/* Global Header with Breadcrumbs & Top-Right Quick Demo Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          gap: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.85rem', 
            color: 'var(--text-muted)', 
            background: 'var(--bg-tertiary)',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--glass-border)',
            width: 'fit-content'
          }}>
            <span>OBottleAI</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>
              {activeTab === 'home' && 'Home'}
              {activeTab === 'ingestion' && 'Analysis & Results'}
              {activeTab === 'approvals' && 'Approval Gate'}
              {activeTab === 'actions' && 'Notifications & Follow-ups'}
              {activeTab === 'audit' && 'Audit Logs'}
              {activeTab === 'settings' && 'System (Advanced)'}
            </span>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.8rem', 
              gap: '6px',
              boxShadow: '0 0 12px var(--color-primary-glow)'
            }}
            onClick={handleStartDemo}
          >
            <span>⚡ Quick Load Demo</span>
          </button>
        </div>


        {activeTab === 'home' && (
          <Home 
            onStartDemo={handleStartDemo} 
            onNavigateToUpload={() => setActiveTab('ingestion')}
            hasData={stats !== null}
            onGoToAnalysis={() => setActiveTab('ingestion')}
          />
        )}
        {activeTab === 'approvals' && <HumanGate />}
        {activeTab === 'ingestion' && (
          <IngestionPipeline 
            setActiveTab={setActiveTab} 
            activeScenario={activeScenario}
            setActiveScenario={setActiveScenario}
          />
        )}
        {activeTab === 'actions' && <Actions />}
        {activeTab === 'audit' && <AuditLogs />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
};

export default App;
