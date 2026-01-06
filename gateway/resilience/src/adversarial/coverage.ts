/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Adversarial Grammar - Coverage Tracker
 * 
 * Phase 23 - Sprint 23.1
 * 
 * Tracks coverage of the adversarial grammar.
 * Ensures 100% attack vector coverage.
 * 
 * INVARIANT: INV-ADV-01 - Grammar covers 100% of known vectors
 */

import {
  AnyAttack,
  AttackCategory,
  Severity,
  ExpectedResponse,
  Exploitability,
  AttackId,
  ALL_CATEGORIES,
  ALL_SEVERITIES,
  SEVERITY_ORDER,
  EXPLOITABILITY_ORDER,
} from './types.js';
import { ADVERSARIAL_GRAMMAR } from './grammar.js';

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of executing a test against an attack
 */
export interface TestExecutionResult {
  readonly attackId: AttackId;
  readonly executed: boolean;
  readonly passed: boolean;
  readonly actualResponse: ExpectedResponse | null;
  readonly errorCode: string | null;
  readonly invariantsVerified: ReadonlyArray<string>;
  readonly invariantsViolated: ReadonlyArray<string>;
  readonly executionTimeMs: number;
  readonly timestamp: number;
}

/**
 * Coverage statistics
 */
export interface CoverageStats {
  readonly totalAttacks: number;
  readonly testedAttacks: number;
  readonly passedAttacks: number;
  readonly failedAttacks: number;
  readonly coveragePercent: number;
  readonly passRate: number;
  readonly byCategory: ReadonlyMap<AttackCategory, CategoryStats>;
  readonly bySeverity: ReadonlyMap<Severity, SeverityStats>;
  readonly uncoveredAttacks: ReadonlyArray<AttackId>;
  readonly failedAttacks_list: ReadonlyArray<AttackId>;
}

export interface CategoryStats {
  readonly category: AttackCategory;
  readonly total: number;
  readonly tested: number;
  readonly passed: number;
  readonly coveragePercent: number;
}

export interface SeverityStats {
  readonly severity: Severity;
  readonly total: number;
  readonly tested: number;
  readonly passed: number;
  readonly coveragePercent: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tracks test coverage of the adversarial grammar
 */
export class CoverageTracker {
  private readonly results = new Map<AttackId, TestExecutionResult>();
  private readonly attacks: ReadonlyArray<AnyAttack>;

  constructor() {
    this.attacks = ADVERSARIAL_GRAMMAR.enumerateAll();
  }

  /**
   * Record a test execution result
   */
  recordResult(result: TestExecutionResult): void {
    this.results.set(result.attackId, result);
  }

  /**
   * Record multiple results
   */
  recordResults(results: TestExecutionResult[]): void {
    for (const result of results) {
      this.recordResult(result);
    }
  }

  /**
   * Check if an attack has been tested
   */
  isTested(attackId: AttackId): boolean {
    return this.results.has(attackId);
  }

  /**
   * Get result for a specific attack
   */
  getResult(attackId: AttackId): TestExecutionResult | undefined {
    return this.results.get(attackId);
  }

  /**
   * Get all results
   */
  getAllResults(): ReadonlyMap<AttackId, TestExecutionResult> {
    return this.results;
  }

