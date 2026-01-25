/**
 * OMEGA Canon Kernel — Hash Chain
 *
 * Hash chain provides cryptographic integrity verification.
 * Each entry links to the previous via cumulative hash.
 *
 * Formula:
 *   cumulative_hash = sha256(canonicalize({
 *     parent: parent_cumulative_hash,
 *     ops: ops_hash,
 *     rail: rail_type
 *   }))
 */

import type { TxId, RootHash } from '../types/identifiers';
import type { CanonTx } from '../types/transactions';
import { hashTx } from './hashable-view';
import { sha256 } from './sha256';
import { canonicalize } from './canonicalize';

export interface HashEntry {
  readonly tx_id: TxId;
  readonly ops_hash: RootHash;
  readonly parent_cumulative_hash: RootHash;
  readonly cumulative_hash: RootHash;
}

/**
 * Genesis hash - the root of all hash chains.
 * This is a known constant, computed deterministically.
 */
export const GENESIS_HASH: RootHash = sha256('OMEGA_GENESIS_2026');

/**
 * Compute cumulative hash for a transaction.
 * This links the transaction to the previous chain state.
 */
export function computeCumulativeHash(
  tx: CanonTx,
  parentCumulativeHash: RootHash
): RootHash {
  const opsHash = hashTx(tx);
  const combined = canonicalize({
    parent: parentCumulativeHash,
    ops: opsHash,
    rail: tx.rail,
  });
  return sha256(combined);
}

/**
 * Create a hash entry for a transaction.
 */
export function createHashEntry(
  tx: CanonTx,
  parentCumulativeHash: RootHash
): HashEntry {
  const opsHash = hashTx(tx);
  const cumulativeHash = computeCumulativeHash(tx, parentCumulativeHash);

  return {
    tx_id: tx.tx_id,
    ops_hash: opsHash,
    parent_cumulative_hash: parentCumulativeHash,
    cumulative_hash: cumulativeHash,
  };
}

/**
 * Verify hash chain integrity.
 * Each entry's parent_cumulative_hash must match previous entry's cumulative_hash.
 */
export function verifyChain(entries: readonly HashEntry[]): boolean {
  if (entries.length === 0) {
    return true;
  }

  for (let i = 1; i < entries.length; i++) {
    const current = entries[i]!;
    const previous = entries[i - 1]!;

    if (current.parent_cumulative_hash !== previous.cumulative_hash) {
      return false;
    }
  }

  return true;
}

/**
 * Find the break point in a chain (if any).
 * Returns -1 if chain is valid, otherwise returns index of first broken entry.
 */
export function findChainBreak(entries: readonly HashEntry[]): number {
  for (let i = 1; i < entries.length; i++) {
    const current = entries[i]!;
    const previous = entries[i - 1]!;
    if (current.parent_cumulative_hash !== previous.cumulative_hash) {
      return i;
    }
  }
  return -1;
}

/**
 * Recompute chain from transactions.
 * Useful for verification and rebuild.
 */
export function buildChain(
  transactions: readonly CanonTx[],
  genesisHash: RootHash = GENESIS_HASH
): readonly HashEntry[] {
  const entries: HashEntry[] = [];
  let parentHash = genesisHash;

  for (const tx of transactions) {
    const entry = createHashEntry(tx, parentHash);
    entries.push(entry);
    parentHash = entry.cumulative_hash;
  }

  return entries;
}

/**
 * Get the current head hash of a chain.
 */
export function getChainHead(entries: readonly HashEntry[]): RootHash {
  if (entries.length === 0) {
    return GENESIS_HASH;
  }
  const last = entries[entries.length - 1];
  return last!.cumulative_hash;
}
