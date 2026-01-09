/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — SURVIVAL PROOF
 * Sprint 27.2 — Self-Certification Infrastructure
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Defines the structure for survival proofs after falsification attempts.
 * 
 * INV-FALS-SELF-02: Toute survie est prouvée
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export type AttackOutcome = 'SURVIVED' | 'BREACHED' | 'SKIPPED' | 'ERROR';

export interface AttackVector {
  readonly attackId: string;
  readonly category: string;
  readonly input: string;
  readonly seed: number;
  readonly expectedFailure: string;
  readonly timestamp: string;
}

export interface AttackAttempt {
  readonly vector: AttackVector;
  readonly outcome: AttackOutcome;
  readonly durationMs: number;
  readonly error?: string;
  readonly evidence?: string;
}

export interface SurvivalProof {
  readonly invariantId: string;
  readonly module: string;
  readonly category: 'PURE' | 'SYSTEM' | 'CONTEXTUAL';
  readonly attempts: number;
  readonly survivedCount: number;
  readonly breachedCount: number;
  readonly skippedCount: number;
  readonly errorCount: number;
  readonly survived: boolean;
  readonly survivalRate: number;
  readonly weakestAttack: AttackVector | null;
  readonly attacks: readonly AttackAttempt[];
  readonly proofHash: string;
  readonly timestamp: string;
}

export interface FalsificationReport {
  readonly version: string;
  readonly runId: string;
  readonly seed: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMs: number;
  readonly totalInvariants: number;
  readonly totalAttacks: number;
  readonly proofs: readonly SurvivalProof[];
  readonly summary: FalsificationSummary;
  readonly reportHash: string;
}

