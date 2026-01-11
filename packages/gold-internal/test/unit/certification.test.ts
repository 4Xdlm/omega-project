/**
 * @fileoverview Tests for certification utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  generateCertificationId,
  determineCertificationLevel,
  calculateMetrics,
  createCertification,
  createGoldReport,
  formatReport,
} from '../../src/index.js';
import type {
  PackageCertification,
  CrossPackageValidation,
  CertificationMetrics,
} from '../../src/index.js';

describe('generateCertificationId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateCertificationId();
    const id2 = generateCertificationId();
    expect(id1).not.toBe(id2);
  });

  it('should start with GOLD prefix', () => {
    const id = generateCertificationId();
    expect(id.startsWith('GOLD-')).toBe(true);
  });

  it('should be uppercase', () => {
    const id = generateCertificationId();
    expect(id).toBe(id.toUpperCase());
  });
});

describe('determineCertificationLevel', () => {
  it('should return PLATINUM for perfect metrics', () => {
    const metrics: CertificationMetrics = {
      totalPackages: 10,
      totalTests: 500,
      passRate: 1,
      integrationsPassed: 10,
      integrationsTotal: 10,
    };
    expect(determineCertificationLevel(metrics)).toBe('PLATINUM');
  });

  it('should return GOLD for high metrics', () => {
    const metrics: CertificationMetrics = {
      totalPackages: 5,
      totalTests: 200,
      passRate: 0.99,
      integrationsPassed: 9,
      integrationsTotal: 10,
    };
    expect(determineCertificationLevel(metrics)).toBe('GOLD');
  });

  it('should return SILVER for moderate metrics', () => {
    const metrics: CertificationMetrics = {
      totalPackages: 5,
      totalTests: 100,
      passRate: 0.95,
      integrationsPassed: 8,
      integrationsTotal: 10,
    };
    expect(determineCertificationLevel(metrics)).toBe('SILVER');
  });

  it('should return BRONZE for low metrics', () => {
    const metrics: CertificationMetrics = {
      totalPackages: 2,
      totalTests: 50,
      passRate: 0.9,
      integrationsPassed: 5,
      integrationsTotal: 10,
    };
    expect(determineCertificationLevel(metrics)).toBe('BRONZE');
  });
});

describe('calculateMetrics', () => {
  it('should calculate total packages', () => {
    const packages: PackageCertification[] = [
      { name: 'pkg1', version: '1.0.0', tests: 10, valid: true },
      { name: 'pkg2', version: '1.0.0', tests: 20, valid: true },
    ];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const metrics = calculateMetrics(packages, validation);
    expect(metrics.totalPackages).toBe(2);
  });

  it('should calculate total tests', () => {
    const packages: PackageCertification[] = [
      { name: 'pkg1', version: '1.0.0', tests: 10, valid: true },
      { name: 'pkg2', version: '1.0.0', tests: 20, valid: true },
    ];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const metrics = calculateMetrics(packages, validation);
    expect(metrics.totalTests).toBe(30);
  });

  it('should calculate pass rate', () => {
    const packages: PackageCertification[] = [
      { name: 'pkg1', version: '1.0.0', tests: 10, valid: true },
      { name: 'pkg2', version: '1.0.0', tests: 10, valid: false },
    ];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const metrics = calculateMetrics(packages, validation);
    expect(metrics.passRate).toBe(0.5);
  });

  it('should count integrations', () => {
    const packages: PackageCertification[] = [];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [
        { name: 'int1', packages: [], valid: true, errors: [] },
        { name: 'int2', packages: [], valid: false, errors: [] },
      ],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const metrics = calculateMetrics(packages, validation);
    expect(metrics.integrationsPassed).toBe(1);
    expect(metrics.integrationsTotal).toBe(2);
  });
});

describe('createCertification', () => {
  it('should create certification with ID', () => {
    const packages: PackageCertification[] = [
      { name: 'pkg1', version: '1.0.0', tests: 100, valid: true },
    ];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);

    expect(cert.id).toMatch(/^GOLD-/);
    expect(cert.version).toBe('1.0.0');
  });

  it('should include hash', () => {
    const packages: PackageCertification[] = [];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);

    expect(cert.hash.length).toBe(64);
  });

  it('should determine level', () => {
    const packages: PackageCertification[] = [
      { name: 'pkg1', version: '1.0.0', tests: 500, valid: true },
    ];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [
        { name: 'int1', packages: [], valid: true, errors: [] },
      ],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);

    expect(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE']).toContain(cert.level);
  });
});

describe('createGoldReport', () => {
  it('should create report with title', () => {
    const packages: PackageCertification[] = [];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);
    const report = createGoldReport(cert, validation);

    expect(report.title).toContain('OMEGA Gold');
  });

  it('should include summary', () => {
    const packages: PackageCertification[] = [];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);
    const report = createGoldReport(cert, validation);

    expect(report.summary).toContain('Certification Level');
    expect(report.summary).toContain('Total Packages');
  });
});

describe('formatReport', () => {
  it('should format as JSON', () => {
    const packages: PackageCertification[] = [];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);
    const report = createGoldReport(cert, validation);
    const formatted = formatReport(report, 'json');

    expect(() => JSON.parse(formatted)).not.toThrow();
  });

  it('should format as markdown', () => {
    const packages: PackageCertification[] = [
      { name: 'pkg1', version: '1.0.0', tests: 10, valid: true },
    ];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);
    const report = createGoldReport(cert, validation);
    const formatted = formatReport(report, 'markdown');

    expect(formatted).toContain('# ');
    expect(formatted).toContain('| Package |');
  });

  it('should format as text', () => {
    const packages: PackageCertification[] = [];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);
    const report = createGoldReport(cert, validation);
    const formatted = formatReport(report, 'text');

    expect(formatted).toContain('═');
    expect(formatted).toContain('Certification ID');
  });

  it('should throw for unknown format', () => {
    const packages: PackageCertification[] = [];
    const validation: CrossPackageValidation = {
      packages: [],
      integrations: [],
      valid: true,
      timestamp: new Date().toISOString(),
    };

    const cert = createCertification('1.0.0', packages, validation);
    const report = createGoldReport(cert, validation);

    expect(() => formatReport(report, 'unknown' as any)).toThrow();
  });
});
