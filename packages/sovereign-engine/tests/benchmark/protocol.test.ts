/**
 * Tests: Benchmark Protocol (Sprint 17.2)
 * Invariant: ART-BENCH-02
 */

import { describe, it, expect } from 'vitest';
import {
  createBlindSession,
  validateEvaluation,
  EVALUATION_GRID,
  type HumanEvaluation,
} from '../../src/benchmark/protocol.js';
import { FULL_CORPUS } from '../../src/benchmark/corpus.js';

describe('BenchmarkProtocol (ART-BENCH-02)', () => {
  it('PROTO-01: blind session anonymizes 20 samples', () => {
    const session = createBlindSession(FULL_CORPUS, 42);

    expect(session.samples.length).toBe(20);
    expect(session.mappings.length).toBe(20);

    // Blind samples have no source field
    for (const sample of session.samples) {
      expect(sample.blind_id).toMatch(/^SAMPLE-\d{3}$/);
      expect((sample as Record<string, unknown>).source).toBeUndefined();
      expect(sample.prose.length).toBeGreaterThan(100);
    }
  });

  it('PROTO-02: blind session is deterministic (same seed = same order)', () => {
    const s1 = createBlindSession(FULL_CORPUS, 42);
    const s2 = createBlindSession(FULL_CORPUS, 42);

    for (let i = 0; i < 20; i++) {
      expect(s1.mappings[i].original_id).toBe(s2.mappings[i].original_id);
    }
  });

  it('PROTO-03: different seed = different order', () => {
    const s1 = createBlindSession(FULL_CORPUS, 42);
    const s2 = createBlindSession(FULL_CORPUS, 99);

    // Very unlikely all 20 match with different seed
    let differences = 0;
    for (let i = 0; i < 20; i++) {
      if (s1.mappings[i].original_id !== s2.mappings[i].original_id) {
        differences++;
      }
    }
    expect(differences).toBeGreaterThan(5);
  });

  it('PROTO-04: mappings link back to both omega and human', () => {
    const session = createBlindSession(FULL_CORPUS, 42);

    const omegaCount = session.mappings.filter(m => m.source === 'omega').length;
    const humanCount = session.mappings.filter(m => m.source === 'human').length;

    expect(omegaCount).toBe(10);
    expect(humanCount).toBe(10);
  });

  it('PROTO-05: evaluation grid has 5 axes + global + engagement', () => {
    expect(EVALUATION_GRID.axes.length).toBe(5);
    expect(EVALUATION_GRID.global.id).toBe('overall_quality');
    expect(EVALUATION_GRID.engagement.id).toBe('would_read_more');

    // Each axis maps to a macro-axe
    const macroAxes = EVALUATION_GRID.axes.map(a => a.maps_to);
    expect(macroAxes).toContain('ECC');
    expect(macroAxes).toContain('RCI');
    expect(macroAxes).toContain('IFI');
    expect(macroAxes).toContain('SII');
    expect(macroAxes).toContain('AAI');
  });

  it('PROTO-06: valid evaluation passes validation', () => {
    const eval_: HumanEvaluation = {
      sample_id: 'SAMPLE-001',
      evaluator_id: 'EVAL-01',
      timestamp: new Date().toISOString(),
      emotion_impact: 7,
      rhythm_musicality: 8,
      sensory_immersion: 6,
      originality: 9,
      authenticity: 7,
      overall_quality: 8,
      would_read_more: true,
    };

    const result = validateEvaluation(eval_);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('PROTO-07: invalid evaluation — score out of range', () => {
    const eval_: HumanEvaluation = {
      sample_id: 'SAMPLE-001',
      evaluator_id: 'EVAL-01',
      timestamp: new Date().toISOString(),
      emotion_impact: 11, // out of range
      rhythm_musicality: 0, // out of range
      sensory_immersion: 6,
      originality: 9,
      authenticity: 7,
      overall_quality: 8,
      would_read_more: false,
    };

    const result = validateEvaluation(eval_);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
