/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — COVERAGE CALCULATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module falsification/coverage
 * @version 2.0.0
 * @license MIT
 * 
 * COVERAGE — METRICS CALCULATION
 * ===============================
 * 
 * Computes coverage metrics across multiple dimensions:
 * - Per-category coverage
 * - Per-severity coverage
 * - Mandatory attack coverage
 * - Overall corpus coverage
 * 
 * INVARIANTS:
 * - INV-COV-01: Coverage is always [0, 1]
 * - INV-COV-02: Coverage calculation is deterministic
 * - INV-COV-03: Empty set yields 0 coverage
 * - INV-COV-04: Full corpus yields 1.0 coverage
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type AttackCategory,
  type AttackSeverity,
  ATTACK_CATEGORIES,
  DEFAULT_CORPUS,
  getAttacksByCategory,
  getAttacksBySeverity,
  getMandatoryAttacks,
  getAllAttacks
} from './corpus.js';

import { FALSIFICATION_WEIGHTS } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Coverage metrics for a single dimension
 */
export interface DimensionCoverage {
  /** Dimension name */
  readonly dimension: string;
  
  /** Total items in dimension */
  readonly total: number;
  
  /** Items covered */
  readonly covered: number;
  
  /** Coverage ratio [0, 1] */
  readonly ratio: number;
  
  /** Coverage percentage [0, 100] */
  readonly percentage: number;
  
  /** Is fully covered? */
  readonly isComplete: boolean;
}

/**
 * Complete coverage report
 */
export interface CoverageReport {
  /** Coverage by category */
  readonly byCategory: Record<AttackCategory, DimensionCoverage>;
  
  /** Coverage by severity */
  readonly bySeverity: Record<AttackSeverity, DimensionCoverage>;
  
  /** Mandatory attack coverage */
  readonly mandatory: DimensionCoverage;
  
  /** Overall coverage */
  readonly overall: DimensionCoverage;
  
  /** Weighted coverage (by category importance) */
  readonly weighted: number;
  
  /** Missing attack IDs */
  readonly missing: readonly string[];
  
  /** Missing mandatory attack IDs */
  readonly missingMandatory: readonly string[];
}

/**
 * Coverage gap analysis
 */
export interface CoverageGap {
  /** Gap category */
  readonly category: AttackCategory;
  
  /** Gap severity */
  readonly gapSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  /** Number of missing attacks */
  readonly missingCount: number;
  
  /** Missing attack IDs */
  readonly missingIds: readonly string[];
  
