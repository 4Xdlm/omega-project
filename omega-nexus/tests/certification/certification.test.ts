/**
 * OMEGA NEXUS - Certification Engine Tests
 * 
 * Phase 24
 * 
 * Tests for the certification engine.
 */

import { describe, it, expect } from 'vitest';
import {
  OmegaModule,
  TestStatus,
  CertificationLevel,
  CertificationStatus,
  ProofStatus,
  semanticVersion,
  commitHash,
  OMEGA_VERSION,
} from '../../src/core/types.js';
import { INVARIANT_REGISTRY, getRegistryStats } from '../../src/core/registry.js';
import {
  CertificationEngine,
  createCertificationEngine,
  certifyModule,
  generateCertificationText,
  generateCertificationJSON,
  ModuleTestData,
} from '../../src/certification/engine.js';

describe('Certification Engine', () => {
  // Helper to create test data
  const createTestData = (
    module: OmegaModule,
    passCount: number,
    failCount: number = 0,
    coverage: number = 95
  ): ModuleTestData => ({
    module,
    version: OMEGA_VERSION,
    testResults: [
      ...Array.from({ length: passCount }, (_, i) => ({
        name: `${module}_test_${i + 1}`,
        status: TestStatus.PASS,
        duration: Math.random() * 100,
      })),
      ...Array.from({ length: failCount }, (_, i) => ({
        name: `${module}_fail_${i + 1}`,
        status: TestStatus.FAIL,
        duration: Math.random() * 100,
        error: 'Test failed',
      })),
    ],
    coverage,
  });

  describe('CertificationEngine', () => {
    it('should create engine with config', () => {
      const engine = createCertificationEngine('3.24.0', 'abc1234', 'v3.24.0');
      expect(engine).toBeInstanceOf(CertificationEngine);
    });

    it('should add module data', () => {
      const engine = createCertificationEngine();
      const data = createTestData(OmegaModule.CHAOS, 72);
      
      engine.addModuleData(data);
      const report = engine.generateReport();
      
      expect(report.modules.length).toBe(1);
      expect(report.modules[0].module).toBe(OmegaModule.CHAOS);
    });

    it('should add multiple module data', () => {
      const engine = createCertificationEngine();
      const chaos = createTestData(OmegaModule.CHAOS, 72);
      const adversarial = createTestData(OmegaModule.ADVERSARIAL, 42);
      
      engine.addAllModuleData([chaos, adversarial]);
      const report = engine.generateReport();
      
      expect(report.modules.length).toBe(2);
    });
  });

  describe('generateReport', () => {
    it('should generate complete report', () => {
      const engine = createCertificationEngine('3.24.0', 'abc1234', 'v3.24.0-NEXUS');
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.ADVERSARIAL, 42, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.TEMPORAL, 70, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.STRESS, 51, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.CRYSTAL, 38, 0, 95));
      
      const report = engine.generateReport();
      
      expect(report.id).toBeDefined();
      expect(report.version).toBe('3.24.0');
      expect(report.gitTag).toBe('v3.24.0-NEXUS');
      expect(report.modules.length).toBe(5);
      expect(report.testReport).toBeDefined();
      expect(report.merkleRoot).toBeDefined();
      expect(report.invariants).toBeDefined();
    });

    it('should calculate test report', () => {
      const engine = createCertificationEngine();
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 70, 2));
      
      const report = engine.generateReport();
      
      expect(report.testReport.totalTests).toBe(72);
      expect(report.testReport.totalPassed).toBe(70);
      expect(report.testReport.totalFailed).toBe(2);
      expect(report.testReport.allPassed).toBe(false);
    });

    it('should set allPassed to true when no failures', () => {
      const engine = createCertificationEngine();
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72, 0));
      
      const report = engine.generateReport();
      
      expect(report.testReport.allPassed).toBe(true);
    });

    it('should generate Merkle root', () => {
      const engine = createCertificationEngine();
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72));
      
      const report = engine.generateReport();
      
      expect(report.merkleRoot).toBeDefined();
      expect(report.merkleRoot.length).toBe(64);
    });

    it('should produce unique report IDs', () => {
      const engine1 = createCertificationEngine('3.24.0', 'abc1234');
      engine1.addModuleData(createTestData(OmegaModule.CHAOS, 72));
      
      const engine2 = createCertificationEngine('3.24.0', 'def5678');
      engine2.addModuleData(createTestData(OmegaModule.CHAOS, 72));
      
      const report1 = engine1.generateReport();
      const report2 = engine2.generateReport();
      
      expect(report1.id).not.toBe(report2.id);
    });
  });

  describe('Certification Levels', () => {
    it('should achieve PLATINUM with 100% tests and 95%+ coverage', () => {
      const engine = createCertificationEngine();
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72, 0, 96));
      
      const report = engine.generateReport();
      const chaosModule = report.modules.find(m => m.module === OmegaModule.CHAOS)!;
      
      expect(chaosModule.level).toBe(CertificationLevel.PLATINUM);
    });

    it('should achieve GOLD with 100% tests and 90%+ coverage', () => {
      const engine = createCertificationEngine();
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72, 0, 91));
      
      const report = engine.generateReport();
      const chaosModule = report.modules.find(m => m.module === OmegaModule.CHAOS)!;
      
      expect([CertificationLevel.GOLD, CertificationLevel.PLATINUM]).toContain(chaosModule.level);
    });

    it('should fail certification with test failures', () => {
      const engine = createCertificationEngine();
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 70, 2));
      
      const report = engine.generateReport();
      
      expect(report.status).toBe(CertificationStatus.FAILED);
    });
  });

  describe('certifyModule', () => {
    it('should certify a single module', () => {
      const cert = certifyModule(
        OmegaModule.CHAOS,
        Array.from({ length: 72 }, (_, i) => ({
          name: `test_${i}`,
          status: TestStatus.PASS,
          duration: 10,
        })),
        95
      );
      
      expect(cert.module).toBe(OmegaModule.CHAOS);
      expect(cert.testsPassed).toBe(72);
      expect(cert.testsTotal).toBe(72);
    });
  });

  describe('Report Generation', () => {
    it('should generate text report', () => {
      const engine = createCertificationEngine('3.24.0', 'abc1234', 'v3.24.0-NEXUS');
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72, 0, 95));
      
      const report = engine.generateReport();
      const text = generateCertificationText(report);
      
      expect(text).toContain('OMEGA NEXUS');
      expect(text).toContain('CERTIFICATION REPORT');
      expect(text).toContain('3.24.0');
      expect(text).toContain('CHAOS');
    });

    it('should generate JSON report', () => {
      const engine = createCertificationEngine();
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72));
      
      const report = engine.generateReport();
      const json = generateCertificationJSON(report);
      const parsed = JSON.parse(json);
      
      expect(parsed.id).toBeDefined();
      expect(parsed.modules).toBeInstanceOf(Array);
      expect(parsed.testSummary).toBeDefined();
      expect(parsed.invariantSummary).toBeDefined();
    });
  });

  describe('Full Phase 23 Certification', () => {
    it('should certify all Phase 23 modules', () => {
      const engine = createCertificationEngine('3.23.0', '5372878', 'v3.23.0-RESILIENCE');
      
      // Add all Phase 23 modules with actual test counts
      engine.addModuleData(createTestData(OmegaModule.CHAOS, 72, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.ADVERSARIAL, 42, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.TEMPORAL, 70, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.STRESS, 51, 0, 95));
      engine.addModuleData(createTestData(OmegaModule.CRYSTAL, 38, 0, 95));
      
      const report = engine.generateReport();
      
      // Verify totals
      expect(report.testReport.totalTests).toBe(273);
      expect(report.testReport.totalPassed).toBe(273);
      expect(report.testReport.allPassed).toBe(true);
      
      // All modules should be certified
      for (const m of report.modules) {
        expect(m.status).toBe(CertificationStatus.CERTIFIED);
      }
    });

    it('should generate reproducible certification', () => {
      const createPhase23Report = () => {
        const engine = createCertificationEngine('3.23.0', '5372878', 'v3.23.0-RESILIENCE');
        engine.addModuleData(createTestData(OmegaModule.CHAOS, 72, 0, 95));
        return engine.generateReport();
      };
      
      const report1 = createPhase23Report();
      const report2 = createPhase23Report();
      
      // Same modules and test counts
      expect(report1.modules.length).toBe(report2.modules.length);
      expect(report1.testReport.totalTests).toBe(report2.testReport.totalTests);
    });
  });
});

