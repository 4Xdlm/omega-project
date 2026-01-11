/**
 * @fileoverview OMEGA Gold Master - Certifier
 * @module @omega/gold-master/certifier
 *
 * Ultimate certification engine.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { sha256 } from '@omega/orchestrator-core';
import {
  runIntegrationTests,
  ALL_INTEGRATIONS,
  OMEGA_PACKAGES,
} from '@omega/gold-internal';
import { SuiteRunner, aggregateResults } from '@omega/gold-suite';
// ProofPackBuilder available for future proof pack generation
import type {
  GoldMasterConfig,
  GoldMasterResult,
  GoldMasterSummary,
  GoldMasterLevel,
  GoldMasterStatus,
  PackageCertification,
  IntegrationCertification,
  FreezeManifest,
  FrozenPackage,
} from './types.js';
import { DEFAULT_GOLD_MASTER_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// GOLD MASTER CERTIFIER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gold Master certifier.
 */
export class GoldMasterCertifier {
  private readonly config: GoldMasterConfig;

  constructor(config: Partial<GoldMasterConfig> = {}) {
    this.config = { ...DEFAULT_GOLD_MASTER_CONFIG, ...config };
  }

  /**
   * Run full certification.
   */
  async certify(): Promise<GoldMasterResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Run suite tests
    const runner = new SuiteRunner({
      packages: OMEGA_PACKAGES.map((p) => p.name),
    });
    const suiteResult = await runner.run();
    const aggregated = aggregateResults(suiteResult);

    // Run integrations
    const integrations = await this.runIntegrations();

    // Build package certifications
    const packages = this.buildPackageCertifications(aggregated.packages);

    // Calculate summary
    const summary = this.calculateSummary(packages, integrations, Date.now() - startTime);

    // Determine level
    const level = this.determineLevel(summary);

    // Determine status
    const status = this.determineStatus(summary, level);

    // Generate ID and hash
    const id = this.generateId();
    const hash = this.computeHash(timestamp, summary, packages, integrations);

    return {
      id,
      version: this.config.version,
      phase: this.config.phase,
      status,
      level,
      timestamp,
      summary,
      packages,
      integrations,
      hash,
    };
  }

  /**
   * Run integration tests.
   */
  private async runIntegrations(): Promise<readonly IntegrationCertification[]> {
    const results = await runIntegrationTests([...ALL_INTEGRATIONS]);

    return results.map((r) => ({
      name: r.name,
      packages: [...r.packages],
      passed: r.valid,
      errors: [...r.errors],
    }));
  }

  /**
   * Build package certifications.
   */
  private buildPackageCertifications(
    packages: readonly { name: string; tests: number; passed: number; failed: number; duration: number }[]
  ): readonly PackageCertification[] {
    return packages.map((p) => ({
      name: p.name,
      version: '0.1.0',
      tests: p.tests,
      passed: p.passed,
      failed: p.failed,
      duration: p.duration,
      certified: p.failed === 0,
    }));
  }

  /**
   * Calculate summary.
   */
  private calculateSummary(
    packages: readonly PackageCertification[],
    integrations: readonly IntegrationCertification[],
    duration: number
  ): GoldMasterSummary {
    const totalPackages = packages.length;
    const totalTests = packages.reduce((sum, p) => sum + p.tests, 0);
    const totalPassed = packages.reduce((sum, p) => sum + p.passed, 0);
    const totalFailed = packages.reduce((sum, p) => sum + p.failed, 0);
    const totalIntegrations = integrations.length;
    const integrationsPassed = integrations.filter((i) => i.passed).length;
    const passRate = totalTests > 0 ? totalPassed / totalTests : 0;

    return {
      totalPackages,
      totalTests,
      totalPassed,
      totalFailed,
      totalIntegrations,
      integrationsPassed,
      passRate,
      duration,
    };
  }

  /**
   * Determine certification level.
   */
  private determineLevel(summary: GoldMasterSummary): GoldMasterLevel {
    const intRate = summary.totalIntegrations > 0
      ? summary.integrationsPassed / summary.totalIntegrations
      : 0;

    // DIAMOND: 100% pass rate, all integrations, 1000+ tests
    if (summary.passRate === 1 && intRate === 1 && summary.totalTests >= 1000) {
      return 'DIAMOND';
    }

    // PLATINUM: 100% pass rate, all integrations
    if (summary.passRate === 1 && intRate === 1) {
      return 'PLATINUM';
    }

    // GOLD: >= 99% pass rate, >= 90% integrations
    if (summary.passRate >= 0.99 && intRate >= 0.9) {
      return 'GOLD';
    }

    // SILVER: >= 95% pass rate, >= 80% integrations
    if (summary.passRate >= 0.95 && intRate >= 0.8) {
      return 'SILVER';
    }

    // BRONZE: default
    return 'BRONZE';
  }

  /**
   * Determine status.
   */
  private determineStatus(summary: GoldMasterSummary, level: GoldMasterLevel): GoldMasterStatus {
    if (summary.totalFailed > 0) {
      return 'FAILED';
    }

    if (level === 'BRONZE' && this.config.strictMode) {
      return 'FAILED';
    }

    if (level === 'DIAMOND' || level === 'PLATINUM') {
      return 'PASSED';
    }

    if (level === this.config.targetLevel || this.compareLevels(level, this.config.targetLevel) > 0) {
      return 'PASSED';
    }

    return 'FAILED';
  }

  /**
   * Compare levels (higher = better).
   */
  private compareLevels(a: GoldMasterLevel, b: GoldMasterLevel): number {
    const order: GoldMasterLevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    return order.indexOf(a) - order.indexOf(b);
  }

  /**
   * Generate certification ID.
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `GOLD-MASTER-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Compute result hash.
   */
  private computeHash(
    timestamp: string,
    summary: GoldMasterSummary,
    packages: readonly PackageCertification[],
    integrations: readonly IntegrationCertification[]
  ): string {
    const data = JSON.stringify({
      timestamp,
      summary,
      packageCount: packages.length,
      integrationCount: integrations.length,
      version: this.config.version,
    });
    return sha256(data);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREEZE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create freeze manifest.
 */
export function createFreezeManifest(result: GoldMasterResult): FreezeManifest {
  const packages: FrozenPackage[] = result.packages.map((p) => ({
    name: p.name,
    version: p.version,
    hash: sha256(JSON.stringify(p)),
    frozen: p.certified,
  }));

  const manifestData = JSON.stringify({
    version: result.version,
    packages,
    timestamp: result.timestamp,
  });

  const hash = sha256(manifestData);
  const signature = `FREEZE-${hash.slice(0, 16)}`;

  return {
    version: result.version,
    frozenAt: new Date().toISOString(),
    packages,
    hash,
    signature,
  };
}

/**
 * Verify freeze manifest.
 */
export function verifyFreezeManifest(manifest: FreezeManifest): boolean {
  const expectedSignature = `FREEZE-${manifest.hash.slice(0, 16)}`;
  return manifest.signature === expectedSignature;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create Gold Master certifier.
 */
export function createGoldMasterCertifier(config?: Partial<GoldMasterConfig>): GoldMasterCertifier {
  return new GoldMasterCertifier(config);
}

/**
 * Run Gold Master certification.
 */
export async function runGoldMaster(config?: Partial<GoldMasterConfig>): Promise<GoldMasterResult> {
  const certifier = createGoldMasterCertifier(config);
  return certifier.certify();
}
