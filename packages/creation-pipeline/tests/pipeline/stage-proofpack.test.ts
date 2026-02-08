import { describe, it, expect } from 'vitest';
import { stageProofPack } from '../../src/pipeline/stage-proofpack.js';
import { stageEvidence } from '../../src/pipeline/stage-evidence.js';
import { hashIntentPack } from '../../src/intent-pack.js';
import { sha256, canonicalize } from '@omega/canon-kernel';
import { INTENT_PACK_A, INTENT_PACK_B, DEFAULT_C4_CONFIG, TIMESTAMP, runPipeline } from '../fixtures.js';
import type { StageResult } from '../../src/types.js';

describe('StageProofPack (F7)', () => {
  const snapA = runPipeline(INTENT_PACK_A);
  const snapB = runPipeline(INTENT_PACK_B);
  const intentHash = hashIntentPack(INTENT_PACK_A);
  const pipelineId = `CPIPE-${intentHash.slice(0, 16)}`;
  const proofPackVersion = DEFAULT_C4_CONFIG.PROOF_PACK_VERSION.value as string;

  const gEvidenceHash = sha256(canonicalize(snapA.genesisReport));
  const sEvidenceHash = sha256(canonicalize(snapA.scribeReport));
  const eEvidenceHash = sha256(canonicalize(snapA.styleReport));
  const stageResults: StageResult[] = [
    { stage: 'F0', verdict: 'PASS', input_hash: intentHash, output_hash: 'a', duration_ms: 0, details: '', timestamp_deterministic: TIMESTAMP },
  ];
  const f5 = stageEvidence(snapA.styleOutput, snapA.plan, snapA.scribeOutput, INTENT_PACK_A, pipelineId, stageResults, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);

  it('builds proof-pack with stage F7', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r.stage).toBe('F7');
    expect(r.verdict).toBe('PASS');
  });

  it('PASS for scenario B', () => {
    const intentHashB = hashIntentPack(INTENT_PACK_B);
    const pipelineIdB = `CPIPE-${intentHashB.slice(0, 16)}`;
    const gHashB = sha256(canonicalize(snapB.genesisReport));
    const sHashB = sha256(canonicalize(snapB.scribeReport));
    const eHashB = sha256(canonicalize(snapB.styleReport));
    const stagesB: StageResult[] = [
      { stage: 'F0', verdict: 'PASS', input_hash: intentHashB, output_hash: 'b', duration_ms: 0, details: '', timestamp_deterministic: TIMESTAMP },
    ];
    const f5B = stageEvidence(snapB.styleOutput, snapB.plan, snapB.scribeOutput, INTENT_PACK_B, pipelineIdB, stagesB, gHashB, sHashB, eHashB, TIMESTAMP);
    const r = stageProofPack(INTENT_PACK_B, snapB.plan, snapB.scribeOutput, snapB.styleOutput, f5B.evidence, null, pipelineIdB, proofPackVersion, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
  });

  it('manifest has files', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r.proofPack.manifest.files.length).toBeGreaterThan(0);
    expect(r.proofPack.manifest.total_files).toBe(r.proofPack.manifest.files.length);
  });

  it('root_hash is 64-char hex', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r.proofPack.root_hash).toHaveLength(64);
  });

  it('merkle tree built', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r.proofPack.merkle_tree.leaf_count).toBeGreaterThan(0);
    expect(r.proofPack.merkle_tree.depth).toBeGreaterThan(0);
  });

  it('verifiable flag set', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r.proofPack.verifiable).toBe(true);
  });

  it('all file hashes are 64-char hex', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    for (const file of r.proofPack.manifest.files) {
      expect(file.sha256).toHaveLength(64);
      expect(file.size_bytes).toBeGreaterThan(0);
    }
  });

  it('input_hash from evidence chain', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r.input_hash).toBe(f5.evidence.chain_hash);
  });

  it('output_hash matches root_hash', () => {
    const r = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r.output_hash).toBe(r.proofPack.root_hash);
  });

  it('deterministic', () => {
    const r1 = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    const r2 = stageProofPack(INTENT_PACK_A, snapA.plan, snapA.scribeOutput, snapA.styleOutput, f5.evidence, null, pipelineId, proofPackVersion, TIMESTAMP);
    expect(r1.proofPack.root_hash).toBe(r2.proofPack.root_hash);
    expect(r1.output_hash).toBe(r2.output_hash);
  });
});
