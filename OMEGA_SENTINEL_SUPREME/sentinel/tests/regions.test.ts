/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — REGIONS MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/regions.test
 * @version 2.0.0
 * 
 * INVARIANTS TESTED:
 * - INV-REG-01: Regions form a total order
 * - INV-REG-02: Each region has concrete thresholds
 * - INV-REG-03: TRANSCENDENT requires external certifier (R3)
 * - INV-REG-04: Containment is deterministic
 * - INV-CONT-01: Containment is deterministic
 * - INV-CONT-02: Every metric set maps to exactly one region
 * - INV-CONT-03: Region assignment is monotonic
 * - INV-CONT-04: VOID is default for invalid systems
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';

// Definitions imports
import {
  REGION_ORDER,
  REGION_DEFINITIONS,
  ALL_REGIONS,
  getRegion,
  getAllRegions,
  getThresholds,
  getRegionName,
  getRegionColor,
  getRegionOrder,
  compareRegions,
  isAtLeastRegion,
  isHigherThan,
  maxRegion,
  minRegion,
  getNextRegion,
  getPreviousRegion,
  isRegionId,
  requiresExternalCertifier,
  generateRegionHierarchy,
  generateThresholdTable
} from '../regions/definitions.js';

// Containment imports
import {
  testContainment,
  isContainedIn,
  determineRegion,
  computePromotionRequirements,
  createDefaultMetrics,
  createInvalidMetrics,
  canReachTranscendent,
  getCertificationSummary,
  isAtMaxRegion,
  canPromote,
  type CertificationMetrics
} from '../regions/containment.js';