  /**
   * Calculate coverage statistics
   */
  getStats(): CoverageStats {
    const totalAttacks = this.attacks.length;
    const testedAttacks = this.results.size;
    let passedAttacks = 0;
    const failedAttackIds: AttackId[] = [];

    for (const result of this.results.values()) {
      if (result.passed) {
        passedAttacks++;
      } else {
        failedAttackIds.push(result.attackId);
      }
    }

    const uncoveredAttacks = this.attacks
      .filter(a => !this.results.has(a.id))
      .map(a => a.id);

    // Category stats
    const byCategory = new Map<AttackCategory, CategoryStats>();
    for (const category of ALL_CATEGORIES) {
      const categoryAttacks = this.attacks.filter(a => a.category === category);
      const tested = categoryAttacks.filter(a => this.results.has(a.id));
      const passed = tested.filter(a => this.results.get(a.id)?.passed);

      byCategory.set(category, {
        category,
        total: categoryAttacks.length,
        tested: tested.length,
        passed: passed.length,
        coveragePercent: categoryAttacks.length > 0 
          ? (tested.length / categoryAttacks.length) * 100 
          : 0,
      });
    }

    // Severity stats
    const bySeverity = new Map<Severity, SeverityStats>();
    for (const severity of ALL_SEVERITIES) {
      const severityAttacks = this.attacks.filter(a => a.severity === severity);
      const tested = severityAttacks.filter(a => this.results.has(a.id));
      const passed = tested.filter(a => this.results.get(a.id)?.passed);

      bySeverity.set(severity, {
        severity,
        total: severityAttacks.length,
        tested: tested.length,
        passed: passed.length,
        coveragePercent: severityAttacks.length > 0 
          ? (tested.length / severityAttacks.length) * 100 
          : 0,
      });
    }

    return {
      totalAttacks,
      testedAttacks,
      passedAttacks,
      failedAttacks: failedAttackIds.length,
      coveragePercent: totalAttacks > 0 ? (testedAttacks / totalAttacks) * 100 : 0,
      passRate: testedAttacks > 0 ? (passedAttacks / testedAttacks) * 100 : 0,
      byCategory,
      bySeverity,
      uncoveredAttacks,
      failedAttacks_list: failedAttackIds,
    };
  }

  /**
   * Check if we have 100% coverage
   */
  hasFullCoverage(): boolean {
    return this.results.size === this.attacks.length;
  }

  /**
   * Check if all tests passed
   */
  allPassed(): boolean {
    for (const result of this.results.values()) {
      if (!result.passed) return false;
    }
    return this.results.size === this.attacks.length;
  }

  /**
   * Get attacks by test status
   */
  getAttacksByStatus(): {
    passed: AnyAttack[];
    failed: AnyAttack[];
    untested: AnyAttack[];
  } {
    const passed: AnyAttack[] = [];
    const failed: AnyAttack[] = [];
    const untested: AnyAttack[] = [];

    for (const attack of this.attacks) {
      const result = this.results.get(attack.id);
      if (!result) {
        untested.push(attack);
      } else if (result.passed) {
        passed.push(attack);
      } else {
        failed.push(attack);
      }
    }

    return { passed, failed, untested };
  }

  /**
   * Get critical gaps - high severity attacks that failed or weren't tested
   */
  getCriticalGaps(): AnyAttack[] {
    return this.attacks.filter(a => {
      if (a.severity !== Severity.CRITICAL && a.severity !== Severity.HIGH) {
        return false;
      }
      const result = this.results.get(a.id);
      return !result || !result.passed;
    });
  }

