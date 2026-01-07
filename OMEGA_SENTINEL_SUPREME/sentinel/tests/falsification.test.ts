/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FALSIFICATION MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/falsification.test
 * @version 2.0.0
 * 
 * INVARIANTS TESTED:
 * - INV-CORP-01: Corpus is versioned and immutable
 * - INV-CORP-02: Each attack has a unique ID
 * - INV-CORP-03: Each attack belongs to exactly one category
 * - INV-CORP-04: Categories partition the attack space
 * - INV-ENG-01: Survival rate = survived / total attempts
 * - INV-ENG-02: Coverage = unique attacks / total attacks
 * - INV-ENG-03: Falsification is deterministic
 * - INV-COV-01: Coverage is always [0, 1]
 * - INV-COV-02: Coverage calculation is deterministic
 * - INV-COV-03: Empty set yields 0 coverage
 * - INV-COV-04: Full corpus yields 1.0 coverage
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Corpus imports
import {
  ATTACK_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_WEIGHTS,
  DEFAULT_CORPUS,
  getAttack,
  getAllAttacks,
  getAttacksByCategory,
  getMandatoryAttacks,
  getAttacksBySeverity,
  getAttacksByTag,
  getAttackCountByCategory,
  hasAttack,
  getCorpusStats,
  isAttackCategory,
  isAttackSeverity,
  isValidAttackId
} from '../falsification/corpus.js';

// Engine imports
import {
  FalsificationTracker,
  DEFAULT_THRESHOLDS,
  createSurvivedAttempt,
  createBreachedAttempt,
  createSkippedAttempt,
  createErrorAttempt,
  computeWeightedSurvivalRate,
  computeFalsificationScore,
  validateAttackId,
  isValidOutcome
} from '../falsification/engine.js';

// Coverage imports
import {
  generateCoverageReport,
  analyzeCoverageGaps,
  COVERAGE_THRESHOLDS,
  meetsCoverageLevel,
  getMaxCoverageLevel,
  calculateCoverageRatio,
  formatCoverage,
  isCompleteCoverage,
  getCoverageSummary
} from '../falsification/coverage.js';

