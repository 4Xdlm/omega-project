import { describe, it, expect } from 'vitest';
import { computeForgeEmotionBrief } from '../../src/physics/emotion-brief.js';
import { DEFAULT_CANONICAL_TABLE } from '../../src/physics/canonical-table.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

const BRIEF_PARAMS = {
  waypoints: [
    { position: 0.0, emotion: 'trust', intensity: 0.3 },
    { position: 0.5, emotion: 'fear', intensity: 0.8 },
    { position: 1.0, emotion: 'sadness', intensity: 0.5 },
  ],
  sceneStartPct: 0.0,
  sceneEndPct: 1.0,
  totalParagraphs: 12,
  canonicalTable: DEFAULT_CANONICAL_TABLE,
  persistenceCeiling: 100,
  language: 'fr' as const,
  producerBuildHash: 'test-build-hash',
};

describe('ForgeEmotionBrief', () => {
  it('produces a valid brief with all fields', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    expect(brief.schema_version).toBe('forge.emotion.v1');
    expect(brief.producer).toBe('omega-forge');
    expect(brief.persistence_ceiling).toBe(100);
    expect(brief.language).toBe('fr');
    expect(brief.trajectory.length).toBe(12);
    expect(brief.quartile_targets.length).toBe(4);
    expect(brief.capabilities.length).toBeGreaterThan(0);
  });

  // BRIEF-01: hash is stable
  it('BRIEF-01: brief_hash is deterministic', () => {
    const brief1 = computeForgeEmotionBrief(BRIEF_PARAMS);
    const brief2 = computeForgeEmotionBrief(BRIEF_PARAMS);
    expect(brief1.brief_hash).toBe(brief2.brief_hash);
    expect(brief1.brief_hash.length).toBe(64);
  });

  // BRIEF-01: hash matches recomputation
  it('BRIEF-01: brief_hash matches manual recomputation', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    const { brief_hash: _, ...hashable } = brief;
    const expected = sha256(canonicalize(hashable));
    expect(brief.brief_hash).toBe(expected);
  });

  // BRIEF-02: capabilities match actual content
  it('BRIEF-02: capabilities reflect actual data', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    expect(brief.capabilities).toContain('emotion.trajectory.prescribed.14d');
    expect(brief.capabilities).toContain('emotion.trajectory.prescribed.xyz');
    expect(brief.capabilities).toContain('emotion.physics_profile');
  });

  // BRIEF-03: schema_version is set
  it('BRIEF-03: schema_version is forge.emotion.v1', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    expect(brief.schema_version).toBe('forge.emotion.v1');
  });

  // Trajectory has 14D AND XYZ
  it('trajectory includes target_14d AND target_omega', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    for (const state of brief.trajectory) {
      expect(state.target_14d).toBeDefined();
      expect(state.target_omega).toBeDefined();
      expect(typeof state.target_omega.X).toBe('number');
      expect(typeof state.target_omega.Y).toBe('number');
      expect(typeof state.target_omega.Z).toBe('number');
    }
  });

  // Physics profiles exist for active emotions
  it('physics_profiles covers active emotions', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    expect(brief.physics_profiles.length).toBeGreaterThan(0);
    for (const p of brief.physics_profiles) {
      expect(p.mass).toBeGreaterThan(0);
      expect(p.behavior_fr.length).toBeGreaterThan(0);
    }
  });

  // FAIL-CLOSED: persistenceCeiling <= 0
  it('throws if persistenceCeiling <= 0', () => {
    expect(() => computeForgeEmotionBrief({ ...BRIEF_PARAMS, persistenceCeiling: 0 }))
      .toThrow('GATE-1');
  });

  // FAIL-CLOSED: invalid language
  it('throws if language is invalid', () => {
    expect(() => computeForgeEmotionBrief({ ...BRIEF_PARAMS, language: 'auto' as any }))
      .toThrow('GATE-1');
  });

  // Transition map between quartiles
  it('transition_map has 3 entries (Q1→Q2, Q2→Q3, Q3→Q4)', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    expect(brief.transition_map.length).toBe(3);
  });

  // Energy budget computed
  it('energy_budget is computed', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    expect(brief.energy_budget.total_in).toBeGreaterThanOrEqual(0);
    expect(brief.energy_budget.total_out).toBeGreaterThanOrEqual(0);
  });
});
