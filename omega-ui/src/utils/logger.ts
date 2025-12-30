// ═══════════════════════════════════════════════════════════════════════════
// OMEGA UI Bootstrap — Logger Utility
// ═══════════════════════════════════════════════════════════════════════════

export type LogLevel = 'info' | 'success' | 'error' | 'warning';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

/**
 * Create a timestamped log entry
 */
export function createLogEntry(message: string, level: LogLevel = 'info'): LogEntry {
  return {
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    level,
    message,
  };
}

/**
 * Format a log entry for display
 */
export function formatLogEntry(entry: LogEntry): string {
  return `[${entry.timestamp}] ${entry.message}`;
}

/**
 * Get the output directory path
 */
export function getOutputDir(): string {
  return 'omega-ui-output';
}

/**
 * Generate a timestamp-based filename prefix
 */
export function generateFilenamePrefix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
