/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FALSIFICATION MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module falsification
 * @version 2.0.0
 * 
 * FALSIFICATION — The Heart of SENTINEL
 * 
 * The falsification module provides:
 * - Corpus: Versioned attack definitions
 * - Engine: Attempt tracking and survival calculation
 * - Coverage: Metrics and gap analysis
 * 
 * Core Principle: "A system is certified not because we proved it works,
 * but because we FAILED to prove it doesn't work despite sincere effort."
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORPUS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type AttackCategory,
  type AttackSeverity,
  type AttackDefinition,
  type AttackCorpus,
  
  // Constants
  ATTACK_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_WEIGHTS,
  DEFAULT_CORPUS,
  
  // Queries
  getAttack,
  getAllAttacks,
  getAttacksByCategory,
  getMandatoryAttacks,
  getAttacksBySeverity,
  getAttacksByTag,
  getAttackCountByCategory,
  hasAttack,
  getCorpusStats,
  
  // Type guards
  isAttackCategory,
  isAttackSeverity,
  isValidAttackId
} from './corpus.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type FalsificationOutcome,
  type FalsificationAttempt,
  type FalsificationSummary,
  type CoverageThresholds,
  
  // Constants
  DEFAULT_THRESHOLDS,
  
  // Tracker class
  FalsificationTracker,
  
  // Factory helpers
  createSurvivedAttempt,
  createBreachedAttempt,
  createSkippedAttempt,
  createErrorAttempt,
  
  // Calculations
  computeWeightedSurvivalRate,
  computeFalsificationScore,
  
  // Validation
  validateAttackId,
  isValidOutcome
} from './engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type DimensionCoverage,
  type CoverageReport,
  type CoverageGap,
  
  // Report generation
  generateCoverageReport,
  
  // Gap analysis
  analyzeCoverageGaps,
  
  // Thresholds
  COVERAGE_THRESHOLDS,
  meetsCoverageLevel,
  getMaxCoverageLevel,
  
  // Utilities
  calculateCoverageRatio,
  formatCoverage,
  isCompleteCoverage,
  isMandatoryCoverageComplete,
  getCoverageSummary
} from './coverage.js';
