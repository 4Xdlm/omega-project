/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — SELF SEAL TESTS
 * Sprint 27.3 — Cryptographic Self-Certification
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for INV-SEAL-01 through INV-SEAL-07
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  // Version & constants
  SEAL_VERSION,
  MANDATORY_BOUNDARY_IDS,
  BOUNDARY_SUMMARIES,
  
  // Types
  type SelfSeal,
  type SelfSealCore,
  type SealReferences,
  type SealAttestation,
  type SealLimitation,
  type InventoryData,
  
  // Serialization & hash
  canonicalSerialize,
  computeSealHash,
  computeInventoryHash,
  
  // Reference factories
  createBoundaryLedgerReference,
  createInventoryReference,
  createSurvivalProofReference,
  
  // Limitations
  createMandatoryLimitations,
  
  // Verdict
  computeVerdict,
  
  // Attestation
  createAttestation,
  
  // Core & Meta
  createSealCore,
  createSealMeta,
  generateRunId,
  detectEnvironment,
  
  // Main factory
  createSelfSeal,
  
  // Validation
  validateSeal,
  
  // Queries
  isSealed,
  isBreached,
  getLimitationIds,
  getSurvivalRate,
  
  // Formatting
  formatSealSummary,
  formatSealReference,
} from '../self/seal.js';

import {
  createDefaultBoundaryLedger,
  MANDATORY_BOUNDARIES,
  EXPECTED_BOUNDARY_COUNT,
} from '../meta/boundary_ledger.default.js';

import { computeBoundaryLedgerHash } from '../meta/boundary_ledger.js';

import type { FalsificationReport, FalsificationSummary } from '../self/survival-proof.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockFalsificationReport(
  verdict: 'PASS' | 'FAIL' = 'PASS',
  seed: number = 42
): FalsificationReport {
  const summary: FalsificationSummary = {
    invariantsTested: 76,
    invariantsSurvived: verdict === 'PASS' ? 76 : 75,
    invariantsBreached: verdict === 'PASS' ? 0 : 1,
    invariantsSkipped: 0,
    totalAttempts: 380,
    overallSurvivalRate: verdict === 'PASS' ? 1.0 : 0.9868,
    breachedIds: verdict === 'PASS' ? [] : ['INV-FAKE-01'],
    verdict,
  };
  
  return {
    version: '1.0.0',
    runId: 'TEST-RUN-001',
    seed,
    startTime: '2026-01-07T10:00:00.000Z',
    endTime: '2026-01-07T10:00:01.000Z',
    durationMs: 1000,
    totalInvariants: 76,
    totalAttacks: 380,
    proofs: [],
    summary,
    reportHash: 'abc123def456789abcdef0123456789abcdef0123456789abcdef0123456789ab',
  };
}

function createTestReferences(report?: FalsificationReport): SealReferences {
  const ledger = createDefaultBoundaryLedger();
  const ledgerHash = computeBoundaryLedgerHash(ledger);
  
  return {
    boundaryLedger: createBoundaryLedgerReference(ledger, ledgerHash),
    inventory: createInventoryReference(
      'inventory_hash_123456789abcdef0123456789abcdef0123456789abcdef01234567',
      80,
      { PURE: 76, SYSTEM: 3, CONTEXTUAL: 1 }
    ),
    survivalProof: createSurvivalProofReference(report ?? createMockFalsificationReport()),
  };
}

function createTestAttestation(
  survived = true,
  pureTotal = 76,
  attacked = 76
): SealAttestation {
  return createAttestation({
    pureTotal,
    pureAttacked: attacked,
    pureSurvived: survived ? attacked : attacked - 1,
    stopOnFirstBreach: true,
    deterministic: true,
    proofVerdict: survived ? 'SURVIVED' : 'BREACHED',
  });
}