import { FALSIFICATION_WEIGHTS, CORPUS_VERSION } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CORPUS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Falsification Corpus', () => {
  
  describe('INV-CORP-01: Versioning and Immutability', () => {
    
    it('should have version matching CORPUS_VERSION', () => {
      expect(DEFAULT_CORPUS.version).toBe(CORPUS_VERSION);
    });
    
    it('should have frozen corpus', () => {
      expect(Object.isFrozen(DEFAULT_CORPUS)).toBe(true);
    });
    
    it('should have creation timestamp', () => {
      expect(DEFAULT_CORPUS.createdAt).toBeDefined();
      expect(typeof DEFAULT_CORPUS.createdAt).toBe('string');
    });
    
  });
  
  describe('INV-CORP-02: Unique Attack IDs', () => {
    
    it('should have no duplicate attack IDs', () => {
      const attacks = getAllAttacks();
      const ids = attacks.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
    
    it('should have valid ID format for all attacks', () => {
      const attacks = getAllAttacks();
      for (const attack of attacks) {
        expect(isValidAttackId(attack.id)).toBe(true);
      }
    });
    
  });
  
  describe('INV-CORP-03: Single Category Assignment', () => {
    
    it('should have exactly one category per attack', () => {
      const attacks = getAllAttacks();
      for (const attack of attacks) {
        expect(ATTACK_CATEGORIES).toContain(attack.category);
      }
    });
    
  });
  
  describe('INV-CORP-04: Category Partition', () => {
    
    it('should have exactly 4 categories', () => {
      expect(ATTACK_CATEGORIES).toHaveLength(4);
    });
    
    it('should include structural, semantic, temporal, existential', () => {
      expect(ATTACK_CATEGORIES).toContain('structural');
      expect(ATTACK_CATEGORIES).toContain('semantic');
      expect(ATTACK_CATEGORIES).toContain('temporal');
      expect(ATTACK_CATEGORIES).toContain('existential');
    });
    
    it('should have descriptions for all categories', () => {
      for (const cat of ATTACK_CATEGORIES) {
        expect(CATEGORY_DESCRIPTIONS[cat]).toBeDefined();
        expect(CATEGORY_DESCRIPTIONS[cat].length).toBeGreaterThan(0);
      }
    });
    
    it('should have weights for all categories', () => {
      for (const cat of ATTACK_CATEGORIES) {
        expect(CATEGORY_WEIGHTS[cat]).toBeDefined();
        expect(CATEGORY_WEIGHTS[cat]).toBeGreaterThan(0);
      }
    });
    
    it('should have weights matching FALSIFICATION_WEIGHTS', () => {
      expect(CATEGORY_WEIGHTS.structural).toBe(FALSIFICATION_WEIGHTS.STRUCTURAL);
      expect(CATEGORY_WEIGHTS.semantic).toBe(FALSIFICATION_WEIGHTS.SEMANTIC);
      expect(CATEGORY_WEIGHTS.temporal).toBe(FALSIFICATION_WEIGHTS.TEMPORAL);
      expect(CATEGORY_WEIGHTS.existential).toBe(FALSIFICATION_WEIGHTS.EXISTENTIAL);
    });
    
  });
  
  describe('Attack Queries', () => {
    
    it('getAttack should return attack by ID', () => {
      const attack = getAttack('ATK-STR-001');
      expect(attack).toBeDefined();
      expect(attack!.id).toBe('ATK-STR-001');
    });
    
    it('getAttack should return undefined for unknown ID', () => {
      const attack = getAttack('ATK-XXX-999');
      expect(attack).toBeUndefined();
    });
    
    it('getAllAttacks should return all attacks', () => {
      const attacks = getAllAttacks();
      expect(attacks.length).toBe(DEFAULT_CORPUS.totalCount);
    });
    
    it('getAttacksByCategory should filter correctly', () => {
      const structural = getAttacksByCategory('structural');
      for (const attack of structural) {
        expect(attack.category).toBe('structural');
      }
    });
    
    it('getMandatoryAttacks should return only mandatory', () => {
      const mandatory = getMandatoryAttacks();
      for (const attack of mandatory) {
        expect(attack.mandatory).toBe(true);
      }
    });
    
    it('getAttacksBySeverity should filter correctly', () => {
      const critical = getAttacksBySeverity('CRITICAL');
      for (const attack of critical) {
        expect(attack.severity).toBe('CRITICAL');
      }
    });
    
    it('getAttacksByTag should filter by tag', () => {
      const nullAttacks = getAttacksByTag('null');
      expect(nullAttacks.length).toBeGreaterThan(0);
      for (const attack of nullAttacks) {
        expect(attack.tags).toContain('null');
      }
    });
    
    it('hasAttack should return correct value', () => {
      expect(hasAttack('ATK-STR-001')).toBe(true);
      expect(hasAttack('ATK-XXX-999')).toBe(false);
    });
    
  });
  
  describe('Corpus Statistics', () => {
    
    it('should have at least 20 attacks', () => {
      expect(DEFAULT_CORPUS.totalCount).toBeGreaterThanOrEqual(20);
    });
    
    it('should have attacks in all categories', () => {
      const counts = getAttackCountByCategory();
      for (const cat of ATTACK_CATEGORIES) {
        expect(counts[cat]).toBeGreaterThan(0);
      }
    });
    
    it('getCorpusStats should return complete stats', () => {
      const stats = getCorpusStats();
      expect(stats.version).toBe(CORPUS_VERSION);
      expect(stats.totalAttacks).toBe(DEFAULT_CORPUS.totalCount);
      expect(stats.mandatoryAttacks).toBeGreaterThan(0);
    });
    
  });
  
  describe('Type Guards', () => {
    
    it('isAttackCategory should validate correctly', () => {
      expect(isAttackCategory('structural')).toBe(true);
      expect(isAttackCategory('invalid')).toBe(false);
    });
    
    it('isAttackSeverity should validate correctly', () => {
      expect(isAttackSeverity('CRITICAL')).toBe(true);
      expect(isAttackSeverity('INVALID')).toBe(false);
    });
    
    it('isValidAttackId should validate format', () => {
      expect(isValidAttackId('ATK-STR-001')).toBe(true);
      expect(isValidAttackId('ATK-STRUCT-001')).toBe(false);
      expect(isValidAttackId('STR-001')).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Falsification Engine', () => {
  
  let tracker: FalsificationTracker;
  
  beforeEach(() => {
    tracker = new FalsificationTracker();
  });
  
  describe('FalsificationTracker', () => {
    
    it('should start with no attempts', () => {
      const attempts = tracker.getAttempts('INV-TEST-01');
      expect(attempts).toHaveLength(0);
    });
    
    it('should record attempts', () => {
      const attempt = createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01', 100);
      tracker.recordAttempt(attempt);
      
      const attempts = tracker.getAttempts('INV-TEST-01');
      expect(attempts).toHaveLength(1);
      expect(attempts[0].attackId).toBe('ATK-STR-001');
    });
    
    it('should track multiple attempts for same invariant', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-002', 'INV-TEST-01'));
      
      const attempts = tracker.getAttempts('INV-TEST-01');
      expect(attempts).toHaveLength(2);
    });
    
    it('should track attempts for different invariants separately', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-02'));
      
      expect(tracker.getAttempts('INV-TEST-01')).toHaveLength(1);
      expect(tracker.getAttempts('INV-TEST-02')).toHaveLength(1);
    });
    
    it('should list all tracked invariants', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-02'));
      
      const tracked = tracker.getTrackedInvariants();
      expect(tracked).toContain('INV-TEST-01');
      expect(tracked).toContain('INV-TEST-02');
    });
    
    it('should clear all data', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.clear();
      
      expect(tracker.getTrackedInvariants()).toHaveLength(0);
    });
    
  });
  
  describe('INV-ENG-01: Survival Rate Calculation', () => {
    
    it('should calculate survival rate = survived / total', () => {
      // 3 survived, 1 breached = 75% survival
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-002', 'INV-TEST-01'));
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-003', 'INV-TEST-01'));
      tracker.recordAttempt(createBreachedAttempt('ATK-STR-004', 'INV-TEST-01'));
      
      const summary = tracker.getSummary('INV-TEST-01');
      expect(summary.survivalRate).toBe(0.75);
    });
    
    it('should have 0% survival rate for all breached', () => {
      tracker.recordAttempt(createBreachedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createBreachedAttempt('ATK-STR-002', 'INV-TEST-01'));
      
      const summary = tracker.getSummary('INV-TEST-01');
      expect(summary.survivalRate).toBe(0);
    });
    
    it('should have 100% survival rate for all survived', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-002', 'INV-TEST-01'));
      
      const summary = tracker.getSummary('INV-TEST-01');
      expect(summary.survivalRate).toBe(1.0);
    });
    
    it('should exclude skipped from survival calculation', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createSkippedAttempt('ATK-STR-002', 'INV-TEST-01'));
      
      const summary = tracker.getSummary('INV-TEST-01');
      expect(summary.survivalRate).toBe(1.0);  // 1/1, not 1/2
    });
    
    it('should return 0 survival rate for no attempts', () => {
      const summary = tracker.getSummary('INV-NONEXISTENT');
      expect(summary.survivalRate).toBe(0);
    });
    
  });
  
  describe('Summary Statistics', () => {
    
    it('should count outcomes correctly', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createBreachedAttempt('ATK-STR-002', 'INV-TEST-01'));
      tracker.recordAttempt(createSkippedAttempt('ATK-STR-003', 'INV-TEST-01'));
      tracker.recordAttempt(createErrorAttempt('ATK-STR-004', 'INV-TEST-01', 'error'));
      
      const summary = tracker.getSummary('INV-TEST-01');
      expect(summary.survived).toBe(1);
      expect(summary.breached).toBe(1);
      expect(summary.skipped).toBe(1);
      expect(summary.errors).toBe(1);
      expect(summary.totalAttempts).toBe(4);
    });
    
    it('should track unique attacks', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));  // Duplicate
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-002', 'INV-TEST-01'));
      
      const summary = tracker.getSummary('INV-TEST-01');
      expect(summary.uniqueAttacks.size).toBe(2);
    });
    
    it('should track last attempt timestamp', () => {
      tracker.recordAttempt(createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01'));
      
      const summary = tracker.getSummary('INV-TEST-01');
      expect(summary.lastAttempt).not.toBeNull();
    });
    
  });
  
  describe('Attempt Factories', () => {
    
    it('createSurvivedAttempt should create correct attempt', () => {
      const attempt = createSurvivedAttempt('ATK-STR-001', 'INV-TEST-01', 100, 'notes');
      expect(attempt.outcome).toBe('SURVIVED');
      expect(attempt.attackId).toBe('ATK-STR-001');
      expect(attempt.invariantId).toBe('INV-TEST-01');
      expect(attempt.durationMs).toBe(100);
    });
    
    it('createBreachedAttempt should include evidence hash', () => {
      const attempt = createBreachedAttempt(
        'ATK-STR-001', 
        'INV-TEST-01', 
        100, 
        'breach notes',
        'abc123'
      );
      expect(attempt.outcome).toBe('BREACHED');
      expect(attempt.evidenceHash).toBe('abc123');
    });
    
    it('createSkippedAttempt should have 0 duration', () => {
      const attempt = createSkippedAttempt('ATK-STR-001', 'INV-TEST-01');
      expect(attempt.durationMs).toBe(0);
    });
    
    it('createErrorAttempt should require notes', () => {
      const attempt = createErrorAttempt('ATK-STR-001', 'INV-TEST-01', 'error message');
      expect(attempt.notes).toBe('error message');
    });
    
  });
  
  describe('Validation', () => {
    
    it('validateAttackId should check corpus', () => {
      expect(validateAttackId('ATK-STR-001')).toBe(true);
      expect(validateAttackId('ATK-XXX-999')).toBe(false);
    });
    
    it('isValidOutcome should validate outcomes', () => {
      expect(isValidOutcome('SURVIVED')).toBe(true);
      expect(isValidOutcome('BREACHED')).toBe(true);
      expect(isValidOutcome('SKIPPED')).toBe(true);
      expect(isValidOutcome('ERROR')).toBe(true);
      expect(isValidOutcome('INVALID')).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: COVERAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Coverage Calculator', () => {
  
  describe('INV-COV-01: Coverage Range [0, 1]', () => {
    
    it('calculateCoverageRatio should clamp to [0, 1]', () => {
      expect(calculateCoverageRatio(0, 10)).toBe(0);
      expect(calculateCoverageRatio(10, 10)).toBe(1);
      expect(calculateCoverageRatio(5, 10)).toBe(0.5);
    });
    
    it('coverage should never exceed 1', () => {
      const allAttacks = getAllAttacks();
      const allIds = new Set(allAttacks.map(a => a.id));
      
      const report = generateCoverageReport(allIds);
      expect(report.overall.ratio).toBeLessThanOrEqual(1);
      expect(report.weighted).toBeLessThanOrEqual(1);
    });
    
  });
  
  describe('INV-COV-02: Determinism', () => {
    
    it('should produce same report for same input', () => {
      const ids = new Set(['ATK-STR-001', 'ATK-SEM-001']);
      
      const report1 = generateCoverageReport(ids);
      const report2 = generateCoverageReport(ids);
      
      expect(report1.overall.ratio).toBe(report2.overall.ratio);
      expect(report1.weighted).toBe(report2.weighted);
    });
    
  });
  
  describe('INV-COV-03: Empty Set Coverage', () => {
    
    it('should return 0 coverage for empty set', () => {
      const report = generateCoverageReport(new Set());
      
      expect(report.overall.ratio).toBe(0);
      expect(report.overall.covered).toBe(0);
      expect(report.weighted).toBe(0);
    });
    
    it('should list all attacks as missing for empty set', () => {
      const report = generateCoverageReport(new Set());
      
      expect(report.missing.length).toBe(DEFAULT_CORPUS.totalCount);
    });
    
  });
  
  describe('INV-COV-04: Full Coverage', () => {
    
    it('should return 1.0 coverage for full corpus', () => {
      const allAttacks = getAllAttacks();
      const allIds = new Set(allAttacks.map(a => a.id));
      
      const report = generateCoverageReport(allIds);
      
      expect(report.overall.ratio).toBe(1);
      expect(report.overall.isComplete).toBe(true);
    });
    
    it('should have no missing attacks for full coverage', () => {
      const allAttacks = getAllAttacks();
      const allIds = new Set(allAttacks.map(a => a.id));
      
      const report = generateCoverageReport(allIds);
      
      expect(report.missing).toHaveLength(0);
    });
    
  });
  
  describe('Coverage Report', () => {
    
    it('should calculate by-category coverage', () => {
      const structural = getAttacksByCategory('structural');
      const structuralIds = new Set(structural.map(a => a.id));
      
      const report = generateCoverageReport(structuralIds);
      
      expect(report.byCategory.structural.ratio).toBe(1);
      expect(report.byCategory.semantic.ratio).toBe(0);
    });
    
    it('should calculate by-severity coverage', () => {
      const critical = getAttacksBySeverity('CRITICAL');
      const criticalIds = new Set(critical.map(a => a.id));
      
      const report = generateCoverageReport(criticalIds);
      
      expect(report.bySeverity.CRITICAL.ratio).toBe(1);
    });
    
    it('should track mandatory coverage separately', () => {
      const mandatory = getMandatoryAttacks();
      const mandatoryIds = new Set(mandatory.map(a => a.id));
      
      const report = generateCoverageReport(mandatoryIds);
      
      expect(report.mandatory.ratio).toBe(1);
    });
    
    it('should accept array input', () => {
      const report = generateCoverageReport(['ATK-STR-001', 'ATK-SEM-001']);
      expect(report.overall.covered).toBe(2);
    });
    
  });
  
  describe('Gap Analysis', () => {
    
    it('should identify coverage gaps', () => {
      // Only structural covered
      const structural = getAttacksByCategory('structural');
      const structuralIds = new Set(structural.map(a => a.id));
      
      const report = generateCoverageReport(structuralIds);
      const gaps = analyzeCoverageGaps(report);
      
      // Should have gaps for semantic, temporal, existential
      expect(gaps.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should not report gaps for complete categories', () => {
      const allAttacks = getAllAttacks();
      const allIds = new Set(allAttacks.map(a => a.id));
      
      const report = generateCoverageReport(allIds);
      const gaps = analyzeCoverageGaps(report);
      
      expect(gaps).toHaveLength(0);
    });
    
    it('should include recommendations', () => {
      const report = generateCoverageReport(new Set());
      const gaps = analyzeCoverageGaps(report);
      
      for (const gap of gaps) {
        expect(gap.recommendation).toBeDefined();
        expect(gap.recommendation.length).toBeGreaterThan(0);
      }
    });
    
  });
  
  describe('Coverage Thresholds', () => {
    
    it('should have all expected levels', () => {
      expect(COVERAGE_THRESHOLDS.BRONZE).toBeDefined();
      expect(COVERAGE_THRESHOLDS.SILVER).toBeDefined();
      expect(COVERAGE_THRESHOLDS.GOLD).toBeDefined();
      expect(COVERAGE_THRESHOLDS.PLATINUM).toBeDefined();
      expect(COVERAGE_THRESHOLDS.OMEGA).toBeDefined();
    });
    
    it('should have increasing thresholds', () => {
      expect(COVERAGE_THRESHOLDS.BRONZE.overall).toBeLessThan(
        COVERAGE_THRESHOLDS.SILVER.overall
      );
      expect(COVERAGE_THRESHOLDS.SILVER.overall).toBeLessThan(
        COVERAGE_THRESHOLDS.GOLD.overall
      );
    });
    
    it('meetsCoverageLevel should check all criteria', () => {
      // Full coverage should meet all levels
      const allIds = new Set(getAllAttacks().map(a => a.id));
      const report = generateCoverageReport(allIds);
      
      expect(meetsCoverageLevel(report, 'BRONZE')).toBe(true);
      expect(meetsCoverageLevel(report, 'OMEGA')).toBe(true);
    });
    
    it('empty coverage should not meet any level', () => {
      const report = generateCoverageReport(new Set());
      
      expect(meetsCoverageLevel(report, 'BRONZE')).toBe(false);
    });
    
    it('getMaxCoverageLevel should return highest met level', () => {
      const allIds = new Set(getAllAttacks().map(a => a.id));
      const report = generateCoverageReport(allIds);
      
      expect(getMaxCoverageLevel(report)).toBe('OMEGA');
    });
    
    it('getMaxCoverageLevel should return null for insufficient coverage', () => {
      const report = generateCoverageReport(new Set());
      expect(getMaxCoverageLevel(report)).toBeNull();
    });
    
  });
  
  describe('Utilities', () => {
    
    it('formatCoverage should produce percentage string', () => {
      expect(formatCoverage(0.5)).toBe('50.0%');
      expect(formatCoverage(1)).toBe('100.0%');
      expect(formatCoverage(0)).toBe('0.0%');
    });
    
    it('isCompleteCoverage should check overall', () => {
      const allIds = new Set(getAllAttacks().map(a => a.id));
      const fullReport = generateCoverageReport(allIds);
      const emptyReport = generateCoverageReport(new Set());
      
      expect(isCompleteCoverage(fullReport)).toBe(true);
      expect(isCompleteCoverage(emptyReport)).toBe(false);
    });
    
    it('getCoverageSummary should produce readable string', () => {
      const report = generateCoverageReport(new Set(['ATK-STR-001']));
      const summary = getCoverageSummary(report);
      
      expect(summary).toContain('Overall');
      expect(summary).toContain('Mandatory');
      expect(summary).toContain('structural');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  it('corpus queries should be deterministic', () => {
    const attacks1 = getAllAttacks();
    const attacks2 = getAllAttacks();
    
    expect(attacks1.length).toBe(attacks2.length);
    for (let i = 0; i < attacks1.length; i++) {
      expect(attacks1[i].id).toBe(attacks2[i].id);
    }
  });
  
  it('coverage calculation should be deterministic', () => {
    const ids = new Set(['ATK-STR-001', 'ATK-STR-002', 'ATK-SEM-001']);
    
    for (let i = 0; i < 10; i++) {
      const report = generateCoverageReport(ids);
      expect(report.overall.covered).toBe(3);
    }
  });
  
});
