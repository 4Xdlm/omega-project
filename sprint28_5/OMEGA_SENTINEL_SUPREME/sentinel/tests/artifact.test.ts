/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — ARTIFACT MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/artifact.test
 * @version 2.0.0
 * 
 * INVARIANTS TESTED:
 * - INV-ART-01: Artifact hash is deterministically computed
 * - INV-ART-02: Artifact is immutable after creation
 * - INV-ART-03: Evidence chain is hash-linked
 * - INV-ART-04: Artifact references are valid
 * - INV-SER-01: Serialization is reversible
 * - INV-SER-02: Hash is preserved through serialization
 * - INV-SER-03: Invalid format is rejected
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';

// Artifact imports
import {
  generateUUID,
  createArtifact,
  addEvidence,
  createProofEvidence,
  createFalsificationEvidence,
  createAssertionEvidence,
  createReferenceEvidence,
  computeHash,
  computeArtifactHash,
  sealArtifact,
  addExternalCertifier,
  revokeArtifact,
  verifyArtifactHash,
  isSealed,
  isValid,
  getEvidenceByType,
  getProofEvidence,
  getFalsificationEvidence,
  countEvidence,
  hasExternalCertifier,
  isChained,
  createLinkedArtifact,
  isValidStatus,
  isValidEvidenceType
} from '../artifact/artifact.js';

// Serialization imports
import {
  toJSON,
  fromJSON,
  toYAML,
  serialize,
  isValidArtifactJSON,
  getArtifactSummary
} from '../artifact/serialization.js';

