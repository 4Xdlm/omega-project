/**
 * OMEGA Metrics — Reader Tests
 */

import { describe, it, expect } from 'vitest';
import { discoverRunId, readGenesisPlan, readIntentPack, readRunArtifacts, hasCompleteArtifacts } from '../src/reader.js';
import { join } from 'node:path';

const GOLDEN_RUN_001 = join(process.cwd(), '../..', 'golden/h2/run_001');

describe('Reader', () => {
  describe('discoverRunId', () => {
    it('should discover run_id from golden/h2/run_001', () => {
      const runId = discoverRunId(GOLDEN_RUN_001);
      expect(runId).toBeTruthy();
      expect(typeof runId).toBe('string');
      expect(runId.length).toBeGreaterThan(0);
    });

    it('should throw if runs directory does not exist', () => {
      expect(() => discoverRunId('/nonexistent/path')).toThrow('Runs directory not found');
    });
  });

  describe('readGenesisPlan', () => {
    it('should read genesis plan from golden run', () => {
      const runId = discoverRunId(GOLDEN_RUN_001);
      const plan = readGenesisPlan(GOLDEN_RUN_001, runId);

      expect(plan).toBeDefined();
      expect(plan.arcs).toBeDefined();
      expect(Array.isArray(plan.arcs)).toBe(true);
      expect(plan.arcs.length).toBeGreaterThan(0);
      expect(plan.scene_count).toBeGreaterThan(0);
      expect(plan.beat_count).toBeGreaterThan(0);
    });

    it('should throw if genesis plan does not exist', () => {
      expect(() => readGenesisPlan(GOLDEN_RUN_001, 'invalid-run-id')).toThrow('Genesis plan not found');
    });
  });

  describe('readIntentPack', () => {
    it('should read intent pack from golden run', () => {
      const runId = discoverRunId(GOLDEN_RUN_001);
      const intent = readIntentPack(GOLDEN_RUN_001, runId);

      expect(intent).toBeDefined();
      expect(intent.intent).toBeDefined();
      expect(intent.canon).toBeDefined();
      expect(intent.constraints).toBeDefined();
      expect(intent.emotion).toBeDefined();
      expect(intent.intent.title).toBeTruthy();
    });

    it('should throw if intent pack does not exist', () => {
      expect(() => readIntentPack(GOLDEN_RUN_001, 'invalid-run-id')).toThrow('Intent pack not found');
    });
  });

  describe('readRunArtifacts', () => {
    it('should read complete artifacts from golden run', () => {
      const artifacts = readRunArtifacts(GOLDEN_RUN_001);

      expect(artifacts).toBeDefined();
      expect(artifacts.run_id).toBeTruthy();
      expect(artifacts.intent).toBeDefined();
      expect(artifacts.plan).toBeDefined();
    });

    it('should return consistent run_id', () => {
      const artifacts1 = readRunArtifacts(GOLDEN_RUN_001);
      const artifacts2 = readRunArtifacts(GOLDEN_RUN_001);

      expect(artifacts1.run_id).toBe(artifacts2.run_id);
    });
  });

  describe('hasCompleteArtifacts', () => {
    it('should return true for golden run with complete artifacts', () => {
      const hasArtifacts = hasCompleteArtifacts(GOLDEN_RUN_001);
      expect(hasArtifacts).toBe(true);
    });

    it('should return false for nonexistent directory', () => {
      const hasArtifacts = hasCompleteArtifacts('/nonexistent/path');
      expect(hasArtifacts).toBe(false);
    });
  });
});
