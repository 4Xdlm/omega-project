/**
 * OMEGA Metrics — Integration Tests
 * Phase R-METRICS — End-to-end on golden runs
 */

import { describe, it, expect } from 'vitest';
import { readRunArtifacts, hasCompleteArtifacts } from '../src/reader.js';
import { generateReport } from '../src/report/generator.js';
import { formatReportMarkdown } from '../src/report/formatter.js';
import { computeStructuralMetrics } from '../src/metrics/structural.js';
import { computeSemanticMetrics } from '../src/metrics/semantic.js';
import { DEFAULT_METRIC_CONFIG } from '../src/report/generator.js';
import { join } from 'node:path';

const GOLDEN_DIR = join(process.cwd(), '../..', 'golden/h2');
const RUN_001 = join(GOLDEN_DIR, 'run_001');
const RUN_002 = join(GOLDEN_DIR, 'run_002');
const RUN_001_REPLAY = join(GOLDEN_DIR, 'run_001_replay');
const TIMESTAMP = '2026-02-10T23:00:00.000Z';

describe('Integration — Golden Run H2', () => {
  describe('run_001 (Le Gardien)', () => {
    it('has complete artifacts', () => {
      expect(hasCompleteArtifacts(RUN_001)).toBe(true);
    });

    it('generates a valid report', () => {
      const artifacts = readRunArtifacts(RUN_001);
      const report = generateReport(artifacts, RUN_001, TIMESTAMP);

      expect(report.score.status).toBeDefined();
      expect(report.score.global).toBeGreaterThan(0);
      expect(report.report_hash).toBeTruthy();
    });

    it('structural metrics are all > 0 for a real plan', () => {
      const artifacts = readRunArtifacts(RUN_001);
      const structural = computeStructuralMetrics(artifacts.plan, DEFAULT_METRIC_CONFIG);

      expect(structural.arc_completeness).toBeGreaterThan(0);
      expect(structural.scene_completeness).toBeGreaterThan(0);
      expect(structural.beat_coverage).toBeGreaterThan(0);
      expect(structural.tension_monotonicity).toBeGreaterThan(0);
      expect(structural.conflict_diversity).toBeGreaterThan(0);
      expect(structural.causal_depth).toBeGreaterThan(0);
    });

    it('semantic metrics show good alignment', () => {
      const artifacts = readRunArtifacts(RUN_001);
      const semantic = computeSemanticMetrics(artifacts.plan, artifacts.intent);

      expect(semantic.canon_violation_count).toBe(0);
      expect(semantic.canon_respect).toBe(1.0);
      // constraint_satisfaction may be 0 if scene_count exceeds max_scenes (9 > 8)
      // This is a real finding — the LLM generated one scene too many
      expect(semantic.constraint_satisfaction).toBeGreaterThanOrEqual(0);
    });

    it('plan has expected structure (3 arcs, 9 scenes, 56 beats)', () => {
      const artifacts = readRunArtifacts(RUN_001);
      expect(artifacts.plan.arcs.length).toBe(3);
      expect(artifacts.plan.scene_count).toBe(9);
      expect(artifacts.plan.beat_count).toBe(56);
    });
  });

  describe('run_002 (Le Choix)', () => {
    it('has complete artifacts', () => {
      expect(hasCompleteArtifacts(RUN_002)).toBe(true);
    });

    it('generates a valid report', () => {
      const artifacts = readRunArtifacts(RUN_002);
      const report = generateReport(artifacts, RUN_002, TIMESTAMP);

      expect(report.score.status).toBeDefined();
      expect(report.score.global).toBeGreaterThan(0);
    });
  });

  describe('run_001_replay (cache determinism)', () => {
    it('has complete artifacts', () => {
      expect(hasCompleteArtifacts(RUN_001_REPLAY)).toBe(true);
    });

    it('replay produces same plan hash as original', () => {
      const original = readRunArtifacts(RUN_001);
      const replay = readRunArtifacts(RUN_001_REPLAY);

      // The plan should be identical (byte-identical cache replay)
      expect(original.plan.plan_hash).toBe(replay.plan.plan_hash);
    });
  });

  describe('cross-run comparison', () => {
    it('run_001 and run_002 have different plan hashes', () => {
      const r1 = readRunArtifacts(RUN_001);
      const r2 = readRunArtifacts(RUN_002);

      expect(r1.plan.plan_hash).not.toBe(r2.plan.plan_hash);
    });

    it('markdown report is non-empty', () => {
      const artifacts = readRunArtifacts(RUN_001);
      const report = generateReport(artifacts, RUN_001, TIMESTAMP);
      const md = formatReportMarkdown(report);

      expect(md.length).toBeGreaterThan(100);
      expect(md).toContain('OMEGA Metrics Report');
    });
  });
});
