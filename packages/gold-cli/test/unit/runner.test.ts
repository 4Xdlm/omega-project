/**
 * @fileoverview Tests for CLI runner.
 */

import { describe, it, expect } from 'vitest';
import {
  discoverPackages,
  runPackageTests,
  runAllTests,
  runIntegrations,
  createPackageCertifications,
  runGoldCertification,
  generateCertificationReport,
  generateProofPack,
  createSilentWriter,
} from '../../src/index.js';
import type { PackageInfo, PackageTestResult, GoldRunResult } from '../../src/index.js';

describe('discoverPackages', () => {
  it('should discover OMEGA packages', () => {
    const packages = discoverPackages('/test/path');
    expect(packages.length).toBeGreaterThan(0);
  });

  it('should return package info with required fields', () => {
    const packages = discoverPackages('/test/path');
    const pkg = packages[0];
    expect(pkg.name).toBeDefined();
    expect(pkg.version).toBeDefined();
    expect(pkg.path).toBeDefined();
    expect(pkg.testCommand).toBeDefined();
  });

  it('should include orchestrator-core', () => {
    const packages = discoverPackages('/test/path');
    const names = packages.map((p) => p.name);
    expect(names).toContain('@omega/orchestrator-core');
  });
});

describe('runPackageTests', () => {
  it('should return test result', async () => {
    const pkg: PackageInfo = {
      name: '@omega/test-pkg',
      version: '1.0.0',
      path: '/test/path',
      testCommand: 'npm test',
    };
    const output = createSilentWriter();

    const result = await runPackageTests(pkg, output);

    expect(result.package).toBe(pkg);
    expect(result.passed).toBeGreaterThan(0);
    expect(typeof result.failed).toBe('number');
    expect(typeof result.duration).toBe('number');
    expect(result.output).toBeDefined();
  });
});

describe('runAllTests', () => {
  it('should run tests for all packages', async () => {
    const packages: PackageInfo[] = [
      { name: 'pkg1', version: '1.0.0', path: '/path/1', testCommand: 'npm test' },
      { name: 'pkg2', version: '1.0.0', path: '/path/2', testCommand: 'npm test' },
    ];
    const output = createSilentWriter();

    const results = await runAllTests(packages, output, false);

    expect(results.length).toBe(2);
    expect(results[0].package.name).toBe('pkg1');
    expect(results[1].package.name).toBe('pkg2');
  });
});

describe('runIntegrations', () => {
  it('should return cross-package validation', async () => {
    const output = createSilentWriter();

    const validation = await runIntegrations(output, false);

    expect(validation.integrations.length).toBeGreaterThan(0);
    expect(typeof validation.valid).toBe('boolean');
    expect(validation.timestamp).toBeDefined();
  });

  it('should run all 9 integrations', async () => {
    const output = createSilentWriter();

    const validation = await runIntegrations(output, false);

    expect(validation.integrations.length).toBe(9);
  });
});

describe('createPackageCertifications', () => {
  it('should create certifications from test results', () => {
    const results: PackageTestResult[] = [
      {
        package: { name: 'pkg1', version: '1.0.0', path: '/p', testCommand: 'npm test' },
        passed: 50,
        failed: 0,
        skipped: 0,
        duration: 100,
        output: 'ok',
      },
      {
        package: { name: 'pkg2', version: '2.0.0', path: '/p', testCommand: 'npm test' },
        passed: 30,
        failed: 2,
        skipped: 1,
        duration: 200,
        output: 'fail',
      },
    ];

    const certs = createPackageCertifications(results);

    expect(certs.length).toBe(2);
    expect(certs[0].name).toBe('pkg1');
    expect(certs[0].tests).toBe(50);
    expect(certs[0].valid).toBe(true);
    expect(certs[1].name).toBe('pkg2');
    expect(certs[1].tests).toBe(33);
    expect(certs[1].valid).toBe(false);
  });
});

