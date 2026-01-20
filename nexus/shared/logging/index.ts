/**
 * Structured Logger with Injectable Clock
 * Standard: NASA-Grade L4
 *
 * CRITICAL (VERROU 3): Clock is injectable for deterministic testing.
 * All timestamps must come from injected clock, never Date.now() directly.
 *
 * @module logging
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Clock function type for timestamp generation
 * Reuses ClockFn concept for consistency
 */
export type ClockFn = () => number;

/**
 * Log levels from least to most severe
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Numeric priority for log levels (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured log entry
 */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly module: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly correlationId?: string;
}

/**
 * Log output handler
 */
export type LogOutput = (entry: LogEntry) => void;

/**
 * Logger configuration
 */
export interface LoggerConfig {
  readonly module: string;
  readonly clock?: ClockFn;
  readonly minLevel?: LogLevel;
  readonly output?: LogOutput;
  readonly correlationId?: string;
}

// ============================================================================
// Default Output
// ============================================================================

/**
 * Default output: JSON to console
 */
const defaultOutput: LogOutput = (entry: LogEntry) => {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
};

// ============================================================================
// Logger Class
// ============================================================================

/**
 * Structured logger with injectable dependencies
 *
 * @example
 * ```typescript
 * const logger = new Logger({ module: 'atlas' });
 * logger.info('Store initialized', { viewCount: 100 });
 * ```
 */
export class Logger {
  private readonly module: string;
  private readonly clock: ClockFn;
  private readonly minLevel: LogLevel;
  private readonly output: LogOutput;
  private readonly correlationId?: string;

  constructor(config: LoggerConfig) {
    this.module = config.module;
    this.clock = config.clock ?? (() => Date.now());
    this.minLevel = config.minLevel ?? 'info';
    this.output = config.output ?? defaultOutput;
    this.correlationId = config.correlationId;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(config: Partial<Omit<LoggerConfig, 'clock' | 'output'>>): Logger {
    return new Logger({
      module: config.module ?? this.module,
      clock: this.clock,
      minLevel: config.minLevel ?? this.minLevel,
      output: this.output,
      correlationId: config.correlationId ?? this.correlationId,
    });
  }

  /**
   * Create a child logger with correlation ID
   */
  withCorrelationId(correlationId: string): Logger {
    return this.child({ correlationId });
  }

  /**
   * Get the current minimum log level
   */
  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Get the module name
   */
  getModule(): string {
    return this.module;
  }

  /**
   * Check if a level would be logged
   */
  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Check minimum level
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(this.clock()).toISOString(),
      level,
      module: this.module,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...(this.correlationId ? { correlationId: this.correlationId } : {}),
    };

    this.output(entry);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a logger for a module
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * Create a no-op logger (for tests that don't need output)
 */
export function createNullLogger(module: string = 'null'): Logger {
  return new Logger({
    module,
    output: () => {}, // No-op
  });
}

/**
 * Create a logger that collects entries (for testing)
 */
export function createTestLogger(
  module: string = 'test',
  clock?: ClockFn
): { logger: Logger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const logger = new Logger({
    module,
    clock,
    minLevel: 'debug',
    output: (entry) => entries.push(entry),
  });
  return { logger, entries };
}
