import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RunResult, LogLine } from '../types';

interface RunConsoleProps {
  workspace: string;
  onComplete: (result: RunResult) => void;
  onBack: () => void;
}

function RunConsole({ workspace, onComplete, onBack }: RunConsoleProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<'running' | 'pass' | 'fail'>('running');
  const [isRunning, setIsRunning] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const addLog = (message: string, level: LogLine['level'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { timestamp, message, level }]);
  };

  useEffect(() => {
    const runCycle = async () => {
      const startTime = Date.now();
      
      try {
        addLog('Starting first cycle...', 'info');
        addLog(`Workspace: ${workspace}`, 'info');
        addLog('', 'info');

        // Check if aborted
        if (abortRef.current) {
          addLog('⛔ Run aborted by user', 'warning');
          setStatus('fail');
          setIsRunning(false);
          return;
        }

        addLog('📂 Checking workspace structure...', 'info');
        
        // Call Tauri backend to run the cycle
        const result = await invoke<RunResult>('run_first_cycle', { 
          workspacePath: workspace 
        });

        if (abortRef.current) {
          addLog('⛔ Run aborted by user', 'warning');
          setStatus('fail');
          setIsRunning(false);
          return;
        }

        // Log the result
        addLog('', 'info');
        if (result.status === 'PASS') {
          addLog('✅ All checks passed!', 'success');
          if (result.summary.invariants !== null) {
            addLog(`   Invariants checked: ${result.summary.invariants}`, 'success');
          }
          setStatus('pass');
        } else {
          addLog('❌ Cycle failed', 'error');
          result.summary.notes.forEach(note => {
            addLog(`   ${note}`, 'error');
          });
          setStatus('fail');
        }

        addLog('', 'info');
        addLog(`Duration: ${result.duration_ms}ms`, 'info');
        addLog(`Output saved to: omega-ui-output/`, 'info');

        setIsRunning(false);
        onComplete(result);

      } catch (error) {
        const duration = Date.now() - startTime;
        addLog('', 'info');
        addLog(`❌ Error: ${error}`, 'error');
        setStatus('fail');
        setIsRunning(false);
        
        // Create error result
        const errorResult: RunResult = {
          timestamp: new Date().toISOString(),
          workspace,
          status: 'FAIL',
          duration_ms: duration,
          summary: {
            tests: null,
            invariants: null,
            notes: [`Error: ${error}`],
          },
        };
        onComplete(errorResult);
      }
    };

    runCycle();
  }, [workspace, onComplete]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStop = () => {
    abortRef.current = true;
    addLog('🛑 Stop requested...', 'warning');
  };

  return (
    <div className="run-console">
      <div className="console-header">
        <h2>Running Cycle...</h2>
        {isRunning && (
          <button className="btn btn-danger" onClick={handleStop}>
            ⏹️ Stop
          </button>
        )}
        {!isRunning && (
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
        )}
      </div>

      <div className="console-output" ref={consoleRef}>
        {logs.map((log, index) => (
          <div key={index} className={`console-line ${log.level}`}>
            <span style={{ color: 'var(--text-secondary)' }}>[{log.timestamp}]</span>{' '}
            {log.message}
          </div>
        ))}
        {isRunning && (
          <div className="console-line info" style={{ opacity: 0.7 }}>
            █
          </div>
        )}
      </div>

      <div className="status-bar">
        <div className={`status-indicator ${status}`}></div>
        <span>
          {status === 'running' && 'Running...'}
          {status === 'pass' && 'PASS'}
          {status === 'fail' && 'FAIL'}
        </span>
      </div>
    </div>
  );
}

export default RunConsole;
