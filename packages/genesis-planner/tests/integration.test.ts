import { describe, it, expect } from 'vitest';
import { createGenesisPlan } from '../src/planner.js';
import { createDefaultConfig } from '../src/config.js';
import { verifyEvidenceChain } from '../src/evidence.js';
import {
  TIMESTAMP,
  SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
  SCENARIO_C_INTENT, SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS, SCENARIO_C_GENOME, SCENARIO_C_EMOTION,
} from './fixtures.js';

const config = createDefaultConfig();

describe('Integration — Full Pipeline', () => {
  it('should produce PASS plan for scenario A (Le Gardien)', () => {
    const { plan, report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('PASS');
    expect(plan.arcs.length).toBeGreaterThan(0);
    expect(plan.scene_count).toBeGreaterThan(0);
    expect(plan.beat_count).toBeGreaterThan(0);
    expect(plan.seed_registry.length).toBeGreaterThan(0);
    expect(verifyEvidenceChain(report.evidence)).toBe(true);
  });

  it('should produce PASS plan for scenario B (Le Choix)', () => {
    const { plan, report } = createGenesisPlan(
      SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
      SCENARIO_B_GENOME, SCENARIO_B_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('PASS');
    expect(plan.arcs.length).toBe(1);
    expect(plan.scene_count).toBeGreaterThanOrEqual(SCENARIO_B_CONSTRAINTS.min_scenes);
  });

  it('should produce PASS plan for scenario C (Hostile)', () => {
    const { plan, report } = createGenesisPlan(
      SCENARIO_C_INTENT, SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS,
      SCENARIO_C_GENOME, SCENARIO_C_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('PASS');
    expect(plan.arcs.length).toBe(3);
    expect(plan.scene_count).toBeGreaterThanOrEqual(SCENARIO_C_CONSTRAINTS.min_scenes);
  });

  it('should produce usable plan structure', () => {
    const { plan } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    // All scenes have beats
    for (const arc of plan.arcs) {
      for (const scene of arc.scenes) {
        expect(scene.beats.length).toBeGreaterThan(0);
        expect(scene.conflict).toBeTruthy();
        expect(scene.subtext.character_thinks).toBeTruthy();
      }
    }
    // Tension curve matches scene count
    expect(plan.tension_curve.length).toBe(plan.scene_count);
    // Emotion trajectory matches scene count
    expect(plan.emotion_trajectory.length).toBe(plan.scene_count);
  });

  it('should complete pipeline in < 200ms', () => {
    const start = performance.now();
    createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
