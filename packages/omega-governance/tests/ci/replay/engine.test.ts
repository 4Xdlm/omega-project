/**
 * OMEGA Governance — Replay Engine Tests
 * Phase F — INV-F-02, INV-F-03
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { createTempDir, createFixtureRun } from '../../fixtures/helpers.js';
import { replayCompare } from '../../../src/ci/replay/engine.js';

describe('Replay Engine', () => {
  const seed = 'omega-ci';

  it('identical runs produce identical replay result', () => {
    const dirA = createTempDir('replay-a');
    const dirB = createTempDir('replay-b');
    const runA = createFixtureRun(dirA, { runId: 'abcdef0123456789', seed });
    const runB = createFixtureRun(dirB, { runId: 'abcdef0123456789', seed });

    const result = replayCompare(runA, runB, { seed, timeout_ms: 10000 });
    expect(result.identical).toBe(true);
    expect(result.differences).toHaveLength(0);
    expect(result.manifest_match).toBe(true);
    expect(result.merkle_match).toBe(true);
  });

  it('different runs produce differences', () => {
    const dirA = createTempDir('replay-diff-a');
    const dirB = createTempDir('replay-diff-b');
    const runA = createFixtureRun(dirA, { runId: 'aaaa000000000001', seed, forgeScore: 0.85 });
    const runB = createFixtureRun(dirB, { runId: 'bbbb000000000002', seed, forgeScore: 0.50 });

    const result = replayCompare(runA, runB, { seed, timeout_ms: 10000 });
    expect(result.identical).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('reports seed in result', () => {
    const dir = createTempDir('replay-seed');
    const run = createFixtureRun(dir, { runId: 'abcdef0123456789', seed });
    const result = replayCompare(run, run, { seed, timeout_ms: 10000 });
    expect(result.seed).toBe(seed);
  });

  it('handles missing baseline manifest', () => {
    const dirA = createTempDir('replay-missing-a');
    const dirB = createTempDir('replay-missing-b');
    createFixtureRun(dirB, { runId: 'abcdef0123456789' });

    const result = replayCompare(dirA, join(dirB, 'abcdef0123456789'), { seed, timeout_ms: 10000 });
    expect(result.identical).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('handles missing candidate manifest', () => {
    const dirA = createTempDir('replay-missing-cand-a');
    const dirB = createTempDir('replay-missing-cand-b');
    const runA = createFixtureRun(dirA, { runId: 'abcdef0123456789' });

    const result = replayCompare(runA, dirB, { seed, timeout_ms: 10000 });
    expect(result.identical).toBe(false);
  });

  it('detects differences when runs have different scores', () => {
    const dirA = createTempDir('replay-score-a');
    const dirB = createTempDir('replay-score-b');
    const runA = createFixtureRun(dirA, { runId: 'abcdef0123456789', seed, forgeScore: 0.85 });
    const runB = createFixtureRun(dirB, { runId: 'abcdef0123456789', seed, forgeScore: 0.50 });

    const result = replayCompare(runA, runB, { seed, timeout_ms: 10000 });
    expect(result.identical).toBe(false);
    expect(result.merkle_match).toBe(false);
  });

  it('reports duration_ms', () => {
    const dir = createTempDir('replay-duration');
    const run = createFixtureRun(dir, { runId: 'abcdef0123456789' });
    const result = replayCompare(run, run, { seed, timeout_ms: 10000 });
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('reports baseline and replay run IDs', () => {
    const dirA = createTempDir('replay-ids-a');
    const dirB = createTempDir('replay-ids-b');
    const runA = createFixtureRun(dirA, { runId: 'aaaa000000000001' });
    const runB = createFixtureRun(dirB, { runId: 'bbbb000000000002' });

    const result = replayCompare(runA, runB, { seed, timeout_ms: 10000 });
    expect(result.baseline_run_id).toBe('aaaa000000000001');
    expect(result.replay_run_id).toBe('bbbb000000000002');
  });
});