  /** Recommendation */
  readonly recommendation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION COVERAGE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate coverage for a dimension
 */
function calculateDimensionCoverage(
  dimension: string,
  totalIds: readonly string[],
  coveredIds: ReadonlySet<string>
): DimensionCoverage {
  const total = totalIds.length;
  let covered = 0;
  
  for (const id of totalIds) {
    if (coveredIds.has(id)) {
      covered++;
    }
  }
  
  const ratio = total > 0 ? covered / total : 0;
  
  return Object.freeze({
    dimension,
    total,
    covered,
    ratio,
    percentage: ratio * 100,
    isComplete: covered === total && total > 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE REPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a complete coverage report
 */
export function generateCoverageReport(
  coveredAttackIds: ReadonlySet<string> | readonly string[]
): CoverageReport {
  // Convert array to Set if needed
  const coveredSet = coveredAttackIds instanceof Set
    ? coveredAttackIds
    : new Set(coveredAttackIds);
  
  // Coverage by category
  const byCategory: Record<AttackCategory, DimensionCoverage> = {} as any;
  for (const category of ATTACK_CATEGORIES) {
    const categoryAttacks = getAttacksByCategory(category);
    byCategory[category] = calculateDimensionCoverage(
      category,
      categoryAttacks.map(a => a.id),
      coveredSet
    );
  }
  
  // Coverage by severity
  const severities: AttackSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const bySeverity: Record<AttackSeverity, DimensionCoverage> = {} as any;
  for (const severity of severities) {
    const severityAttacks = getAttacksBySeverity(severity);
    bySeverity[severity] = calculateDimensionCoverage(
      severity,
      severityAttacks.map(a => a.id),
      coveredSet
    );
  }
  
  // Mandatory coverage
  const mandatoryAttacks = getMandatoryAttacks();
  const mandatory = calculateDimensionCoverage(
    'mandatory',
    mandatoryAttacks.map(a => a.id),
    coveredSet
  );
  
  // Overall coverage
  const allAttacks = getAllAttacks();
  const overall = calculateDimensionCoverage(
    'overall',
    allAttacks.map(a => a.id),
    coveredSet
  );
  
  // Weighted coverage
  let weightedSum = 0;
  let weightSum = 0;
  for (const category of ATTACK_CATEGORIES) {
    const weight = FALSIFICATION_WEIGHTS[category.toUpperCase() as keyof typeof FALSIFICATION_WEIGHTS];
    weightedSum += weight * byCategory[category].ratio;
    weightSum += weight;
  }
  const weighted = weightSum > 0 ? weightedSum / weightSum : 0;
  
  // Missing attacks
  const missing: string[] = [];
  const missingMandatory: string[] = [];
  
  for (const attack of allAttacks) {
    if (!coveredSet.has(attack.id)) {
      missing.push(attack.id);
      if (attack.mandatory) {
        missingMandatory.push(attack.id);
      }
    }
  }
  
  return Object.freeze({
    byCategory: Object.freeze(byCategory),
    bySeverity: Object.freeze(bySeverity),
    mandatory,
    overall,
    weighted,
    missing: Object.freeze(missing),
    missingMandatory: Object.freeze(missingMandatory)
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze coverage gaps
 */
export function analyzeCoverageGaps(
  report: CoverageReport
): readonly CoverageGap[] {
  const gaps: CoverageGap[] = [];
  
  for (const category of ATTACK_CATEGORIES) {
    const catCoverage = report.byCategory[category];
    
    if (!catCoverage.isComplete) {
      const missingIds = report.missing.filter(id => {
        const attack = DEFAULT_CORPUS.attacks.get(id);
        return attack?.category === category;
      });
      
      // Determine gap severity based on coverage
      let gapSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (catCoverage.ratio < 0.25) {
        gapSeverity = 'CRITICAL';
      } else if (catCoverage.ratio < 0.5) {
        gapSeverity = 'HIGH';
      } else if (catCoverage.ratio < 0.75) {
        gapSeverity = 'MEDIUM';
      } else {
        gapSeverity = 'LOW';
      }
      
      gaps.push({
        category,
        gapSeverity,
        missingCount: missingIds.length,
        missingIds: Object.freeze(missingIds),
        recommendation: generateRecommendation(category, catCoverage.ratio)
      });
    }
  }
  
  return Object.freeze(gaps);
}

/**
 * Generate recommendation for a gap
 */
function generateRecommendation(
  category: AttackCategory,
  currentRatio: number
): string {
  if (currentRatio === 0) {
    return `No ${category} attacks tested. Add comprehensive ${category} test coverage.`;
  } else if (currentRatio < 0.5) {
    return `Low ${category} coverage (${(currentRatio * 100).toFixed(0)}%). Prioritize missing ${category} attacks.`;
  } else if (currentRatio < 1.0) {
    return `Partial ${category} coverage (${(currentRatio * 100).toFixed(0)}%). Complete remaining attacks.`;
  }
  return `${category} coverage is complete.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thresholds for different certification levels
 */
export const COVERAGE_THRESHOLDS = Object.freeze({
  BRONZE: {
    overall: 0.5,
    perCategory: 0.3,
    mandatory: 0.5
  },
  SILVER: {
    overall: 0.7,
    perCategory: 0.5,
    mandatory: 0.8
  },
  GOLD: {
    overall: 0.85,
    perCategory: 0.7,
    mandatory: 1.0
  },
  PLATINUM: {
    overall: 0.95,
    perCategory: 0.85,
    mandatory: 1.0
  },
  OMEGA: {
    overall: 1.0,
    perCategory: 0.95,
    mandatory: 1.0
  }
});

/**
 * Check if coverage meets a certification level
 */
export function meetsCoverageLevel(
  report: CoverageReport,
  level: keyof typeof COVERAGE_THRESHOLDS
): boolean {
  const thresholds = COVERAGE_THRESHOLDS[level];
  
  // Check overall
  if (report.overall.ratio < thresholds.overall) {
    return false;
  }
  
  // Check mandatory
  if (report.mandatory.ratio < thresholds.mandatory) {
    return false;
  }
  
  // Check per-category
  for (const category of ATTACK_CATEGORIES) {
    if (report.byCategory[category].ratio < thresholds.perCategory) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get the highest certification level that coverage meets
 */
export function getMaxCoverageLevel(
  report: CoverageReport
): keyof typeof COVERAGE_THRESHOLDS | null {
  const levels: (keyof typeof COVERAGE_THRESHOLDS)[] = [
    'OMEGA', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'
  ];
  
  for (const level of levels) {
    if (meetsCoverageLevel(report, level)) {
      return level;
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate simple coverage ratio
 */
export function calculateCoverageRatio(
  covered: number,
  total: number
): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, covered / total));
}

/**
 * Format coverage as percentage string
 */
export function formatCoverage(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * Check if coverage is complete
 */
export function isCompleteCoverage(report: CoverageReport): boolean {
  return report.overall.isComplete;
}

/**
 * Check if mandatory coverage is complete
 */
export function isMandatoryCoverageComplete(report: CoverageReport): boolean {
  return report.mandatory.isComplete;
}

/**
 * Get coverage summary string
 */
export function getCoverageSummary(report: CoverageReport): string {
  const lines: string[] = [
    `Overall: ${formatCoverage(report.overall.ratio)} (${report.overall.covered}/${report.overall.total})`,
    `Mandatory: ${formatCoverage(report.mandatory.ratio)} (${report.mandatory.covered}/${report.mandatory.total})`,
    '',
    'By Category:'
  ];
  
  for (const category of ATTACK_CATEGORIES) {
    const cov = report.byCategory[category];
    lines.push(`  ${category}: ${formatCoverage(cov.ratio)} (${cov.covered}/${cov.total})`);
  }
  
  return lines.join('\n');
}
