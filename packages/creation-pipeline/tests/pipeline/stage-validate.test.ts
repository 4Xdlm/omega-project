import { describe, it, expect } from 'vitest';
import { stageValidate } from '../../src/pipeline/stage-validate.js';
import { INTENT_PACK_A, INTENT_PACK_B, DEFAULT_C4_CONFIG, TIMESTAMP } from '../fixtures.js';

describe('StageValidate (F0)', () => {
  it('PASS for valid pack A', () => {
    const r = stageValidate(INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
    expect(r.stage).toBe('F0');
  });

  it('PASS for valid pack B', () => {
    const r = stageValidate(INTENT_PACK_B, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
  });

  it('FAIL for empty intent title', () => {
    const bad = { ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '' } };
    const r = stageValidate(bad, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL for empty canon', () => {
    const bad = { ...INTENT_PACK_A, canon: { entries: [] } };
    const r = stageValidate(bad, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL for invalid genome burstiness', () => {
    const bad = { ...INTENT_PACK_A, genome: { ...INTENT_PACK_A.genome, target_burstiness: -1 } };
    const r = stageValidate(bad, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('FAIL');
  });

  it('computes input_hash on PASS', () => {
    const r = stageValidate(INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.input_hash).toHaveLength(64);
  });

  it('normalizes input', () => {
    const dirty = { ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '  Le  Gardien  ' } };
    const r = stageValidate(dirty, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
    expect(r.normalizedInput.intent.title).toBe('Le Gardien');
  });

  it('validation result included', () => {
    const r = stageValidate(INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.validation.valid).toBe(true);
  });

  it('deterministic', () => {
    const r1 = stageValidate(INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    const r2 = stageValidate(INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r1.input_hash).toBe(r2.input_hash);
    expect(r1.output_hash).toBe(r2.output_hash);
  });

  it('error details on FAIL', () => {
    const bad = { ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '', themes: [] } };
    const r = stageValidate(bad, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.details).toBeTruthy();
  });
});
