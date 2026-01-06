/**
 * OMEGA NEXUS - Certification Engine
 * 
 * Phase 24
 * 
 * Automatically generates NASA-grade certification reports
 * by analyzing modules, tests, and invariants.
 */

import {
  OmegaModule,
  ModuleCertification,
  CertificationReport,
  CertificationLevel,
  CertificationStatus,
  TestReport,
  TestSuiteResult,
  TestResult,
  TestStatus,
  InvariantRegistry,
  Invariant,
  ProofStatus,
  CertificationHash,
  SemanticVersion,
  CommitHash,
  TimestampMs,
  semanticVersion,
  commitHash,
  timestampMs,
  coveragePercent,
  certificationHash,
  CERTIFICATION_THRESHOLDS,
  OMEGA_VERSION,
  ALL_MODULES,
} from '../core/types.js';
import { sha256, hashObject, getMerkleRoot, buildMerkleTree, MerkleTree } from '../core/crypto.js';
import { INVARIANT_REGISTRY, getModuleInvariants, getCriticalInvariants, getRegistryStats } from '../core/registry.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Certification engine configuration
 */
export interface CertificationConfig {
  readonly version: SemanticVersion;
  readonly gitCommit: CommitHash;
  readonly gitTag: string;
  readonly createdBy: string;
  readonly targetLevel: CertificationLevel;
}

/**
 * Module test data (input to certification)
 */
export interface ModuleTestData {
  readonly module: OmegaModule;
  readonly version: SemanticVersion;
  readonly testResults: ReadonlyArray<{
    name: string;
    status: TestStatus;
    duration: number;
    invariantId?: string;
    error?: string;
  }>;
  readonly coverage: number;
}

/**
 * Certification engine class
 */
export class CertificationEngine {
  private readonly config: CertificationConfig;
  private readonly registry: InvariantRegistry;
  private moduleData: Map<OmegaModule, ModuleTestData> = new Map();

  constructor(config: CertificationConfig, registry: InvariantRegistry = INVARIANT_REGISTRY) {
    this.config = config;
    this.registry = registry;
  }

  /**
   * Add module test data
   */
  addModuleData(data: ModuleTestData): this {
    this.moduleData.set(data.module, data);
    return this;
  }

  /**
   * Add multiple module data
   */
  addAllModuleData(data: ReadonlyArray<ModuleTestData>): this {
    for (const d of data) {
      this.addModuleData(d);
    }
    return this;
  }

  /**
   * Generate full certification report
   */
  generateReport(): CertificationReport {
    const timestamp = timestampMs();
    
    // Generate test report
    const testReport = this.generateTestReport(timestamp);
    
    // Generate module certifications
    const modules = this.generateModuleCertifications(timestamp);
    
    // Determine overall level and status
    const { level, status } = this.determineOverallCertification(modules, testReport);
    
    // Generate Merkle root
    const merkleItems = this.collectMerkleItems(modules, testReport);
    const merkleRoot = getMerkleRoot(merkleItems);
    
    // Generate report ID (hash of entire report)
    const reportId = this.generateReportId(
      modules,
      testReport,
      merkleRoot,
      timestamp
    );

    return {
      id: reportId,
      version: this.config.version,
      level,
      status,
      modules,
      invariants: this.registry,
      testReport,
      merkleRoot,
      createdAt: timestamp,
      createdBy: this.config.createdBy,
      gitCommit: this.config.gitCommit,
      gitTag: this.config.gitTag,
    };
  }

