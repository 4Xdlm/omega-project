import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readProofPack } from '../src/core/reader.js';
import { collectFileStats } from '../src/core/reader.js';
import { DEFAULT_GOV_CONFIG } from '../src/core/config.js';
import { compareRuns } from '../src/compare/run-differ.js';
import { detectDrift } from '../src/drift/detector.js';
import { certifyRun } from '../src/certify/certifier.js';
import {
  checkReadOnly,
  checkHashTrust,
  checkCompareSymmetric,
  checkDriftExplicit,
  checkBenchDeterministic,
  checkCertStable,
  checkLogAppendOnly,
  checkReportDerived,
  checkAvailableInvariants,
} from '../src/invariants/index.js';
import { createTempDir, createFixtureRun } from './fixtures/helpers.js';

describe('Governance Invariants', () => {
  let tempDir: string;
  let runDirA: string;
  let runDirB: string;

  beforeAll(() => {
    tempDir = createTempDir('invariants');
    runDirA = createFixtureRun(tempDir, { runId: 'invA0000000001', forgeScore: 0.85 });
    runDirB = createFixtureRun(tempDir, { runId: 'invB0000000001', forgeScore: 0.70 });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('INV-GOV-01: READ_ONLY', () => {
    it('PASS when no files modified', () => {
      const before = collectFileStats(runDirA);
      const after = collectFileStats(runDirA);
      const result = checkReadOnly(before, after);
      expect(result.id).toBe('INV-GOV-01');
      expect(result.status).toBe('PASS');
    });

    it('FAIL when file modified', () => {
      const before = new Map([['test.txt', { mtime: 100, size: 50 }]]);
      const after = new Map([['test.txt', { mtime: 200, size: 50 }]]);
      const result = checkReadOnly(before, after);
      expect(result.status).toBe('FAIL');
    });

    it('FAIL when file deleted', () => {
      const before = new Map([['test.txt', { mtime: 100, size: 50 }]]);
      const after = new Map<string, { mtime: number; size: number }>();
      const result = checkReadOnly(before, after);
      expect(result.status).toBe('FAIL');
    });

    it('FAIL when file created', () => {
      const before = new Map<string, { mtime: number; size: number }>();
      const after = new Map([['test.txt', { mtime: 100, size: 50 }]]);
      const result = checkReadOnly(before, after);
      expect(result.status).toBe('FAIL');
    });
  });

  describe('INV-GOV-02: HASH_TRUST', () => {
    it('PASS when both hashes valid', () => {
      const result = checkHashTrust(true, true);
      expect(result.status).toBe('PASS');
    });

    it('FAIL when manifest hash invalid', () => {
      const result = checkHashTrust(false, true);
      expect(result.status).toBe('FAIL');
    });

    it('FAIL when merkle root invalid', () => {
      const result = checkHashTrust(true, false);
      expect(result.status).toBe('FAIL');
    });
  });

  describe('INV-GOV-03: COMPARE_SYMMETRIC', () => {
    it('PASS for symmetric comparison', () => {
      const a = readProofPack(runDirA);
      const b = readProofPack(runDirB);
      const ab = compareRuns(a, b);
      const ba = compareRuns(b, a);
      const result = checkCompareSymmetric(ab, ba);
      expect(result.status).toBe('PASS');
    });
  });

  describe('INV-GOV-04: DRIFT_EXPLICIT', () => {
    it('PASS when all drifts have rules', () => {
      const a = readProofPack(runDirA);
      const b = readProofPack(runDirB);
      const report = detectDrift(a, b, DEFAULT_GOV_CONFIG);
      const result = checkDriftExplicit(report);
      expect(result.status).toBe('PASS');
    });
  });

  describe('INV-GOV-05: BENCH_DETERMINISTIC', () => {
    it('PASS when hashes match', () => {
      const result = checkBenchDeterministic('abc123', 'abc123');
      expect(result.status).toBe('PASS');
    });

    it('FAIL when hashes differ', () => {
      const result = checkBenchDeterministic('abc123', 'def456');
      expect(result.status).toBe('FAIL');
    });
  });

  describe('INV-GOV-06: CERT_STABLE', () => {
    it('PASS when signatures match', () => {
      const a = readProofPack(runDirA);
      const cert1 = certifyRun(a, DEFAULT_GOV_CONFIG);
      const cert2 = certifyRun(a, DEFAULT_GOV_CONFIG);
      const result = checkCertStable(cert1.signature, cert2.signature);
      expect(result.status).toBe('PASS');
    });
  });

  describe('INV-GOV-07: LOG_APPEND_ONLY', () => {
    it('PASS when line count increases', () => {
      const result = checkLogAppendOnly(5, 8);
      expect(result.status).toBe('PASS');
    });

    it('PASS when line count unchanged', () => {
      const result = checkLogAppendOnly(5, 5);
      expect(result.status).toBe('PASS');
    });

    it('FAIL when line count decreases', () => {
      const result = checkLogAppendOnly(5, 3);
      expect(result.status).toBe('FAIL');
    });
  });

  describe('INV-GOV-08: REPORT_DERIVED', () => {
    it('PASS when score matches ProofPack', () => {
      const data = readProofPack(runDirA);
      const result = checkReportDerived(data, 0.85);
      expect(result.status).toBe('PASS');
    });

    it('FAIL when score differs from ProofPack', () => {
      const data = readProofPack(runDirA);
      const result = checkReportDerived(data, 0.99);
      expect(result.status).toBe('FAIL');
    });
  });

  describe('checkAvailableInvariants', () => {
    it('runs only invariants with provided data', () => {
      const results = checkAvailableInvariants({
        manifestHashValid: true,
        merkleRootValid: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('INV-GOV-02');
    });
  });
});
