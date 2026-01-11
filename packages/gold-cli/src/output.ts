/**
 * @fileoverview OMEGA Gold CLI - Output Utilities
 * @module @omega/gold-cli/output
 *
 * CLI output formatting and writing.
 */

import type { OutputWriter } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLE OUTPUT WRITER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Console output writer.
 */
export class ConsoleWriter implements OutputWriter {
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  success(message: string): void {
    console.log(`[OK] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }

  write(content: string): void {
    process.stdout.write(content);
  }

  writeln(content: string): void {
    console.log(content);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRING OUTPUT WRITER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * String output writer for capturing output.
 */
export class StringWriter implements OutputWriter {
  private buffer: string[] = [];

  info(message: string): void {
    this.buffer.push(`[INFO] ${message}`);
  }

  success(message: string): void {
    this.buffer.push(`[OK] ${message}`);
  }

  warn(message: string): void {
    this.buffer.push(`[WARN] ${message}`);
  }

  error(message: string): void {
    this.buffer.push(`[ERROR] ${message}`);
  }

  write(content: string): void {
    this.buffer.push(content);
  }

  writeln(content: string): void {
    this.buffer.push(content);
  }

  /**
   * Get captured output.
   */
  getOutput(): string {
    return this.buffer.join('\n');
  }

  /**
   * Clear buffer.
   */
  clear(): void {
    this.buffer = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SILENT OUTPUT WRITER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Silent output writer that discards all output.
 */
export class SilentWriter implements OutputWriter {
  info(_message: string): void {}
  success(_message: string): void {}
  warn(_message: string): void {}
  error(_message: string): void {}
  write(_content: string): void {}
  writeln(_content: string): void {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create console output writer.
 */
export function createConsoleWriter(): OutputWriter {
  return new ConsoleWriter();
}

/**
 * Create string output writer.
 */
export function createStringWriter(): StringWriter {
  return new StringWriter();
}

/**
 * Create silent output writer.
 */
export function createSilentWriter(): OutputWriter {
  return new SilentWriter();
}