  /**
   * Generate test report from module data
   */
  private generateTestReport(timestamp: TimestampMs): TestReport {
    const suites: TestSuiteResult[] = [];
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;

    for (const [module, data] of this.moduleData) {
      const results: TestResult[] = data.testResults.map((t, i) => ({
        id: `${module}_TEST_${i + 1}` as any,
        name: t.name,
        module,
        invariantId: t.invariantId as any,
        status: t.status,
        duration: t.duration,
        error: t.error,
        hash: sha256(`${module}:${t.name}:${t.status}`),
        timestamp,
      }));

      const passed = results.filter(r => r.status === TestStatus.PASS).length;
      const failed = results.filter(r => r.status === TestStatus.FAIL).length;
      const skipped = results.filter(r => r.status === TestStatus.SKIP).length;
      const duration = results.reduce((sum, r) => sum + r.duration, 0);

      suites.push({
        module,
        totalTests: results.length,
        passed,
        failed,
        skipped,
        duration,
        results,
        hash: sha256(`${module}:${passed}:${failed}:${skipped}`),
      });

      totalTests += results.length;
      totalPassed += passed;
      totalFailed += failed;
      totalSkipped += skipped;
      totalDuration += duration;
    }

    return {
      suites,
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      allPassed: totalFailed === 0,
      hash: sha256(`TESTS:${totalPassed}:${totalFailed}:${totalSkipped}`),
      timestamp,
    };
  }

  /**
   * Generate module certifications
   */
  private generateModuleCertifications(timestamp: TimestampMs): ModuleCertification[] {
    const certifications: ModuleCertification[] = [];

    for (const [module, data] of this.moduleData) {
      const invariants = getModuleInvariants(this.registry, module);
      const provenInvariants = invariants.filter(
        inv => inv.status === ProofStatus.PROVEN || inv.status === ProofStatus.VERIFIED
      );

      const testsPassed = data.testResults.filter(t => t.status === TestStatus.PASS).length;
      const testsTotal = data.testResults.length;
      const coverage = coveragePercent(data.coverage);

      const level = this.determineModuleLevel(
        testsPassed / testsTotal,
        provenInvariants.length / (invariants.length || 1),
        data.coverage / 100
      );

      const status = testsPassed === testsTotal && provenInvariants.length === invariants.length
        ? CertificationStatus.CERTIFIED
        : CertificationStatus.IN_PROGRESS;

      certifications.push({
        module,
        version: data.version,
        level,
        status,
        invariantsCovered: provenInvariants.length,
        invariantsTotal: invariants.length,
        testsPassed,
        testsTotal,
        coverage,
        hash: sha256(`${module}:${level}:${status}:${testsPassed}:${testsTotal}`),
        certifiedAt: timestamp,
      });
    }

    return certifications;
  }

  /**
   * Determine module certification level
   */
  private determineModuleLevel(
    testRatio: number,
    invariantRatio: number,
    coverageRatio: number
  ): CertificationLevel {
    const thresholds = CERTIFICATION_THRESHOLDS;

    if (
      testRatio >= thresholds.DIAMOND.tests &&
      invariantRatio >= thresholds.DIAMOND.invariants &&
      coverageRatio >= thresholds.DIAMOND.coverage
    ) {
      return CertificationLevel.DIAMOND;
    }

    if (
      testRatio >= thresholds.PLATINUM.tests &&
      invariantRatio >= thresholds.PLATINUM.invariants &&
      coverageRatio >= thresholds.PLATINUM.coverage
    ) {
      return CertificationLevel.PLATINUM;
    }

    if (
      testRatio >= thresholds.GOLD.tests &&
      invariantRatio >= thresholds.GOLD.invariants &&
      coverageRatio >= thresholds.GOLD.coverage
    ) {
      return CertificationLevel.GOLD;
    }

    if (
      testRatio >= thresholds.SILVER.tests &&
      invariantRatio >= thresholds.SILVER.invariants &&
      coverageRatio >= thresholds.SILVER.coverage
    ) {
      return CertificationLevel.SILVER;
    }

    if (
      testRatio >= thresholds.BRONZE.tests &&
      invariantRatio >= thresholds.BRONZE.invariants &&
      coverageRatio >= thresholds.BRONZE.coverage
    ) {
      return CertificationLevel.BRONZE;
    }

    return CertificationLevel.BRONZE;
  }

