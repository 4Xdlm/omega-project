/**
 * OMEGA Creation Pipeline — Invariant Tests
 * Phase C.4 — C4-INV-01 through C4-INV-12
 */

import { describe, it, expect } from 'vitest';
import { runCreation } from '../src/engine.js';
import { verifyProofPack } from '../src/proof-pack.js';
import { verifyMerkleTree } from '../src/evidence/merkle-tree.js';
import { verifyE2EEvidenceChain } from '../src/evidence/evidence-chain.js';
import { generateFuzzedPacks } from '../src/adversarial/fuzz-generator.js';
import { runChaos } from '../src/adversarial/chaos-runner.js';
import {
  INTENT_PACK_A, INTENT_PACK_B,
  DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG,
  TIMESTAMP,
} from './fixtures.js';
import type { FuzzCategory } from '../src/types.js';

describe('Invariants', () => {
  const resultA = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);

  // C4-INV-01: E2E Determinism
  it('C4-INV-01: same IntentPack -> same output hash', () => {
    const r2 = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(resultA.output_hash).toBe(r2.output_hash);
  });

  // C4-INV-02: No Bypass
  it('C4-INV-02: all stages executed (no bypass)', () => {
    const stages = resultA.pipeline_trace.stages.map((s) => s.stage);
    expect(stages).toContain('F0');
    expect(stages).toContain('F1');
    expect(stages).toContain('F2');
    expect(stages).toContain('F3');
    expect(stages).toContain('F4');
  });

  it('C4-INV-02: unified gates must run', () => {
    expect(resultA.unified_gates.gate_results.length).toBeGreaterThan(0);
  });

  // C4-INV-03: Evidence Completeness
  it('C4-INV-03: every paragraph has trace', () => {
    expect(resultA.evidence.paragraph_traces.length).toBe(resultA.style_output.paragraphs.length);
  });

  it('C4-INV-03: proof path non-empty for all paragraphs', () => {
    for (const trace of resultA.evidence.paragraph_traces) {
      expect(trace.proof_path.length).toBeGreaterThan(0);
    }
  });

  // C4-INV-04: Canon Lock
  it('C4-INV-04: truth gate executed', () => {
    const truthGate = resultA.unified_gates.gate_results.find((g) => g.gate_id === 'U_TRUTH');
    expect(truthGate).toBeTruthy();
  });

  // C4-INV-05: Necessity E2E
  it('C4-INV-05: necessity gate executed', () => {
    const gate = resultA.unified_gates.gate_results.find((g) => g.gate_id === 'U_NECESSITY');
    expect(gate).toBeTruthy();
  });

  // C4-INV-06: Crossref Integrity
  it('C4-INV-06: crossref gate executed', () => {
    const gate = resultA.unified_gates.gate_results.find((g) => g.gate_id === 'U_CROSSREF');
    expect(gate).toBeTruthy();
  });

  // C4-INV-07: Fail-Closed
  it('C4-INV-07: FAIL validation -> entire output rejected', () => {
    const bad = { ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '' } };
    const result = runCreation(bad, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.final_text.paragraphs).toHaveLength(0);
  });

  it('C4-INV-07: verdict is binary', () => {
    expect(['PASS', 'FAIL']).toContain(resultA.verdict);
  });

  // C4-INV-08: Proof-Pack Integrity
  it('C4-INV-08: proof pack verifiable', () => {
    const verification = verifyProofPack(resultA.proof_pack);
    expect(verification.merkle_valid).toBe(true);
    expect(verification.files_failed).toBe(0);
  });

  it('C4-INV-08: merkle tree valid', () => {
    expect(verifyMerkleTree(resultA.evidence.merkle_tree)).toBe(true);
  });

  // C4-INV-09: Input Schema
  it('C4-INV-09: valid input PASS, invalid FAIL', () => {
    expect(resultA.pipeline_trace.stages[0].verdict).toBe('PASS');
    const bad = { ...INTENT_PACK_A, emotion: { ...INTENT_PACK_A.emotion, waypoints: [] } };
    const badResult = runCreation(bad, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(badResult.verdict).toBe('FAIL');
  });

  // C4-INV-10: Pipeline Replay
  it('C4-INV-10: replay produces same hash', () => {
    const r2 = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(resultA.genesis_plan.plan_hash).toBe(r2.genesis_plan.plan_hash);
    expect(resultA.scribe_output.output_hash).toBe(r2.scribe_output.output_hash);
    expect(resultA.style_output.output_hash).toBe(r2.style_output.output_hash);
  });

  // C4-INV-11: Adversarial Resilience
  it('C4-INV-11: adversarial fuzz -> graceful failures', () => {
    const categories: FuzzCategory[] = ['contradiction', 'ambiguity', 'impossible_constraints', 'empty_fields', 'overflow', 'type_mismatch', 'circular_reference', 'hostile_content'];
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, categories);
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(report.crash_count).toBe(0);
    expect(report.ungraceful_failures).toBe(0);
  });

  // C4-INV-12: Non-Actuation
  it('C4-INV-12: output is data-only', () => {
    // CreationResult contains only data fields, no side effects
    expect(typeof resultA.output_hash).toBe('string');
    expect(typeof resultA.verdict).toBe('string');
    expect(Array.isArray(resultA.evidence.paragraph_traces)).toBe(true);
    expect(typeof resultA.proof_pack.manifest.total_files).toBe('number');
  });

  it('C4-INV-12: evidence chain verifiable', () => {
    expect(verifyE2EEvidenceChain(resultA.evidence)).toBe(true);
  });
});
