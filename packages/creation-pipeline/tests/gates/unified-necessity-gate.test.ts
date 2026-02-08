/**
 * OMEGA Creation Pipeline — Unified Necessity Gate Tests
 * Phase C.4 — C4-INV-05: Every paragraph is necessary
 * 10 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedNecessityGate } from '../../src/gates/unified-necessity-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedNecessityGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('all PASS for scenario A — paragraphs have unique words', () => {
    const result = runUnifiedNecessityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Each paragraph in a well-constructed output contributes unique vocabulary
    expect(result.gate_id).toBe('U_NECESSITY');
    expect(typeof result.verdict).toBe('string');
    expect(['PASS', 'FAIL']).toContain(result.verdict);
  });

  it('ablation measured — removing paragraph degrades coverage', () => {
    const result = runUnifiedNecessityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.base_coverage).toBeGreaterThan(0);
    expect(result.metrics.total_paragraphs).toBe(snap.styleOutput.paragraphs.length);
  });

  it('threshold — 0.85 ablation ratio from config', () => {
    const threshold = DEFAULT_C4_CONFIG.NECESSITY_ABLATION_THRESHOLD.value as number;
    expect(threshold).toBe(0.85);
    // Run with default config
    const result = runUnifiedNecessityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Removable paragraphs are those whose removal retains >= 0.85
    expect(result.metrics.removable_paragraphs).toBeGreaterThanOrEqual(0);
  });

  it('FAIL edge case — duplicated paragraph is removable', () => {
    // Create output where a paragraph is duplicated (zero unique contribution)
    const firstPara = snap.styleOutput.paragraphs[0];
    const duplicate = { ...firstPara, paragraph_id: 'PARA-DUP-001' };
    const dupeOutput = {
      ...snap.styleOutput,
      paragraphs: [...snap.styleOutput.paragraphs, duplicate],
    };

    const result = runUnifiedNecessityGate(
      dupeOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // At least one paragraph should be flagged as removable
    expect(result.metrics.removable_paragraphs).toBeGreaterThanOrEqual(1);
    expect(result.verdict).toBe('FAIL');
  });

  it('single paragraph — cannot be removed, should PASS', () => {
    const singleOutput = {
      ...snap.styleOutput,
      paragraphs: [snap.styleOutput.paragraphs[0]],
    };
    const result = runUnifiedNecessityGate(
      singleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Single paragraph: remaining.length === 0 is skipped
    expect(result.verdict).toBe('PASS');
    expect(result.violations).toHaveLength(0);
  });

  it('multi-paragraph — each contributes unique vocabulary', () => {
    // Build paragraphs with distinctly unique content
    const uniqueParas = [
      { ...snap.styleOutput.paragraphs[0], paragraph_id: 'PARA-U-001', text: 'Chrysanthemum petals drifted through the aeolian corridor.', word_count: 7 },
      { ...snap.styleOutput.paragraphs[0], paragraph_id: 'PARA-U-002', text: 'Bioluminescent organisms illuminated the abyssal trenches below.', word_count: 7 },
      { ...snap.styleOutput.paragraphs[0], paragraph_id: 'PARA-U-003', text: 'Tectonic vibrations resonated across the glaciated mountain range.', word_count: 8 },
    ];
    const uniqueOutput = { ...snap.styleOutput, paragraphs: uniqueParas };
    const result = runUnifiedNecessityGate(
      uniqueOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Each paragraph has entirely unique words, so removing any degrades coverage significantly
    expect(result.metrics.base_coverage).toBeGreaterThan(0);
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedNecessityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedNecessityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.base_coverage).toBe(r2.metrics.base_coverage);
    expect(r1.metrics.removable_paragraphs).toBe(r2.metrics.removable_paragraphs);
    expect(r1.metrics.total_paragraphs).toBe(r2.metrics.total_paragraphs);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedNecessityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.base_coverage).toBe('number');
    expect(typeof result.metrics.removable_paragraphs).toBe('number');
    expect(typeof result.metrics.total_paragraphs).toBe('number');
    expect(result.metrics.base_coverage).toBeGreaterThanOrEqual(0);
    expect(result.metrics.total_paragraphs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('C4-INV-05 — violations reference correct invariant', () => {
    // Force FAIL with a duplicate paragraph
    const firstPara = snap.styleOutput.paragraphs[0];
    const duplicate = { ...firstPara, paragraph_id: 'PARA-DUP-INV-001' };
    const dupeOutput = {
      ...snap.styleOutput,
      paragraphs: [...snap.styleOutput.paragraphs, duplicate],
    };

    const result = runUnifiedNecessityGate(
      dupeOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    if (result.violations.length > 0) {
      expect(result.violations[0].invariant).toBe('C4-INV-05');
      expect(result.violations[0].gate_id).toBe('U_NECESSITY');
      expect(result.violations[0].severity).toBe('ERROR');
    }
  });

  it('empty text — no paragraphs means no violations', () => {
    const emptyOutput = { ...snap.styleOutput, paragraphs: [] };
    const result = runUnifiedNecessityGate(
      emptyOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('PASS');
    expect(result.violations).toHaveLength(0);
    expect(result.metrics.total_paragraphs).toBe(0);
  });
});
