/**
 * @fileoverview OMEGA Gold Master - Type Definitions
 * @module @omega/gold-master/types
 *
 * Ultimate certification system types.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GOLD MASTER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gold Master certification status.
 */
export type GoldMasterStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'PASSED'
  | 'FAILED'
  | 'FROZEN'
  | 'RELEASED';

/**
 * Gold Master certification level.
 */
export type GoldMasterLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

/**
 * Gold Master configuration.
 */
export interface GoldMasterConfig {
  readonly version: string;
  readonly phase: number;
  readonly standard: string;
  readonly targetLevel: GoldMasterLevel;
  readonly strictMode: boolean;
  readonly generateProofPack: boolean;
}

/**
 * Gold Master result.
 */
export interface GoldMasterResult {
  readonly id: string;
  readonly version: string;
  readonly phase: number;
  readonly status: GoldMasterStatus;
  readonly level: GoldMasterLevel;
  readonly timestamp: string;
  readonly summary: GoldMasterSummary;
  readonly packages: readonly PackageCertification[];
  readonly integrations: readonly IntegrationCertification[];
  readonly hash: string;
}

/**
 * Gold Master summary.
 */
export interface GoldMasterSummary {
  readonly totalPackages: number;
  readonly totalTests: number;
  readonly totalPassed: number;
  readonly totalFailed: number;
  readonly totalIntegrations: number;
  readonly integrationsPassed: number;
  readonly passRate: number;
  readonly duration: number;
}

/**
 * Package certification.
 */
export interface PackageCertification {
  readonly name: string;
  readonly version: string;
  readonly tests: number;
  readonly passed: number;
  readonly failed: number;
  readonly duration: number;
  readonly certified: boolean;
}

/**
 * Integration certification.
 */
export interface IntegrationCertification {
  readonly name: string;
  readonly packages: readonly string[];
  readonly passed: boolean;
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREEZE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Freeze manifest.
 */
export interface FreezeManifest {
  readonly version: string;
  readonly frozenAt: string;
  readonly packages: readonly FrozenPackage[];
  readonly hash: string;
  readonly signature: string;
}

/**
 * Frozen package entry.
 */
export interface FrozenPackage {
  readonly name: string;
  readonly version: string;
  readonly hash: string;
  readonly frozen: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default Gold Master configuration.
 */
export const DEFAULT_GOLD_MASTER_CONFIG: GoldMasterConfig = Object.freeze({
  version: '3.83.0',
  phase: 80,
  standard: 'NASA-Grade L4 / DO-178C Level A',
  targetLevel: 'GOLD',
  strictMode: true,
  generateProofPack: true,
});