  /**
   * Generate coverage report
   */
  generateReport(): string {
    const stats = this.getStats();
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════════════════════════════════╗');
    lines.push('║           ADVERSARIAL GRAMMAR COVERAGE REPORT                    ║');
    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push(`║  Total Attacks:     ${stats.totalAttacks.toString().padStart(6)}                                  ║`);
    lines.push(`║  Tested:            ${stats.testedAttacks.toString().padStart(6)} (${stats.coveragePercent.toFixed(1).padStart(5)}%)                         ║`);
    lines.push(`║  Passed:            ${stats.passedAttacks.toString().padStart(6)} (${stats.passRate.toFixed(1).padStart(5)}%)                         ║`);
    lines.push(`║  Failed:            ${stats.failedAttacks.toString().padStart(6)}                                  ║`);
    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push('║  BY CATEGORY                                                     ║');
    lines.push('╠══════════════════════════════════════════════════════════════════╣');

    for (const [category, catStats] of stats.byCategory) {
      lines.push(`║  ${category.padEnd(12)} ${catStats.tested.toString().padStart(3)}/${catStats.total.toString().padStart(3)} (${catStats.coveragePercent.toFixed(0).padStart(3)}%) passed: ${catStats.passed.toString().padStart(3)}            ║`);
    }

    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push('║  BY SEVERITY                                                     ║');
    lines.push('╠══════════════════════════════════════════════════════════════════╣');

    for (const severity of ALL_SEVERITIES) {
      const sevStats = stats.bySeverity.get(severity);
      if (sevStats) {
        lines.push(`║  ${severity.padEnd(12)} ${sevStats.tested.toString().padStart(3)}/${sevStats.total.toString().padStart(3)} (${sevStats.coveragePercent.toFixed(0).padStart(3)}%) passed: ${sevStats.passed.toString().padStart(3)}            ║`);
      }
    }

    if (stats.uncoveredAttacks.length > 0) {
      lines.push('╠══════════════════════════════════════════════════════════════════╣');
      lines.push('║  UNCOVERED ATTACKS                                               ║');
      lines.push('╠══════════════════════════════════════════════════════════════════╣');
      for (const id of stats.uncoveredAttacks.slice(0, 10)) {
        lines.push(`║  - ${id.substring(0, 58).padEnd(58)} ║`);
      }
      if (stats.uncoveredAttacks.length > 10) {
        lines.push(`║  ... and ${(stats.uncoveredAttacks.length - 10).toString()} more                                          ║`);
      }
    }

    if (stats.failedAttacks_list.length > 0) {
      lines.push('╠══════════════════════════════════════════════════════════════════╣');
      lines.push('║  FAILED ATTACKS                                                  ║');
      lines.push('╠══════════════════════════════════════════════════════════════════╣');
      for (const id of stats.failedAttacks_list.slice(0, 10)) {
        lines.push(`║  - ${id.substring(0, 58).padEnd(58)} ║`);
      }
    }

    lines.push('╚══════════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }

  /**
   * Reset all results
   */
  reset(): void {
    this.results.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A matrix showing coverage across dimensions
 */
export interface CoverageMatrix {
  readonly dimensions: {
    readonly categories: ReadonlyArray<AttackCategory>;
    readonly severities: ReadonlyArray<Severity>;
  };
  readonly cells: ReadonlyMap<string, CoverageCell>;
  readonly totalCoverage: number;
}

export interface CoverageCell {
  readonly category: AttackCategory;
  readonly severity: Severity;
  readonly total: number;
  readonly covered: number;
  readonly passed: number;
}

/**
 * Generate a coverage matrix
 */
export function generateCoverageMatrix(tracker: CoverageTracker): CoverageMatrix {
  const cells = new Map<string, CoverageCell>();
  const attacks = ADVERSARIAL_GRAMMAR.enumerateAll();
  
  for (const category of ALL_CATEGORIES) {
    for (const severity of ALL_SEVERITIES) {
      const key = `${category}:${severity}`;
      const matching = attacks.filter(a => a.category === category && a.severity === severity);
      const covered = matching.filter(a => tracker.isTested(a.id));
      const passed = covered.filter(a => tracker.getResult(a.id)?.passed);
      
      cells.set(key, {
        category,
        severity,
        total: matching.length,
        covered: covered.length,
        passed: passed.length,
      });
    }
  }

  const stats = tracker.getStats();

  return {
    dimensions: {
      categories: ALL_CATEGORIES,
      severities: ALL_SEVERITIES,
    },
    cells,
    totalCoverage: stats.coveragePercent,
  };
}

/**
 * Render coverage matrix as ASCII table
 */
export function renderCoverageMatrix(matrix: CoverageMatrix): string {
  const lines: string[] = [];
  
  // Header
  lines.push('         │ CRITICAL │   HIGH   │  MEDIUM  │   LOW    │');
  lines.push('─────────┼──────────┼──────────┼──────────┼──────────┤');

  for (const category of matrix.dimensions.categories) {
    let row = category.substring(0, 8).padEnd(8) + ' │';
    
    for (const severity of matrix.dimensions.severities) {
      const cell = matrix.cells.get(`${category}:${severity}`);
      if (cell && cell.total > 0) {
        const pct = ((cell.covered / cell.total) * 100).toFixed(0);
        row += ` ${cell.covered}/${cell.total} (${pct}%)`.padEnd(9) + '│';
      } else {
        row += '    -    │';
      }
    }
    
    lines.push(row);
  }

  lines.push('─────────┴──────────┴──────────┴──────────┴──────────┘');
  lines.push(`Total Coverage: ${matrix.totalCoverage.toFixed(1)}%`);

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

let globalTracker: CoverageTracker | null = null;

/**
 * Get the global coverage tracker instance
 */
export function getGlobalTracker(): CoverageTracker {
  if (!globalTracker) {
    globalTracker = new CoverageTracker();
  }
  return globalTracker;
}

/**
 * Reset the global tracker
 */
export function resetGlobalTracker(): void {
  globalTracker = null;
}
