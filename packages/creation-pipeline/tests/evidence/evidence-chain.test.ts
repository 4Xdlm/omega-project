import { describe, it, expect } from 'vitest';
import { buildE2EEvidenceChain, verifyE2EEvidenceChain } from '../../src/evidence/evidence-chain.js';
import { buildMerkleTree } from '../../src/evidence/merkle-tree.js';
import { sha256 } from '@omega/canon-kernel';

describe('E2EEvidenceChain', () => {
  const leaves = ['hash1', 'hash2', 'hash3'];
  const merkle = buildMerkleTree(leaves);
  const pTraces = [{
    paragraph_id: 'p1',
    text_hash: 'th1',
    intent_hash: 'ih',
    plan_hash: 'ph',
    segment_ids: [],
    scene_ids: [],
    arc_ids: [],
    canon_refs: [],
    seed_refs: [],
    proof_path: ['ih', 'ph', 'th1'],
  }];
  const stages = [{
    stage: 'F0' as const,
    verdict: 'PASS' as const,
    input_hash: 'a',
    output_hash: 'b',
    duration_ms: 0,
    details: '',
    timestamp_deterministic: '2026-02-08T00:00:00.000Z',
  }];

  it('builds chain', () => {
    const chain = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    expect(chain.pipeline_id).toBe('PIPE-1');
    expect(chain.chain_hash).toHaveLength(64);
  });

  it('chain hash is deterministic', () => {
    const c1 = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    const c2 = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    expect(c1.chain_hash).toBe(c2.chain_hash);
  });

  it('verifies valid chain', () => {
    const chain = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    expect(verifyE2EEvidenceChain(chain)).toBe(true);
  });

  it('detects tampered chain', () => {
    const chain = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    const tampered = { ...chain, chain_hash: 'bad' };
    expect(verifyE2EEvidenceChain(tampered)).toBe(false);
  });

  it('includes all phases', () => {
    const chain = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    expect(chain.genesis_evidence_hash).toBe('gh');
    expect(chain.scribe_evidence_hash).toBe('sh');
    expect(chain.style_evidence_hash).toBe('eh');
  });

  it('includes stage results', () => {
    const chain = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    expect(chain.stage_results).toHaveLength(1);
  });

  it('includes merkle tree', () => {
    const chain = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    expect(chain.merkle_tree.root_hash).toBe(merkle.root_hash);
  });

  it('different pipeline_id -> different hash', () => {
    const c1 = buildE2EEvidenceChain('PIPE-1', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    const c2 = buildE2EEvidenceChain('PIPE-2', merkle, pTraces, stages, 'gh', 'sh', 'eh');
    expect(c1.chain_hash).not.toBe(c2.chain_hash);
  });
});
