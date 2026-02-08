/**
 * OMEGA Creation Pipeline — Unified Emotion Gate Tests
 * Phase C.4 — Emotion pivot coverage verification
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedEmotionGate } from '../../src/gates/unified-emotion-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedEmotionGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('pivots checked — scenario A evaluates 4 target emotions', () => {
    const result = runUnifiedEmotionGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.gate_id).toBe('U_EMOTION');
    expect(['PASS', 'FAIL']).toContain(result.verdict);
    expect(result.metrics.target_emotions).toBe(4);
    expect(result.metrics.covered_emotions).toBeGreaterThanOrEqual(0);
  });

  it('missing pivot FAIL — text lacks required emotion keywords', () => {
    // Replace all text with emotionally flat content missing target emotion keywords
    const flatParagraphs = snap.styleOutput.paragraphs.map((p) => ({
      ...p,
      text: 'The structure stood. The mechanism operated. Components aligned. Systems functioned.',
    }));
    const flatOutput = { ...snap.styleOutput, paragraphs: flatParagraphs };

    const result = runUnifiedEmotionGate(
      flatOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].message).toContain('not detected');
  });

  it('coverage — measures ratio of covered emotions', () => {
    const result = runUnifiedEmotionGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.target_emotions).toBeGreaterThan(0);
    expect(result.metrics.covered_emotions).toBeGreaterThanOrEqual(0);
    expect(result.metrics.coverage).toBeGreaterThanOrEqual(0);
    expect(result.metrics.coverage).toBeLessThanOrEqual(1);
  });

  it('multi-emotion — scenario A has 4 target emotions', () => {
    // EMOTION_A waypoints have: trust, anticipation, fear, sadness
    const result = runUnifiedEmotionGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Unique emotions from waypoints
    expect(result.metrics.target_emotions).toBe(4);
  });

  it('single emotion — text with only one emotion keyword', () => {
    const singleEmotionParas = snap.styleOutput.paragraphs.map((p) => ({
      ...p,
      text: 'Fear gripped the corridor. The dread was palpable, terror hung in every shadow.',
    }));
    const singleOutput = { ...snap.styleOutput, paragraphs: singleEmotionParas };

    const result = runUnifiedEmotionGate(
      singleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Only fear is covered, but trust/anticipation/sadness missing
    expect(result.metrics.covered_emotions).toBeGreaterThanOrEqual(1);
    expect(result.metrics.covered_emotions).toBeLessThan(result.metrics.target_emotions);
    expect(result.verdict).toBe('FAIL');
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedEmotionGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedEmotionGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.target_emotions).toBe(r2.metrics.target_emotions);
    expect(r1.metrics.covered_emotions).toBe(r2.metrics.covered_emotions);
    expect(r1.metrics.coverage).toBe(r2.metrics.coverage);
    expect(r1.violations.length).toBe(r2.violations.length);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedEmotionGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.target_emotions).toBe('number');
    expect(typeof result.metrics.covered_emotions).toBe('number');
    expect(typeof result.metrics.coverage).toBe('number');
    expect(result.gate_id).toBe('U_EMOTION');
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('empty text — no emotions detected, all violations', () => {
    const emptyOutput = { ...snap.styleOutput, paragraphs: [] };

    const result = runUnifiedEmotionGate(
      emptyOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Empty text matches no emotion keywords
    expect(result.metrics.covered_emotions).toBe(0);
    expect(result.metrics.coverage).toBe(0);
    expect(result.verdict).toBe('FAIL');
    expect(result.violations.length).toBe(result.metrics.target_emotions);
  });
});
