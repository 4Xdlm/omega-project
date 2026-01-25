/**
 * OMEGA Truth Gate — Verdict Ledger
 *
 * Append-only ledger for storing gate verdicts.
 * Each entry is hashed and chained to the previous entry.
 *
 * RULE: No delete, no modify. Only append.
 * RULE: Hash chain must be continuous.
 */

import { canonicalize, sha256, type RootHash } from '@omega/canon-kernel';
import type { GateVerdict, LedgerHash, VerdictType } from '../gate/types.js';
import type { LedgerEntry, LedgerSnapshot } from './types.js';
import { LEDGER_GENESIS_HASH } from './types.js';

/**
 * VerdictLedger — Append-only verdict storage.
 */
export class VerdictLedger {
  private readonly entries: LedgerEntry[] = [];
  private readonly verdictsByTxId: Map<string, GateVerdict[]> = new Map();
  private headHash: LedgerHash = LEDGER_GENESIS_HASH;

  /**
   * Append a verdict to the ledger.
   * Returns the ledger entry.
   */
  append(verdict: GateVerdict): LedgerEntry {
    const index = this.entries.length;
    const parent_hash = this.headHash;
    const timestamp = Date.now();

    // Compute cumulative hash
    const cumulative_hash = this.computeEntryHash(
      index,
      verdict,
      parent_hash
    );

    const entry: LedgerEntry = {
      index,
      verdict,
      parent_hash,
      cumulative_hash,
      timestamp,
    };

    // Append to chain
    this.entries.push(entry);
    this.headHash = cumulative_hash;

    // Index by tx_id
    const existing = this.verdictsByTxId.get(verdict.tx_id) || [];
    this.verdictsByTxId.set(verdict.tx_id, [...existing, verdict]);

    return entry;
  }

  /**
   * Get head hash.
   */
  getHeadHash(): LedgerHash {
    return this.headHash;
  }

  /**
   * Get entry count.
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Get entry by index.
   */
  getEntry(index: number): LedgerEntry | undefined {
    return this.entries[index];
  }

  /**
   * Get all entries.
   */
  getAllEntries(): readonly LedgerEntry[] {
    return this.entries;
  }

  /**
   * Get all verdicts.
   */
  getAllVerdicts(): readonly GateVerdict[] {
    return this.entries.map(e => e.verdict);
  }

  /**
   * Get verdicts by transaction ID.
   */
  getVerdictsByTxId(tx_id: string): readonly GateVerdict[] {
    return this.verdictsByTxId.get(tx_id) || [];
  }

  /**
   * Get verdicts by verdict type.
   */
  getVerdictsByType(type: VerdictType): readonly GateVerdict[] {
    return this.entries
      .filter(e => e.verdict.final_verdict === type)
      .map(e => e.verdict);
  }

  /**
   * Get latest verdict for a transaction.
   */
  getLatestVerdict(tx_id: string): GateVerdict | undefined {
    const verdicts = this.verdictsByTxId.get(tx_id);
    return verdicts?.[verdicts.length - 1];
  }

  /**
   * Check if transaction has any verdict.
   */
  hasVerdict(tx_id: string): boolean {
    return this.verdictsByTxId.has(tx_id);
  }

  /**
   * Count verdicts by type.
   */
  countByType(type: VerdictType): number {
    return this.entries.filter(e => e.verdict.final_verdict === type).length;
  }

  /**
   * Get ledger snapshot.
   */
  getSnapshot(): LedgerSnapshot {
    const firstEntry = this.entries[0];
    const lastEntry = this.entries[this.entries.length - 1];

    return {
      head_hash: this.headHash,
      entry_count: this.entries.length,
      allow_count: this.countByType('ALLOW'),
      deny_count: this.countByType('DENY'),
      defer_count: this.countByType('DEFER'),
      first_entry_timestamp: firstEntry?.timestamp ?? null,
      last_entry_timestamp: lastEntry?.timestamp ?? null,
    };
  }

  /**
   * Verify ledger integrity.
   * Recomputes all hashes and verifies chain continuity.
   */
  verifyIntegrity(): boolean {
    if (this.entries.length === 0) {
      return this.headHash === LEDGER_GENESIS_HASH;
    }

    let expectedParent = LEDGER_GENESIS_HASH;

    for (const entry of this.entries) {
      // Verify parent hash matches
      if (entry.parent_hash !== expectedParent) {
        return false;
      }

      // Recompute and verify cumulative hash
      const recomputed = this.computeEntryHash(
        entry.index,
        entry.verdict,
        entry.parent_hash
      );

      if (recomputed !== entry.cumulative_hash) {
        return false;
      }

      expectedParent = entry.cumulative_hash;
    }

    // Verify head hash matches last entry
    const lastEntry = this.entries[this.entries.length - 1];
    return this.headHash === lastEntry.cumulative_hash;
  }

  /**
   * Verify replay - rebuild from verdicts and compare.
   */
  verifyReplay(): boolean {
    if (this.entries.length === 0) {
      return true;
    }

    // Rebuild ledger from verdicts
    const rebuiltLedger = new VerdictLedger();

    for (const entry of this.entries) {
      rebuiltLedger.append(entry.verdict);
    }

    // Compare head hashes
    return rebuiltLedger.getHeadHash() === this.headHash;
  }

  /**
   * Get entries in time range.
   */
  getEntriesInRange(startTime: number, endTime: number): readonly LedgerEntry[] {
    return this.entries.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Get entry by verdict ID.
   */
  getEntryByVerdictId(verdict_id: string): LedgerEntry | undefined {
    return this.entries.find(e => e.verdict.verdict_id === verdict_id);
  }

  /**
   * Compute entry hash.
   */
  private computeEntryHash(
    index: number,
    verdict: GateVerdict,
    parent_hash: LedgerHash
  ): LedgerHash {
    const hashInput = canonicalize({
      index,
      verdict_hash: verdict.hash,
      verdict_id: verdict.verdict_id,
      final_verdict: verdict.final_verdict,
      parent_hash,
    });

    return sha256(hashInput) as LedgerHash;
  }
}

/**
 * Create an empty verdict ledger.
 */
export function createVerdictLedger(): VerdictLedger {
  return new VerdictLedger();
}
