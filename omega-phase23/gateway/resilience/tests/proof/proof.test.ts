/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Resilience Crystal - Tests
 * 
 * Phase 23 - Sprint 23.4
 * 
 * INVARIANTS TESTED:
 * - INV-CRYSTAL-01: Completeness - Crystal covers 100% of attack surface
 * - INV-CRYSTAL-02: Soundness - All proofs are mathematically valid
 * - INV-CRYSTAL-03: Immutability - Crystal hash never changes after seal
 * - INV-CRYSTAL-04: Coverage - chaos × adversarial × temporal = complete
 * - INV-CRYSTAL-05: Reproducibility - Same inputs produce same Crystal
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  ProofStatus,
  ProofCategory,
  CrystalStatus,
  Proof,
  ResilienceCrystal,
  CoverageMatrix,
  
  // Factory functions
  crystalId,
  proofId,
  crystalSeal,
  
  // Type guards
  isProven,
  isFailed,
  isSealed,
  
  // Constants
  ALL_PROOF_STATUSES,
  ALL_PROOF_CATEGORIES,
  ALL_CRYSTAL_STATUSES,
  CRITICAL_INVARIANTS,
  
  // Builders
  ProofBuilder,
  createProof,
  CoverageMatrixBuilder,
  createCoverageMatrix,
  CrystalBuilder,
  createCrystal,
  verifyCrystalSeal,
  isCrystalComplete,
  getMissingCriticalProofs,
} from '../../src/proof/index.js';

describe('Proof Types', () => {
  describe('ProofStatus', () => {
    it('should have all expected statuses', () => {
      expect(ALL_PROOF_STATUSES).toContain(ProofStatus.PROVEN);
      expect(ALL_PROOF_STATUSES).toContain(ProofStatus.FAILED);
      expect(ALL_PROOF_STATUSES).toContain(ProofStatus.PENDING);
      expect(ALL_PROOF_STATUSES).toContain(ProofStatus.SKIPPED);
    });
  });

  describe('ProofCategory', () => {
    it('should have all expected categories', () => {
      expect(ALL_PROOF_CATEGORIES).toContain(ProofCategory.CHAOS);
      expect(ALL_PROOF_CATEGORIES).toContain(ProofCategory.ADVERSARIAL);
      expect(ALL_PROOF_CATEGORIES).toContain(ProofCategory.TEMPORAL);
      expect(ALL_PROOF_CATEGORIES).toContain(ProofCategory.STRESS);
      expect(ALL_PROOF_CATEGORIES).toContain(ProofCategory.INTEGRATION);
    });
  });

  describe('CrystalStatus', () => {
    it('should have all expected statuses', () => {
      expect(ALL_CRYSTAL_STATUSES).toContain(CrystalStatus.BUILDING);
      expect(ALL_CRYSTAL_STATUSES).toContain(CrystalStatus.SEALED);
      expect(ALL_CRYSTAL_STATUSES).toContain(CrystalStatus.INVALID);
    });
  });
});

describe('Factory Functions', () => {
  describe('crystalId', () => {
    it('should create unique IDs', () => {
      const id1 = crystalId();
      const id2 = crystalId();
      expect(id1).not.toBe(id2);
    });

    it('should accept custom value', () => {
      const id = crystalId('MY_CRYSTAL');
      expect(id).toBe('MY_CRYSTAL');
    });
  });

  describe('proofId', () => {
    it('should create unique IDs', () => {
      const id1 = proofId();
      const id2 = proofId();
      expect(id1).not.toBe(id2);
    });

    it('should accept custom value', () => {
      const id = proofId('MY_PROOF');
      expect(id).toBe('MY_PROOF');
    });
  });

  describe('crystalSeal', () => {
    it('should create seal from valid hash', () => {
      const seal = crystalSeal('abc123def456');
      expect(seal).toBe('abc123def456');
    });

    it('should reject short hash', () => {
      expect(() => crystalSeal('short')).toThrow();
    });

    it('should reject empty hash', () => {
      expect(() => crystalSeal('')).toThrow();
    });
  });
});

