import { describe, it, expect } from 'vitest';
import { buildTensionCurve, validateTensionCurve } from '../../src/generators/tension-builder.js';
import { createDefaultConfig } from '../../src/config.js';
import type { Scene, Beat } from '../../src/types.js';

const config = createDefaultConfig();

function makeSceneWithBeats(tensions: (1 | 0 | -1)[]): Scene {
  return {
    scene_id: 'SCN-T', arc_id: 'ARC-1', objective: 'test',
    conflict: 'conflict', conflict_type: 'internal',
    emotion_target: 'fear', emotion_intensity: 0.5,
    seeds_planted: [], seeds_bloomed: [],
    subtext: { character_thinks: 'x', reader_knows: 'y', tension_type: 'suspense', implied_emotion: 'z' },
    sensory_anchor: 'anchor', constraints: [],
    beats: tensions.map((td, i) => ({
      beat_id: `B-${i}`, action: 'a', intention: 'i', pivot: false,
      tension_delta: td, information_revealed: [], information_withheld: [],
    })),
    target_word_count: 500, justification: 'test',
  };
}

describe('Tension Builder', () => {
  it('should build curve from beat tension_deltas', () => {
    const scenes = [
      makeSceneWithBeats([1, 1]),
      makeSceneWithBeats([0, 1]),
      makeSceneWithBeats([1, 1]),
    ];
    const curve = buildTensionCurve(scenes);
    expect(curve).toEqual([2, 3, 5]);
  });

  it('should detect plateau violations', () => {
    const curve = [5, 5, 5, 5];
    const result = validateTensionCurve(curve, config);
    expect(result.verdict).toBe('FAIL');
    expect(result.plateaus).toBeGreaterThan(0);
  });

  it('should detect drop violations', () => {
    const curve = [10, 3];
    const result = validateTensionCurve(curve, config);
    expect(result.verdict).toBe('FAIL');
    expect(result.maxDrop).toBeGreaterThan(3);
  });

  it('should PASS for monotonically increasing trend', () => {
    const curve = [1, 2, 3, 5, 8];
    const result = validateTensionCurve(curve, config);
    expect(result.verdict).toBe('PASS');
  });

  it('should PASS for single scene', () => {
    const curve = [3];
    const result = validateTensionCurve(curve, config);
    expect(result.verdict).toBe('PASS');
  });

  it('should be deterministic', () => {
    const scenes = [makeSceneWithBeats([1, 0, 1]), makeSceneWithBeats([1, -1, 1])];
    const curve1 = buildTensionCurve(scenes);
    const curve2 = buildTensionCurve(scenes);
    expect(curve1).toEqual(curve2);
  });
});
