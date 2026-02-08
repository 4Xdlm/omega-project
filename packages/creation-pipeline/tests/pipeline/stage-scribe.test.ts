import { describe, it, expect } from 'vitest';
import { stageScribe } from '../../src/pipeline/stage-scribe.js';
import { INTENT_PACK_A, INTENT_PACK_B, DEFAULT_S_CONFIG, TIMESTAMP, runPipeline } from '../fixtures.js';

describe('StageScribe (F2)', () => {
  const snapA = runPipeline(INTENT_PACK_A);
  const snapB = runPipeline(INTENT_PACK_B);

  it('PASS for scenario A', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
    expect(r.stage).toBe('F2');
  });

  it('PASS for scenario B', () => {
    const r = stageScribe(snapB.plan, INTENT_PACK_B, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
  });

  it('has paragraphs', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.scribeOutput.final_prose.paragraphs.length).toBeGreaterThan(0);
  });

  it('output_hash non-empty', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.scribeOutput.output_hash).toHaveLength(64);
  });

  it('report generated', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.scribeReport).toBeTruthy();
  });

  it('gate chain present', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.scribeOutput.gate_result).toBeTruthy();
  });

  it('rewrite history present', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.scribeOutput.rewrite_history).toBeTruthy();
  });

  it('deterministic', () => {
    const r1 = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    const r2 = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r1.scribeOutput.output_hash).toBe(r2.scribeOutput.output_hash);
  });

  it('input hash from plan', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.input_hash).toBe(snapA.plan.plan_hash);
  });

  it('details includes word count', () => {
    const r = stageScribe(snapA.plan, INTENT_PACK_A, DEFAULT_S_CONFIG, TIMESTAMP);
    expect(r.details).toContain('paragraphs');
  });
});
