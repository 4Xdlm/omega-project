/**
 * @fileoverview Output handling for the OMEGA Headless Runner.
 */

import type { Clock } from '@omega/orchestrator-core';
import { stableStringify } from '@omega/orchestrator-core';
import { sha256 } from '@omega/orchestrator-core';
import type { LogEntry, HeadlessRunResult, OutputFiles } from './types.js';

/**
 * Logger interface for structured logging.
 */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  getEntries(): readonly LogEntry[];
}

/**
 * Creates a logger with the specified clock.
 */
export function createLogger(clock: Clock, minLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'): Logger {
  const entries: LogEntry[] = [];
  const levels = ['debug', 'info', 'warn', 'error'] as const;
  const minLevelIndex = levels.indexOf(minLevel);

  const log = (level: LogEntry['level'], message: string, context?: Record<string, unknown>): void => {
    const levelIndex = levels.indexOf(level);
    if (levelIndex >= minLevelIndex) {
      entries.push({
        timestamp: clock.nowISO(),
        level,
        message,
        context,
      });
    }
  };

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
    getEntries: () => entries,
  };
}

/**
 * Formats log entries as a string.
 */
export function formatLogEntries(entries: readonly LogEntry[]): string {
  return entries
    .map((entry) => {
      const contextStr = entry.context ? ` ${stableStringify(entry.context)}` : '';
      return `[${entry.timestamp}] [${entry.level.toUpperCase().padEnd(5)}] ${entry.message}${contextStr}`;
    })
    .join('\n');
}

/**
 * Formats a headless run result as JSON.
 */
export function formatResult(result: HeadlessRunResult): string {
  return stableStringify(result);
}

/**
 * Output writer interface.
 */
export interface OutputWriter {
  write(path: string, content: string): void;
  mkdir(path: string): void;
  exists(path: string): boolean;
}

/**
 * In-memory output writer for testing.
 */
export class InMemoryOutputWriter implements OutputWriter {
  private readonly files: Map<string, string> = new Map();
  private readonly directories: Set<string> = new Set();

  write(path: string, content: string): void {
    this.files.set(path, content);
  }

  mkdir(path: string): void {
    this.directories.add(path);
  }

  exists(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  getFiles(): ReadonlyMap<string, string> {
    return this.files;
  }

  getDirectories(): ReadonlySet<string> {
    return this.directories;
  }
}

/**
 * Generates output file paths for a run.
 */
export function generateOutputPaths(outputDir: string, runId: string): OutputFiles {
  return {
    result: `${outputDir}/${runId}_result.json`,
    log: `${outputDir}/${runId}.log`,
    hash: `${outputDir}/${runId}.sha256`,
  };
}

/**
 * Writes all output files for a run.
 */
export function writeOutputFiles(
  writer: OutputWriter,
  result: HeadlessRunResult,
  logEntries: readonly LogEntry[]
): void {
  const { outputFiles } = result;

  // Ensure output directory exists
  const outputDir = outputFiles.result.substring(0, outputFiles.result.lastIndexOf('/'));
  if (!writer.exists(outputDir)) {
    writer.mkdir(outputDir);
  }

  // Write result JSON
  const resultJson = formatResult(result);
  writer.write(outputFiles.result, resultJson);

  // Write log file
  const logContent = formatLogEntries(logEntries);
  writer.write(outputFiles.log, logContent);

  // Write hash file
  const resultHash = sha256(resultJson);
  const logHash = sha256(logContent);
  const hashContent = [
    `${resultHash} *${outputFiles.result}`,
    `${logHash} *${outputFiles.log}`,
  ].join('\n');
  writer.write(outputFiles.hash, hashContent);
}

/**
 * Console output for CLI.
 */
export interface ConsoleOutput {
  write(message: string): void;
  writeError(message: string): void;
}

/**
 * Creates a console output that collects messages.
 */
export function createCollectingConsole(): ConsoleOutput & { getOutput(): string; getErrors(): string } {
  const output: string[] = [];
  const errors: string[] = [];

  return {
    write: (message) => output.push(message),
    writeError: (message) => errors.push(message),
    getOutput: () => output.join('\n'),
    getErrors: () => errors.join('\n'),
  };
}

/**
 * Formats duration in human-readable form.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(2);
  return `${minutes}m ${seconds}s`;
}
