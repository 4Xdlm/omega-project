import { invoke } from '@tauri-apps/api/core';
import { RunResult } from '../types';

interface ResultsProps {
  result: RunResult;
  onBack: () => void;
}

function Results({ result, onBack }: ResultsProps) {
  const isPass = result.status === 'PASS';

  const handleOpenFolder = async () => {
    try {
      await invoke('open_output_folder');
    } catch (error) {
      console.error('Failed to open folder:', error);
      // Fallback: show path
      alert(`Output folder: omega-ui-output/`);
    }
  };

  const handleCopySummary = async () => {
    const summary = `OMEGA First Cycle Report
========================
Status: ${result.status}
Duration: ${result.duration_ms}ms
Workspace: ${result.workspace}
Timestamp: ${result.timestamp}
${result.summary.invariants !== null ? `Invariants: ${result.summary.invariants}` : ''}
${result.summary.tests !== null ? `Tests: ${result.summary.tests}` : ''}

Notes:
${result.summary.notes.map(n => `- ${n}`).join('\n')}
`;

    try {
      await navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="results-screen">
      <div className={`result-banner ${isPass ? 'pass' : 'fail'}`}>
        <h2>{isPass ? '✅ PASS' : '❌ FAIL'}</h2>
        <p>First cycle completed</p>
      </div>

      <div className="result-details">
        <h3>Summary</h3>
        
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-value" style={{ color: isPass ? 'var(--success)' : 'var(--error)' }}>
            {result.status}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Duration</span>
          <span className="detail-value">{result.duration_ms}ms</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Timestamp</span>
          <span className="detail-value">{new Date(result.timestamp).toLocaleString()}</span>
        </div>

        {result.summary.invariants !== null && (
          <div className="detail-row">
            <span className="detail-label">Invariants</span>
            <span className="detail-value">{result.summary.invariants}</span>
          </div>
        )}

        {result.summary.tests !== null && (
          <div className="detail-row">
            <span className="detail-label">Tests</span>
            <span className="detail-value">{result.summary.tests}</span>
          </div>
        )}

        <div className="detail-row">
          <span className="detail-label">Workspace</span>
          <span className="detail-value" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            {result.workspace}
          </span>
        </div>

        {result.summary.notes.length > 0 && (
          <div className="result-notes">
            <strong>Notes:</strong>
            <ul>
              {result.summary.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="result-actions">
        <button className="btn btn-primary" onClick={handleOpenFolder}>
          📂 Open Output Folder
        </button>
        <button className="btn btn-secondary" onClick={handleCopySummary}>
          📋 Copy Summary
        </button>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

export default Results;
