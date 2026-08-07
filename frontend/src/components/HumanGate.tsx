import React, { useState, useEffect } from 'react';
import { useSystem } from '../context/SystemState';
import { ShieldCheck, XCircle, User, MessageSquare, Star, Award, CheckCircle } from 'lucide-react';

export const HumanGate: React.FC = () => {
  const { approvals, activeRole, approveRecommendation, rejectRecommendation, submitFeedback, fetchDashboard } = useSystem();
  
  useEffect(() => {
    fetchDashboard();
  }, []);
  
  const [approverName, setApproverName] = useState<string>('Ops Manager');
  const [comments, setComments] = useState<Record<number, string>>({});
  const [activeToast, setActiveToast] = useState<string | null>(null);
  
  // Feedback states
  const [feedbackState, setFeedbackState] = useState<{
    recId: number | null;
    is_valid: boolean;
    is_root_cause_correct: boolean;
    is_recommendation_useful: boolean;
    reviewer_comments: string;
  }>({
    recId: null,
    is_valid: true,
    is_root_cause_correct: true,
    is_recommendation_useful: true,
    reviewer_comments: ''
  });

  const handleApprove = async (id: number, bottleneckId: number, actionName: string) => {
    await approveRecommendation(id, approverName, comments[id] || 'Approved for mitigation.');
    setComments({ ...comments, [id]: '' });
    
    // Show success toast simulating Slack/Jira hooks
    setActiveToast(`Success: Action authorized. Triggered Slack alert and created Jira issue.`);
    
    // Open feedback scorecard panel
    setFeedbackState({
      recId: id,
      is_valid: true,
      is_root_cause_correct: true,
      is_recommendation_useful: true,
      reviewer_comments: ''
    });
    
    setTimeout(() => setActiveToast(null), 5000);
  };

  const handleReject = async (id: number, actionName: string) => {
    await rejectRecommendation(id, approverName, comments[id] || 'Rejected.');
    setComments({ ...comments, [id]: '' });
  };

  const submitFeedbackScorecard = async () => {
    if (!feedbackState.recId) return;
    
    // Find bottleneck ID from the approvals or default to 1 for MVP
    await submitFeedback({
      bottleneck_id: 1, // Defaulting to 1
      is_valid: feedbackState.is_valid,
      is_root_cause_correct: feedbackState.is_root_cause_correct,
      is_recommendation_useful: feedbackState.is_recommendation_useful,
      reviewer_comments: feedbackState.reviewer_comments
    });
    
    setFeedbackState({ ...feedbackState, recId: null });
    alert('Thank you! Your feedback has been stored to optimize future reasoning prompts.');
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: '700' }}>Human-in-the-Loop Approval Gate</h1>

      {activeToast && (
        <div 
          className="glass-panel" 
          style={{ 
            background: 'var(--color-success-glow)', 
            border: '1px solid var(--color-success)', 
            color: 'var(--color-success)', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontWeight: '600'
          }}
        >
          {activeToast}
        </div>
      )}

      {/* Inline Feedback Scorecard overlay */}
      {feedbackState.recId && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-primary)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award style={{ color: 'var(--color-primary)' }} />
            <span>Closed-Loop Agent Evaluation Scorecard</span>
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Help us evaluate the LLM decision quality. This feedback is logged directly to our audit records.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Was the bottleneck valid?</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`btn ${feedbackState.is_valid ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFeedbackState({ ...feedbackState, is_valid: true })}>Yes</button>
                <button className={`btn ${!feedbackState.is_valid ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFeedbackState({ ...feedbackState, is_valid: false })}>No</button>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Was the root cause correct?</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`btn ${feedbackState.is_root_cause_correct ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFeedbackState({ ...feedbackState, is_root_cause_correct: true })}>Yes</button>
                <button className={`btn ${!feedbackState.is_root_cause_correct ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFeedbackState({ ...feedbackState, is_root_cause_correct: false })}>No</button>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '16px', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Was the action useful?</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`btn ${feedbackState.is_recommendation_useful ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFeedbackState({ ...feedbackState, is_recommendation_useful: true })}>Yes</button>
                <button className={`btn ${!feedbackState.is_recommendation_useful ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFeedbackState({ ...feedbackState, is_recommendation_useful: false })}>No</button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Additional Feedback Comments</label>
            <input 
              type="text" className="btn btn-secondary" style={{ width: '100%', cursor: 'text', textAlign: 'left' }}
              value={feedbackState.reviewer_comments} onChange={(e) => setFeedbackState({ ...feedbackState, reviewer_comments: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={submitFeedbackScorecard}>
              <CheckCircle size={16} />
              <span>Submit Evaluation</span>
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left: Review Settings */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 className="card-title" style={{ marginBottom: '16px' }}>Approver Context</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Reviewer Username / Role
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', paddingLeft: '32px', textAlign: 'left', cursor: 'text' }}
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                />
                <User size={14} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Any actions altering external system states (e.g. Jira modifications or Slack alerts) are queued here.
            </p>
          </div>
        </div>

        {/* Right: Approval Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {approvals.map((rec) => (
            <div key={rec.id} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span className="badge badge-high" style={{ marginBottom: '8px', display: 'inline-block' }}>
                    Priority {rec.priority}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>{rec.bottleneck_title}</h3>
                </div>
                <span className="badge badge-medium">Requires Approval</span>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Proposed Action</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '500', marginTop: '4px' }}>{rec.action}</div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assignee:</span>
                  <span style={{ marginLeft: '8px', fontWeight: '600' }}>{rec.owner}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Risk Reduction:</span>
                  <span style={{ marginLeft: '8px', fontWeight: '600', color: 'var(--color-success)' }}>-{rec.expected_risk_reduction}%</span>
                </div>
              </div>

              {/* Action Section with RBAC Lock */}
              {activeRole === 'Approver' ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flexGrow: 1 }}>
                    <input
                      type="text"
                      placeholder="Add feedback or justification..."
                      className="btn btn-secondary"
                      style={{ width: '100%', paddingLeft: '32px', textAlign: 'left', cursor: 'text' }}
                      value={comments[rec.id] || ''}
                      onChange={(e) => setComments({ ...comments, [rec.id]: e.target.value })}
                    />
                    <MessageSquare size={14} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  </div>

                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleApprove(rec.id, 1, rec.action)}
                  >
                    <ShieldCheck size={18} />
                    <span>Authorize</span>
                  </button>

                  <button 
                    className="btn btn-danger"
                    onClick={() => handleReject(rec.id, rec.action)}
                  >
                    <XCircle size={18} />
                    <span>Reject</span>
                  </button>
                </div>
              ) : (
                <div style={{ 
                  background: 'var(--color-danger-glow)', 
                  border: '1px solid var(--color-danger)', 
                  color: 'var(--color-danger)', 
                  padding: '12px 16px', 
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  🔒 Governance Lock: Your active session role is {activeRole.toUpperCase()}. Switch to APPROVER role in Settings to authorize mitigations.
                </div>
              )}
            </div>
          ))}

          {approvals.length === 0 && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No items in approval queue. All systems operating within normal parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

