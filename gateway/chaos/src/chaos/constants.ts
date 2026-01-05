/**
 * OMEGA CHAOS_HARNESS — Constants
 * Phase 16.4 — Fault Injection & Resilience Testing
 * 
 * Defines fault types, experiment states, and configuration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FAULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Types of faults that can be injected */
export enum FaultType {
  /** Add latency delay */
  LATENCY = 'LATENCY',
  /** Throw an error */
  ERROR = 'ERROR',
  /** Return null/undefined */
  NULL_RESPONSE = 'NULL_RESPONSE',
  /** Return corrupted data */
  CORRUPT_DATA = 'CORRUPT_DATA',
  /** Timeout (never resolve) */
  TIMEOUT = 'TIMEOUT',
  /** Partial failure (intermittent) */
  INTERMITTENT = 'INTERMITTENT',
  /** Resource exhaustion simulation */
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  /** Network partition simulation */
  NETWORK_PARTITION = 'NETWORK_PARTITION',
}

/** Experiment states */
export enum ExperimentState {
  /** Experiment created but not started */
  IDLE = 'IDLE',
  /** Experiment is running */
  RUNNING = 'RUNNING',
  /** Experiment is paused */
  PAUSED = 'PAUSED',
  /** Experiment completed */
  COMPLETED = 'COMPLETED',
  /** Experiment aborted */
  ABORTED = 'ABORTED',
}

/** Fault injection result */
export enum InjectionResult {
  /** Fault was injected */
  INJECTED = 'INJECTED',
  /** Fault was skipped (probability) */
  SKIPPED = 'SKIPPED',
  /** Injection disabled */
  DISABLED = 'DISABLED',
  /** Target not matched */
  NO_MATCH = 'NO_MATCH',
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default fault probability (10%) */
export const DEFAULT_PROBABILITY = 0.1;

/** Default latency in milliseconds */
export const DEFAULT_LATENCY_MS = 100;

/** Maximum latency allowed */
export const MAX_LATENCY_MS = 30000;

/** Default timeout in milliseconds */
export const DEFAULT_TIMEOUT_MS = 5000;

/** Default error message */
export const DEFAULT_ERROR_MESSAGE = 'Chaos fault injected';

/** Maximum concurrent experiments */
export const MAX_EXPERIMENTS = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Default chaos harness configuration */
export const DEFAULT_CONFIG = {
  /** Enable fault injection globally */
  enabled: false,
  /** Default fault probability */
  defaultProbability: DEFAULT_PROBABILITY,
  /** Default latency */
  defaultLatencyMs: DEFAULT_LATENCY_MS,
  /** Enable metrics collection */
  enableMetrics: true,
  /** Enable audit logging */
  enableAuditLog: true,
  /** Safe mode (extra validation) */
  safeMode: true,
  /** Seed for deterministic randomness (null = true random) */
  seed: null as number | null,
} as const;

/** CHAOS_HARNESS version */
export const CHAOS_VERSION = '3.16.4';
