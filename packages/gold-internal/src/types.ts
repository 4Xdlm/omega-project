/**
 * @fileoverview OMEGA Gold Internal - Type Definitions
 * @module @omega/gold-internal/types
 *
 * Types for gold certification and validation.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Package validation result.
 */
export interface PackageValidation {
  readonly name: string;
  readonly version: string;
  readonly valid: boolean;
  readonly exports: readonly ExportValidation[];
  readonly errors: readonly string[];
}

/**
 * Export validation result.
 */
export interface ExportValidation {
  readonly name: string;
  readonly type: 'function' | 'class' | 'object' | 'type' | 'const';
  readonly valid: boolean;
  readonly error?: string;
}

/**
 * Cross-package validation result.
 */
export interface CrossPackageValidation {
  readonly packages: readonly PackageValidation[];
  readonly integrations: readonly IntegrationValidation[];
  readonly valid: boolean;
  readonly timestamp: string;
}

/**
 * Integration validation result.
 */
export interface IntegrationValidation {
  readonly name: string;
  readonly packages: readonly string[];
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gold certification level.
 */
export type CertificationLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

/**
 * Gold certification result.
 */
export interface GoldCertification {
  readonly id: string;
  readonly level: CertificationLevel;
  readonly timestamp: string;
  readonly version: string;
  readonly packages: readonly PackageCertification[];
  readonly metrics: CertificationMetrics;
  readonly hash: string;
}

/**
 * Package certification.
 */
export interface PackageCertification {
  readonly name: string;
  readonly version: string;
  readonly tests: number;
  readonly coverage?: number;
  readonly valid: boolean;
}

/**
 * Certification metrics.
 */
export interface CertificationMetrics {
  readonly totalPackages: number;
  readonly totalTests: number;
  readonly totalCoverage?: number;
  readonly passRate: number;
  readonly integrationsPassed: number;
  readonly integrationsTotal: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gold report.
 */
export interface GoldReport {
  readonly title: string;
  readonly certification: GoldCertification;
  readonly validation: CrossPackageValidation;
  readonly summary: string;
}

/**
 * Report format.
 */
export type ReportFormat = 'markdown' | 'json' | 'text';

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE INFO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OMEGA package info.
 */
export interface OmegaPackage {
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly tier: 'CORE' | 'UTILITY' | 'INTEGRATION' | 'CLIENT';
}

/**
 * All OMEGA packages.
 */
export const OMEGA_PACKAGES: readonly OmegaPackage[] = [
  {
    name: '@omega/orchestrator-core',
    shortName: 'orchestrator-core',
    description: 'Core orchestration engine with deterministic execution',
    tier: 'CORE',
  },
  {
    name: '@omega/headless-runner',
    shortName: 'headless-runner',
    description: 'Headless execution and replay engine',
    tier: 'CORE',
  },
  {
    name: '@omega/contracts-canon',
    shortName: 'contracts-canon',
    description: 'Contract definitions and invariant registry',
    tier: 'CORE',
  },
  {
    name: '@omega/proof-pack',
    shortName: 'proof-pack',
    description: 'Evidence bundling and audit trails',
    tier: 'UTILITY',
  },
  {
    name: '@omega/hardening',
    shortName: 'hardening',
    description: 'Security hardening and attack surface reduction',
    tier: 'UTILITY',
  },
  {
    name: '@omega/performance',
    shortName: 'performance',
    description: 'Performance measurement and optimization',
    tier: 'UTILITY',
  },
  {
    name: '@omega/gold-internal',
    shortName: 'gold-internal',
    description: 'Internal gold certification and validation',
    tier: 'INTEGRATION',
  },
];
