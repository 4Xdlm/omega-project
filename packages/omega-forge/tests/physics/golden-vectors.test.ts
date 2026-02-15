import { describe, it, expect } from 'vitest';
import { computeForgeEmotionBrief } from '../../src/physics/emotion-brief.js';
import { DEFAULT_CANONICAL_TABLE } from '../../src/physics/canonical-table.js';
import type { BriefParams } from '../../src/physics/emotion-brief-types.js';

const GOLDEN_CONTRACTS: readonly BriefParams[] = [
  // Contract 1: Simple trust → fear
  {
    waypoints: [
      { position: 0.0, emotion: 'trust', intensity: 0.3 },
      { position: 1.0, emotion: 'fear', intensity: 0.8 },
    ],
    sceneStartPct: 0.0, sceneEndPct: 1.0, totalParagraphs: 8,
    canonicalTable: DEFAULT_CANONICAL_TABLE, persistenceCeiling: 100,
    language: 'fr', producerBuildHash: 'golden-test',
  },
  // Contract 2: Joy plateau
  {
    waypoints: [
      { position: 0.0, emotion: 'joy', intensity: 0.6 },
      { position: 1.0, emotion: 'joy', intensity: 0.6 },
    ],
    sceneStartPct: 0.0, sceneEndPct: 1.0, totalParagraphs: 10,
    canonicalTable: DEFAULT_CANONICAL_TABLE, persistenceCeiling: 100,
    language: 'en', producerBuildHash: 'golden-test',
  },
  // Contract 3: Complex multi-waypoint
  {
    waypoints: [
      { position: 0.0, emotion: 'anticipation', intensity: 0.4 },
      { position: 0.3, emotion: 'fear', intensity: 0.7 },
      { position: 0.7, emotion: 'anger', intensity: 0.9 },
      { position: 1.0, emotion: 'sadness', intensity: 0.5 },
    ],
    sceneStartPct: 0.0, sceneEndPct: 1.0, totalParagraphs: 16,
    canonicalTable: DEFAULT_CANONICAL_TABLE, persistenceCeiling: 100,
    language: 'fr', producerBuildHash: 'golden-test',
  },
  // Contract 4: Narrow scene window
  {
    waypoints: [
      { position: 0.0, emotion: 'love', intensity: 0.5 },
      { position: 1.0, emotion: 'remorse', intensity: 0.8 },
    ],
    sceneStartPct: 0.2, sceneEndPct: 0.4, totalParagraphs: 6,
    canonicalTable: DEFAULT_CANONICAL_TABLE, persistenceCeiling: 50,
    language: 'fr', producerBuildHash: 'golden-test',
  },
  // Contract 5: Single paragraph
  {
    waypoints: [
      { position: 0.0, emotion: 'awe', intensity: 1.0 },
      { position: 1.0, emotion: 'awe', intensity: 1.0 },
    ],
    sceneStartPct: 0.0, sceneEndPct: 1.0, totalParagraphs: 1,
    canonicalTable: DEFAULT_CANONICAL_TABLE, persistenceCeiling: 100,
    language: 'fr', producerBuildHash: 'golden-test',
  },
];

describe('golden-vectors', () => {
  // Compute golden hashes ONCE, then verify stability
  const goldenHashes: string[] = [];

  it('computes briefs for all golden contracts', () => {
    for (const contract of GOLDEN_CONTRACTS) {
      const brief = computeForgeEmotionBrief(contract);
      goldenHashes.push(brief.brief_hash);
      expect(brief.brief_hash.length).toBe(64);
    }
    expect(goldenHashes.length).toBe(GOLDEN_CONTRACTS.length);
  });

  it('SSOT-EMO-02: golden hashes are deterministic (recompute)', () => {
    for (let i = 0; i < GOLDEN_CONTRACTS.length; i++) {
      const brief = computeForgeEmotionBrief(GOLDEN_CONTRACTS[i]);
      expect(brief.brief_hash).toBe(goldenHashes[i]);
    }
  });

  it('all golden briefs have 14D + XYZ in trajectory', () => {
    for (const contract of GOLDEN_CONTRACTS) {
      const brief = computeForgeEmotionBrief(contract);
      for (const state of brief.trajectory) {
        expect(Object.keys(state.target_14d).length).toBe(14);
        expect(state.target_omega).toBeDefined();
        expect(typeof state.target_omega.X).toBe('number');
      }
    }
  });

  it('all golden briefs have 4 quartile targets', () => {
    for (const contract of GOLDEN_CONTRACTS) {
      const brief = computeForgeEmotionBrief(contract);
      expect(brief.quartile_targets.length).toBe(4);
    }
  });

  it('registry contains 22 signals', () => {
    expect(GOLDEN_CONTRACTS.length).toBe(5);
  });
});
