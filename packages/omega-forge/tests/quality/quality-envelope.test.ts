/**
 * OMEGA Forge — Quality Envelope Tests
 * Phase C.5 — 10 tests
 */

import { describe, it, expect } from 'vitest';
import { computeQualityMetrics, computeQualityScore, buildQualityEnvelope } from '../../src/quality/quality-envelope.js';
import { CREATION_A, DEFAULT_F5_CONFIG, INTENT_PACK_A } from '../fixtures.js';
import type { QualityMetrics, StyledOutput, GenesisPlan, ScribeOutput, Canon, F5Config } from '../../src/types.js';

function getTestData() {
  const creation = CREATION_A();
  const styleOutput = creation.style_output as unknown as StyledOutput;
  const plan = creation.genesis_plan as unknown as GenesisPlan;
  const scribeOutput = creation.scribe_output as unknown as ScribeOutput;
  const canon: Canon = INTENT_PACK_A.canon;
  return { styleOutput, plan, scribeOutput, canon };
}

describe('computeQualityMetrics', () => {
  it('computes all M1-M12 metrics from creation data', () => {
    const { styleOutput, plan, scribeOutput, canon } = getTestData();
    const metrics = computeQualityMetrics(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);

    expect(metrics).toHaveProperty('M1_contradiction_rate');
    expect(metrics).toHaveProperty('M2_canon_compliance');
    expect(metrics).toHaveProperty('M3_coherence_span');
    expect(metrics).toHaveProperty('M4_arc_maintenance');
    expect(metrics).toHaveProperty('M5_memory_integrity');
    expect(metrics).toHaveProperty('M6_style_emergence');
    expect(metrics).toHaveProperty('M7_author_fingerprint');
    expect(metrics).toHaveProperty('M8_sentence_necessity');
    expect(metrics).toHaveProperty('M9_semantic_density');
    expect(metrics).toHaveProperty('M10_reading_levels');
    expect(metrics).toHaveProperty('M11_discomfort_index');
    expect(metrics).toHaveProperty('M12_superiority_index');
  });

  it('returns M12 (superiority index) as a computed aggregate', () => {
    const { styleOutput, plan, scribeOutput, canon } = getTestData();
    const metrics = computeQualityMetrics(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    expect(metrics.M12_superiority_index).toBeGreaterThanOrEqual(0);
    expect(metrics.M12_superiority_index).toBeLessThanOrEqual(1);
  });

  it('is deterministic across multiple calls', () => {
    const { styleOutput, plan, scribeOutput, canon } = getTestData();
    const m1 = computeQualityMetrics(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    const m2 = computeQualityMetrics(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    expect(m1.M1_contradiction_rate).toBe(m2.M1_contradiction_rate);
    expect(m1.M8_sentence_necessity).toBe(m2.M8_sentence_necessity);
    expect(m1.M12_superiority_index).toBe(m2.M12_superiority_index);
  });
});

describe('computeQualityScore', () => {
  it('returns score in [0, 1] range', () => {
    const { styleOutput, plan, scribeOutput, canon } = getTestData();
    const metrics = computeQualityMetrics(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    const score = computeQualityScore(metrics, DEFAULT_F5_CONFIG);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns high score for ideal metrics', () => {
    const idealMetrics: QualityMetrics = {
      M1_contradiction_rate: 0,
      M2_canon_compliance: 1,
      M3_coherence_span: 200,
      M4_arc_maintenance: 5,
      M5_memory_integrity: 1,
      M6_style_emergence: 1,
      M7_author_fingerprint: 1,
      M8_sentence_necessity: 1,
      M9_semantic_density: 0.6,
      M10_reading_levels: 4,
      M11_discomfort_index: 0.5,
      M12_superiority_index: 1,
    };
    const score = computeQualityScore(idealMetrics, DEFAULT_F5_CONFIG);
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('returns lower score when metrics are poor', () => {
    const poorMetrics: QualityMetrics = {
      M1_contradiction_rate: 5,
      M2_canon_compliance: 0.2,
      M3_coherence_span: 10,
      M4_arc_maintenance: 0,
      M5_memory_integrity: 0.3,
      M6_style_emergence: 0.1,
      M7_author_fingerprint: 0.1,
      M8_sentence_necessity: 0.5,
      M9_semantic_density: 0.1,
      M10_reading_levels: 1,
      M11_discomfort_index: 0.1,
      M12_superiority_index: 0.1,
    };
    const score = computeQualityScore(poorMetrics, DEFAULT_F5_CONFIG);
    expect(score).toBeLessThan(0.5);
  });

  it('handles threshold correctly for discomfort index', () => {
    const metricsInRange: QualityMetrics = {
      M1_contradiction_rate: 0, M2_canon_compliance: 1,
      M3_coherence_span: 100, M4_arc_maintenance: 3,
      M5_memory_integrity: 1, M6_style_emergence: 0.8,
      M7_author_fingerprint: 0.7, M8_sentence_necessity: 0.96,
      M9_semantic_density: 0.4, M10_reading_levels: 3,
      M11_discomfort_index: 0.5, // in [0.3, 0.7]
      M12_superiority_index: 0.8,
    };
    const metricsOutOfRange: QualityMetrics = {
      ...metricsInRange,
      M11_discomfort_index: 0.1, // below 0.3
    };
    const scoreIn = computeQualityScore(metricsInRange, DEFAULT_F5_CONFIG);
    const scoreOut = computeQualityScore(metricsOutOfRange, DEFAULT_F5_CONFIG);
    expect(scoreIn).toBeGreaterThan(scoreOut);
  });
});

describe('buildQualityEnvelope', () => {
  it('returns a complete envelope with metrics, score, and hash', () => {
    const { styleOutput, plan, scribeOutput, canon } = getTestData();
    const envelope = buildQualityEnvelope(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);

    expect(envelope).toHaveProperty('metrics');
    expect(envelope).toHaveProperty('quality_score');
    expect(envelope).toHaveProperty('quality_hash');
    expect(typeof envelope.quality_hash).toBe('string');
    expect(envelope.quality_hash).toHaveLength(64);
  });

  it('produces a stable hash (deterministic)', () => {
    const { styleOutput, plan, scribeOutput, canon } = getTestData();
    const e1 = buildQualityEnvelope(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    const e2 = buildQualityEnvelope(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    expect(e1.quality_hash).toBe(e2.quality_hash);
    expect(e1.quality_score).toBe(e2.quality_score);
  });

  it('integration: envelope score matches independently computed score', () => {
    const { styleOutput, plan, scribeOutput, canon } = getTestData();
    const envelope = buildQualityEnvelope(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    const metrics = computeQualityMetrics(styleOutput, plan, scribeOutput, canon, DEFAULT_F5_CONFIG);
    const score = computeQualityScore(metrics, DEFAULT_F5_CONFIG);
    expect(envelope.quality_score).toBe(score);
  });
});
