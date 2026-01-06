/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Resilience Crystal - Types
 * 
 * Phase 23 - Sprint 23.4
 * 
 * Crystallizes all proofs into a unified, immutable structure.
 * The Crystal is the final artifact proving system resilience.
 * 
 * INVARIANTS:
 * - INV-CRYSTAL-01: Completeness - Crystal covers 100% of attack surface
 * - INV-CRYSTAL-02: Soundness - All proofs are mathematically valid
 * - INV-CRYSTAL-03: Immutability - Crystal hash never changes after seal
 * - INV-CRYSTAL-04: Coverage - chaos × adversarial × temporal = complete
 * - INV-CRYSTAL-05: Reproducibility - Same inputs produce same Crystal
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Crystal identifier */
export type CrystalId = Brand<string, 'CrystalId'>;

/** Proof identifier */
export type ProofId = Brand<string, 'ProofId'>;

/** Cryptographic seal */
export type CrystalSeal = Brand<string, 'CrystalSeal'>;

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Proof status
 */
export const ProofStatus = {
  /** Proof is valid and verified */
  PROVEN: 'PROVEN',
  /** Proof failed verification */
  FAILED: 'FAILED',
  /** Proof is pending verification */
  PENDING: 'PENDING',
  /** Proof was skipped */
  SKIPPED: 'SKIPPED',
} as const;

export type ProofStatus = typeof ProofStatus[keyof typeof ProofStatus];

/**
 * Proof category
 */
export const ProofCategory = {
  /** Chaos algebra proofs */
  CHAOS: 'CHAOS',
  /** Adversarial grammar proofs */
  ADVERSARIAL: 'ADVERSARIAL',
  /** Temporal logic proofs */
  TEMPORAL: 'TEMPORAL',
  /** Stress testing proofs */
  STRESS: 'STRESS',
  /** Integration proofs */
  INTEGRATION: 'INTEGRATION',
} as const;

export type ProofCategory = typeof ProofCategory[keyof typeof ProofCategory];

/**
 * Individual proof record
 */
export interface Proof {
  /** Unique proof identifier */
  readonly id: ProofId;
  /** Human-readable name */
  readonly name: string;
  /** Proof category */
  readonly category: ProofCategory;
  /** Related invariant ID */
  readonly invariantId: string;
  /** Proof status */
  readonly status: ProofStatus;
  /** Evidence supporting the proof */
  readonly evidence: ProofEvidence;
  /** When the proof was generated */
  readonly timestamp: Date;
  /** Verification details */
  readonly details: string;
}

/**
 * Evidence supporting a proof
 */
export interface ProofEvidence {
  /** Test results */
  readonly testResults?: TestResults;
  /** Formal verification results */
  readonly formalVerification?: FormalVerificationResult;
  /** Stress test results */
  readonly stressResults?: StressTestSummary;
  /** Raw evidence hash */
  readonly evidenceHash: string;
}

/**
 * Test results summary
 */
export interface TestResults {
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly duration: number;
  readonly coverage: number;
}

/**
 * Formal verification result
 */
export interface FormalVerificationResult {
  readonly formulaCount: number;
  readonly provenCount: number;
  readonly counterexamples: number;
  readonly traceCount: number;
}

/**
 * Stress test summary
 */
