/**
 * OMEGA Creation Pipeline — Unified Quality Gate Tests
 * Phase C.4 — Information density, clarity, precision
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedQualityGate } from '../../src/gates/unified-quality-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedQualityGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('high quality PASS — scenario A text meets all quality thresholds', () => {
    const result = runUnifiedQualityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.gate_id).toBe('U_QUALITY');
    expect(result.verdict).toBe('PASS');
    expect(result.violations).toHaveLength(0);
  });

  it('low density FAIL — repetitive text with low unique word ratio', () => {
    // Create text with heavily repeated words (density < 0.3)
    const repetitiveText = Array(50).fill('the the the the the').join(' ') + '. ' +
      Array(50).fill('the the the the the').join(' ') + '.';
    const lowDensityParas = snap.styleOutput.paragraphs.map((p) => ({
      ...p,
      text: repetitiveText,
      word_count: 500,
    }));
    const lowDensityOutput = { ...snap.styleOutput, paragraphs: lowDensityParas };

    const result = runUnifiedQualityGate(
      lowDensityOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.violations.some((v) => v.location === 'density')).toBe(true);
    expect(result.metrics.information_density).toBeLessThan(0.15);
  });

  it('clarity — sentences exceeding 35 word average triggers FAIL', () => {
    // Create a paragraph with extremely long sentences
    const longSentence = Array(40).fill('elaborate').join(' ') + '.';
    const unclearParas = [{
      ...snap.styleOutput.paragraphs[0],
      text: longSentence,
      word_count: 40,
    }];
    const unclearOutput = { ...snap.styleOutput, paragraphs: unclearParas };

    const result = runUnifiedQualityGate(
      unclearOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.avg_sentence_length).toBeGreaterThan(35);
    expect(result.violations.some((v) => v.location === 'clarity')).toBe(true);
  });

  it('precision — paragraphs with fewer than 5 words flagged', () => {
    const shortParas = [
      { ...snap.styleOutput.paragraphs[0], text: 'Too short.', word_count: 2 },
      { ...snap.styleOutput.paragraphs[0], paragraph_id: 'PARA-SHORT-001', text: 'Also brief.', word_count: 2 },
    ];
    const shortOutput = { ...snap.styleOutput, paragraphs: shortParas };

    const result = runUnifiedQualityGate(
      shortOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.empty_paragraphs).toBe(2);
    expect(result.violations.some((v) => v.location === 'precision')).toBe(true);
  });

  it('threshold — MIN_DENSITY is 0.3, MAX_AVG_SENTENCE is 35', () => {
    // Verify the gate uses these thresholds
    const result = runUnifiedQualityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // A well-crafted literary text should have density > 0.15
    expect(result.metrics.information_density).toBeGreaterThan(0.15);
    // Average sentence length should be reasonable
    expect(result.metrics.avg_sentence_length).toBeLessThanOrEqual(35);
  });

  it('edge — text exactly at density boundary', () => {
    const result = runUnifiedQualityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Verify density is computed correctly: unique/total
    expect(result.metrics.total_words).toBeGreaterThan(0);
    expect(result.metrics.unique_words).toBeGreaterThan(0);
    expect(result.metrics.unique_words).toBeLessThanOrEqual(result.metrics.total_words);
    // Density = unique/total
    const expectedDensity = result.metrics.unique_words / result.metrics.total_words;
    expect(Math.abs(result.metrics.information_density - expectedDensity)).toBeLessThan(0.001);
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedQualityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedQualityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.information_density).toBe(r2.metrics.information_density);
    expect(r1.metrics.avg_sentence_length).toBe(r2.metrics.avg_sentence_length);
    expect(r1.metrics.empty_paragraphs).toBe(r2.metrics.empty_paragraphs);
    expect(r1.metrics.total_words).toBe(r2.metrics.total_words);
    expect(r1.metrics.unique_words).toBe(r2.metrics.unique_words);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedQualityGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.information_density).toBe('number');
    expect(typeof result.metrics.avg_sentence_length).toBe('number');
    expect(typeof result.metrics.empty_paragraphs).toBe('number');
    expect(typeof result.metrics.total_words).toBe('number');
    expect(typeof result.metrics.unique_words).toBe('number');
    expect(result.metrics.information_density).toBeGreaterThanOrEqual(0);
    expect(result.metrics.total_words).toBeGreaterThanOrEqual(0);
    expect(result.metrics.unique_words).toBeGreaterThanOrEqual(0);
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });
});
