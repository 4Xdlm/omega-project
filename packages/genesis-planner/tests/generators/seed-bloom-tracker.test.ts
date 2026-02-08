import { describe, it, expect } from 'vitest';
import { createSeedBloomTracker, autoGenerateSeeds } from '../../src/generators/seed-bloom-tracker.js';
import { createDefaultConfig, resolveConfigRef } from '../../src/config.js';
import { createGenesisPlan } from '../../src/planner.js';
import {
  TIMESTAMP, SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
  SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
} from '../fixtures.js';
import type { Scene } from '../../src/types.js';

const config = createDefaultConfig();

function makeScenes(count: number): Scene[] {
  return Array.from({ length: count }, (_, i) => ({
    scene_id: `SCN-${i}`, arc_id: 'ARC-1', objective: 'test',
    conflict: 'conflict', conflict_type: 'internal' as const,
    emotion_target: 'fear', emotion_intensity: 0.5,
    seeds_planted: [], seeds_bloomed: [],
    subtext: { character_thinks: 'x', reader_knows: 'y', tension_type: 'suspense' as const, implied_emotion: 'z' },
    sensory_anchor: 'anchor', constraints: [], beats: [],
    target_word_count: 500, justification: 'test',
  }));
}

describe('Seed/Bloom Tracker', () => {
  it('should PASS when seed is planted and bloomed correctly', () => {
    const tracker = createSeedBloomTracker();
    const scenes = makeScenes(4);
    tracker.plantSeed({ id: 'S1', type: 'plot', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S2', type: 'character', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S3', type: 'thematic', description: 'test', planted_in: 'SCN-1' });
    tracker.bloomSeed('S1', 'SCN-1');
    tracker.bloomSeed('S2', 'SCN-2');
    tracker.bloomSeed('S3', 'SCN-3');
    const result = tracker.validate(scenes, config);
    expect(result.verdict).toBe('PASS');
  });

  it('should FAIL when seed has no bloom', () => {
    const tracker = createSeedBloomTracker();
    const scenes = makeScenes(4);
    tracker.plantSeed({ id: 'S1', type: 'plot', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S2', type: 'character', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S3', type: 'thematic', description: 'test', planted_in: 'SCN-1' });
    // S1 has no bloom
    tracker.bloomSeed('S2', 'SCN-2');
    tracker.bloomSeed('S3', 'SCN-3');
    const result = tracker.validate(scenes, config);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when bloom references non-existent scene', () => {
    const tracker = createSeedBloomTracker();
    const scenes = makeScenes(3);
    tracker.plantSeed({ id: 'S1', type: 'plot', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S2', type: 'character', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S3', type: 'thematic', description: 'test', planted_in: 'SCN-1' });
    tracker.bloomSeed('S1', 'SCN-99');
    tracker.bloomSeed('S2', 'SCN-1');
    tracker.bloomSeed('S3', 'SCN-2');
    const result = tracker.validate(scenes, config);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when seed-bloom distance exceeds max', () => {
    const scenes = makeScenes(10);
    const tracker = createSeedBloomTracker();
    tracker.plantSeed({ id: 'S1', type: 'plot', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S2', type: 'character', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S3', type: 'thematic', description: 'test', planted_in: 'SCN-0' });
    // Distance = 9/9 = 1.0 > 0.7
    tracker.bloomSeed('S1', 'SCN-9');
    tracker.bloomSeed('S2', 'SCN-1');
    tracker.bloomSeed('S3', 'SCN-2');
    const result = tracker.validate(scenes, config);
    expect(result.verdict).toBe('FAIL');
  });

  it('should PASS when distance equals max', () => {
    const scenes = makeScenes(10);
    const tracker = createSeedBloomTracker();
    const maxDist = resolveConfigRef(config, 'CONFIG:SEED_BLOOM_MAX_DISTANCE');
    const maxIdx = Math.floor(maxDist * 9);
    tracker.plantSeed({ id: 'S1', type: 'plot', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S2', type: 'character', description: 'test', planted_in: 'SCN-0' });
    tracker.plantSeed({ id: 'S3', type: 'thematic', description: 'test', planted_in: 'SCN-1' });
    tracker.bloomSeed('S1', `SCN-${maxIdx}`);
    tracker.bloomSeed('S2', 'SCN-1');
    tracker.bloomSeed('S3', 'SCN-2');
    const result = tracker.validate(scenes, config);
    expect(result.verdict).toBe('PASS');
  });

  it('should enforce minimum seeds count', () => {
    const tracker = createSeedBloomTracker();
    const scenes = makeScenes(3);
    tracker.plantSeed({ id: 'S1', type: 'plot', description: 'test', planted_in: 'SCN-0' });
    tracker.bloomSeed('S1', 'SCN-1');
    const result = tracker.validate(scenes, config);
    expect(result.verdict).toBe('FAIL');
  });

  it('should verify bidirectional references', () => {
    const tracker = createSeedBloomTracker();
    tracker.plantSeed({ id: 'S1', type: 'plot', description: 'test', planted_in: 'SCN-0' });
    tracker.bloomSeed('S1', 'SCN-1');
    expect(tracker.getBloomForSeed('S1')).toBe('SCN-1');
    expect(tracker.getSeedForBloom('SCN-1')?.id).toBe('S1');
  });

  it('should be deterministic via autoGenerateSeeds', () => {
    const { plan: plan1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const { plan: plan2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(plan1.seed_registry).toEqual(plan2.seed_registry);
  });
});
