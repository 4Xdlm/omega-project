/**
 * OMEGA Runner — Logger
 * Phase D.1 — Internal logger (no timestamps in hashed output)
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
}

export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  getEntries(): readonly LogEntry[];
  toText(): string;
}

export function createLogger(): Logger {
  const entries: LogEntry[] = [];

  const log = (level: LogLevel, message: string): void => {
    entries.push({ level, message });
  };

  return {
    debug: (msg: string) => log('DEBUG', msg),
    info: (msg: string) => log('INFO', msg),
    warn: (msg: string) => log('WARN', msg),
    error: (msg: string) => log('ERROR', msg),
    getEntries: () => entries,
    toText: () => entries.map((e) => `${e.level} | ${e.message}`).join('\n'),
  };
}
