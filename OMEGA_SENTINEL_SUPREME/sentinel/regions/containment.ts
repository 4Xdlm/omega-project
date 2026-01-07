/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — REGION CONTAINMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module regions/containment
 * @version 2.0.0
 * @license MIT
 * 
 * CONTAINMENT — REGION MEMBERSHIP TESTING
 * ========================================
 * 
 * Determines which region a set of metrics belongs to:
 * - Binary containment test (IN/OUT)
 * - Highest achievable region calculation
 * - Promotion requirements
 * - Gap analysis to next region
 * 
 * INVARIANTS:
 * - INV-CONT-01: Containment is deterministic
 * - INV-CONT-02: Every metric set maps to exactly one region
 * - INV-CONT-03: Region assignment is monotonic (better metrics = higher region)
 * - INV-CONT-04: VOID is the default for invalid/breached systems
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type RegionId,
  type RegionDefinition,
  type RegionThresholds,
  REGION_ORDER,
  ALL_REGIONS,
  getRegion,
  getRegionOrder,
  getNextRegion,
  getThresholds,
  requiresExternalCertifier
} from './definitions.js';

import { 
  type ProofStrength, 
  getStrengthWeight 
} from '../foundation/proof_strength.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metrics used to determine region containment
 */
export interface CertificationMetrics {
  /** Dominant proof strength */
  readonly proofStrength: ProofStrength;
  
  /** Survival rate [0, 1] */
  readonly survivalRate: number;
  
  /** Corpus coverage [0, 1] */
  readonly coverage: number;
  
  /** Number of proofs */
  readonly proofCount: number;
  
  /** Mandatory attack coverage [0, 1] */
  readonly mandatoryCoverage: number;
  
  /** Has external certifier attestation? */
  readonly hasExternalCertifier: boolean;
  
  /** Is system valid (no breaches)? */
  readonly isSystemValid: boolean;
}

/**
 * Result of containment test
 */
export interface ContainmentResult {
  /** Is the metric set contained in the region? */
  readonly isContained: boolean;
  
  /** Which thresholds are met */
  readonly thresholdsMet: {
    readonly proofStrength: boolean;
    readonly survivalRate: boolean;
    readonly coverage: boolean;
    readonly proofCount: boolean;
    readonly mandatoryCoverage: boolean;
    readonly externalCertifier: boolean;
  };
  
  /** How many thresholds are met (0-6) */
  readonly thresholdsMetCount: number;
  
  /** Percentage of thresholds met [0, 1] */
  readonly completeness: number;
}

/**
 * Result of region determination
 */
export interface RegionDetermination {
  /** The determined region */
  readonly region: RegionId;
  
  /** Containment result for the determined region */
  readonly containment: ContainmentResult;
  
  /** Next region (if not at TRANSCENDENT) */
  readonly nextRegion: RegionId | null;
  
  /** Requirements to reach next region */
  readonly promotionRequirements: PromotionRequirements | null;
}

/**
 * Requirements to promote to a higher region
 */
export interface PromotionRequirements {
  /** Target region */
  readonly targetRegion: RegionId;
  
  /** Required improvements */
  readonly requirements: readonly PromotionGap[];
  
  /** Is promotion blocked (e.g., needs external certifier)? */
  readonly isBlocked: boolean;
  
  /** Blocking reason (if blocked) */
  readonly blockingReason: string | null;
}

/**
 * A single gap that needs to be filled for promotion
 */
export interface PromotionGap {
  /** Which metric */
  readonly metric: 'proofStrength' | 'survivalRate' | 'coverage' | 'proofCount' | 'mandatoryCoverage' | 'externalCertifier';
  
  /** Current value */
  readonly current: number | string | boolean;
  
  /** Required value */
  readonly required: number | string | boolean;
  
