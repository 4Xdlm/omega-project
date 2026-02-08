/**
 * OMEGA Creation Pipeline — Determinism Tests
 * Phase C.4 — C4-INV-01: Same IntentPack -> same everything
 */

import { describe, it, expect } from 'vitest';
import { runCreation } from '../src/engine.js';
import {
  INTENT_PACK_A, INTENT_PACK_B, INTENT_PACK_C,
  DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG,
  TIMESTAMP,
} from './fixtures.js';

describe('Determinism', () => {
  const run1A = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
  const run2A = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);

  it('scenario A: same output_hash', () => {
    expect(run1A.output_hash).toBe(run2A.output_hash);
  });

  it('scenario A: same proof_root', () => {
    expect(run1A.proof_pack.root_hash).toBe(run2A.proof_pack.root_hash);
  });

  it('scenario A: same evidence_hash', () => {
    expect(run1A.evidence.chain_hash).toBe(run2A.evidence.chain_hash);
  });

  it('scenario A: same report verdict', () => {
    expect(run1A.report.verdict).toBe(run2A.report.verdict);
  });

  it('scenario B: same output_hash', () => {
    const r1 = runCreation(INTENT_PACK_B, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const r2 = runCreation(INTENT_PACK_B, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r1.output_hash).toBe(r2.output_hash);
  });

  it('scenario C: same output_hash', () => {
    const r1 = runCreation(INTENT_PACK_C, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const r2 = runCreation(INTENT_PACK_C, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r1.output_hash).toBe(r2.output_hash);
  });

  it('merkle tree same', () => {
    expect(run1A.evidence.merkle_tree.root_hash).toBe(run2A.evidence.merkle_tree.root_hash);
  });

  it('pipeline_trace same stages', () => {
    expect(run1A.pipeline_trace.total_stages).toBe(run2A.pipeline_trace.total_stages);
    expect(run1A.pipeline_trace.passed_stages).toBe(run2A.pipeline_trace.passed_stages);
  });

  it('config_hash same', () => {
    expect(run1A.report.config_hash).toBe(run2A.report.config_hash);
  });

  it('gate_results same', () => {
    expect(run1A.unified_gates.gate_results.length).toBe(run2A.unified_gates.gate_results.length);
    for (let i = 0; i < run1A.unified_gates.gate_results.length; i++) {
      expect(run1A.unified_gates.gate_results[i].verdict).toBe(run2A.unified_gates.gate_results[i].verdict);
    }
  });

  it('metrics same', () => {
    expect(run1A.report.metrics.total_words).toBe(run2A.report.metrics.total_words);
    expect(run1A.report.metrics.total_paragraphs).toBe(run2A.report.metrics.total_paragraphs);
  });

  it('intent_hash same', () => {
    expect(run1A.intent_hash).toBe(run2A.intent_hash);
  });
});