export interface StressTestSummary {
  readonly runsCompleted: number;
  readonly deterministicHashMatches: boolean;
  readonly thresholdViolations: number;
  readonly p99Latency: number;
  readonly successRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE MATRIX TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Coverage cell in the matrix
 */
export interface CoverageCell {
  /** Row identifier (e.g., attack type) */
  readonly row: string;
  /** Column identifier (e.g., invariant) */
  readonly column: string;
  /** Is this combination covered? */
  readonly covered: boolean;
  /** Proofs covering this cell */
  readonly proofIds: ReadonlyArray<ProofId>;
}

/**
 * Coverage matrix for cross-referencing proofs
 */
export interface CoverageMatrix {
  /** Matrix name */
  readonly name: string;
  /** Row labels (e.g., attack types) */
  readonly rows: ReadonlyArray<string>;
  /** Column labels (e.g., invariants) */
  readonly columns: ReadonlyArray<string>;
  /** Coverage cells */
  readonly cells: ReadonlyArray<CoverageCell>;
  /** Overall coverage percentage */
  readonly coverage: number;
  /** Uncovered combinations */
  readonly gaps: ReadonlyArray<{ row: string; column: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crystal status
 */
export const CrystalStatus = {
  /** Crystal is being constructed */
  BUILDING: 'BUILDING',
  /** Crystal is complete and sealed */
  SEALED: 'SEALED',
  /** Crystal verification failed */
  INVALID: 'INVALID',
} as const;

export type CrystalStatus = typeof CrystalStatus[keyof typeof CrystalStatus];

/**
 * Resilience Crystal - the complete proof artifact
 */
export interface ResilienceCrystal {
  /** Unique crystal identifier */
  readonly id: CrystalId;
  /** Crystal version */
  readonly version: string;
  /** Creation timestamp */
  readonly createdAt: Date;
  /** Crystal status */
  readonly status: CrystalStatus;
  
  /** All proofs in the crystal */
  readonly proofs: ReadonlyArray<Proof>;
  
  /** Coverage matrices */
  readonly coverageMatrices: {
    /** Chaos × Invariants */
    readonly chaosInvariants: CoverageMatrix;
    /** Adversarial × Invariants */
    readonly adversarialInvariants: CoverageMatrix;
    /** Temporal × Invariants */
    readonly temporalInvariants: CoverageMatrix;
    /** Full cross-product */
    readonly fullCoverage: CoverageMatrix;
  };
  
  /** Summary statistics */
  readonly summary: CrystalSummary;
  
  /** Cryptographic seal (only present when SEALED) */
  readonly seal?: CrystalSeal;
  
  /** Metadata */
  readonly metadata: CrystalMetadata;
}

/**
 * Crystal summary statistics
 */
export interface CrystalSummary {
  /** Total number of proofs */
  readonly totalProofs: number;
  /** Number of proven proofs */
  readonly provenCount: number;
  /** Number of failed proofs */
  readonly failedCount: number;
  /** Number of pending proofs */
  readonly pendingCount: number;
  
  /** By category */
  readonly byCategory: {
    readonly [K in ProofCategory]: {
      readonly total: number;
      readonly proven: number;
      readonly failed: number;
    };
  };
  
  /** Overall coverage percentage */
  readonly overallCoverage: number;
  
  /** All critical invariants proven? */
  readonly criticalInvariantsProven: boolean;
  
  /** Crystal is complete and valid? */
  readonly isComplete: boolean;
}

/**
 * Crystal metadata
 */
export interface CrystalMetadata {
  /** OMEGA version */
  readonly omegaVersion: string;
  /** Build identifier */
  readonly buildId: string;
  /** Git commit hash */
  readonly commitHash: string;
  /** Environment */
  readonly environment: string;
  /** Builder identity */
  readonly builder: string;
  /** Additional tags */
  readonly tags: ReadonlyArray<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

let crystalCounter = 0;
let proofCounter = 0;

export function crystalId(value?: string): CrystalId {
  return (value ?? `CRYSTAL_${++crystalCounter}_${Date.now()}`) as CrystalId;
}

export function proofId(value?: string): ProofId {
  return (value ?? `PROOF_${++proofCounter}`) as ProofId;
}

export function crystalSeal(hash: string): CrystalSeal {
  if (!hash || hash.length < 8) {
    throw new Error('CrystalSeal must be a valid hash');
  }
  return hash as CrystalSeal;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isProven(proof: Proof): boolean {
  return proof.status === ProofStatus.PROVEN;
}

export function isFailed(proof: Proof): boolean {
  return proof.status === ProofStatus.FAILED;
}

export function isSealed(crystal: ResilienceCrystal): boolean {
  return crystal.status === CrystalStatus.SEALED && crystal.seal !== undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_PROOF_STATUSES = Object.values(ProofStatus);
export const ALL_PROOF_CATEGORIES = Object.values(ProofCategory);
export const ALL_CRYSTAL_STATUSES = Object.values(CrystalStatus);

/**
 * Critical invariants that must be proven for a valid crystal
 */
export const CRITICAL_INVARIANTS = [
  'INV-CHAOS-01', // Closure
  'INV-CHAOS-02', // Boundedness
  'INV-CHAOS-03', // Determinism
  'INV-ADV-01',   // Coverage
  'INV-ADV-03',   // Expected response
  'INV-TEMP-01',  // Safety
  'INV-TEMP-04',  // Causality
  'INV-STRESS-01', // Hash stability
  'INV-STRESS-05', // Zero drift
] as const;
