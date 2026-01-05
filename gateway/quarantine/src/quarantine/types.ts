/**
 * OMEGA QUARANTINE_V2 — Types
 * Phase 16.2 — Isolation Chamber
 * 
 * Type definitions for quarantine system.
 */

import { QuarantineStatus, QuarantineReason, Severity } from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quarantine configuration
 */
export interface QuarantineConfig {
  /** Time to live in milliseconds */
  ttlMs: number;
  /** Maximum items allowed */
  maxItems: number;
  /** Maximum payload size per item */
  maxPayloadSize: number;
  /** Auto-purge expired items */
  autoPurge: boolean;
  /** Purge interval in milliseconds */
  purgeIntervalMs: number;
  /** Require reason for release */
  requireReleaseReason: boolean;
  /** Enable audit logging */
  enableAuditLog: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE ITEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metadata for a quarantined item
 */
export interface QuarantineMetadata {
  /** Original source/origin */
  source?: string;
  /** User or system that triggered quarantine */
  triggeredBy?: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Tags for categorization */
  tags?: string[];
  /** Related item IDs */
  relatedIds?: string[];
}

/**
 * A quarantined item
 */
export interface QuarantineItem<T = unknown> {
  /** Unique identifier */
  id: string;
  /** The quarantined data (isolated) */
  payload: T;
  /** Hash of the payload for integrity */
  payloadHash: string;
  /** Size in bytes */
  payloadSize: number;
  /** Current status */
  status: QuarantineStatus;
  /** Reason for quarantine */
  reason: QuarantineReason;
  /** Detailed reason message */
  reasonMessage: string;
  /** Severity level */
  severity: Severity;
  /** When item was quarantined */
  quarantinedAt: string;
  /** When item expires */
  expiresAt: string;
  /** When item was released (if released) */
  releasedAt?: string;
  /** Release reason (if released) */
  releaseReason?: string;
  /** When item was purged (if purged) */
  purgedAt?: string;
  /** Additional metadata */
  metadata: QuarantineMetadata;
}

/**
 * Summary of a quarantined item (without payload)
 */
export interface QuarantineItemSummary {
  id: string;
  status: QuarantineStatus;
  reason: QuarantineReason;
  severity: Severity;
  quarantinedAt: string;
  expiresAt: string;
  payloadSize: number;
  payloadHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for quarantine operation
 */
export interface QuarantineOptions {
  /** Reason for quarantine */
  reason?: QuarantineReason;
  /** Detailed message */
  reasonMessage?: string;
  /** Severity level */
  severity?: Severity;
  /** Custom TTL (overrides default) */
  ttlMs?: number;
  /** Additional metadata */
  metadata?: QuarantineMetadata;
}

/**
 * Result of quarantine operation
 */
export interface QuarantineResult {
  /** Operation success */
  success: boolean;
  /** Assigned ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Item summary */
  item: QuarantineItemSummary;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for release operation
 */
export interface ReleaseOptions {
  /** Reason for release */
  reason: string;
  /** Who is releasing */
  releasedBy?: string;
  /** Skip validation */
  skipValidation?: boolean;
}

/**
 * Result of release operation
 */
export interface ReleaseResult<T = unknown> {
  /** Operation success */
  success: boolean;
  /** Item ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Released payload (if success) */
  payload?: T;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for inspect operation
 */
export interface InspectOptions {
  /** Include payload in result */
  includePayload?: boolean;
  /** Verify integrity */
  verifyIntegrity?: boolean;
}

/**
 * Result of inspect operation
 */
export interface InspectResult<T = unknown> {
  /** Operation success */
  success: boolean;
  /** Timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Item data */
  item?: QuarantineItem<T>;
  /** Summary only (if payload not included) */
  summary?: QuarantineItemSummary;
  /** Integrity check result */
  integrityValid?: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for purge operation
 */
export interface PurgeOptions {
  /** Only purge expired items */
  expiredOnly?: boolean;
  /** Purge items older than this (milliseconds) */
  olderThanMs?: number;
  /** Purge by reason */
  reason?: QuarantineReason;
  /** Purge by severity */
  severity?: Severity;
  /** Dry run (don't actually purge) */
  dryRun?: boolean;
}

/**
 * Result of purge operation
 */
export interface PurgeResult {
  /** Operation success */
  success: boolean;
  /** Timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Number of items purged */
  purgedCount: number;
  /** IDs of purged items */
  purgedIds: string[];
  /** Was this a dry run */
  dryRun: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for list operation
 */
export interface ListOptions {
  /** Filter by status */
  status?: QuarantineStatus;
  /** Filter by reason */
  reason?: QuarantineReason;
  /** Filter by severity */
  severity?: Severity;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort by field */
  sortBy?: 'quarantinedAt' | 'expiresAt' | 'severity' | 'payloadSize';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of list operation
 */
export interface ListResult {
  /** Operation success */
  success: boolean;
  /** Timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Items found */
  items: QuarantineItemSummary[];
  /** Total count (before pagination) */
  totalCount: number;
  /** Error message if failed */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quarantine statistics
 */
export interface QuarantineStats {
  /** Report timestamp */
  timestamp: string;
  /** Version */
  version: string;
  /** Uptime in milliseconds */
  uptimeMs: number;
  /** Total items currently quarantined */
  totalQuarantined: number;
  /** Total items released */
  totalReleased: number;
  /** Total items purged */
  totalPurged: number;
  /** Total items expired */
  totalExpired: number;
  /** By status */
  byStatus: Record<QuarantineStatus, number>;
  /** By reason */
  byReason: Record<QuarantineReason, number>;
  /** By severity */
  bySeverity: Record<Severity, number>;
  /** Total payload size in bytes */
  totalPayloadSize: number;
  /** Current configuration */
  config: QuarantineConfig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

/** Audit log entry type */
export type AuditAction = 'QUARANTINE' | 'RELEASE' | 'INSPECT' | 'PURGE' | 'EXPIRE';

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
  /** Target item ID */
  itemId: string;
  /** Action details */
  details: string;
  /** Who performed the action */
  actor?: string;
  /** Success/failure */
  success: boolean;
}
