/**
 * OMEGA NEXUS - Core Types
 * 
 * Phase 24 - Unified Integration & Certification Engine
 * 
 * This module defines the foundational type system for OMEGA NEXUS,
 * providing branded types, module definitions, and certification structures.
 * 
 * ARCHITECTURE:
 * 
 *                    ┌─────────────────────────────────────┐
 *                    │          OMEGA NEXUS                │
 *                    │    Integration & Certification      │
 *                    └─────────────────────────────────────┘
 *                                    │
 *          ┌───────────┬─────────────┼─────────────┬───────────┐
 *          │           │             │             │           │
 *          ▼           ▼             ▼             ▼           ▼
 *     ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌─────────┐ ┌─────────┐
 *     │Chronicle│ │Envelope │ │   Policy    │ │ Memory  │ │Resilience│
 *     │  Layer  │ │  Layer  │ │   Layer     │ │  Layer  │ │  Layer  │
 *     └─────────┘ └─────────┘ └─────────────┘ └─────────┘ └─────────┘
 *          │           │             │             │           │
 *          └───────────┴─────────────┴─────────────┴───────────┘
 *                                    │
 *                    ┌───────────────┴───────────────┐
 *                    │      CERTIFICATION ENGINE     │
 *                    │   NASA-Grade L4 Compliance    │
 *                    └───────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique module identifier */
export type ModuleId = Brand<string, 'ModuleId'>;

/** Unique invariant identifier */
export type InvariantId = Brand<string, 'InvariantId'>;

/** Unique test identifier */
export type TestId = Brand<string, 'TestId'>;

/** Certification hash (SHA-256) */
export type CertificationHash = Brand<string, 'CertificationHash'>;

/** Timestamp in milliseconds */
export type TimestampMs = Brand<number, 'TimestampMs'>;

/** Semantic version string */
export type SemanticVersion = Brand<string, 'SemanticVersion'>;

/** Git commit hash */
export type CommitHash = Brand<string, 'CommitHash'>;

/** Coverage percentage (0-100) */
export type CoveragePercent = Brand<number, 'CoveragePercent'>;

/** Confidence level (0-1) */
export type ConfidenceLevel = Brand<number, 'ConfidenceLevel'>;

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OMEGA Module enumeration
 */
export const OmegaModule = {
  // Core Layers
  CHRONICLE: 'CHRONICLE',
  ENVELOPE: 'ENVELOPE',
  POLICY: 'POLICY',
  MEMORY: 'MEMORY',
  REPLAY_GUARD: 'REPLAY_GUARD',
  
  // Integration Layer
  WIRING: 'WIRING',
  
  // Resilience Layer
  CHAOS: 'CHAOS',
  ADVERSARIAL: 'ADVERSARIAL',
  TEMPORAL: 'TEMPORAL',
  STRESS: 'STRESS',
  CRYSTAL: 'CRYSTAL',
  
  // Nexus Layer
  NEXUS: 'NEXUS',
  OBSERVATORY: 'OBSERVATORY',
  CERTIFICATION: 'CERTIFICATION',
} as const;

export type OmegaModule = typeof OmegaModule[keyof typeof OmegaModule];

/**
 * Module metadata
 */
export interface ModuleMetadata {
  readonly id: ModuleId;
  readonly name: string;
  readonly module: OmegaModule;
  readonly version: SemanticVersion;
  readonly phase: number;
  readonly dependencies: ReadonlyArray<OmegaModule>;
  readonly invariantCount: number;
  readonly testCount: number;
  readonly coverage: CoveragePercent;
}

/**
 * Module registry - all OMEGA modules
 */
