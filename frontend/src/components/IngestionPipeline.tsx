import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemState';
import { Upload, Database, CheckCircle, AlertTriangle, Play, HelpCircle, Activity, ArrowRight, XCircle, Globe, Code } from 'lucide-react';
import { Dashboard } from './Dashboard';

interface IngestionPipelineProps {
  setActiveTab?: (tab: string) => void;
  activeScenario?: string;
  setActiveScenario?: (scenario: string) => void;
}

export const IngestionPipeline: React.FC<IngestionPipelineProps> = ({ 
  setActiveTab, 
  activeScenario, 
  setActiveScenario 
}) => {
  const { loadScenario, loading, runDiagnostics, fetchDashboard, fetchBatches, uploadCSV, ingestWebhookPayload, syncJiraCloud, activeBatchId, setActiveBatchId } = useSystem();
  
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [recordsCount, setRecordsCount] = useState<number>(0);
  const [ingestMode, setIngestMode] = useState<'file' | 'webhook' | 'jira'>('file');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // Jira Cloud connection form state
  const [jiraDomain, setJiraDomain] = useState<string>('acme-corp.atlassian.net');
  const [jiraProjectKey, setJiraProjectKey] = useState<string>('PROJ');
  const [jiraEmail, setJiraEmail] = useState<string>('devops@acme.com');
  const [jiraToken, setJiraToken] = useState<string>('');

  const handleSimulateWebhook = async () => {
    setUploadStatus('uploading');
    setUploadMessage('Ingesting live external webhook payload from Datadog_Alerts...');
    
    const samplePayload = [
      { entity_id: "INC-901", task_name: "Database Connection Pool Contention", owner: "Priya Sharma", team: "DevOps", priority: "Critical", status: "Blocked", blocked_duration: 4.5, customer: "Enterprise Merchants" },
      { entity_id: "INC-902", task_name: "Kafka Consumer Backpressure Stall", owner: "Priya Sharma", team: "DevOps", priority: "High", status: "Blocked", blocked_duration: 3.2, customer: "Enterprise Merchants" },
      { entity_id: "INC-903", task_name: "Redis Cache Rehash Degradation", owner: "Nadia Ali", team: "Infrastructure", priority: "Medium", status: "In Progress", blocked_duration: 1.0, customer: "Global API Users" }
    ];

    const result = await ingestWebhookPayload("Datadog_Alerts", samplePayload);
    if (result.status === 'success') {
      setUploadStatus('success');
      setUploadMessage(result.message);
      if (result.batch_id) {
        setActiveBatchId(result.batch_id);
        setRunProgress('running');
        await runDiagnostics(undefined, result.batch_id);
        setRunProgress('completed');
        fetchDashboard(result.batch_id);
      }
    } else {
      setUploadStatus('error');
      setUploadMessage(result.message || 'Webhook ingestion failed');
    }
  };

  const handleSyncJira = async () => {
    const cleanDomain = jiraDomain.trim();
    const cleanProject = jiraProjectKey.trim();
    const cleanEmail = jiraEmail.trim();
    const cleanToken = jiraToken.trim();

    if (!cleanDomain || !cleanProject || !cleanEmail || !cleanToken) {
      setUploadStatus('error');
      setUploadMessage('Please enter your Jira Domain, Project Key, Email, and API Token to connect.');
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage(`Connecting to live Jira Cloud (${cleanDomain}) and fetching issues for project '${cleanProject}'...`);

    const result = await syncJiraCloud({
      jira_domain: cleanDomain,
      project_key: cleanProject,
      email: cleanEmail,
      api_token: cleanToken
    });

    if (result.status === 'success') {
      setUploadStatus('success');
      setUploadMessage(result.message);
      if (result.batch_id) {
        setActiveBatchId(result.batch_id);
        setRunProgress('running');
        await runDiagnostics(undefined, result.batch_id);
        setRunProgress('completed');
        fetchDashboard(result.batch_id);
      }
    } else {
      setUploadStatus('error');
      setUploadMessage(result.message || 'Jira Cloud sync failed');
    }
  };

  // Agent execution progress states for wizard
  const [runProgress, setRunProgress] = useState<'idle' | 'running' | 'completed'>('idle');
  const [progressSteps, setProgressSteps] = useState([
    { id: 'data_validation', name: 'Data validation', status: 'pending', duration: '', log: '' },
    { id: 'normalization_redaction', name: 'Data normalization & redaction', status: 'pending', duration: '', log: '' },
    { id: 'operational_metrics', name: 'Operational metrics analysis', status: 'pending', duration: '', log: '' },
    { id: 'bottleneck_detection', name: 'Bottleneck detection & prediction', status: 'pending', duration: '', log: '' },
    { id: 'root_cause_analysis', name: 'Root-cause analysis (Gemini Pro)', status: 'pending', duration: '', log: '' },
    { id: 'business_impact', name: 'Business-impact assessment', status: 'pending', duration: '', log: '' },
    { id: 'recommendation_generation', name: 'Recommendation generation', status: 'pending', duration: '', log: '' },
    { id: 'final_report', name: 'Final report preparation', status: 'pending', duration: '', log: '' }
  ]);

  // Sync state if demo is started from Home page
  useEffect(() => {
    if (activeScenario) {
      setSelectedSource(activeScenario);
      setWizardStep(2);
      setUploadStatus('success');
      if (activeScenario === 'release_delay') {
        setRecordsCount(10);
      } else {
        setRecordsCount(8);
      }
    }
  }, [activeScenario]);

  const handleSelectScenario = (scenario: string) => {
    setSelectedSource(scenario);
    setCsvFile(null);
    if (setActiveScenario) setActiveScenario(scenario);
    setUploadStatus('success');
    setUploadMessage(`Selected scenario: ${scenario}. Click "Run Agent Scan" to begin.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setSelectedSource(file.name);
      setUploadStatus('idle');
      setUploadMessage(`File "${file.name}" staged. Click "Run Agent Scan" to upload and analyze.`);
    }
  };

  const startAnalysis = async () => {
    setRunProgress('running');

    // Reset progress steps
    const initialSteps = [
      { id: 'data_validation', name: 'Data validation', status: 'pending', duration: '', log: '' },
      { id: 'normalization_redaction', name: 'Data normalization & redaction', status: 'pending', duration: '', log: '' },
      { id: 'operational_metrics', name: 'Operational metrics analysis', status: 'pending', duration: '', log: '' },
      { id: 'bottleneck_detection', name: 'Bottleneck detection & prediction', status: 'pending', duration: '', log: '' },
      { id: 'root_cause_analysis', name: 'Root-cause analysis (Gemini Pro)', status: 'pending', duration: '', log: '' },
      { id: 'business_impact', name: 'Business-impact assessment', status: 'pending', duration: '', log: '' },
      { id: 'recommendation_generation', name: 'Recommendation generation', status: 'pending', duration: '', log: '' },
      { id: 'final_report', name: 'Final report preparation', status: 'pending', duration: '', log: '' }
    ];
    setProgressSteps(initialSteps);

    let targetBatch = activeBatchId || '';

    // Step A: Ingest staged CSV or Scenario FIRST
    if (csvFile) {
      setUploadStatus('uploading');
      setUploadMessage('Uploading and parsing CSV file...');
      const result = await uploadCSV(csvFile);
      if (result.status === 'success') {
        setUploadStatus('success');
        setUploadMessage(result.message);
        if (result.batch_id) {
          targetBatch = result.batch_id;
          setActiveBatchId(result.batch_id);
        }
      } else {
        setUploadStatus('error');
        setUploadMessage(result.message || 'Upload failed');
        setRunProgress('idle');
        return;
      }
    } else if (selectedSource) {
      setUploadStatus('uploading');
      setUploadMessage(`Loading sample scenario '${selectedSource}'...`);
      await loadScenario(selectedSource);
      setUploadStatus('success');
      setUploadMessage(`Loaded scenario '${selectedSource}'.`);
    }

    // Step B: Stream Live Agent Execution
    const scenarioType = csvFile ? '' : selectedSource;
    const params = new URLSearchParams();
    if (scenarioType) params.append('scenario_type', scenarioType);
    if (targetBatch) params.append('batch_id', targetBatch);
    const apiHost = window.location.hostname || 'localhost';
    const streamUrl = `http://${apiHost}:8080/api/v1/analysis/stream?${params.toString()}`;

    console.log(`[OBottleAI] Starting scan for targetBatch: ${targetBatch}`);
    console.log(`[OBottleAI] Opening SSE connection to: ${streamUrl}`);
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[OBottleAI] SSE event received:", data);

        if (data.event === 'done') {
          console.log("[OBottleAI] Scan completed successfully.");
          eventSource.close();
          setActiveBatchId(targetBatch);
          setRunProgress('completed');
          fetchDashboard(targetBatch);
          fetchBatches();
          return;
        }

        setProgressSteps(prev => {
          return prev.map((step, idx) => {
            const isMatch = (data.stage_id && step.id === data.stage_id) || (data.step_index !== undefined && idx === data.step_index);
            if (isMatch) {
              return {
                ...step,
                status: data.status || step.status,
                duration: data.duration || step.duration,
                log: data.log !== undefined ? data.log : step.log
              };
            }
            return step;
          });
        });
      } catch (e) {
        console.error("[OBottleAI] Error parsing agent event stream:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[OBottleAI] EventSource stream error:", err);
      eventSource.close();
      setProgressSteps(prev => 
        prev.map(step => 
          step.status === 'running'
            ? { ...step, status: 'failed', log: 'Stream connection error' }
            : step
        )
      );
      setRunProgress('completed');
      fetchDashboard(targetBatch);
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Operations Analysis & Diagnostics</h1>
        {runProgress === 'running' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: '600', fontSize: '0.9rem' }}>
            <Activity size={18} className="animate-spin" />
            <span>Agent Diagnostic Scanning Active...</span>
          </div>
        )}
      </div>

      {/* TOP UNIFIED ACTION BAR WITH DATA SOURCE SELECTOR */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
          <button 
            className={`btn ${ingestMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setIngestMode('file'); setUploadMessage(''); }}
            style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: '600' }}
          >
            <Upload size={14} />
            <span>CSV File Upload</span>
          </button>
          <button 
            className={`btn ${ingestMode === 'webhook' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setIngestMode('webhook'); setUploadMessage(''); }}
            style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: '600' }}
          >
            <Globe size={14} />
            <span>External REST Webhook</span>
          </button>
          <button 
            className={`btn ${ingestMode === 'jira' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setIngestMode('jira'); setUploadMessage(''); }}
            style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: '600' }}
          >
            <Database size={14} />
            <span>Live Jira Cloud Sync</span>
          </button>
        </div>

        {ingestMode === 'file' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'center' }}>
            {/* CSV File Upload Dropzone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                Upload Raw CSV / Spreadsheet Log
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="file" accept=".csv" id="csv-single-file" style={{ display: 'none' }} onChange={handleFileChange} disabled={runProgress === 'running'} />
                <label 
                  htmlFor="csv-single-file" 
                  className="btn btn-secondary" 
                  style={{ 
                    flex: 1, 
                    padding: '12px 18px', 
                    justifyContent: 'flex-start', 
                    cursor: runProgress === 'running' ? 'not-allowed' : 'pointer',
                    border: '1px dashed var(--color-primary)'
                  }}
                >
                  <Upload size={18} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>
                    {csvFile ? csvFile.name : 'Choose CSV / Excel Log File to Analyze...'}
                  </span>
                </label>
              </div>
            </div>

            {/* Trigger Agent Scan Button */}
            <div style={{ paddingTop: '22px' }}>
              <button
                className="btn btn-primary"
                onClick={startAnalysis}
                disabled={runProgress === 'running' || !csvFile}
                style={{ padding: '12px 24px', fontSize: '0.98rem', fontWeight: '700' }}
              >
                <Play size={18} />
                <span>Run Agent Scan</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : ingestMode === 'webhook' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)' }}>External REST API Webhook Ingress</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  POST live JSON payloads directly from your CI/CD pipelines, PagerDuty, or external databases.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSimulateWebhook}
                disabled={runProgress === 'running'}
                style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: '700' }}
              >
                <Globe size={16} />
                <span>Ingest Live External Payload & Scan</span>
              </button>
            </div>

            <div style={{ background: '#0b0f19', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}># Test POST command from terminal:</div>
              curl -X POST http://34.61.15.194:8080/api/v1/ingestions/webhook \<br />
              &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
              &nbsp;&nbsp;-d '{`{"source_name":"Datadog_Alerts","records":[{"entity_id":"INC-901","task_name":"Database Lock Contention","owner":"Priya Sharma","team":"DevOps","blocked_duration":4.5}]}`}'
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)' }}>Live Jira Cloud REST Integration</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Fetch project issues, sprint task statuses, and blocked engineering items directly from Atlassian Jira Cloud.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSyncJira}
                disabled={runProgress === 'running'}
                style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: '700' }}
              >
                <Database size={16} />
                <span>Fetch Live Jira Issues & Run Scan</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Jira Subdomain</label>
                <input 
                  type="text" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }} 
                  placeholder="company.atlassian.net"
                  value={jiraDomain}
                  onChange={(e) => setJiraDomain(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Project Key</label>
                <input 
                  type="text" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }} 
                  placeholder="PROJ"
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Atlassian Email</label>
                <input 
                  type="email" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }} 
                  placeholder="user@company.com"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Jira API Token / Webhook Secret</label>
                <input 
                  type="password" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }} 
                  placeholder="ATATT3xFfGF0..."
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {uploadMessage && (
          <div style={{ marginTop: '12px', fontSize: '0.82rem', color: uploadStatus === 'error' ? 'var(--color-danger)' : 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {uploadStatus === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
            <span>{uploadMessage}</span>
          </div>
        )}
      </div>

      {/* LIVE AGENT EXECUTION PANEL */}
      {(runProgress === 'running' || runProgress === 'completed') && (
        <div className="glass-panel" style={{ padding: '20px', border: runProgress === 'running' ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {runProgress === 'completed' ? (
                <>
                  <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                  <span>Backend Multi-Agent Execution Complete</span>
                </>
              ) : (
                <>
                  <Activity size={18} className="text-primary animate-spin" style={{ color: 'var(--color-primary)' }} />
                  <span>Real-Time Backend Multi-Agent Execution</span>
                </>
              )}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FastAPI EventSource Stream</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
            {progressSteps.map((step, idx) => (
              <div 
                key={idx} 
                className="glass-panel" 
                style={{ 
                  padding: '8px 12px', 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: step.status === 'completed' ? 'rgba(16, 185, 129, 0.03)' : step.status === 'running' ? 'rgba(59, 130, 246, 0.05)' : step.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-tertiary)',
                  border: step.status === 'completed' ? '1px solid var(--color-success)' : step.status === 'running' ? '1px solid var(--color-primary)' : step.status === 'failed' ? '1px solid var(--color-danger)' : '1px solid var(--glass-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                    {step.status === 'completed' && '✓ '}
                    {step.status === 'failed' && '✗ '}
                    {step.name}
                    {step.status === 'completed' && step.duration && ` (${step.duration})`}
                  </span>
                  <span 
                    className={`badge ${step.status === 'completed' ? 'badge-low' : step.status === 'running' ? 'badge-medium' : step.status === 'failed' ? 'badge-critical' : 'badge-high'}`}
                    style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                  >
                    {step.status}
                  </span>
                </div>
                {(step.log || step.status === 'running' || step.status === 'failed') && (
                  <div style={{ fontSize: '0.7rem', color: step.status === 'completed' ? 'var(--color-success)' : step.status === 'failed' ? 'var(--color-danger)' : 'var(--color-primary)', fontFamily: 'monospace' }}>
                    ➜ {step.log || 'Agent executing...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARD RESULTS - ALWAYS VISIBLE */}
      <div>
        <Dashboard 
          setActiveTab={setActiveTab}
          onSelectBottleneck={(id) => {
            if (setActiveTab) setActiveTab('approvals');
          }} 
        />
      </div>
    </div>
  );
};
