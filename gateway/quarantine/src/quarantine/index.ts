/**
 * OMEGA QUARANTINE_V2 — Public API
 * Phase 16.2 — Isolation Chamber
 */

// Core class
export {
  Quarantine,
  quarantine,
  quarantineItem,
  releaseItem,
  inspectItem,
  purgeItems,
  listItems,
  getStats,
} from './quarantine.js';

// Types
export type {
  QuarantineConfig,
  QuarantineItem,
  QuarantineItemSummary,
  QuarantineMetadata,
  QuarantineOptions,
  QuarantineResult,
  ReleaseOptions,
  ReleaseResult,
  InspectOptions,
  InspectResult,
  PurgeOptions,
  PurgeResult,
  ListOptions,
  ListResult,
  QuarantineStats,
  AuditEntry,
  AuditAction,
} from './types.js';

// Constants
export {
  QuarantineStatus,
  QuarantineReason,
  Severity,
  DEFAULT_TTL_MS,
  MAX_QUARANTINE_SIZE,
  MAX_QUARANTINE_PAYLOAD,
  DEFAULT_CONFIG,
  QUARANTINE_VERSION,
} from './constants.js';
