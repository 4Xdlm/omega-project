/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Forensic Logger
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-Grade forensic logging with:
 * - Structured JSON format (INV-LOG-02)
 * - SHA256 hash per entry (INV-LOG-03)
 * - Exactly one log per operation (INV-LOG-01)
 * - Automatic file rotation
 * 
 * @module forensic_logger
 * @version 3.13.0
 */

import { createHash } from 'crypto';
import { writeFile, readFile, stat, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Log levels ordered by severity */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

/** Log level numeric values for comparison */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

/** Structured forensic log entry - INV-LOG-02 */
export interface ForensicLogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log severity level */
  level: LogLevel;
  /** Operation name */
  operation: string;
  /** Source module */
  module: string;
  /** SHA256 hash of inputs */
  input_hash: string;
  /** SHA256 hash of outputs */
  output_hash: string;
  /** Execution duration in milliseconds */
  duration_ms: number;
  /** Operation success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** SHA256 hash of this entry - INV-LOG-03 */
  entry_hash: string;
  /** Sequence number for ordering */
  sequence: number;
  /** Previous entry hash for chain integrity */
  previous_hash: string;
}

/** Logger configuration */
export interface ForensicLoggerConfig {
  /** Log file path */
  logPath: string;
  /** Minimum log level to record */
  minLevel: LogLevel;
  /** Maximum file size in bytes before rotation */
  maxFileSize: number;
  /** Maximum number of rotated files to keep */
  maxFiles: number;
  /** Enable console output */
  consoleOutput: boolean;
  /** Pretty print JSON in console */
  prettyPrint: boolean;
}

/** Default configuration */
export const DEFAULT_CONFIG: ForensicLoggerConfig = {
  logPath: './logs/omega_forensic.log',
  minLevel: 'INFO',
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxFiles: 5,
  consoleOutput: false,
  prettyPrint: false
};

/** JSON Schema for log entry validation - INV-LOG-02 */
export const LOG_ENTRY_SCHEMA = {
  type: 'object',
  required: [
    'timestamp',
    'level',
    'operation',
    'module',
    'input_hash',
    'output_hash',
    'duration_ms',
    'success',
    'entry_hash',
    'sequence',
    'previous_hash'
  ],
  properties: {
    timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}' },
    level: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] },
    operation: { type: 'string', minLength: 1 },
    module: { type: 'string', minLength: 1 },
    input_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    output_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    duration_ms: { type: 'number', minimum: 0 },
    success: { type: 'boolean' },
    error: { type: 'string' },
    metadata: { type: 'object' },
    entry_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    sequence: { type: 'number', minimum: 0 },
    previous_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' }
  }
} as const;

/** Genesis hash for first entry in chain */
export const GENESIS_HASH = '0'.repeat(64);

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA256 hash of data
 * @param data - Data to hash (string or object)
 * @returns 64-character hex string
 */
export function computeHash(data: unknown): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Validate log entry against schema - INV-LOG-02
 * @param entry - Log entry to validate
 * @returns Validation result with errors if any
 */
