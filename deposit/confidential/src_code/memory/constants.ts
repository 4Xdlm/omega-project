/**
 * OMEGA Memory System - Constants
 * Phase D2 - NASA-Grade L4
 * 
 * Centralized constants. No magic numbers in code.
 * All paths relative to repository root.
 */

import { resolve, join } from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// PATH CONSTANTS - Relative to repo root
// ═══════════════════════════════════════════════════════════════════════════════

/** Root path resolution (assumes running from repo root) */
export function getRepoRoot(): string {
  return process.cwd();
}

/** Ledger file path */
export function getLedgerPath(): string {
  return join(getRepoRoot(), 'docs', 'memory', 'ledgers', 'LEDGER_MEMORY_EVENTS.ndjson');
}

/** Schema file path */
export function getSchemaPath(): string {
  return join(getRepoRoot(), 'docs', 'memory', 'schemas', 'MEMORY_ENTRY_SCHEMA_v1.0.json');
}

/** Index directory path */
export function getIndexDir(): string {
  return join(getRepoRoot(), 'nexus', 'derived', 'memory_index');
}

/** Proof directory for phase D */
export function getProofDir(phase: string): string {
  return join(getRepoRoot(), 'nexus', 'proof', 'phase-d', phase);
}

/** Audit log path (derived, non-canonical) */
export function getAuditLogPath(): string {
  return join(getRepoRoot(), 'nexus', 'derived', 'memory_audit', 'audit.ndjson');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIZE LIMITS - Bounded operations
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum line size for single entry read (4MB) */
export const MAX_LINE_SIZE_BYTES = 4 * 1024 * 1024;

/** Default read buffer size */
export const READ_BUFFER_SIZE = 64 * 1024;

/** Maximum entries per query (pagination) */
export const MAX_QUERY_LIMIT = 1000;

/** Default query limit */
export const DEFAULT_QUERY_LIMIT = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Current schema version */
export const SCHEMA_VERSION = '1.0';

/** Genesis hash (first entry has null prevHash, but we use this for chain start) */
export const GENESIS_PREV_HASH = null;

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX FILE NAMES
// ═══════════════════════════════════════════════════════════════════════════════

export const INDEX_FILES = {
  BY_ID: 'by_id.offset.json',
  BY_CLASS: 'by_class.ids.json',
  BY_TAG: 'by_tag.ids.json',
  META: 'index.meta.json',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TIERING DEFAULTS (Symbols - actual values from config)
// ═══════════════════════════════════════════════════════════════════════════════

/** Default tiering TTLs in milliseconds */
export const DEFAULT_TIERING_CONFIG = {
  /** HOT: < 1 hour */
  ttlHotMs: 60 * 60 * 1000,
  /** WARM: < 24 hours */
  ttlWarmMs: 24 * 60 * 60 * 1000,
  /** COLD: < 7 days */
  ttlColdMs: 7 * 24 * 60 * 60 * 1000,
  // FROZEN: infinite (entry.meta.sealed === true)
} as const;
