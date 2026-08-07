import React from 'react';
import { Activity, Play, ArrowRight, UploadCloud, Database } from 'lucide-react';

interface HomeProps {
  onStartDemo: () => void;
  onNavigateToUpload: () => void;
  hasData: boolean;
  onGoToAnalysis: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStartDemo, onNavigateToUpload, hasData, onGoToAnalysis }) => {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto 0 auto', padding: '0 20px' }}>
      {/* Brand & Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Activity size={48} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>OBottleAI</h1>
        </div>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          Detect, explain, and resolve operational bottlenecks before they impact customers and cost you money.
        </p>
      </div>

      {/* 3-Step Process Explanation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '48px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '12px' }}>1</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '8px' }}>Connect Data</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Upload operational backlog logs from Jira, CRM, or Support ticket databases.
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '12px' }}>2</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '8px' }}>AI Risk Scan</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Multi-agent systems parse metrics, check rules, and retrieve SLA guidelines.
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '12px' }}>3</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '8px' }}>Authorize Fixes</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Review quantified recommendations and trigger automated Slack/Jira resolutions.
          </p>
        </div>
      </div>

      {/* Call to Actions */}
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--color-primary-glow)' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '12px' }}>Ready to optimize your operations?</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
          Click the <strong style={{ color: 'var(--color-primary)' }}>⚡ Quick Load Demo</strong> button in the top-right header to run the full simulation, or click below to upload custom logs manually.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onNavigateToUpload}
          >
            <UploadCloud size={16} />
            <span>Upload CSV Logs</span>
          </button>

          {hasData && (
            <button 
              className="btn btn-primary" 
              onClick={onGoToAnalysis}
            >
              <span>View Results Dashboard</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
