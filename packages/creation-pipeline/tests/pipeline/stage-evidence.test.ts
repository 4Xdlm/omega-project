import { describe, it, expect } from 'vitest';
import { stageEvidence } from '../../src/pipeline/stage-evidence.js';
import { sha256, canonicalize } from '@omega/canon-kernel';
import { INTENT_PACK_A, TIMESTAMP, runPipeline } from '../fixtures.js';

describe('StageEvidence (F5)', () => {
  const snap = runPipeline(INTENT_PACK_A);
  const gEvidenceHash = sha256(canonicalize(snap.genesisReport));
  const sEvidenceHash = sha256(canonicalize(snap.scribeReport));
  const eEvidenceHash = sha256(canonicalize(snap.styleReport));
  const stages = [{ stage: 'F0' as const, verdict: 'PASS' as const, input_hash: 'a', output_hash: 'b', duration_ms: 0, details: '', timestamp_deterministic: TIMESTAMP }];

  it('builds evidence', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.verdict).toBe('PASS');
    expect(r.stage).toBe('F5');
  });

  it('merkle tree built', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.merkle_tree.root_hash).toHaveLength(64);
  });

  it('paragraph traces complete', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.paragraph_traces.length).toBe(snap.styleOutput.paragraphs.length);
  });

  it('100% coverage', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.paragraph_traces.length).toBe(snap.styleOutput.paragraphs.length);
  });

  it('chain hash computed', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.chain_hash).toHaveLength(64);
  });

  it('stage results included', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.stage_results.length).toBe(stages.length);
  });

  it('genesis hash included', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.genesis_evidence_hash).toBe(gEvidenceHash);
  });

  it('scribe hash included', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.scribe_evidence_hash).toBe(sEvidenceHash);
  });

  it('style hash included', () => {
    const r = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r.evidence.style_evidence_hash).toBe(eEvidenceHash);
  });

  it('deterministic', () => {
    const r1 = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    const r2 = stageEvidence(snap.styleOutput, snap.plan, snap.scribeOutput, INTENT_PACK_A, 'PIPE-1', stages, gEvidenceHash, sEvidenceHash, eEvidenceHash, TIMESTAMP);
    expect(r1.evidence.chain_hash).toBe(r2.evidence.chain_hash);
  });
});
