import React, { createContext, useState, useContext, useEffect } from 'react';

const API_BASE = 'http://localhost:8080/api/v1';

export interface DashboardStats {
  operational_health_score: number;
  active_bottlenecks_count: number;
  critical_bottlenecks_count: number;
  predicted_sla_breaches: number;
  affected_customers_count: number;
  estimated_delay_days: number;
  estimated_cost_impact: number;
  trend_summary: string;
  severity_distribution: Record<string, number>;
  source_distribution: Record<string, number>;
}

export interface Recommendation {
  id: number;
  bottleneck_title: string;
  action: string;
  owner: string;
  deadline: string;
  expected_outcome: string;
  expected_risk_reduction: number;
  priority: number;
}

export interface BottleneckDetail {
  id: number;
  title: string;
  summary: string;
  process: string;
  severity: string;
  impact_score: number;
  confidence: number;
  estimated_delay_days: number;
  estimated_cost_impact: number;
  sla_risk: string;
  detected_time: string;
  evidence: { id: number; details: string }[];
  root_causes: { id: number; hypothesis: string; confidence: number }[];
  recommendations: { id: number; action: string; owner: string; deadline: string; status: string; expected_outcome: string; approval_required: boolean; expected_risk_reduction?: number }[];
}

export interface AuditLog {
  id: number;
  agent_name: string;
  action_performed: string;
  input_ref: string | null;
  output_summary: string;
  status: string;
  timestamp: string;
  model_used: string | null;
  latency: number;
}

export interface SystemConfig {
  sla_weight_customer: number;
  sla_weight_sla: number;
  sla_weight_delay: number;
  sla_weight_cost: number;
  sla_weight_revenue: number;
  sla_weight_scope: number;
  slack_webhook_url: string | null;
  active_model: string;
}

export interface UploadResult {
  status: string;
  message: string;
  records_count?: number;
  batch_id?: string;
}

export interface BatchItem {
  batch_id: string;
  source: string;
  record_count: number;
  created_date?: string;
}

export interface SystemContextProps {
  stats: DashboardStats | null;
  bottlenecks: BottleneckDetail[];
  approvals: Recommendation[];
  auditLogs: AuditLog[];
  loading: boolean;
  selectedBottleneck: BottleneckDetail | null;
  diagnosticStatus: 'idle' | 'running' | 'completed';
  diagnosticSteps: { name: string; status: 'idle' | 'running' | 'completed'; log?: string }[];
  activeRole: string;
  config: SystemConfig | null;
  batches: BatchItem[];
  activeBatchId: string | null;
  setActiveBatchId: (batchId: string | null) => void;
  setActiveRole: (role: string) => void;
  fetchDashboard: (batchId?: string | null) => Promise<void>;
  fetchBatches: () => Promise<void>;
  uploadCSV: (file: File) => Promise<UploadResult>;
  loadScenario: (scenario: string) => Promise<void>;
  runDiagnostics: (scenarioType?: string, batchId?: string | null) => Promise<void>;
  approveRecommendation: (id: number, approver: string, comment?: string) => Promise<void>;
  rejectRecommendation: (id: number, approver: string, comment?: string) => Promise<void>;
  selectBottleneckById: (id: number) => Promise<void>;
  fetchConfig: () => Promise<void>;
  saveConfig: (newConfig: SystemConfig) => Promise<void>;
  submitFeedback: (feedback: { bottleneck_id: number; is_valid: boolean; is_root_cause_correct: boolean; is_recommendation_useful: boolean; reviewer_comments?: string }) => Promise<void>;
}

