/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FALSIFICATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module falsification/engine
 * @version 2.0.0
 * @license MIT
 * 
 * ENGINE — FALSIFICATION ATTEMPT TRACKING
 * ========================================
 * 
 * Tracks falsification attempts against invariants:
 * - Records attack attempts and outcomes
 * - Calculates survival rates per invariant
 * - Computes coverage by category
 * - Determines if falsification was "sincere" (genuine effort)
 * 
 * INVARIANTS:
 * - INV-ENG-01: Survival rate = survived / total attempts
 * - INV-ENG-02: Coverage = unique attacks / total attacks in corpus
 * - INV-ENG-03: Falsification is deterministic
 * - INV-ENG-04: Failed falsification increases confidence
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type AttackDefinition,
  type AttackCategory,
  type AttackSeverity,
  ATTACK_CATEGORIES,
  DEFAULT_CORPUS,
  getAttack,
  getAttacksByCategory,
  getMandatoryAttacks
} from './corpus.js';

import { FALSIFICATION_WEIGHTS } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Outcome of a falsification attempt
 */
export type FalsificationOutcome = 
  | 'SURVIVED'    // Attack failed to falsify (good)
  | 'BREACHED'    // Attack succeeded in falsifying (bad)
  | 'SKIPPED'     // Attack was skipped (not counted)
  | 'ERROR';      // Execution error (investigate)

/**
 * A single falsification attempt record
 */
export interface FalsificationAttempt {
  /** Attack ID from corpus */
  readonly attackId: string;
  
  /** Target invariant ID */
  readonly invariantId: string;
  
  /** Outcome of the attempt */
  readonly outcome: FalsificationOutcome;
  
  /** When the attempt was made */
  readonly timestamp: string;
  
  /** Duration in milliseconds */
  readonly durationMs: number;
  
  /** Optional notes */
  readonly notes?: string;
  
  /** Evidence hash (if applicable) */
  readonly evidenceHash?: string;
}

/**
 * Summary of falsification attempts for a single invariant
 */
export interface FalsificationSummary {
  /** Invariant ID */
  readonly invariantId: string;
  
  /** Total attempts made */
  readonly totalAttempts: number;
  
  /** Number survived */
  readonly survived: number;
  
  /** Number breached */
  readonly breached: number;
  
  /** Number skipped */
  readonly skipped: number;
  
  /** Number of errors */
  readonly errors: number;
  
  /** Survival rate [0, 1] */
  readonly survivalRate: number;
  
  /** Unique attacks attempted */
  readonly uniqueAttacks: ReadonlySet<string>;
  
  /** Coverage by category */
  readonly coverageByCategory: Record<AttackCategory, number>;
  
  /** Overall coverage */
  readonly overallCoverage: number;
  
  /** Is falsification considered sincere? */
  readonly isSincere: boolean;
  
  /** Most recent attempt */
  readonly lastAttempt: string | null;
}

/**
 * Coverage threshold configuration
 */
export interface CoverageThresholds {
  /** Minimum coverage per category for sincere effort */
  readonly perCategory: number;
  
  /** Minimum mandatory attack coverage */
  readonly mandatory: number;
  
  /** Minimum total coverage */
  readonly total: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default thresholds for "sincere" falsification effort
 */
export const DEFAULT_THRESHOLDS: CoverageThresholds = Object.freeze({
  perCategory: 0.5,    // 50% of each category
  mandatory: 1.0,      // 100% of mandatory attacks
  total: 0.7           // 70% of total corpus
});

// ═══════════════════════════════════════════════════════════════════════════════
// FALSIFICATION TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tracks falsification attempts for multiple invariants
 */
export class FalsificationTracker {
  /** All attempts by invariant ID */
  private readonly attemptsByInvariant: Map<string, FalsificationAttempt[]>;
  
  /** Thresholds for sincere effort */
  private readonly thresholds: CoverageThresholds;
  
  constructor(thresholds: CoverageThresholds = DEFAULT_THRESHOLDS) {
    this.attemptsByInvariant = new Map();
    this.thresholds = thresholds;
  }
  
  /**
   * Record a falsification attempt
   */
  recordAttempt(attempt: FalsificationAttempt): void {
    const invariantId = attempt.invariantId;
    
    if (!this.attemptsByInvariant.has(invariantId)) {
      this.attemptsByInvariant.set(invariantId, []);
    }
    
    this.attemptsByInvariant.get(invariantId)!.push(attempt);
  }
  
  /**
   * Get all attempts for an invariant
   */
  getAttempts(invariantId: string): readonly FalsificationAttempt[] {
    return this.attemptsByInvariant.get(invariantId) ?? [];
  }
  
  /**
   * Get summary for a single invariant
   */
  getSummary(invariantId: string): FalsificationSummary {
    const attempts = this.attemptsByInvariant.get(invariantId) ?? [];
    
    // Count outcomes
    let survived = 0;
    let breached = 0;
    let skipped = 0;
    let errors = 0;
    const uniqueAttacks = new Set<string>();
    let lastAttempt: string | null = null;
    
    for (const attempt of attempts) {
      switch (attempt.outcome) {
        case 'SURVIVED': survived++; break;
        case 'BREACHED': breached++; break;
        case 'SKIPPED': skipped++; break;
        case 'ERROR': errors++; break;
      }
      
      if (attempt.outcome !== 'SKIPPED') {
        uniqueAttacks.add(attempt.attackId);
      }
      
      if (!lastAttempt || attempt.timestamp > lastAttempt) {
        lastAttempt = attempt.timestamp;
      }
    }
    
    // Calculate metrics
    const countedAttempts = survived + breached;
    const survivalRate = countedAttempts > 0 ? survived / countedAttempts : 0;
    
    // Coverage by category
    const coverageByCategory = this.computeCoverageByCategory(uniqueAttacks);
    
    // Overall coverage
    const overallCoverage = uniqueAttacks.size / DEFAULT_CORPUS.totalCount;
    
    // Is sincere?
    const isSincere = this.checkSincerity(uniqueAttacks, coverageByCategory);
    
    return Object.freeze({
      invariantId,
      totalAttempts: attempts.length,
      survived,
      breached,
      skipped,
      errors,
      survivalRate,
      uniqueAttacks,
      coverageByCategory: Object.freeze(coverageByCategory),
      overallCoverage,
      isSincere,
      lastAttempt
    });
  }
  
