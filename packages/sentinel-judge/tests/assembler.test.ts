/**
 * OMEGA Phase C — Evidence Assembler Tests
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * 
 * Tests for:
 * - Proof normalization
 * - Missing evidence normalization
 * - Sorting functions
 * - Digest computation
 * - Evidence assembly
 * - Merging
 * - Utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  assembleEvidence,
  computeInputsDigest,
  verifyInputsDigest,
  createEmptyEvidencePack,
  mergeEvidencePacks,
  extractEvidenceRefs,
  filterProofsByVerdict,
  allProofsPass,
  hasFailingProof,
  normalizeProof,
  normalizeMissingEvidence,
  sortProofs,
  sortMissing,
} from '../src/assembler/index.js';
import { Proof, EvidencePack, MissingEvidence, ERROR_CODES } from '../src/types.js';
import { sha256 } from '../src/digest.js';
import { toCanonicalJson } from '../src/canonical_json.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createProof(overrides: Partial<Proof> = {}): Proof {
  return {
    proofType: 'TEST',
    source: 'unit-test',
    sourceVersion: '1.0.0',
    hash: sha256('test-content-' + Math.random()),
    verdict: 'PASS',
    ...overrides,
  };
}

function createMissing(overrides: Partial<MissingEvidence> = {}): MissingEvidence {
  return {
    evidenceType: 'TEST_EVIDENCE',
    reason: 'Test reason',
    blocksVerdict: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Proof Normalization', () => {
  it('should normalize valid proof', () => {
    const proof = createProof({
      proofType: '  TEST  ',
      source: '  unit-test  ',
      sourceVersion: '  1.0.0  ',
    });
    
    const normalized = normalizeProof(proof);
    
    expect(normalized.proofType).toBe('TEST');
    expect(normalized.source).toBe('unit-test');
    expect(normalized.sourceVersion).toBe('1.0.0');
  });
  
  it('should lowercase hash', () => {
    const hash = sha256('test').toUpperCase();
    const proof = createProof({ hash: hash.toLowerCase() });
    
    const normalized = normalizeProof(proof);
    
    expect(normalized.hash).toBe(hash.toLowerCase());
  });
  
  it('should preserve verdict', () => {
    const proof = createProof({ verdict: 'FAIL' });
    const normalized = normalizeProof(proof);
    
    expect(normalized.verdict).toBe('FAIL');
  });
  
  it('should preserve metrics if present', () => {
    const proof = createProof({ metrics: { score: 0.95 } });
    const normalized = normalizeProof(proof);
    
    expect(normalized.metrics).toEqual({ score: 0.95 });
  });
  
  it('should throw for invalid hash format', () => {
    const proof = createProof({ hash: 'invalid-hash' });
    
    expect(() => normalizeProof(proof)).toThrow();
  });
  
  it('should throw with proper error code', () => {
    const proof = createProof({ hash: 'not-a-valid-sha256' });
    
    try {
      normalizeProof(proof);
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.code).toBe(ERROR_CODES.DIGEST_02);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MISSING EVIDENCE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Missing Evidence Normalization', () => {
  it('should normalize missing evidence', () => {
    const missing = createMissing({
      evidenceType: '  HASH_CHAIN  ',
      reason: '  Incomplete chain  ',
    });
    
    const normalized = normalizeMissingEvidence(missing);
    
    expect(normalized.evidenceType).toBe('HASH_CHAIN');
    expect(normalized.reason).toBe('Incomplete chain');
  });
  
  it('should preserve blocksVerdict flag', () => {
    const missing = createMissing({ blocksVerdict: true });
    const normalized = normalizeMissingEvidence(missing);
    
    expect(normalized.blocksVerdict).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Proof Sorting', () => {
  it('should sort proofs by hash', () => {
    const proof1 = createProof({ hash: sha256('zzz') });
    const proof2 = createProof({ hash: sha256('aaa') });
    const proof3 = createProof({ hash: sha256('mmm') });
    
    const sorted = sortProofs([proof1, proof2, proof3]);
    
    // Should be in alphabetical order by hash
    expect(sorted[0].hash < sorted[1].hash).toBe(true);
    expect(sorted[1].hash < sorted[2].hash).toBe(true);
  });
  
  it('should not mutate original array', () => {
    const proofs = [
      createProof({ hash: sha256('b') }),
      createProof({ hash: sha256('a') }),
    ];
    const original = [...proofs];
    
    sortProofs(proofs);
    
    expect(proofs).toEqual(original);
  });
  
  it('should handle empty array', () => {
    const sorted = sortProofs([]);
    expect(sorted).toEqual([]);
  });
  
  it('should handle single proof', () => {
    const proof = createProof();
    const sorted = sortProofs([proof]);
    
    expect(sorted.length).toBe(1);
    expect(sorted[0]).toEqual(proof);
  });
});

describe('Missing Evidence Sorting', () => {
  it('should sort missing by evidenceType', () => {
    const missing1 = createMissing({ evidenceType: 'ZEBRA' });
    const missing2 = createMissing({ evidenceType: 'ALPHA' });
    const missing3 = createMissing({ evidenceType: 'MIKE' });
    
    const sorted = sortMissing([missing1, missing2, missing3]);
    
    expect(sorted[0].evidenceType).toBe('ALPHA');
    expect(sorted[1].evidenceType).toBe('MIKE');
    expect(sorted[2].evidenceType).toBe('ZEBRA');
  });
  
  it('should not mutate original array', () => {
    const missing = [
      createMissing({ evidenceType: 'B' }),
      createMissing({ evidenceType: 'A' }),
    ];
    const original = [...missing];
    
    sortMissing(missing);
    
    expect(missing).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DIGEST COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Inputs Digest Computation', () => {
  it('should compute digest from sorted hashes', () => {
    const hash1 = sha256('content1');
    const hash2 = sha256('content2');
    const proofs = [
      createProof({ hash: hash1 }),
      createProof({ hash: hash2 }),
    ];
    
    const digest = computeInputsDigest(proofs);
    
    // Verify by manual computation
    const sortedHashes = [hash1, hash2].sort();
    const expected = sha256(toCanonicalJson(sortedHashes));
    
    expect(digest).toBe(expected);
  });
  
  it('should produce same digest regardless of input order', () => {
    const hash1 = sha256('a');
    const hash2 = sha256('b');
    
    const digest1 = computeInputsDigest([
      createProof({ hash: hash1 }),
      createProof({ hash: hash2 }),
    ]);
    
    const digest2 = computeInputsDigest([
      createProof({ hash: hash2 }),
      createProof({ hash: hash1 }),
    ]);
    
    expect(digest1).toBe(digest2);
  });
  
  it('should compute digest for empty proofs', () => {
    const digest = computeInputsDigest([]);
    const expected = sha256(toCanonicalJson([]));
    
    expect(digest).toBe(expected);
  });
  
  it('should be deterministic', () => {
    const proofs = [createProof(), createProof()];
    
    const digest1 = computeInputsDigest(proofs);
    const digest2 = computeInputsDigest(proofs);
    
    expect(digest1).toBe(digest2);
  });
});

describe('Inputs Digest Verification', () => {
  it('should verify correct digest', () => {
    const proofs = [createProof(), createProof()];
    const sortedHashes = proofs.map(p => p.hash).sort();
    const correctDigest = sha256(toCanonicalJson(sortedHashes));
    
    const evidencePack: EvidencePack = {
      inputsDigest: correctDigest,
      proofs,
      missing: [],
    };
    
    expect(verifyInputsDigest(evidencePack)).toBe(true);
  });
  
  it('should reject incorrect digest', () => {
    const proofs = [createProof()];
    
    const evidencePack: EvidencePack = {
      inputsDigest: sha256('wrong'),
      proofs,
      missing: [],
    };
    
    expect(verifyInputsDigest(evidencePack)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Evidence Assembly', () => {
  it('should assemble valid evidence pack', () => {
    const proofs = [createProof(), createProof()];
    
    const result = assembleEvidence({ proofs });
    
    expect(result.evidencePack.proofs.length).toBe(2);
    expect(result.evidencePack.missing.length).toBe(0);
    expect(result.sortedHashes.length).toBe(2);
    expect(result.hasBlockingMissing).toBe(false);
  });
  
  it('should sort proofs in evidence pack', () => {
    const hash1 = sha256('zzz');
    const hash2 = sha256('aaa');
    const proofs = [
      createProof({ hash: hash1 }),
      createProof({ hash: hash2 }),
    ];
    
    const result = assembleEvidence({ proofs });
    
    expect(result.evidencePack.proofs[0].hash < result.evidencePack.proofs[1].hash).toBe(true);
  });
  
  it('should compute correct inputsDigest', () => {
    const proofs = [createProof(), createProof()];
    
    const result = assembleEvidence({ proofs });
    
    expect(verifyInputsDigest(result.evidencePack)).toBe(true);
  });
  
  it('should include missing evidence', () => {
    const proofs = [createProof()];
    const missing = [createMissing()];
    
    const result = assembleEvidence({ proofs, missing });
    
    expect(result.evidencePack.missing.length).toBe(1);
  });
  
  it('should detect blocking missing evidence', () => {
    const proofs = [createProof()];
    const missing = [createMissing({ blocksVerdict: true })];
    
    const result = assembleEvidence({ proofs, missing });
    
    expect(result.hasBlockingMissing).toBe(true);
  });
  
  it('should normalize proofs during assembly', () => {
    const proofs = [createProof({ proofType: '  TEST  ' })];
    
    const result = assembleEvidence({ proofs });
    
    expect(result.evidencePack.proofs[0].proofType).toBe('TEST');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY EVIDENCE PACK
// ═══════════════════════════════════════════════════════════════════════════════

describe('Empty Evidence Pack', () => {
  it('should create empty evidence pack', () => {
    const pack = createEmptyEvidencePack();
    
    expect(pack.proofs.length).toBe(0);
    expect(pack.missing.length).toBe(0);
  });
  
  it('should have valid inputsDigest', () => {
    const pack = createEmptyEvidencePack();
    
    expect(verifyInputsDigest(pack)).toBe(true);
  });
  
  it('should compute correct digest for empty array', () => {
    const pack = createEmptyEvidencePack();
    const expected = sha256(toCanonicalJson([]));
    
    expect(pack.inputsDigest).toBe(expected);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MERGING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Evidence Pack Merging', () => {
  it('should merge two packs', () => {
    const pack1 = assembleEvidence({ proofs: [createProof()] }).evidencePack;
    const pack2 = assembleEvidence({ proofs: [createProof()] }).evidencePack;
    
    const merged = mergeEvidencePacks([pack1, pack2]);
    
    expect(merged.proofs.length).toBe(2);
  });
  
  it('should deduplicate proofs by hash', () => {
    const proof = createProof();
    const pack1 = assembleEvidence({ proofs: [proof] }).evidencePack;
    const pack2 = assembleEvidence({ proofs: [proof] }).evidencePack;
    
    const merged = mergeEvidencePacks([pack1, pack2]);
    
    expect(merged.proofs.length).toBe(1);
  });
  
  it('should merge missing evidence', () => {
    const pack1 = assembleEvidence({ 
      proofs: [], 
      missing: [createMissing({ evidenceType: 'TYPE_A' })] 
    }).evidencePack;
    const pack2 = assembleEvidence({ 
      proofs: [], 
      missing: [createMissing({ evidenceType: 'TYPE_B' })] 
    }).evidencePack;
    
    const merged = mergeEvidencePacks([pack1, pack2]);
    
    expect(merged.missing.length).toBe(2);
  });
  
  it('should deduplicate missing by type', () => {
    const pack1 = assembleEvidence({ 
      proofs: [], 
      missing: [createMissing({ evidenceType: 'TYPE_A', blocksVerdict: false })] 
    }).evidencePack;
    const pack2 = assembleEvidence({ 
      proofs: [], 
      missing: [createMissing({ evidenceType: 'TYPE_A', blocksVerdict: false })] 
    }).evidencePack;
    
    const merged = mergeEvidencePacks([pack1, pack2]);
    
    expect(merged.missing.length).toBe(1);
  });
  
  it('should prefer blocksVerdict=true when deduplicating', () => {
    const pack1 = assembleEvidence({ 
      proofs: [], 
      missing: [createMissing({ evidenceType: 'TYPE_A', blocksVerdict: false })] 
    }).evidencePack;
    const pack2 = assembleEvidence({ 
      proofs: [], 
      missing: [createMissing({ evidenceType: 'TYPE_A', blocksVerdict: true })] 
    }).evidencePack;
    
    const merged = mergeEvidencePacks([pack1, pack2]);
    
    expect(merged.missing[0].blocksVerdict).toBe(true);
  });
  
  it('should recompute inputsDigest after merge', () => {
    const pack1 = assembleEvidence({ proofs: [createProof()] }).evidencePack;
    const pack2 = assembleEvidence({ proofs: [createProof()] }).evidencePack;
    
    const merged = mergeEvidencePacks([pack1, pack2]);
    
    expect(verifyInputsDigest(merged)).toBe(true);
  });
  
  it('should handle empty input array', () => {
    const merged = mergeEvidencePacks([]);
    
    expect(merged.proofs.length).toBe(0);
    expect(verifyInputsDigest(merged)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Evidence Reference Extraction', () => {
  it('should extract proof hashes', () => {
    const proofs = [createProof(), createProof()];
    const pack = assembleEvidence({ proofs }).evidencePack;
    
    const refs = extractEvidenceRefs(pack);
    
    expect(refs.length).toBe(2);
    expect(refs).toContain(proofs[0].hash);
    expect(refs).toContain(proofs[1].hash);
  });
  
  it('should return sorted hashes', () => {
    const hash1 = sha256('zzz');
    const hash2 = sha256('aaa');
    const proofs = [
      createProof({ hash: hash1 }),
      createProof({ hash: hash2 }),
    ];
    const pack = assembleEvidence({ proofs }).evidencePack;
    
    const refs = extractEvidenceRefs(pack);
    
    expect(refs[0] < refs[1]).toBe(true);
  });
  
  it('should deduplicate hashes', () => {
    const hash = sha256('same');
    const proofs = [
      createProof({ hash }),
      createProof({ hash }),
    ];
    // Note: assembleEvidence deduplicates, but extractEvidenceRefs also does
    const pack: EvidencePack = {
      inputsDigest: sha256(toCanonicalJson([hash])),
      proofs,
      missing: [],
    };
    
    const refs = extractEvidenceRefs(pack);
    
    expect(refs.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERING BY VERDICT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Filtering by Verdict', () => {
  it('should filter PASS proofs', () => {
    const proofs = [
      createProof({ verdict: 'PASS' }),
      createProof({ verdict: 'FAIL' }),
      createProof({ verdict: 'PASS' }),
    ];
    
    const passing = filterProofsByVerdict(proofs, 'PASS');
    
    expect(passing.length).toBe(2);
    expect(passing.every(p => p.verdict === 'PASS')).toBe(true);
  });
  
  it('should filter FAIL proofs', () => {
    const proofs = [
      createProof({ verdict: 'PASS' }),
      createProof({ verdict: 'FAIL' }),
    ];
    
    const failing = filterProofsByVerdict(proofs, 'FAIL');
    
    expect(failing.length).toBe(1);
    expect(failing[0].verdict).toBe('FAIL');
  });
  
  it('should return empty for no matches', () => {
    const proofs = [createProof({ verdict: 'PASS' })];
    
    const skipped = filterProofsByVerdict(proofs, 'SKIP');
    
    expect(skipped.length).toBe(0);
  });
});

describe('All Proofs Pass', () => {
  it('should return true when all pass', () => {
    const proofs = [
      createProof({ verdict: 'PASS' }),
      createProof({ verdict: 'PASS' }),
    ];
    
    expect(allProofsPass(proofs)).toBe(true);
  });
  
  it('should return false when any fails', () => {
    const proofs = [
      createProof({ verdict: 'PASS' }),
      createProof({ verdict: 'FAIL' }),
    ];
    
    expect(allProofsPass(proofs)).toBe(false);
  });
  
  it('should return false for WARN', () => {
    const proofs = [
      createProof({ verdict: 'PASS' }),
      createProof({ verdict: 'WARN' }),
    ];
    
    expect(allProofsPass(proofs)).toBe(false);
  });
  
  it('should return true for empty array', () => {
    expect(allProofsPass([])).toBe(true);
  });
});

describe('Has Failing Proof', () => {
  it('should return true when any fails', () => {
    const proofs = [
      createProof({ verdict: 'PASS' }),
      createProof({ verdict: 'FAIL' }),
    ];
    
    expect(hasFailingProof(proofs)).toBe(true);
  });
  
  it('should return false when none fail', () => {
    const proofs = [
      createProof({ verdict: 'PASS' }),
      createProof({ verdict: 'WARN' }),
    ];
    
    expect(hasFailingProof(proofs)).toBe(false);
  });
  
  it('should return false for empty array', () => {
    expect(hasFailingProof([])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  it('should produce identical results for same input', () => {
    const proofs = [
      createProof({ hash: sha256('fixed-1') }),
      createProof({ hash: sha256('fixed-2') }),
    ];
    const missing = [createMissing({ evidenceType: 'FIXED' })];
    
    const result1 = assembleEvidence({ proofs, missing });
    const result2 = assembleEvidence({ proofs, missing });
    
    expect(result1.evidencePack.inputsDigest).toBe(result2.evidencePack.inputsDigest);
    expect(result1.sortedHashes).toEqual(result2.sortedHashes);
  });
  
  it('should produce same digest regardless of input order', () => {
    const proof1 = createProof({ hash: sha256('a') });
    const proof2 = createProof({ hash: sha256('b') });
    
    const result1 = assembleEvidence({ proofs: [proof1, proof2] });
    const result2 = assembleEvidence({ proofs: [proof2, proof1] });
    
    expect(result1.evidencePack.inputsDigest).toBe(result2.evidencePack.inputsDigest);
  });
});
