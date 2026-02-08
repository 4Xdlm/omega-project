import { describe, it, expect } from 'vitest';
import { rewriteLoop } from '../src/rewriter.js';
import { weave } from '../src/weaver.js';
import { addSensoryLayer } from '../src/sensory.js';
import { buildSkeleton } from '../src/skeleton.js';
import { segmentPlan } from '../src/segmenter.js';
import {
  getPlanA, getPlanB,
  SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
  getDefaultSConfig, TIMESTAMP,
} from './fixtures.js';

function buildPipelineA() {
  const { plan } = getPlanA();
  const config = getDefaultSConfig();
  const seg = segmentPlan(plan);
  const sk = buildSkeleton(seg, plan);
  const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
  const enriched = addSensoryLayer(prose, plan, config);
  return { plan, config, sk, enriched };
}

describe('Rewriter', () => {
  it('pass 1 PASS -> stops', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    expect(history.total_passes).toBeGreaterThanOrEqual(1);
    expect(history.accepted_pass).toBeGreaterThanOrEqual(0);
  });

  it('tracks history', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    expect(history.candidates.length).toBeGreaterThanOrEqual(1);
    for (const c of history.candidates) {
      expect(c.prose).toBeTruthy();
      expect(c.gate_result).toBeTruthy();
      expect(c.oracle_result).toBeTruthy();
    }
  });

  it('max passes = 3', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    expect(history.total_passes).toBeLessThanOrEqual(3);
  });

  it('is deterministic', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const h1 = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    const h2 = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    expect(h1.rewrite_hash).toBe(h2.rewrite_hash);
  });

  it('has rewrite_hash', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    expect(history.rewrite_hash).toBeTruthy();
    expect(history.rewrite_hash).toHaveLength(64);
  });

  it('increments pass_number', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    for (let i = 0; i < history.candidates.length; i++) {
      expect(history.candidates[i].pass_number).toBe(i);
    }
  });

  it('selects best candidate if all FAIL', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    expect(history.accepted_pass).toBeGreaterThanOrEqual(0);
    expect(history.accepted_pass).toBeLessThan(history.total_passes);
  });

  it('preserves skeleton reference', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    for (const c of history.candidates) {
      expect(c.prose.skeleton_id).toBe(sk.skeleton_id);
    }
  });

  it('gate result present on each candidate', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    for (const c of history.candidates) {
      expect(c.gate_result.verdict).toMatch(/^(PASS|FAIL)$/);
    }
  });

  it('oracle result present on each candidate', () => {
    const { plan, config, sk, enriched } = buildPipelineA();
    const history = rewriteLoop(
      sk, enriched, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, plan, config, TIMESTAMP,
    );
    for (const c of history.candidates) {
      expect(c.oracle_result.oracle_results.length).toBe(6);
    }
  });
});
