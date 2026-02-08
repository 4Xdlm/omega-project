import { describe, it, expect } from 'vitest';
import { stageReport } from '../../src/pipeline/stage-report.js';
import { stageUnifiedGates } from '../../src/pipeline/stage-gates.js';
import { stageEvidence } from '../../src/pipeline/stage-evidence.js';
import { hashIntentPack } from '../../src/intent-pack.js';
import { sha256, canonicalize } from '@omega/canon-kernel';
import { INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP, runPipeline } from '../fixtures.js';
import type { PipelineTrace, StageResult } from '../../src/types.js';

describe('StageReport (F6)', () => {
  const snap = runPipeline(INTENT_PACK_A);
  const intentHash = hashIntentPack(INTENT_PACK_A);
  const pipelineId = `CPIPE-${intentHash.slice(0, 16)}`;

  const gEvidenceHash = sha256(canonicalize(snap.genesisReport));
  const sEvidenceHash = sha256(canonicalize(snap.scribeReport));
  const eEvidenceHash = sha256(canonicalize(snap.styleReport));

  const f4 = stageUnifiedGates(snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP);
  const stageResults: StageResult[] = [
    { stage: 'F0', verdict: 'PASS', input_hash: intentHash, output_hash: 'a', duration_ms: 0, details: '', timestamp_deterministic: TIMESTAMP },
    { stage: 'F1', verdict: 'PASS', input_hash: 'a', output_hash: snap.plan.plan_hash, duration_ms: 0, details: '', timestamp_deterministic: TIMESTAMP },
    { stage: 'F2', verdict: 'PASS', input_hash: snap.plan.plan_hash, output_hash: snap.scribeOutput.output_hash, duration_ms: 0, details: '', timestamp_deterministic: TIMESTAMP },
    { stage: 'F3', verdict: 'PASS', input_hash: snap.scribeOutput.output_hash, output_hash: snap.styleOutput.output_hash, duration_ms: 0, details: '', timestamp_deterministic: TIMESTAMP },
    f4,
  ];
  const f5 = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, pipelineId, stageResults, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);

  const trace: PipelineTrace = {
    stages: [...stageResults, f5],
    total_stages: stageResults.length + 1,
    passed_stages: stageResults.filter(s => s.verdict === 'PASS').length + 1,
    first_failure: null,
  };

  const outputPreHash = sha256(canonicalize({
    style_hash: snap.styleOutput.output_hash,
    gates_verdict: f4.gateChain.verdict,
    evidence_hash: f5.evidence.chain_hash,
  }));
  const proofPackHash = sha256('proof-pack-placeholder');

  it('builds report with stage F6', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.stage).toBe('F6');
    expect(r.verdict).toBe('PASS');
  });

  it('report verdict matches gate chain', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.report.verdict).toBe(f4.gateChain.verdict);
  });

  it('report contains pipeline_id', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.report.pipeline_id).toBe(pipelineId);
  });

  it('metrics computed', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.report.metrics.total_words).toBeGreaterThan(0);
    expect(r.report.metrics.total_paragraphs).toBeGreaterThan(0);
    expect(r.report.metrics.total_arcs).toBeGreaterThan(0);
  });

  it('invariants listed', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.report.invariants_checked.length).toBeGreaterThan(0);
    expect(r.report.invariants_passed.length).toBeGreaterThan(0);
  });

  it('output_hash is 64-char hex', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.output_hash).toHaveLength(64);
  });

  it('config_hash computed', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.report.config_hash).toHaveLength(64);
  });

  it('deterministic', () => {
    const r1 = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    const r2 = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r1.output_hash).toBe(r2.output_hash);
    expect(r1.report.config_hash).toBe(r2.report.config_hash);
  });

  it('timestamp propagated', () => {
    const r = stageReport(INTENT_PACK_A, snap.plan, snap.scribeOutput, snap.styleOutput, f4.gateChain, f5.evidence, trace, DEFAULT_C4_CONFIG, outputPreHash, intentHash, pipelineId, proofPackHash, 7, TIMESTAMP);
    expect(r.report.timestamp_deterministic).toBe(TIMESTAMP);
    expect(r.timestamp_deterministic).toBe(TIMESTAMP);
  });
});
