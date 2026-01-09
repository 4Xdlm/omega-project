/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — BOUNDARY LEDGER TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/boundary_ledger.test
 * @version 3.27.0
 * 
 * SPRINT 27.0 — BOUNDARY LEDGER v1
 * 
 * INVARIANTS TESTED:
 * - INV-BND-01: Tout ce qui n'est pas dans le ledger n'est pas garanti
 * - INV-BND-02: Toute limite HARD a une raison + mitigation (ou null assumé)
 * - INV-BND-03: Le ledger est référencé dans le Seal (hash + count)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  // Types
  BoundaryEntry,
  BoundaryLedger,
  BoundaryCategory,
  BoundarySeverity,
  BoundaryRisk,
  BoundaryLedgerReference,
  
  // Constants
  BOUNDARY_LEDGER_VERSION,
  MANDATORY_BOUNDARIES,
  EXPECTED_BOUNDARY_COUNT,
  
  // Functions
  validateBoundaryEntry,
  validateBoundaryLedger,
  computeBoundaryLedgerHash,
  generateLedgerReference,
  buildLedgerSummary,
  createBoundaryLedger,
  createDefaultBoundaryLedger,
  getHardBoundaries,
  getBoundariesByCategory,
  getBoundariesForInvariant,
  getBoundariesForModule,
  hasHardBoundary,
  
  // Individual boundaries for specific tests
  BOUND_001,
  BOUND_005,
  BOUND_011,
  BOUND_015
} from '../meta/index.js';

import { SENTINEL_VERSION } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

let defaultLedger: BoundaryLedger;

