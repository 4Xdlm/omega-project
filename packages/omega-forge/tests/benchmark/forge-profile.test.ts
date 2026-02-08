/**
 * OMEGA Forge — Forge Profile Tests
 * Phase C.5 — 8 tests for buildForgeProfile
 */

import { describe, it, expect } from 'vitest';
import { buildForgeProfile } from '../../src/benchmark/forge-profile.js';
import type {
  ForgeScore, TrajectoryAnalysis, LawComplianceReport, QualityEnvelope,
} from '../../src/types.js';

function makeMockTrajectory(complianceRatio: number): TrajectoryAnalysis {
  return {
    paragraph_states: [],
    prescribed_states: [],
    deviations: [],
    avg_cosine_distance: 0.1,
    avg_euclidean_distance: 0.5,
    max_deviation_index: 0,
    compliant_ratio: complianceRatio,
    trajectory_hash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
  };
}

function makeMockLaws(overrides?: Partial<LawComplianceReport>): LawComplianceReport {
  return {
    transitions: [],
    organic_decay_segments: [],
    flux_conservation: { phi_transferred: 0, phi_stored: 0, phi_dissipated: 0, phi_total: 0, balance_error: 0, compliant: true },
    total_transitions: 0,
    forced_transitions: 0,
    feasibility_failures: 0,
    law4_violations: 0,
    law5_compliant: true,
    overall_compliance: 0.9,
    compliance_hash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
    ...overrides,
  };
}

function makeMockQuality(overrides?: Partial<QualityEnvelope['metrics']>): QualityEnvelope {
  return {
    metrics: {
      M1_contradiction_rate: 0,
      M2_canon_compliance: 1,
      M3_coherence_span: 100,
      M4_arc_maintenance: 3,
      M5_memory_integrity: 0.9,
      M6_style_emergence: 0.8,
      M7_author_fingerprint: 0.6,
      M8_sentence_necessity: 0.98,
      M9_semantic_density: 0.45,
      M10_reading_levels: 3,
      M11_discomfort_index: 0.5,
      M12_superiority_index: 0,
      ...overrides,
    },
    quality_score: 0.85,
    quality_hash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
  };
}

const SCORE: ForgeScore = { emotion_compliance: 0.85, quality_score: 0.8, composite: 0.83 };

describe('forge-profile', () => {
  it('builds a complete profile', () => {
    const profile = buildForgeProfile(SCORE, makeMockTrajectory(0.9), makeMockLaws(), makeMockQuality());
    expect(profile.score).toEqual(SCORE);
    expect(typeof profile.trajectory_compliance).toBe('number');
    expect(typeof profile.law_compliance).toBe('number');
    expect(typeof profile.canon_compliance).toBe('number');
    expect(typeof profile.necessity_score).toBe('number');
    expect(typeof profile.style_emergence).toBe('number');
    expect(typeof profile.profile_hash).toBe('string');
    expect(profile.profile_hash).toHaveLength(64);
  });

  it('populates strengths for high-quality data', () => {
    const profile = buildForgeProfile(SCORE, makeMockTrajectory(0.9), makeMockLaws(), makeMockQuality());
    expect(profile.strengths.length).toBeGreaterThan(0);
  });

  it('populates weaknesses for low-quality data', () => {
    const lowTrajectory = makeMockTrajectory(0.3);
    const lowLaws = makeMockLaws({ forced_transitions: 5, overall_compliance: 0.2, law5_compliant: false });
    const lowQuality = makeMockQuality({
      M1_contradiction_rate: 3,
      M2_canon_compliance: 0.2,
      M6_style_emergence: 0.1,
      M8_sentence_necessity: 0.5,
    });
    const profile = buildForgeProfile(SCORE, lowTrajectory, lowLaws, lowQuality);
    expect(profile.weaknesses.length).toBeGreaterThan(0);
  });

  it('produces stable hash for same input', () => {
    const t = makeMockTrajectory(0.85);
    const l = makeMockLaws();
    const q = makeMockQuality();
    const a = buildForgeProfile(SCORE, t, l, q);
    const b = buildForgeProfile(SCORE, t, l, q);
    expect(a.profile_hash).toBe(b.profile_hash);
  });

  it('reports all strengths for all-high metrics', () => {
    const highLaws = makeMockLaws({ overall_compliance: 0.95, forced_transitions: 0, law5_compliant: true });
    const highQuality = makeMockQuality({
      M1_contradiction_rate: 0,
      M2_canon_compliance: 0.95,
      M6_style_emergence: 0.85,
      M8_sentence_necessity: 0.98,
    });
    const profile = buildForgeProfile(SCORE, makeMockTrajectory(0.95), highLaws, highQuality);
    expect(profile.strengths.length).toBeGreaterThanOrEqual(5);
    expect(profile.weaknesses.length).toBe(0);
  });

  it('reports all weaknesses for all-low metrics', () => {
    const lowLaws = makeMockLaws({ overall_compliance: 0.1, forced_transitions: 3, law5_compliant: false });
    const lowQuality = makeMockQuality({
      M1_contradiction_rate: 5,
      M2_canon_compliance: 0.1,
      M6_style_emergence: 0.1,
      M8_sentence_necessity: 0.3,
    });
    const profile = buildForgeProfile(SCORE, makeMockTrajectory(0.1), lowLaws, lowQuality);
    expect(profile.weaknesses.length).toBeGreaterThanOrEqual(5);
    expect(profile.strengths.length).toBe(0);
  });

  it('handles edge case: zero compliance ratio', () => {
    const profile = buildForgeProfile(
      { emotion_compliance: 0, quality_score: 0, composite: 0 },
      makeMockTrajectory(0),
      makeMockLaws({ overall_compliance: 0 }),
      makeMockQuality({ M2_canon_compliance: 0, M6_style_emergence: 0, M8_sentence_necessity: 0 }),
    );
    expect(typeof profile.profile_hash).toBe('string');
    expect(profile.trajectory_compliance).toBe(0);
  });

  it('is deterministic across repeated calls', () => {
    const t = makeMockTrajectory(0.7);
    const l = makeMockLaws();
    const q = makeMockQuality();
    const results = Array.from({ length: 3 }, () => buildForgeProfile(SCORE, t, l, q));
    expect(results[0].profile_hash).toBe(results[1].profile_hash);
    expect(results[1].profile_hash).toBe(results[2].profile_hash);
  });
});
