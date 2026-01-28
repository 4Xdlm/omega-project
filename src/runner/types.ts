/**
 * OMEGA Runner Types v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Types for execution runner, verify, and capsule operations.
 *
 * INVARIANTS:
 * - I-INV-06: Exit codes deterministic and stage-mapped
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EXIT CODES (STRICT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exit codes for runner operations.
 * I-INV-06: Exit codes deterministic and stage-mapped
 */
export enum ExitCode {
  PASS = 0,
  INTENT_INVALID = 10,
  POLICY_LOCK_FAIL = 20,
  GENERATION_FAIL = 30,
  TRUTHGATE_FAIL = 40,
  DELIVERY_FAIL = 50,
  VERIFY_FAIL = 60,
  CAPSULE_FAIL = 70,
}

/**
 * Exit code descriptions for logging.
 */
export const EXIT_CODE_DESCRIPTIONS: Readonly<Record<ExitCode, string>> = Object.freeze({
  [ExitCode.PASS]: 'Success',
  [ExitCode.INTENT_INVALID]: 'Intent file invalid or missing',
  [ExitCode.POLICY_LOCK_FAIL]: 'Policy lock verification failed',
  [ExitCode.GENERATION_FAIL]: 'Text generation failed',
  [ExitCode.TRUTHGATE_FAIL]: 'Truth gate validation failed',
  [ExitCode.DELIVERY_FAIL]: 'Delivery packaging failed',
  [ExitCode.VERIFY_FAIL]: 'Verification failed or attempted write',
  [ExitCode.CAPSULE_FAIL]: 'Capsule creation failed',
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLI TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CLI commands.
 */
export type CliCommand = 'run' | 'batch' | 'verify' | 'capsule' | 'help';

/**
 * Parsed CLI arguments.
 */
export interface ParsedArgs {
  readonly command: CliCommand;
  readonly intentPath?: string;
  readonly dirPath?: string;
  readonly runPath?: string;
  readonly outputPath?: string;
  readonly profile: string;
}

/**
 * Default profile ID.
 */
export const DEFAULT_PROFILE = 'OMEGA_STD';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED PATHS (NO ENV OVERRIDE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed paths - NEVER from environment variables.
 * I-INV-04: No ENV override for critical paths
 */
export const FIXED_PATHS = Object.freeze({
  POLICIES_PATH: 'config/policies/policies.v1.json',
  POLICIES_LOCK_PATH: 'config/policies/policies.lock',
  DELIVERY_PROFILES_PATH: 'config/delivery/profiles.v1.json',
  DELIVERY_LOCK_PATH: 'config/delivery/profiles.lock',
  RUNS_ROOT: 'artefacts/runs',
  LEDGER_PATH: 'data/intent-ledger',
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUN RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of a single run operation.
 */
export interface RunResult {
  readonly success: boolean;
  readonly exitCode: ExitCode;
  readonly runId: string;
  readonly runPath: string;
  readonly runHash: string;
  readonly error?: string;
  readonly timestamp: string;
}

/**
 * Result of batch run operation.
 */
export interface BatchResult {
  readonly success: boolean;
  readonly exitCode: ExitCode;
  readonly runs: readonly RunResult[];
  readonly totalRuns: number;
  readonly successfulRuns: number;
  readonly failedRuns: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single hash mismatch.
 */
export interface HashMismatch {
  readonly file: string;
  readonly expected: string;
  readonly actual: string;
}

/**
 * Result of verify operation.
 */
export interface VerifyResult {
  readonly success: boolean;
  readonly exitCode: ExitCode;
  readonly mismatches: readonly HashMismatch[];
  readonly filesChecked: number;
  readonly filesValid: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPSULE RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of capsule creation.
 */
export interface CapsuleResult {
  readonly success: boolean;
  readonly exitCode: ExitCode;
  readonly capsulePath: string;
  readonly capsuleHash: string;
  readonly fileCount: number;
  readonly totalBytes: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN DIRECTORY LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Files in a run directory.
 */
export const RUN_FILES = Object.freeze({
  INTENT: 'intent.json',
  CONTRACT: 'contract.json',
  TRUTHGATE_VERDICT: 'truthgate_verdict.json',
  TRUTHGATE_PROOF: 'truthgate_proof.json',
  DELIVERY_MANIFEST: 'delivery_manifest.json',
  ARTIFACTS_DIR: 'artifacts',
  HASHES: 'hashes.txt',
  REPORT: 'run_report.md',
  RUN_HASH: 'run_hash.txt',
});

/**
 * Files included in run hash computation.
 * Note: run_report.md is excluded (contains timestamps).
 */
export const HASHABLE_FILES = Object.freeze([
  RUN_FILES.INTENT,
  RUN_FILES.CONTRACT,
  RUN_FILES.TRUTHGATE_VERDICT,
  RUN_FILES.TRUTHGATE_PROOF,
  RUN_FILES.DELIVERY_MANIFEST,
  RUN_FILES.HASHES,
]);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path validation result.
 */
export interface PathValidation {
  readonly valid: boolean;
  readonly violations: readonly string[];
}

/**
 * Intent validation result.
 */
export interface IntentValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly intentId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if value is a valid CLI command.
 */
export function isCliCommand(value: unknown): value is CliCommand {
  return (
    value === 'run' ||
    value === 'batch' ||
    value === 'verify' ||
    value === 'capsule' ||
    value === 'help'
  );
}

/**
 * Checks if value is a valid exit code.
 */
export function isExitCode(value: unknown): value is ExitCode {
  return (
    typeof value === 'number' &&
    Object.values(ExitCode).includes(value as ExitCode)
  );
}

/**
 * Checks if path is safe (no traversal, no absolute).
 * I-INV-08: Runner writes only to artefacts/runs/**
 */
export function isSafePath(path: string): boolean {
  // No empty paths
  if (!path || path.length === 0) {
    return false;
  }

  // No absolute paths
  if (path.startsWith('/') || path.startsWith('\\')) {
    return false;
  }

  // No drive letters
  if (/^[a-zA-Z]:/.test(path)) {
    return false;
  }

  // No parent traversal
  const segments = path.split(/[/\\]/);
  for (const segment of segments) {
    if (segment === '..') {
      return false;
    }
  }

  // No null bytes
  if (path.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * Checks if path is within allowed write zones.
 * I-INV-08: Runner writes only to artefacts/runs/** (and G ledger path)
 */
export function isAllowedWritePath(path: string): boolean {
  if (!isSafePath(path)) {
    return false;
  }

  const normalized = path.replace(/\\/g, '/');

  // Allowed zones
  const allowedPrefixes = [
    FIXED_PATHS.RUNS_ROOT,
    FIXED_PATHS.LEDGER_PATH,
  ];

  return allowedPrefixes.some(prefix => normalized.startsWith(prefix));
}

/**
 * Validates path for runner operations.
 */
export function validatePath(path: string): PathValidation {
  const violations: string[] = [];

  if (!path || path.length === 0) {
    violations.push('Path is empty');
  }

  if (path.startsWith('/') || path.startsWith('\\')) {
    violations.push('Absolute paths not allowed');
  }

  if (/^[a-zA-Z]:/.test(path)) {
    violations.push('Drive letters not allowed');
  }

  if (path.includes('..')) {
    violations.push('Path traversal (..) not allowed');
  }

  if (path.includes('\0')) {
    violations.push('Null bytes not allowed');
  }

  return Object.freeze({
    valid: violations.length === 0,
    violations: Object.freeze(violations),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates run directory name.
 *
 * @param intentId - Intent ID
 * @param seq - Sequence number (for collision avoidance)
 * @returns Run directory name
 */
export function generateRunId(intentId: string, seq: number): string {
  // Sanitize intentId for filesystem
  const sanitized = intentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `run_${sanitized}_${seq}`;
}

/**
 * Extracts intent ID from run directory name.
 *
 * @param runId - Run directory name
 * @returns Intent ID or null
 */
export function extractIntentId(runId: string): string | null {
  const match = runId.match(/^run_(.+)_\d+$/);
  return match ? match[1] : null;
}
