/**
 * OMEGA Canon Kernel — Transactions
 * Transactions are ordered sequences of operations with hash chain integrity.
 */

import type { TxId, RootHash } from './identifiers';
import type { CanonOp } from './operations';
import type { EvidenceRef } from './evidence';

export type RailType = 'truth' | 'interpretation';

export interface CanonTx {
  readonly tx_id: TxId;
  readonly ops: readonly CanonOp[];
  readonly actor: string;
  readonly reason: string;
  readonly evidence_refs: readonly EvidenceRef[];
  readonly parent_root_hash: RootHash;
  readonly rail: RailType;
  readonly timestamp: number;  // EXCLUDED from hash calculation
}

/**
 * HashableTxView: everything EXCEPT timestamp and logs
 * This is what gets hashed for determinism.
 */
export interface HashableTxView {
  readonly tx_id: TxId;
  readonly ops: readonly CanonOp[];      // Sorted by op_id
  readonly actor: string;
  readonly reason: string;
  readonly evidence_refs: readonly EvidenceRef[];  // Sorted by path
  readonly parent_root_hash: RootHash;
  readonly rail: RailType;
  // NO timestamp - explicitly excluded for determinism
  // NO logs - explicitly excluded
  // NO metadata - explicitly excluded
}

export function createCanonTx(
  tx_id: TxId,
  ops: readonly CanonOp[],
  actor: string,
  reason: string,
  parent_root_hash: RootHash,
  rail: RailType,
  options?: {
    evidence_refs?: readonly EvidenceRef[];
    timestamp?: number;
  }
): CanonTx {
  return {
    tx_id,
    ops,
    actor,
    reason,
    evidence_refs: options?.evidence_refs ?? [],
    parent_root_hash,
    rail,
    timestamp: options?.timestamp ?? Date.now(),
  };
}