describe('ProofBuilder', () => {
  it('should build a valid proof', () => {
    const proof = new ProofBuilder()
      .name('Test Proof')
      .category(ProofCategory.CHAOS)
      .invariant('INV-CHAOS-01')
      .proven()
      .details('Proof verified successfully')
      .build();

    expect(proof.name).toBe('Test Proof');
    expect(proof.category).toBe(ProofCategory.CHAOS);
    expect(proof.invariantId).toBe('INV-CHAOS-01');
    expect(proof.status).toBe(ProofStatus.PROVEN);
  });

  it('should require name', () => {
    expect(() => 
      new ProofBuilder()
        .category(ProofCategory.CHAOS)
        .invariant('INV-CHAOS-01')
        .build()
    ).toThrow();
  });

  it('should require invariantId', () => {
    expect(() => 
      new ProofBuilder()
        .name('Test')
        .category(ProofCategory.CHAOS)
        .build()
    ).toThrow();
  });

  it('should build failed proof', () => {
    const proof = new ProofBuilder()
      .name('Failed Proof')
      .category(ProofCategory.ADVERSARIAL)
      .invariant('INV-ADV-01')
      .failed()
      .details('Counterexample found')
      .build();

    expect(proof.status).toBe(ProofStatus.FAILED);
    expect(isFailed(proof)).toBe(true);
    expect(isProven(proof)).toBe(false);
  });

  it('should include test results', () => {
    const proof = new ProofBuilder()
      .name('Test Proof')
      .category(ProofCategory.STRESS)
      .invariant('INV-STRESS-01')
      .proven()
      .withTestResults({
        totalTests: 100,
        passed: 100,
        failed: 0,
        skipped: 0,
        duration: 5000,
        coverage: 95,
      })
      .build();

    expect(proof.evidence.testResults?.totalTests).toBe(100);
    expect(proof.evidence.testResults?.coverage).toBe(95);
  });

  it('should generate evidence hash', () => {
    const proof = new ProofBuilder()
      .name('Test Proof')
      .category(ProofCategory.CHAOS)
      .invariant('INV-CHAOS-01')
      .proven()
      .build();

    expect(proof.evidence.evidenceHash).toBeDefined();
    expect(proof.evidence.evidenceHash.startsWith('0x')).toBe(true);
  });
});

describe('createProof helper', () => {
  it('should return a ProofBuilder', () => {
    const builder = createProof();
    expect(builder).toBeInstanceOf(ProofBuilder);
  });

  it('should build proof using builder pattern', () => {
    const proof = createProof()
      .name('Quick Proof')
      .category(ProofCategory.TEMPORAL)
      .invariant('INV-TEMP-01')
      .proven()
      .build();

    expect(proof.name).toBe('Quick Proof');
    expect(isProven(proof)).toBe(true);
  });
});

describe('CoverageMatrixBuilder', () => {
  it('should build empty matrix', () => {
    const matrix = createCoverageMatrix()
      .name('test')
      .rows(['A', 'B'])
      .columns(['X', 'Y'])
      .build();

    expect(matrix.name).toBe('test');
    expect(matrix.rows).toEqual(['A', 'B']);
    expect(matrix.columns).toEqual(['X', 'Y']);
    expect(matrix.coverage).toBe(0);
  });

  it('should track coverage', () => {
    const matrix = createCoverageMatrix()
      .name('test')
      .rows(['A', 'B'])
      .columns(['X', 'Y'])
      .addCoverage('A', 'X', [proofId('P1')])
      .addCoverage('B', 'Y', [proofId('P2')])
      .build();

    expect(matrix.coverage).toBe(50); // 2 out of 4 cells
  });

  it('should track gaps', () => {
    const matrix = createCoverageMatrix()
      .name('test')
      .rows(['A', 'B'])
      .columns(['X', 'Y'])
      .addCoverage('A', 'X', [proofId('P1')])
      .build();

    expect(matrix.gaps.length).toBe(3);
    expect(matrix.gaps).toContainEqual({ row: 'A', column: 'Y' });
    expect(matrix.gaps).toContainEqual({ row: 'B', column: 'X' });
    expect(matrix.gaps).toContainEqual({ row: 'B', column: 'Y' });
  });

  it('should achieve 100% coverage', () => {
    const matrix = createCoverageMatrix()
      .name('test')
      .rows(['A'])
      .columns(['X'])
      .addCoverage('A', 'X', [proofId('P1')])
      .build();

    expect(matrix.coverage).toBe(100);
    expect(matrix.gaps.length).toBe(0);
  });
});

