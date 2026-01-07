/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — META MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Sprint 26.8 — META
 * 80+ tests covering 10 invariants
 * 
 * INV-META-01: Transitions are pure (input → output, no hidden state)
 * INV-META-02: Journal hash is deterministic
 * INV-META-03: SnapshotCore contains all expectedModules
 * INV-META-04: computeCoreHash is deterministic
 * INV-META-05: Every boundary is present in Seal
 * INV-META-06: No implicit promises (guarantees explicit)
 * INV-META-07: Export/Import round-trip preserves coreHash
 * INV-META-08: Canonical serialization produces same blob cross-platform
 * INV-META-09: Seal is immutable after creation
 * INV-META-10: Seal.boundaryCount === BoundaryLedger.boundaries.length
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Canonical
import {
  FLOAT_PRECISION,
  isDangerousNumber,
  validateForSerialization,
  quantizeFloat,
  quantizeFloats,
  sortKeysDeep,
  normalizeLF,
  normalizePath,
  sortUnique,
  isSortedUnique,
  canonicalize,
  canonicalHash,
  canonicalEquals,
  computeMerkleHash,
  isCanonicalizable
} from '../meta/index.js';

// Orchestrator
import {
  PIPELINE_STAGES,
  STAGE_TRANSITIONS,
  isValidStage,
  isValidStatus,
  isValidTransition,
  createStageResultCore,
  createJournalCore,
  addStageToJournal,
  computeJournalHash,
  createPipelineJournal,
  verifyJournalHash,
  createPipelineContext,
  executeTransition,
  isPipelineComplete,
  getNextStage,
  resetJournalCounter,
  formatJournal
} from '../meta/index.js';

// Introspection
import {
  EXPECTED_MODULES,
  validateExpectedModules,
  validateSnapshotCompleteness,
  createModuleState,
  createFileInfo,
  createSnapshotCore,
  createSnapshotMeta,
  computeSnapshotCoreHash,
  createSystemSnapshot,
  verifySnapshotHash,
  diffSnapshots,
  getModule,
  formatSnapshotSummary
} from '../meta/index.js';

// Boundary
import {
  BOUNDARY_CATEGORIES,
  MANDATORY_BOUNDARIES,
  SYSTEM_GUARANTEES,
  isValidCategory,
  isValidBoundaryId,
  containsAllMandatory,
  createBoundaryCore,
  createBoundaryLedgerCore,
  computeBoundaryLedgerHash,
  createBoundaryLedger,
  verifyBoundaryLedgerHash,
  createGuaranteeLedgerCore,
  createGuaranteeLedger,
  getBoundariesByCategory,
  isGuaranteed,
  formatBoundaryLedger,
  generateDisclaimer
} from '../meta/index.js';

// Export
import {
  EXPORT_FORMAT_VERSION,
  createExportCore,
  createExportMeta,
  createSystemExport,
  exportSystem,
  importSystem,
  verifyExportHash,
  validateImport,
  verifyRoundTrip,
  verifyMultipleRoundTrips,
  formatExportSummary
} from '../meta/index.js';

