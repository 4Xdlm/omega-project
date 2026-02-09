import { describe, it, expect } from 'vitest';
import { diffScores, hasSignificantScoreDelta } from '../../src/compare/score-differ.js';
import type { ForgeReport, ForgeMetrics } from '../../src/core/types.js';

function makeForgeReport(overrides: Partial<ForgeMetrics> = {}): ForgeReport {
  return {
    forge_id: 'test',
    input_hash: 'a'.repeat(64),
    verdict: 'PASS',
    metrics: {
      total_paragraphs: 10, emotion_coverage: 1, trajectory_compliance: 0.90,
      avg_cosine_distance: 0.15, avg_euclidean_distance: 0.25,
      forced_transitions: 0, feasibility_failures: 0, law4_violations: 0, flux_balance_error: 0.001,
      M1: 0, M2: 1, M3: 0.85, M4: 0.80, M5: 0.90, M6: 0.75, M7: 0.70,
      M8: 0.88, M9: 0.82, M10: 0.78, M11: 0.45, M12: 0.42,
      emotion_score: 0.80, quality_score: 0.75, composite_score: 0.85,
      dead_zones_count: 0, prescriptions_count: 0, critical_prescriptions: 0,
      ...overrides,
    },
    config_hash: 'b'.repeat(64),
    report_hash: 'c'.repeat(64),
    timestamp_deterministic: '2026-01-01T00:00:00.000Z',
  };
}

describe('Score Differ', () => {
  it('returns zero deltas for identical scores', () => {
    const report = makeForgeReport();
    const comparison = diffScores(report, report);
    expect(comparison.forge_score_delta).toBe(0);
    expect(comparison.emotion_score_delta).toBe(0);
    expect(comparison.quality_score_delta).toBe(0);
  });

  it('computes correct forge_score_delta', () => {
    const left = makeForgeReport({ composite_score: 0.80 });
    const right = makeForgeReport({ composite_score: 0.90 });
    const comparison = diffScores(left, right);
    expect(comparison.forge_score_delta).toBeCloseTo(0.10, 4);
  });

  it('computes correct emotion_score_delta', () => {
    const left = makeForgeReport({ emotion_score: 0.70 });
    const right = makeForgeReport({ emotion_score: 0.85 });
    const comparison = diffScores(left, right);
    expect(comparison.emotion_score_delta).toBeCloseTo(0.15, 4);
  });

  it('computes correct M-score deltas', () => {
    const left = makeForgeReport({ M3: 0.80 });
    const right = makeForgeReport({ M3: 0.95 });
    const comparison = diffScores(left, right);
    expect(comparison.m_scores['M3']).toBeCloseTo(0.15, 4);
  });

  it('hasSignificantScoreDelta detects large delta', () => {
    const left = makeForgeReport({ composite_score: 0.50 });
    const right = makeForgeReport({ composite_score: 0.90 });
    const comparison = diffScores(left, right);
    expect(hasSignificantScoreDelta(comparison, 0.10)).toBe(true);
  });

  it('hasSignificantScoreDelta returns false for small delta', () => {
    const left = makeForgeReport({ composite_score: 0.85 });
    const right = makeForgeReport({ composite_score: 0.86 });
    const comparison = diffScores(left, right);
    expect(hasSignificantScoreDelta(comparison, 0.10)).toBe(false);
  });

  it('negative deltas are computed correctly', () => {
    const left = makeForgeReport({ composite_score: 0.90 });
    const right = makeForgeReport({ composite_score: 0.70 });
    const comparison = diffScores(left, right);
    expect(comparison.forge_score_delta).toBeCloseTo(-0.20, 4);
  });

  it('all 12 M-scores are present in comparison', () => {
    const comparison = diffScores(makeForgeReport(), makeForgeReport());
    for (let i = 1; i <= 12; i++) {
      expect(comparison.m_scores).toHaveProperty(`M${i}`);
    }
  });
});