function createTestLimitations(): readonly SealLimitation[] {
  const ledger = createDefaultBoundaryLedger();
  return createMandatoryLimitations(ledger);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seal Constants', () => {
  it('should have version 1.0.0', () => {
    expect(SEAL_VERSION).toBe('1.0.0');
  });
  
  it('should have 6 mandatory boundary IDs', () => {
    expect(MANDATORY_BOUNDARY_IDS).toHaveLength(6);
    expect(MANDATORY_BOUNDARY_IDS).toContain('BOUND-001');
    expect(MANDATORY_BOUNDARY_IDS).toContain('BOUND-005');
    expect(MANDATORY_BOUNDARY_IDS).toContain('BOUND-011');
    expect(MANDATORY_BOUNDARY_IDS).toContain('BOUND-015');
  });
  
  it('should have summaries for all mandatory boundaries', () => {
    for (const id of MANDATORY_BOUNDARY_IDS) {
      expect(BOUNDARY_SUMMARIES[id]).toBeDefined();
      expect(typeof BOUNDARY_SUMMARIES[id]).toBe('string');
      expect(BOUNDARY_SUMMARIES[id].length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SEAL-01: sealHash = SHA256(canonicalSerialize(core))
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-SEAL-01: sealHash = SHA256(canonicalSerialize(core))', () => {
  it('should compute deterministic seal hash', () => {
    const core = createSealCore({
      references: createTestReferences(),
      attestation: createTestAttestation(),
      limitations: createTestLimitations(),
    });
    
    const hash1 = computeSealHash(core);
    const hash2 = computeSealHash(core);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });
  
  it('should produce different hash for different core', () => {
    const core1 = createSealCore({
      references: createTestReferences(),
      attestation: createTestAttestation(true, 76),
      limitations: createTestLimitations(),
    });
    
    const core2 = createSealCore({
      references: createTestReferences(),
      attestation: createTestAttestation(true, 80), // Different total
      limitations: createTestLimitations(),
    });
    
    expect(computeSealHash(core1)).not.toBe(computeSealHash(core2));
  });
  
  it('should verify hash on validation', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const result = validateSeal(seal);
    expect(result.hashValid).toBe(true);
  });
  
  it('should detect hash tampering', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    // Tamper with hash
    const tampered = {
      ...seal,
      sealHash: 'bad_hash_0123456789abcdef0123456789abcdef0123456789abcdef01234',
    };
    
    const result = validateSeal(tampered);
    expect(result.hashValid).toBe(false);
    expect(result.errors.some(e => e.includes('INV-SEAL-01'))).toBe(true);
  });
  
  it('should use canonical serialization (sorted keys)', () => {
    const core = createSealCore({
      references: createTestReferences(),
      attestation: createTestAttestation(),
      limitations: createTestLimitations(),
    });
    
    const serialized = canonicalSerialize(core);
    
    // Verify it's valid JSON
    const parsed = JSON.parse(serialized);
    expect(parsed).toBeDefined();
    
    // Verify keys are sorted
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SEAL-02: Referenced hashes exist
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-SEAL-02: Referenced hashes exist', () => {
  it('should include boundary ledger reference', () => {
    const ledger = createDefaultBoundaryLedger();
    const ledgerHash = computeBoundaryLedgerHash(ledger);
    const ref = createBoundaryLedgerReference(ledger, ledgerHash);
    
    expect(ref.ledgerHash).toBe(ledgerHash);
    expect(ref.version).toBe('1.0.0');
    expect(ref.boundaryCount).toBe(EXPECTED_BOUNDARY_COUNT);
  });
  
  it('should include inventory reference', () => {
    const ref = createInventoryReference(
      'hash123',
      80,
      { PURE: 76, SYSTEM: 3, CONTEXTUAL: 1 }
    );
    
    expect(ref.inventoryHash).toBe('hash123');
    expect(ref.invariantCount).toBe(80);
    expect(ref.categories.PURE).toBe(76);
  });
  
  it('should include survival proof reference', () => {
    const report = createMockFalsificationReport('PASS', 42);
    const ref = createSurvivalProofReference(report);
    
    expect(ref.proofHash).toBe(report.reportHash);
    expect(ref.seed).toBe(42);
    expect(ref.verdict).toBe('SURVIVED');
  });
  
  it('should reference BREACHED verdict correctly', () => {
    const report = createMockFalsificationReport('FAIL', 123);
    const ref = createSurvivalProofReference(report);
    
    expect(ref.verdict).toBe('BREACHED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SEAL-03: SEALED verdict logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-SEAL-03: SEALED verdict logic', () => {
  it('should return SEALED when all conditions met', () => {
    const verdict = computeVerdict(
      { total: 76, attacked: 76, survived: 76 },
      'SURVIVED'
    );
    expect(verdict).toBe('SEALED');
  });
  
  it('should return BREACHED when proof verdict is BREACHED', () => {
    const verdict = computeVerdict(
      { total: 76, attacked: 76, survived: 76 },
      'BREACHED'
    );
    expect(verdict).toBe('BREACHED');
  });
  
  it('should return INCOMPLETE when not all attacked', () => {
    const verdict = computeVerdict(
      { total: 76, attacked: 50, survived: 50 },
      'SURVIVED'
    );
    expect(verdict).toBe('INCOMPLETE');
  });
  
  it('should return INCOMPLETE when not all survived', () => {
    const verdict = computeVerdict(
      { total: 76, attacked: 76, survived: 75 },
      'SURVIVED'
    );
    expect(verdict).toBe('INCOMPLETE');
  });
  
  it('should validate verdict in seal', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(true, 76, 76),
        limitations: createTestLimitations(),
      },
    });
    
    const result = validateSeal(seal);
    expect(result.verdictValid).toBe(true);
    expect(seal.core.attestation.verdict).toBe('SEALED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SEAL-04: limitations.length >= 1
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-SEAL-04: limitations.length >= 1', () => {
  it('should have at least 1 limitation from mandatory boundaries', () => {
    const limitations = createTestLimitations();
    expect(limitations.length).toBeGreaterThanOrEqual(1);
  });
  
  it('should have exactly 6 mandatory limitations', () => {
    const limitations = createTestLimitations();
    expect(limitations).toHaveLength(6);
  });
  
  it('should throw if no limitations provided', () => {
    const ledger = createDefaultBoundaryLedger();
    expect(() => createMandatoryLimitations(ledger, [])).toThrow('INV-SEAL-04');
  });
  
  it('should validate limitations count in seal', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const result = validateSeal(seal);
    expect(result.limitationsValid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SEAL-05: Each boundaryId exists in ledger
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-SEAL-05: Each boundaryId exists in ledger', () => {
  it('should throw if boundaryId not in ledger', () => {
    const ledger = createDefaultBoundaryLedger();
    expect(() => createMandatoryLimitations(ledger, ['BOUND-999'])).toThrow('INV-SEAL-05');
    expect(() => createMandatoryLimitations(ledger, ['BOUND-999'])).toThrow('BOUND-999');
  });
  
  it('should accept valid boundary IDs', () => {
    const ledger = createDefaultBoundaryLedger();
    const limitations = createMandatoryLimitations(ledger, ['BOUND-001', 'BOUND-005']);
    
    expect(limitations).toHaveLength(2);
    expect(limitations[0].boundaryId).toBe('BOUND-001');
    expect(limitations[1].boundaryId).toBe('BOUND-005');
  });
  
  it('should validate boundary IDs against ledger', () => {
    const ledger = createDefaultBoundaryLedger();
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const result = validateSeal(seal, ledger);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should detect invalid boundary ID in validation', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: [{ boundaryId: 'BOUND-999', summary: 'Fake' }],
      },
    });
    
    const ledger = createDefaultBoundaryLedger();
    const result = validateSeal(seal, ledger);
    
    expect(result.errors.some(e => e.includes('INV-SEAL-05'))).toBe(true);
    expect(result.errors.some(e => e.includes('BOUND-999'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SEAL-06: No copies (seal doesn't contain full lists)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-SEAL-06: No copies (seal doesn\'t contain full lists)', () => {
  it('should only contain hash references, not full boundaries', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    // Check boundary ledger reference only has hash, not entries
    const ledgerRef = seal.core.references.boundaryLedger;
    expect(ledgerRef.ledgerHash).toBeDefined();
    expect(ledgerRef.boundaryCount).toBeDefined();
    expect((ledgerRef as unknown as { boundaries?: unknown }).boundaries).toBeUndefined();
  });
  
  it('should only contain inventory hash, not full invariant list', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const invRef = seal.core.references.inventory;
    expect(invRef.inventoryHash).toBeDefined();
    expect(invRef.invariantCount).toBeDefined();
    expect((invRef as unknown as { invariants?: unknown }).invariants).toBeUndefined();
  });
  
  it('should only contain proof hash, not full proof list', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const proofRef = seal.core.references.survivalProof;
    expect(proofRef.proofHash).toBeDefined();
    expect(proofRef.seed).toBeDefined();
    expect((proofRef as unknown as { proofs?: unknown }).proofs).toBeUndefined();
  });
  
  it('should have minimal seal size (no bloat)', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const serialized = JSON.stringify(seal);
    // Seal should be compact - under 2KB typically
    expect(serialized.length).toBeLessThan(3000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SEAL-07: Cross-run determinism
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-SEAL-07: Cross-run determinism', () => {
  it('should produce same sealHash with same inputs (20-run gate)', () => {
    const references = createTestReferences();
    const attestation = createTestAttestation();
    const limitations = createTestLimitations();
    
    const hashes = new Set<string>();
    
    for (let i = 0; i < 20; i++) {
      const core = createSealCore({ references, attestation, limitations });
      const hash = computeSealHash(core);
      hashes.add(hash);
    }
    
    // All 20 runs should produce identical hash
    expect(hashes.size).toBe(1);
  });
  
  it('should produce same canonical serialization across runs', () => {
    const references = createTestReferences();
    const attestation = createTestAttestation();
    const limitations = createTestLimitations();
    
    const serializations = new Set<string>();
    
    for (let i = 0; i < 20; i++) {
      const core = createSealCore({ references, attestation, limitations });
      serializations.add(canonicalSerialize(core));
    }
    
    expect(serializations.size).toBe(1);
  });
  
  it('should produce different sealHash only when inputs differ', () => {
    const references = createTestReferences();
    const attestation1 = createTestAttestation(true, 76);
    const attestation2 = createTestAttestation(true, 80);
    const limitations = createTestLimitations();
    
    const core1 = createSealCore({ references, attestation: attestation1, limitations });
    const core2 = createSealCore({ references, attestation: attestation2, limitations });
    
    expect(computeSealHash(core1)).not.toBe(computeSealHash(core2));
  });
  
  it('meta changes should NOT affect sealHash', () => {
    const coreInput = {
      references: createTestReferences(),
      attestation: createTestAttestation(),
      limitations: createTestLimitations(),
    };
    
    const seal1 = createSelfSeal({
      core: coreInput,
      meta: { sealedAt: '2026-01-01T00:00:00.000Z', runId: 'RUN-1' },
    });
    
    const seal2 = createSelfSeal({
      core: coreInput,
      meta: { sealedAt: '2026-12-31T23:59:59.999Z', runId: 'RUN-2' },
    });
    
    // Different meta, same sealHash
    expect(seal1.meta.sealedAt).not.toBe(seal2.meta.sealedAt);
    expect(seal1.meta.runId).not.toBe(seal2.meta.runId);
    expect(seal1.sealHash).toBe(seal2.sealHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY HASH
// ═══════════════════════════════════════════════════════════════════════════════

describe('Inventory Hash', () => {
  it('should compute deterministic hash for inventory', () => {
    const inventory: InventoryData = {
      records: [
        { id: 'INV-ART-01', module: 'artifact', category: 'PURE' },
        { id: 'INV-ART-02', module: 'artifact', category: 'PURE' },
        { id: 'INV-META-01', module: 'meta', category: 'SYSTEM' },
      ],
    };
    
    const hash1 = computeInventoryHash(inventory);
    const hash2 = computeInventoryHash(inventory);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
  
  it('should produce same hash regardless of input order', () => {
    const inventory1: InventoryData = {
      records: [
        { id: 'INV-ART-01', module: 'artifact', category: 'PURE' },
        { id: 'INV-ART-02', module: 'artifact', category: 'PURE' },
      ],
    };
    
    const inventory2: InventoryData = {
      records: [
        { id: 'INV-ART-02', module: 'artifact', category: 'PURE' },
        { id: 'INV-ART-01', module: 'artifact', category: 'PURE' },
      ],
    };
    
    expect(computeInventoryHash(inventory1)).toBe(computeInventoryHash(inventory2));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// META UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seal Meta', () => {
  it('should generate unique run IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRunId());
    }
    expect(ids.size).toBe(100);
  });
  
  it('should detect environment', () => {
    const env = detectEnvironment();
    expect(['linux', 'win32', 'darwin', 'unknown']).toContain(env);
  });
  
  it('should create meta with defaults', () => {
    const meta = createSealMeta();
    
    expect(meta.sealedAt).toBeDefined();
    expect(meta.sealedBy).toBe('OMEGA SENTINEL');
    expect(meta.runId).toMatch(/^SEAL-/);
    expect(meta.environment).toBeDefined();
  });
  
  it('should allow custom meta values', () => {
    const meta = createSealMeta({
      sealedAt: '2026-01-07T12:00:00.000Z',
      sealedBy: 'TEST',
      runId: 'CUSTOM-001',
      environment: 'test',
    });
    
    expect(meta.sealedAt).toBe('2026-01-07T12:00:00.000Z');
    expect(meta.sealedBy).toBe('TEST');
    expect(meta.runId).toBe('CUSTOM-001');
    expect(meta.environment).toBe('test');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seal Queries', () => {
  it('isSealed should return true for SEALED verdict', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(true, 76, 76),
        limitations: createTestLimitations(),
      },
    });
    
    expect(isSealed(seal)).toBe(true);
    expect(isBreached(seal)).toBe(false);
  });
  
  it('isBreached should return true for BREACHED verdict', () => {
    const report = createMockFalsificationReport('FAIL');
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(report),
        attestation: createAttestation({
          pureTotal: 76,
          pureAttacked: 76,
          pureSurvived: 75,
          stopOnFirstBreach: true,
          deterministic: true,
          proofVerdict: 'BREACHED',
        }),
        limitations: createTestLimitations(),
      },
    });
    
    expect(isBreached(seal)).toBe(true);
    expect(isSealed(seal)).toBe(false);
  });
  
  it('getLimitationIds should return all boundary IDs', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const ids = getLimitationIds(seal);
    expect(ids).toContain('BOUND-001');
    expect(ids).toContain('BOUND-005');
    expect(ids).toHaveLength(6);
  });
  
  it('getSurvivalRate should return correct rate', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createAttestation({
          pureTotal: 100,
          pureAttacked: 80,
          pureSurvived: 76,
          stopOnFirstBreach: true,
          deterministic: true,
          proofVerdict: 'SURVIVED',
        }),
        limitations: createTestLimitations(),
      },
    });
    
    expect(getSurvivalRate(seal)).toBe(0.95); // 76/80
  });
  
  it('getSurvivalRate should return 0 if none attacked', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createAttestation({
          pureTotal: 76,
          pureAttacked: 0,
          pureSurvived: 0,
          stopOnFirstBreach: true,
          deterministic: true,
          proofVerdict: 'SURVIVED',
        }),
        limitations: createTestLimitations(),
      },
    });
    
    expect(getSurvivalRate(seal)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seal Formatting', () => {
  it('should format seal summary', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const summary = formatSealSummary(seal);
    
    expect(summary).toContain('OMEGA SENTINEL');
    expect(summary).toContain('SELF SEAL');
    expect(summary).toContain('SEALED');
    expect(summary).toContain('BOUND-001');
  });
  
  it('should format compact seal reference', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const ref = formatSealReference(seal);
    
    expect(ref).toMatch(/^\[SEAL:SEALED:[a-f0-9]+\.\.\.\]$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Complete Seal Validation', () => {
  it('should pass all validation for correct seal', () => {
    const ledger = createDefaultBoundaryLedger();
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    const result = validateSeal(seal, ledger);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.hashValid).toBe(true);
    expect(result.limitationsValid).toBe(true);
    expect(result.verdictValid).toBe(true);
  });
  
  it('should collect multiple errors', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: [{ boundaryId: 'BOUND-999', summary: 'Fake' }],
      },
    });
    
    // Tamper with hash
    const tampered = {
      ...seal,
      sealHash: 'bad_hash',
    };
    
    const ledger = createDefaultBoundaryLedger();
    const result = validateSeal(tampered, ledger);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.hashValid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IMMUTABILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seal Immutability', () => {
  it('should freeze seal object', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    expect(Object.isFrozen(seal)).toBe(true);
    expect(Object.isFrozen(seal.core)).toBe(true);
    expect(Object.isFrozen(seal.meta)).toBe(true);
  });
  
  it('should freeze nested objects', () => {
    const seal = createSelfSeal({
      core: {
        references: createTestReferences(),
        attestation: createTestAttestation(),
        limitations: createTestLimitations(),
      },
    });
    
    expect(Object.isFrozen(seal.core.references)).toBe(true);
    expect(Object.isFrozen(seal.core.attestation)).toBe(true);
    expect(Object.isFrozen(seal.core.limitations)).toBe(true);
  });
});