import { createDefaultMetrics } from '../regions/containment.js';
import { SENTINEL_VERSION } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createTestArtifact() {
  return createArtifact({
    invariantId: 'INV-TEST-001',
    invariantHash: 'a'.repeat(64),
    region: 'PROVEN',
    metrics: {
      proofStrength: 'Σ',
      survivalRate: 0.95,
      coverage: 0.7,
      proofCount: 5,
      mandatoryCoverage: 1.0,
      hasExternalCertifier: false,
      isSystemValid: true
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: ARTIFACT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Artifact Creation', () => {
  
  describe('UUID Generation', () => {
    
    it('should generate valid UUID format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
    
    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
    
  });
  
  describe('createArtifact', () => {
    
    it('should create artifact with correct fields', () => {
      const artifact = createTestArtifact();
      
      expect(artifact.id).toBeDefined();
      expect(artifact.version).toBe(SENTINEL_VERSION);
      expect(artifact.status).toBe('DRAFT');
      expect(artifact.invariantId).toBe('INV-TEST-001');
      expect(artifact.region).toBe('PROVEN');
    });
    
    it('should create artifact with DRAFT status', () => {
      const artifact = createTestArtifact();
      expect(artifact.status).toBe('DRAFT');
    });
    
    it('should have null hash initially', () => {
      const artifact = createTestArtifact();
      expect(artifact.hash).toBeNull();
    });
    
    it('should have empty evidence initially', () => {
      const artifact = createTestArtifact();
      expect(artifact.evidence).toHaveLength(0);
    });
    
    it('should support previous artifact hash', () => {
      const artifact = createArtifact({
        invariantId: 'INV-TEST-001',
        invariantHash: 'a'.repeat(64),
        region: 'PROVEN',
        metrics: createDefaultMetrics(),
        previousArtifactHash: 'b'.repeat(64)
      });
      
      expect(artifact.previousArtifactHash).toBe('b'.repeat(64));
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: EVIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Evidence Management', () => {
  
  describe('addEvidence', () => {
    
    it('should add evidence to artifact', () => {
      let artifact = createTestArtifact();
      const evidence = createProofEvidence(
        'proof-1',
        'Test proof',
        'Σ',
        'hash123'
      );
      
      artifact = addEvidence(artifact, evidence);
      expect(artifact.evidence).toHaveLength(1);
    });
    
    it('should preserve previous evidence', () => {
      let artifact = createTestArtifact();
      
      artifact = addEvidence(artifact, createProofEvidence('p1', 'Proof 1', 'Σ', 'h1'));
      artifact = addEvidence(artifact, createProofEvidence('p2', 'Proof 2', 'Λ', 'h2'));
      
      expect(artifact.evidence).toHaveLength(2);
      expect(artifact.evidence[0].id).toBe('p1');
      expect(artifact.evidence[1].id).toBe('p2');
    });
    
    it('should throw if artifact is sealed', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      
      expect(() => {
        addEvidence(artifact, createProofEvidence('p1', 'Proof', 'Σ', 'h1'));
      }).toThrow('Cannot modify sealed artifact');
    });
    
  });
  
  describe('Evidence Factories', () => {
    
    it('createProofEvidence should create proof type', () => {
      const evidence = createProofEvidence('p1', 'Proof desc', 'Ω', 'hash');
      expect(evidence.type).toBe('proof');
      expect(evidence.strength).toBe('Ω');
    });
    
    it('createFalsificationEvidence should create falsification type', () => {
      const evidence = createFalsificationEvidence('f1', 'Falsification desc', 'hash');
      expect(evidence.type).toBe('falsification');
      expect(evidence.strength).toBeUndefined();
    });
    
    it('createAssertionEvidence should create assertion type', () => {
      const evidence = createAssertionEvidence('a1', 'Assertion desc', 'hash');
      expect(evidence.type).toBe('assertion');
    });
    
    it('createReferenceEvidence should create reference type', () => {
      const evidence = createReferenceEvidence('r1', 'Reference desc', 'https://example.com');
      expect(evidence.type).toBe('reference');
      expect(evidence.sourceUri).toBe('https://example.com');
    });
    
  });
  
  describe('Evidence Queries', () => {
    
    it('getEvidenceByType should filter correctly', () => {
      let artifact = createTestArtifact();
      artifact = addEvidence(artifact, createProofEvidence('p1', 'Proof', 'Σ', 'h1'));
      artifact = addEvidence(artifact, createFalsificationEvidence('f1', 'Falsification', 'h2'));
      
      const proofs = getEvidenceByType(artifact, 'proof');
      expect(proofs).toHaveLength(1);
      expect(proofs[0].id).toBe('p1');
    });
    
    it('getProofEvidence should return only proofs', () => {
      let artifact = createTestArtifact();
      artifact = addEvidence(artifact, createProofEvidence('p1', 'Proof', 'Σ', 'h1'));
      artifact = addEvidence(artifact, createFalsificationEvidence('f1', 'Fals', 'h2'));
      
      expect(getProofEvidence(artifact)).toHaveLength(1);
    });
    
    it('getFalsificationEvidence should return only falsifications', () => {
      let artifact = createTestArtifact();
      artifact = addEvidence(artifact, createProofEvidence('p1', 'Proof', 'Σ', 'h1'));
      artifact = addEvidence(artifact, createFalsificationEvidence('f1', 'Fals', 'h2'));
      
      expect(getFalsificationEvidence(artifact)).toHaveLength(1);
    });
    
    it('countEvidence should return total count', () => {
      let artifact = createTestArtifact();
      artifact = addEvidence(artifact, createProofEvidence('p1', 'Proof', 'Σ', 'h1'));
      artifact = addEvidence(artifact, createProofEvidence('p2', 'Proof', 'Λ', 'h2'));
      
      expect(countEvidence(artifact)).toBe(2);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Hash Computation', () => {
  
  describe('INV-ART-01: Deterministic Hash', () => {
    
    it('computeHash should produce same hash for same input', () => {
      const input = 'test content';
      const hash1 = computeHash(input);
      const hash2 = computeHash(input);
      expect(hash1).toBe(hash2);
    });
    
    it('computeHash should produce different hash for different input', () => {
      const hash1 = computeHash('content1');
      const hash2 = computeHash('content2');
      expect(hash1).not.toBe(hash2);
    });
    
    it('computeHash should produce 64-character hex', () => {
      const hash = computeHash('test');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
    
  });
  
  describe('computeArtifactHash', () => {
    
    it('should produce deterministic hash', () => {
      const artifact = createTestArtifact();
      const hash1 = computeArtifactHash(artifact);
      const hash2 = computeArtifactHash(artifact);
      expect(hash1).toBe(hash2);
    });
    
    it('should produce different hash for different artifacts', () => {
      const artifact1 = createArtifact({
        invariantId: 'INV-TEST-001',
        invariantHash: 'a'.repeat(64),
        region: 'PROVEN',
        metrics: createDefaultMetrics()
      });
      
      const artifact2 = createArtifact({
        invariantId: 'INV-TEST-002',
        invariantHash: 'b'.repeat(64),
        region: 'PROVEN',
        metrics: createDefaultMetrics()
      });
      
      expect(computeArtifactHash(artifact1)).not.toBe(computeArtifactHash(artifact2));
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SEALING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sealing', () => {
  
  describe('sealArtifact', () => {
    
    it('should set status to SEALED', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      expect(artifact.status).toBe('SEALED');
    });
    
    it('should compute and set hash', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      expect(artifact.hash).not.toBeNull();
      expect(artifact.hash).toMatch(/^[0-9a-f]{64}$/);
    });
    
    it('should set sealedAt timestamp', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      expect(artifact.sealedAt).not.toBeNull();
    });
    
    it('should throw if already sealed', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      
      expect(() => sealArtifact(artifact)).toThrow('Can only seal DRAFT artifacts');
    });
    
  });
  
  describe('addExternalCertifier', () => {
    
    it('should add certifier to TRANSCENDENT artifact', () => {
      let artifact = createArtifact({
        invariantId: 'INV-TEST-001',
        invariantHash: 'a'.repeat(64),
        region: 'TRANSCENDENT',
        metrics: {
          ...createDefaultMetrics(),
          hasExternalCertifier: true
        }
      });
      
      artifact = sealArtifact(artifact);
      artifact = addExternalCertifier(artifact, 'certifier-123', 'signature-abc');
      
      expect(artifact.status).toBe('VERIFIED');
      expect(artifact.externalCertifierId).toBe('certifier-123');
      expect(artifact.externalCertifierSignature).toBe('signature-abc');
    });
    
    it('should throw if not TRANSCENDENT region', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      
      expect(() => {
        addExternalCertifier(artifact, 'cert', 'sig');
      }).toThrow('External certifier only for TRANSCENDENT region');
    });
    
  });
  
  describe('revokeArtifact', () => {
    
    it('should set status to REVOKED', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      artifact = revokeArtifact(artifact, 'Test revocation');
      
      expect(artifact.status).toBe('REVOKED');
    });
    
    it('should add revocation note', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      artifact = revokeArtifact(artifact, 'Security issue');
      
      expect(artifact.notes).toContain('REVOKED: Security issue');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Verification', () => {
  
  describe('verifyArtifactHash', () => {
    
    it('should return true for valid sealed artifact', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      expect(verifyArtifactHash(artifact)).toBe(true);
    });
    
    it('should return false for artifact without hash', () => {
      const artifact = createTestArtifact();
      expect(verifyArtifactHash(artifact)).toBe(false);
    });
    
  });
  
  describe('isSealed', () => {
    
    it('should return false for DRAFT', () => {
      const artifact = createTestArtifact();
      expect(isSealed(artifact)).toBe(false);
    });
    
    it('should return true for SEALED', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      expect(isSealed(artifact)).toBe(true);
    });
    
  });
  
  describe('isValid', () => {
    
    it('should return true for valid DRAFT', () => {
      const artifact = createTestArtifact();
      expect(isValid(artifact)).toBe(true);
    });
    
    it('should return true for valid SEALED', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      expect(isValid(artifact)).toBe(true);
    });
    
    it('should return false for REVOKED', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      artifact = revokeArtifact(artifact, 'Revoked');
      expect(isValid(artifact)).toBe(false);
    });
    
  });
  
  describe('hasExternalCertifier', () => {
    
    it('should return false without certifier', () => {
      const artifact = createTestArtifact();
      expect(hasExternalCertifier(artifact)).toBe(false);
    });
    
    it('should return true with certifier', () => {
      let artifact = createArtifact({
        invariantId: 'INV-TEST-001',
        invariantHash: 'a'.repeat(64),
        region: 'TRANSCENDENT',
        metrics: { ...createDefaultMetrics(), hasExternalCertifier: true }
      });
      artifact = sealArtifact(artifact);
      artifact = addExternalCertifier(artifact, 'cert', 'sig');
      expect(hasExternalCertifier(artifact)).toBe(true);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CHAIN OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Chain Operations', () => {
  
  describe('INV-ART-03: Hash-Linked Chain', () => {
    
    it('isChained should return false for root artifact', () => {
      const artifact = createTestArtifact();
      expect(isChained(artifact)).toBe(false);
    });
    
    it('isChained should return true for linked artifact', () => {
      let prev = createTestArtifact();
      prev = sealArtifact(prev);
      
      const linked = createLinkedArtifact({
        invariantId: 'INV-TEST-001',
        invariantHash: 'a'.repeat(64),
        region: 'FOUNDATIONAL',
        metrics: createDefaultMetrics()
      }, prev);
      
      expect(isChained(linked)).toBe(true);
      expect(linked.previousArtifactHash).toBe(prev.hash);
    });
    
    it('createLinkedArtifact should throw if previous not sealed', () => {
      const prev = createTestArtifact();
      
      expect(() => {
        createLinkedArtifact({
          invariantId: 'INV-TEST-001',
          invariantHash: 'a'.repeat(64),
          region: 'FOUNDATIONAL',
          metrics: createDefaultMetrics()
        }, prev);
      }).toThrow('Previous artifact must be sealed');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Serialization', () => {
  
  describe('INV-SER-01: Reversible Serialization', () => {
    
    it('JSON round-trip should preserve artifact', () => {
      let artifact = createTestArtifact();
      artifact = addEvidence(artifact, createProofEvidence('p1', 'Proof', 'Σ', 'h1'));
      artifact = sealArtifact(artifact);
      
      const json = toJSON(artifact);
      const result = fromJSON(json);
      
      expect(result.success).toBe(true);
      expect(result.artifact!.id).toBe(artifact.id);
      expect(result.artifact!.invariantId).toBe(artifact.invariantId);
      expect(result.artifact!.hash).toBe(artifact.hash);
    });
    
    it('should preserve evidence through serialization', () => {
      let artifact = createTestArtifact();
      artifact = addEvidence(artifact, createProofEvidence('p1', 'Proof', 'Σ', 'h1'));
      artifact = addEvidence(artifact, createFalsificationEvidence('f1', 'Fals', 'h2'));
      artifact = sealArtifact(artifact);
      
      const json = toJSON(artifact);
      const result = fromJSON(json);
      
      expect(result.artifact!.evidence).toHaveLength(2);
    });
    
  });
  
  describe('INV-SER-02: Hash Preservation', () => {
    
    it('should verify hash after deserialization', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      
      const json = toJSON(artifact);
      const result = fromJSON(json);
      
      expect(result.hashVerified).toBe(true);
    });
    
  });
  
  describe('INV-SER-03: Invalid Format Rejection', () => {
    
    it('should reject invalid JSON', () => {
      const result = fromJSON('not valid json');
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON parse error');
    });
    
    it('should reject missing required fields', () => {
      const result = fromJSON('{"id": "test"}');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required field');
    });
    
    it('should reject invalid status', () => {
      const json = JSON.stringify({
        id: 'test',
        version: '1.0.0',
        status: 'INVALID',
        createdAt: '2025-01-01T00:00:00Z',
        modifiedAt: '2025-01-01T00:00:00Z',
        invariantId: 'INV-001',
        invariantHash: 'a'.repeat(64),
        region: 'PROVEN',
        metrics: createDefaultMetrics()
      });
      
      const result = fromJSON(json);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status');
    });
    
    it('should reject invalid region', () => {
      const json = JSON.stringify({
        id: 'test',
        version: '1.0.0',
        status: 'DRAFT',
        createdAt: '2025-01-01T00:00:00Z',
        modifiedAt: '2025-01-01T00:00:00Z',
        invariantId: 'INV-001',
        invariantHash: 'a'.repeat(64),
        region: 'INVALID_REGION',
        metrics: createDefaultMetrics()
      });
      
      const result = fromJSON(json);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid region');
    });
    
  });
  
  describe('toJSON', () => {
    
    it('should produce valid JSON string', () => {
      const artifact = createTestArtifact();
      const json = toJSON(artifact);
      expect(() => JSON.parse(json)).not.toThrow();
    });
    
    it('should support pretty printing', () => {
      const artifact = createTestArtifact();
      const pretty = toJSON(artifact, true);
      const compact = toJSON(artifact, false);
      expect(pretty.length).toBeGreaterThan(compact.length);
    });
    
  });
  
  describe('toYAML', () => {
    
    it('should produce YAML-like string', () => {
      const artifact = createTestArtifact();
      const yaml = toYAML(artifact);
      
      expect(yaml).toContain('id:');
      expect(yaml).toContain('version:');
      expect(yaml).toContain('metrics:');
    });
    
    it('should include header comment', () => {
      const artifact = createTestArtifact();
      const yaml = toYAML(artifact);
      expect(yaml).toContain('# OMEGA SENTINEL SUPREME');
    });
    
  });
  
  describe('serialize', () => {
    
    it('should support json format', () => {
      const artifact = createTestArtifact();
      const result = serialize(artifact, { format: 'json' });
      expect(() => JSON.parse(result)).not.toThrow();
    });
    
    it('should support yaml format', () => {
      const artifact = createTestArtifact();
      const result = serialize(artifact, { format: 'yaml' });
      expect(result).toContain('id:');
    });
    
    it('should support compact format', () => {
      const artifact = createTestArtifact();
      const result = serialize(artifact, { format: 'compact' });
      expect(result).not.toContain('\n');
    });
    
  });
  
  describe('isValidArtifactJSON', () => {
    
    it('should return true for valid JSON', () => {
      let artifact = createTestArtifact();
      artifact = sealArtifact(artifact);
      const json = toJSON(artifact);
      expect(isValidArtifactJSON(json)).toBe(true);
    });
    
    it('should return false for invalid JSON', () => {
      expect(isValidArtifactJSON('not json')).toBe(false);
    });
    
  });
  
  describe('getArtifactSummary', () => {
    
    it('should produce readable summary', () => {
      const artifact = createTestArtifact();
      const summary = getArtifactSummary(artifact);
      
      expect(summary).toContain('Artifact:');
      expect(summary).toContain('Status: DRAFT');
      expect(summary).toContain('Region: PROVEN');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
  
  it('isValidStatus should validate correctly', () => {
    expect(isValidStatus('DRAFT')).toBe(true);
    expect(isValidStatus('SEALED')).toBe(true);
    expect(isValidStatus('VERIFIED')).toBe(true);
    expect(isValidStatus('REVOKED')).toBe(true);
    expect(isValidStatus('INVALID')).toBe(false);
  });
  
  it('isValidEvidenceType should validate correctly', () => {
    expect(isValidEvidenceType('proof')).toBe(true);
    expect(isValidEvidenceType('falsification')).toBe(true);
    expect(isValidEvidenceType('assertion')).toBe(true);
    expect(isValidEvidenceType('reference')).toBe(true);
    expect(isValidEvidenceType('invalid')).toBe(false);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  it('hash computation should be deterministic', () => {
    const artifact = createTestArtifact();
    
    for (let i = 0; i < 10; i++) {
      const hash = computeArtifactHash(artifact);
      expect(hash).toBe(computeArtifactHash(artifact));
    }
  });
  
  it('serialization should be deterministic', () => {
    const artifact = createTestArtifact();
    
    const json1 = toJSON(artifact);
    const json2 = toJSON(artifact);
    expect(json1).toBe(json2);
  });
  
});
