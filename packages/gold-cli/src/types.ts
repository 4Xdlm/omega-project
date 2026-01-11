/**
 * @fileoverview OMEGA Gold CLI - Types
 * @module @omega/gold-cli/types
 *
 * CLI types and interfaces.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CLI OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CLI command options.
 */
export interface CliOptions {
  /** Output format */
  readonly format: 'json' | 'markdown' | 'text';
  /** Output file path */
  readonly output?: string;
  /** Verbose output */
  readonly verbose: boolean;
  /** Generate proof pack */
  readonly proofPack: boolean;
  /** Working directory */
  readonly cwd: string;
  /** Version to certify */
  readonly version: string;
}

/**
 * Parsed CLI arguments.
 */
export interface ParsedArgs {
  readonly command: 'certify' | 'validate' | 'report' | 'help' | 'version';
  readonly options: CliOptions;
  readonly positional: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Package info for certification.
 */
export interface PackageInfo {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly testCommand: string;
}

/**
 * Test result from a package.
 */
export interface PackageTestResult {
  readonly package: PackageInfo;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly duration: number;
  readonly output: string;
}

/**
 * Gold run result.
 */
export interface GoldRunResult {
  readonly timestamp: string;
  readonly version: string;
  readonly packages: readonly PackageTestResult[];
  readonly totalTests: number;
  readonly totalPassed: number;
  readonly totalFailed: number;
  readonly totalDuration: number;
  readonly success: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CLI output writer.
 */
export interface OutputWriter {
  /** Write info message */
  info(message: string): void;
  /** Write success message */
  success(message: string): void;
  /** Write warning message */
  warn(message: string): void;
  /** Write error message */
  error(message: string): void;
  /** Write raw output */
  write(content: string): void;
  /** Write with newline */
  writeln(content: string): void;
}

/**
 * Default CLI options.
 */
export const DEFAULT_CLI_OPTIONS: CliOptions = Object.freeze({
  format: 'text',
  verbose: false,
  proofPack: true,
  cwd: process.cwd(),
  version: '0.0.0',
});
