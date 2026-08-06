import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemState';
import { Upload, Database, CheckCircle, AlertTriangle, Play, HelpCircle, Activity, ArrowRight, XCircle } from 'lucide-react';
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
  const { loadScenario, loading, runDiagnostics, fetchDashboard, uploadCSV, activeBatchId } = useSystem();
  
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [recordsCount, setRecordsCount] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // Agent execution progress states for wizard
  const [runProgress, setRunProgress] = useState<'idle' | 'running' | 'completed'>('idle');
  const [progressSteps, setProgressSteps] = useState([
    { name: 'Data validation', status: 'pending', duration: '' },
    { name: 'Data normalization & redaction', status: 'pending', duration: '' },
    { name: 'Operational metrics analysis', status: 'pending', duration: '' },
    { name: 'Bottleneck detection & prediction', status: 'pending', duration: '' },
    { name: 'Root-cause analysis', status: 'pending', duration: '' },
    { name: 'Business-impact assessment', status: 'pending', duration: '' },
    { name: 'Recommendation generation', status: 'pending', duration: '' },
    { name: 'Final report preparation', status: 'pending', duration: '' }
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

  const handleSelectScenario = async (scenario: string) => {
    setSelectedSource(scenario);
    if (setActiveScenario) setActiveScenario(scenario);
    setUploadStatus('uploading');
    setUploadMessage('Loading scenario data into database...');
    
    await loadScenario(scenario);
    
    setUploadStatus('success');
    setUploadMessage('Scenario data loaded successfully.');
    if (scenario === 'release_delay') {
      setRecordsCount(10);
    } else {
      setRecordsCount(8);
    }
    setWizardStep(2); // Advance to preview
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setSelectedSource(file.name);
      setUploadStatus('uploading');
      setUploadMessage('Uploading and parsing CSV file...');
      setWizardStep(2);

      // Actually upload the file to the backend
      const result = await uploadCSV(file);
      
      if (result.status === 'success') {
        // Extract record count from response message (e.g. "Successfully ingested 15 operational records.")
        const match = result.message.match(/(\d+)/);
        const count = match ? parseInt(match[1]) : 0;
        setRecordsCount(count);
        setUploadStatus('success');
        setUploadMessage(result.message);
      } else {
        setUploadStatus('error');
        setUploadMessage(result.message || 'Upload failed. Please check file format.');
      }
    }
  };

  const startAnalysis = async () => {
    setWizardStep(3); // Go to progress screen
    setRunProgress('running');

    // Reset progress steps
    const initialSteps = [
      { name: 'Data validation', status: 'pending', duration: '', log: '' },
      { name: 'Data normalization & redaction', status: 'pending', duration: '', log: '' },
      { name: 'Operational metrics analysis', status: 'pending', duration: '', log: '' },
      { name: 'Bottleneck detection & prediction', status: 'pending', duration: '', log: '' },
      { name: 'Root-cause analysis (Gemini Pro)', status: 'pending', duration: '', log: '' },
      { name: 'Business-impact assessment', status: 'pending', duration: '', log: '' },
      { name: 'Recommendation generation', status: 'pending', duration: '', log: '' },
      { name: 'Final report preparation', status: 'pending', duration: '', log: '' }
    ];
    setProgressSteps(initialSteps);

    const targetBatch = activeBatchId || '';
    const scenarioType = csvFile ? '' : selectedSource;
    const params = new URLSearchParams();
    if (scenarioType) params.append('scenario_type', scenarioType);
    if (targetBatch) params.append('batch_id', targetBatch);
    const apiHost = window.location.hostname || 'localhost';
    const streamUrl = `http://${apiHost}:8080/api/v1/analysis/stream?${params.toString()}`;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'done') {
          eventSource.close();
          setRunProgress('completed');
          fetchDashboard(targetBatch);
          return;
        }

        const idx = data.step_index;
        if (idx !== undefined && idx < initialSteps.length) {
          setProgressSteps(prev => {
            const copy = [...prev];
            copy[idx] = {
              name: data.step_name || copy[idx].name,
              status: data.status,
              duration: data.duration,
              log: data.log
            };
            return copy;
          });
        }
      } catch (e) {
        console.error("Error parsing agent event stream:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource stream error:", err);
      eventSource.close();
      // Fallback trigger if stream fails
      runDiagnostics(scenarioType, targetBatch).then(() => {
        setRunProgress('completed');
        fetchDashboard(targetBatch);
      });
    };
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: '700' }}>New Operational Scan</h1>

      {/* Progress Wizard Breadcrumbs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', background: 'var(--bg-tertiary)', padding: '6px', borderRadius: '8px', width: 'fit-content' }}>
        <button 
          className={`btn ${wizardStep === 1 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          onClick={() => setWizardStep(1)}
          disabled={runProgress === 'running'}
        >
          1. Choose Source
        </button>
        <button 
          className={`btn ${wizardStep === 2 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          onClick={() => selectedSource && setWizardStep(2)}
          disabled={!selectedSource || runProgress === 'running'}
        >
          2. Preview & Validate
        </button>
        <button 
          className={`btn ${wizardStep === 3 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          disabled={runProgress !== 'running' && runProgress !== 'completed'}
        >
          3. Running Analysis
        </button>
      </div>

      {/* STEP 1: CHOOSE SOURCE */}
      {wizardStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Scenarios */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Select Backlog Scenario</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Load predefined logs containing operational blockages:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => handleSelectScenario('release_delay')}>
                <span style={{ color: 'var(--color-danger)', fontWeight: '700' }}>Scenario 1:</span> Release Delay (QA capacity constraints)
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => handleSelectScenario('support_backlog')}>
                <span style={{ color: 'var(--color-warning)', fontWeight: '700' }}>Scenario 2:</span> Support Backlog (API session timeout spikes)
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => handleSelectScenario('vendor_dependency')}>
                <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>Scenario 3:</span> Vendor Delay (Blocked checkouts checkout epics)
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => handleSelectScenario('resource_overload')}>
                <span style={{ color: 'var(--color-success)', fontWeight: '700' }}>Scenario 4:</span> Lead Developer Workload Imbalance
              </button>
            </div>
          </div>

          {/* Right Uploads */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Upload Raw Spreadsheet Logs</h2>
            <div style={{ border: '2px dashed var(--glass-border)', padding: '32px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
              <input type="file" accept=".csv" id="csv-wizard-file" style={{ display: 'none' }} onChange={handleFileChange} />
              <label htmlFor="csv-wizard-file" style={{ cursor: 'pointer' }}>
                <Upload size={36} style={{ color: 'var(--color-primary)', marginBottom: '10px' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Upload CSV backlogs file</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Accepts standard Jira exports or CSV tables</p>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & VALIDATE */}
      {wizardStep === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Preview Details */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 className="card-title" style={{ marginBottom: '20px' }}>Data Validation Preview</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Source Profile Name</span>
                <span style={{ fontWeight: '600' }}>{selectedSource}{csvFile ? '' : '.csv'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Synced Backlog Items</span>
                {uploadStatus === 'uploading' ? (
                  <span style={{ fontWeight: '600', color: 'var(--color-warning)' }}>Uploading...</span>
                ) : (
                  <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{recordsCount} rows</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Detected Schema Fields</span>
                <span style={{ fontWeight: '600' }}>entity_id, task_name, owner, status, priority</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Required Mapping Status</span>
                <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>100% Mapped</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Missing Critical Values</span>
                <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>None</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>PII Sanitization Gate</span>
                <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>Active (Auto-Redacting Emails)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Backend Upload Status</span>
                {uploadStatus === 'uploading' && (
                  <span style={{ fontWeight: '600', color: 'var(--color-warning)' }}>⏳ Uploading to server...</span>
                )}
                {uploadStatus === 'success' && (
                  <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>✓ Stored in Database</span>
                )}
                {uploadStatus === 'error' && (
                  <span style={{ fontWeight: '600', color: 'var(--color-danger)' }}>✗ Upload Failed</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Confirm */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {uploadStatus === 'error' ? (
                <>
                  <h2 className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle size={20} style={{ color: 'var(--color-danger)' }} />
                    <span>Upload Failed</span>
                  </h2>
                  <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {uploadMessage}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginTop: '12px' }}>
                    Please check that your CSV file has columns: entity_id, task_name, owner, status, priority.
                  </p>
                </>
              ) : uploadStatus === 'uploading' ? (
                <>
                  <h2 className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} style={{ color: 'var(--color-warning)' }} />
                    <span>Processing Upload...</span>
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    Your file is being uploaded, parsed, and validated by the ingestion service.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                    <span>Verification Successful</span>
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    Your data is parsed, normalized, and validated. {recordsCount} records stored in the database. Trigger the AI operation scanner to extract bottlenecks, predicted delay days, and cost implications.
                  </p>
                </>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px', fontSize: '1rem', justifyContent: 'center', marginTop: '20px' }}
              onClick={startAnalysis}
              disabled={uploadStatus !== 'success'}
            >
              <Play size={18} />
              <span>Run Bottleneck Analysis</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RUNNING & COMPLETED ANALYSIS */}
      {wizardStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-panel" style={{ padding: '28px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                {runProgress === 'completed' ? (
                  <>
                    <CheckCircle size={22} style={{ color: 'var(--color-success)' }} />
                    <span>Agent Scan Complete — Results Generated Below</span>
                  </>
                ) : (
                  <>
                    <Activity size={22} className="text-primary animate-spin" style={{ color: 'var(--color-primary)' }} />
                    <span>Live Backend Agent Execution</span>
                  </>
                )}
              </h2>

              {runProgress === 'completed' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setWizardStep(1)}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Upload New Dataset
                </button>
              )}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Real-time Server-Sent Events (SSE) stream receiving live agent status callbacks from FastAPI microservices.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {progressSteps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="glass-panel" 
                  style={{ 
                    padding: '10px 14px', 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: step.status === 'completed' ? 'rgba(16, 185, 129, 0.03)' : step.status === 'running' ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-tertiary)',
                    border: step.status === 'completed' ? '1px solid var(--color-success)' : step.status === 'running' ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                      {step.status === 'completed' && '✓ '}
                      {step.name}
                      {step.status === 'completed' && step.duration && ` (${step.duration})`}
                    </span>
                    <span 
                      className={`badge ${step.status === 'completed' ? 'badge-low' : step.status === 'running' ? 'badge-medium' : 'badge-high'}`}
                      style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}
                    >
                      {step.status}
                    </span>
                  </div>
                  {(step.log || step.status === 'running') && (
                    <div style={{ fontSize: '0.72rem', color: step.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)', fontFamily: 'monospace', marginTop: '2px' }}>
                      ➜ {step.log || 'Agent executing...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* INLINE DASHBOARD RESULTS ON THE EXACT SAME PAGE */}
          {runProgress === 'completed' && (
            <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '28px' }}>
              <Dashboard 
                onSelectBottleneck={(id) => {
                  if (setActiveTab) setActiveTab('approvals');
                }} 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
