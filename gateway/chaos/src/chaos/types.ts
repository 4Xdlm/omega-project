/**
 * OMEGA CHAOS_HARNESS — Types
 * Phase 16.4 — Fault Injection & Resilience Testing
 * 
 * Type definitions for chaos engineering system.
 */

import { FaultType, ExperimentState, InjectionResult } from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chaos harness configuration
 */
export interface ChaosConfig {
  /** Enable fault injection globally */
  enabled: boolean;
  /** Default fault probability (0-1) */
  defaultProbability: number;
  /** Default latency in milliseconds */
  defaultLatencyMs: number;
  /** Enable metrics collection */
  enableMetrics: boolean;
  /** Enable audit logging */
  enableAuditLog: boolean;
  /** Safe mode (extra validation) */
  safeMode: boolean;
  /** Seed for deterministic randomness */
  seed: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAULT DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fault configuration
 */
export interface FaultConfig {
  /** Type of fault */
  type: FaultType;
  /** Probability of fault (0-1) */
  probability?: number;
  /** Latency in milliseconds (for LATENCY type) */
  latencyMs?: number;
  /** Error message (for ERROR type) */
  errorMessage?: string;
  /** Error class name (for ERROR type) */
  errorClass?: string;
  /** Corruption function (for CORRUPT_DATA type) */
  corruptor?: <T>(data: T) => T;
  /** Target pattern (regex or string) */
  target?: string | RegExp;
  /** Duration limit in milliseconds */
  durationMs?: number;
  /** Maximum injections */
  maxInjections?: number;
}

/**
 * Active fault instance
 */
export interface ActiveFault {
  /** Fault ID */
  id: string;
  /** Configuration */
  config: FaultConfig;
  /** When fault was registered */
  registeredAt: string;
  /** Number of injections */
  injectionCount: number;
  /** Number of skips */
  skipCount: number;
  /** Active status */
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Injection context
 */
export interface InjectionContext {
  /** Operation name/identifier */
  operation: string;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Result of injection attempt
 */
export interface InjectionAttempt {
  /** Injection result */
  result: InjectionResult;
  /** Fault ID (if injected) */
  faultId?: string;
  /** Fault type (if injected) */
  faultType?: FaultType;
  /** Timestamp */
  timestamp: string;
  /** Duration of injection (if latency) */
  durationMs: number;
  /** Error thrown (if error) */
  error?: Error;
  /** Operation context */
  context: InjectionContext;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPERIMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Experiment definition
 */
export interface ExperimentDef {
  /** Experiment name */
  name: string;
  /** Description */
  description?: string;
  /** Faults to inject */
  faults: FaultConfig[];
  /** Duration in milliseconds (0 = indefinite) */
  durationMs?: number;
  /** Target operations (patterns) */
  targets?: (string | RegExp)[];
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Running experiment instance
 */
export interface Experiment {
  /** Experiment ID */
  id: string;
  /** Definition */
  definition: ExperimentDef;
  /** Current state */
  state: ExperimentState;
  /** When started */
  startedAt?: string;
  /** When ended */
  endedAt?: string;
  /** Active fault IDs */
  faultIds: string[];
  /** Injection attempts during experiment */
  attempts: InjectionAttempt[];
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chaos metrics
 */
export interface ChaosMetrics {
  /** Report timestamp */
  timestamp: string;
  /** Version */
  version: string;
  /** Uptime in milliseconds */
  uptimeMs: number;
  /** Global enabled status */
  enabled: boolean;
  /** Total injection attempts */
  totalAttempts: number;
  /** Total successful injections */
  totalInjections: number;
  /** Total skipped (probability) */
  totalSkipped: number;
  /** Total disabled (not enabled) */
  totalDisabled: number;
  /** Active faults count */
  activeFaults: number;
  /** Active experiments count */
  activeExperiments: number;
  /** Completed experiments count */
  completedExperiments: number;
  /** Injection rate (percentage) */
  injectionRate: number;
  /** By fault type */
  byFaultType: Record<FaultType, number>;
  /** Current configuration */
  config: ChaosConfig;
}

/**
 * Fault-specific metrics
 */
export interface FaultMetrics {
  /** Fault ID */
  id: string;
  /** Fault type */
  type: FaultType;
  /** Total attempts */
  attempts: number;
  /** Total injections */
  injections: number;
  /** Total skips */
  skips: number;
  /** Injection rate */
  injectionRate: number;
  /** Average latency (if applicable) */
  avgLatencyMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

/** Audit action types */
export type AuditAction = 
  | 'REGISTER_FAULT'
  | 'UNREGISTER_FAULT'
  | 'INJECT'
  | 'SKIP'
  | 'START_EXPERIMENT'
  | 'STOP_EXPERIMENT'
  | 'PAUSE_EXPERIMENT'
  | 'RESUME_EXPERIMENT'
  | 'ENABLE'
  | 'DISABLE';

/**
 * Audit log entry
 */
export interface AuditEntry {
  /** Entry ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Action performed */
  action: AuditAction;
  /** Target ID (fault or experiment) */
  targetId?: string;
  /** Details */
  details: string;
  /** Success */
  success: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRAPPER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for wrapping a function
 */
export interface WrapOptions {
  /** Operation name for targeting */
  operation: string;
  /** Specific fault types to apply */
  faultTypes?: FaultType[];
  /** Override probability */
  probability?: number;
  /** Metadata to include */
  metadata?: Record<string, unknown>;
}

/**
 * Wrapped function result
 */
export interface WrapResult<T> {
  /** The result (if successful) */
  result?: T;
  /** Error (if fault injected) */
  error?: Error;
  /** Whether fault was injected */
  faultInjected: boolean;
  /** Injection attempt details */
  attempt: InjectionAttempt;
  /** Execution time in milliseconds */
  executionMs: number;
}