  /**
   * Compute coverage by category
   */
  private computeCoverageByCategory(
    uniqueAttacks: Set<string>
  ): Record<AttackCategory, number> {
    const coverage: Record<AttackCategory, number> = {
      structural: 0,
      semantic: 0,
      temporal: 0,
      existential: 0
    };
    
    for (const category of ATTACK_CATEGORIES) {
      const categoryAttacks = getAttacksByCategory(category);
      const categoryIds = new Set(categoryAttacks.map(a => a.id));
      
      let covered = 0;
      for (const id of uniqueAttacks) {
        if (categoryIds.has(id)) {
          covered++;
        }
      }
      
      coverage[category] = categoryAttacks.length > 0 
        ? covered / categoryAttacks.length 
        : 0;
    }
    
    return coverage;
  }
  
  /**
   * Check if falsification effort is sincere
   */
  private checkSincerity(
    uniqueAttacks: Set<string>,
    coverageByCategory: Record<AttackCategory, number>
  ): boolean {
    // Check category coverage
    for (const category of ATTACK_CATEGORIES) {
      if (coverageByCategory[category] < this.thresholds.perCategory) {
        return false;
      }
    }
    
    // Check mandatory attacks
    const mandatoryAttacks = getMandatoryAttacks();
    const mandatoryIds = new Set(mandatoryAttacks.map(a => a.id));
    let mandatoryCovered = 0;
    
    for (const id of uniqueAttacks) {
      if (mandatoryIds.has(id)) {
        mandatoryCovered++;
      }
    }
    
    const mandatoryCoverage = mandatoryAttacks.length > 0
      ? mandatoryCovered / mandatoryAttacks.length
      : 0;
    
    if (mandatoryCoverage < this.thresholds.mandatory) {
      return false;
    }
    
    // Check total coverage
    const totalCoverage = uniqueAttacks.size / DEFAULT_CORPUS.totalCount;
    if (totalCoverage < this.thresholds.total) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all tracked invariant IDs
   */
  getTrackedInvariants(): readonly string[] {
    return [...this.attemptsByInvariant.keys()];
  }
  
  /**
   * Clear all tracking data
   */
  clear(): void {
    this.attemptsByInvariant.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALSIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a successful falsification attempt (survived)
 */
export function createSurvivedAttempt(
  attackId: string,
  invariantId: string,
  durationMs: number = 0,
  notes?: string
): FalsificationAttempt {
  return Object.freeze({
    attackId,
    invariantId,
    outcome: 'SURVIVED',
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    durationMs,
    notes
  });
}

/**
 * Create a failed falsification attempt (breached)
 */
export function createBreachedAttempt(
  attackId: string,
  invariantId: string,
  durationMs: number = 0,
  notes?: string,
  evidenceHash?: string
): FalsificationAttempt {
  return Object.freeze({
    attackId,
    invariantId,
    outcome: 'BREACHED',
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    durationMs,
    notes,
    evidenceHash
  });
}

/**
 * Create a skipped attempt
 */
export function createSkippedAttempt(
  attackId: string,
  invariantId: string,
  notes?: string
): FalsificationAttempt {
  return Object.freeze({
    attackId,
    invariantId,
    outcome: 'SKIPPED',
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    durationMs: 0,
    notes
  });
}

/**
 * Create an error attempt
 */
export function createErrorAttempt(
  attackId: string,
  invariantId: string,
  notes: string
): FalsificationAttempt {
  return Object.freeze({
    attackId,
    invariantId,
    outcome: 'ERROR',
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    durationMs: 0,
    notes
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTED SURVIVAL RATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute weighted survival rate based on category importance
 */
export function computeWeightedSurvivalRate(
  summary: FalsificationSummary
): number {
  const attempts = summary.totalAttempts - summary.skipped;
  if (attempts === 0) return 0;
  
  // For now, just return the raw survival rate
  // In a more complex implementation, we'd weight by category
  return summary.survivalRate;
}

/**
 * Compute falsification score (for internal comparison only)
 * NOTE: This score is NON-DECISIONAL per R2 correction
 */
export function computeFalsificationScore(
  summary: FalsificationSummary
): number {
  // Weighted by category importance
  let weightedScore = 0;
  let totalWeight = 0;
  
  for (const category of ATTACK_CATEGORIES) {
    const weight = FALSIFICATION_WEIGHTS[category.toUpperCase() as keyof typeof FALSIFICATION_WEIGHTS];
    const coverage = summary.coverageByCategory[category];
    weightedScore += weight * coverage * summary.survivalRate;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that an attack ID exists in the corpus
 */
export function validateAttackId(attackId: string): boolean {
  return DEFAULT_CORPUS.attacks.has(attackId);
}

/**
 * Check if a falsification outcome is valid
 */
export function isValidOutcome(value: unknown): value is FalsificationOutcome {
  return typeof value === 'string' && 
    ['SURVIVED', 'BREACHED', 'SKIPPED', 'ERROR'].includes(value);
}
