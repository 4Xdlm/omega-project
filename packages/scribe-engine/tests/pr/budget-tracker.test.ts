/**
 * OMEGA — BUDGET TRACKER TESTS
 * Phase: PR-2 | Invariant: INV-BUDGET-01
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  BudgetTracker,
  loadCalibrationFromFile,
  estimateTokens,
  type BudgetCalibration,
} from '../../src/pr/budget-tracker.js';

const TEST_DIR = join(process.cwd(), '.test-budget-pr2');
const TEST_CALIBRATION = join(TEST_DIR, 'calibration.json');

const VALID_CALIBRATION: BudgetCalibration = {
  BUDGET_LIMITS: {
    'test-model': {
      input_cost_per_1k: 0.001,
      output_cost_per_1k: 0.002,
      max_per_call_usd: 0.10,
      max_per_run_usd: 1.00,
    },
  },
  LATENCY_LIMITS: {
    max_call_latency_ms: 60000,
    max_run_latency_ms: 300000,
    warn_call_latency_ms: 30000,
  },
};

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

describe('Budget Tracker — Basic Tracking', () => {
  it('tracks single call cost', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    tracker.recordCall('SCN-01', 'test-model', 1000, 500, 1000);

    const report = tracker.finalize();

    expect(report.total_calls).toBe(1);
    expect(report.total_cost_usd).toBeCloseTo(0.001 * 1 + 0.002 * 0.5, 5); // $0.002
    expect(report.total_latency_ms).toBe(1000);
    expect(report.budget_verdict).toBe('PASS');
  });

  it('tracks multiple calls', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    tracker.recordCall('SCN-01', 'test-model', 1000, 500, 1000);
    tracker.recordCall('SCN-02', 'test-model', 2000, 1000, 2000);

    const report = tracker.finalize();

    expect(report.total_calls).toBe(2);
    expect(report.total_latency_ms).toBe(3000);
  });

  it('detects per-call cost violation', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    // Exceed max_per_call_usd = 0.10
    tracker.recordCall('SCN-01', 'test-model', 100000, 50000, 1000);

    const report = tracker.finalize();

    expect(report.budget_verdict).toBe('FAIL');
    expect(report.violations.length).toBeGreaterThan(0);
    expect(report.violations[0].type).toBe('cost_per_call');
  });

  it('detects per-run cost violation', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    // Total cost > max_per_run_usd = 1.00
    // Each call costs (10k/1000)*0.001 + (10k/1000)*0.002 = 0.03 USD
    // Need 35 calls to exceed 1.00: 35 * 0.03 = 1.05 USD
    for (let i = 0; i < 35; i++) {
      tracker.recordCall(`SCN-${i}`, 'test-model', 10000, 10000, 1000);
    }

    const report = tracker.finalize();

    expect(report.budget_verdict).toBe('FAIL');
    const runViolation = report.violations.find((v) => v.type === 'cost_per_run');
    expect(runViolation).toBeDefined();
  });

  it('detects per-call latency violation', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    // Exceed max_call_latency_ms = 60000
    tracker.recordCall('SCN-01', 'test-model', 1000, 500, 70000);

    const report = tracker.finalize();

    expect(report.budget_verdict).toBe('FAIL');
    expect(report.violations.find((v) => v.type === 'latency_per_call')).toBeDefined();
  });

  it('detects per-run latency violation', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    // Total latency > max_run_latency_ms = 300000
    for (let i = 0; i < 10; i++) {
      tracker.recordCall(`SCN-${i}`, 'test-model', 1000, 500, 50000);
    }

    const report = tracker.finalize();

    expect(report.budget_verdict).toBe('FAIL');
    expect(report.violations.find((v) => v.type === 'latency_per_run')).toBeDefined();
  });
});

describe('Budget Tracker — Calibration Loading (GAP-2B)', () => {
  it('loads valid calibration from file', () => {
    writeFileSync(TEST_CALIBRATION, JSON.stringify(VALID_CALIBRATION));

    const calibration = loadCalibrationFromFile(TEST_CALIBRATION);

    expect(calibration.BUDGET_LIMITS['test-model']).toBeDefined();
    expect(calibration.LATENCY_LIMITS.max_call_latency_ms).toBe(60000);
  });

  it('throws if calibration file not found', () => {
    expect(() => {
      loadCalibrationFromFile('/nonexistent/calibration.json');
    }).toThrow(/not found/);
  });

  it('throws on null BUDGET_LIMITS (GAP-2A)', () => {
    const invalid = {
      BUDGET_LIMITS: null,
      LATENCY_LIMITS: VALID_CALIBRATION.LATENCY_LIMITS,
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(invalid));

    expect(() => {
      loadCalibrationFromFile(TEST_CALIBRATION);
    }).toThrow(/CALIBRATION_NULL.*BUDGET_LIMITS/);
  });

  it('throws on null LATENCY_LIMITS (GAP-2A)', () => {
    const invalid = {
      BUDGET_LIMITS: VALID_CALIBRATION.BUDGET_LIMITS,
      LATENCY_LIMITS: null,
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(invalid));

    expect(() => {
      loadCalibrationFromFile(TEST_CALIBRATION);
    }).toThrow(/CALIBRATION_NULL.*LATENCY_LIMITS/);
  });

  it('throws on null field in BUDGET_LIMITS (GAP-2A)', () => {
    const invalid = {
      BUDGET_LIMITS: {
        'test-model': {
          input_cost_per_1k: null,
          output_cost_per_1k: 0.002,
          max_per_call_usd: 0.10,
          max_per_run_usd: 1.00,
        },
      },
      LATENCY_LIMITS: VALID_CALIBRATION.LATENCY_LIMITS,
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(invalid));

    expect(() => {
      loadCalibrationFromFile(TEST_CALIBRATION);
    }).toThrow(/CALIBRATION_NULL.*test-model/);
  });

  it('throws on null field in LATENCY_LIMITS (GAP-2A)', () => {
    const invalid = {
      BUDGET_LIMITS: VALID_CALIBRATION.BUDGET_LIMITS,
      LATENCY_LIMITS: {
        max_call_latency_ms: 60000,
        max_run_latency_ms: null,
        warn_call_latency_ms: 30000,
      },
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(invalid));

    expect(() => {
      loadCalibrationFromFile(TEST_CALIBRATION);
    }).toThrow(/CALIBRATION_NULL.*max_run_latency_ms/);
  });
});

describe('Budget Tracker — Early Termination', () => {
  it('isBudgetExhausted returns false initially', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);
    expect(tracker.isBudgetExhausted()).toBe(false);
  });

  it('isBudgetExhausted returns true when run limit hit', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    // Add calls until run budget exhausted
    for (let i = 0; i < 100; i++) {
      tracker.recordCall(`SCN-${i}`, 'test-model', 5000, 5000, 1000);
      if (tracker.isBudgetExhausted()) {
        break;
      }
    }

    expect(tracker.isBudgetExhausted()).toBe(true);
  });
});

describe('Budget Tracker — Helpers', () => {
  it('estimateTokens approximates token count', () => {
    expect(estimateTokens('Hello world')).toBeGreaterThan(0);
    expect(estimateTokens('A'.repeat(4000))).toBeCloseTo(1000, -2);
  });

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('Budget Tracker — Report Structure', () => {
  it('includes all call records', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    tracker.recordCall('SCN-01', 'test-model', 1000, 500, 1000);
    tracker.recordCall('SCN-02', 'test-model', 2000, 1000, 2000);

    const report = tracker.finalize();

    expect(report.calls).toHaveLength(2);
    expect(report.calls[0].scene_id).toBe('SCN-01');
    expect(report.calls[1].scene_id).toBe('SCN-02');
  });

  it('assigns call_index sequentially', () => {
    const tracker = new BudgetTracker(VALID_CALIBRATION);

    tracker.recordCall('SCN-01', 'test-model', 1000, 500, 1000);
    tracker.recordCall('SCN-02', 'test-model', 2000, 1000, 2000);

    const report = tracker.finalize();

    expect(report.calls[0].call_index).toBe(0);
    expect(report.calls[1].call_index).toBe(1);
  });
});