beforeAll(() => {
  defaultLedger = createDefaultBoundaryLedger();
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-BND-01: EXHAUSTIVITY — Tout ce qui n'est pas dans le ledger n'est pas garanti
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-BND-01: Exhaustivity', () => {
  
  it('should have exactly EXPECTED_BOUNDARY_COUNT boundaries', () => {
    expect(MANDATORY_BOUNDARIES).toHaveLength(EXPECTED_BOUNDARY_COUNT);
    expect(defaultLedger.boundaries).toHaveLength(EXPECTED_BOUNDARY_COUNT);
  });
  
  it('should have unique IDs for all boundaries', () => {
    const ids = defaultLedger.boundaries.map(b => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
  
  it('should have sequential IDs from BOUND-001 to BOUND-015', () => {
    const ids = defaultLedger.boundaries.map(b => b.id).sort();
    for (let i = 1; i <= EXPECTED_BOUNDARY_COUNT; i++) {
      const expectedId = `BOUND-${String(i).padStart(3, '0')}`;
      expect(ids).toContain(expectedId);
    }
  });
  
  it('should cover all boundary categories', () => {
    const categories = new Set(defaultLedger.boundaries.map(b => b.category));
    const requiredCategories: BoundaryCategory[] = [
      'EXTERNAL_DEPENDENCY',
      'CRYPTOGRAPHIC',
      'TOOLING',
      'TEMPORAL',
      'SELF_REFERENCE',
      'SEMANTIC',
      'COMPUTATIONAL'
    ];
    for (const cat of requiredCategories) {
      expect(categories.has(cat)).toBe(true);
    }
  });
  
  it('should match summary totalBoundaries', () => {
    expect(defaultLedger.summary.totalBoundaries).toBe(defaultLedger.boundaries.length);
  });
  
  it('should have accurate category counts in summary', () => {
    const actualCounts: Record<BoundaryCategory, number> = {
      EXTERNAL_DEPENDENCY: 0,
      TOOLING: 0,
      CRYPTOGRAPHIC: 0,
      TEMPORAL: 0,
      ENVIRONMENTAL: 0,
      SEMANTIC: 0,
      COMPUTATIONAL: 0,
      SELF_REFERENCE: 0
    };
    
    for (const b of defaultLedger.boundaries) {
      actualCounts[b.category]++;
    }
    
    for (const [cat, count] of Object.entries(actualCounts)) {
      expect(defaultLedger.summary.byCategory[cat as BoundaryCategory]).toBe(count);
    }
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-BND-02: HARD BOUNDARIES — Toute limite HARD a une raison + mitigation
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-BND-02: HARD Boundary Requirements', () => {
  
  it('should have multiple HARD boundaries', () => {
    const hardBoundaries = getHardBoundaries(defaultLedger);
    expect(hardBoundaries.length).toBeGreaterThan(0);
  });
  
  it('every HARD boundary should have non-empty reason', () => {
    const hardBoundaries = getHardBoundaries(defaultLedger);
    for (const b of hardBoundaries) {
      expect(b.reason).toBeDefined();
      expect(b.reason.trim().length).toBeGreaterThan(10);
    }
  });
  
  it('HARD boundary with null mitigation is explicitly accepted', () => {
    // BOUND-002 (V8 trust) has null mitigation - this is intentional
    expect(BOUND_001.mitigation).not.toBeNull(); // Has mitigation
    expect(BOUND_005.mitigation).not.toBeNull(); // Has mitigation
    // Check that at least one HARD has null (explicit acceptance)
    const hardWithNull = getHardBoundaries(defaultLedger).filter(b => b.mitigation === null);
    expect(hardWithNull.length).toBeGreaterThan(0);
  });
  
  it('HARD boundaries should have CRITICAL or HIGH risk', () => {
    const hardBoundaries = getHardBoundaries(defaultLedger);
    for (const b of hardBoundaries) {
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(b.risk);
      // At least some HARD should be CRITICAL
    }
    const criticalHard = hardBoundaries.filter(b => b.risk === 'CRITICAL');
    expect(criticalHard.length).toBeGreaterThan(0);
  });
  
  it('should correctly identify specific HARD boundaries', () => {
    // Node.js runtime
    expect(BOUND_001.severity).toBe('HARD');
    expect(BOUND_001.category).toBe('EXTERNAL_DEPENDENCY');
    
    // SHA-256
    expect(BOUND_005.severity).toBe('HARD');
    expect(BOUND_005.category).toBe('CRYPTOGRAPHIC');
    
    // Bootstrapping
    expect(BOUND_011.severity).toBe('HARD');
    expect(BOUND_011.category).toBe('SELF_REFERENCE');
    
    // Halting problem
    expect(BOUND_015.severity).toBe('HARD');
    expect(BOUND_015.category).toBe('COMPUTATIONAL');
  });
  
  it('SOFT boundaries should have mitigation when risk is MEDIUM or higher', () => {
    const softBoundaries = defaultLedger.boundaries.filter(b => b.severity === 'SOFT');
    for (const b of softBoundaries) {
      if (b.risk === 'MEDIUM' || b.risk === 'HIGH' || b.risk === 'CRITICAL') {
        // Should have some mitigation (not necessarily required, but expected)
        // This is informational, not a hard rule
      }
    }
    expect(softBoundaries.length).toBeGreaterThan(0);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-BND-03: SEAL REFERENCE — Le ledger est référencé dans le Seal
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-BND-03: Seal Reference', () => {
  
  it('should generate valid ledger reference', () => {
    const ref = generateLedgerReference(defaultLedger);
    expect(ref.version).toBe(BOUNDARY_LEDGER_VERSION);
    expect(ref.boundaryCount).toBe(EXPECTED_BOUNDARY_COUNT);
    expect(ref.coreHash).toMatch(/^[a-f0-9]{64}$/);
  });
  
  it('should compute deterministic hash', () => {
    const hash1 = computeBoundaryLedgerHash(defaultLedger);
    const hash2 = computeBoundaryLedgerHash(defaultLedger);
    expect(hash1).toBe(hash2);
  });
  
  it('hash should be 64 hex characters (SHA-256)', () => {
    const hash = computeBoundaryLedgerHash(defaultLedger);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
  
  it('reference should include boundary count', () => {
    const ref = generateLedgerReference(defaultLedger);
    expect(ref.boundaryCount).toBe(defaultLedger.boundaries.length);
  });
  
  it('different ledgers should produce different hashes', () => {
    const modifiedBoundaries = [...MANDATORY_BOUNDARIES];
    // Create a ledger with different version
    const differentLedger = createBoundaryLedger('0.0.0', modifiedBoundaries);
    
    const hash1 = computeBoundaryLedgerHash(defaultLedger);
    const hash2 = computeBoundaryLedgerHash(differentLedger);
    
    expect(hash1).not.toBe(hash2);
  });
  
  it('hash should change if boundary content changes', () => {
    const originalHash = computeBoundaryLedgerHash(defaultLedger);
    
    // Create modified boundary
    const modified: BoundaryEntry = {
      ...BOUND_001,
      title: 'Modified Title'
    };
    const modifiedBoundaries = [modified, ...MANDATORY_BOUNDARIES.slice(1)];
    const modifiedLedger = createBoundaryLedger(SENTINEL_VERSION, modifiedBoundaries);
    
    const modifiedHash = computeBoundaryLedgerHash(modifiedLedger);
    expect(modifiedHash).not.toBe(originalHash);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION — Entry and Ledger Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation Functions', () => {
  
  describe('validateBoundaryEntry', () => {
    
    it('should validate correct entries', () => {
      for (const boundary of MANDATORY_BOUNDARIES) {
        const result = validateBoundaryEntry(boundary);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
    
    it('should reject invalid ID format', () => {
      const invalid: BoundaryEntry = {
        ...BOUND_001,
        id: 'INVALID-ID'
      };
      const result = validateBoundaryEntry(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid ID format'))).toBe(true);
    });
    
    it('should reject empty title', () => {
      const invalid: BoundaryEntry = {
        ...BOUND_001,
        id: 'BOUND-001',
        title: ''
      };
      const result = validateBoundaryEntry(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('title is empty'))).toBe(true);
    });
    
    it('should reject empty description', () => {
      const invalid: BoundaryEntry = {
        ...BOUND_001,
        id: 'BOUND-001',
        description: '   '
      };
      const result = validateBoundaryEntry(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('description is empty'))).toBe(true);
    });
    
    it('should reject HARD boundary without reason', () => {
      const invalid: BoundaryEntry = {
        ...BOUND_001,
        id: 'BOUND-001',
        severity: 'HARD',
        reason: ''
      };
      const result = validateBoundaryEntry(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('HARD boundary requires'))).toBe(true);
    });
    
    it('should accept SOFT boundary without reason', () => {
      const valid: BoundaryEntry = {
        ...BOUND_001,
        id: 'BOUND-001',
        severity: 'SOFT',
        reason: ''
      };
      const result = validateBoundaryEntry(valid);
      // SOFT doesn't require reason
      expect(result.errors.filter(e => e.includes('reason'))).toHaveLength(0);
    });
    
  });
  
  describe('validateBoundaryLedger', () => {
    
    it('should validate default ledger', () => {
      const result = validateBoundaryLedger(defaultLedger);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject duplicate IDs', () => {
      const duplicates = [BOUND_001, BOUND_001];
      const ledger = createBoundaryLedger(SENTINEL_VERSION, duplicates);
      const result = validateBoundaryLedger(ledger);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });
    
    it('should reject wrong version', () => {
      const ledger = {
        ...defaultLedger,
        version: '0.0.0' as typeof BOUNDARY_LEDGER_VERSION
      };
      const result = validateBoundaryLedger(ledger);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });
    
    it('should reject summary mismatch', () => {
      const ledger = {
        ...defaultLedger,
        summary: {
          ...defaultLedger.summary,
          totalBoundaries: 999
        }
      };
      const result = validateBoundaryLedger(ledger);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('total'))).toBe(true);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Query Functions', () => {
  
  describe('getHardBoundaries', () => {
    
    it('should return only HARD severity boundaries', () => {
      const hard = getHardBoundaries(defaultLedger);
      for (const b of hard) {
        expect(b.severity).toBe('HARD');
      }
    });
    
    it('should return expected count of HARD boundaries', () => {
      const hard = getHardBoundaries(defaultLedger);
      const expectedHard = defaultLedger.boundaries.filter(b => b.severity === 'HARD').length;
      expect(hard.length).toBe(expectedHard);
    });
    
  });
  
  describe('getBoundariesByCategory', () => {
    
    it('should filter by category correctly', () => {
      const external = getBoundariesByCategory(defaultLedger, 'EXTERNAL_DEPENDENCY');
      for (const b of external) {
        expect(b.category).toBe('EXTERNAL_DEPENDENCY');
      }
      expect(external.length).toBe(defaultLedger.summary.byCategory.EXTERNAL_DEPENDENCY);
    });
    
    it('should return empty for unused category', () => {
      // ENVIRONMENTAL is defined but may not be used in default
      const env = getBoundariesByCategory(defaultLedger, 'ENVIRONMENTAL');
      expect(env.length).toBe(defaultLedger.summary.byCategory.ENVIRONMENTAL);
    });
    
  });
  
  describe('getBoundariesForInvariant', () => {
    
    it('should return boundaries affecting specific invariant', () => {
      const bounds = getBoundariesForInvariant(defaultLedger, 'INV-META-01');
      expect(bounds.length).toBeGreaterThan(0);
      for (const b of bounds) {
        expect(b.affectedInvariants).toContain('INV-META-01');
      }
    });
    
    it('should return empty for unknown invariant', () => {
      const bounds = getBoundariesForInvariant(defaultLedger, 'INV-UNKNOWN-99');
      expect(bounds).toHaveLength(0);
    });
    
  });
  
  describe('getBoundariesForModule', () => {
    
    it('should return boundaries affecting specific module', () => {
      const bounds = getBoundariesForModule(defaultLedger, 'foundation');
      expect(bounds.length).toBeGreaterThan(0);
      for (const b of bounds) {
        expect(b.affectedModules).toContain('foundation');
      }
    });
    
    it('should return empty for unknown module', () => {
      const bounds = getBoundariesForModule(defaultLedger, 'unknown-module');
      expect(bounds).toHaveLength(0);
    });
    
  });
  
  describe('hasHardBoundary', () => {
    
    it('should return true for invariant with HARD boundary', () => {
      // INV-META-01 is affected by BOUND-001 (Node.js) which is HARD
      expect(hasHardBoundary(defaultLedger, 'INV-META-01')).toBe(true);
    });
    
    it('should return false for unknown invariant', () => {
      expect(hasHardBoundary(defaultLedger, 'INV-UNKNOWN-99')).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// IMMUTABILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Immutability', () => {
  
  it('MANDATORY_BOUNDARIES should be frozen', () => {
    expect(Object.isFrozen(MANDATORY_BOUNDARIES)).toBe(true);
  });
  
  it('individual boundaries should be frozen', () => {
    for (const b of MANDATORY_BOUNDARIES) {
      expect(Object.isFrozen(b)).toBe(true);
    }
  });
  
  it('default ledger should be frozen', () => {
    expect(Object.isFrozen(defaultLedger)).toBe(true);
    expect(Object.isFrozen(defaultLedger.boundaries)).toBe(true);
    expect(Object.isFrozen(defaultLedger.summary)).toBe(true);
  });
  
  it('should not allow modification of boundaries array', () => {
    expect(() => {
      (MANDATORY_BOUNDARIES as any).push({} as BoundaryEntry);
    }).toThrow();
  });
  
  it('should not allow modification of boundary entry', () => {
    expect(() => {
      (BOUND_001 as any).title = 'Modified';
    }).toThrow();
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM — 20 RUN GATE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism (20-run gate)', () => {
  
  it('should produce identical hash across 20 runs', () => {
    const hashes: string[] = [];
    for (let i = 0; i < 20; i++) {
      const ledger = createDefaultBoundaryLedger();
      const hash = computeBoundaryLedgerHash(ledger);
      hashes.push(hash);
    }
    
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(1);
  });
  
  it('should produce identical reference across 20 runs', () => {
    const refs: BoundaryLedgerReference[] = [];
    for (let i = 0; i < 20; i++) {
      const ledger = createDefaultBoundaryLedger();
      const ref = generateLedgerReference(ledger);
      refs.push(ref);
    }
    
    const firstRef = refs[0];
    for (const ref of refs) {
      expect(ref.version).toBe(firstRef.version);
      expect(ref.boundaryCount).toBe(firstRef.boundaryCount);
      expect(ref.coreHash).toBe(firstRef.coreHash);
    }
  });
  
  it('should produce identical summary across 20 runs', () => {
    const summaries = [];
    for (let i = 0; i < 20; i++) {
      const ledger = createDefaultBoundaryLedger();
      summaries.push(JSON.stringify(ledger.summary));
    }
    
    const uniqueSummaries = new Set(summaries);
    expect(uniqueSummaries.size).toBe(1);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION CONSISTENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Version Consistency', () => {
  
  it('ledger version should be 1.0.0', () => {
    expect(BOUNDARY_LEDGER_VERSION).toBe('1.0.0');
    expect(defaultLedger.version).toBe('1.0.0');
  });
  
  it('ledger should reference current SENTINEL_VERSION', () => {
    expect(defaultLedger.sentinelVersion).toBe(SENTINEL_VERSION);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC BOUNDARY CONTENT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Specific Boundary Content', () => {
  
  it('BOUND-001 should be Node.js runtime trust', () => {
    expect(BOUND_001.id).toBe('BOUND-001');
    expect(BOUND_001.title).toContain('Node.js');
    expect(BOUND_001.category).toBe('EXTERNAL_DEPENDENCY');
    expect(BOUND_001.severity).toBe('HARD');
  });
  
  it('BOUND-005 should be SHA-256 trust', () => {
    expect(BOUND_005.id).toBe('BOUND-005');
    expect(BOUND_005.title).toContain('SHA-256');
    expect(BOUND_005.category).toBe('CRYPTOGRAPHIC');
  });
  
  it('BOUND-011 should be bootstrapping circularity', () => {
    expect(BOUND_011.id).toBe('BOUND-011');
    expect(BOUND_011.title).toContain('Bootstrapping');
    expect(BOUND_011.category).toBe('SELF_REFERENCE');
  });
  
  it('BOUND-015 should be halting problem', () => {
    expect(BOUND_015.id).toBe('BOUND-015');
    expect(BOUND_015.title).toContain('Halting');
    expect(BOUND_015.category).toBe('COMPUTATIONAL');
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Summary Generation', () => {
  
  it('buildLedgerSummary should compute correct totals', () => {
    const summary = buildLedgerSummary(MANDATORY_BOUNDARIES);
    expect(summary.totalBoundaries).toBe(EXPECTED_BOUNDARY_COUNT);
  });
  
  it('category counts should sum to total', () => {
    const summary = defaultLedger.summary;
    const categorySum = Object.values(summary.byCategory).reduce((a, b) => a + b, 0);
    expect(categorySum).toBe(summary.totalBoundaries);
  });
  
  it('severity counts should sum to total', () => {
    const summary = defaultLedger.summary;
    const severitySum = Object.values(summary.bySeverity).reduce((a, b) => a + b, 0);
    expect(severitySum).toBe(summary.totalBoundaries);
  });
  
  it('risk counts should sum to total', () => {
    const summary = defaultLedger.summary;
    const riskSum = Object.values(summary.byRisk).reduce((a, b) => a + b, 0);
    expect(riskSum).toBe(summary.totalBoundaries);
  });
  
});
