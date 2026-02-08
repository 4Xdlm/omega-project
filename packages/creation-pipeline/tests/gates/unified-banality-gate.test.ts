/**
 * OMEGA Creation Pipeline — Unified Banality Gate Tests
 * Phase C.4 — Zero tolerance for cliches, IA patterns, banned words
 * 10 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedBanalityGate } from '../../src/gates/unified-banality-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedBanalityGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('clean PASS — scenario A text has no banned patterns', () => {
    const result = runUnifiedBanalityGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.gate_id).toBe('U_BANALITY');
    expect(result.verdict).toBe('PASS');
    expect(result.violations).toHaveLength(0);
  });

  it('cliche FAIL — forbidden cliche detected', () => {
    // CONSTRAINTS_A has forbidden_cliches: ['dark and stormy night', 'heart pounding', 'blood ran cold']
    const clicheParagraphs = snap.styleOutput.paragraphs.map((p, i) => {
      if (i === 0) {
        return { ...p, text: 'It was a dark and stormy night when the keeper arrived.' };
      }
      return p;
    });
    const clicheOutput = { ...snap.styleOutput, paragraphs: clicheParagraphs };

    const result = runUnifiedBanalityGate(
      clicheOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.metrics.cliche_count).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.message.includes('Forbidden cliche'))).toBe(true);
  });

  it('IA speak FAIL — IA pattern detected', () => {
    const iaParagraphs = snap.styleOutput.paragraphs.map((p, i) => {
      if (i === 0) {
        return { ...p, text: 'It is worth noting that the lighthouse stood tall. Furthermore, the keeper endured.' };
      }
      return p;
    });
    const iaOutput = { ...snap.styleOutput, paragraphs: iaParagraphs };

    const result = runUnifiedBanalityGate(
      iaOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.metrics.ia_speak_count).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.message.includes('IA pattern'))).toBe(true);
  });

  it('banned word FAIL — banned word from constraints detected', () => {
    // CONSTRAINTS_A has banned_words: ['suddenly', 'literally', 'basically']
    const bannedParagraphs = snap.styleOutput.paragraphs.map((p, i) => {
      if (i === 0) {
        return { ...p, text: 'The light suddenly flickered and literally went out.' };
      }
      return p;
    });
    const bannedOutput = { ...snap.styleOutput, paragraphs: bannedParagraphs };

    const result = runUnifiedBanalityGate(
      bannedOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.metrics.banned_word_count).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.message.includes('Banned word'))).toBe(true);
  });

  it('multiple violations — cliche + IA + banned stacked', () => {
    const stackedParagraphs = snap.styleOutput.paragraphs.map((p, i) => {
      if (i === 0) {
        return {
          ...p,
          text: 'His heart pounding, he suddenly realized it is worth noting that the storm raged.',
        };
      }
      return p;
    });
    const stackedOutput = { ...snap.styleOutput, paragraphs: stackedParagraphs };

    const result = runUnifiedBanalityGate(
      stackedOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.metrics.total_findings).toBeGreaterThanOrEqual(3);
  });

  it('merged lists — both IA patterns and forbidden cliches checked', () => {
    const result = runUnifiedBanalityGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // All three metrics exist even when all are zero
    expect(typeof result.metrics.cliche_count).toBe('number');
    expect(typeof result.metrics.ia_speak_count).toBe('number');
    expect(typeof result.metrics.banned_word_count).toBe('number');
    expect(typeof result.metrics.total_findings).toBe('number');
  });

  it('generic transition — detected as IA speak', () => {
    const transitionParagraphs = snap.styleOutput.paragraphs.map((p, i) => {
      if (i === 0) {
        return {
          ...p,
          text: 'Needless to say, the sea was rough. Moreover, the winds howled through the night.',
        };
      }
      return p;
    });
    const transitionOutput = { ...snap.styleOutput, paragraphs: transitionParagraphs };

    const result = runUnifiedBanalityGate(
      transitionOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.metrics.ia_speak_count).toBeGreaterThan(0);
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedBanalityGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedBanalityGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.cliche_count).toBe(r2.metrics.cliche_count);
    expect(r1.metrics.ia_speak_count).toBe(r2.metrics.ia_speak_count);
    expect(r1.metrics.banned_word_count).toBe(r2.metrics.banned_word_count);
    expect(r1.metrics.total_findings).toBe(r2.metrics.total_findings);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedBanalityGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.cliche_count).toBeGreaterThanOrEqual(0);
    expect(result.metrics.ia_speak_count).toBeGreaterThanOrEqual(0);
    expect(result.metrics.banned_word_count).toBeGreaterThanOrEqual(0);
    expect(result.metrics.total_findings).toBe(
      result.metrics.cliche_count + result.metrics.ia_speak_count + result.metrics.banned_word_count,
    );
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('zero tolerance — any single finding causes FAIL', () => {
    // Inject exactly one banned word
    const oneBannedParagraphs = [
      {
        ...snap.styleOutput.paragraphs[0],
        text: 'The keeper walked basically to the cliff edge.',
      },
    ];
    const oneBannedOutput = { ...snap.styleOutput, paragraphs: oneBannedParagraphs };

    const result = runUnifiedBanalityGate(
      oneBannedOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.metrics.total_findings).toBeGreaterThanOrEqual(1);
  });
});