  /** Human-readable description */
  readonly description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTAINMENT TESTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test if metrics are contained in a specific region
 */
export function testContainment(
  metrics: CertificationMetrics,
  regionId: RegionId
): ContainmentResult {
  const thresholds = getThresholds(regionId);
  
  if (!thresholds) {
    return {
      isContained: false,
      thresholdsMet: {
        proofStrength: false,
        survivalRate: false,
        coverage: false,
        proofCount: false,
        mandatoryCoverage: false,
        externalCertifier: false
      },
      thresholdsMetCount: 0,
      completeness: 0
    };
  }
  
  // Test each threshold
  const proofStrengthMet = getStrengthWeight(metrics.proofStrength) >= 
                           getStrengthWeight(thresholds.minProofStrength);
  const survivalRateMet = metrics.survivalRate >= thresholds.minSurvivalRate;
  const coverageMet = metrics.coverage >= thresholds.minCoverage;
  const proofCountMet = metrics.proofCount >= thresholds.minProofCount;
  const mandatoryCoverageMet = metrics.mandatoryCoverage >= thresholds.minMandatoryCoverage;
  const externalCertifierMet = !thresholds.requiresExternalCertifier || 
                               metrics.hasExternalCertifier;
  
  const thresholdsMet = {
    proofStrength: proofStrengthMet,
    survivalRate: survivalRateMet,
    coverage: coverageMet,
    proofCount: proofCountMet,
    mandatoryCoverage: mandatoryCoverageMet,
    externalCertifier: externalCertifierMet
  };
  
  const metCount = Object.values(thresholdsMet).filter(v => v).length;
  const isContained = metCount === 6;
  
  return {
    isContained,
    thresholdsMet,
    thresholdsMetCount: metCount,
    completeness: metCount / 6
  };
}

/**
 * Quick containment check (boolean only)
 */
export function isContainedIn(
  metrics: CertificationMetrics,
  regionId: RegionId
): boolean {
  return testContainment(metrics, regionId).isContained;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGION DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine the highest region a metric set achieves
 */
export function determineRegion(metrics: CertificationMetrics): RegionDetermination {
  // Special case: invalid system goes to VOID
  if (!metrics.isSystemValid) {
    return createDetermination(metrics, 'VOID');
  }
  
  // Special case: no proofs goes to THEORETICAL
  if (metrics.proofCount === 0) {
    return createDetermination(metrics, 'THEORETICAL');
  }
  
  // Find highest region that contains the metrics
  // Start from highest and work down
  for (let i = REGION_ORDER.length - 1; i >= 0; i--) {
    const regionId = REGION_ORDER[i];
    if (isContainedIn(metrics, regionId)) {
      return createDetermination(metrics, regionId);
    }
  }
  
  // Default to THEORETICAL if no region matches
  return createDetermination(metrics, 'THEORETICAL');
}

/**
 * Create a region determination result
 */
function createDetermination(
  metrics: CertificationMetrics,
  regionId: RegionId
): RegionDetermination {
  const containment = testContainment(metrics, regionId);
  const nextRegion = getNextRegion(regionId);
  const promotionRequirements = nextRegion 
    ? computePromotionRequirements(metrics, nextRegion)
    : null;
  
  return {
    region: regionId,
    containment,
    nextRegion,
    promotionRequirements
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTION REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute what's needed to promote to a target region
 */
export function computePromotionRequirements(
  metrics: CertificationMetrics,
  targetRegionId: RegionId
): PromotionRequirements {
  const thresholds = getThresholds(targetRegionId);
  
  if (!thresholds) {
    return {
      targetRegion: targetRegionId,
      requirements: [],
      isBlocked: true,
      blockingReason: 'Unknown target region'
    };
  }
  
  const gaps: PromotionGap[] = [];
  
  // Check proof strength
  const currentStrengthWeight = getStrengthWeight(metrics.proofStrength);
  const requiredStrengthWeight = getStrengthWeight(thresholds.minProofStrength);
  if (currentStrengthWeight < requiredStrengthWeight) {
    gaps.push({
      metric: 'proofStrength',
      current: metrics.proofStrength,
      required: thresholds.minProofStrength,
      description: `Upgrade proof strength from ${metrics.proofStrength} to ${thresholds.minProofStrength}`
    });
  }
  
  // Check survival rate
  if (metrics.survivalRate < thresholds.minSurvivalRate) {
    gaps.push({
      metric: 'survivalRate',
      current: metrics.survivalRate,
      required: thresholds.minSurvivalRate,
      description: `Increase survival rate from ${(metrics.survivalRate * 100).toFixed(1)}% to ${(thresholds.minSurvivalRate * 100).toFixed(1)}%`
    });
  }
  
  // Check coverage
  if (metrics.coverage < thresholds.minCoverage) {
    gaps.push({
      metric: 'coverage',
      current: metrics.coverage,
      required: thresholds.minCoverage,
      description: `Increase corpus coverage from ${(metrics.coverage * 100).toFixed(1)}% to ${(thresholds.minCoverage * 100).toFixed(1)}%`
    });
  }
  
  // Check proof count
  if (metrics.proofCount < thresholds.minProofCount) {
    gaps.push({
      metric: 'proofCount',
      current: metrics.proofCount,
      required: thresholds.minProofCount,
      description: `Add ${thresholds.minProofCount - metrics.proofCount} more proofs (${metrics.proofCount} → ${thresholds.minProofCount})`
    });
  }
  
  // Check mandatory coverage
  if (metrics.mandatoryCoverage < thresholds.minMandatoryCoverage) {
    gaps.push({
      metric: 'mandatoryCoverage',
      current: metrics.mandatoryCoverage,
      required: thresholds.minMandatoryCoverage,
      description: `Increase mandatory coverage from ${(metrics.mandatoryCoverage * 100).toFixed(1)}% to ${(thresholds.minMandatoryCoverage * 100).toFixed(1)}%`
    });
  }
  
  // Check external certifier (R3)
  const isBlockedByExternal = thresholds.requiresExternalCertifier && 
                              !metrics.hasExternalCertifier;
  if (isBlockedByExternal) {
    gaps.push({
      metric: 'externalCertifier',
      current: false,
      required: true,
      description: 'Obtain external certifier attestation'
    });
  }
  
  return {
    targetRegion: targetRegionId,
    requirements: Object.freeze(gaps),
    isBlocked: isBlockedByExternal,
    blockingReason: isBlockedByExternal 
      ? 'TRANSCENDENT requires external certifier attestation (R3 procedure)'
      : null
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create default metrics (all zeros)
 */
export function createDefaultMetrics(): CertificationMetrics {
  return Object.freeze({
    proofStrength: 'Ε',
    survivalRate: 0,
    coverage: 0,
    proofCount: 0,
    mandatoryCoverage: 0,
    hasExternalCertifier: false,
    isSystemValid: true
  });
}

/**
 * Create metrics for an invalid system
 */
export function createInvalidMetrics(): CertificationMetrics {
  return Object.freeze({
    ...createDefaultMetrics(),
    isSystemValid: false
  });
}

/**
 * Check if metrics can ever reach TRANSCENDENT
 */
export function canReachTranscendent(metrics: CertificationMetrics): boolean {
  // Must have external certifier
  if (!metrics.hasExternalCertifier) {
    return false;
  }
  
  // Must be valid system
  if (!metrics.isSystemValid) {
    return false;
  }
  
  // Other thresholds can be met with effort
  return true;
}

/**
 * Get a summary of the current certification status
 */
export function getCertificationSummary(
  determination: RegionDetermination
): string {
  const lines: string[] = [
    `Current Region: ${determination.region}`,
    `Completeness: ${(determination.containment.completeness * 100).toFixed(0)}%`,
  ];
  
  if (determination.nextRegion) {
    lines.push(`Next Region: ${determination.nextRegion}`);
    
    if (determination.promotionRequirements) {
      const reqs = determination.promotionRequirements;
      
      if (reqs.isBlocked) {
        lines.push(`Status: BLOCKED - ${reqs.blockingReason}`);
      } else if (reqs.requirements.length === 0) {
        lines.push('Status: Ready for promotion!');
      } else {
        lines.push(`Requirements (${reqs.requirements.length}):`);
        for (const gap of reqs.requirements) {
          lines.push(`  - ${gap.description}`);
        }
      }
    }
  } else {
    lines.push('Status: Maximum certification achieved');
  }
  
  return lines.join('\n');
}

/**
 * Check if metrics are at the maximum region
 */
export function isAtMaxRegion(determination: RegionDetermination): boolean {
  return determination.nextRegion === null;
}

/**
 * Check if promotion to next region is possible (not blocked)
 */
export function canPromote(determination: RegionDetermination): boolean {
  if (!determination.nextRegion) return false;
  if (!determination.promotionRequirements) return false;
  return !determination.promotionRequirements.isBlocked;
}
