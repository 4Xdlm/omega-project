/**
 * @fileoverview Unit tests for DeterminismGuard.
 */

import { describe, it, expect } from 'vitest';
import {
  createDeterminismGuard,
  DefaultDeterminismGuard,
  assertDeterministic,
} from '../../src/core/DeterminismGuard.js';
import type { RunResult } from '../../src/core/types.js';

// Helper to create a mock RunResult
function createMockResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    run_id: 'run-001',
    plan_id: 'plan-001',
    status: 'SUCCESS',
    steps: [
      {
        step_id: 'step-1',
        kind: 'noop',
        status: 'SUCCESS',
        output: { value: 42 },
        started_at: '2026-01-01T00:00:00.000Z',
        completed_at: '2026-01-01T00:00:01.000Z',
        duration_ms: 1000,
      },
    ],
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: '2026-01-01T00:00:01.000Z',
    duration_ms: 1000,
    hash: 'abc123',
    ...overrides,
  };
}

describe('DefaultDeterminismGuard', () => {
  it('should create via factory function', () => {
    const guard = createDeterminismGuard();
    expect(guard).toBeInstanceOf(DefaultDeterminismGuard);
  });

  it('should return deterministic for identical hashes', () => {
    const guard = createDeterminismGuard();
    const run1 = createMockResult({ hash: 'same-hash' });
    const run2 = createMockResult({ hash: 'same-hash' });

    const report = guard.verify(run1, run2);

    expect(report.is_deterministic).toBe(true);
    expect(report.hash1).toBe('same-hash');
    expect(report.hash2).toBe('same-hash');
    expect(report.differences).toHaveLength(0);
  });

  it('should return non-deterministic for different hashes', () => {
    const guard = createDeterminismGuard();
    const run1 = createMockResult({ hash: 'hash-1' });
    const run2 = createMockResult({ hash: 'hash-2' });

    const report = guard.verify(run1, run2);

    expect(report.is_deterministic).toBe(false);
    expect(report.hash1).toBe('hash-1');
    expect(report.hash2).toBe('hash-2');
  });

  it('should find differences in status', () => {
    const guard = createDeterminismGuard();
    const run1 = createMockResult({ status: 'SUCCESS', hash: '1' });
    const run2 = createMockResult({ status: 'FAILURE', hash: '2' });

    const report = guard.verify(run1, run2);

    expect(report.is_deterministic).toBe(false);
    const statusDiff = report.differences.find((d) => d.path === 'status');
    expect(statusDiff).toBeDefined();
    expect(statusDiff?.value1).toBe('SUCCESS');
    expect(statusDiff?.value2).toBe('FAILURE');
  });

  it('should find differences in step count', () => {
    const guard = createDeterminismGuard();
    const run1 = createMockResult({
      steps: [
        { step_id: 's1', kind: 'a', status: 'SUCCESS', started_at: '', completed_at: '', duration_ms: 0 },
      ],
      hash: '1',
    });
    const run2 = createMockResult({
      steps: [
        { step_id: 's1', kind: 'a', status: 'SUCCESS', started_at: '', completed_at: '', duration_ms: 0 },
        { step_id: 's2', kind: 'b', status: 'SUCCESS', started_at: '', completed_at: '', duration_ms: 0 },
      ],
      hash: '2',
    });

    const report = guard.verify(run1, run2);

    expect(report.is_deterministic).toBe(false);
    expect(report.differences.some((d) => d.path.includes('length'))).toBe(true);
  });

  it('should find differences in step output', () => {
    const guard = createDeterminismGuard();
    const run1 = createMockResult({
      steps: [
        { step_id: 's1', kind: 'a', status: 'SUCCESS', output: { x: 1 }, started_at: '', completed_at: '', duration_ms: 0 },
      ],
      hash: '1',
    });
    const run2 = createMockResult({
      steps: [
        { step_id: 's1', kind: 'a', status: 'SUCCESS', output: { x: 2 }, started_at: '', completed_at: '', duration_ms: 0 },
      ],
      hash: '2',
    });

    const report = guard.verify(run1, run2);

    expect(report.is_deterministic).toBe(false);
    expect(report.differences.some((d) => d.path.includes('output'))).toBe(true);
  });

  it('should ignore timestamp fields in comparison', () => {
    const guard = createDeterminismGuard();
    // Same content but different timestamps - if hashes match, it's deterministic
    const run1 = createMockResult({
      started_at: '2026-01-01T00:00:00.000Z',
      hash: 'same',
    });
    const run2 = createMockResult({
      started_at: '2026-01-01T00:00:01.000Z', // Different timestamp
      hash: 'same',
    });

    const report = guard.verify(run1, run2);
    expect(report.is_deterministic).toBe(true);
  });
});

describe('assertDeterministic', () => {
  it('should not throw for identical results', () => {
    const run1 = createMockResult({ hash: 'same' });
    const run2 = createMockResult({ hash: 'same' });

    expect(() => assertDeterministic(run1, run2)).not.toThrow();
  });

  it('should throw for different results', () => {
    const run1 = createMockResult({ status: 'SUCCESS', hash: '1' });
    const run2 = createMockResult({ status: 'FAILURE', hash: '2' });

    expect(() => assertDeterministic(run1, run2)).toThrow('Determinism violation');
  });

  it('should include hash info in error message', () => {
    const run1 = createMockResult({ hash: 'hash-aaa' });
    const run2 = createMockResult({ hash: 'hash-bbb' });

    try {
      assertDeterministic(run1, run2);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('hash-aaa');
      expect((e as Error).message).toContain('hash-bbb');
    }
  });

  it('should include differences in error message', () => {
    const run1 = createMockResult({ status: 'SUCCESS', hash: '1' });
    const run2 = createMockResult({ status: 'FAILURE', hash: '2' });

    try {
      assertDeterministic(run1, run2);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('status');
    }
  });
});
