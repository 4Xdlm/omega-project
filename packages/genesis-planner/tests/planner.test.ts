import { describe, it, expect } from 'vitest';
import { createGenesisPlan } from '../src/planner.js';
import { createDefaultConfig } from '../src/config.js';
import { canonicalize, sha256 } from '@omega/canon-kernel';
import {
  TIMESTAMP,
  SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
} from './fixtures.js';

const config = createDefaultConfig();

describe('Planner — Orchestrator', () => {
  it('should produce PASS plan with valid inputs (scenario A)', () => {
    const { plan, report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('PASS');
    expect(plan.arcs.length).toBeGreaterThan(0);
  });

  it('should produce FAIL when input is invalid', () => {
    const badIntent = { ...SCENARIO_A_INTENT, title: '' };
    const { report } = createGenesisPlan(
      badIntent, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('FAIL');
  });

  it('should respect scene constraints', () => {
    const { plan } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(plan.scene_count).toBeGreaterThanOrEqual(SCENARIO_A_CONSTRAINTS.min_scenes);
    expect(plan.scene_count).toBeLessThanOrEqual(SCENARIO_A_CONSTRAINTS.max_scenes);
  });

  it('should hash all 5 inputs', () => {
    const { plan } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(plan.intent_hash).toBe(sha256(canonicalize(SCENARIO_A_INTENT)));
    expect(plan.canon_hash).toBe(sha256(canonicalize(SCENARIO_A_CANON)));
    expect(plan.constraints_hash).toBe(sha256(canonicalize(SCENARIO_A_CONSTRAINTS)));
    expect(plan.genome_hash).toBe(sha256(canonicalize(SCENARIO_A_GENOME)));
    expect(plan.emotion_hash).toBe(sha256(canonicalize(SCENARIO_A_EMOTION)));
  });

  it('should produce evidence chain', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.evidence.steps.length).toBeGreaterThan(0);
    expect(report.evidence.chain_hash).toBeTruthy();
  });

  it('should compute metrics', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.metrics.arc_count).toBeGreaterThan(0);
    expect(report.metrics.scene_count).toBeGreaterThan(0);
    expect(report.metrics.beat_count).toBeGreaterThan(0);
  });

  it('should compute plan_hash', () => {
    const { plan } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(plan.plan_hash).toBeTruthy();
    expect(plan.plan_hash.length).toBe(64);
  });

  it('should work with minimal scenario B', () => {
    const { plan, report } = createGenesisPlan(
      SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
      SCENARIO_B_GENOME, SCENARIO_B_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('PASS');
    expect(plan.arcs.length).toBe(1);
  });

  it('should FAIL when intent is null', () => {
    const { report } = createGenesisPlan(
      null as unknown as typeof SCENARIO_A_INTENT,
      SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('FAIL');
  });

  it('should FAIL when canon is null', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT,
      null as unknown as typeof SCENARIO_A_CANON,
      SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('FAIL');
  });
});