export interface FalsificationSummary {
  readonly invariantsTested: number;
  readonly invariantsSurvived: number;
  readonly invariantsBreached: number;
  readonly invariantsSkipped: number;
  readonly totalAttempts: number;
  readonly overallSurvivalRate: number;
  readonly breachedIds: readonly string[];
  readonly verdict: 'PASS' | 'FAIL';
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SURVIVAL_PROOF_VERSION = '1.0.0' as const;

export const MIN_ATTACKS_PER_INVARIANT = 5;
export const DEFAULT_SEED = 42;

// ============================================================================
// HASH COMPUTATION
// ============================================================================

/**
 * Compute deterministic hash for a survival proof.
 * Excludes timestamp to ensure reproducibility with same inputs.
 */
export function computeProofHash(proof: Omit<SurvivalProof, 'proofHash'>): string {
  const canonical = {
    invariantId: proof.invariantId,
    module: proof.module,
    category: proof.category,
    attempts: proof.attempts,
    survivedCount: proof.survivedCount,
    breachedCount: proof.breachedCount,
    survived: proof.survived,
    survivalRate: proof.survivalRate,
    attacks: proof.attacks.map(a => ({
      attackId: a.vector.attackId,
      seed: a.vector.seed,
      outcome: a.outcome,
    })),
  };
  
  const json = JSON.stringify(canonical, Object.keys(canonical).sort());
  return createHash('sha256').update(json).digest('hex');
}

/**
 * Compute deterministic hash for a falsification report.
 */
export function computeReportHash(report: Omit<FalsificationReport, 'reportHash'>): string {
  const canonical = {
    version: report.version,
    seed: report.seed,
    totalInvariants: report.totalInvariants,
    totalAttacks: report.totalAttacks,
    proofHashes: report.proofs.map(p => p.proofHash).sort(),
    summary: report.summary,
  };
  
  const json = JSON.stringify(canonical, Object.keys(canonical).sort());
  return createHash('sha256').update(json).digest('hex');
}

// ============================================================================
// FACTORIES
// ============================================================================

/**
 * Create an attack vector.
 */
export function createAttackVector(
  attackId: string,
  category: string,
  input: string,
  seed: number,
  expectedFailure: string
): AttackVector {
  const vector: AttackVector = {
    attackId,
    category,
    input,
    seed,
    expectedFailure,
    timestamp: new Date().toISOString(),
  };
  return Object.freeze(vector);
}

/**
 * Create an attack attempt result.
 */
export function createAttackAttempt(
  vector: AttackVector,
  outcome: AttackOutcome,
  durationMs: number,
  error?: string,
  evidence?: string
): AttackAttempt {
  const attempt: AttackAttempt = {
    vector,
    outcome,
    durationMs,
    ...(error && { error }),
    ...(evidence && { evidence }),
  };
  return Object.freeze(attempt);
}

/**
 * Create a survival proof from attack attempts.
 */
export function createSurvivalProof(
  invariantId: string,
  module: string,
  category: 'PURE' | 'SYSTEM' | 'CONTEXTUAL',
  attacks: readonly AttackAttempt[]
): SurvivalProof {
  const survivedCount = attacks.filter(a => a.outcome === 'SURVIVED').length;
  const breachedCount = attacks.filter(a => a.outcome === 'BREACHED').length;
  const skippedCount = attacks.filter(a => a.outcome === 'SKIPPED').length;
  const errorCount = attacks.filter(a => a.outcome === 'ERROR').length;
  
  const effectiveAttempts = survivedCount + breachedCount;
  const survivalRate = effectiveAttempts > 0 ? survivedCount / effectiveAttempts : 0;
  const survived = breachedCount === 0 && survivedCount > 0;
  
  // Find weakest attack (one that came closest to breaching)
  const weakestAttack = attacks.find(a => a.outcome === 'BREACHED')?.vector || null;
  
  const proofWithoutHash = {
    invariantId,
    module,
    category,
    attempts: attacks.length,
    survivedCount,
    breachedCount,
    skippedCount,
    errorCount,
    survived,
    survivalRate,
    weakestAttack,
    attacks,
    timestamp: new Date().toISOString(),
  };
  
  const proof: SurvivalProof = {
    ...proofWithoutHash,
    proofHash: computeProofHash(proofWithoutHash as Omit<SurvivalProof, 'proofHash'>),
  };
  
  return Object.freeze(proof);
}

/**
 * Create a falsification report from proofs.
 */
export function createFalsificationReport(
  seed: number,
  proofs: readonly SurvivalProof[],
  startTime: string,
  endTime: string
): FalsificationReport {
  const totalAttempts = proofs.reduce((sum, p) => sum + p.attempts, 0);
  const survivedInvariants = proofs.filter(p => p.survived).length;
  const breachedInvariants = proofs.filter(p => p.breachedCount > 0).length;
  const skippedInvariants = proofs.filter(p => p.attempts === p.skippedCount).length;
  const breachedIds = proofs.filter(p => p.breachedCount > 0).map(p => p.invariantId);
  
  const overallSurvivalRate = proofs.length > 0
    ? survivedInvariants / proofs.length
    : 0;
  
  const summary: FalsificationSummary = {
    invariantsTested: proofs.length,
    invariantsSurvived: survivedInvariants,
    invariantsBreached: breachedInvariants,
    invariantsSkipped: skippedInvariants,
    totalAttempts,
    overallSurvivalRate,
    breachedIds,
    verdict: breachedInvariants === 0 ? 'PASS' : 'FAIL',
  };
  
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  
  const reportWithoutHash = {
    version: SURVIVAL_PROOF_VERSION,
    runId: `FALS-${seed}-${Date.now()}`,
    seed,
    startTime,
    endTime,
    durationMs: end - start,
    totalInvariants: proofs.length,
    totalAttacks: totalAttempts,
    proofs,
    summary,
  };
  
  const report: FalsificationReport = {
    ...reportWithoutHash,
    reportHash: computeReportHash(reportWithoutHash as Omit<FalsificationReport, 'reportHash'>),
  };
  
  return Object.freeze(report);
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ProofValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a survival proof.
 */
export function validateSurvivalProof(proof: SurvivalProof): ProofValidationResult {
  const errors: string[] = [];
  
  if (!proof.invariantId || proof.invariantId.trim() === '') {
    errors.push('Missing invariantId');
  }
  
  if (!proof.module || proof.module.trim() === '') {
    errors.push('Missing module');
  }
  
  if (!['PURE', 'SYSTEM', 'CONTEXTUAL'].includes(proof.category)) {
    errors.push(`Invalid category: ${proof.category}`);
  }
  
  if (proof.attempts < 0) {
    errors.push('Negative attempts count');
  }
  
  const computedCount = proof.survivedCount + proof.breachedCount + 
                        proof.skippedCount + proof.errorCount;
  if (computedCount !== proof.attempts) {
    errors.push(`Count mismatch: ${computedCount} !== ${proof.attempts}`);
  }
  
  if (proof.survivalRate < 0 || proof.survivalRate > 1) {
    errors.push(`Invalid survival rate: ${proof.survivalRate}`);
  }
  
  // Verify hash
  const expectedHash = computeProofHash({
    ...proof,
    proofHash: undefined as unknown as string,
  } as Omit<SurvivalProof, 'proofHash'>);
  
  if (proof.proofHash !== expectedHash) {
    errors.push('Hash mismatch - proof may have been tampered');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a falsification report.
 */
export function validateFalsificationReport(report: FalsificationReport): ProofValidationResult {
  const errors: string[] = [];
  
  if (report.version !== SURVIVAL_PROOF_VERSION) {
    errors.push(`Version mismatch: ${report.version} !== ${SURVIVAL_PROOF_VERSION}`);
  }
  
  if (report.totalInvariants !== report.proofs.length) {
    errors.push('Invariant count mismatch');
  }
  
  const computedTotalAttacks = report.proofs.reduce((sum, p) => sum + p.attempts, 0);
  if (report.totalAttacks !== computedTotalAttacks) {
    errors.push('Total attacks mismatch');
  }
  
  // Validate each proof
  for (const proof of report.proofs) {
    const proofResult = validateSurvivalProof(proof);
    if (!proofResult.valid) {
      errors.push(`Proof ${proof.invariantId}: ${proofResult.errors.join(', ')}`);
    }
  }
  
  // Verify report hash
  const expectedHash = computeReportHash({
    ...report,
    reportHash: undefined as unknown as string,
  } as Omit<FalsificationReport, 'reportHash'>);
  
  if (report.reportHash !== expectedHash) {
    errors.push('Report hash mismatch');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get proofs that survived all attacks.
 */
export function getSurvivedProofs(report: FalsificationReport): readonly SurvivalProof[] {
  return report.proofs.filter(p => p.survived);
}

/**
 * Get proofs that were breached.
 */
export function getBreachedProofs(report: FalsificationReport): readonly SurvivalProof[] {
  return report.proofs.filter(p => p.breachedCount > 0);
}

/**
 * Get proof by invariant ID.
 */
export function getProofByInvariantId(
  report: FalsificationReport,
  invariantId: string
): SurvivalProof | undefined {
  return report.proofs.find(p => p.invariantId === invariantId);
}

/**
 * Check if all invariants survived.
 */
export function allInvariantsSurvived(report: FalsificationReport): boolean {
  return report.summary.verdict === 'PASS';
}

/**
 * Get invariants with insufficient attack coverage.
 */
export function getInsufficientCoverage(
  report: FalsificationReport,
  minAttacks: number = MIN_ATTACKS_PER_INVARIANT
): readonly SurvivalProof[] {
  return report.proofs.filter(p => p.attempts < minAttacks);
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format a survival proof as a summary string.
 */
export function formatProofSummary(proof: SurvivalProof): string {
  const status = proof.survived ? '✅ SURVIVED' : '❌ BREACHED';
  return `${proof.invariantId} [${proof.module}]: ${status} (${proof.survivedCount}/${proof.attempts} attacks)`;
}

/**
 * Format a falsification report as a summary string.
 */
export function formatReportSummary(report: FalsificationReport): string {
  const lines = [
    '═══════════════════════════════════════════════════════════════════',
    `FALSIFICATION REPORT — ${report.summary.verdict}`,
    '═══════════════════════════════════════════════════════════════════',
    `Seed: ${report.seed}`,
    `Duration: ${report.durationMs}ms`,
    `Invariants: ${report.totalInvariants}`,
    `Total Attacks: ${report.totalAttacks}`,
    ``,
    `Survived: ${report.summary.invariantsSurvived}`,
    `Breached: ${report.summary.invariantsBreached}`,
    `Skipped: ${report.summary.invariantsSkipped}`,
    `Overall Survival Rate: ${(report.summary.overallSurvivalRate * 100).toFixed(1)}%`,
  ];
  
  if (report.summary.breachedIds.length > 0) {
    lines.push('', 'BREACHED INVARIANTS:');
    for (const id of report.summary.breachedIds) {
      lines.push(`  - ${id}`);
    }
  }
  
  lines.push('', `Report Hash: ${report.reportHash}`);
  lines.push('═══════════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAttackOutcome(value: unknown): value is AttackOutcome {
  return typeof value === 'string' && 
    ['SURVIVED', 'BREACHED', 'SKIPPED', 'ERROR'].includes(value);
}

export function isValidProofHash(hash: string): boolean {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
}
