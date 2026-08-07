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
      setUploadStatus('success');
      setUploadMessage(`File "${file.name}" staged. Click "Run Agent Scan" to upload and analyze.`);
    }
  };

  const startAnalysis = async () => {
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

    let targetBatch = activeBatchId || '';

    // Step A: Ingest staged CSV or Scenario FIRST
    if (csvFile) {
      setUploadStatus('uploading');
      setUploadMessage('Uploading and parsing CSV file...');
      const result = await uploadCSV(csvFile);
      if (result.status === 'success') {
        setUploadStatus('success');
        setUploadMessage(result.message);
        if (result.batch_id) targetBatch = result.batch_id;
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

      {/* TOP UNIFIED ACTION BAR */}
      <div className="glass-panel" style={{ padding: '20px' }}>
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
                  justify: 'flex-start', 
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
                  background: step.status === 'completed' ? 'rgba(16, 185, 129, 0.03)' : step.status === 'running' ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-tertiary)',
                  border: step.status === 'completed' ? '1px solid var(--color-success)' : step.status === 'running' ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                    {step.status === 'completed' && '✓ '}
                    {step.name}
                    {step.status === 'completed' && step.duration && ` (${step.duration})`}
                  </span>
                  <span 
                    className={`badge ${step.status === 'completed' ? 'badge-low' : step.status === 'running' ? 'badge-medium' : 'badge-high'}`}
                    style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                  >
                    {step.status}
                  </span>
                </div>
                {(step.log || step.status === 'running') && (
                  <div style={{ fontSize: '0.7rem', color: step.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)', fontFamily: 'monospace' }}>
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
          onSelectBottleneck={(id) => {
            if (setActiveTab) setActiveTab('approvals');
          }} 
        />
      </div>
    </div>
  );
};
