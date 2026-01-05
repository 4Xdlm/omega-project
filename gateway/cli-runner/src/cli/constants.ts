/**
 * OMEGA CLI_RUNNER — Constants
 * Phase 16.0 — NASA-Grade
 * 
 * Exit codes follow Unix conventions:
 * - 0: Success
 * - 1: General error
 * - 2: Usage/syntax error
 * - 64-113: Reserved for specific error types (sysexits.h)
 */

// ============================================================================
// EXIT CODES (Unix-compliant)
// ============================================================================

export const EXIT_CODES = {
  SUCCESS: 0,           // Command completed successfully
  ERROR: 1,             // General runtime error
  USAGE: 2,             // Invalid usage/syntax
  INVALID_INPUT: 65,    // EX_DATAERR - Input data incorrect
  FILE_NOT_FOUND: 66,   // EX_NOINPUT - Input file not found
  PERMISSION: 77,       // EX_NOPERM - Permission denied
  IO_ERROR: 74,         // EX_IOERR - I/O error
  INTERNAL: 70,         // EX_SOFTWARE - Internal software error
  TIMEOUT: 124,         // Command timed out
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULTS = {
  OUTPUT_FORMAT: 'json' as const,
  VERBOSE: false,
  RECURSIVE: false,
  FULL_HEALTH: false,
  TIMEOUT_MS: 30_000,      // 30 seconds
  MAX_FILE_SIZE: 10_485_760, // 10 MB
  SEED: 42,                // Deterministic seed
} as const;

// ============================================================================
// SUPPORTED FORMATS
// ============================================================================

export const OUTPUT_FORMATS = ['json', 'md', 'docx'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const EXPORT_FORMATS = ['json', 'md', 'docx'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

// ============================================================================
// CLI METADATA
// ============================================================================

export const CLI_VERSION = '3.16.0';
export const CLI_NAME = 'omega';
export const CLI_DESCRIPTION = 'OMEGA CLI — Emotional Analysis Engine for Novels';

// ============================================================================
// ROUTING POLICY CONSTANTS
// ============================================================================

export const ROUTING = {
  DIRECT: 'DIRECT',     // Pure compute, no persistent I/O
  NEXUS: 'NEXUS',       // Storage, audit, decisions, traces
} as const;

export type RoutingType = (typeof ROUTING)[keyof typeof ROUTING];

// ============================================================================
// FILE EXTENSIONS
// ============================================================================

export const VALID_TEXT_EXTENSIONS = ['.txt', '.md', '.text'] as const;
export const OMEGA_PROJECT_EXTENSION = '.omega';
