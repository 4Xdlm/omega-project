/**
 * OMEGA Orchestrator Intent Ledger v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Append-only ledger for intent tracking with chain hash integrity.
 * Provides audit trail and tamper detection.
 *
 * INVARIANTS:
 * - G-INV-06: Append-only ledger, chain hash (timestamp excluded)
 * - G-INV-07: IntentId = SHA256(normalized_intent_content)
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G7
 */

import { createHash } from 'crypto';
import type {
  Intent,
  IntentId,
  ActorId,
  ChainHash,
  ISO8601,
} from './types';
import { isChainHash } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entry status in ledger
 */
export type LedgerEntryStatus =
  | 'RECEIVED'
  | 'VALIDATED'
  | 'POLICY_CHECKED'
  | 'CONTRACT_CREATED'
  | 'GENERATING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED';

/**
 * Single ledger entry
 */
export interface LedgerEntry {
  readonly index: number;
  readonly intentId: IntentId;
  readonly actorId: ActorId;
  readonly goal: string;
  readonly status: LedgerEntryStatus;
  readonly timestamp: ISO8601;
  readonly chainHash: ChainHash;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Intent ledger interface
 */
export interface IntentLedger {
  readonly length: number;
  readonly lastChainHash: ChainHash | null;
  append(intent: Intent, status: LedgerEntryStatus, details?: Record<string, unknown>): LedgerEntry;
  getEntry(index: number): LedgerEntry | undefined;
  getEntriesByIntentId(intentId: IntentId): readonly LedgerEntry[];
  getEntriesByActorId(actorId: ActorId): readonly LedgerEntry[];
  getAllEntries(): readonly LedgerEntry[];
  verifyChain(): boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes chain hash for ledger entry.
 * G-INV-06: Timestamp is EXCLUDED from hash to allow deterministic verification.
 *
 * @param entry - Entry data (without hash)
 * @param previousHash - Previous entry's chain hash (null for first entry)
 * @returns Computed chain hash
 */
function computeLedgerChainHash(
  entry: Omit<LedgerEntry, 'chainHash'>,
  previousHash: ChainHash | null
): ChainHash {
  // G-INV-06: Exclude timestamp from hash computation
  const hashData = {
    index: entry.index,
    intentId: entry.intentId,
    actorId: entry.actorId,
    goal: entry.goal,
    status: entry.status,
    details: entry.details ?? null,
    previousHash: previousHash,
  };

  const hash = createHash('sha256')
    .update(JSON.stringify(hashData))
    .digest('hex');

  return hash as ChainHash;
}

/**
 * Verifies a single entry's chain hash.
 *
 * @param entry - Entry to verify
 * @param previousHash - Expected previous hash
 * @returns true if valid
 */
function verifyEntryChainHash(
  entry: LedgerEntry,
  previousHash: ChainHash | null
): boolean {
  const expectedHash = computeLedgerChainHash(entry, previousHash);
  return entry.chainHash === expectedHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new intent ledger.
 * G-INV-06: Append-only with chain hash integrity
 *
 * @returns New ledger instance
 */
export function createIntentLedger(): IntentLedger {
  const entries: LedgerEntry[] = [];

  return {
    get length() {
      return entries.length;
    },

    get lastChainHash(): ChainHash | null {
      if (entries.length === 0) {
        return null;
      }
      return entries[entries.length - 1].chainHash;
    },

    append(
      intent: Intent,
      status: LedgerEntryStatus,
      details?: Record<string, unknown>
    ): LedgerEntry {
      const index = entries.length;
      const previousHash = index > 0 ? entries[index - 1].chainHash : null;

      const entryWithoutHash: Omit<LedgerEntry, 'chainHash'> = {
        index,
        intentId: intent.intentId,
        actorId: intent.actorId,
        goal: intent.goal,
        status,
        timestamp: new Date().toISOString() as ISO8601,
        details: details ? Object.freeze({ ...details }) : undefined,
      };

      const chainHash = computeLedgerChainHash(entryWithoutHash, previousHash);

      const entry: LedgerEntry = Object.freeze({
        ...entryWithoutHash,
        chainHash,
      });

      // G-INV-06: Append-only - only push, never modify
      entries.push(entry);

      return entry;
    },

    getEntry(index: number): LedgerEntry | undefined {
      if (index < 0 || index >= entries.length) {
        return undefined;
      }
      return entries[index];
    },

    getEntriesByIntentId(intentId: IntentId): readonly LedgerEntry[] {
      return Object.freeze(entries.filter(e => e.intentId === intentId));
    },

    getEntriesByActorId(actorId: ActorId): readonly LedgerEntry[] {
      return Object.freeze(entries.filter(e => e.actorId === actorId));
    },

    getAllEntries(): readonly LedgerEntry[] {
      return Object.freeze([...entries]);
    },

    verifyChain(): boolean {
      if (entries.length === 0) {
        return true;
      }

      let previousHash: ChainHash | null = null;

      for (const entry of entries) {
        if (!verifyEntryChainHash(entry, previousHash)) {
          return false;
        }
        previousHash = entry.chainHash;
      }

      return true;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exports ledger to serializable format.
 *
 * @param ledger - Ledger to export
 * @returns Serializable array of entries
 */
export function exportLedger(ledger: IntentLedger): readonly LedgerEntry[] {
  return ledger.getAllEntries();
}

/**
 * Imports ledger entries (for verification only).
 * Does NOT create a writable ledger from import.
 *
 * @param entries - Entries to verify
 * @returns true if all entries form valid chain
 */
export function verifyImportedLedger(entries: readonly LedgerEntry[]): boolean {
  if (entries.length === 0) {
    return true;
  }

  let previousHash: ChainHash | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Verify index is sequential
    if (entry.index !== i) {
      return false;
    }

    // Verify chain hash
    if (!verifyEntryChainHash(entry, previousHash)) {
      return false;
    }

    previousHash = entry.chainHash;
  }

  return true;
}

/**
 * Finds tampered entries in a ledger.
 *
 * @param entries - Entries to check
 * @returns Indices of invalid entries (empty if all valid)
 */
export function findTamperedEntries(entries: readonly LedgerEntry[]): readonly number[] {
  const tampered: number[] = [];
  let previousHash: ChainHash | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (entry.index !== i || !verifyEntryChainHash(entry, previousHash)) {
      tampered.push(i);
    }

    previousHash = entry.chainHash;
  }

  return Object.freeze(tampered);
}

/**
 * Gets intent processing history from ledger.
 *
 * @param ledger - Ledger to query
 * @param intentId - Intent ID to look up
 * @returns Ordered list of status changes
 */
export function getIntentHistory(
  ledger: IntentLedger,
  intentId: IntentId
): readonly { status: LedgerEntryStatus; timestamp: ISO8601 }[] {
  const entries = ledger.getEntriesByIntentId(intentId);

  return Object.freeze(
    entries.map(e => Object.freeze({
      status: e.status,
      timestamp: e.timestamp,
    }))
  );
}

/**
 * Gets latest status for an intent.
 *
 * @param ledger - Ledger to query
 * @param intentId - Intent ID
 * @returns Latest status or undefined if not found
 */
export function getLatestIntentStatus(
  ledger: IntentLedger,
  intentId: IntentId
): LedgerEntryStatus | undefined {
  const entries = ledger.getEntriesByIntentId(intentId);
  if (entries.length === 0) {
    return undefined;
  }
  return entries[entries.length - 1].status;
}

/**
 * Counts entries by status.
 *
 * @param ledger - Ledger to query
 * @returns Map of status to count
 */
export function countByStatus(ledger: IntentLedger): ReadonlyMap<LedgerEntryStatus, number> {
  const counts = new Map<LedgerEntryStatus, number>();

  for (const entry of ledger.getAllEntries()) {
    const current = counts.get(entry.status) ?? 0;
    counts.set(entry.status, current + 1);
  }

  return counts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  LedgerEntryStatus,
  LedgerEntry,
  IntentLedger,
};