// Seal
import {
  SEAL_VERSION,
  createSealCore,
  createSealMeta,
  computeSealHash,
  createOmegaSeal,
  verifySealHash,
  verifySeal,
  getSealStatus,
  meetsMinimumRegion,
  serializeSeal,
  deserializeSeal,
  compareSeals,
  formatSeal,
  resetSealCounter
} from '../meta/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Canonical Serialization', () => {
  describe('Dangerous Number Detection', () => {
    it('should detect NaN', () => {
      expect(isDangerousNumber(NaN)).toBe(true);
    });

    it('should detect Infinity', () => {
      expect(isDangerousNumber(Infinity)).toBe(true);
      expect(isDangerousNumber(-Infinity)).toBe(true);
    });

    it('should detect -0', () => {
      expect(isDangerousNumber(-0)).toBe(true);
    });

    it('should accept normal numbers', () => {
      expect(isDangerousNumber(0)).toBe(false);
      expect(isDangerousNumber(42)).toBe(false);
      expect(isDangerousNumber(3.14159)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should throw for undefined', () => {
      expect(() => validateForSerialization(undefined)).toThrow('undefined not allowed');
    });

    it('should throw for NaN', () => {
      expect(() => validateForSerialization(NaN)).toThrow('NaN/Infinity/-0 not allowed');
    });

    it('should throw for BigInt', () => {
      expect(() => validateForSerialization(BigInt(42))).toThrow('BigInt not allowed');
    });

    it('should accept valid objects', () => {
      expect(() => validateForSerialization({ a: 1, b: 'test' })).not.toThrow();
    });

    it('isCanonicalizable should return boolean', () => {
      expect(isCanonicalizable({ valid: true })).toBe(true);
      expect(isCanonicalizable(undefined)).toBe(false);
    });
  });

  describe('Float Quantization', () => {
    it('should quantize floats to fixed precision', () => {
      const result = quantizeFloat(0.123456789012345);
      expect(String(result).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(FLOAT_PRECISION);
    });

    it('should preserve integers', () => {
      expect(quantizeFloat(42)).toBe(42);
    });

    it('should quantize nested objects', () => {
      const obj = { a: { b: 0.123456789012345 } };
      const result = quantizeFloats(obj);
      expect(String(result.a.b).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(FLOAT_PRECISION);
    });
  });

  describe('Key Sorting', () => {
    it('should sort keys alphabetically', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const sorted = sortKeysDeep(obj);
      expect(Object.keys(sorted)).toEqual(['a', 'm', 'z']);
    });

    it('should sort nested objects', () => {
      const obj = { b: { z: 1, a: 2 }, a: 1 };
      const sorted = sortKeysDeep(obj);
      expect(Object.keys(sorted)).toEqual(['a', 'b']);
      expect(Object.keys(sorted.b)).toEqual(['a', 'z']);
    });
  });

  describe('String Normalization', () => {
    it('should convert CRLF to LF', () => {
      expect(normalizeLF('a\r\nb')).toBe('a\nb');
    });

    it('should convert CR to LF', () => {
      expect(normalizeLF('a\rb')).toBe('a\nb');
    });

    it('should normalize paths to forward slash', () => {
      expect(normalizePath('a\\b\\c')).toBe('a/b/c');
    });
  });

  describe('Array Normalization', () => {
    it('should sort and deduplicate', () => {
      const arr = ['c', 'a', 'b', 'a'];
      expect(sortUnique(arr)).toEqual(['a', 'b', 'c']);
    });

    it('isSortedUnique should validate', () => {
      expect(isSortedUnique(['a', 'b', 'c'])).toBe(true);
      expect(isSortedUnique(['c', 'a', 'b'])).toBe(false);
      expect(isSortedUnique(['a', 'a', 'b'])).toBe(false);
    });
  });

  describe('INV-META-08: Canonical Determinism', () => {
    it('should produce same string for same object', () => {
      const obj = { b: 2, a: 1 };
      const s1 = canonicalize(obj);
      const s2 = canonicalize(obj);
      expect(s1).toBe(s2);
    });

    it('should produce same hash for same object', () => {
      const obj = { value: 3.14159, name: 'test' };
      const h1 = canonicalHash(obj);
      const h2 = canonicalHash(obj);
      expect(h1).toBe(h2);
    });

    it('canonicalEquals should compare correctly', () => {
      expect(canonicalEquals({ a: 1 }, { a: 1 })).toBe(true);
      expect(canonicalEquals({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should produce 64-char hex hash', () => {
      const hash = canonicalHash({ test: true });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Merkle Hash', () => {
    it('should compute deterministic Merkle hash', () => {
      const files = [
        { path: 'b.ts', hash: 'hash_b' },
        { path: 'a.ts', hash: 'hash_a' }
      ];
      const h1 = computeMerkleHash(files);
      const h2 = computeMerkleHash(files);
      expect(h1).toBe(h2);
    });

    it('should sort by path', () => {
      const files1 = [
        { path: 'a.ts', hash: 'hash_a' },
        { path: 'b.ts', hash: 'hash_b' }
      ];
      const files2 = [
        { path: 'b.ts', hash: 'hash_b' },
        { path: 'a.ts', hash: 'hash_a' }
      ];
      expect(computeMerkleHash(files1)).toBe(computeMerkleHash(files2));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Orchestrator', () => {
  beforeEach(() => {
    resetJournalCounter();
  });

  describe('Pipeline Stages', () => {
    it('should have 5 stages', () => {
      expect(PIPELINE_STAGES).toHaveLength(5);
    });

    it('should have correct order', () => {
      expect(PIPELINE_STAGES[0]).toBe('INIT');
      expect(PIPELINE_STAGES[4]).toBe('SEALED');
    });

    it('should have 4 transitions', () => {
      expect(STAGE_TRANSITIONS).toHaveLength(4);
    });
  });

  describe('Validation', () => {
    it('isValidStage should validate', () => {
      expect(isValidStage('INIT')).toBe(true);
      expect(isValidStage('INVALID')).toBe(false);
    });

    it('isValidStatus should validate', () => {
      expect(isValidStatus('PASS')).toBe(true);
      expect(isValidStatus('INVALID')).toBe(false);
    });

    it('isValidTransition should check transitions', () => {
      expect(isValidTransition('INIT', 'CRYSTALLIZED')).toBe(true);
      expect(isValidTransition('INIT', 'SEALED')).toBe(false);
    });
  });

  describe('INV-META-01: Pure Transitions', () => {
    it('should create stage result with no side effects', () => {
      const result = createStageResultCore('CRYSTALLIZED', 'PASS', 'in1', 'out1');
      expect(result.stage).toBe('CRYSTALLIZED');
      expect(result.status).toBe('PASS');
      expect(result.inputHash).toBe('in1');
      expect(result.outputHash).toBe('out1');
    });

    it('context should be immutable', () => {
      const ctx = createPipelineContext();
      expect(Object.isFrozen(ctx)).toBe(true);
    });
  });

  describe('INV-META-02: Journal Hash Determinism', () => {
    it('should produce same hash for same stages', () => {
      const core1 = createJournalCore('PIPE-001');
      const stage = createStageResultCore('CRYSTALLIZED', 'PASS', 'in', 'out');
      const updated1 = addStageToJournal(core1, stage);
      
      const core2 = createJournalCore('PIPE-001');
      const updated2 = addStageToJournal(core2, stage);
      
      expect(computeJournalHash(updated1)).toBe(computeJournalHash(updated2));
    });

    it('verifyJournalHash should verify', () => {
      const core = createJournalCore('PIPE-001');
      const journal = createPipelineJournal(core, {
        startedAt: '2026-01-07T00:00:00Z',
        completedAt: '2026-01-07T00:00:01Z',
        totalDurationMs: 1000,
        runId: 'test-run'
      });
      expect(verifyJournalHash(journal)).toBe(true);
    });

    it('durationMs should NOT affect journal hash', () => {
      // durationMs is in meta, not core
      const core = createJournalCore('PIPE-001');
      const stage = createStageResultCore('CRYSTALLIZED', 'PASS', 'in', 'out');
      const updated = addStageToJournal(core, stage);
      
      const j1 = createPipelineJournal(updated, {
        startedAt: '2026-01-07T00:00:00Z',
        completedAt: '2026-01-07T00:00:01Z',
        totalDurationMs: 100,  // Different
        runId: 'run1'
      });
      
      const j2 = createPipelineJournal(updated, {
        startedAt: '2026-01-07T00:00:00Z',
        completedAt: '2026-01-07T00:00:01Z',
        totalDurationMs: 999,  // Different
        runId: 'run2'
      });
      
      // Core hash should be same (meta is not hashed)
      expect(j1.journalHash).toBe(j2.journalHash);
    });
  });

  describe('Pipeline Operations', () => {
    it('getNextStage should return next', () => {
      expect(getNextStage('INIT')).toBe('CRYSTALLIZED');
      expect(getNextStage('SEALED')).toBe(null);
    });

    it('isPipelineComplete should check SEALED', () => {
      const ctx = createPipelineContext();
      expect(isPipelineComplete(ctx)).toBe(false);
    });

    it('formatJournal should produce string', () => {
      const core = createJournalCore('PIPE-001');
      const journal = createPipelineJournal(core, {
        startedAt: '2026-01-07T00:00:00Z',
        completedAt: '2026-01-07T00:00:01Z',
        totalDurationMs: 1000,
        runId: 'test'
      });
      const str = formatJournal(journal);
      expect(str).toContain('Pipeline Journal');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTROSPECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Introspection', () => {
  describe('Expected Modules', () => {
    it('should have 9 modules', () => {
      expect(EXPECTED_MODULES).toHaveLength(9);
    });

    it('should be sorted', () => {
      expect(validateExpectedModules(EXPECTED_MODULES)).toBe(true);
    });

    it('should include meta', () => {
      expect(EXPECTED_MODULES).toContain('meta');
    });
  });

  describe('Module State', () => {
    it('should create module state', () => {
      const files = [
        createFileInfo('a.ts', 'hash_a'),
        createFileInfo('b.ts', 'hash_b')
      ];
      const state = createModuleState('test', files);
      expect(state.name).toBe('test');
      expect(state.fileCount).toBe(2);
      expect(state.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should normalize paths in file info', () => {
      const file = createFileInfo('path\\to\\file.ts', 'hash');
      expect(file.path).toBe('path/to/file.ts');
    });
  });

  describe('INV-META-03: Snapshot Completeness', () => {
    it('should validate completeness', () => {
      // Create modules for all expected
      const modules = EXPECTED_MODULES.map(name => 
        createModuleState(name, [createFileInfo(`${name}/index.ts`, `hash_${name}`)])
      );
      
      const core = createSnapshotCore({
        modules,
        invariantCount: 72,
        invariantIds: ['INV-001'],
        testCount: 763,
        testsPassed: 763,
        falsificationSurvivalRate: 0.95,
        coverageRatio: 0.85,
        gravityNormalized: 0.75,
        negativeScore: 5,
        boundaryLedgerHash: 'abc123'
      });
      
      const validation = validateSnapshotCompleteness(core);
      expect(validation.isComplete).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });

    it('should detect missing modules', () => {
      const modules = [
        createModuleState('foundation', [createFileInfo('index.ts', 'hash')])
      ];
      
      const core = createSnapshotCore({
        modules,
        invariantCount: 1,
        invariantIds: [],
        testCount: 1,
        testsPassed: 1,
        falsificationSurvivalRate: 1,
        coverageRatio: 1,
        gravityNormalized: 1,
        negativeScore: 0,
        boundaryLedgerHash: 'abc'
      });
      
      const validation = validateSnapshotCompleteness(core);
      expect(validation.isComplete).toBe(false);
      expect(validation.missing.length).toBeGreaterThan(0);
    });
  });

  describe('INV-META-04: Core Hash Determinism', () => {
    it('should produce same hash for same core', () => {
      const modules = [createModuleState('foundation', [createFileInfo('index.ts', 'h')])];
      
      const core1 = createSnapshotCore({
        modules,
        invariantCount: 1,
        invariantIds: ['INV-001'],
        testCount: 10,
        testsPassed: 10,
        falsificationSurvivalRate: 0.95,
        coverageRatio: 0.85,
        gravityNormalized: 0.75,
        negativeScore: 5,
        boundaryLedgerHash: 'abc'
      });
      
      const core2 = createSnapshotCore({
        modules,
        invariantCount: 1,
        invariantIds: ['INV-001'],
        testCount: 10,
        testsPassed: 10,
        falsificationSurvivalRate: 0.95,
        coverageRatio: 0.85,
        gravityNormalized: 0.75,
        negativeScore: 5,
        boundaryLedgerHash: 'abc'
      });
      
      expect(computeSnapshotCoreHash(core1)).toBe(computeSnapshotCoreHash(core2));
    });

    it('verifySnapshotHash should verify', () => {
      const modules = [createModuleState('test', [])];
      const core = createSnapshotCore({
        modules,
        invariantCount: 0,
        invariantIds: [],
        testCount: 0,
        testsPassed: 0,
        falsificationSurvivalRate: 0,
        coverageRatio: 0,
        gravityNormalized: 0,
        negativeScore: 0,
        boundaryLedgerHash: 'x'
      });
      const snapshot = createSystemSnapshot(core);
      expect(verifySnapshotHash(snapshot)).toBe(true);
    });
  });

  describe('Snapshot Diff', () => {
    it('should detect no changes', () => {
      const modules = [createModuleState('test', [])];
      const core = createSnapshotCore({
        modules,
        invariantCount: 1,
        invariantIds: ['INV-001'],
        testCount: 1,
        testsPassed: 1,
        falsificationSurvivalRate: 0.5,
        coverageRatio: 0.5,
        gravityNormalized: 0.5,
        negativeScore: 0,
        boundaryLedgerHash: 'x'
      });
      
      const diff = diffSnapshots(core, core);
      expect(diff.areEqual).toBe(true);
    });

    it('should detect invariant changes', () => {
      const modules = [createModuleState('test', [])];
      const base = {
        modules,
        invariantCount: 1,
        testCount: 1,
        testsPassed: 1,
        falsificationSurvivalRate: 0.5,
        coverageRatio: 0.5,
        gravityNormalized: 0.5,
        negativeScore: 0,
        boundaryLedgerHash: 'x'
      };
      
      const core1 = createSnapshotCore({ ...base, invariantIds: ['INV-001'] });
      const core2 = createSnapshotCore({ ...base, invariantIds: ['INV-001', 'INV-002'] });
      
      const diff = diffSnapshots(core1, core2);
      expect(diff.invariantsAdded).toContain('INV-002');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Boundary Ledger', () => {
  describe('Constants', () => {
    it('should have 5 categories', () => {
      expect(BOUNDARY_CATEGORIES).toHaveLength(5);
    });

    it('should have 5 mandatory boundaries', () => {
      expect(MANDATORY_BOUNDARIES).toHaveLength(5);
    });

    it('should have system guarantees', () => {
      expect(SYSTEM_GUARANTEES.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('isValidCategory should validate', () => {
      expect(isValidCategory('COMPLETENESS')).toBe(true);
      expect(isValidCategory('INVALID')).toBe(false);
    });

    it('isValidBoundaryId should validate format', () => {
      expect(isValidBoundaryId('BOUND-001')).toBe(true);
      expect(isValidBoundaryId('INVALID')).toBe(false);
    });
  });

  describe('INV-META-05: Boundaries in Seal', () => {
    it('containsAllMandatory should check', () => {
      const core = createBoundaryLedgerCore();
      const result = containsAllMandatory(core);
      expect(result.isComplete).toBe(true);
    });

    it('should detect missing mandatory', () => {
      const core = {
        version: '1.0.0',
        boundaries: [MANDATORY_BOUNDARIES[0]]  // Only first
      };
      const result = containsAllMandatory(core);
      expect(result.isComplete).toBe(false);
      expect(result.missing.length).toBe(4);
    });
  });

  describe('INV-META-06: Explicit Guarantees', () => {
    it('isGuaranteed should check guarantee ledger', () => {
      const core = createGuaranteeLedgerCore();
      expect(isGuaranteed(core, 'deterministic')).toBe(true);
      expect(isGuaranteed(core, 'magic unicorn')).toBe(false);
    });

    it('generateDisclaimer should list all', () => {
      const boundaries = createBoundaryLedgerCore();
      const guarantees = createGuaranteeLedgerCore();
      const disclaimer = generateDisclaimer(boundaries, guarantees);
      expect(disclaimer).toContain('EXPLICIT GUARANTEES');
      expect(disclaimer).toContain('EXPLICIT LIMITATIONS');
      expect(disclaimer).toContain('NOT GUARANTEED');
    });
  });

  describe('Ledger Operations', () => {
    it('should create boundary ledger', () => {
      const core = createBoundaryLedgerCore();
      const ledger = createBoundaryLedger(core);
      expect(ledger.ledgerHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('verifyBoundaryLedgerHash should verify', () => {
      const core = createBoundaryLedgerCore();
      const ledger = createBoundaryLedger(core);
      expect(verifyBoundaryLedgerHash(ledger)).toBe(true);
    });

    it('getBoundariesByCategory should filter', () => {
      const core = createBoundaryLedgerCore();
      const selfRef = getBoundariesByCategory(core, 'SELF_REFERENCE');
      expect(selfRef.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Export/Import', () => {
  const createTestExportCore = () => {
    const modules = [createModuleState('test', [])];
    const snapshotCore = createSnapshotCore({
      modules,
      invariantCount: 1,
      invariantIds: ['INV-001'],
      testCount: 10,
      testsPassed: 10,
      falsificationSurvivalRate: 0.95,
      coverageRatio: 0.85,
      gravityNormalized: 0.75,
      negativeScore: 0,
      boundaryLedgerHash: 'abc'
    });
    
    return createExportCore({
      version: '3.27.0',
      snapshotCore,
      invariants: [{ id: 'INV-001', property: 'test', strength: 'Σ', hash: 'h1' }],
      artifacts: [],
      boundaryLedger: createBoundaryLedgerCore(),
      guaranteeLedger: createGuaranteeLedgerCore()
    });
  };

  describe('INV-META-07: Round-Trip Preservation', () => {
    it('should preserve hash on round-trip', () => {
      const core = createTestExportCore();
      const result = verifyRoundTrip(core);
      expect(result.success).toBe(true);
      expect(result.originalHash).toBe(result.reimportHash);
    });

    it('should pass multiple round-trips', () => {
      const core = createTestExportCore();
      const result = verifyMultipleRoundTrips(core, 10);
      expect(result.allMatch).toBe(true);
      expect(result.runs).toBe(10);
    });
  });

  describe('Export Creation', () => {
    it('should create export', () => {
      const core = createTestExportCore();
      const exp = createSystemExport(core);
      expect(exp.core.exportVersion).toBe(EXPORT_FORMAT_VERSION);
      expect(exp.coreHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('verifyExportHash should verify', () => {
      const core = createTestExportCore();
      const exp = createSystemExport(core);
      expect(verifyExportHash(exp)).toBe(true);
    });
  });

  describe('Import Validation', () => {
    it('should validate valid import', () => {
      const core = createTestExportCore();
      const blob = exportSystem(core);
      const imported = importSystem(blob);
      const validation = validateImport(imported);
      expect(validation.isValid).toBe(true);
    });

    it('should detect tampered export', () => {
      const core = createTestExportCore();
      const exp = createSystemExport(core);
      // Tamper with hash
      const tampered = { ...exp, coreHash: 'tampered' };
      const validation = validateImport(tampered as any);
      expect(validation.hashMatch).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('formatExportSummary should produce string', () => {
      const core = createTestExportCore();
      const exp = createSystemExport(core);
      const summary = formatExportSummary(exp);
      expect(summary).toContain('System Export');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Omega Seal', () => {
  beforeEach(() => {
    resetSealCounter();
  });

  const createTestSealCore = () => {
    return createSealCore({
      version: '3.27.0',
      rootHash: 'a'.repeat(64),
      snapshotCoreHash: 'b'.repeat(64),
      exportCoreHash: 'c'.repeat(64),
      boundaryLedgerHash: 'd'.repeat(64),
      guaranteeLedgerHash: 'e'.repeat(64),
      journalHash: 'f'.repeat(64),
      invariantCount: 72,
      testCount: 763,
      testsPassed: 763,
      regionAchieved: 'PROVEN',
      survivalRate: 0.95,
      coverageRatio: 0.85,
      boundaryCount: 5,
      guaranteeCount: 6
    });
  };

  describe('INV-META-09: Seal Immutability', () => {
    it('seal core should be frozen', () => {
      const core = createTestSealCore();
      expect(Object.isFrozen(core)).toBe(true);
    });

    it('seal should be frozen', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      expect(Object.isFrozen(seal)).toBe(true);
    });
  });

  describe('INV-META-10: Boundary Count Match', () => {
    it('should verify boundary count', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      const verification = verifySeal(seal, 5, 6);  // Matching counts
      expect(verification.countMatch).toBe(true);
    });

    it('should detect count mismatch', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      const verification = verifySeal(seal, 10, 6);  // Wrong boundary count
      expect(verification.countMatch).toBe(false);
      expect(verification.errors.some(e => e.includes('Boundary count'))).toBe(true);
    });
  });

  describe('Seal Verification', () => {
    it('verifySealHash should verify', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      expect(verifySealHash(seal)).toBe(true);
    });

    it('getSealStatus should return VALID', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      expect(getSealStatus(seal)).toBe('VALID');
    });

    it('should detect tampered seal', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      const tampered = { ...seal, sealHash: 'tampered' };
      expect(getSealStatus(tampered as any)).toBe('TAMPERED');
    });
  });

  describe('Seal Queries', () => {
    it('meetsMinimumRegion should check', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      expect(meetsMinimumRegion(seal, 'EXPLORATORY')).toBe(true);
      expect(meetsMinimumRegion(seal, 'TRANSCENDENT')).toBe(false);
    });
  });

  describe('Seal Serialization', () => {
    it('should round-trip serialize', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      const json = serializeSeal(seal);
      const restored = deserializeSeal(json);
      expect(restored.sealHash).toBe(seal.sealHash);
    });

    it('formatSeal should produce certificate', () => {
      const core = createTestSealCore();
      const seal = createOmegaSeal(core);
      const str = formatSeal(seal);
      expect(str).toContain('OMEGA SEAL CERTIFICATE');
      expect(str).toContain('ROOT HASH');
    });
  });

  describe('Seal Comparison', () => {
    it('should compare equal seals', () => {
      const core = createTestSealCore();
      const seal1 = createOmegaSeal(core);
      const seal2 = createOmegaSeal(core);
      const comparison = compareSeals(seal1, seal2);
      expect(comparison.areEqual).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  it('canonical hash should be deterministic across 20 runs', () => {
    const obj = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
    const hashes = Array.from({ length: 20 }, () => canonicalHash(obj));
    const allSame = hashes.every(h => h === hashes[0]);
    expect(allSame).toBe(true);
  });

  it('journal hash should be deterministic across 20 runs', () => {
    const hashes: string[] = [];
    for (let i = 0; i < 20; i++) {
      const core = createJournalCore('PIPE-TEST');
      const stage = createStageResultCore('CRYSTALLIZED', 'PASS', 'in', 'out');
      const updated = addStageToJournal(core, stage);
      hashes.push(computeJournalHash(updated));
    }
    const allSame = hashes.every(h => h === hashes[0]);
    expect(allSame).toBe(true);
  });

  it('snapshot hash should be deterministic across 20 runs', () => {
    const modules = [createModuleState('test', [createFileInfo('a.ts', 'h')])];
    const hashes: string[] = [];
    
    for (let i = 0; i < 20; i++) {
      const core = createSnapshotCore({
        modules,
        invariantCount: 10,
        invariantIds: ['INV-001', 'INV-002'],
        testCount: 100,
        testsPassed: 100,
        falsificationSurvivalRate: 0.95,
        coverageRatio: 0.85,
        gravityNormalized: 0.75,
        negativeScore: 5,
        boundaryLedgerHash: 'fixed'
      });
      hashes.push(computeSnapshotCoreHash(core));
    }
    
    const allSame = hashes.every(h => h === hashes[0]);
    expect(allSame).toBe(true);
  });

  it('seal hash should be deterministic across 20 runs', () => {
    const hashes: string[] = [];
    
    for (let i = 0; i < 20; i++) {
      const core = createSealCore({
        systemId: 'OMEGA-TEST',
        version: '1.0.0',
        rootHash: 'a'.repeat(64),
        snapshotCoreHash: 'b'.repeat(64),
        exportCoreHash: 'c'.repeat(64),
        boundaryLedgerHash: 'd'.repeat(64),
        guaranteeLedgerHash: 'e'.repeat(64),
        invariantCount: 10,
        testCount: 100,
        testsPassed: 100,
        regionAchieved: 'PROVEN',
        survivalRate: 0.95,
        coverageRatio: 0.85,
        boundaryCount: 5,
        guaranteeCount: 6
      });
      hashes.push(computeSealHash(core));
    }
    
    const allSame = hashes.every(h => h === hashes[0]);
    expect(allSame).toBe(true);
  });

  it('export round-trip should be deterministic across 20 runs', () => {
    const modules = [createModuleState('test', [])];
    const snapshotCore = createSnapshotCore({
      modules,
      invariantCount: 1,
      invariantIds: ['INV-001'],
      testCount: 10,
      testsPassed: 10,
      falsificationSurvivalRate: 0.95,
      coverageRatio: 0.85,
      gravityNormalized: 0.75,
      negativeScore: 0,
      boundaryLedgerHash: 'abc'
    });
    
    const core = createExportCore({
      version: '3.27.0',
      snapshotCore,
      invariants: [],
      artifacts: [],
      boundaryLedger: createBoundaryLedgerCore(),
      guaranteeLedger: createGuaranteeLedgerCore()
    });
    
    const result = verifyMultipleRoundTrips(core, 20);
    expect(result.allMatch).toBe(true);
  });
});