export interface ModuleRegistry {
  readonly modules: ReadonlyMap<OmegaModule, ModuleMetadata>;
  readonly totalInvariants: number;
  readonly totalTests: number;
  readonly overallCoverage: CoveragePercent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Invariant category
 */
export const InvariantCategory = {
  // Algebraic
  CLOSURE: 'CLOSURE',
  BOUNDEDNESS: 'BOUNDEDNESS',
  DETERMINISM: 'DETERMINISM',
  ISOLATION: 'ISOLATION',
  RECOVERY: 'RECOVERY',
  
  // Security
  INTEGRITY: 'INTEGRITY',
  AUTHENTICITY: 'AUTHENTICITY',
  REPLAY_PROTECTION: 'REPLAY_PROTECTION',
  ACCESS_CONTROL: 'ACCESS_CONTROL',
  
  // Temporal
  SAFETY: 'SAFETY',
  LIVENESS: 'LIVENESS',
  FAIRNESS: 'FAIRNESS',
  CAUSALITY: 'CAUSALITY',
  
  // Performance
  LATENCY: 'LATENCY',
  THROUGHPUT: 'THROUGHPUT',
  MEMORY: 'MEMORY',
  
  // Structural
  COMPLETENESS: 'COMPLETENESS',
  SOUNDNESS: 'SOUNDNESS',
  IMMUTABILITY: 'IMMUTABILITY',
  REPRODUCIBILITY: 'REPRODUCIBILITY',
} as const;

export type InvariantCategory = typeof InvariantCategory[keyof typeof InvariantCategory];

/**
 * Invariant severity level
 */
export const InvariantSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type InvariantSeverity = typeof InvariantSeverity[keyof typeof InvariantSeverity];

/**
 * Proof status
 */
export const ProofStatus = {
  /** Formally proven with mathematical certainty */
  PROVEN: 'PROVEN',
  /** Empirically verified through exhaustive testing */
  VERIFIED: 'VERIFIED',
  /** Partially verified, some edge cases remain */
  PARTIAL: 'PARTIAL',
  /** Pending verification */
  PENDING: 'PENDING',
  /** Verification failed */
  FAILED: 'FAILED',
} as const;

export type ProofStatus = typeof ProofStatus[keyof typeof ProofStatus];

/**
 * Invariant definition
 */
export interface Invariant {
  readonly id: InvariantId;
  readonly name: string;
  readonly description: string;
  readonly module: OmegaModule;
  readonly category: InvariantCategory;
  readonly severity: InvariantSeverity;
  readonly formula?: string; // LTL/formal notation
  readonly status: ProofStatus;
  readonly testIds: ReadonlyArray<TestId>;
  readonly confidence: ConfidenceLevel;
  readonly hash: CertificationHash;
}

/**
 * Invariant registry
 */
export interface InvariantRegistry {
  readonly invariants: ReadonlyMap<InvariantId, Invariant>;
  readonly byModule: ReadonlyMap<OmegaModule, ReadonlyArray<InvariantId>>;
  readonly byCategory: ReadonlyMap<InvariantCategory, ReadonlyArray<InvariantId>>;
  readonly bySeverity: ReadonlyMap<InvariantSeverity, ReadonlyArray<InvariantId>>;
  readonly critical: ReadonlyArray<InvariantId>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test result status
 */
export const TestStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
  ERROR: 'ERROR',
} as const;

export type TestStatus = typeof TestStatus[keyof typeof TestStatus];

/**
 * Test result
 */
export interface TestResult {
  readonly id: TestId;
  readonly name: string;
  readonly module: OmegaModule;
  readonly invariantId?: InvariantId;
  readonly status: TestStatus;
  readonly duration: number;
  readonly error?: string;
  readonly hash: CertificationHash;
  readonly timestamp: TimestampMs;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  readonly module: OmegaModule;
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly duration: number;
  readonly results: ReadonlyArray<TestResult>;
  readonly hash: CertificationHash;
}

/**
 * Full test report
 */
export interface TestReport {
  readonly suites: ReadonlyArray<TestSuiteResult>;
  readonly totalTests: number;
  readonly totalPassed: number;
  readonly totalFailed: number;
  readonly totalSkipped: number;
  readonly totalDuration: number;
  readonly allPassed: boolean;
  readonly hash: CertificationHash;
  readonly timestamp: TimestampMs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Certification level
 */
export const CertificationLevel = {
  /** Basic testing passed */
  BRONZE: 'BRONZE',
  /** Full test coverage */
  SILVER: 'SILVER',
  /** All invariants verified */
  GOLD: 'GOLD',
  /** NASA-Grade L4 compliance */
  PLATINUM: 'PLATINUM',
  /** Formal proof + audit trail */
  DIAMOND: 'DIAMOND',
} as const;

export type CertificationLevel = typeof CertificationLevel[keyof typeof CertificationLevel];

/**
 * Certification status
 */
export const CertificationStatus = {
  /** Certification in progress */
  IN_PROGRESS: 'IN_PROGRESS',
  /** Certification complete */
  CERTIFIED: 'CERTIFIED',
  /** Certification failed */
  FAILED: 'FAILED',
  /** Certification revoked */
  REVOKED: 'REVOKED',
  /** Certification expired */
  EXPIRED: 'EXPIRED',
} as const;

export type CertificationStatus = typeof CertificationStatus[keyof typeof CertificationStatus];

/**
 * Module certification
 */
export interface ModuleCertification {
  readonly module: OmegaModule;
  readonly version: SemanticVersion;
  readonly level: CertificationLevel;
  readonly status: CertificationStatus;
  readonly invariantsCovered: number;
  readonly invariantsTotal: number;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly coverage: CoveragePercent;
  readonly hash: CertificationHash;
  readonly certifiedAt: TimestampMs;
  readonly expiresAt?: TimestampMs;
}

/**
 * Full certification report
 */
export interface CertificationReport {
  readonly id: CertificationHash;
  readonly version: SemanticVersion;
  readonly level: CertificationLevel;
  readonly status: CertificationStatus;
  readonly modules: ReadonlyArray<ModuleCertification>;
  readonly invariants: InvariantRegistry;
  readonly testReport: TestReport;
  readonly merkleRoot: CertificationHash;
  readonly createdAt: TimestampMs;
  readonly createdBy: string;
  readonly gitCommit: CommitHash;
  readonly gitTag: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATORY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Health status
 */
export const HealthStatus = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  CRITICAL: 'CRITICAL',
  UNKNOWN: 'UNKNOWN',
} as const;

export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus];

/**
 * Alert severity
 */
export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
} as const;

