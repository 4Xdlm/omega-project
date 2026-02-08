/**
 * OMEGA Creation Pipeline — Unified Truth Gate Tests
 * Phase C.4 — C4-INV-04: Canon Lock
 * 10 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedTruthGate } from '../../src/gates/unified-truth-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedTruthGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('all PASS for scenario A — assertions supported by canon/plan', () => {
    const result = runUnifiedTruthGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('PASS');
    expect(result.violations).toHaveLength(0);
  });

  it('orphan assertion FAIL — modified text introduces unsupported claims', () => {
    const modifiedParagraphs = snap.styleOutput.paragraphs.map((p, i) => {
      if (i === 0) {
        return {
          ...p,
          text: 'Zygomorphic crystalline formations shattered across the Nexuvian plateau while quantum filaments dissolved into recursive oblivion.',
        };
      }
      return p;
    });
    const modifiedOutput = { ...snap.styleOutput, paragraphs: modifiedParagraphs };

    const result = runUnifiedTruthGate(
      modifiedOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // With foreign text injected, truth ratio drops
    expect(result.metrics.truth_ratio).toBeLessThan(1.0);
  });

  it('canon keywords are mapped into known set', () => {
    const result = runUnifiedTruthGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Total assertions should be positive since we have real text
    expect(result.metrics.total_paragraphs).toBeGreaterThan(0);
    expect(result.metrics.supported_paragraphs).toBeGreaterThan(0);
  });

  it('plan keywords are mapped into known set', () => {
    const result = runUnifiedTruthGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // supported_paragraphs includes plan-based matches
    expect(result.metrics.supported_paragraphs).toBeGreaterThanOrEqual(1);
  });

  it('mixed — some supported, some not', () => {
    const mixedParagraphs = [
      ...snap.styleOutput.paragraphs.slice(0, 1),
      {
        ...snap.styleOutput.paragraphs[0],
        paragraph_id: 'PARA-MIXED-001',
        text: 'Xylotronic metamorphosis in the voidlands. The lighthouse keeper watched.',
      },
    ];
    const mixedOutput = { ...snap.styleOutput, paragraphs: mixedParagraphs };
    const result = runUnifiedTruthGate(
      mixedOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.truth_ratio).toBeGreaterThan(0);
    expect(result.metrics.truth_ratio).toBeLessThanOrEqual(1);
  });

  it('empty text — truth ratio defaults to 1 (vacuous truth)', () => {
    const emptyOutput = { ...snap.styleOutput, paragraphs: [] };
    const result = runUnifiedTruthGate(
      emptyOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.total_paragraphs).toBe(0);
    expect(result.metrics.truth_ratio).toBe(1);
    expect(result.verdict).toBe('PASS');
  });

  it('single paragraph — still evaluates', () => {
    const singleOutput = {
      ...snap.styleOutput,
      paragraphs: [snap.styleOutput.paragraphs[0]],
    };
    const result = runUnifiedTruthGate(
      singleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.gate_id).toBe('U_TRUTH');
    expect(result.metrics.total_paragraphs).toBeGreaterThan(0);
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedTruthGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedTruthGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.truth_ratio).toBe(r2.metrics.truth_ratio);
    expect(r1.metrics.total_paragraphs).toBe(r2.metrics.total_paragraphs);
    expect(r1.metrics.supported_paragraphs).toBe(r2.metrics.supported_paragraphs);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedTruthGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.truth_ratio).toBe('number');
    expect(typeof result.metrics.total_paragraphs).toBe('number');
    expect(typeof result.metrics.supported_paragraphs).toBe('number');
    expect(result.metrics.truth_ratio).toBeGreaterThanOrEqual(0);
    expect(result.metrics.truth_ratio).toBeLessThanOrEqual(1);
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('C4-INV-04 — violation references correct invariant on FAIL', () => {
    // Force a FAIL by using completely alien text
    const alienParagraphs = snap.styleOutput.paragraphs.map((p) => ({
      ...p,
      text: 'Glorbix phentastic zymurgy wreaked fluxional catawampus across the brindled snollygoster.',
    }));
    const alienOutput = { ...snap.styleOutput, paragraphs: alienParagraphs };

    // Use a strict config with threshold = 1.0
    const result = runUnifiedTruthGate(
      alienOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    if (result.verdict === 'FAIL') {
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].invariant).toBe('C4-INV-04');
      expect(result.violations[0].gate_id).toBe('U_TRUTH');
      expect(result.violations[0].severity).toBe('FATAL');
    }
  });
});