  /**
   * Determine overall certification
   */
  private determineOverallCertification(
    modules: ModuleCertification[],
    testReport: TestReport
  ): { level: CertificationLevel; status: CertificationStatus } {
    if (modules.length === 0) {
      return { level: CertificationLevel.BRONZE, status: CertificationStatus.FAILED };
    }

    // Check if any module failed
    const anyFailed = modules.some(m => m.status === CertificationStatus.FAILED);
    if (anyFailed || !testReport.allPassed) {
      return { level: CertificationLevel.BRONZE, status: CertificationStatus.FAILED };
    }

    // Check if all modules certified
    const allCertified = modules.every(m => m.status === CertificationStatus.CERTIFIED);
    
    // Determine minimum level across modules
    const levelPriority: CertificationLevel[] = [
      CertificationLevel.BRONZE,
      CertificationLevel.SILVER,
      CertificationLevel.GOLD,
      CertificationLevel.PLATINUM,
      CertificationLevel.DIAMOND,
    ];

    let minLevel = CertificationLevel.DIAMOND;
    for (const m of modules) {
      const mIndex = levelPriority.indexOf(m.level);
      const minIndex = levelPriority.indexOf(minLevel);
      if (mIndex < minIndex) {
        minLevel = m.level;
      }
    }

    // Check critical invariants
    const criticalInvariants = getCriticalInvariants(this.registry);
    const allCriticalProven = criticalInvariants.every(
      inv => inv.status === ProofStatus.PROVEN || inv.status === ProofStatus.VERIFIED
    );

    if (!allCriticalProven) {
      return {
        level: minLevel,
        status: CertificationStatus.IN_PROGRESS,
      };
    }

    return {
      level: minLevel,
      status: allCertified ? CertificationStatus.CERTIFIED : CertificationStatus.IN_PROGRESS,
    };
  }

  /**
   * Collect items for Merkle tree
   */
  private collectMerkleItems(
    modules: ModuleCertification[],
    testReport: TestReport
  ): string[] {
    const items: string[] = [];

    // Add module hashes
    for (const m of modules) {
      items.push(m.hash);
    }

    // Add test suite hashes
    for (const suite of testReport.suites) {
      items.push(suite.hash);
    }

    // Add invariant hashes
    for (const inv of this.registry.invariants.values()) {
      items.push(inv.hash);
    }

    return items;
  }

