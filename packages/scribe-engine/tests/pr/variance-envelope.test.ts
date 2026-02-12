/**
 * OMEGA — VARIANCE ENVELOPE TESTS
 * Phase: PR-4 | Invariant: INV-ENTROPY-01
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeStats,
  computePassRate,
  loadVarianceEnvelope,
  analyzeVariance,
  type VarianceEnvelopeConfig,
  type RunStats,
} from '../../src/pr/variance-envelope.js';

const TEST_DIR = join(process.cwd(), '.test-variance-pr4');
const TEST_CALIBRATION = join(TEST_DIR, 'calibration.json');

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('Variance Envelope — Statistics', () => {
  it('computes mean', () => {
    const result = computeStats([1, 2, 3, 4, 5]);
    expect(result.mean).toBe(3);
  });

  it('computes standard deviation', () => {
    const result = computeStats([1, 2, 3, 4, 5]);
    expect(result.std).toBeCloseTo(Math.sqrt(2), 5);
  });

  it('handles single value', () => {
    const result = computeStats([42]);
    expect(result.mean).toBe(42);
    expect(result.std).toBe(0);
  });

  it('handles empty array', () => {
    const result = computeStats([]);
    expect(result.mean).toBe(0);
    expect(result.std).toBe(0);
  });

  it('is deterministic', () => {
    const values = [1.5, 2.7, 3.1, 4.9, 5.2];
    const result1 = computeStats(values);
    const result2 = computeStats(values);

    expect(result1.mean).toBe(result2.mean);
    expect(result1.std).toBe(result2.std);
  });
});

describe('Variance Envelope — Pass Rate', () => {
  it('computes pass rate correctly', () => {
    const values = [0.5, 0.7, 0.8, 0.9, 1.0];
    const rate = computePassRate(values, 0.75);

    expect(rate).toBe(0.6); // 3 out of 5
  });

  it('handles all passing', () => {
    const values = [0.8, 0.9, 1.0];
    const rate = computePassRate(values, 0.75);

    expect(rate).toBe(1.0);
  });

  it('handles all failing', () => {
    const values = [0.1, 0.2, 0.3];
    const rate = computePassRate(values, 0.75);

    expect(rate).toBe(0.0);
  });

  it('handles empty array', () => {
    const rate = computePassRate([], 0.75);
    expect(rate).toBe(0);
  });
});

describe('Variance Envelope — Config Loading (GAP-4A)', () => {
  it('loads envelope from calibration.json', () => {
    const calibration = {
      VARIANCE_ENVELOPES: {
        hard_pass_rate: { min: 0.70, target: 0.80, max: 1.0 },
        soft_pass_rate: { min: 0.80, target: 0.90, max: 1.0 },
        mean_hard_score: { min: 0.65, target: 0.75, max: 0.90 },
        std_hard_score: { min: 0.0, target: 0.03, max: 0.10 },
        mean_soft_score: { min: 0.70, target: 0.80, max: 0.95 },
        std_soft_score: { min: 0.0, target: 0.02, max: 0.08 },
      },
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(calibration));

    const envelope = loadVarianceEnvelope(TEST_CALIBRATION);

    expect(envelope.hard_pass_rate.min).toBe(0.70);
    expect(envelope.soft_pass_rate.target).toBe(0.90);
  });

  it('uses defaults if calibration not found', () => {
    const envelope = loadVarianceEnvelope('/nonexistent/calibration.json');

    expect(envelope.hard_pass_rate.min).toBe(0.75);
    expect(envelope.soft_pass_rate.min).toBe(0.85);
  });

  it('uses defaults if VARIANCE_ENVELOPES missing', () => {
    const calibration = { OTHER_FIELD: 'value' };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(calibration));

    const envelope = loadVarianceEnvelope(TEST_CALIBRATION);

    expect(envelope.hard_pass_rate.min).toBe(0.75);
  });
});

describe('Variance Envelope — Analysis', () => {
  it('passes when all metrics in bounds', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.85,
      soft_pass_rate: 0.95,
      mean_hard_score: 0.80,
      std_hard_score: 0.05,
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    expect(report.verdict).toBe('PASS');
    expect(report.violations.filter((v) => v.severity === 'out_of_bounds')).toHaveLength(0);
  });

  it('fails when metric out of bounds', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.60, // Below min 0.75
      soft_pass_rate: 0.95,
      mean_hard_score: 0.80,
      std_hard_score: 0.05,
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    expect(report.verdict).toBe('FAIL');
    expect(report.violations.find((v) => v.metric === 'hard_pass_rate')).toBeDefined();
  });

  it('detects below target violations', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.77, // Above min but below target 0.85
      soft_pass_rate: 0.95,
      mean_hard_score: 0.80,
      std_hard_score: 0.05,
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    const violation = report.violations.find((v) => v.metric === 'hard_pass_rate');
    expect(violation?.severity).toBe('below_target');
  });

  it('sets downgrade flag when variance out but hard_pass OK (GAP-4B)', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.85, // OK
      soft_pass_rate: 0.95,
      mean_hard_score: 0.80,
      std_hard_score: 0.20, // Out of bounds (max 0.15)
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    expect(report.verdict).toBe('FAIL');
    expect(report.downgrade_flag).toBe('DOWNGRADE_VARIANCE');
  });

  it('no downgrade flag when hard_pass also fails', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.60, // Below min
      soft_pass_rate: 0.95,
      mean_hard_score: 0.80,
      std_hard_score: 0.20, // Out of bounds
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    expect(report.verdict).toBe('FAIL');
    expect(report.downgrade_flag).toBeUndefined();
  });
});

describe('Variance Envelope — Multiple Violations', () => {
  it('reports all violations', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.60, // Out
      soft_pass_rate: 0.80, // Out (min 0.85)
      mean_hard_score: 0.80,
      std_hard_score: 0.05,
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    expect(report.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('distinguishes out_of_bounds from below_target', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.77, // Below target
      soft_pass_rate: 0.80, // Out of bounds
      mean_hard_score: 0.80,
      std_hard_score: 0.05,
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    const hardViolation = report.violations.find((v) => v.metric === 'hard_pass_rate');
    const softViolation = report.violations.find((v) => v.metric === 'soft_pass_rate');

    expect(hardViolation?.severity).toBe('below_target');
    expect(softViolation?.severity).toBe('out_of_bounds');
  });
});

describe('Variance Envelope — Edge Cases', () => {
  it('handles perfect scores', () => {
    const stats: RunStats = {
      hard_pass_rate: 1.0,
      soft_pass_rate: 1.0,
      mean_hard_score: 0.95,
      std_hard_score: 0.0,
      mean_soft_score: 0.98,
      std_soft_score: 0.0,
    };

    const report = analyzeVariance(stats);

    expect(report.verdict).toBe('PASS');
  });

  it('handles all zeros', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.0,
      soft_pass_rate: 0.0,
      mean_hard_score: 0.0,
      std_hard_score: 0.0,
      mean_soft_score: 0.0,
      std_soft_score: 0.0,
    };

    const report = analyzeVariance(stats);

    expect(report.verdict).toBe('FAIL');
    expect(report.violations.length).toBeGreaterThan(0);
  });
});

describe('Variance Envelope — Report Structure', () => {
  it('includes timestamp', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.85,
      soft_pass_rate: 0.95,
      mean_hard_score: 0.80,
      std_hard_score: 0.05,
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    expect(report.timestamp).toBeDefined();
    expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('includes total_runs field', () => {
    const stats: RunStats = {
      hard_pass_rate: 0.85,
      soft_pass_rate: 0.95,
      mean_hard_score: 0.80,
      std_hard_score: 0.05,
      mean_soft_score: 0.85,
      std_soft_score: 0.04,
    };

    const report = analyzeVariance(stats);

    expect(report.total_runs).toBeDefined();
  });
});
