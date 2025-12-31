// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA HOLOGRAPH PANEL — Coherence Scanner UI
// NASA-Grade AS9100D
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CoherenceIssue {
  issue_type: string;
  severity: string;
  description: string;
  evidence: string[];
  location: string | null;
  suggestion: string | null;
}

interface HolographReport {
  logic_score: number;
  dynamics_score: number;
  overall_score: number;
  issues: CoherenceIssue[];
  scan_duration_ms: number;
}

interface HolographPanelProps {
  text: string;
}

const severityColors: Record<string, string> = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#ca8a04',
  Low: '#65a30d',
};

const issueTypeLabels: Record<string, string> = {
  Contradiction: '⚠️ Contradiction',
  TemporalError: '🕐 Erreur temporelle',
  EmotionShift: '💫 Changement émotionnel',
  CharacterInconsistency: '👤 Incohérence personnage',
};

export const HolographPanel: React.FC<HolographPanelProps> = ({ text }) => {
  const [report, setReport] = useState<HolographReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    if (!text.trim()) {
      setError('Aucun texte à analyser');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<HolographReport>('scan_holograph', { text });
      setReport(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return '#22c55e';
    if (score >= 0.7) return '#eab308';
    if (score >= 0.5) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#1a1a2e', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#e0e0e0' }}>🔍 HOLOGRAPH — Scan Cohérence</h3>
        <button
          onClick={runScan}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading ? '#4a4a6a' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Analyse...' : 'Scanner'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.5rem', backgroundColor: '#7f1d1d', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {report && (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2a2a4a', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>LOGIC</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(report.logic_score) }}>
                {(report.logic_score * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2a2a4a', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>DYNAMICS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(report.dynamics_score) }}>
                {(report.dynamics_score * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2a2a4a', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>GLOBAL</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(report.overall_score) }}>
                {(report.overall_score * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Scan: {report.scan_duration_ms}ms | {report.issues.length} problème(s)
          </div>

          {report.issues.length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {report.issues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    backgroundColor: '#2a2a4a',
                    borderLeft: `3px solid ${severityColors[issue.severity] || '#6b7280'}`,
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#e0e0e0' }}>
                    {issueTypeLabels[issue.issue_type] || issue.issue_type}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{issue.description}</div>
                  {issue.suggestion && (
                    <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.25rem' }}>
                      💡 {issue.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {report.issues.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#22c55e' }}>
              ✅ Aucune incohérence détectée
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HolographPanel;