const SystemContext = createContext<SystemContextProps | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottleneckDetail[]>([]);
  const [approvals, setApprovals] = useState<Recommendation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBottleneck, setSelectedBottleneck] = useState<BottleneckDetail | null>(null);
  const [activeRole, setActiveRole] = useState<string>('Approver');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  
  // Simulation Steps
  const [diagnosticStatus, setDiagnosticStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [diagnosticSteps, setDiagnosticSteps] = useState<SystemContextProps['diagnosticSteps']>([
    { name: 'Data Ingestion Service', status: 'idle' },
    { name: 'PII Normalization & Redaction Agent', status: 'idle' },
    { name: 'Data Analysis Agent (Throughput/Cycle Time)', status: 'idle' },
    { name: 'Bottleneck Detection Agent (Static Rules)', status: 'idle' },
    { name: 'RAG Knowledge Agent (SOPs/SLAs Context)', status: 'idle' },
    { name: 'Gemini Pro Reasoning Agent (Root Cause)', status: 'idle' },
    { name: 'Business Impact Agent (Formula Weighting)', status: 'idle' },
    { name: 'Recommendation Generation Agent', status: 'idle' }
  ]);

  const fetchBatches = async () => {
    try {
      const res = await fetch(`${API_BASE}/ingestions/batches`);
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const fetchDashboard = async (overrideBatchId?: string | null) => {
    try {
      const targetBatch = overrideBatchId !== undefined ? overrideBatchId : activeBatchId;
      const bQuery = targetBatch ? `?batch_id=${encodeURIComponent(targetBatch)}` : '';

      const statsRes = await fetch(`${API_BASE}/dashboard${bQuery}`);
      const statsData = await statsRes.json();
      setStats(statsData);

      const bRes = await fetch(`${API_BASE}/bottlenecks${bQuery}`);
      const bData = await bRes.json();
      setBottlenecks(bData);

      const aRes = await fetch(`${API_BASE}/approvals`);
      const aData = await aRes.json();
      setApprovals(aData);

      const logRes = await fetch(`${API_BASE}/audit-logs`);
      const logData = await logRes.json();
      setAuditLogs(logData);

      await fetchBatches();
    } catch (err) {
      console.error("Error loading system metrics: ", err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error(err);
    }
  };

  const saveConfig = async (newConfig: SystemConfig) => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error(err);
    }
  };

  const submitFeedback = async (feedback: any) => {
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const loadScenario = async (scenario: string) => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/ingestions/sample?scenario=${scenario}`, { method: 'POST' });
      await fetchDashboard();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadCSV = async (file: File): Promise<UploadResult> => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'CSV_Upload');
      const res = await fetch(`${API_BASE}/ingestions/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.batch_id) {
        setActiveBatchId(data.batch_id);
      }
      return data;
    } catch (err) {
      console.error('CSV upload failed:', err);
      return { status: 'error', message: 'Upload failed' };
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async (scenarioType?: string, overrideBatchId?: string | null) => {
    setDiagnosticStatus('running');

    try {
      const targetBatch = overrideBatchId !== undefined ? overrideBatchId : activeBatchId;
      const params = new URLSearchParams();
      if (scenarioType) params.append('scenario_type', scenarioType);
      if (targetBatch) params.append('batch_id', targetBatch);
      const q = params.toString() ? `?${params.toString()}` : '';

      await fetch(`${API_BASE}/analysis/run${q}`, { method: 'POST' });
      await fetchDashboard(targetBatch);
      setDiagnosticStatus('completed');
    } catch (err) {
      console.error(err);
      setDiagnosticStatus('idle');
    }
  };

  const approveRecommendation = async (id: number, approver: string, comment = '') => {
    try {
      await fetch(`${API_BASE}/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver, status: 'Approved', reviewer_comments: comment })
      });
      await fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const rejectRecommendation = async (id: number, approver: string, comment = '') => {
    try {
      await fetch(`${API_BASE}/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver, status: 'Rejected', reviewer_comments: comment })
      });
      await fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const selectBottleneckById = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/bottlenecks/${id}`);
      const data = await res.json();
      setSelectedBottleneck(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchConfig();
  }, []);

  return (
    <SystemContext.Provider value={{
      stats,
      bottlenecks,
      approvals,
      auditLogs,
      loading,
      selectedBottleneck,
      diagnosticStatus,
      diagnosticSteps,
      activeRole,
      config,
      batches,
      activeBatchId,
      setActiveBatchId,
      setActiveRole,
      fetchDashboard,
      fetchBatches,
      uploadCSV,
      loadScenario,
      runDiagnostics,
      approveRecommendation,
      rejectRecommendation,
      selectBottleneckById,
      fetchConfig,
      saveConfig,
      submitFeedback
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) throw new Error("useSystem must be used inside SystemProvider");
  return context;
};