export type AlertSeverity = typeof AlertSeverity[keyof typeof AlertSeverity];

/**
 * Observatory metric
 */
export interface ObservatoryMetric {
  readonly name: string;
  readonly module: OmegaModule;
  readonly value: number;
  readonly unit: string;
  readonly threshold?: number;
  readonly status: HealthStatus;
  readonly timestamp: TimestampMs;
}

/**
 * Observatory alert
 */
export interface ObservatoryAlert {
  readonly id: string;
  readonly module: OmegaModule;
  readonly invariantId?: InvariantId;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly timestamp: TimestampMs;
  readonly acknowledged: boolean;
}

/**
 * Observatory snapshot
 */
export interface ObservatorySnapshot {
  readonly modules: ReadonlyMap<OmegaModule, HealthStatus>;
  readonly metrics: ReadonlyArray<ObservatoryMetric>;
  readonly alerts: ReadonlyArray<ObservatoryAlert>;
  readonly overallHealth: HealthStatus;
  readonly timestamp: TimestampMs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

let moduleCounter = 0;
let invariantCounter = 0;
let testCounter = 0;

export function moduleId(value?: string): ModuleId {
  return (value ?? `MOD_${++moduleCounter}`) as ModuleId;
}

export function invariantId(value: string): InvariantId {
  if (!value.match(/^INV-[A-Z]+-\d+$/)) {
    throw new Error(`Invalid invariant ID format: ${value}`);
  }
  return value as InvariantId;
}

export function testId(value?: string): TestId {
  return (value ?? `TEST_${++testCounter}`) as TestId;
}

export function certificationHash(value: string): CertificationHash {
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('CertificationHash must be a valid SHA-256 hex string (64 characters)');
  }
  return value as CertificationHash;
}

export function timestampMs(value?: number): TimestampMs {
  return (value ?? Date.now()) as TimestampMs;
}

export function semanticVersion(value: string): SemanticVersion {
  if (!value.match(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/)) {
    throw new Error(`Invalid semantic version: ${value}`);
  }
  return value as SemanticVersion;
}

export function commitHash(value: string): CommitHash {
  if (!value || !/^[a-f0-9]{7,40}$/i.test(value)) {
    throw new Error('CommitHash must be a valid git hash (7-40 hex characters)');
  }
  return value as CommitHash;
}

export function coveragePercent(value: number): CoveragePercent {
  if (value < 0 || value > 100) {
    throw new Error('CoveragePercent must be between 0 and 100');
  }
  return value as CoveragePercent;
}

export function confidenceLevel(value: number): ConfidenceLevel {
  if (value < 0 || value > 1) {
    throw new Error('ConfidenceLevel must be between 0 and 1');
  }
  return value as ConfidenceLevel;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isProven(inv: Invariant): boolean {
  return inv.status === ProofStatus.PROVEN;
}

export function isVerified(inv: Invariant): boolean {
  return inv.status === ProofStatus.PROVEN || inv.status === ProofStatus.VERIFIED;
}

export function isCritical(inv: Invariant): boolean {
  return inv.severity === InvariantSeverity.CRITICAL;
}

export function isCertified(cert: ModuleCertification | CertificationReport): boolean {
  return cert.status === CertificationStatus.CERTIFIED;
}

export function isHealthy(snapshot: ObservatorySnapshot): boolean {
  return snapshot.overallHealth === HealthStatus.HEALTHY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_MODULES = Object.values(OmegaModule);
export const ALL_INVARIANT_CATEGORIES = Object.values(InvariantCategory);
export const ALL_INVARIANT_SEVERITIES = Object.values(InvariantSeverity);
export const ALL_PROOF_STATUSES = Object.values(ProofStatus);
export const ALL_TEST_STATUSES = Object.values(TestStatus);
export const ALL_CERTIFICATION_LEVELS = Object.values(CertificationLevel);
export const ALL_CERTIFICATION_STATUSES = Object.values(CertificationStatus);
export const ALL_HEALTH_STATUSES = Object.values(HealthStatus);
export const ALL_ALERT_SEVERITIES = Object.values(AlertSeverity);

/**
 * OMEGA version constants
 */
export const OMEGA_VERSION = semanticVersion('3.24.0');
export const OMEGA_CODENAME = 'NEXUS';
export const OMEGA_STANDARD = 'NASA-Grade L4 / DO-178C / AS9100D';

/**
 * Certification thresholds
 */
export const CERTIFICATION_THRESHOLDS = {
  BRONZE: { tests: 0.8, invariants: 0.5, coverage: 0.6 },
  SILVER: { tests: 0.95, invariants: 0.75, coverage: 0.8 },
  GOLD: { tests: 1.0, invariants: 0.9, coverage: 0.9 },
  PLATINUM: { tests: 1.0, invariants: 1.0, coverage: 0.95 },
  DIAMOND: { tests: 1.0, invariants: 1.0, coverage: 1.0 },
} as const;
