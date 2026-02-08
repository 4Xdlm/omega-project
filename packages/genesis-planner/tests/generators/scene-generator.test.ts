import { describe, it, expect } from 'vitest';
import { generateScenes } from '../../src/generators/scene-generator.js';
import { generateArcs } from '../../src/generators/arc-generator.js';
import { SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION, SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_EMOTION } from '../fixtures.js';

describe('Scene Generator', () => {
  it('should assign a conflict to every scene', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    for (let i = 0; i < arcs.length; i++) {
      const scenes = generateScenes(arcs[i], i, arcs.length, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
      for (const scene of scenes) {
        expect(scene.conflict).toBeTruthy();
        expect(scene.conflict_type).toBeTruthy();
      }
    }
  });

  it('should respect min/max scene constraints', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    let totalScenes = 0;
    for (let i = 0; i < arcs.length; i++) {
      const scenes = generateScenes(arcs[i], i, arcs.length, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
      totalScenes += scenes.length;
    }
    expect(totalScenes).toBeGreaterThanOrEqual(SCENARIO_A_CONSTRAINTS.min_scenes);
    expect(totalScenes).toBeLessThanOrEqual(SCENARIO_A_CONSTRAINTS.max_scenes);
  });

  it('should set objective on every scene', () => {
    const arcs = generateArcs(SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS);
    const scenes = generateScenes(arcs[0], 0, 1, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_EMOTION);
    for (const scene of scenes) {
      expect(scene.objective).toBeTruthy();
    }
  });

  it('should set emotion_target on every scene', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    const scenes = generateScenes(arcs[0], 0, arcs.length, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    for (const scene of scenes) {
      expect(scene.emotion_target).toBeTruthy();
    }
  });

  it('should be deterministic', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    const scenes1 = generateScenes(arcs[0], 0, arcs.length, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    const scenes2 = generateScenes(arcs[0], 0, arcs.length, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    expect(scenes1).toEqual(scenes2);
  });

  it('should include justification on every scene', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    const scenes = generateScenes(arcs[0], 0, arcs.length, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    for (const scene of scenes) {
      expect(scene.justification).toBeTruthy();
    }
  });
});
