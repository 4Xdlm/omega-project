import { describe, it, expect } from 'vitest';
import { modelSubtext, validateSubtext } from '../../src/generators/subtext-modeler.js';
import { SCENARIO_A_CANON } from '../fixtures.js';
import type { Scene } from '../../src/types.js';

function makeScenes(count: number): Scene[] {
  const types = ['internal', 'external', 'relational', 'societal', 'existential'] as const;
  return Array.from({ length: count }, (_, i) => ({
    scene_id: `SCN-${i}`, arc_id: 'ARC-1', objective: 'test',
    conflict: 'test conflict', conflict_type: types[i % types.length],
    emotion_target: 'fear', emotion_intensity: 0.5,
    seeds_planted: [], seeds_bloomed: [],
    subtext: { character_thinks: '__pending__', reader_knows: '__pending__', tension_type: 'suspense' as const, implied_emotion: '__pending__' },
    sensory_anchor: 'anchor', constraints: [], beats: [],
    target_word_count: 500, justification: 'test',
  }));
}

describe('Subtext Modeler', () => {
  it('should model subtext for all scenes', () => {
    const scenes = makeScenes(5);
    const result = modelSubtext(scenes, SCENARIO_A_CANON);
    expect(result.length).toBe(5);
    for (const scene of result) {
      expect(scene.subtext.character_thinks).not.toBe('__pending__');
    }
  });

  it('should set character_thinks to non-empty', () => {
    const scenes = makeScenes(3);
    const result = modelSubtext(scenes, SCENARIO_A_CANON);
    for (const scene of result) {
      expect(scene.subtext.character_thinks.trim().length).toBeGreaterThan(0);
    }
  });

  it('should assign valid tension_type', () => {
    const valid = ['dramatic_irony', 'suspense', 'hidden_motive', 'unspoken_desire', 'suppressed_emotion'];
    const scenes = makeScenes(5);
    const result = modelSubtext(scenes, SCENARIO_A_CANON);
    for (const scene of result) {
      expect(valid).toContain(scene.subtext.tension_type);
    }
  });

  it('should detect scenes without subtext', () => {
    const scenes = makeScenes(2);
    const result = validateSubtext(scenes);
    expect(result.verdict).toBe('FAIL');
    expect(result.missing.length).toBe(2);
  });

  it('should be deterministic', () => {
    const scenes = makeScenes(4);
    const r1 = modelSubtext(scenes, SCENARIO_A_CANON);
    const r2 = modelSubtext(scenes, SCENARIO_A_CANON);
    expect(r1).toEqual(r2);
  });

  it('should derive tension type from conflict type', () => {
    const scenes = makeScenes(5);
    const result = modelSubtext(scenes, SCENARIO_A_CANON);
    // internal → suppressed_emotion
    expect(result[0].subtext.tension_type).toBe('suppressed_emotion');
    // external → suspense
    expect(result[1].subtext.tension_type).toBe('suspense');
  });
});
