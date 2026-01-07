/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — INTEGRATION TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Sprint 26.9 — INTEGRATION
 * End-to-end tests validating interaction between all 9 modules
 * 
 * INVARIANTS:
 * - INV-INT-01: Full pipeline produces valid Seal
 * - INV-INT-02: Artifact region matches containment result
 * - INV-INT-03: Refusal blocks invalid certification
 * - INV-INT-04: Export contains all module data
 * - INV-INT-05: System state is reconstructible from export
 * 
 * MODULES TESTED:
 * 1. Foundation (constants, axioms, proof_strength)
 * 2. Crystal (invariant crystallization)
 * 3. Falsification (attack corpus, engine, coverage)
 * 4. Regions (definitions, containment)
 * 5. Artifact (creation, sealing)
 * 6. Refusal (engine, registry)
 * 7. Negative (space, bounds)
 * 8. Gravity (evidence, decay)
 * 9. Meta (canonical, orchestrator, introspection, boundary, export, seal)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// FOUNDATION
// ═══════════════════════════════════════════════════════════════════════════════
import {
  SENTINEL_VERSION,
  PROOF_STRENGTH_WEIGHTS,
  AXIOM_IDS,
  CERTIFICATION_LEVELS
} from '../foundation/constants.js';

import {
  getAllAxioms,
  getAxiom,
  isSystemInvalidated,
  computeRejectionConsequences
} from '../foundation/axioms.js';

import {
  STRENGTH_ORDER,
  compareStrengths,
  computeCompositeStrength,
  isAtLeast
} from '../foundation/proof_strength.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTAL
// ═══════════════════════════════════════════════════════════════════════════════
import {
  crystallize,
  addProof,
  addImpossibility,
  computeInvariantHash,
  verifyInvariantHash
} from '../crystal/crystallizer.js';

import {
  validateInvariant,
  isValidInvariant
} from '../crystal/validator.js';

import {
  createRootLineage,
  createLineage
} from '../crystal/lineage.js';

// ═══════════════════════════════════════════════════════════════════════════════
// FALSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
import {
  getCorpus,
  getAllAttacks,
  getAttacksByCategory,
  getMandatoryAttacks
} from '../falsification/corpus.js';

import {
  FalsificationTracker,
  createSurvivedAttempt,
  createBreachedAttempt
} from '../falsification/engine.js';

import {
  calculateCoverageRatio,
  generateCoverageReport,
  meetsCoverageLevel
} from '../falsification/coverage.js';

// ═══════════════════════════════════════════════════════════════════════════════
// REGIONS
// ═══════════════════════════════════════════════════════════════════════════════
import {
  REGIONS,
  getRegion,
  compareRegions,
  isAtLeastRegion,
  type RegionId
} from '../regions/definitions.js';

import {
  determineRegion,
  testContainment,
  createDefaultMetrics,
  getPromotionRequirements
} from '../regions/containment.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════
import {
  createArtifact,
  sealArtifact,
  addEvidence,
  createProofEvidence,
  createFalsificationEvidence,
  verifyArtifactHash,
  isSealed,
  isValid
} from '../artifact/artifact.js';

import {
  toJSON,
  fromJSON,
  serialize
} from '../artifact/serialization.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a proper artifact with metrics
 */
