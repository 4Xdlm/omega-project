/**
 * OMEGA NEXUS - Core Tests
 * 
 * Phase 24
 * 
 * Tests for core types, crypto utilities, and invariant registry.
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  OmegaModule,
  InvariantCategory,
  InvariantSeverity,
  ProofStatus,
  TestStatus,
  CertificationLevel,
  CertificationStatus,
  HealthStatus,
  AlertSeverity,
  
  // Factory functions
  moduleId,
  invariantId,
  testId,
  certificationHash,
  timestampMs,
  semanticVersion,
  commitHash,
  coveragePercent,
  confidenceLevel,
  
  // Type guards
  isProven,
  isVerified,
  isCritical,
  isCertified,
  isHealthy,
  
  // Constants
  ALL_MODULES,
  ALL_INVARIANT_CATEGORIES,
  ALL_INVARIANT_SEVERITIES,
  ALL_PROOF_STATUSES,
  ALL_TEST_STATUSES,
  ALL_CERTIFICATION_LEVELS,
  ALL_CERTIFICATION_STATUSES,
  ALL_HEALTH_STATUSES,
  ALL_ALERT_SEVERITIES,
  OMEGA_VERSION,
  OMEGA_CODENAME,
  CERTIFICATION_THRESHOLDS,
} from '../../src/core/types.js';

import {
  sha256,
  hashObject,
  hashMultiple,
  buildMerkleTree,
  getMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  hashInvariant,
  hashTestResult,
  hashFile,
  hashModule,
} from '../../src/core/crypto.js';

import {
  buildInvariantRegistry,
  getInvariant,
  getModuleInvariants,
  getCriticalInvariants,
  countByStatus,
  getRegistryStats,
  INVARIANT_REGISTRY,
  ALL_INVARIANTS,
} from '../../src/core/registry.js';

describe('Core Types', () => {
  describe('OmegaModule', () => {
    it('should have all expected modules', () => {
      expect(ALL_MODULES).toContain(OmegaModule.CHRONICLE);
      expect(ALL_MODULES).toContain(OmegaModule.ENVELOPE);
      expect(ALL_MODULES).toContain(OmegaModule.POLICY);
      expect(ALL_MODULES).toContain(OmegaModule.MEMORY);
      expect(ALL_MODULES).toContain(OmegaModule.REPLAY_GUARD);
      expect(ALL_MODULES).toContain(OmegaModule.WIRING);
      expect(ALL_MODULES).toContain(OmegaModule.CHAOS);
      expect(ALL_MODULES).toContain(OmegaModule.ADVERSARIAL);
      expect(ALL_MODULES).toContain(OmegaModule.TEMPORAL);
      expect(ALL_MODULES).toContain(OmegaModule.STRESS);
      expect(ALL_MODULES).toContain(OmegaModule.CRYSTAL);
      expect(ALL_MODULES).toContain(OmegaModule.NEXUS);
    });

    it('should have at least 14 modules', () => {
      expect(ALL_MODULES.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe('InvariantCategory', () => {
    it('should have all expected categories', () => {
      expect(ALL_INVARIANT_CATEGORIES).toContain(InvariantCategory.CLOSURE);
      expect(ALL_INVARIANT_CATEGORIES).toContain(InvariantCategory.BOUNDEDNESS);
      expect(ALL_INVARIANT_CATEGORIES).toContain(InvariantCategory.DETERMINISM);
      expect(ALL_INVARIANT_CATEGORIES).toContain(InvariantCategory.SAFETY);
      expect(ALL_INVARIANT_CATEGORIES).toContain(InvariantCategory.LIVENESS);
      expect(ALL_INVARIANT_CATEGORIES).toContain(InvariantCategory.INTEGRITY);
    });
  });

  describe('Factory Functions', () => {
    describe('moduleId', () => {
      it('should create unique IDs', () => {
        const id1 = moduleId();
        const id2 = moduleId();
        expect(id1).not.toBe(id2);
      });

      it('should accept custom value', () => {
        const id = moduleId('MY_MODULE');
        expect(id).toBe('MY_MODULE');
      });
    });

    describe('invariantId', () => {
      it('should accept valid format', () => {
        const id = invariantId('INV-CHAOS-01');
        expect(id).toBe('INV-CHAOS-01');
      });

      it('should reject invalid format', () => {
        expect(() => invariantId('invalid')).toThrow();
        expect(() => invariantId('INV-chaos-01')).toThrow();
      });
    });

    describe('semanticVersion', () => {
      it('should accept valid versions', () => {
        expect(semanticVersion('3.24.0')).toBe('3.24.0');
        expect(semanticVersion('1.0.0-alpha')).toBe('1.0.0-alpha');
      });

      it('should reject invalid versions', () => {
        expect(() => semanticVersion('invalid')).toThrow();
        expect(() => semanticVersion('3.24')).toThrow();
      });
    });

    describe('coveragePercent', () => {
      it('should accept valid percentages', () => {
        expect(coveragePercent(0)).toBe(0);
        expect(coveragePercent(50)).toBe(50);
        expect(coveragePercent(100)).toBe(100);
      });

      it('should reject invalid percentages', () => {
        expect(() => coveragePercent(-1)).toThrow();
        expect(() => coveragePercent(101)).toThrow();
      });
    });

    describe('confidenceLevel', () => {
      it('should accept valid levels', () => {
        expect(confidenceLevel(0)).toBe(0);
        expect(confidenceLevel(0.5)).toBe(0.5);
        expect(confidenceLevel(1)).toBe(1);
      });

      it('should reject invalid levels', () => {
        expect(() => confidenceLevel(-0.1)).toThrow();
        expect(() => confidenceLevel(1.1)).toThrow();
      });
    });

    describe('certificationHash', () => {
      it('should accept valid SHA-256 hex strings', () => {
        const validHash = 'a'.repeat(64);
        expect(certificationHash(validHash)).toBe(validHash);
      });

      it('should reject strings that are not 64 hex chars', () => {
        expect(() => certificationHash('short')).toThrow();
        expect(() => certificationHash('a'.repeat(63))).toThrow();
        expect(() => certificationHash('a'.repeat(65))).toThrow();
        expect(() => certificationHash('g'.repeat(64))).toThrow(); // non-hex
        expect(() => certificationHash('lolmdr1234567890')).toThrow(); // 16 chars, was bug
      });
    });

    describe('commitHash', () => {
      it('should accept valid git hashes', () => {
        expect(commitHash('abc1234')).toBe('abc1234');
        expect(commitHash('a'.repeat(40))).toBe('a'.repeat(40));
      });

      it('should reject invalid git hashes', () => {
        expect(() => commitHash('short')).toThrow(); // < 7
        expect(() => commitHash('HEAD')).toThrow(); // not hex
        expect(() => commitHash('g'.repeat(7))).toThrow(); // non-hex
      });
    });
  });

  describe('Constants', () => {
    it('should have OMEGA_VERSION defined', () => {
      expect(OMEGA_VERSION).toBe('3.24.0');
    });

    it('should have OMEGA_CODENAME defined', () => {
      expect(OMEGA_CODENAME).toBe('NEXUS');
    });

    it('should have CERTIFICATION_THRESHOLDS defined', () => {
      expect(CERTIFICATION_THRESHOLDS.DIAMOND.tests).toBe(1.0);
      expect(CERTIFICATION_THRESHOLDS.DIAMOND.invariants).toBe(1.0);
      expect(CERTIFICATION_THRESHOLDS.DIAMOND.coverage).toBe(1.0);
    });
  });
});

describe('Crypto Utilities', () => {
  describe('sha256', () => {
    it('should produce consistent hash', () => {
      const hash1 = sha256('test');
      const hash2 = sha256('test');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = sha256('test1');
      const hash2 = sha256('test2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex hash', () => {
      const hash = sha256('test');
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('hashObject', () => {
    it('should hash objects deterministically', () => {
      const obj = { a: 1, b: 2 };
      const hash1 = hashObject(obj);
      const hash2 = hashObject(obj);
      expect(hash1).toBe(hash2);
    });

    it('should produce same hash regardless of property order', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      expect(hashObject(obj1)).toBe(hashObject(obj2));
    });

    it('should canonicalize nested objects recursively', () => {
      const obj1 = { 
        outer: { z: 3, a: 1 }, 
        arr: [{ b: 2, a: 1 }] 
      };
      const obj2 = { 
        outer: { a: 1, z: 3 }, 
        arr: [{ a: 1, b: 2 }] 
      };
      // Nested keys should be sorted too
      expect(hashObject(obj1)).toBe(hashObject(obj2));
    });
  });

  describe('hashMultiple', () => {
    it('should hash multiple values', () => {
      const hash = hashMultiple('a', 'b', 'c');
      expect(hash.length).toBe(64);
    });

    it('should be order-sensitive', () => {
      const hash1 = hashMultiple('a', 'b');
      const hash2 = hashMultiple('b', 'a');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Merkle Tree', () => {
    it('should build tree from items', () => {
      const tree = buildMerkleTree(['a', 'b', 'c', 'd']);
      expect(tree.size).toBe(4);
      expect(tree.leaves.length).toBe(4);
      expect(tree.height).toBeGreaterThan(0);
    });

    it('should compute consistent root', () => {
      const root1 = getMerkleRoot(['a', 'b', 'c', 'd']);
      const root2 = getMerkleRoot(['a', 'b', 'c', 'd']);
      expect(root1).toBe(root2);
    });

    it('should produce different roots for different items', () => {
      const root1 = getMerkleRoot(['a', 'b', 'c', 'd']);
      const root2 = getMerkleRoot(['a', 'b', 'c', 'e']);
      expect(root1).not.toBe(root2);
    });

    it('should throw for empty items', () => {
      expect(() => buildMerkleTree([])).toThrow();
    });

    it('should generate and verify proof', () => {
      const items = ['a', 'b', 'c', 'd'];
      const tree = buildMerkleTree(items);
      const proof = generateMerkleProof(tree, 0);
      
      expect(proof.leaf).toBe(tree.leaves[0].hash);
      expect(proof.root).toBe(tree.root.hash);
      expect(verifyMerkleProof(proof)).toBe(true);
    });

    it('should handle single item', () => {
      const tree = buildMerkleTree(['single']);
      expect(tree.size).toBe(1);
      expect(tree.root.isLeaf).toBe(true);
    });
  });
});

describe('Invariant Registry', () => {
  describe('buildInvariantRegistry', () => {
    it('should build registry with all invariants', () => {
      const registry = buildInvariantRegistry();
      expect(registry.invariants.size).toBeGreaterThan(0);
    });

    it('should index by module', () => {
      const registry = buildInvariantRegistry();
      expect(registry.byModule.has(OmegaModule.CHAOS)).toBe(true);
      expect(registry.byModule.get(OmegaModule.CHAOS)!.length).toBeGreaterThan(0);
    });

    it('should index by category', () => {
      const registry = buildInvariantRegistry();
      expect(registry.byCategory.has(InvariantCategory.CLOSURE)).toBe(true);
    });

    it('should index by severity', () => {
      const registry = buildInvariantRegistry();
      expect(registry.bySeverity.has(InvariantSeverity.CRITICAL)).toBe(true);
    });

    it('should track critical invariants', () => {
      const registry = buildInvariantRegistry();
      expect(registry.critical.length).toBeGreaterThan(0);
    });
  });

  describe('getInvariant', () => {
    it('should find invariant by ID', () => {
      const inv = getInvariant(INVARIANT_REGISTRY, invariantId('INV-CHAOS-01'));
      expect(inv).toBeDefined();
      expect(inv!.name).toBe('Algebraic Closure');
    });

    it('should return undefined for unknown ID', () => {
      const inv = getInvariant(INVARIANT_REGISTRY, invariantId('INV-FAKE-99'));
      expect(inv).toBeUndefined();
    });
  });

  describe('getModuleInvariants', () => {
    it('should get all invariants for a module', () => {
      const invariants = getModuleInvariants(INVARIANT_REGISTRY, OmegaModule.CHAOS);
      expect(invariants.length).toBe(5);
      expect(invariants.every(i => i.module === OmegaModule.CHAOS)).toBe(true);
    });
  });

  describe('getCriticalInvariants', () => {
    it('should get all critical invariants', () => {
      const critical = getCriticalInvariants(INVARIANT_REGISTRY);
      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every(i => i.severity === InvariantSeverity.CRITICAL)).toBe(true);
    });
  });

  describe('countByStatus', () => {
    it('should count invariants by status', () => {
      const counts = countByStatus(INVARIANT_REGISTRY);
      expect(counts[ProofStatus.PROVEN]).toBeGreaterThan(0);
      expect(counts[ProofStatus.VERIFIED]).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRegistryStats', () => {
    it('should compute statistics', () => {
      const stats = getRegistryStats(INVARIANT_REGISTRY);
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.proven).toBeGreaterThan(0);
      expect(stats.critical).toBeGreaterThan(0);
      expect(stats.provenPercent).toBeGreaterThan(0);
    });
  });

  describe('ALL_INVARIANTS', () => {
    it('should contain all defined invariants', () => {
      expect(ALL_INVARIANTS.length).toBeGreaterThanOrEqual(49);
    });

    it('should have unique IDs', () => {
      const ids = ALL_INVARIANTS.map(i => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should all have hashes', () => {
      expect(ALL_INVARIANTS.every(i => i.hash.length === 64)).toBe(true);
    });
  });
});

describe('Type Guards', () => {
  it('isProven should correctly identify proven invariants', () => {
    const proven = ALL_INVARIANTS.find(i => i.status === ProofStatus.PROVEN)!;
    const verified = ALL_INVARIANTS.find(i => i.status === ProofStatus.VERIFIED);
    
    expect(isProven(proven)).toBe(true);
    if (verified) {
      expect(isProven(verified)).toBe(false);
    }
  });

  it('isVerified should include both proven and verified', () => {
    const proven = ALL_INVARIANTS.find(i => i.status === ProofStatus.PROVEN)!;
    expect(isVerified(proven)).toBe(true);
  });

  it('isCritical should correctly identify critical invariants', () => {
    const critical = getCriticalInvariants(INVARIANT_REGISTRY)[0];
    expect(isCritical(critical)).toBe(true);
  });
});