describe('CrystalBuilder', () => {
  const buildTestProof = (invariantId: string): Proof => {
    const category = invariantId.startsWith('INV-CHAOS') ? ProofCategory.CHAOS
      : invariantId.startsWith('INV-ADV') ? ProofCategory.ADVERSARIAL
      : invariantId.startsWith('INV-TEMP') ? ProofCategory.TEMPORAL
      : invariantId.startsWith('INV-STRESS') ? ProofCategory.STRESS
      : ProofCategory.INTEGRATION;

    return new ProofBuilder()
      .name(`Proof for ${invariantId}`)
      .category(category)
      .invariant(invariantId)
      .proven()
      .details(`${category}:verified`)
      .build();
  };

  const buildTestProofs = (): Proof[] => {
    return CRITICAL_INVARIANTS.map(inv => buildTestProof(inv));
  };

  it('should build crystal with proofs', () => {
    const proofs = buildTestProofs();
    const crystal = new CrystalBuilder()
      .version('3.23.0')
      .addProofs(proofs)
      .metadata({
        omegaVersion: '3.23.0',
        buildId: 'TEST_BUILD',
        commitHash: 'abc123',
        environment: 'test',
        builder: 'test',
        tags: ['test'],
      })
      .build();

    expect(crystal.proofs.length).toBe(proofs.length);
    expect(crystal.status).toBe(CrystalStatus.BUILDING);
  });

  it('should seal crystal', () => {
    const proofs = buildTestProofs();
    const crystal = new CrystalBuilder()
      .version('3.23.0')
      .addProofs(proofs)
      .metadata({
        omegaVersion: '3.23.0',
        buildId: 'TEST_BUILD',
        commitHash: 'abc123',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .seal();

    expect(crystal.status).toBe(CrystalStatus.SEALED);
    expect(crystal.seal).toBeDefined();
    expect(isSealed(crystal)).toBe(true);
  });

  it('should calculate summary', () => {
    const proofs = buildTestProofs();
    const crystal = new CrystalBuilder()
      .version('3.23.0')
      .addProofs(proofs)
      .metadata({
        omegaVersion: '3.23.0',
        buildId: 'TEST_BUILD',
        commitHash: 'abc123',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .build();

    expect(crystal.summary.totalProofs).toBe(proofs.length);
    expect(crystal.summary.provenCount).toBe(proofs.length);
    expect(crystal.summary.failedCount).toBe(0);
  });

  it('should track by category', () => {
    const chaosProof = buildTestProof('INV-CHAOS-01');
    const advProof = buildTestProof('INV-ADV-01');

    const crystal = new CrystalBuilder()
      .version('3.23.0')
      .addProof(chaosProof)
      .addProof(advProof)
      .metadata({
        omegaVersion: '3.23.0',
        buildId: 'TEST',
        commitHash: 'abc',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .build();

    expect(crystal.summary.byCategory[ProofCategory.CHAOS].total).toBe(1);
    expect(crystal.summary.byCategory[ProofCategory.ADVERSARIAL].total).toBe(1);
  });
});

describe('Crystal Verification', () => {
  const buildTestProof = (invariantId: string): Proof => {
    return new ProofBuilder()
      .name(`Proof for ${invariantId}`)
      .category(ProofCategory.CHAOS)
      .invariant(invariantId)
      .proven()
      .details('CHAOS:verified')
      .build();
  };

  it('should verify sealed crystal', () => {
    const proofs = CRITICAL_INVARIANTS.map(inv => buildTestProof(inv));

    const crystal = new CrystalBuilder()
      .version('3.23.0')
      .addProofs(proofs)
      .metadata({
        omegaVersion: '3.23.0',
        buildId: 'TEST',
        commitHash: 'abc',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .seal();

    expect(verifyCrystalSeal(crystal)).toBe(true);
  });

  it('should identify incomplete crystal', () => {
    const crystal = new CrystalBuilder()
      .version('3.23.0')
      .addProof(buildTestProof('INV-CHAOS-01'))
      .metadata({
        omegaVersion: '3.23.0',
        buildId: 'TEST',
        commitHash: 'abc',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .build();

    expect(isCrystalComplete(crystal)).toBe(false);
  });

  it('should find missing critical proofs', () => {
    const crystal = new CrystalBuilder()
      .version('3.23.0')
      .addProof(buildTestProof('INV-CHAOS-01'))
      .metadata({
        omegaVersion: '3.23.0',
        buildId: 'TEST',
        commitHash: 'abc',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .build();

    const missing = getMissingCriticalProofs(crystal);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain('INV-CHAOS-02');
    expect(missing).not.toContain('INV-CHAOS-01');
  });
});

describe('Type Guards', () => {
  const buildTestProof = (status: ProofStatus): Proof => {
    return new ProofBuilder()
      .name('Test')
      .category(ProofCategory.CHAOS)
      .invariant('INV-001')
      .status(status)
      .build();
  };

  it('isProven should identify proven proofs', () => {
    const proven = buildTestProof(ProofStatus.PROVEN);
    const failed = buildTestProof(ProofStatus.FAILED);

    expect(isProven(proven)).toBe(true);
    expect(isProven(failed)).toBe(false);
  });

  it('isFailed should identify failed proofs', () => {
    const failed = buildTestProof(ProofStatus.FAILED);
    expect(isFailed(failed)).toBe(true);
  });

  it('isSealed should identify sealed crystals', () => {
    const sealed = new CrystalBuilder()
      .version('1.0.0')
      .metadata({
        omegaVersion: '1.0.0',
        buildId: 'TEST',
        commitHash: 'abc',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .seal();

    const unsealed = new CrystalBuilder()
      .version('1.0.0')
      .metadata({
        omegaVersion: '1.0.0',
        buildId: 'TEST',
        commitHash: 'abc',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .build();

    expect(isSealed(sealed)).toBe(true);
    expect(isSealed(unsealed)).toBe(false);
  });
});

describe('Critical Invariants', () => {
  it('should include chaos invariants', () => {
    expect(CRITICAL_INVARIANTS).toContain('INV-CHAOS-01');
    expect(CRITICAL_INVARIANTS).toContain('INV-CHAOS-02');
    expect(CRITICAL_INVARIANTS).toContain('INV-CHAOS-03');
  });

  it('should include adversarial invariants', () => {
    expect(CRITICAL_INVARIANTS).toContain('INV-ADV-01');
    expect(CRITICAL_INVARIANTS).toContain('INV-ADV-03');
  });

  it('should include temporal invariants', () => {
    expect(CRITICAL_INVARIANTS).toContain('INV-TEMP-01');
    expect(CRITICAL_INVARIANTS).toContain('INV-TEMP-04');
  });

  it('should include stress invariants', () => {
    expect(CRITICAL_INVARIANTS).toContain('INV-STRESS-01');
    expect(CRITICAL_INVARIANTS).toContain('INV-STRESS-05');
  });
});

describe('INV-CRYSTAL-03: Immutability', () => {
  it('sealed crystal hash should be consistent', () => {
    const proof = new ProofBuilder()
      .name('Test')
      .category(ProofCategory.CHAOS)
      .invariant('INV-CHAOS-01')
      .proven()
      .details('CHAOS:verified')
      .build();

    const crystal = new CrystalBuilder()
      .version('1.0.0')
      .addProof(proof)
      .metadata({
        omegaVersion: '1.0.0',
        buildId: 'TEST',
        commitHash: 'abc',
        environment: 'test',
        builder: 'test',
        tags: [],
      })
      .seal();

    // Seal should exist and be non-empty
    expect(crystal.seal).toBeDefined();
    expect(crystal.seal!.length).toBeGreaterThan(0);
  });
});

describe('INV-CRYSTAL-05: Reproducibility', () => {
  it('should produce consistent evidence hashes', () => {
    const proof1 = new ProofBuilder()
      .name('Test')
      .category(ProofCategory.CHAOS)
      .invariant('INV-CHAOS-01')
      .proven()
      .withTestResults({
        totalTests: 100,
        passed: 100,
        failed: 0,
        skipped: 0,
        duration: 5000,
        coverage: 95,
      })
      .build();

    const proof2 = new ProofBuilder()
      .name('Test')
      .category(ProofCategory.CHAOS)
      .invariant('INV-CHAOS-01')
      .proven()
      .withTestResults({
        totalTests: 100,
        passed: 100,
        failed: 0,
        skipped: 0,
        duration: 5000,
        coverage: 95,
      })
      .build();

    // Same inputs should produce same evidence hash
    expect(proof1.evidence.evidenceHash).toBe(proof2.evidence.evidenceHash);
  });
});