import { CERTIFICATION_LEVELS } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: REGION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Region Definitions', () => {
  
  describe('INV-REG-01: Total Order', () => {
    
    it('should have exactly 7 regions', () => {
      expect(REGION_ORDER).toHaveLength(7);
      expect(ALL_REGIONS).toHaveLength(7);
    });
    
    it('should have correct order', () => {
      expect(REGION_ORDER[0]).toBe('VOID');
      expect(REGION_ORDER[1]).toBe('THEORETICAL');
      expect(REGION_ORDER[2]).toBe('EXPLORATORY');
      expect(REGION_ORDER[3]).toBe('PROVISIONAL');
      expect(REGION_ORDER[4]).toBe('PROVEN');
      expect(REGION_ORDER[5]).toBe('FOUNDATIONAL');
      expect(REGION_ORDER[6]).toBe('TRANSCENDENT');
    });
    
    it('should have unique order values', () => {
      const orders = ALL_REGIONS.map(r => r.order);
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBe(orders.length);
    });
    
    it('should have strictly increasing order values', () => {
      for (let i = 1; i < ALL_REGIONS.length; i++) {
        expect(ALL_REGIONS[i].order).toBeGreaterThan(ALL_REGIONS[i - 1].order);
      }
    });
    
    it('should have same count as CERTIFICATION_LEVELS', () => {
      // Both should have 7 levels (different naming, same concept)
      expect(REGION_ORDER.length).toBe(CERTIFICATION_LEVELS.length);
    });
    
  });
  
  describe('INV-REG-02: Concrete Thresholds', () => {
    
    it('should have thresholds for all regions', () => {
      for (const region of ALL_REGIONS) {
        expect(region.thresholds).toBeDefined();
        expect(region.thresholds.minProofStrength).toBeDefined();
        expect(region.thresholds.minSurvivalRate).toBeDefined();
        expect(region.thresholds.minCoverage).toBeDefined();
        expect(region.thresholds.minProofCount).toBeDefined();
        expect(region.thresholds.minMandatoryCoverage).toBeDefined();
      }
    });
    
    it('should have increasing thresholds for higher regions', () => {
      // Coverage should increase
      expect(getThresholds('EXPLORATORY')!.minCoverage)
        .toBeLessThan(getThresholds('PROVISIONAL')!.minCoverage);
      expect(getThresholds('PROVISIONAL')!.minCoverage)
        .toBeLessThan(getThresholds('PROVEN')!.minCoverage);
    });
    
    it('should have survival rates in [0, 1]', () => {
      for (const region of ALL_REGIONS) {
        expect(region.thresholds.minSurvivalRate).toBeGreaterThanOrEqual(0);
        expect(region.thresholds.minSurvivalRate).toBeLessThanOrEqual(1);
      }
    });
    
    it('should have coverage in [0, 1]', () => {
      for (const region of ALL_REGIONS) {
        expect(region.thresholds.minCoverage).toBeGreaterThanOrEqual(0);
        expect(region.thresholds.minCoverage).toBeLessThanOrEqual(1);
      }
    });
    
    it('should have non-negative proof count', () => {
      for (const region of ALL_REGIONS) {
        expect(region.thresholds.minProofCount).toBeGreaterThanOrEqual(0);
      }
    });
    
  });
  
  describe('INV-REG-03: TRANSCENDENT External Certifier (R3)', () => {
    
    it('should require external certifier only for TRANSCENDENT', () => {
      expect(requiresExternalCertifier('VOID')).toBe(false);
      expect(requiresExternalCertifier('THEORETICAL')).toBe(false);
      expect(requiresExternalCertifier('EXPLORATORY')).toBe(false);
      expect(requiresExternalCertifier('PROVISIONAL')).toBe(false);
      expect(requiresExternalCertifier('PROVEN')).toBe(false);
      expect(requiresExternalCertifier('FOUNDATIONAL')).toBe(false);
      expect(requiresExternalCertifier('TRANSCENDENT')).toBe(true);
    });
    
    it('TRANSCENDENT should have highest thresholds', () => {
      const transcendent = getThresholds('TRANSCENDENT')!;
      
      // 100% survival
      expect(transcendent.minSurvivalRate).toBe(1.0);
      
      // Highest coverage
      expect(transcendent.minCoverage).toBeGreaterThan(
        getThresholds('FOUNDATIONAL')!.minCoverage
      );
      
      // Highest proof count
      expect(transcendent.minProofCount).toBeGreaterThan(
        getThresholds('FOUNDATIONAL')!.minProofCount
      );
    });
    
  });
  
  describe('Region Accessors', () => {
    
    it('getRegion should return definition', () => {
      const proven = getRegion('PROVEN');
      expect(proven).toBeDefined();
      expect(proven!.id).toBe('PROVEN');
    });
    
    it('getRegion should return undefined for unknown', () => {
      expect(getRegion('INVALID' as any)).toBeUndefined();
    });
    
    it('getRegionName should return name', () => {
      expect(getRegionName('PROVEN')).toBe('Proven');
      expect(getRegionName('INVALID' as any)).toBe('Unknown');
    });
    
    it('getRegionColor should return color code', () => {
      expect(getRegionColor('VOID')).toBe('#000000');
      expect(getRegionColor('PROVEN')).toBe('#4CAF50');
    });
    
    it('getRegionOrder should return numeric order', () => {
      expect(getRegionOrder('VOID')).toBe(0);
      expect(getRegionOrder('TRANSCENDENT')).toBe(6);
      expect(getRegionOrder('INVALID' as any)).toBe(-1);
    });
    
  });
  
  describe('Region Comparison', () => {
    
    it('compareRegions should work correctly', () => {
      expect(compareRegions('VOID', 'PROVEN')).toBe(-1);
      expect(compareRegions('PROVEN', 'VOID')).toBe(1);
      expect(compareRegions('PROVEN', 'PROVEN')).toBe(0);
    });
    
    it('isAtLeastRegion should check correctly', () => {
      expect(isAtLeastRegion('PROVEN', 'EXPLORATORY')).toBe(true);
      expect(isAtLeastRegion('EXPLORATORY', 'PROVEN')).toBe(false);
      expect(isAtLeastRegion('PROVEN', 'PROVEN')).toBe(true);
    });
    
    it('isHigherThan should check strictly', () => {
      expect(isHigherThan('PROVEN', 'EXPLORATORY')).toBe(true);
      expect(isHigherThan('PROVEN', 'PROVEN')).toBe(false);
    });
    
    it('maxRegion should return higher', () => {
      expect(maxRegion('VOID', 'TRANSCENDENT')).toBe('TRANSCENDENT');
      expect(maxRegion('PROVEN', 'EXPLORATORY')).toBe('PROVEN');
    });
    
    it('minRegion should return lower', () => {
      expect(minRegion('VOID', 'TRANSCENDENT')).toBe('VOID');
      expect(minRegion('PROVEN', 'EXPLORATORY')).toBe('EXPLORATORY');
    });
    
    it('getNextRegion should return next', () => {
      expect(getNextRegion('VOID')).toBe('THEORETICAL');
      expect(getNextRegion('PROVEN')).toBe('FOUNDATIONAL');
      expect(getNextRegion('TRANSCENDENT')).toBeNull();
    });
    
    it('getPreviousRegion should return previous', () => {
      expect(getPreviousRegion('TRANSCENDENT')).toBe('FOUNDATIONAL');
      expect(getPreviousRegion('PROVEN')).toBe('PROVISIONAL');
      expect(getPreviousRegion('VOID')).toBeNull();
    });
    
  });
  
  describe('Type Guards', () => {
    
    it('isRegionId should validate correctly', () => {
      expect(isRegionId('VOID')).toBe(true);
      expect(isRegionId('PROVEN')).toBe(true);
      expect(isRegionId('INVALID')).toBe(false);
      expect(isRegionId(123)).toBe(false);
    });
    
  });
  
  describe('Documentation', () => {
    
    it('generateRegionHierarchy should produce string', () => {
      const hierarchy = generateRegionHierarchy();
      expect(typeof hierarchy).toBe('string');
      expect(hierarchy).toContain('VOID');
      expect(hierarchy).toContain('TRANSCENDENT');
    });
    
    it('generateThresholdTable should produce markdown', () => {
      const table = generateThresholdTable();
      expect(table).toContain('|');
      expect(table).toContain('PROVEN');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CONTAINMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Region Containment', () => {
  
  describe('INV-CONT-01: Deterministic Containment', () => {
    
    it('should produce same result for same input', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Σ',
        survivalRate: 0.95,
        coverage: 0.7,
        proofCount: 5,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const result1 = testContainment(metrics, 'PROVEN');
      const result2 = testContainment(metrics, 'PROVEN');
      
      expect(result1.isContained).toBe(result2.isContained);
      expect(result1.thresholdsMetCount).toBe(result2.thresholdsMetCount);
    });
    
  });
  
  describe('INV-CONT-02: Unique Region Mapping', () => {
    
    it('should map metrics to exactly one region', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Σ',
        survivalRate: 0.95,
        coverage: 0.7,
        proofCount: 5,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const determination = determineRegion(metrics);
      expect(determination.region).toBeDefined();
      expect(isRegionId(determination.region)).toBe(true);
    });
    
    it('should map default metrics to THEORETICAL', () => {
      const metrics = createDefaultMetrics();
      const determination = determineRegion(metrics);
      expect(determination.region).toBe('THEORETICAL');
    });
    
  });
  
  describe('INV-CONT-03: Monotonic Assignment', () => {
    
    it('better metrics should yield higher or equal region', () => {
      const lowMetrics: CertificationMetrics = {
        proofStrength: 'Ε',
        survivalRate: 0.5,
        coverage: 0.2,
        proofCount: 1,
        mandatoryCoverage: 0.1,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const highMetrics: CertificationMetrics = {
        proofStrength: 'Λ',
        survivalRate: 0.99,
        coverage: 0.9,
        proofCount: 10,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const lowRegion = determineRegion(lowMetrics).region;
      const highRegion = determineRegion(highMetrics).region;
      
      expect(getRegionOrder(highRegion)).toBeGreaterThanOrEqual(getRegionOrder(lowRegion));
    });
    
  });
  
  describe('INV-CONT-04: Invalid System = VOID', () => {
    
    it('should assign VOID to invalid system', () => {
      const metrics = createInvalidMetrics();
      const determination = determineRegion(metrics);
      expect(determination.region).toBe('VOID');
    });
    
    it('should assign VOID even with good metrics if invalid', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ω',
        survivalRate: 1.0,
        coverage: 1.0,
        proofCount: 100,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: true,
        isSystemValid: false  // Invalid!
      };
      
      const determination = determineRegion(metrics);
      expect(determination.region).toBe('VOID');
    });
    
  });
  
  describe('Containment Testing', () => {
    
    it('testContainment should return detailed result', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Σ',
        survivalRate: 0.95,
        coverage: 0.7,
        proofCount: 5,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const result = testContainment(metrics, 'PROVEN');
      
      expect(result.isContained).toBe(true);
      expect(result.thresholdsMet).toBeDefined();
      expect(result.thresholdsMetCount).toBe(6);
      expect(result.completeness).toBe(1);
    });
    
    it('isContainedIn should return boolean', () => {
      const metrics = createDefaultMetrics();
      expect(typeof isContainedIn(metrics, 'VOID')).toBe('boolean');
    });
    
    it('should not be contained if survival rate is too low', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Σ',
        survivalRate: 0.5,  // Too low for PROVEN (needs 0.95)
        coverage: 0.7,
        proofCount: 5,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const result = testContainment(metrics, 'PROVEN');
      expect(result.isContained).toBe(false);
      expect(result.thresholdsMet.survivalRate).toBe(false);
    });
    
  });
  
  describe('Region Determination', () => {
    
    it('should determine EXPLORATORY for basic proofs', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ε',
        survivalRate: 0.6,
        coverage: 0.25,
        proofCount: 2,
        mandatoryCoverage: 0.15,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const determination = determineRegion(metrics);
      expect(determination.region).toBe('EXPLORATORY');
    });
    
    it('should determine PROVEN for sincere falsification', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Σ',
        survivalRate: 0.96,
        coverage: 0.75,
        proofCount: 6,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const determination = determineRegion(metrics);
      expect(determination.region).toBe('PROVEN');
    });
    
    it('should not reach TRANSCENDENT without external certifier', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ω',
        survivalRate: 1.0,
        coverage: 0.99,
        proofCount: 20,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,  // Missing!
        isSystemValid: true
      };
      
      const determination = determineRegion(metrics);
      expect(determination.region).not.toBe('TRANSCENDENT');
    });
    
    it('should reach TRANSCENDENT with all requirements', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ω',
        survivalRate: 1.0,
        coverage: 0.98,
        proofCount: 20,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: true,
        isSystemValid: true
      };
      
      const determination = determineRegion(metrics);
      expect(determination.region).toBe('TRANSCENDENT');
    });
    
  });
  
  describe('Promotion Requirements', () => {
    
    it('should compute requirements to next region', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ε',
        survivalRate: 0.6,
        coverage: 0.25,
        proofCount: 2,
        mandatoryCoverage: 0.15,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const requirements = computePromotionRequirements(metrics, 'PROVISIONAL');
      
      expect(requirements.targetRegion).toBe('PROVISIONAL');
      expect(requirements.requirements.length).toBeGreaterThan(0);
    });
    
    it('should identify blocking for TRANSCENDENT without external certifier', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ω',
        survivalRate: 1.0,
        coverage: 0.99,
        proofCount: 20,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const requirements = computePromotionRequirements(metrics, 'TRANSCENDENT');
      
      expect(requirements.isBlocked).toBe(true);
      expect(requirements.blockingReason).toContain('external certifier');
    });
    
    it('should have no requirements when already meeting thresholds', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ω',
        survivalRate: 1.0,
        coverage: 1.0,
        proofCount: 100,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: true,
        isSystemValid: true
      };
      
      const requirements = computePromotionRequirements(metrics, 'TRANSCENDENT');
      
      expect(requirements.requirements).toHaveLength(0);
      expect(requirements.isBlocked).toBe(false);
    });
    
  });
  
  describe('Utilities', () => {
    
    it('createDefaultMetrics should return valid structure', () => {
      const metrics = createDefaultMetrics();
      
      expect(metrics.proofStrength).toBe('Ε');
      expect(metrics.survivalRate).toBe(0);
      expect(metrics.coverage).toBe(0);
      expect(metrics.proofCount).toBe(0);
      expect(metrics.isSystemValid).toBe(true);
    });
    
    it('createInvalidMetrics should mark system invalid', () => {
      const metrics = createInvalidMetrics();
      expect(metrics.isSystemValid).toBe(false);
    });
    
    it('canReachTranscendent should check external certifier', () => {
      const withCertifier: CertificationMetrics = {
        ...createDefaultMetrics(),
        hasExternalCertifier: true
      };
      const withoutCertifier = createDefaultMetrics();
      
      expect(canReachTranscendent(withCertifier)).toBe(true);
      expect(canReachTranscendent(withoutCertifier)).toBe(false);
    });
    
    it('getCertificationSummary should produce readable string', () => {
      const metrics = createDefaultMetrics();
      const determination = determineRegion(metrics);
      const summary = getCertificationSummary(determination);
      
      expect(typeof summary).toBe('string');
      expect(summary).toContain('THEORETICAL');
    });
    
    it('isAtMaxRegion should check for TRANSCENDENT', () => {
      const maxMetrics: CertificationMetrics = {
        proofStrength: 'Ω',
        survivalRate: 1.0,
        coverage: 0.98,
        proofCount: 20,
        mandatoryCoverage: 1.0,
        hasExternalCertifier: true,
        isSystemValid: true
      };
      
      const maxDetermination = determineRegion(maxMetrics);
      const defaultDetermination = determineRegion(createDefaultMetrics());
      
      expect(isAtMaxRegion(maxDetermination)).toBe(true);
      expect(isAtMaxRegion(defaultDetermination)).toBe(false);
    });
    
    it('canPromote should check if promotion is possible', () => {
      const metrics: CertificationMetrics = {
        proofStrength: 'Ε',
        survivalRate: 0.6,
        coverage: 0.25,
        proofCount: 2,
        mandatoryCoverage: 0.15,
        hasExternalCertifier: false,
        isSystemValid: true
      };
      
      const determination = determineRegion(metrics);
      
      // Should be able to promote (not blocked)
      expect(canPromote(determination)).toBe(true);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  it('region order should be deterministic', () => {
    for (let i = 0; i < 10; i++) {
      expect(REGION_ORDER[0]).toBe('VOID');
      expect(REGION_ORDER[6]).toBe('TRANSCENDENT');
    }
  });
  
  it('containment should be deterministic', () => {
    const metrics: CertificationMetrics = {
      proofStrength: 'Σ',
      survivalRate: 0.95,
      coverage: 0.7,
      proofCount: 5,
      mandatoryCoverage: 1.0,
      hasExternalCertifier: false,
      isSystemValid: true
    };
    
    for (let i = 0; i < 10; i++) {
      const determination = determineRegion(metrics);
      expect(determination.region).toBe('PROVEN');
    }
  });
  
});
