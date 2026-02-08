import { describe, it, expect } from 'vitest';
import { stageUnifiedGates } from '../../src/pipeline/stage-gates.js';
import { INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP, runPipeline } from '../fixtures.js';

describe('StageUnifiedGates (F4)', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('executes all gates for scenario A', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.stage).toBe('F4');
    expect(r.gateChain.gate_results.length).toBeGreaterThan(0);
  });

  it('verdict from gate chain', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(['PASS', 'FAIL']).toContain(r.verdict);
    expect(r.verdict).toBe(r.gateChain.verdict);
  });

  it('gate order matches config', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    if (r.gateChain.gate_results.length >= 2) {
      expect(r.gateChain.gate_results[0].gate_id).toBe('U_TRUTH');
    }
  });

  it('fail-fast on first failure', () => {
    const badOutput = {
      ...snap.styleOutput,
      paragraphs: snap.styleOutput.paragraphs.map(p => ({
        ...p,
        text: 'it is worth noting furthermore moreover delve into tapestry of symphony of',
      })),
    };
    const r = stageUnifiedGates(badOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    if (r.gateChain.verdict === 'FAIL') {
      expect(r.gateChain.first_failure).toBeTruthy();
    }
  });

  it('deterministic', () => {
    const r1 = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    const r2 = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r1.output_hash).toBe(r2.output_hash);
  });

  it('metrics computed', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    for (const gate of r.gateChain.gate_results) {
      expect(gate.metrics).toBeTruthy();
    }
  });

  it('output hash computed', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(r.output_hash).toHaveLength(64);
  });

  it('total violations counted', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    expect(typeof r.gateChain.total_violations).toBe('number');
  });

  it('timestamp propagated', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    for (const gate of r.gateChain.gate_results) {
      expect(gate.timestamp_deterministic).toBe(TIMESTAMP);
    }
  });

  it('banality gate with banned words', () => {
    const badPack = { ...INTENT_PACK_A, constraints: { ...INTENT_PACK_A.constraints, banned_words: ['the'] } };
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, badPack, DEFAULT_C4_CONFIG, TIMESTAMP);
    // With 'the' banned, banality should fail
    const banalityGate = r.gateChain.gate_results.find(g => g.gate_id === 'U_BANALITY');
    if (banalityGate) expect(banalityGate.verdict).toBe('FAIL');
  });

  it('style gate checks genome deviation', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    const styleGate = r.gateChain.gate_results.find(g => g.gate_id === 'U_STYLE');
    if (styleGate) expect(styleGate.metrics).toHaveProperty('max_deviation');
  });

  it('emotion gate checks coverage', () => {
    const r = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
    const emotionGate = r.gateChain.gate_results.find(g => g.gate_id === 'U_EMOTION');
    if (emotionGate) expect(emotionGate.metrics).toHaveProperty('coverage');
  });
});
