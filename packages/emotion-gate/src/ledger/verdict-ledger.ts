/**
 * OMEGA Emotion Gate — Verdict Ledger
 *
 * Append-only ledger for emotion verdicts.
 * Immutable, auditable, cryptographically linked.
 */

import type {
  EmotionVerdict,
  EmotionVerdictId,
  EmotionVerdictType,
  EmotionVerdictExplanation,
  FrameId,
} from '../gate/types.js';
import type { EntityId, RootHash } from '@omega/canon-kernel';

/**
 * Ledger entry (wrapper around verdict with ledger metadata).
 */
export interface LedgerEntry {
  readonly index: number;
  readonly verdict: EmotionVerdict;
  readonly previous_hash: RootHash | null;
  readonly entry_hash: RootHash;
  readonly timestamp: number;
}

/**
 * Ledger statistics.
 */
export interface LedgerStats {
  readonly total_entries: number;
  readonly allow_count: number;
  readonly deny_count: number;
  readonly defer_count: number;
  readonly entities_count: number;
  readonly first_entry_timestamp: number | null;
  readonly last_entry_timestamp: number | null;
}

/**
 * Query options for ledger.
 */
export interface LedgerQueryOptions {
  readonly entity_id?: EntityId;
  readonly frame_id?: FrameId;
  readonly verdict_type?: EmotionVerdictType;
  readonly from_timestamp?: number;
  readonly to_timestamp?: number;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Compute hash for ledger entry.
 */
function computeEntryHash(
  index: number,
  verdict: EmotionVerdict,
  previousHash: RootHash | null
): RootHash {
  const data = JSON.stringify({
    index,
    verdict_id: verdict.verdict_id,
    verdict_hash: verdict.verdict_hash,
    previous_hash: previousHash,
  });

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `rh_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * EmotionVerdictLedger — Append-only verdict storage.
 *
 * Guarantees:
 * - Append-only (no modification or deletion)
 * - Cryptographically linked (each entry references previous)
 * - Auditable (full history preserved)
 */
export class EmotionVerdictLedger {
  private entries: LedgerEntry[] = [];
  private byVerdictId: Map<EmotionVerdictId, LedgerEntry> = new Map();
  private byEntityId: Map<EntityId, LedgerEntry[]> = new Map();
  private byFrameId: Map<FrameId, LedgerEntry> = new Map();

  /**
   * Append a verdict to the ledger.
   * Returns the ledger entry.
   */
  append(verdict: EmotionVerdict): LedgerEntry {
    const index = this.entries.length;
    const previousHash = index > 0 ? this.entries[index - 1].entry_hash : null;
    const entryHash = computeEntryHash(index, verdict, previousHash);

    const entry: LedgerEntry = {
      index,
      verdict,
      previous_hash: previousHash,
      entry_hash: entryHash,
      timestamp: Date.now(),
    };

    // Append to main list
    this.entries.push(entry);

    // Index by verdict ID
    this.byVerdictId.set(verdict.verdict_id, entry);

    // Index by entity ID
    const entityEntries = this.byEntityId.get(verdict.entity_id) ?? [];
    entityEntries.push(entry);
    this.byEntityId.set(verdict.entity_id, entityEntries);

    // Index by frame ID
    this.byFrameId.set(verdict.frame_id, entry);

    return entry;
  }

  /**
   * Get entry by verdict ID.
   */
  getByVerdictId(verdictId: EmotionVerdictId): LedgerEntry | undefined {
    return this.byVerdictId.get(verdictId);
  }

  /**
   * Get entry by frame ID.
   */
  getByFrameId(frameId: FrameId): LedgerEntry | undefined {
    return this.byFrameId.get(frameId);
  }

  /**
   * Get entries by entity ID.
   */
  getByEntityId(entityId: EntityId): readonly LedgerEntry[] {
    return this.byEntityId.get(entityId) ?? [];
  }

  /**
   * Query entries with options.
   */
  query(options: LedgerQueryOptions): readonly LedgerEntry[] {
    let results = [...this.entries];

    // Filter by entity
    if (options.entity_id) {
      results = results.filter(e => e.verdict.entity_id === options.entity_id);
    }

    // Filter by frame
    if (options.frame_id) {
      results = results.filter(e => e.verdict.frame_id === options.frame_id);
    }

    // Filter by verdict type
    if (options.verdict_type) {
      results = results.filter(e => e.verdict.type === options.verdict_type);
    }

    // Filter by timestamp range
    if (options.from_timestamp !== undefined) {
      results = results.filter(e => e.verdict.timestamp >= options.from_timestamp!);
    }
    if (options.to_timestamp !== undefined) {
      results = results.filter(e => e.verdict.timestamp <= options.to_timestamp!);
    }

    // Apply offset and limit
    const offset = options.offset ?? 0;
    const limit = options.limit ?? results.length;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Get all entries.
   */
  getAll(): readonly LedgerEntry[] {
    return this.entries;
  }

  /**
   * Get entry count.
   */
  getCount(): number {
    return this.entries.length;
  }

  /**
   * Get latest entry.
   */
  getLatest(): LedgerEntry | undefined {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1] : undefined;
  }

  /**
   * Get entry at index.
   */
  getAtIndex(index: number): LedgerEntry | undefined {
    return this.entries[index];
  }

  /**
   * Get ledger statistics.
   */
  getStats(): LedgerStats {
    const entities = new Set(this.entries.map(e => e.verdict.entity_id));

    return {
      total_entries: this.entries.length,
      allow_count: this.entries.filter(e => e.verdict.type === 'ALLOW').length,
      deny_count: this.entries.filter(e => e.verdict.type === 'DENY').length,
      defer_count: this.entries.filter(e => e.verdict.type === 'DEFER').length,
      entities_count: entities.size,
      first_entry_timestamp: this.entries.length > 0 ? this.entries[0].timestamp : null,
      last_entry_timestamp: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null,
    };
  }

  /**
   * Verify ledger integrity (chain of hashes).
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify index
      if (entry.index !== i) {
        errors.push(`Entry ${i}: index mismatch (expected ${i}, got ${entry.index})`);
      }

      // Verify previous hash
      if (i === 0) {
        if (entry.previous_hash !== null) {
          errors.push(`Entry 0: previous_hash should be null`);
        }
      } else {
        const expectedPreviousHash = this.entries[i - 1].entry_hash;
        if (entry.previous_hash !== expectedPreviousHash) {
          errors.push(`Entry ${i}: previous_hash mismatch`);
        }
      }

      // Verify entry hash
      const expectedEntryHash = computeEntryHash(i, entry.verdict, entry.previous_hash);
      if (entry.entry_hash !== expectedEntryHash) {
        errors.push(`Entry ${i}: entry_hash mismatch`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate explanation for a verdict.
   */
  explainVerdict(verdictId: EmotionVerdictId): EmotionVerdictExplanation | undefined {
    const entry = this.byVerdictId.get(verdictId);
    if (!entry) return undefined;

    const verdict = entry.verdict;

    // Generate summary
    let summary: string;
    switch (verdict.type) {
      case 'ALLOW':
        summary = 'Emotion frame passed all validators';
        break;
      case 'DENY':
        summary = 'Emotion frame blocked by one or more validators';
        break;
      case 'DEFER':
        summary = 'Emotion frame deferred pending more data';
        break;
    }

    // Generate validator explanations
    const validatorExplanations = verdict.validators_results.map(r => ({
      validator_id: r.validator_id,
      result: r.result,
      explanation: Array.isArray(r.reasons) ? (r.reasons.join('; ') || 'No additional details') : 'No additional details',
    }));

    // Generate drift explanation
    const drift = verdict.drift_vector;
    const driftExplanation = drift.magnitude > 0
      ? `Emotional drift detected: magnitude ${drift.magnitude.toFixed(4)}, ` +
        `${drift.emotional_deltas.filter(d => Math.abs(d.delta) > 0.01).length} dimension(s) changed`
      : 'No emotional drift (first frame or stable)';

    // Generate toxicity explanation
    const toxicity = verdict.toxicity_signal;
    let toxicityExplanation: string;
    if (toxicity.amplification_detected) {
      toxicityExplanation = `Amplification detected: ${toxicity.amplification_cycles} cycle(s), ` +
        `instability ${toxicity.instability_score.toFixed(4)}`;
    } else if (toxicity.instability_score > 0.3) {
      toxicityExplanation = `Elevated instability: ${toxicity.instability_score.toFixed(4)}`;
    } else {
      toxicityExplanation = 'No toxicity patterns detected';
    }

    return {
      verdict_id: verdictId,
      summary,
      validator_explanations: validatorExplanations,
      drift_explanation: driftExplanation,
      toxicity_explanation: toxicityExplanation,
    };
  }

  /**
   * Export ledger to JSON (for persistence).
   */
  exportToJSON(): string {
    return JSON.stringify({
      version: '1.0.0',
      entries: this.entries,
      exported_at: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import ledger from JSON.
   * Validates integrity after import.
   */
  static importFromJSON(json: string): EmotionVerdictLedger {
    const data = JSON.parse(json);
    const ledger = new EmotionVerdictLedger();

    // Rebuild from entries
    for (const entry of data.entries) {
      // Re-append to rebuild indexes
      ledger.entries.push(entry);
      ledger.byVerdictId.set(entry.verdict.verdict_id, entry);
      ledger.byFrameId.set(entry.verdict.frame_id, entry);

      const entityEntries = ledger.byEntityId.get(entry.verdict.entity_id) ?? [];
      entityEntries.push(entry);
      ledger.byEntityId.set(entry.verdict.entity_id, entityEntries);
    }

    // Verify integrity
    const integrity = ledger.verifyIntegrity();
    if (!integrity.valid) {
      throw new Error(`Ledger integrity check failed: ${integrity.errors.join(', ')}`);
    }

    return ledger;
  }
}

/**
 * Create an EmotionVerdictLedger instance.
 */
export function createEmotionVerdictLedger(): EmotionVerdictLedger {
  return new EmotionVerdictLedger();
}