export function validateLogEntry(entry: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry must be an object'] };
  }
  
  const e = entry as Record<string, unknown>;
  
  // Check required fields
  for (const field of LOG_ENTRY_SCHEMA.required) {
    if (!(field in e)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate timestamp format
  if (typeof e.timestamp === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(e.timestamp)) {
      errors.push('Invalid timestamp format (expected ISO 8601)');
    }
  } else if (e.timestamp !== undefined) {
    errors.push('timestamp must be a string');
  }
  
  // Validate level
  if (e.level !== undefined && !['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(e.level as string)) {
    errors.push('Invalid log level');
  }
  
  // Validate hashes (64 hex chars)
  const hashFields = ['input_hash', 'output_hash', 'entry_hash', 'previous_hash'];
  for (const field of hashFields) {
    if (typeof e[field] === 'string') {
      if (!/^[a-f0-9]{64}$/.test(e[field] as string)) {
        errors.push(`${field} must be a 64-character hex string`);
      }
    }
  }
  
  // Validate duration
  if (typeof e.duration_ms === 'number' && e.duration_ms < 0) {
    errors.push('duration_ms must be non-negative');
  }
  
  // Validate success
  if (e.success !== undefined && typeof e.success !== 'boolean') {
    errors.push('success must be a boolean');
  }
  
  // Validate sequence
  if (typeof e.sequence === 'number' && e.sequence < 0) {
    errors.push('sequence must be non-negative');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Verify entry hash integrity - INV-LOG-03
 * @param entry - Log entry to verify
 * @returns true if hash is valid
 */
export function verifyEntryHash(entry: ForensicLogEntry): boolean {
  const { entry_hash, ...entryWithoutHash } = entry;
  const computed = computeHash(entryWithoutHash);
  return computed === entry_hash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORENSIC LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Forensic Logger - NASA-grade logging with integrity guarantees
 * 
 * Invariants:
 * - INV-LOG-01: Each operation generates exactly 1 log
 * - INV-LOG-02: Strict JSON format validated by schema
 * - INV-LOG-03: SHA256 hash of each entry
 */
export class ForensicLogger {
  private config: ForensicLoggerConfig;
  private sequence: number = 0;
  private previousHash: string = GENESIS_HASH;
  private buffer: ForensicLogEntry[] = [];
  private flushPromise: Promise<void> | null = null;
  private operationCounter: Map<string, number> = new Map();
  
  constructor(config: Partial<ForensicLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Get current configuration (immutable copy)
   */
  getConfig(): Readonly<ForensicLoggerConfig> {
    return { ...this.config };
  }
  
  /**
   * Get current sequence number
   */
  getSequence(): number {
    return this.sequence;
  }
  
  /**
   * Get previous hash (for chain verification)
   */
  getPreviousHash(): string {
    return this.previousHash;
  }
  
  /**
   * Check if level should be logged based on config
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[this.config.minLevel];
  }
  
  /**
   * Create a log entry - INV-LOG-01: exactly one entry per call
   */
  private createEntry(
    level: LogLevel,
    operation: string,
    module: string,
    input: unknown,
    output: unknown,
    duration_ms: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, unknown>
  ): ForensicLogEntry {
    // Track operation for INV-LOG-01 verification
    const opKey = `${operation}:${Date.now()}`;
    const count = this.operationCounter.get(opKey) || 0;
    this.operationCounter.set(opKey, count + 1);
    
    // Clean old entries (keep last 1000)
    if (this.operationCounter.size > 1000) {
      const keys = Array.from(this.operationCounter.keys()).slice(0, 500);
      keys.forEach(k => this.operationCounter.delete(k));
    }
    
    const entryWithoutHash = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      module,
      input_hash: computeHash(input),
      output_hash: computeHash(output),
      duration_ms,
      success,
      ...(error && { error }),
      ...(metadata && { metadata }),
      sequence: this.sequence,
      previous_hash: this.previousHash
    };
    
    const entry_hash = computeHash(entryWithoutHash);
    
    const entry: ForensicLogEntry = {
      ...entryWithoutHash,
      entry_hash
    };
    
    // Update chain state
    this.sequence++;
    this.previousHash = entry_hash;
    
    return entry;
  }
  
  /**
   * Log an operation - main entry point
   * INV-LOG-01: Generates exactly 1 log entry
   */
  async log(
    level: LogLevel,
    operation: string,
    module: string,
    input: unknown,
    output: unknown,
    duration_ms: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, unknown>
  ): Promise<ForensicLogEntry | null> {
    if (!this.shouldLog(level)) {
      return null;
    }
    
    const entry = this.createEntry(
      level,
      operation,
      module,
      input,
      output,
      duration_ms,
      success,
      error,
      metadata
    );
    
    // Validate entry - INV-LOG-02
    const validation = validateLogEntry(entry);
    if (!validation.valid) {
      throw new Error(`Log entry validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Verify hash - INV-LOG-03
    if (!verifyEntryHash(entry)) {
      throw new Error('Entry hash verification failed');
    }
    
    // Buffer entry
    this.buffer.push(entry);
    
    // Console output if enabled
    if (this.config.consoleOutput) {
      const output = this.config.prettyPrint 
        ? JSON.stringify(entry, null, 2)
        : JSON.stringify(entry);
      console.log(output);
    }
    
    // Flush buffer
    await this.flush();
    
    return entry;
  }
  
  /**
   * Convenience methods for each log level
   */
  async debug(operation: string, module: string, input: unknown, output: unknown, duration_ms: number, metadata?: Record<string, unknown>): Promise<ForensicLogEntry | null> {
    return this.log('DEBUG', operation, module, input, output, duration_ms, true, undefined, metadata);
  }
  
  async info(operation: string, module: string, input: unknown, output: unknown, duration_ms: number, metadata?: Record<string, unknown>): Promise<ForensicLogEntry | null> {
    return this.log('INFO', operation, module, input, output, duration_ms, true, undefined, metadata);
  }
  
  async warn(operation: string, module: string, input: unknown, output: unknown, duration_ms: number, error?: string, metadata?: Record<string, unknown>): Promise<ForensicLogEntry | null> {
    return this.log('WARN', operation, module, input, output, duration_ms, true, error, metadata);
  }
  
  async error(operation: string, module: string, input: unknown, output: unknown, duration_ms: number, error: string, metadata?: Record<string, unknown>): Promise<ForensicLogEntry | null> {
    return this.log('ERROR', operation, module, input, output, duration_ms, false, error, metadata);
  }
  
  async fatal(operation: string, module: string, input: unknown, output: unknown, duration_ms: number, error: string, metadata?: Record<string, unknown>): Promise<ForensicLogEntry | null> {
    return this.log('FATAL', operation, module, input, output, duration_ms, false, error, metadata);
  }
  
  /**
   * Flush buffer to file
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    // Prevent concurrent flushes
    if (this.flushPromise) {
      await this.flushPromise;
    }
    
    this.flushPromise = this.doFlush();
    await this.flushPromise;
    this.flushPromise = null;
  }
  
  private async doFlush(): Promise<void> {
    const entries = [...this.buffer];
    this.buffer = [];
    
    // Ensure directory exists
    const dir = dirname(this.config.logPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    // Check rotation needed
    await this.rotateIfNeeded();
    
    // Append entries
    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    
    try {
      await writeFile(this.config.logPath, lines, { flag: 'a' });
    } catch (err) {
      // Re-add to buffer on failure
      this.buffer.unshift(...entries);
      throw err;
    }
  }
  
  /**
   * Rotate log file if size exceeds limit
   */
  private async rotateIfNeeded(): Promise<void> {
    if (!existsSync(this.config.logPath)) return;
    
    try {
      const stats = await stat(this.config.logPath);
      if (stats.size < this.config.maxFileSize) return;
      
      // Rotate files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const from = `${this.config.logPath}.${i}`;
        const to = `${this.config.logPath}.${i + 1}`;
        if (existsSync(from)) {
          await rename(from, to);
        }
      }
      
      // Rename current to .1
      await rename(this.config.logPath, `${this.config.logPath}.1`);
    } catch {
      // Ignore rotation errors
    }
  }
  
  /**
   * Read all entries from current log file
   */
  async readEntries(): Promise<ForensicLogEntry[]> {
    if (!existsSync(this.config.logPath)) {
      return [];
    }
    
    const content = await readFile(this.config.logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    
    return lines.map(line => JSON.parse(line) as ForensicLogEntry);
  }
  
  /**
   * Verify chain integrity of all entries
   */
  async verifyChain(): Promise<{ valid: boolean; brokenAt?: number; error?: string }> {
    const entries = await this.readEntries();
    
    if (entries.length === 0) {
      return { valid: true };
    }
    
    // First entry should have genesis hash
    if (entries[0].previous_hash !== GENESIS_HASH) {
      return { valid: false, brokenAt: 0, error: 'First entry does not have genesis hash' };
    }
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Verify entry hash
      if (!verifyEntryHash(entry)) {
        return { valid: false, brokenAt: i, error: `Entry hash invalid at sequence ${entry.sequence}` };
      }
      
      // Verify chain link (except first)
      if (i > 0) {
        const prevEntry = entries[i - 1];
        if (entry.previous_hash !== prevEntry.entry_hash) {
          return { valid: false, brokenAt: i, error: `Chain broken at sequence ${entry.sequence}` };
        }
      }
      
      // Verify sequence
      if (entry.sequence !== i) {
        return { valid: false, brokenAt: i, error: `Sequence mismatch at index ${i}` };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Get statistics about logged operations
   */
  async getStats(): Promise<{
    totalEntries: number;
    byLevel: Record<LogLevel, number>;
    byModule: Record<string, number>;
    successRate: number;
    avgDuration: number;
  }> {
    const entries = await this.readEntries();
    
    const stats = {
      totalEntries: entries.length,
      byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 } as Record<LogLevel, number>,
      byModule: {} as Record<string, number>,
      successRate: 0,
      avgDuration: 0
    };
    
    if (entries.length === 0) return stats;
    
    let successCount = 0;
    let totalDuration = 0;
    
    for (const entry of entries) {
      stats.byLevel[entry.level]++;
      stats.byModule[entry.module] = (stats.byModule[entry.module] || 0) + 1;
      if (entry.success) successCount++;
      totalDuration += entry.duration_ms;
    }
    
    stats.successRate = successCount / entries.length;
    stats.avgDuration = totalDuration / entries.length;
    
    return stats;
  }
  
  /**
   * Clear all logs (for testing)
   */
  async clear(): Promise<void> {
    this.buffer = [];
    this.sequence = 0;
    this.previousHash = GENESIS_HASH;
    this.operationCounter.clear();
    
    if (existsSync(this.config.logPath)) {
      await writeFile(this.config.logPath, '');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION WRAPPER - INV-LOG-01 Guarantee
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrap an operation with automatic logging - INV-LOG-01 guarantee
 * Ensures exactly one log entry per operation
 */
export async function withForensicLogging<T>(
  logger: ForensicLogger,
  operation: string,
  module: string,
  input: unknown,
  fn: () => T | Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; logEntry: ForensicLogEntry | null }> {
  const start = performance.now();
  let output: T;
  let success = true;
  let error: string | undefined;
  
  try {
    output = await fn();
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    const duration_ms = performance.now() - start;
    const level: LogLevel = success ? 'INFO' : 'ERROR';
    
    // INV-LOG-01: Exactly one log per operation
    const logEntry = await logger.log(
      level,
      operation,
      module,
      input,
      // @ts-expect-error output may be undefined in catch
      output,
      duration_ms,
      success,
      error,
      metadata
    );
    
    // Store for return (in success case)
    if (success) {
      // @ts-expect-error we know output is defined in success case
      return { result: output, logEntry };
    }
  }
  
  // This line is never reached but TypeScript needs it
  throw new Error('Unreachable');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let defaultLogger: ForensicLogger | null = null;

/**
 * Get or create the default logger instance
 */
export function getDefaultLogger(config?: Partial<ForensicLoggerConfig>): ForensicLogger {
  if (!defaultLogger) {
    defaultLogger = new ForensicLogger(config);
  }
  return defaultLogger;
}

/**
 * Reset the default logger (for testing)
 */
export function resetDefaultLogger(): void {
  defaultLogger = null;
}
