/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — TYPES
 * Foundation contracts for the Universal Authority Module
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Target modules that NEXUS DEP can route to
 */
export type ModuleTarget = 'PIPELINE' | 'ORACLE' | 'MUSE';

/**
 * Valid callers that can invoke NEXUS DEP
 */
export type CallerType = 'UI' | 'SAGA' | 'CANON' | 'API' | 'INTERNAL';

/**
 * MUSE-specific actions
 */
export type MuseAction = 'suggest' | 'assess' | 'project';

/**
 * ORACLE-specific actions
 */
export type OracleAction = 'analyze';

/**
 * PIPELINE-specific actions
 */
export type PipelineAction = 'run' | 'segment' | 'aggregate';

/**
 * All valid actions
 */
export type NexusAction = MuseAction | OracleAction | PipelineAction;

/**
 * Error codes for NEXUS DEP
 * E0xx = Validation errors
 * E1xx = Guard errors
 * E2xx = Execution errors
 * E5xx = System errors
 */
export enum NexusErrorCode {
  // Validation (E0xx)
  INVALID_JSON = 'E001',
  INVALID_SCHEMA = 'E002',
  INVALID_PAYLOAD = 'E003',
  INVALID_VERSION = 'E004',
  MISSING_REQUIRED = 'E005',
  PAYLOAD_TOO_LARGE = 'E006',
  INVALID_SEED = 'E007',
  INVALID_TIMEOUT = 'E008',
  
  // Guard (E1xx)
  PREREQ_MISSING = 'E100',
  MUSE_WITHOUT_ORACLE = 'E101',
  ORACLE_NO_CONTEXT = 'E102',
  RATE_LIMITED = 'E103',
  UNAUTHORIZED = 'E104',
  SESSION_EXPIRED = 'E105',
  VERSION_INCOMPATIBLE = 'E106',
  
  // Execution (E2xx)
  TIMEOUT = 'E200',
  MODULE_ERROR = 'E201',
  ROUTING_ERROR = 'E202',
  EXECUTION_FAILED = 'E203',
  
  // System (E5xx)
  INTERNAL_ERROR = 'E500',
  AUDIT_FAILURE = 'E501',
  CHRONICLE_CORRUPTED = 'E502',
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request structure for NEXUS DEP
 * All calls must use this format
 */
export interface NexusRequest {
  // === IDENTIFICATION ===
  /** Unique request identifier (UUID v4) */
  request_id: string;
  /** Session identifier for tracking */
  session_id: string;
  /** Who is making the call */
  caller_id: CallerType;
  
  // === TARGET ===
  /** Target module */
  module: ModuleTarget;
  /** Action to perform */
  action: string;
  
  // === PAYLOAD ===
  /** Request data (schema-validated) */
  payload: unknown;
  
  // === CONTROL ===
  /** Random seed (REQUIRED for MUSE) */
  seed?: number;
  /** Timeout in milliseconds (default: 15000) */
  timeout_ms?: number;
  /** Semantic version pin */
  version_pin?: string;
  
  // === METADATA ===
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response structure from NEXUS DEP
 * All responses follow this format
 */
export interface NexusResponse<T> {
  // === IDENTIFICATION ===
  /** Echo of request_id */
  request_id: string;
  /** New response identifier */
  response_id: string;
  
  // === RESULT ===
  /** Success indicator */
  success: boolean;
  /** Result data (if success) */
  data?: T;
  /** Error details (if !success) */
  error?: NexusError;
  
