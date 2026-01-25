/**
 * OMEGA Emotion Gate — Verdict Ledger Tests
 *
 * Tests for the append-only verdict ledger.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmotionVerdictLedger, EmotionVerdictLedger } from '../../src/ledger/verdict-ledger.js';
import { createEmotionGate } from '../../src/gate/emotion-gate.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  SAD_EMOTION,
  createTestFrame,
  createTestContext,
  createTestPolicy,
  resetFrameCounter,
} from '../helpers/test-fixtures.js';

describe('EmotionVerdictLedger', () => {
  let ledger: EmotionVerdictLedger;

  beforeEach(() => {
    ledger = createEmotionVerdictLedger();
    resetFrameCounter();
  });

  describe('append', () => {
    it('should append verdict to ledger', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      const entry = ledger.append(verdict);

      expect(entry).toBeDefined();
      expect(entry.index).toBe(0);
      expect(entry.verdict).toBe(verdict);
    });

    it('should assign sequential indexes', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        const entry = ledger.append(verdict);
        expect(entry.index).toBe(i);
      }
    });

    it('should compute entry hash', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      const entry = ledger.append(verdict);

      expect(entry.entry_hash).toMatch(/^rh_/);
    });

    it('should link to previous entry', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const verdict1 = gate.evaluate(frame1, context);
      const entry1 = ledger.append(verdict1);

      const frame2 = createTestFrame(HAPPY_EMOTION);
      const verdict2 = gate.evaluate(frame2, context);
      const entry2 = ledger.append(verdict2);

      expect(entry1.previous_hash).toBeNull();
      expect(entry2.previous_hash).toBe(entry1.entry_hash);
    });
  });

  describe('retrieval', () => {
    it('should get by verdict ID', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      ledger.append(verdict);

      const entry = ledger.getByVerdictId(verdict.verdict_id);
      expect(entry).toBeDefined();
      expect(entry?.verdict.verdict_id).toBe(verdict.verdict_id);
    });

    it('should get by frame ID', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      ledger.append(verdict);

      const entry = ledger.getByFrameId(verdict.frame_id);
      expect(entry).toBeDefined();
      expect(entry?.verdict.frame_id).toBe(verdict.frame_id);
    });

    it('should get by entity ID', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_ledger_001' });
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      ledger.append(verdict);

      const entries = ledger.getByEntityId('ent_ledger_001' as any);
      expect(entries).toHaveLength(1);
      expect(entries[0].verdict.entity_id).toBe('ent_ledger_001');
    });

    it('should get all entries', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      for (let i = 0; i < 3; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      expect(ledger.getAll()).toHaveLength(3);
    });

    it('should get count', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      expect(ledger.getCount()).toBe(5);
    });

    it('should get latest', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const verdict1 = gate.evaluate(frame1, context);
      ledger.append(verdict1);

      const frame2 = createTestFrame(HAPPY_EMOTION);
      const verdict2 = gate.evaluate(frame2, context);
      ledger.append(verdict2);

      const latest = ledger.getLatest();
      expect(latest?.verdict.verdict_id).toBe(verdict2.verdict_id);
    });

    it('should get by index', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      const frame = createTestFrame(NEUTRAL_EMOTION);
      const verdict = gate.evaluate(frame, context);
      ledger.append(verdict);

      const entry = ledger.getAtIndex(0);
      expect(entry).toBeDefined();
      expect(entry?.index).toBe(0);
    });
  });

  describe('query', () => {
    it('should query by verdict type', () => {
      const gate = createEmotionGate();
      // Use bounds-only policy for clear ALLOW/DENY
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      // Valid frame -> ALLOW
      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const verdict1 = gate.evaluate(frame1, context);
      ledger.append(verdict1);

      // Invalid frame -> DENY
      const frame2 = createTestFrame({ ...NEUTRAL_EMOTION, joy: -0.5 });
      const verdict2 = gate.evaluate(frame2, context);
      ledger.append(verdict2);

      const allows = ledger.query({ verdict_type: 'ALLOW' });
      expect(allows).toHaveLength(1);

      const denies = ledger.query({ verdict_type: 'DENY' });
      expect(denies).toHaveLength(1);
    });

    it('should query with limit', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      for (let i = 0; i < 10; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      const limited = ledger.query({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('should query with offset', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      for (let i = 0; i < 10; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      const offset = ledger.query({ offset: 5 });
      expect(offset).toHaveLength(5);
      expect(offset[0].index).toBe(5);
    });
  });

  describe('integrity', () => {
    it('should verify integrity of valid ledger', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      const integrity = ledger.verifyIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.errors).toHaveLength(0);
    });

    it('should verify empty ledger', () => {
      const integrity = ledger.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should compute stats for empty ledger', () => {
      const stats = ledger.getStats();

      expect(stats.total_entries).toBe(0);
      expect(stats.allow_count).toBe(0);
      expect(stats.deny_count).toBe(0);
      expect(stats.first_entry_timestamp).toBeNull();
    });

    it('should compute stats after entries', () => {
      const gate = createEmotionGate();
      // Use bounds-only policy for clear ALLOW/DENY
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      const frame1 = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_stats_001' });
      const verdict1 = gate.evaluate(frame1, context);
      ledger.append(verdict1);

      const frame2 = createTestFrame({ ...NEUTRAL_EMOTION, joy: -0.5 }, { entity_id: 'ent_stats_002' });
      const verdict2 = gate.evaluate(frame2, context);
      ledger.append(verdict2);

      const stats = ledger.getStats();
      expect(stats.total_entries).toBe(2);
      expect(stats.allow_count).toBe(1);
      expect(stats.deny_count).toBe(1);
      expect(stats.entities_count).toBe(2);
    });
  });

  describe('explanation', () => {
    it('should explain verdict', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      ledger.append(verdict);

      const explanation = ledger.explainVerdict(verdict.verdict_id);
      expect(explanation).toBeDefined();
      expect(explanation?.summary).toBeDefined();
      expect(explanation?.validator_explanations).toBeDefined();
      expect(explanation?.drift_explanation).toBeDefined();
      expect(explanation?.toxicity_explanation).toBeDefined();
    });

    it('should return undefined for unknown verdict', () => {
      const explanation = ledger.explainVerdict('evrd_unknown');
      expect(explanation).toBeUndefined();
    });
  });

  describe('export/import', () => {
    it('should export to JSON', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      ledger.append(verdict);

      const json = ledger.exportToJSON();
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.entries).toHaveLength(1);
    });

    it('should import from JSON', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      ledger.append(verdict);
      const json = ledger.exportToJSON();

      const imported = EmotionVerdictLedger.importFromJSON(json);
      expect(imported.getCount()).toBe(1);
      expect(imported.getByVerdictId(verdict.verdict_id)).toBeDefined();
    });

    it('should verify integrity after import', () => {
      const gate = createEmotionGate();
      const context = createTestContext();

      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      const json = ledger.exportToJSON();
      const imported = EmotionVerdictLedger.importFromJSON(json);

      const integrity = imported.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });
});

describe('createEmotionVerdictLedger', () => {
  it('should create empty ledger', () => {
    const ledger = createEmotionVerdictLedger();
    expect(ledger).toBeInstanceOf(EmotionVerdictLedger);
    expect(ledger.getCount()).toBe(0);
  });
});