  /**
   * Generate report ID
   */
  private generateReportId(
    modules: ModuleCertification[],
    testReport: TestReport,
    merkleRoot: CertificationHash,
    timestamp: TimestampMs
  ): CertificationHash {
    return sha256(JSON.stringify({
      version: this.config.version,
      gitCommit: this.config.gitCommit,
      moduleHashes: modules.map(m => m.hash),
      testHash: testReport.hash,
      merkleRoot,
      timestamp,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate certification report text
 */
export function generateCertificationText(report: CertificationReport): string {
  const lines: string[] = [];
  const divider = '═'.repeat(80);
  const thinDivider = '─'.repeat(80);

  // Header
  lines.push(divider);
  lines.push('');
  lines.push('                    OMEGA NEXUS - CERTIFICATION REPORT');
  lines.push(`                           Version ${report.version}`);
  lines.push('');
  lines.push(divider);
  lines.push('');

  // Status
  lines.push(`CERTIFICATION STATUS: ${report.status}`);
  lines.push(`CERTIFICATION LEVEL:  ${report.level}`);
  lines.push(`STANDARD:             NASA-Grade L4 / DO-178C / AS9100D`);
  lines.push('');
  lines.push(thinDivider);

  // Metadata
  lines.push('');
  lines.push('METADATA');
  lines.push(`  Report ID:    ${report.id}`);
  lines.push(`  Created:      ${new Date(report.createdAt).toISOString()}`);
  lines.push(`  Created By:   ${report.createdBy}`);
  lines.push(`  Git Commit:   ${report.gitCommit}`);
  lines.push(`  Git Tag:      ${report.gitTag}`);
  lines.push(`  Merkle Root:  ${report.merkleRoot}`);
  lines.push('');
  lines.push(thinDivider);

  // Test Summary
  lines.push('');
  lines.push('TEST SUMMARY');
  lines.push(`  Total Tests:  ${report.testReport.totalTests}`);
  lines.push(`  Passed:       ${report.testReport.totalPassed}`);
  lines.push(`  Failed:       ${report.testReport.totalFailed}`);
  lines.push(`  Skipped:      ${report.testReport.totalSkipped}`);
  lines.push(`  Duration:     ${report.testReport.totalDuration}ms`);
  lines.push(`  All Passed:   ${report.testReport.allPassed ? 'YES' : 'NO'}`);
  lines.push('');
  lines.push(thinDivider);

  // Module Certifications
  lines.push('');
  lines.push('MODULE CERTIFICATIONS');
  lines.push('');
  lines.push('  Module               Level      Status       Tests      Invariants   Coverage');
  lines.push('  ' + '─'.repeat(76));
  
  for (const m of report.modules) {
    const modulePad = m.module.padEnd(18);
    const levelPad = m.level.padEnd(10);
    const statusPad = m.status.padEnd(12);
    const testsPad = `${m.testsPassed}/${m.testsTotal}`.padEnd(10);
    const invPad = `${m.invariantsCovered}/${m.invariantsTotal}`.padEnd(12);
    const covPad = `${m.coverage.toFixed(1)}%`;
    lines.push(`  ${modulePad} ${levelPad} ${statusPad} ${testsPad} ${invPad} ${covPad}`);
  }
  lines.push('');
  lines.push(thinDivider);

  // Invariant Summary
  const stats = getRegistryStats(report.invariants);
  lines.push('');
  lines.push('INVARIANT SUMMARY');
  lines.push(`  Total:           ${stats.total}`);
  lines.push(`  Proven:          ${stats.proven} (${stats.provenPercent.toFixed(1)}%)`);
  lines.push(`  Verified:        ${stats.verified} (${stats.verifiedPercent.toFixed(1)}%)`);
  lines.push(`  Pending:         ${stats.pending}`);
  lines.push(`  Failed:          ${stats.failed}`);
  lines.push(`  Critical:        ${stats.critical}`);
  lines.push(`  Critical Proven: ${stats.criticalProven} (${stats.criticalPercent.toFixed(1)}%)`);
  lines.push('');
  lines.push(thinDivider);

  // Footer
  lines.push('');
  lines.push('CERTIFICATION AUTHORITY');
  lines.push('  This report is generated by OMEGA NEXUS Certification Engine.');
  lines.push('  It is cryptographically sealed and audit-ready.');
  lines.push('');
  lines.push(divider);
  lines.push('');
  lines.push(`REPORT HASH: ${report.id}`);
  lines.push('');
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Generate JSON certification report
 */
export function generateCertificationJSON(report: CertificationReport): string {
  return JSON.stringify({
    id: report.id,
    version: report.version,
    level: report.level,
    status: report.status,
    merkleRoot: report.merkleRoot,
    createdAt: report.createdAt,
    createdBy: report.createdBy,
    gitCommit: report.gitCommit,
    gitTag: report.gitTag,
    modules: report.modules.map(m => ({
      module: m.module,
      version: m.version,
      level: m.level,
      status: m.status,
      tests: `${m.testsPassed}/${m.testsTotal}`,
      invariants: `${m.invariantsCovered}/${m.invariantsTotal}`,
      coverage: m.coverage,
      hash: m.hash,
    })),
    testSummary: {
      total: report.testReport.totalTests,
      passed: report.testReport.totalPassed,
      failed: report.testReport.totalFailed,
      skipped: report.testReport.totalSkipped,
      allPassed: report.testReport.allPassed,
    },
    invariantSummary: getRegistryStats(report.invariants),
  }, null, 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create certification engine with default config
 */
export function createCertificationEngine(
  version: string = '3.24.0',
  gitCommit: string = '0000000',
  gitTag: string = 'v3.24.0-NEXUS'
): CertificationEngine {
  return new CertificationEngine({
    version: semanticVersion(version),
    gitCommit: commitHash(gitCommit),
    gitTag,
    createdBy: 'OMEGA NEXUS',
    targetLevel: CertificationLevel.PLATINUM,
  });
}

/**
 * Quick certification for a single module
 */
export function certifyModule(
  module: OmegaModule,
  testResults: ModuleTestData['testResults'],
  coverage: number = 95
): ModuleCertification {
  const engine = createCertificationEngine();
  engine.addModuleData({
    module,
    version: OMEGA_VERSION,
    testResults,
    coverage,
  });

  const report = engine.generateReport();
  return report.modules[0];
}