describe('runGoldCertification', () => {
  it('should return gold run result', async () => {
    const output = createSilentWriter();

    const result = await runGoldCertification('1.0.0', '/test', output, false);

    expect(result.version).toBe('1.0.0');
    expect(result.timestamp).toBeDefined();
    expect(result.packages.length).toBeGreaterThan(0);
    expect(typeof result.totalTests).toBe('number');
    expect(typeof result.totalPassed).toBe('number');
    expect(typeof result.totalFailed).toBe('number');
    expect(typeof result.totalDuration).toBe('number');
    expect(typeof result.success).toBe('boolean');
  });

  it('should succeed when no failures', async () => {
    const output = createSilentWriter();

    const result = await runGoldCertification('1.0.0', '/test', output, false);

    // Our mock always passes
    expect(result.totalFailed).toBe(0);
    expect(result.success).toBe(true);
  });
});

describe('generateCertificationReport', () => {
  it('should generate JSON report', async () => {
    const output = createSilentWriter();
    const runResult: GoldRunResult = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      packages: [],
      totalTests: 100,
      totalPassed: 100,
      totalFailed: 0,
      totalDuration: 1000,
      success: true,
    };

    const report = await generateCertificationReport(runResult, 'json', output, false);

    expect(() => JSON.parse(report)).not.toThrow();
  });

  it('should generate markdown report', async () => {
    const output = createSilentWriter();
    const runResult: GoldRunResult = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      packages: [],
      totalTests: 100,
      totalPassed: 100,
      totalFailed: 0,
      totalDuration: 1000,
      success: true,
    };

    const report = await generateCertificationReport(runResult, 'markdown', output, false);

    expect(report).toContain('# ');
    expect(report).toContain('OMEGA');
  });

  it('should generate text report', async () => {
    const output = createSilentWriter();
    const runResult: GoldRunResult = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      packages: [],
      totalTests: 100,
      totalPassed: 100,
      totalFailed: 0,
      totalDuration: 1000,
      success: true,
    };

    const report = await generateCertificationReport(runResult, 'text', output, false);

    expect(report).toContain('OMEGA');
    expect(report).toContain('Certification');
  });
});

describe('generateProofPack', () => {
  it('should generate proof pack', () => {
    const runResult: GoldRunResult = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      packages: [
        {
          package: { name: '@omega/core', version: '1.0.0', path: '/p', testCommand: 'npm test' },
          passed: 50,
          failed: 0,
          skipped: 0,
          duration: 100,
          output: '50 tests passed',
        },
      ],
      totalTests: 50,
      totalPassed: 50,
      totalFailed: 0,
      totalDuration: 100,
      success: true,
    };

    const pack = generateProofPack(runResult, 'Report content', '1.0.0');

    expect(pack.manifest).toBeDefined();
    expect(pack.content).toBeDefined();
    expect(Object.keys(pack.content).length).toBeGreaterThan(0);
  });

  it('should include test logs in proof pack', () => {
    const runResult: GoldRunResult = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      packages: [
        {
          package: { name: '@omega/core', version: '1.0.0', path: '/p', testCommand: 'npm test' },
          passed: 50,
          failed: 0,
          skipped: 0,
          duration: 100,
          output: '50 tests passed',
        },
      ],
      totalTests: 50,
      totalPassed: 50,
      totalFailed: 0,
      totalDuration: 100,
      success: true,
    };

    const pack = generateProofPack(runResult, 'Report', '1.0.0');

    const paths = Object.keys(pack.content);
    expect(paths.some((p) => p.includes('tests/'))).toBe(true);
  });

  it('should include certificate in proof pack', () => {
    const runResult: GoldRunResult = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      packages: [],
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
      success: true,
    };

    const pack = generateProofPack(runResult, 'Report content', '1.0.0');

    const paths = Object.keys(pack.content);
    expect(paths).toContain('GOLD_REPORT.md');
  });
});
