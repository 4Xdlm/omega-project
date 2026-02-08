import { describe, it, expect } from 'vitest';
import { generateBeats } from '../../src/generators/beat-generator.js';
import { createDefaultConfig, resolveConfigRef } from '../../src/config.js';
import type { Scene, SubtextLayer } from '../../src/types.js';

const config = createDefaultConfig();
const minBeats = resolveConfigRef(config, 'CONFIG:MIN_BEATS_PER_SCENE');
const maxBeats = resolveConfigRef(config, 'CONFIG:MAX_BEATS_PER_SCENE');

function makeScene(id: string): Scene {
  return {
    scene_id: id, arc_id: 'ARC-1', objective: 'test',
    conflict: 'test conflict', conflict_type: 'internal',
    emotion_target: 'fear', emotion_intensity: 0.5,
    seeds_planted: [], seeds_bloomed: [],
    subtext: { character_thinks: 'x', reader_knows: 'y', tension_type: 'suspense', implied_emotion: 'z' },
    sensory_anchor: 'anchor', constraints: [],
    beats: [], target_word_count: 500, justification: 'test',
  };
}

describe('Beat Generator', () => {
  it('should generate beats within [min, max] bounds', () => {
    const scene = makeScene('SCN-001');
    const beats = generateBeats(scene, 0, config);
    expect(beats.length).toBeGreaterThanOrEqual(minBeats);
    expect(beats.length).toBeLessThanOrEqual(maxBeats);
  });

  it('should set action and intention on every beat', () => {
    const scene = makeScene('SCN-002');
    const beats = generateBeats(scene, 0, config);
    for (const beat of beats) {
      expect(beat.action).toBeTruthy();
      expect(beat.intention).toBeTruthy();
    }
  });

  it('should set pivot=true on at least one beat when ≥4 beats', () => {
    // Generate many scenes to find one with ≥4 beats
    let foundPivot = false;
    for (let i = 0; i < 20; i++) {
      const scene = makeScene(`SCN-PIVOT-${i}`);
      const beats = generateBeats(scene, i, config);
      if (beats.length >= 4) {
        const hasPivot = beats.some((b) => b.pivot);
        expect(hasPivot).toBe(true);
        foundPivot = true;
        break;
      }
    }
    expect(foundPivot).toBe(true);
  });

  it('should have information_revealed on at least 1 beat', () => {
    const scene = makeScene('SCN-INFO');
    const beats = generateBeats(scene, 0, config);
    const hasInfo = beats.some((b) => b.information_revealed.length > 0);
    expect(hasInfo).toBe(true);
  });

  it('should be deterministic', () => {
    const scene = makeScene('SCN-DET');
    const beats1 = generateBeats(scene, 0, config);
    const beats2 = generateBeats(scene, 0, config);
    expect(beats1).toEqual(beats2);
  });

  it('should generate different beats for different scenes', () => {
    const s1 = makeScene('SCN-DIFF-1');
    const s2 = makeScene('SCN-DIFF-2');
    const b1 = generateBeats(s1, 0, config);
    const b2 = generateBeats(s2, 1, config);
    expect(b1[0].beat_id).not.toBe(b2[0].beat_id);
  });
});
