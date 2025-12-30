import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RunResult, LogLine } from '../types';
import { createLogEntry } from '../utils/logger';

interface UseRunnerReturn {
  logs: LogLine[];
  status: 'idle' | 'running' | 'pass' | 'fail';
  result: RunResult | null;
  isRunning: boolean;
  runCycle: (workspace: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook to manage the first cycle execution
 */
export function useRunner(): UseRunnerReturn {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'pass' | 'fail'>('idle');
  const [result, setResult] = useState<RunResult | null>(null);

  const addLog = useCallback((message: string, level: LogLine['level'] = 'info') => {
    const entry = createLogEntry(message, level);
    setLogs(prev => [...prev, entry]);
  }, []);

  const runCycle = useCallback(async (workspace: string) => {
    // Reset state
    setLogs([]);
    setResult(null);
    setStatus('running');

    const startTime = Date.now();

    try {
      addLog('Starting first cycle...', 'info');
      addLog(`Workspace: ${workspace}`, 'info');
      addLog('', 'info');

      addLog('📂 Checking workspace structure...', 'info');

      // Call Tauri backend
      const cycleResult = await invoke<RunResult>('run_first_cycle', {
        workspacePath: workspace,
      });

      // Log the checks
      addLog('', 'info');
      cycleResult.summary.notes.forEach(note => {
        if (note.startsWith('✓')) {
          addLog(note, 'success');
        } else if (note.startsWith('✗')) {
          addLog(note, 'error');
        } else if (note.startsWith('⚠')) {
          addLog(note, 'warning');
        } else {
          addLog(note, 'info');
        }
      });

      // Final status
      addLog('', 'info');
      if (cycleResult.status === 'PASS') {
        addLog('═══════════════════════════════════════', 'info');
        addLog('✅ All checks completed!', 'success');
        addLog(`   Invariants checked: ${cycleResult.summary.invariants ?? 0}`, 'success');
        addLog('═══════════════════════════════════════', 'info');
        setStatus('pass');
      } else {
        addLog('═══════════════════════════════════════', 'info');
        addLog('❌ Cycle completed with issues', 'error');
        addLog('═══════════════════════════════════════', 'info');
        setStatus('fail');
      }

      addLog('', 'info');
      addLog(`Duration: ${cycleResult.duration_ms}ms`, 'info');
      addLog('Output saved to: omega-ui-output/', 'info');

      setResult(cycleResult);

    } catch (error) {
      const duration = Date.now() - startTime;
      addLog('', 'info');
      addLog(`❌ Error: ${error}`, 'error');
      setStatus('fail');

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
      setResult(errorResult);
    }
  }, [addLog]);

  const reset = useCallback(() => {
    setLogs([]);
    setStatus('idle');
    setResult(null);
  }, []);

  return {
    logs,
    status,
    result,
    isRunning: status === 'running',
    runCycle,
    reset,
  };
}
