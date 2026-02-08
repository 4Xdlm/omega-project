import { describe, it, expect } from 'vitest';
import { stageGenesis } from '../../src/pipeline/stage-genesis.js';
import { hashIntentPack } from '../../src/intent-pack.js';
import { INTENT_PACK_A, INTENT_PACK_B, DEFAULT_G_CONFIG, TIMESTAMP } from '../fixtures.js';

describe('StageGenesis (F1)', () => {
  it('PASS for scenario A', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
    expect(r.stage).toBe('F1');
  });

  it('PASS for scenario B', () => {
    const h = hashIntentPack(INTENT_PACK_B);
    const r = stageGenesis(INTENT_PACK_B, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
  });

  it('plan has arcs', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.plan.arcs.length).toBeGreaterThan(0);
  });

  it('plan_hash non-empty', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.plan.plan_hash).toHaveLength(64);
  });

  it('report generated', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.genesisReport).toBeTruthy();
  });

  it('stage result complete', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.input_hash).toBe(h);
    expect(r.output_hash).toHaveLength(64);
  });

  it('input_hash matches', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.input_hash).toBe(h);
  });

  it('deterministic', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r1 = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    const r2 = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r1.plan.plan_hash).toBe(r2.plan.plan_hash);
  });

  it('scene count > 0', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.plan.scene_count).toBeGreaterThan(0);
  });

  it('details describes plan', () => {
    const h = hashIntentPack(INTENT_PACK_A);
    const r = stageGenesis(INTENT_PACK_A, h, DEFAULT_G_CONFIG, TIMESTAMP);
    expect(r.details).toContain('arcs');
  });
});
