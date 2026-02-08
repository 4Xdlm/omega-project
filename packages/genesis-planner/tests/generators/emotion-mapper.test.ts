import { describe, it, expect } from 'vitest';
import { mapEmotions, validateEmotionCoverage } from '../../src/generators/emotion-mapper.js';
import { createDefaultConfig } from '../../src/config.js';
import { SCENARIO_A_EMOTION } from '../fixtures.js';
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

describe('Emotion Mapper', () => {
  it('should achieve 100% coverage', () => {
    const scenes = makeScenes(5);
    const trajectory = mapEmotions(scenes, SCENARIO_A_EMOTION);
    expect(trajectory.length).toBe(5);
    const result = validateEmotionCoverage(trajectory, 5, config);
    expect(result.verdict).toBe('PASS');
    expect(result.coveragePercent).toBe(1);
  });

  it('should respect waypoint emotions', () => {
    const scenes = makeScenes(5);
    const trajectory = mapEmotions(scenes, SCENARIO_A_EMOTION);
    expect(trajectory[0].emotion).toBe('trust');
    expect(trajectory[trajectory.length - 1].emotion).toBe('sadness');
  });

  it('should FAIL when trajectory has gaps', () => {
    const result = validateEmotionCoverage(
      [{ position: 0, emotion: 'fear', intensity: 0.5 }],
      3,
      config,
    );
    expect(result.verdict).toBe('FAIL');
  });

  it('should interpolate between waypoints', () => {
    const scenes = makeScenes(3);
    const target = {
      arc_emotion: 'fear',
      waypoints: [
        { position: 0.0, emotion: 'joy', intensity: 0.2 },
        { position: 1.0, emotion: 'sadness', intensity: 0.8 },
      ],
      climax_position: 0.8,
      resolution_emotion: 'sadness',
    };
    const trajectory = mapEmotions(scenes, target);
    expect(trajectory[1].intensity).toBeGreaterThan(0.2);
    expect(trajectory[1].intensity).toBeLessThan(0.8);
  });

  it('should be deterministic', () => {
    const scenes = makeScenes(4);
    const t1 = mapEmotions(scenes, SCENARIO_A_EMOTION);
    const t2 = mapEmotions(scenes, SCENARIO_A_EMOTION);
    expect(t1).toEqual(t2);
  });

  it('should place climax emotion near climax position', () => {
    const scenes = makeScenes(10);
    const trajectory = mapEmotions(scenes, SCENARIO_A_EMOTION);
    const climaxIdx = Math.round(SCENARIO_A_EMOTION.climax_position * (scenes.length - 1));
    expect(trajectory[climaxIdx].emotion).toBe('fear');
  });
});