describe('INV-NEXUS-02: Certification Consistency', () => {
  it('should reflect actual test state', () => {
    const engine = createCertificationEngine();
    
    // Module with failures
    engine.addModuleData({
      module: OmegaModule.CHAOS,
      version: OMEGA_VERSION,
      testResults: [
        { name: 'test1', status: TestStatus.PASS, duration: 10 },
        { name: 'test2', status: TestStatus.FAIL, duration: 10, error: 'Failed' },
      ],
      coverage: 50,
    });
    
    const report = engine.generateReport();
    const chaosModule = report.modules[0];
    
    // Certification must reflect reality
    expect(chaosModule.testsPassed).toBe(1);
    expect(chaosModule.testsTotal).toBe(2);
    expect(chaosModule.status).not.toBe(CertificationStatus.CERTIFIED);
    expect(report.status).toBe(CertificationStatus.FAILED);
  });

  it('should NOT certify module with 0 tests (CRITICAL FIX)', () => {
    const engine = createCertificationEngine();
    
    // Module with 0 tests
    engine.addModuleData({
      module: OmegaModule.CHAOS,
      version: OMEGA_VERSION,
      testResults: [],
      coverage: 0,
    });
    
    const report = engine.generateReport();
    const chaosModule = report.modules[0];
    
    // 0 tests = NOT CERTIFIED (was a bug: 0===0 would pass)
    expect(chaosModule.testsTotal).toBe(0);
    expect(chaosModule.status).toBe(CertificationStatus.IN_PROGRESS);
    expect(chaosModule.status).not.toBe(CertificationStatus.CERTIFIED);
  });

  it('should produce reproducible report IDs (timestamp excluded)', () => {
    const createReport = () => {
      const engine = createCertificationEngine('3.24.0', 'abc1234', 'v3.24.0');
      engine.addModuleData({
        module: OmegaModule.CHAOS,
        version: OMEGA_VERSION,
        testResults: [
          { name: 'test1', status: TestStatus.PASS, duration: 10 },
        ],
        coverage: 95,
      });
      return engine.generateReport();
    };
    
    const report1 = createReport();
    const report2 = createReport();
    
    // Same inputs = same report ID (timestamp excluded from hash)
    expect(report1.id).toBe(report2.id);
  });
});
