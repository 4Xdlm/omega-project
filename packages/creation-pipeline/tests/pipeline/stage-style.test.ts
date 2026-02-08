import { describe, it, expect } from 'vitest';
import { stageStyle } from '../../src/pipeline/stage-style.js';
import { INTENT_PACK_A, INTENT_PACK_B, DEFAULT_E_CONFIG, TIMESTAMP, runPipeline } from '../fixtures.js';

describe('StageStyle (F3)', () => {
  const snapA = runPipeline(INTENT_PACK_A);
  const snapB = runPipeline(INTENT_PACK_B);

  it('PASS for scenario A', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
    expect(r.stage).toBe('F3');
  });

  it('PASS for scenario B', () => {
    const r = stageStyle(snapB.scribeOutput, INTENT_PACK_B, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
  });

  it('has styled paragraphs', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.styleOutput.paragraphs.length).toBeGreaterThan(0);
  });

  it('tournament executed', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.styleOutput.tournament.total_rounds).toBeGreaterThan(0);
  });

  it('global profile computed', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.styleOutput.global_profile).toBeTruthy();
  });

  it('IA detection present', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.styleOutput.ia_detection).toBeTruthy();
  });

  it('genre detection present', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.styleOutput.genre_detection).toBeTruthy();
  });

  it('deterministic', () => {
    const r1 = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    const r2 = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r1.styleOutput.output_hash).toBe(r2.styleOutput.output_hash);
  });

  it('input hash from scribe', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.input_hash).toBe(snapA.scribeOutput.output_hash);
  });

  it('report generated', () => {
    const r = stageStyle(snapA.scribeOutput, INTENT_PACK_A, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r.styleReport).toBeTruthy();
  });
});
