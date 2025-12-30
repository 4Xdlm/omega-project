// ═══════════════════════════════════════════════════════════════════════════
// OMEGA UI Bootstrap — Shared Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of a first cycle run
 */
export interface RunResult {
  /** ISO timestamp of the run */
  timestamp: string;
  /** Path to the workspace */
  workspace: string;
  /** Overall status */
  status: 'PASS' | 'FAIL';
  /** Duration in milliseconds */
  duration_ms: number;
  /** Summary details */
  summary: {
    /** Number of tests run (null if not applicable) */
    tests: number | null;
    /** Number of invariants checked (null if not applicable) */
    invariants: number | null;
    /** Notes/messages from the run */
    notes: string[];
  };
}

/**
 * A single log line in the console
 */
export interface LogLine {
  /** Timestamp string (HH:MM:SS) */
  timestamp: string;
  /** Log message */
  message: string;
  /** Log level for styling */
  level: 'info' | 'success' | 'error' | 'warning';
}

/**
 * Application state
 */
export interface AppState {
  /** Current screen */
  screen: 'home' | 'run' | 'results';
  /** Selected workspace path */
  workspace: string | null;
  /** Last run result */
  result: RunResult | null;
}
