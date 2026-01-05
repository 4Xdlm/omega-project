/**
 * OMEGA CHAOS_HARNESS — Public API
 * Phase 16.4 — Fault Injection & Resilience Testing
 */

// Core class
export {
  ChaosHarness,
  chaos,
  enableChaos,
  disableChaos,
  registerFault,
  injectFault,
  getChaosMetrics,
} from './chaos.js';

// Types
export type {
  ChaosConfig,
  FaultConfig,
  ActiveFault,
  InjectionContext,
  InjectionAttempt,
  ExperimentDef,
  Experiment,
  ChaosMetrics,
  FaultMetrics,
  AuditEntry,
  AuditAction,
  WrapOptions,
  WrapResult,
} from './types.js';

// Constants
export {
  FaultType,
  ExperimentState,
  InjectionResult,
  DEFAULT_PROBABILITY,
  DEFAULT_LATENCY_MS,
  MAX_LATENCY_MS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_ERROR_MESSAGE,
  MAX_EXPERIMENTS,
  DEFAULT_CONFIG,
  CHAOS_VERSION,
} from './constants.js';
