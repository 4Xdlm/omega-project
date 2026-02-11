/**
 * OMEGA Metrics — Hasher Tests
 */

import { describe, it, expect } from 'vitest';
import { hashArtifacts, hashReport, hashGenesisPlan } from '../src/hasher.js';
import { discoverRunId } from '../src/reader.js';
import { join } from 'node:path';

const GOLDEN_RUN_001 = join(process.cwd(), '../..', 'golden/h2/run_001');
const GOLDEN_RUN_001_REPLAY = join(process.cwd(), '../..', 'golden/h2/run_001_replay');

describe('Hasher', () => {
  describe('hashArtifacts', () => {
    it('should compute deterministic hash for golden run', () => {
      const runId = discoverRunId(GOLDEN_RUN_001);
      const hash1 = hashArtifacts(GOLDEN_RUN_001, runId);
      const hash2 = hashArtifacts(GOLDEN_RUN_001, runId);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce identical hash for replay (cache mode)', () => {
      const runId1 = discoverRunId(GOLDEN_RUN_001);
      const runId2 = discoverRunId(GOLDEN_RUN_001_REPLAY);

      const hash1 = hashArtifacts(GOLDEN_RUN_001, runId1);
      const hash2 = hashArtifacts(GOLDEN_RUN_001_REPLAY, runId2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('hashGenesisPlan', () => {
    it('should compute plan hash', () => {
      const runId = discoverRunId(GOLDEN_RUN_001);
      const hash = hashGenesisPlan(GOLDEN_RUN_001, runId);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic', () => {
      const runId = discoverRunId(GOLDEN_RUN_001);
      const hash1 = hashGenesisPlan(GOLDEN_RUN_001, runId);
      const hash2 = hashGenesisPlan(GOLDEN_RUN_001, runId);

      expect(hash1).toBe(hash2);
    });

    it('should match between run and replay', () => {
      const runId1 = discoverRunId(GOLDEN_RUN_001);
      const runId2 = discoverRunId(GOLDEN_RUN_001_REPLAY);

      const hash1 = hashGenesisPlan(GOLDEN_RUN_001, runId1);
      const hash2 = hashGenesisPlan(GOLDEN_RUN_001_REPLAY, runId2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('hashReport', () => {
    it('should compute hash excluding report_hash field', () => {
      const report = {
        report_version: '1.0.0',
        run_id: 'test',
        score: { global: 0.9 },
        report_hash: 'old-hash-to-be-excluded',
      };

      const hash = hashReport(report);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).not.toBe('old-hash-to-be-excluded');
    });

    it('should be deterministic for same report', () => {
      const report = {
        report_version: '1.0.0',
        run_id: 'test',
        score: { global: 0.9 },
      };

      const hash1 = hashReport(report);
      const hash2 = hashReport(report);

      expect(hash1).toBe(hash2);
    });
  });
});
