/**
 * OMEGA Truth Gate — Ledger Types
 *
 * Types for the append-only verdict ledger.
 */

import type { RootHash } from '@omega/canon-kernel';
import type { GateVerdict, LedgerHash } from '../gate/types.js';

/**
 * Ledger entry in the append-only chain.
 */
export interface LedgerEntry {
  readonly index: number;
  readonly verdict: GateVerdict;
  readonly parent_hash: LedgerHash;
  readonly cumulative_hash: LedgerHash;
  readonly timestamp: number;
}

/**
 * Ledger snapshot for persistence.
 */
export interface LedgerSnapshot {
  readonly head_hash: LedgerHash;
  readonly entry_count: number;
  readonly allow_count: number;
  readonly deny_count: number;
  readonly defer_count: number;
  readonly first_entry_timestamp: number | null;
  readonly last_entry_timestamp: number | null;
}

/**
 * Genesis hash for the ledger chain.
 */
export const LEDGER_GENESIS_HASH = 'ledger_genesis_0000000000000000000000000000000000000000000000000000000000000000' as LedgerHash;