  // === AUDIT ===
  /** Audit information */
  audit: AuditSummary;
}

/**
 * Error structure for NEXUS DEP
 */
export interface NexusError {
  /** Error code */
  code: NexusErrorCode;
  /** Human-readable message */
  message: string;
  /** Additional details */
  details?: unknown;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Retry delay if rate limited */
  retry_after_ms?: number;
}

/**
 * Audit summary included in every response
 */
export interface AuditSummary {
  /** SHA-256 hash of input */
  input_hash: string;
  /** SHA-256 hash of output */
  output_hash: string;
  /** Route taken (module.action) */
  route: string;
  /** Execution duration in ms */
  duration_ms: number;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Module version used */
  module_version: string;
}

/**
 * Full audit entry for Chronicle
 */
export interface AuditEntry extends AuditSummary {
  /** Request ID */
  request_id: string;
  /** Response ID */
  response_id: string;
  /** Session ID */
  session_id: string;
  /** Caller type */
  caller_id: CallerType;
  /** Seed used (if any) */
  seed?: number;
  /** Success indicator */
  success: boolean;
  /** Error code (if failed) */
  error_code?: NexusErrorCode;
}

/**
 * Chronicle entry with hash chain
 */
export interface ChronicleEntry {
  /** Entry index in chain */
  index: number;
  /** The audit entry */
  entry: AuditEntry;
  /** Hash of previous entry (empty string for first) */
  prev_hash: string;
  /** Hash of this entry */
  entry_hash: string;
  /** ISO 8601 timestamp when added to chronicle */
  chronicle_timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (if any) */
  errors: ValidationError[];
  /** Validated request (if valid) */
  request?: NexusRequest;
}

/**
 * Single validation error
 */
export interface ValidationError {
  /** Validation layer (L1-L3) */
  layer: 'L1' | 'L2' | 'L3';
  /** Field path */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: NexusErrorCode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Guard rule identifier
 */
export type GuardRuleId = 
  | 'GUARD-01'  // MUSE sans ORACLE
  | 'GUARD-02'  // ORACLE sans contexte
  | 'GUARD-03'  // Payload > 2MB
  | 'GUARD-04'  // Version incompatible
  | 'GUARD-05'  // Caller non autorisé
  | 'GUARD-06'; // Session expirée

/**
 * Guard check result
 */
export interface GuardResult {
  /** Whether all guards passed */
  passed: boolean;
  /** Failed rule (if any) */
  failed_rule?: GuardRuleId;
  /** Error to return (if failed) */
  error?: NexusError;
}

/**
 * Context for guard checks
 */
export interface GuardContext {
  /** Whether ORACLE snapshot exists for this session */
  has_oracle_snapshot: boolean;
  /** Session start timestamp */
  session_start: string;
  /** Session expiry (ISO 8601) */
  session_expiry: string;
  /** Allowed callers for this session */
  allowed_callers: CallerType[];
  /** Module versions available */
  module_versions: Record<ModuleTarget, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Routing decision
 */
export interface RoutingDecision {
  /** Target module */
  target: ModuleTarget;
  /** Action to execute */
  action: string;
  /** Module adapter to use */
  adapter_id: string;
}

/**
 * Module adapter interface
 */
export interface ModuleAdapter {
  /** Adapter identifier */
  id: string;
  /** Target module */
  module: ModuleTarget;
  /** Module version */
  version: string;
  /** Execute a request */
  execute<T>(action: string, payload: unknown, seed?: number): Promise<T>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replay result
 */
export interface ReplayResult {
  /** Original output hash */
  original_output_hash: string;
  /** Replayed output hash */
  replay_output_hash: string;
  /** Whether outputs match */
  match: boolean;
  /** Diff if not matching */
  diff?: string;
  /** Replay duration */
  replay_duration_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * UUID v4 regex pattern
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod schema for NexusRequest
 */
export const NexusRequestSchema = z.object({
  request_id: z.string().regex(UUID_PATTERN, 'Must be valid UUID v4'),
  session_id: z.string().regex(UUID_PATTERN, 'Must be valid UUID v4'),
  caller_id: z.enum(['UI', 'SAGA', 'CANON', 'API', 'INTERNAL']),
  module: z.enum(['PIPELINE', 'ORACLE', 'MUSE']),
  action: z.string().min(1).max(50),
  payload: z.unknown(),
  seed: z.number().int().min(0).optional(),
  timeout_ms: z.number().int().min(100).max(300000).optional(),
  version_pin: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semantic version').optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Max payload size (2MB)
 */
export const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024;

/**
 * Default timeout (15s)
 */
export const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Current NEXUS DEP version
 */
export const NEXUS_VERSION = '3.15.0';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if value is a valid ModuleTarget
 */
export function isModuleTarget(value: unknown): value is ModuleTarget {
  return value === 'PIPELINE' || value === 'ORACLE' || value === 'MUSE';
}

/**
 * Check if value is a valid CallerType
 */
export function isCallerType(value: unknown): value is CallerType {
  return value === 'UI' || value === 'SAGA' || value === 'CANON' || value === 'API' || value === 'INTERNAL';
}

/**
 * Check if value is a valid NexusErrorCode
 */
export function isNexusErrorCode(value: unknown): value is NexusErrorCode {
  return Object.values(NexusErrorCode).includes(value as NexusErrorCode);
}

/**
 * Check if a NexusResponse indicates success
 */
export function isSuccessResponse<T>(response: NexusResponse<T>): response is NexusResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Check if a NexusResponse indicates failure
 */
export function isErrorResponse<T>(response: NexusResponse<T>): response is NexusResponse<T> & { success: false; error: NexusError } {
  return response.success === false && response.error !== undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a NexusError
 */
export function createNexusError(
  code: NexusErrorCode,
  message: string,
  recoverable: boolean = false,
  details?: unknown,
  retry_after_ms?: number
): NexusError {
  return {
    code,
    message,
    recoverable,
    details,
    retry_after_ms,
  };
}

/**
 * Create a successful NexusResponse
 */
export function createSuccessResponse<T>(
  request_id: string,
  response_id: string,
  data: T,
  audit: AuditSummary
): NexusResponse<T> {
  return {
    request_id,
    response_id,
    success: true,
    data,
    audit,
  };
}

/**
 * Create an error NexusResponse
 */
export function createErrorResponse<T>(
  request_id: string,
  response_id: string,
  error: NexusError,
  audit: AuditSummary
): NexusResponse<T> {
  return {
    request_id,
    response_id,
    success: false,
    error,
    audit,
  };
}
