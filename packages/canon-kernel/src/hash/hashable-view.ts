/**
 * OMEGA Canon Kernel — Hashable Transaction View
 *
 * CRITICAL: Transactions are hashed WITHOUT timestamp for determinism.
 * Two transactions with identical content but different timestamps
 * MUST produce the same hash.
 */

import type { CanonTx, HashableTxView } from '../types/transactions';
import type { CanonOp } from '../types/operations';
import type { RootHash } from '../types/identifiers';
import { canonicalize } from './canonicalize';
import { sha256 } from './sha256';

/**
 * Convert a CanonTx to its hashable view.
 * CRITICAL: This excludes timestamp and sorts ops/evidence for determinism.
 */
export function toHashableView(tx: CanonTx): HashableTxView {
  // Sort ops by op_id (lexicographic)
  const sortedOps = [...tx.ops].sort((a, b) =>
    a.op_id.localeCompare(b.op_id)
  ) as readonly CanonOp[];

  // Sort evidence_refs by path (lexicographic)
  const sortedEvidence = [...tx.evidence_refs].sort((a, b) =>
    a.path.localeCompare(b.path)
  );

  return {
    tx_id: tx.tx_id,
    ops: sortedOps,
    actor: tx.actor,
    reason: tx.reason,
    evidence_refs: sortedEvidence,
    parent_root_hash: tx.parent_root_hash,
    rail: tx.rail,
    // NO timestamp - explicitly excluded for determinism
  };
}

/**
 * Hash a transaction deterministically.
 * Same transaction content → Same hash (regardless of timestamp).
 */
export function hashTx(tx: CanonTx): RootHash {
  const view = toHashableView(tx);
  const canonical = canonicalize(view);
  return sha256(canonical);
}

/**
 * Hash operations only (without transaction wrapper).
 */
export function hashOps(ops: readonly CanonOp[]): RootHash {
  const sorted = [...ops].sort((a, b) => a.op_id.localeCompare(b.op_id));
  const canonical = canonicalize(sorted);
  return sha256(canonical);
}

/**
 * Verify that two transactions with different timestamps produce same hash.
 * This is a test helper to verify timestamp exclusion.
 */
export function verifyTimestampExclusion(tx1: CanonTx, tx2: CanonTx): boolean {
  // Hash should be same regardless of timestamp
  return hashTx(tx1) === hashTx(tx2);
}

/**
 * Create a hashable view with explicit field list.
 * Useful for debugging and testing.
 */
export function inspectHashableFields(tx: CanonTx): {
  included: string[];
  excluded: string[];
  hash: RootHash;
} {
  const view = toHashableView(tx);
  return {
    included: Object.keys(view),
    excluded: ['timestamp', 'logs', 'metadata'],
    hash: hashTx(tx),
  };
}
