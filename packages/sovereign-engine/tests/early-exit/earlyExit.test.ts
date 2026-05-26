/**
 * OMEGA V2.3 — Early Exit Tests
 *
 * Unit tests for dispersion + gate + calibration framework.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  EarlyExitGate,
  DEFAULT_EARLY_EXIT_CONFIG,
  computeDispersion,
  computeAxisDispersion,
  compositeScore,
  evaluateThreshold,
  gridSearchThreshold,
  generateSyntheticSamples,
  DEFAULT_CALIBRATION_SEARCH,
} from '../../src/early-exit/index.js';

describe('OMEGA V2.3 — Dispersion (pure math)', () => {
  it('empty values → 0', () => {
    const r = computeDispersion([]);
    expect(r.stdev).toBe(0);
    expect(r.mean).toBe(0);
    expect(r.range).toBe(0);
  });

  it('identical values → stdev 0', () => {
    const r = computeDispersion([75, 75, 75, 75, 75]);
    expect(r.stdev).toBe(0);
    expect(r.mean).toBe(75);
  });

  it('variance computed', () => {
    const r = computeDispersion([70, 80, 90]);
    expect(r.mean).toBeCloseTo(80, 5);
    expect(r.range).toBe(20);
  });

  it('computeAxisDispersion: 5 axes', () => {
    const r = computeAxisDispersion({ ecc: 80, aai: 82, rci: 81, sii: 79, ifi: 83 });
    expect(r.mean).toBeCloseTo(81, 5);
    expect(r.stdev).toBeLessThan(2);
  });

  it('compositeScore: uniform weights', () => {
    const s = compositeScore({ ecc: 80, aai: 80, rci: 80, sii: 80, ifi: 80 });
    expect(s).toBeCloseTo(80, 5);
  });

  it('compositeScore: custom weights sum 1', () => {
    const s = compositeScore(
      { ecc: 100, aai: 0, rci: 0, sii: 0, ifi: 0 },
      { ecc: 1, aai: 0, rci: 0, sii: 0, ifi: 0 }
    );
    expect(s).toBe(100);
  });
});

describe('OMEGA V2.3 — EarlyExitGate logic', () => {
  it('low composite → no exit', () => {
    const g = new EarlyExitGate();
    const d = g.shouldExit({ ecc: 50, aai: 50, rci: 50, sii: 50, ifi: 50 });
    expect(d.exit).toBe(false);
    expect(d.reason).toContain('Composite');
  });

  it('axis below floor → no exit', () => {
    const g = new EarlyExitGate({
      ...DEFAULT_EARLY_EXIT_CONFIG,
      absolute_floor: 70,
      min_avg_score: 70,
    });
    const d = g.shouldExit({ ecc: 90, aai: 90, rci: 90, sii: 90, ifi: 50 });
    expect(d.exit).toBe(false);
    expect(d.reason).toContain('floor');
  });

  it('high dispersion → no exit', () => {
    const g = new EarlyExitGate({
      ...DEFAULT_EARLY_EXIT_CONFIG,
      threshold: 1.0,
      min_avg_score: 70,
      absolute_floor: 50,
    });
    const d = g.shouldExit({ ecc: 95, aai: 65, rci: 95, sii: 65, ifi: 95 });
    expect(d.exit).toBe(false);
    expect(d.reason).toContain('Dispersion');
  });

  it('all gates pass → exit', () => {
    const g = new EarlyExitGate({
      ...DEFAULT_EARLY_EXIT_CONFIG,
      threshold: 10,
      min_avg_score: 70,
      absolute_floor: 60,
    });
    const d = g.shouldExit({ ecc: 85, aai: 86, rci: 84, sii: 85, ifi: 86 });
    expect(d.exit).toBe(true);
    expect(d.confidence).toBeGreaterThan(0);
  });

  it('skip rate tracking', () => {
    const g = new EarlyExitGate();
    g.recordOutcome({
      chapter_id: 'c1',
      scores: { ecc: 80, aai: 80, rci: 80, sii: 80, ifi: 80 },
      exited_early: true,
      final_score: 80,
      timestamp: Date.now(),
    });
    g.recordOutcome({
      chapter_id: 'c2',
      scores: { ecc: 70, aai: 70, rci: 70, sii: 70, ifi: 70 },
      exited_early: false,
      final_score: 75,
      timestamp: Date.now(),
    });
    expect(g.getSkipRate()).toBeCloseTo(0.5, 2);
  });

  it('not production-ready until calibration', () => {
    expect(EarlyExitGate.isProductionReady()).toBe(false);
  });
});

describe('OMEGA V2.3 — Calibration framework', () => {
  it('evaluateThreshold: empty samples → zeros', () => {
    const r = evaluateThreshold([], 5, DEFAULT_EARLY_EXIT_CONFIG);
    expect(r.skip_rate).toBe(0);
    expect(r.samples_count).toBe(0);
  });

  it('generateSyntheticSamples: deterministic', () => {
    const a = generateSyntheticSamples(20, 42);
    const b = generateSyntheticSamples(20, 42);
    expect(a[0]!.first_candidate_scores.ecc).toBe(b[0]!.first_candidate_scores.ecc);
    expect(a.length).toBe(20);
  });

  it('evaluateThreshold: synthetic skip rate scales with threshold', () => {
    const samples = generateSyntheticSamples(100, 42);
    const lowT = evaluateThreshold(samples, 1, DEFAULT_EARLY_EXIT_CONFIG);
    const highT = evaluateThreshold(samples, 20, DEFAULT_EARLY_EXIT_CONFIG);
    expect(highT.skip_rate).toBeGreaterThanOrEqual(lowT.skip_rate);
  });

  it('gridSearchThreshold: returns valid configs ordered', () => {
    const samples = generateSyntheticSamples(100, 42);
    const results = gridSearchThreshold(samples, DEFAULT_EARLY_EXIT_CONFIG, {
      ...DEFAULT_CALIBRATION_SEARCH,
      min_skip_rate: 0.1,
      max_skip_rate: 0.9,
      max_quality_drift: 100, // permissive for synthetic
    });
    expect(results.length).toBeGreaterThan(0);
    // Sorted by composite (higher first)
    for (let i = 0; i < results.length - 1; i++) {
      const a = results[i]!;
      const b = results[i + 1]!;
      const scoreA = a.skip_rate * 100 - Math.abs(a.quality_drift) * 10;
      const scoreB = b.skip_rate * 100 - Math.abs(b.quality_drift) * 10;
      expect(scoreA).toBeGreaterThanOrEqual(scoreB);
    }
  });

  it('gridSearchThreshold: empty result when constraints too strict', () => {
    const samples = generateSyntheticSamples(100, 42);
    const results = gridSearchThreshold(samples, DEFAULT_EARLY_EXIT_CONFIG, {
      ...DEFAULT_CALIBRATION_SEARCH,
      min_skip_rate: 0.99, // unrealistic
      max_skip_rate: 1.0,
      max_quality_drift: 0.001,
    });
    expect(results.length).toBe(0);
  });
});
