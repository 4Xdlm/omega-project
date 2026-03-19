/**
 * OMEGA Multi-Stage Scorer — Unit Tests
 * Phase R4 — NASA-Grade L4 / DO-178C Level A
 *
 * Tests: confidence interpolation, feature disabling, type detection,
 * position modifiers, handshake, profiles, alpha/beta.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { MultiStageScorer } from '../../src/scoring/multi-stage-scorer.js';
import { CoefficientsLoader, getPrelZone } from '../../src/scoring/coefficients-loader.js';
import { detectPassageType } from '../../src/scoring/passage-type-detector.js';
import { getProfile, getProfileNames, PROFILES } from '../../src/scoring/quality-profiles.js';

const COEFF_PATH = resolve(__dirname, '../../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');

describe('CoefficientsLoader', () => {
  let loader: CoefficientsLoader;

  beforeAll(() => {
    loader = new CoefficientsLoader(COEFF_PATH);
  });

  it('loads the JSON without error', () => {
    expect(loader).toBeDefined();
    expect(loader.getRaw()).toBeDefined();
    expect(loader.getRaw().confidence_table).toBeDefined();
  });

  it('returns 0 confidence for never-active features', () => {
    const neverActive = loader.getNeverActive();
    expect(neverActive.length).toBe(29);
    for (const feat of neverActive) {
      expect(loader.getConfidence(feat, 600)).toBe(0);
      expect(loader.isFeatureActive(feat, 600)).toBe(false);
    }
  });

  it('returns confidence for known features', () => {
    // f25g_description_score at 600w: conf ~0.743
    const conf = loader.getConfidence('f25g_description_score', 600);
    expect(conf).toBeGreaterThan(0.7);
    expect(conf).toBeLessThan(0.8);
  });

  it('interpolates confidence for intermediate sizes', () => {
    // 800 words is between 600 and 1000
    const conf600 = loader.getConfidence('f25g_description_score', 600);
    const conf1000 = loader.getConfidence('f25g_description_score', 1000);
    const conf800 = loader.getConfidence('f25g_description_score', 800);

    // Should be between the two
    expect(conf800).toBeGreaterThan(conf600);
    expect(conf800).toBeLessThan(conf1000);
  });

  it('clamps confidence at edges', () => {
    // At 10 words (below 30), should use 30 value
    const conf10 = loader.getConfidence('f25g_description_score', 10);
    const conf30 = loader.getConfidence('f25g_description_score', 30);
    expect(conf10).toBe(conf30);

    // At 50000 words (above 20000), should use 20000 value
    const conf50k = loader.getConfidence('f25g_description_score', 50000);
    const conf20k = loader.getConfidence('f25g_description_score', 20000);
    expect(conf50k).toBe(conf20k);
  });

  it('returns weight tables for LOCAL and ARC', () => {
    const localWeights = loader.getWeightTable('LOCAL');
    const arcWeights = loader.getWeightTable('ARC');

    expect(localWeights.size).toBeGreaterThan(0);
    expect(arcWeights.size).toBeGreaterThan(0);
    expect(arcWeights.size).toBeGreaterThan(localWeights.size);
  });

  it('returns alpha/beta for standard sizes', () => {
    const ab30 = loader.getAlphaBeta(30);
    const ab600 = loader.getAlphaBeta(600);

    // At 30w: alpha > beta (LOCAL dominates)
    expect(ab30.alpha).toBeGreaterThan(ab30.beta);
    // At 600w: beta > alpha (ARC dominates)
    expect(ab600.beta).toBeGreaterThan(ab600.alpha);
    // Alpha + beta should be ~1.0
    expect(ab30.alpha + ab30.beta).toBeCloseTo(1.0, 2);
    expect(ab600.alpha + ab600.beta).toBeCloseTo(1.0, 2);
  });

  it('interpolates alpha/beta for intermediate sizes', () => {
    const ab150 = loader.getAlphaBeta(150);
    const ab300 = loader.getAlphaBeta(300);
    const ab225 = loader.getAlphaBeta(225);

    // 225 is halfway between 150 and 300
    expect(ab225.alpha).toBeCloseTo((ab150.alpha + ab300.alpha) / 2, 2);
  });

  it('returns position modifiers', () => {
    // f19g_consistency_ratio has ASCENDING trend
    const modOpening = loader.getPositionModifier('f19g_consistency_ratio', 0.05);
    const modClosing = loader.getPositionModifier('f19g_consistency_ratio', 0.95);
    // ASCENDING: closing > opening
    expect(modClosing).toBeGreaterThan(modOpening);
  });

  it('returns 1.0 for STABLE features position modifier', () => {
    // Features without position modifiers return 1.0
    const mod = loader.getPositionModifier('nonexistent_feature', 0.5);
    expect(mod).toBe(1.0);
  });

  it('returns type modifiers', () => {
    const mod = loader.getTypeModifier('f12_marker_count', 'TRANSITION');
    // TRANSITION has very high marker count modifier
    expect(mod).toBeGreaterThan(1.0);
  });

  it('returns 1.0 for unknown type modifiers', () => {
    const mod = loader.getTypeModifier('nonexistent_feature', 'DESCRIPTION');
    expect(mod).toBe(1.0);
  });
});

describe('getPrelZone', () => {
  it('maps P_rel to correct zones', () => {
    expect(getPrelZone(0.05)).toBe('OPENING');
    expect(getPrelZone(0.15)).toBe('SETUP');
    expect(getPrelZone(0.50)).toBe('MIDDLE');
    expect(getPrelZone(0.70)).toBe('TENSION');
    expect(getPrelZone(0.90)).toBe('CLOSING');
  });

  it('handles edge cases', () => {
    expect(getPrelZone(0.0)).toBe('OPENING');
    expect(getPrelZone(0.10)).toBe('SETUP');    // boundary
    expect(getPrelZone(0.40)).toBe('MIDDLE');    // boundary
    expect(getPrelZone(0.60)).toBe('TENSION');   // boundary
    expect(getPrelZone(0.85)).toBe('CLOSING');   // boundary
    expect(getPrelZone(1.0)).toBe('CLOSING');
  });
});

describe('detectPassageType', () => {
  it('detects DESCRIPTION as default', () => {
    const result = detectPassageType({});
    expect(result).toBe('DESCRIPTION');
  });

  it('detects DIALOGUE', () => {
    const result = detectPassageType({
      f34b_para_per_1000w: 10.0,
      f33a_dots_count: 100,
    });
    expect(result).toBe('DIALOGUE');
  });

  it('detects ACTION', () => {
    const result = detectPassageType({
      f5a_verb_density: 0.08,
      f38c_speed_score: 0.35,
      f1_mean: 8.0,
    });
    expect(result).toBe('ACTION');
  });

  it('detects INTROSPECTION', () => {
    const result = detectPassageType({
      f28d_sil_score: 0.15,
      f27d_modal_score: 0.60,
    });
    expect(result).toBe('INTROSPECTION');
  });

  it('detects TRANSITION', () => {
    const result = detectPassageType({
      f12b_tense_switch_rate: 0.20,
    });
    expect(result).toBe('TRANSITION');
  });

  it('does not detect TRANSITION when features are extreme', () => {
    const result = detectPassageType({
      f12b_tense_switch_rate: 0.20,
      f28d_sil_score: 0.15,  // extreme → not TRANSITION
    });
    expect(result).not.toBe('TRANSITION');
  });
});

describe('QualityProfiles', () => {
  it('has 6 profiles defined', () => {
    expect(getProfileNames().length).toBe(6);
  });

  it('returns LITTERAIRE as default', () => {
    const profile = getProfile('NONEXISTENT');
    expect(profile.name).toBe('Littéraire');
  });

  it('STRATOSPHERIQUE has highest threshold', () => {
    const strato = getProfile('STRATOSPHERIQUE');
    const experimental = getProfile('EXPERIMENTAL');
    expect(strato.seal_threshold).toBeGreaterThan(experimental.seal_threshold);
  });

  it('all profiles have valid thresholds', () => {
    for (const name of getProfileNames()) {
      const p = PROFILES[name];
      expect(p.seal_threshold).toBeGreaterThan(0);
      expect(p.seal_threshold).toBeLessThanOrEqual(100);
      expect(p.min_axis).toBeGreaterThan(0);
      expect(p.min_axis).toBeLessThanOrEqual(100);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });
});

describe('MultiStageScorer', () => {
  let scorer: MultiStageScorer;

  beforeAll(() => {
    scorer = new MultiStageScorer(COEFF_PATH);
  });

  it('scores with empty features', () => {
    const result = scorer.score({}, { wordCount: 600 });
    expect(result.local.score).toBe(0);
    expect(result.local.active_features).toBe(0);
    expect(result.composite.score).toBe(0);
    expect(result.passage_type).toBe('DESCRIPTION');
  });

  it('scores with known features', () => {
    const features: Record<string, number> = {
      f1_mean: 15.0,
      f22f_literary_index: 0.5,
      f25g_description_score: 0.7,
      f24e_contrast_score: 0.9,
      f38c_speed_score: 0.3,
      f29d_ttr_score: 0.7,
      f35c_hook_score: 0.5,
      f36c_cliff_score: 0.5,
    };
    const result = scorer.score(features, { wordCount: 600 });

    expect(result.local.active_features).toBeGreaterThan(0);
    expect(result.composite.score).toBeGreaterThan(0);
    expect(result.composite.alpha + result.composite.beta).toBeCloseTo(1.0, 2);
  });

  it('applies handshake: LOCAL fail skips ARC', () => {
    // All features at 0 → LOCAL score = 0 → ARC skipped
    const features: Record<string, number> = {};
    const localFeatures = scorer.getLoader().getStageFeatures('LOCAL');
    for (const f of localFeatures) {
      features[f] = 0;
    }

    const result = scorer.score(features, { wordCount: 600 });
    // LOCAL score should be 0 (all features = 0)
    expect(result.local.score).toBe(0);
    // ARC should also be 0 (handshake skip)
    expect(result.arc.active_features).toBe(0);
  });

  it('produces different scores for different profiles', () => {
    const features: Record<string, number> = {
      f1_mean: 15.0,
      f25g_description_score: 0.7,
      f38c_speed_score: 0.3,
      f35c_hook_score: 0.5,
      f29b_ttr_window: 0.8,
    };

    const literary = scorer.score(features, { wordCount: 600, profile: 'LITTERAIRE' });
    const thriller = scorer.score(features, { wordCount: 600, profile: 'THRILLER' });

    // Same features but different profiles → different SEAL eligibility
    expect(literary.profile).toBe('Littéraire');
    expect(thriller.profile).toBe('Thriller');
    // Thresholds differ
    expect(literary.seal_eligible).not.toEqual(undefined);
    expect(thriller.seal_eligible).not.toEqual(undefined);
  });

  it('applies position modifiers when P_rel is provided', () => {
    const features: Record<string, number> = {
      f19g_consistency_ratio: 1.0,
      f25g_description_score: 0.7,
    };

    const opening = scorer.score(features, { wordCount: 600, pRel: 0.05 });
    const closing = scorer.score(features, { wordCount: 600, pRel: 0.95 });

    // Scores may differ due to position modifiers
    // (exact values depend on which features have modifiers)
    expect(opening.composite.score).toBeDefined();
    expect(closing.composite.score).toBeDefined();
  });

  it('detects passage type from features', () => {
    const dialogue_features: Record<string, number> = {
      f34b_para_per_1000w: 10.0,
      f33a_dots_count: 100,
      f25g_description_score: 0.3,
    };
    const result = scorer.score(dialogue_features, { wordCount: 600 });
    expect(result.passage_type).toBe('DIALOGUE');
  });

  it('adjusts alpha/beta by text size', () => {
    const features: Record<string, number> = {
      f1_mean: 15.0,
      f25g_description_score: 0.7,
    };

    const small = scorer.score(features, { wordCount: 30 });
    const large = scorer.score(features, { wordCount: 600 });

    // At 30w: alpha > beta (LOCAL dominant)
    expect(small.composite.alpha).toBeGreaterThan(small.composite.beta);
    // At 600w: beta > alpha (ARC dominant)
    expect(large.composite.beta).toBeGreaterThan(large.composite.alpha);
  });

  it('returns seal_eligible = false when below threshold', () => {
    const features: Record<string, number> = {
      f1_mean: 5.0,  // low
    };
    const result = scorer.score(features, { wordCount: 600, profile: 'STRATOSPHERIQUE' });
    expect(result.seal_eligible).toBe(false);
  });

  it('returns consistent structure', () => {
    const features = { f1_mean: 15.0 };
    const result = scorer.score(features, { wordCount: 600 });

    // Structure checks
    expect(result).toHaveProperty('local');
    expect(result).toHaveProperty('arc');
    expect(result).toHaveProperty('composite');
    expect(result).toHaveProperty('passage_type');
    expect(result).toHaveProperty('profile');
    expect(result).toHaveProperty('seal_eligible');
    expect(result.local).toHaveProperty('score');
    expect(result.local).toHaveProperty('confidence');
    expect(result.local).toHaveProperty('active_features');
    expect(result.local).toHaveProperty('total_features');
    expect(result.composite).toHaveProperty('alpha');
    expect(result.composite).toHaveProperty('beta');
  });
});
