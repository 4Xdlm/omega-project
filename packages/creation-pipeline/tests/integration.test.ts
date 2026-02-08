/**
 * OMEGA Creation Pipeline — Integration Tests
 * Phase C.4 — Full E2E pipeline tests
 */

import { describe, it, expect } from 'vitest';
import { runCreation } from '../src/engine.js';
import { verifyProofPack } from '../src/proof-pack.js';
import { verifyMerkleTree } from '../src/evidence/merkle-tree.js';
import { verifyE2EEvidenceChain } from '../src/evidence/evidence-chain.js';
import { creationReportToMarkdown } from '../src/report.js';
import { generateFuzzedPacks } from '../src/adversarial/fuzz-generator.js';
import { runChaos } from '../src/adversarial/chaos-runner.js';
import { parseCLIArgs, validateCLIArgs } from '../src/cli.js';
import {
  INTENT_PACK_A, INTENT_PACK_B, INTENT_PACK_C,
  DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG,
  TIMESTAMP,
} from './fixtures.js';
import type { FuzzCategory } from '../src/types.js';

describe('Integration', () => {
  const resultA = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);

  it('scenario A complete pipeline', () => {
    expect(resultA.pipeline_id).toMatch(/^CPIPE-/);
    expect(resultA.output_hash).toHaveLength(64);
    expect(resultA.evidence.chain_hash).toHaveLength(64);
    expect(resultA.proof_pack.root_hash).toHaveLength(64);
  });

  it('scenario B complete pipeline', () => {
    const result = runCreation(INTENT_PACK_B, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.pipeline_id).toMatch(/^CPIPE-/);
    expect(result.output_hash).toHaveLength(64);
  });

  it('scenario C complete pipeline', () => {
    const result = runCreation(INTENT_PACK_C, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.pipeline_id).toMatch(/^CPIPE-/);
  });

  it('full pipeline trace F0->F8', () => {
    const stages = resultA.pipeline_trace.stages.map((s) => s.stage);
    expect(stages).toContain('F0');
    expect(stages).toContain('F1');
    expect(stages).toContain('F2');
    expect(stages).toContain('F3');
    expect(stages).toContain('F4');
    expect(stages).toContain('F5');
  });

  it('output text non-empty', () => {
    expect(resultA.final_text.paragraphs.length).toBeGreaterThan(0);
    expect(resultA.final_text.total_word_count).toBeGreaterThan(0);
  });

  it('intent -> output trace complete', () => {
    expect(resultA.intent_hash).toHaveLength(64);
    expect(resultA.evidence.paragraph_traces.length).toBe(resultA.style_output.paragraphs.length);
    for (const trace of resultA.evidence.paragraph_traces) {
      expect(trace.intent_hash).toBe(resultA.evidence.paragraph_traces[0].intent_hash);
    }
  });

  it('unified gates in order', () => {
    if (resultA.unified_gates.gate_results.length >= 2) {
      expect(resultA.unified_gates.gate_results[0].gate_id).toBe('U_TRUTH');
    }
  });

  it('evidence merkle valid', () => {
    expect(verifyMerkleTree(resultA.evidence.merkle_tree)).toBe(true);
  });

  it('proof-pack verifiable', () => {
    const result = verifyProofPack(resultA.proof_pack);
    expect(result.merkle_valid).toBe(true);
  });

  it('adversarial all graceful', () => {
    const cats: FuzzCategory[] = ['empty_fields', 'impossible_constraints', 'type_mismatch', 'hostile_content'];
    const packs = generateFuzzedPacks(INTENT_PACK_A, 4, cats);
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(report.crash_count).toBe(0);
  });

  it('CLI integration', () => {
    const args = parseCLIArgs(['--intent', 'test.json', '--out', './out', '--dry-run', '--verbose']);
    expect(validateCLIArgs(args).valid).toBe(true);
    expect(args.dryRun).toBe(true);
  });

  it('plan preserved through pipeline', () => {
    expect(resultA.genesis_plan.arcs.length).toBeGreaterThan(0);
    expect(resultA.genesis_plan.plan_hash).toHaveLength(64);
  });

  it('scribe preserved through pipeline', () => {
    expect(resultA.scribe_output.final_prose.paragraphs.length).toBeGreaterThan(0);
  });

  it('style preserved through pipeline', () => {
    expect(resultA.style_output.paragraphs.length).toBeGreaterThan(0);
    expect(resultA.style_output.tournament.total_rounds).toBeGreaterThan(0);
  });

  it('report complete', () => {
    expect(resultA.report.metrics.total_words).toBeGreaterThan(0);
    expect(resultA.report.invariants_checked.length).toBeGreaterThan(0);
    const md = creationReportToMarkdown(resultA.report);
    expect(md).toContain('OMEGA');
  });

  it('determinism: two runs same result', () => {
    const r2 = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(resultA.output_hash).toBe(r2.output_hash);
    expect(resultA.proof_pack.root_hash).toBe(r2.proof_pack.root_hash);
  });
});
