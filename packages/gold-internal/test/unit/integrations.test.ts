/**
 * @fileoverview Tests for cross-package integrations.
 */

import { describe, it, expect } from 'vitest';
import {
  coreHardeningIntegration,
  corePerformanceIntegration,
  proofPackHardeningIntegration,
  proofPackCoreIntegration,
  contractsHardeningIntegration,
  contractsProofPackIntegration,
  performanceHardeningIntegration,
  performanceProofPackIntegration,
  sealProofPackIntegration,
  ALL_INTEGRATIONS,
  runIntegrationTest,
  runIntegrationTests,
} from '../../src/index.js';

describe('coreHardeningIntegration', () => {
  it('should have correct name', () => {
    expect(coreHardeningIntegration.name).toBe('Core + Hardening Hash Consistency');
  });

  it('should list required packages', () => {
    expect(coreHardeningIntegration.packages).toContain('@omega/orchestrator-core');
    expect(coreHardeningIntegration.packages).toContain('@omega/hardening');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(coreHardeningIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('corePerformanceIntegration', () => {
  it('should have correct name', () => {
    expect(corePerformanceIntegration.name).toBe('Core + Performance Determinism');
  });

  it('should list required packages', () => {
    expect(corePerformanceIntegration.packages).toContain('@omega/orchestrator-core');
    expect(corePerformanceIntegration.packages).toContain('@omega/performance');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(corePerformanceIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('proofPackHardeningIntegration', () => {
  it('should have correct name', () => {
    expect(proofPackHardeningIntegration.name).toBe('ProofPack + Hardening Verification');
  });

  it('should list required packages', () => {
    expect(proofPackHardeningIntegration.packages).toContain('@omega/proof-pack');
    expect(proofPackHardeningIntegration.packages).toContain('@omega/hardening');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(proofPackHardeningIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('proofPackCoreIntegration', () => {
  it('should have correct name', () => {
    expect(proofPackCoreIntegration.name).toBe('ProofPack + Core Stable JSON');
  });

  it('should list required packages', () => {
    expect(proofPackCoreIntegration.packages).toContain('@omega/proof-pack');
    expect(proofPackCoreIntegration.packages).toContain('@omega/orchestrator-core');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(proofPackCoreIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('contractsHardeningIntegration', () => {
  it('should have correct name', () => {
    expect(contractsHardeningIntegration.name).toBe('Contracts + Hardening Validation');
  });

  it('should list required packages', () => {
    expect(contractsHardeningIntegration.packages).toContain('@omega/contracts-canon');
    expect(contractsHardeningIntegration.packages).toContain('@omega/hardening');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(contractsHardeningIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('contractsProofPackIntegration', () => {
  it('should have correct name', () => {
    expect(contractsProofPackIntegration.name).toBe('Contracts + ProofPack Evidence');
  });

  it('should list required packages', () => {
    expect(contractsProofPackIntegration.packages).toContain('@omega/contracts-canon');
    expect(contractsProofPackIntegration.packages).toContain('@omega/proof-pack');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(contractsProofPackIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('performanceHardeningIntegration', () => {
  it('should have correct name', () => {
    expect(performanceHardeningIntegration.name).toBe('Performance + Hardening Memoization');
  });

  it('should list required packages', () => {
    expect(performanceHardeningIntegration.packages).toContain('@omega/performance');
    expect(performanceHardeningIntegration.packages).toContain('@omega/hardening');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(performanceHardeningIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('performanceProofPackIntegration', () => {
  it('should have correct name', () => {
    expect(performanceProofPackIntegration.name).toBe('Performance + ProofPack Lazy Building');
  });

  it('should list required packages', () => {
    expect(performanceProofPackIntegration.packages).toContain('@omega/performance');
    expect(performanceProofPackIntegration.packages).toContain('@omega/proof-pack');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(performanceProofPackIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('sealProofPackIntegration', () => {
  it('should have correct name', () => {
    expect(sealProofPackIntegration.name).toBe('Hardening Seal + ProofPack');
  });

  it('should list required packages', () => {
    expect(sealProofPackIntegration.packages).toContain('@omega/hardening');
    expect(sealProofPackIntegration.packages).toContain('@omega/proof-pack');
  });

  it('should pass integration test', async () => {
    const result = await runIntegrationTest(sealProofPackIntegration);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('ALL_INTEGRATIONS', () => {
  it('should contain all 9 integrations', () => {
    expect(ALL_INTEGRATIONS).toHaveLength(9);
  });

  it('should include all defined integrations', () => {
    const names = ALL_INTEGRATIONS.map((i) => i.name);
    expect(names).toContain('Core + Hardening Hash Consistency');
    expect(names).toContain('Core + Performance Determinism');
    expect(names).toContain('ProofPack + Hardening Verification');
    expect(names).toContain('ProofPack + Core Stable JSON');
    expect(names).toContain('Contracts + Hardening Validation');
    expect(names).toContain('Contracts + ProofPack Evidence');
    expect(names).toContain('Performance + Hardening Memoization');
    expect(names).toContain('Performance + ProofPack Lazy Building');
    expect(names).toContain('Hardening Seal + ProofPack');
  });

  it('should run all integrations successfully', async () => {
    const results = await runIntegrationTests([...ALL_INTEGRATIONS]);
    expect(results).toHaveLength(9);
    expect(results.every((r) => r.valid)).toBe(true);
  });
});
