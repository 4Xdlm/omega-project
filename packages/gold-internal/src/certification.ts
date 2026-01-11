/**
 * @fileoverview OMEGA Gold Internal - Certification
 * @module @omega/gold-internal/certification
 *
 * Gold certification generation.
 */

import { sha256 } from '@omega/orchestrator-core';
import type {
  CertificationLevel,
  GoldCertification,
  PackageCertification,
  CertificationMetrics,
  CrossPackageValidation,
  GoldReport,
  ReportFormat,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate certification ID.
 */
export function generateCertificationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `GOLD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Determine certification level based on metrics.
 */
export function determineCertificationLevel(
  metrics: CertificationMetrics
): CertificationLevel {
  // PLATINUM: 100% pass rate, all integrations passed
  if (
    metrics.passRate === 1 &&
    metrics.integrationsPassed === metrics.integrationsTotal &&
    metrics.totalTests >= 500
  ) {
    return 'PLATINUM';
  }

  // GOLD: >= 99% pass rate, >= 90% integrations
  if (
    metrics.passRate >= 0.99 &&
    metrics.integrationsPassed / metrics.integrationsTotal >= 0.9 &&
    metrics.totalTests >= 200
  ) {
    return 'GOLD';
  }

  // SILVER: >= 95% pass rate, >= 80% integrations
  if (
    metrics.passRate >= 0.95 &&
    metrics.integrationsPassed / metrics.integrationsTotal >= 0.8 &&
    metrics.totalTests >= 100
  ) {
    return 'SILVER';
  }

  // BRONZE: >= 90% pass rate
  return 'BRONZE';
}

/**
 * Calculate certification metrics.
 */
export function calculateMetrics(
  packages: readonly PackageCertification[],
  validation: CrossPackageValidation
): CertificationMetrics {
  const totalPackages = packages.length;
  const totalTests = packages.reduce((sum, p) => sum + p.tests, 0);
  const validPackages = packages.filter((p) => p.valid).length;
  const integrationsPassed = validation.integrations.filter((i) => i.valid).length;

  return {
    totalPackages,
    totalTests,
    passRate: totalPackages > 0 ? validPackages / totalPackages : 0,
    integrationsPassed,
    integrationsTotal: validation.integrations.length,
  };
}

/**
 * Create gold certification.
 */
export function createCertification(
  version: string,
  packages: readonly PackageCertification[],
  validation: CrossPackageValidation
): GoldCertification {
  const metrics = calculateMetrics(packages, validation);
  const level = determineCertificationLevel(metrics);
  const id = generateCertificationId();
  const timestamp = new Date().toISOString();

  // Generate hash of certification data
  const certData = JSON.stringify({
    id,
    level,
    version,
    packages,
    metrics,
    timestamp,
  });
  const hash = sha256(certData);

  return {
    id,
    level,
    timestamp,
    version,
    packages,
    metrics,
    hash,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create gold report.
 */
export function createGoldReport(
  certification: GoldCertification,
  validation: CrossPackageValidation
): GoldReport {
  const summary = generateSummary(certification, validation);

  return {
    title: `OMEGA Gold Certification Report - ${certification.level}`,
    certification,
    validation,
    summary,
  };
}

/**
 * Generate summary text.
 */
function generateSummary(
  cert: GoldCertification,
  validation: CrossPackageValidation
): string {
  const lines: string[] = [];

  lines.push(`Certification Level: ${cert.level}`);
  lines.push(`Total Packages: ${cert.metrics.totalPackages}`);
  lines.push(`Total Tests: ${cert.metrics.totalTests}`);
  lines.push(`Pass Rate: ${(cert.metrics.passRate * 100).toFixed(1)}%`);
  lines.push(
    `Integrations: ${cert.metrics.integrationsPassed}/${cert.metrics.integrationsTotal}`
  );
  lines.push(`Status: ${validation.valid ? 'VALID' : 'INVALID'}`);

  return lines.join('\n');
}

/**
 * Format report.
 */
export function formatReport(report: GoldReport, format: ReportFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);

    case 'markdown':
      return formatMarkdownReport(report);

    case 'text':
      return formatTextReport(report);

    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Format as markdown.
 */
function formatMarkdownReport(report: GoldReport): string {
  const lines: string[] = [];
  const cert = report.certification;

  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`**Certification ID:** ${cert.id}`);
  lines.push(`**Level:** ${cert.level}`);
  lines.push(`**Version:** ${cert.version}`);
  lines.push(`**Timestamp:** ${cert.timestamp}`);
  lines.push(`**Hash:** ${cert.hash.slice(0, 16)}...`);
  lines.push('');
  lines.push('## Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Packages | ${cert.metrics.totalPackages} |`);
  lines.push(`| Total Tests | ${cert.metrics.totalTests} |`);
  lines.push(`| Pass Rate | ${(cert.metrics.passRate * 100).toFixed(1)}% |`);
  lines.push(
    `| Integrations | ${cert.metrics.integrationsPassed}/${cert.metrics.integrationsTotal} |`
  );
  lines.push('');
  lines.push('## Packages');
  lines.push('');
  lines.push(`| Package | Version | Tests | Status |`);
  lines.push(`|---------|---------|-------|--------|`);
  for (const pkg of cert.packages) {
    const status = pkg.valid ? 'PASS' : 'FAIL';
    lines.push(`| ${pkg.name} | ${pkg.version} | ${pkg.tests} | ${status} |`);
  }
  lines.push('');
  lines.push('## Integrations');
  lines.push('');
  for (const integration of report.validation.integrations) {
    const status = integration.valid ? 'PASS' : 'FAIL';
    lines.push(`- **${integration.name}**: ${status}`);
    if (integration.errors.length > 0) {
      for (const error of integration.errors) {
        lines.push(`  - Error: ${error}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format as text.
 */
function formatTextReport(report: GoldReport): string {
  const lines: string[] = [];
  const cert = report.certification;

  lines.push('═'.repeat(60));
  lines.push(report.title);
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push(`Certification ID: ${cert.id}`);
  lines.push(`Level: ${cert.level}`);
  lines.push(`Version: ${cert.version}`);
  lines.push(`Timestamp: ${cert.timestamp}`);
  lines.push('');
  lines.push('METRICS');
  lines.push('-'.repeat(40));
  lines.push(`Total Packages: ${cert.metrics.totalPackages}`);
  lines.push(`Total Tests: ${cert.metrics.totalTests}`);
  lines.push(`Pass Rate: ${(cert.metrics.passRate * 100).toFixed(1)}%`);
  lines.push(
    `Integrations: ${cert.metrics.integrationsPassed}/${cert.metrics.integrationsTotal}`
  );
  lines.push('');
  lines.push('PACKAGES');
  lines.push('-'.repeat(40));
  for (const pkg of cert.packages) {
    const status = pkg.valid ? 'PASS' : 'FAIL';
    lines.push(`${pkg.name} v${pkg.version} - ${pkg.tests} tests - ${status}`);
  }

  return lines.join('\n');
}