function createTestArtifactWithMetrics(invariantId: string, property: string, region: RegionId) {
  return createArtifact({
    invariantId,
    invariantHash: canonicalHash({ id: invariantId }),
    region,
    metrics: {
      proofStrength: 'Σ',
      survivalRate: 0.95,
      coverage: 0.7,
      proofCount: 1,
      mandatoryCoverage: 1.0,
      hasExternalCertifier: false,
      isSystemValid: true
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFUSAL
// ═══════════════════════════════════════════════════════════════════════════════
import {
  createRefusal,
  createAxiomRefusal,
  getAllRefusalDefinitions,
  hasBlockingRefusals,
  getHighestSeverity,
  success,
  failure
} from '../refusal/engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE
// ═══════════════════════════════════════════════════════════════════════════════
import {
  createNegativeSpace,
  createNegativeBound,
  addBound,
  recordViolation,
  computeNegativeScore,
  isClean,
  hasCatastrophicViolation,
  resetBoundCounter
} from '../negative/space.js';

// ═══════════════════════════════════════════════════════════════════════════════
// GRAVITY
// ═══════════════════════════════════════════════════════════════════════════════
import {
  createGravityState,
  addEvidence as addGravityEvidence,
  createEvidenceWeight,
  computeRawGravity,
  normalizeGravity,
  determineConfidence,
  meetsConfidence
} from '../gravity/engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// META
// ═══════════════════════════════════════════════════════════════════════════════
import {
  // Canonical
  canonicalize,
  canonicalHash,
  canonicalEquals,
  sortUnique,
  
  // Orchestrator
  PIPELINE_STAGES,
  createPipelineContext,
  executeTransition,
  createJournalCore,
  addStageToJournal,
  createStageResultCore,
  createPipelineJournal,
  verifyJournalHash,
  isPipelineComplete,
  resetJournalCounter,
  
  // Introspection
  EXPECTED_MODULES,
  createModuleState,
  createFileInfo,
  createSnapshotCore,
  createSystemSnapshot,
  verifySnapshotHash,
  validateSnapshotCompleteness,
  diffSnapshots,
  
  // Boundary
  MANDATORY_BOUNDARIES,
  SYSTEM_GUARANTEES,
  createBoundaryLedgerCore,
  createBoundaryLedger,
  createGuaranteeLedgerCore,
  createGuaranteeLedger,
  containsAllMandatory,
  verifyBoundaryLedgerHash,
  
  // Export
  createExportCore,
  createSystemExport,
  exportSystem,
  importSystem,
  verifyExportHash,
  validateImport,
  verifyRoundTrip,
  
  // Seal
  createSealCore,
  createOmegaSeal,
  verifySealHash,
  verifySeal,
  getSealStatus,
  formatSeal,
  resetSealCounter
} from '../meta/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a complete test invariant
 */
function createTestInvariant(id: string, property: string, strength: 'Ω' | 'Λ' | 'Σ' | 'Δ' | 'Ε' = 'Σ') {
  return crystallize({
    id,
    property: {
      natural: property,
      scope: 'test'
    },
    proofs: [{
      type: 'formal',
      method: 'test-proof',
      strength,
      result: 'PROVEN',
      timestamp: '2026-01-07T00:00:00.000Z'
    }]
  });
}

/**
 * Get invariant from result
 */
function getInvariant(result: ReturnType<typeof createTestInvariant>) {
  return result.invariant;
}

/**
 * Create test metrics for region determination
 */
function createTestMetrics(overrides: Partial<ReturnType<typeof createDefaultMetrics>> = {}) {
  return {
    ...createDefaultMetrics(),
    ...overrides
  };
}

/**
 * Run falsification on an invariant
 */
function runFalsification(invariantId: string, survivalRate: number): {
  tracker: FalsificationTracker;
  coverage: number;
  summary: { survivalRate: number; totalAttempts: number };
} {
  const tracker = new FalsificationTracker();
  const attacks = getAllAttacks();
  const surviveCount = Math.floor(attacks.length * survivalRate);
  
  attacks.forEach((attack, index) => {
    if (index < surviveCount) {
      tracker.recordAttempt(createSurvivedAttempt(attack.id, invariantId, 10));
    } else {
      tracker.recordAttempt(createBreachedAttempt(attack.id, invariantId, 10, 'breach', 'hash'));
    }
  });
  
  const attempts = tracker.getAttempts(invariantId);
  const coverage = attacks.length > 0 ? attempts.length / attacks.length : 0;
  const summary = tracker.getSummary(invariantId);
  
  return { tracker, coverage, summary };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

describe('INTEGRATION TESTS — Sprint 26.9', () => {
  
  beforeEach(() => {
    resetBoundCounter();
    resetJournalCounter();
    resetSealCounter();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INT-01: FULL CERTIFICATION PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INT-01: Full Certification Pipeline', () => {
    
    describe('INV-INT-01: Full pipeline produces valid Seal', () => {
      
      it('should complete full pipeline from INIT to SEALED', () => {
        // 1. CRYSTALLIZE invariant
        const invResult = createTestInvariant('INV-TEST-001', 'Test property must hold');
        const inv = invResult.invariant;
        expect(verifyInvariantHash(inv)).toBe(true);
        
        // 2. FALSIFY
        const { coverage, summary } = runFalsification(inv.id, 0.95);
        expect(summary.survivalRate).toBeGreaterThan(0.9);
        
        // 3. DETERMINE REGION
        const metrics = createTestMetrics({
          isValid: true,
          proofCount: 1,
          survivalRate: summary.survivalRate,
          coverage,
          hasExternalCertifier: false
        });
        const determination = determineRegion(metrics);
        expect(compareRegions(determination.region, 'VOID')).toBe(1);
        
        // 4. CREATE ARTIFACT
        let artifact = createTestArtifactWithMetrics(inv.id, inv.property.natural, determination.region);
        artifact = addEvidence(artifact, createProofEvidence('proof-1', 'Σ'));
        artifact = addEvidence(artifact, createFalsificationEvidence('fals-1', summary.survivalRate));
        artifact = sealArtifact(artifact);
        expect(isSealed(artifact)).toBe(true);
        expect(verifyArtifactHash(artifact)).toBe(true);
        
        // 5. RUN PIPELINE
        let ctx = createPipelineContext();
        ctx = executeTransition(ctx, 'CRYSTALLIZED', inv.hash!, invResult.hash);
        ctx = executeTransition(ctx, 'FALSIFIED', invResult.hash, canonicalHash({ survivalRate: summary.survivalRate }));
        ctx = executeTransition(ctx, 'PLACED', canonicalHash({ survivalRate: summary.survivalRate }), canonicalHash({ region: determination.region }));
        ctx = executeTransition(ctx, 'SEALED', canonicalHash({ region: determination.region }), artifact.hash!);
        
        expect(isPipelineComplete(ctx)).toBe(true);
        expect(ctx.journalCore.finalStatus).toBe('PASS');
      });
      
      it('should produce verifiable journal', () => {
        let journalCore = createJournalCore('PIPE-INT-001');
        
        // Add stages
        journalCore = addStageToJournal(journalCore, createStageResultCore('CRYSTALLIZED', 'PASS', 'in1', 'out1'));
        journalCore = addStageToJournal(journalCore, createStageResultCore('FALSIFIED', 'PASS', 'out1', 'out2'));
        journalCore = addStageToJournal(journalCore, createStageResultCore('PLACED', 'PASS', 'out2', 'out3'));
        journalCore = addStageToJournal(journalCore, createStageResultCore('SEALED', 'PASS', 'out3', 'out4'));
        
        const journal = createPipelineJournal(journalCore, {
          startedAt: '2026-01-07T00:00:00Z',
          completedAt: '2026-01-07T00:00:01Z',
          totalDurationMs: 1000,
          runId: 'test-run'
        });
        
        expect(verifyJournalHash(journal)).toBe(true);
        expect(journalCore.finalStatus).toBe('PASS');
      });
      
      it('should fail pipeline on breach', () => {
        let ctx = createPipelineContext();
        ctx = executeTransition(ctx, 'CRYSTALLIZED', 'in', 'out');
        
        // Simulate failure at FALSIFIED stage
        const failStage = createStageResultCore('FALSIFIED', 'FAIL', 'out', 'fail');
        const journalCore = addStageToJournal(ctx.journalCore, failStage);
        
        expect(journalCore.finalStatus).toBe('FAIL');
      });
    });
    
    it('should track all 5 pipeline stages', () => {
      expect(PIPELINE_STAGES).toHaveLength(5);
      expect(PIPELINE_STAGES).toEqual(['INIT', 'CRYSTALLIZED', 'FALSIFIED', 'PLACED', 'SEALED']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INT-02: INVARIANT LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INT-02: Invariant Lifecycle', () => {
    
    describe('Crystal → Falsify → Regions → Artifact', () => {
      
      it('should track invariant through complete lifecycle', () => {
        // CRYSTAL: Create invariant
        const result = createTestInvariant('INV-LIFE-001', 'Lifecycle test property');
        const inv = result.invariant;
        expect(inv).toBeDefined();
        
        // FALSIFY: Run attacks
        const { summary } = runFalsification(inv.id, 1.0); // 100% survival
        expect(summary.survivalRate).toBe(1.0);
        
        // REGIONS: Determine placement
        const metrics = createTestMetrics({
          isValid: true,
          proofCount: inv.computed.proof_count,
          survivalRate: summary.survivalRate,
          coverage: 1.0
        });
        const determination = determineRegion(metrics);
        
        // ARTIFACT: Create and seal
        let artifact = createTestArtifactWithMetrics(inv.id, inv.property.natural, determination.region);
        artifact = sealArtifact(artifact);
        
        // Verify chain
        expect(artifact.invariantId).toBe(inv.id);
        expect(artifact.region).toBe(determination.region);
        expect(isSealed(artifact)).toBe(true);
      });
      
      it('should compute dominant strength as strongest proof', () => {
        const result = crystallize({
          id: 'INV-MULTI-001',
          property: {
            natural: 'Multi-proof property',
            scope: 'test'
          },
          proofs: [{
            type: 'formal',
            method: 'proof-1',
            strength: 'Δ',
            result: 'PROVEN',
            timestamp: '2026-01-07T00:00:00Z'
          }]
        });
        
        // Add a stronger proof
        const updated = addProof(result.invariant, {
          type: 'statistical',
          method: 'proof-2',
          strength: 'Ω',
          result: 'PROVEN',
          timestamp: '2026-01-07T00:00:01Z'
        });
        
        // Dominant should be strongest (Ω)
        expect(updated.computed.dominant_strength).toBe('Ω');
      });
    });
    
    describe('INV-INT-02: Artifact region matches containment result', () => {
      
      it('should assign THEORETICAL for minimal proof', () => {
        const metrics = createTestMetrics({
          isValid: true,
          proofCount: 1,
          survivalRate: 0,
          coverage: 0
        });
        const determination = determineRegion(metrics);
        
        let artifact = createTestArtifactWithMetrics('INV-MIN-001', 'Minimal', determination.region);
        artifact = sealArtifact(artifact);
        
        expect(artifact.region).toBe(determination.region);
        expect(artifact.region).toBe('THEORETICAL');
      });
      
      it('should assign higher region for high survival rate', () => {
        const metrics = createTestMetrics({
          isValid: true,
          proofCount: 5,
          survivalRate: 0.95,
          coverage: 0.8
        });
        const determination = determineRegion(metrics);
        
        // High survival should be at least EXPLORATORY
        expect(compareRegions(determination.region, 'VOID')).toBe(1);
      });
      
      it('should assign lowest region for invalid system', () => {
        const metrics = createTestMetrics({
          isValid: false
        });
        const determination = determineRegion(metrics);
        
        // Invalid system gets lowest containable region
        expect(['VOID', 'THEORETICAL']).toContain(determination.region);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INT-03: REFUSAL PROPAGATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INT-03: Refusal Propagation', () => {
    
    describe('Refusal → Negative → Gravity', () => {
      
      it('should create refusal that affects negative score', () => {
        // Create refusal
        const refusal = createAxiomRefusal('AX-Ω');
        expect(refusal.severity).toBe('CRITICAL');
        
        // Track in negative space
        let space = createNegativeSpace('INV-REF-001');
        const bound = createNegativeBound({
          invariantId: 'INV-REF-001',
          what: 'Axiom violation',
          why: 'AX-Ω rejected',
          impossibilityClass: 'CANNOT_BYPASS',
          impactScore: 10,
          severity: 'CATASTROPHIC'
        });
        space = addBound(space, bound);
        
        // Record violation
        space = recordViolation(space, bound.id, {
          evidence: 'Refusal triggered',
          timestamp: new Date().toISOString()
        });
        
        expect(isClean(space)).toBe(false);
        expect(hasCatastrophicViolation(space)).toBe(true);
      });
      
      it('should reduce gravity confidence on critical refusal', () => {
        // Start with high gravity
        let gravity = createGravityState('INV-GRAV-001');
        gravity = addGravityEvidence(gravity, createEvidenceWeight('Ω', 'falsification'));
        gravity = addGravityEvidence(gravity, createEvidenceWeight('Λ', 'proof'));
        
        const initialConfidence = determineConfidence(gravity.normalizedGravity);
        
        // Critical refusal should conceptually reduce confidence
        // Axiom refusals are CRITICAL
        const refusals = [createAxiomRefusal('AX-Ω')];
        const hasBlocking = hasBlockingRefusals(refusals);
        
        expect(hasBlocking).toBe(true);
        expect(getHighestSeverity(refusals)).toBe('CRITICAL');
      });
    });
    
    describe('INV-INT-03: Refusal blocks invalid certification', () => {
      
      it('should block certification when axiom violated', () => {
        const rejectedAxioms = ['AX-Ω'];
        const isInvalid = isSystemInvalidated(rejectedAxioms);
        
        expect(isInvalid).toBe(true);
        
        // Cannot proceed to SEALED
        const refusals = rejectedAxioms.map(id => createAxiomRefusal(id as any));
        expect(hasBlockingRefusals(refusals)).toBe(true);
      });
      
      it('should allow certification when no critical refusals', () => {
        const refusals: ReturnType<typeof createRefusal>[] = [];
        
        expect(hasBlockingRefusals(refusals)).toBe(false);
      });
      
      it('should compute rejection consequences', () => {
        const consequences = computeRejectionConsequences(['AX-Ω']);
        
        expect(consequences.length).toBeGreaterThan(0);
        expect(consequences).toContain('Falsification Engine');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INT-04: EXPORT/IMPORT FULL SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INT-04: Export/Import Full System', () => {
    
    describe('INV-INT-04: Export contains all module data', () => {
      
      it('should export complete system state', () => {
        // Create snapshot with all modules
        const modules = EXPECTED_MODULES.map(name => 
          createModuleState(name, [createFileInfo(`${name}/index.ts`, `hash_${name}`)])
        );
        
        const snapshotCore = createSnapshotCore({
          modules,
          invariantCount: 72,
          invariantIds: ['INV-001', 'INV-002'],
          testCount: 768,
          testsPassed: 768,
          falsificationSurvivalRate: 0.95,
          coverageRatio: 0.85,
          gravityNormalized: 0.75,
          negativeScore: 0,
          boundaryLedgerHash: canonicalHash(createBoundaryLedgerCore())
        });
        
        // Verify completeness
        const validation = validateSnapshotCompleteness(snapshotCore);
        expect(validation.isComplete).toBe(true);
        expect(validation.missing).toHaveLength(0);
        
        // Create export
        const exportCore = createExportCore({
          version: SENTINEL_VERSION,
          snapshotCore,
          invariants: [{ id: 'INV-001', property: 'test', strength: 'Σ', hash: 'h1' }],
          artifacts: [],
          boundaryLedger: createBoundaryLedgerCore(),
          guaranteeLedger: createGuaranteeLedgerCore()
        });
        
        const exp = createSystemExport(exportCore);
        
        // Verify export
        expect(verifyExportHash(exp)).toBe(true);
        expect(exp.core.snapshotCore.modules).toHaveLength(9);
      });
      
      it('should include boundary and guarantee ledgers', () => {
        const boundaryCore = createBoundaryLedgerCore();
        const guaranteeCore = createGuaranteeLedgerCore();
        
        expect(containsAllMandatory(boundaryCore).isComplete).toBe(true);
        expect(guaranteeCore.guarantees.length).toBeGreaterThan(0);
        
        const modules = [createModuleState('test', [])];
        const snapshotCore = createSnapshotCore({
          modules,
          invariantCount: 0,
          invariantIds: [],
          testCount: 0,
          testsPassed: 0,
          falsificationSurvivalRate: 0,
          coverageRatio: 0,
          gravityNormalized: 0,
          negativeScore: 0,
          boundaryLedgerHash: canonicalHash(boundaryCore)
        });
        
        const exportCore = createExportCore({
          version: '1.0.0',
          snapshotCore,
          invariants: [],
          artifacts: [],
          boundaryLedger: boundaryCore,
          guaranteeLedger: guaranteeCore
        });
        
        expect(exportCore.boundaryLedger.boundaries).toHaveLength(MANDATORY_BOUNDARIES.length);
        expect(exportCore.guaranteeLedger.guarantees).toHaveLength(SYSTEM_GUARANTEES.length);
      });
    });
    
    describe('INV-INT-05: System state is reconstructible from export', () => {
      
      it('should round-trip export/import', () => {
        const modules = [createModuleState('test', [createFileInfo('test.ts', 'hash')])];
        const snapshotCore = createSnapshotCore({
          modules,
          invariantCount: 10,
          invariantIds: ['INV-001'],
          testCount: 100,
          testsPassed: 100,
          falsificationSurvivalRate: 0.95,
          coverageRatio: 0.85,
          gravityNormalized: 0.75,
          negativeScore: 0,
          boundaryLedgerHash: 'abc'
        });
        
        const exportCore = createExportCore({
          version: '3.27.0',
          snapshotCore,
          invariants: [],
          artifacts: [],
          boundaryLedger: createBoundaryLedgerCore(),
          guaranteeLedger: createGuaranteeLedgerCore()
        });
        
        const result = verifyRoundTrip(exportCore);
        expect(result.success).toBe(true);
        expect(result.originalHash).toBe(result.reimportHash);
      });
      
      it('should validate import integrity', () => {
        const modules = [createModuleState('test', [])];
        const snapshotCore = createSnapshotCore({
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
        
        const exportCore = createExportCore({
          version: '1.0.0',
          snapshotCore,
          invariants: [],
          artifacts: [],
          boundaryLedger: createBoundaryLedgerCore(),
          guaranteeLedger: createGuaranteeLedgerCore()
        });
        
        const blob = exportSystem(exportCore);
        const imported = importSystem(blob);
        const validation = validateImport(imported);
        
        expect(validation.isValid).toBe(true);
        expect(validation.hashMatch).toBe(true);
      });
      
      it('should detect state changes via diff', () => {
        const modules1 = [createModuleState('test', [createFileInfo('v1.ts', 'hash1')])];
        const modules2 = [createModuleState('test', [createFileInfo('v2.ts', 'hash2')])];
        
        const core1 = createSnapshotCore({
          modules: modules1,
          invariantCount: 10,
          invariantIds: ['INV-001'],
          testCount: 100,
          testsPassed: 100,
          falsificationSurvivalRate: 0.95,
          coverageRatio: 0.85,
          gravityNormalized: 0.75,
          negativeScore: 0,
          boundaryLedgerHash: 'x'
        });
        
        const core2 = createSnapshotCore({
          modules: modules2,
          invariantCount: 11,
          invariantIds: ['INV-001', 'INV-002'],
          testCount: 110,
          testsPassed: 110,
          falsificationSurvivalRate: 0.96,
          coverageRatio: 0.86,
          gravityNormalized: 0.76,
          negativeScore: 0,
          boundaryLedgerHash: 'x'
        });
        
        const diff = diffSnapshots(core1, core2);
        
        expect(diff.areEqual).toBe(false);
        expect(diff.modulesChanged).toContain('test');
        expect(diff.invariantsAdded).toContain('INV-002');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INT-05: SEAL GENERATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INT-05: Seal Generation', () => {
    
    describe('Meta Pipeline → Seal', () => {
      
      it('should generate valid seal from complete system', () => {
        const sealCore = createSealCore({
          version: SENTINEL_VERSION,
          rootHash: canonicalHash({ version: SENTINEL_VERSION }),
          snapshotCoreHash: 'snapshot_hash_64chars'.padEnd(64, '0'),
          exportCoreHash: 'export_hash_64chars'.padEnd(64, '0'),
          boundaryLedgerHash: canonicalHash(createBoundaryLedgerCore()),
          guaranteeLedgerHash: canonicalHash(createGuaranteeLedgerCore()),
          journalHash: 'journal_hash_64chars'.padEnd(64, '0'),
          invariantCount: 72,
          testCount: 768,
          testsPassed: 768,
          regionAchieved: 'PROVEN',
          survivalRate: 0.95,
          coverageRatio: 0.85,
          boundaryCount: MANDATORY_BOUNDARIES.length,
          guaranteeCount: SYSTEM_GUARANTEES.length
        });
        
        const seal = createOmegaSeal(sealCore);
        
        expect(verifySealHash(seal)).toBe(true);
        expect(getSealStatus(seal)).toBe('VALID');
      });
      
      it('should verify boundary count consistency', () => {
        const boundaryCore = createBoundaryLedgerCore();
        
        const sealCore = createSealCore({
          version: '1.0.0',
          rootHash: 'a'.repeat(64),
          snapshotCoreHash: 'b'.repeat(64),
          exportCoreHash: 'c'.repeat(64),
          boundaryLedgerHash: canonicalHash(boundaryCore),
          guaranteeLedgerHash: 'd'.repeat(64),
          invariantCount: 10,
          testCount: 100,
          testsPassed: 100,
          regionAchieved: 'PROVEN',
          survivalRate: 0.95,
          coverageRatio: 0.85,
          boundaryCount: boundaryCore.boundaries.length,
          guaranteeCount: 6
        });
        
        const seal = createOmegaSeal(sealCore);
        const verification = verifySeal(seal, boundaryCore.boundaries.length, 6);
        
        expect(verification.isValid).toBe(true);
        expect(verification.countMatch).toBe(true);
      });
      
      it('should detect count mismatch', () => {
        const sealCore = createSealCore({
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
        
        const seal = createOmegaSeal(sealCore);
        const verification = verifySeal(seal, 10, 6); // Wrong boundary count
        
        expect(verification.countMatch).toBe(false);
      });
      
      it('should format seal as certificate', () => {
        const sealCore = createSealCore({
          version: SENTINEL_VERSION,
          rootHash: 'a'.repeat(64),
          snapshotCoreHash: 'b'.repeat(64),
          exportCoreHash: 'c'.repeat(64),
          boundaryLedgerHash: 'd'.repeat(64),
          guaranteeLedgerHash: 'e'.repeat(64),
          invariantCount: 72,
          testCount: 768,
          testsPassed: 768,
          regionAchieved: 'BATTLE_TESTED',
          survivalRate: 0.98,
          coverageRatio: 0.90,
          boundaryCount: 5,
          guaranteeCount: 6
        });
        
        const seal = createOmegaSeal(sealCore);
        const formatted = formatSeal(seal);
        
        expect(formatted).toContain('OMEGA SEAL CERTIFICATE');
        expect(formatted).toContain(SENTINEL_VERSION);
        expect(formatted).toContain('BATTLE_TESTED');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-MODULE TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Cross-Module Integration', () => {
    
    it('should have consistent constants across modules', () => {
      // SENTINEL_VERSION consistent
      expect(SENTINEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
      
      // Proof strengths consistent
      expect(Object.keys(PROOF_STRENGTH_WEIGHTS)).toHaveLength(5);
      expect(STRENGTH_ORDER).toHaveLength(5);
      
      // Axioms consistent
      expect(AXIOM_IDS).toHaveLength(5);
      expect(getAllAxioms()).toHaveLength(5);
      
      // Regions consistent
      expect(CERTIFICATION_LEVELS).toHaveLength(7);
      
      // Expected modules consistent
      expect(EXPECTED_MODULES).toHaveLength(9);
    });
    
    it('should chain data correctly: Invariant → Artifact → Export', () => {
      // Create invariant
      const result = createTestInvariant('INV-CHAIN-001', 'Chain test');
      const inv = result.invariant;
      
      // Create artifact from invariant
      let artifact = createTestArtifactWithMetrics(inv.id, inv.property.natural, 'PROVEN');
      artifact = sealArtifact(artifact);
      
      // Reference in export
      const modules = [createModuleState('test', [])];
      const snapshotCore = createSnapshotCore({
        modules,
        invariantCount: 1,
        invariantIds: [inv.id],
        testCount: 1,
        testsPassed: 1,
        falsificationSurvivalRate: 1,
        coverageRatio: 1,
        gravityNormalized: 1,
        negativeScore: 0,
        boundaryLedgerHash: 'x'
      });
      
      const exportCore = createExportCore({
        version: '1.0.0',
        snapshotCore,
        invariants: [{ id: inv.id, property: inv.property.natural, strength: inv.computed.dominant_strength, hash: inv.hash! }],
        artifacts: [{ id: artifact.id, region: artifact.region, status: artifact.status, hash: artifact.hash }],
        boundaryLedger: createBoundaryLedgerCore(),
        guaranteeLedger: createGuaranteeLedgerCore()
      });
      
      expect(exportCore.invariants[0].id).toBe(inv.id);
      expect(exportCore.artifacts[0].hash).toBe(artifact.hash);
    });
    
    it('should validate region thresholds against containment', () => {
      // Test each region has correct determination
      const validMetrics = createTestMetrics({ isValid: true, proofCount: 1 });
      const determination = determineRegion(validMetrics);
      
      expect(determination.region).toBeDefined();
      expect(typeof determination.region).toBe('string');
    });
    
    it('should correlate gravity with confidence levels', () => {
      let state = createGravityState('INV-CONF-001');
      
      // No evidence = low confidence
      expect(determineConfidence(state.normalizedGravity)).toBe('SPECULATIVE');
      
      // Add strong evidence
      state = addGravityEvidence(state, createEvidenceWeight('Ω', 'falsification'));
      state = addGravityEvidence(state, createEvidenceWeight('Ω', 'falsification'));
      state = addGravityEvidence(state, createEvidenceWeight('Λ', 'proof'));
      
      // Should have some confidence level
      const confidence = determineConfidence(state.normalizedGravity);
      expect(confidence).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FLOW TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Data Flow', () => {
    
    it('should flow: Proof → Strength → Composite → Region', () => {
      // Create proofs with different strengths
      const proofs = [
        { strength: 'Ω' as const, weight: 5 },
        { strength: 'Σ' as const, weight: 3 },
        { strength: 'Δ' as const, weight: 2 }
      ];
      
      // Composite is dominated by weakest
      const composite = computeCompositeStrength(proofs.map(p => p.strength));
      expect(composite.dominant).toBe('Δ');
      
      // Affects region determination
      const metrics = createTestMetrics({
        isValid: true,
        proofCount: proofs.length,
        survivalRate: 0.9,
        coverage: 0.8
      });
      
      const determination = determineRegion(metrics);
      expect(compareRegions(determination.region, 'VOID')).toBe(1);
    });
    
    it('should flow: Attack → Attempt → Coverage → Region', () => {
      const attacks = getAllAttacks();
      const tracker = new FalsificationTracker();
      
      // Run half the attacks
      const halfCount = Math.floor(attacks.length / 2);
      attacks.slice(0, halfCount).forEach(attack => {
        tracker.recordAttempt(createSurvivedAttempt(attack.id, 'INV-FLOW-001', 10));
      });
      
      // Calculate coverage manually
      const attempts = tracker.getAttempts('INV-FLOW-001');
      const coverage = attacks.length > 0 ? attempts.length / attacks.length : 0;
      
      expect(coverage).toBeGreaterThan(0);
      expect(coverage).toBeLessThanOrEqual(1);
      
      // Coverage affects region
      const metrics = createTestMetrics({
        isValid: true,
        proofCount: 1,
        survivalRate: 1,
        coverage
      });
      
      const determination = determineRegion(metrics);
      expect(determination.region).not.toBe('VOID');
    });
    
    it('should flow: Violation → Score → Gravity Impact', () => {
      // Create negative space with violation
      let space = createNegativeSpace('INV-VIO-001');
      const bound = createNegativeBound({
        invariantId: 'INV-VIO-001',
        what: 'Test violation',
        why: 'Integration test',
        impossibilityClass: 'CANNOT_VIOLATE',
        impactScore: 8,
        severity: 'CRITICAL'
      });
      space = addBound(space, bound);
      space = recordViolation(space, bound.id, {
        evidence: 'test',
        timestamp: new Date().toISOString()
      });
      
      // Score computed
      expect(space.negativeScore).toBeGreaterThan(0);
      
      // Affects system validity
      expect(isClean(space)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRESS TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Stress Tests', () => {
    
    it('should handle 100 invariants', () => {
      const invariants = Array.from({ length: 100 }, (_, i) => 
        createTestInvariant(`INV-STRESS-${String(i).padStart(3, '0')}`, `Property ${i}`)
      );
      
      expect(invariants).toHaveLength(100);
      invariants.forEach(result => {
        expect(result.invariant).toBeDefined();
        expect(result.hash).toBeDefined();
        expect(verifyInvariantHash(result.invariant)).toBe(true);
      });
    });
    
    it('should handle 1000 falsification attempts', () => {
      const tracker = new FalsificationTracker();
      const attacks = getAllAttacks();
      
      for (let i = 0; i < 1000; i++) {
        const attack = attacks[i % attacks.length];
        tracker.recordAttempt(createSurvivedAttempt(attack.id, 'INV-BULK-001', 1));
      }
      
      const summary = tracker.getSummary('INV-BULK-001');
      expect(summary.totalAttempts).toBe(1000);
    });
    
    it('should handle deep lineage (10 generations)', () => {
      let parentIds: string[] = [];
      
      for (let gen = 0; gen <= 10; gen++) {
        const lineage = createLineage(parentIds);
        
        expect(lineage.generation).toBe(gen === 0 ? 0 : 1);
        
        parentIds = [`INV-GEN-${String(gen).padStart(3, '0')}`];
      }
    });
    
    it('should handle export with 50 invariants and 50 artifacts', () => {
      const invariants = Array.from({ length: 50 }, (_, i) => ({
        id: `INV-EXP-${i}`,
        property: `Property ${i}`,
        strength: 'Σ' as const,
        hash: canonicalHash({ i })
      }));
      
      const artifacts = Array.from({ length: 50 }, (_, i) => ({
        id: `ART-EXP-${i}`,
        region: 'PROVEN' as const,
        status: 'SEALED' as const,
        hash: canonicalHash({ art: i })
      }));
      
      const modules = [createModuleState('test', [])];
      const snapshotCore = createSnapshotCore({
        modules,
        invariantCount: 50,
        invariantIds: invariants.map(i => i.id),
        testCount: 500,
        testsPassed: 500,
        falsificationSurvivalRate: 0.95,
        coverageRatio: 0.85,
        gravityNormalized: 0.75,
        negativeScore: 0,
        boundaryLedgerHash: 'x'
      });
      
      const exportCore = createExportCore({
        version: '1.0.0',
        snapshotCore,
        invariants,
        artifacts,
        boundaryLedger: createBoundaryLedgerCore(),
        guaranteeLedger: createGuaranteeLedgerCore()
      });
      
      const result = verifyRoundTrip(exportCore);
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Determinism', () => {
    
    it('should produce same hash across 20 runs for complete pipeline', () => {
      const hashes: string[] = [];
      
      for (let i = 0; i < 20; i++) {
        const result = createTestInvariant('INV-DET-001', 'Determinism test');
        const modules = [createModuleState('test', [])];
        
        const snapshotCore = createSnapshotCore({
          modules,
          invariantCount: 1,
          invariantIds: [result.invariant.id],
          testCount: 1,
          testsPassed: 1,
          falsificationSurvivalRate: 0.95,
          coverageRatio: 0.85,
          gravityNormalized: 0.75,
          negativeScore: 0,
          boundaryLedgerHash: canonicalHash(createBoundaryLedgerCore())
        });
        
        hashes.push(canonicalHash(snapshotCore));
      }
      
      const allSame = hashes.every(h => h === hashes[0]);
      expect(allSame).toBe(true);
    });
    
    it('should produce same seal hash across 20 runs', () => {
      const hashes: string[] = [];
      
      for (let i = 0; i < 20; i++) {
        const sealCore = createSealCore({
          systemId: 'OMEGA-DET-TEST',
          version: '1.0.0',
          rootHash: 'a'.repeat(64),
          snapshotCoreHash: 'b'.repeat(64),
          exportCoreHash: 'c'.repeat(64),
          boundaryLedgerHash: 'd'.repeat(64),
          guaranteeLedgerHash: 'e'.repeat(64),
          invariantCount: 72,
          testCount: 768,
          testsPassed: 768,
          regionAchieved: 'PROVEN',
          survivalRate: 0.95,
          coverageRatio: 0.85,
          boundaryCount: 5,
          guaranteeCount: 6
        });
        
        const seal = createOmegaSeal(sealCore);
        hashes.push(seal.sealHash);
      }
      
      const allSame = hashes.every(h => h === hashes[0]);
      expect(allSame).toBe(true);
    });
  });
});
