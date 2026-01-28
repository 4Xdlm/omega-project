/**
 * OMEGA Sentinel Tests
 * Phase C - NASA-Grade L4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Sentinel, resetSentinel } from '../../src/sentinel/sentinel.js';
import { SentinelContext, SentinelError } from '../../src/sentinel/types.js';
import { createTestClock } from '../../src/shared/clock.js';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Sentinel', () => {
  const testDir = join(tmpdir(), `omega-sentinel-${process.pid}-${Date.now()}`);
  const tracePath = join(testDir, 'judgements.ndjson');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    try {
      await unlink(tracePath);
    } catch {}
    try {
      await unlink(tracePath + '.lock');
    } catch {}
    resetSentinel();
  });

  afterEach(async () => {
    try {
      await unlink(tracePath);
    } catch {}
    try {
      await unlink(tracePath + '.lock');
    } catch {}
  });

  const ctx = (phase: string): SentinelContext => ({
    phase,
    actor_id: 'test',
    reason: 'valid test reason',
    source: 'test',
    timestamp_mono_ns: 0n,
  });

  describe('Basic authorization', () => {
    it('denies Phase C (INV-C-01)', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();
      const r = await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('C'));
      expect(r.decision.verdict).toBe('DENY');
      expect(r.decision.rule_id).toBeDefined(); // INV-C-02
      expect(r.trace.trace_id).toBeDefined(); // INV-C-03
    });

    it('allows Phase CD', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();
      const r = await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('CD'));
      expect(r.decision.verdict).toBe('ALLOW');
    });

    it('always creates trace even for DENY (INV-TRACE-02)', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();
      const r = await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('C'));
      expect(r.trace).toBeDefined();
      expect(r.trace.decision.verdict).toBe('DENY');
    });
  });

  describe('INV-C-02: rule_id always present', () => {
    it('has rule_id for DENY', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();
      const r = await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('C'));
      expect(r.decision.rule_id).toBeDefined();
      expect(r.decision.rule_id.length).toBeGreaterThan(0);
    });

    it('has rule_id for ALLOW', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();
      const r = await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('CD'));
      expect(r.decision.rule_id).toBeDefined();
    });
  });

  describe('INV-C-03: trace_id always present', () => {
    it('has trace_id for DENY', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();
      const r = await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('C'));
      expect(r.decision.trace_id).toBeDefined();
      expect(r.decision.trace_id).toMatch(/^trace_/);
    });

    it('has trace_id for ALLOW', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();
      const r = await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('CD'));
      expect(r.decision.trace_id).toBeDefined();
    });
  });

  describe('Two-step R2(B)', () => {
    it('throws if PROPOSE without twoStepEnabled (INV-2STEP-02)', async () => {
      const s = new Sentinel({ clock: createTestClock(), twoStepEnabled: false, tracePath });
      await s.initialize();
      await expect(s.authorize('PROPOSE', 'APPEND_FACT', { x: 1 }, ctx('CD'))).rejects.toThrow(
        SentinelError
      );
    });

    it('throws if FINAL without PROPOSE when twoStepEnabled (INV-2STEP-01)', async () => {
      const s = new Sentinel({ clock: createTestClock(), twoStepEnabled: true, tracePath });
      await s.initialize();
      await expect(s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('CD'))).rejects.toThrow(
        SentinelError
      );
    });

    it('allows PROPOSE -> FINAL flow', async () => {
      const s = new Sentinel({ clock: createTestClock(), twoStepEnabled: true, tracePath });
      await s.initialize();
      const payload = { x: 1 };
      const context = ctx('CD');

      const p = await s.authorize('PROPOSE', 'APPEND_FACT', payload, context);
      expect(p.decision.verdict).toBe('ALLOW');

      const f = await s.authorize('FINAL', 'APPEND_FACT', payload, context);
      expect(f.decision.verdict).toBe('ALLOW');
    });

    it('fails FINAL with different payload', async () => {
      const s = new Sentinel({ clock: createTestClock(), twoStepEnabled: true, tracePath });
      await s.initialize();
      const context = ctx('CD');

      await s.authorize('PROPOSE', 'APPEND_FACT', { x: 1 }, context);
      await expect(s.authorize('FINAL', 'APPEND_FACT', { x: 2 }, context)).rejects.toThrow(
        SentinelError
      );
    });
  });

  describe('Determinism', () => {
    it('same input -> same verdict', async () => {
      const tracePath1 = join(testDir, 'trace1.ndjson');
      const tracePath2 = join(testDir, 'trace2.ndjson');

      const s1 = new Sentinel({ clock: createTestClock(100n), tracePath: tracePath1 });
      const s2 = new Sentinel({ clock: createTestClock(100n), tracePath: tracePath2 });
      await s1.initialize();
      await s2.initialize();

      const r1 = await s1.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('C'));
      const r2 = await s2.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('C'));

      expect(r1.decision.verdict).toBe(r2.decision.verdict);
      expect(r1.decision.rule_id).toBe(r2.decision.rule_id);

      // Cleanup
      try {
        await unlink(tracePath1);
      } catch {}
      try {
        await unlink(tracePath2);
      } catch {}
    });
  });

  describe('Chain verification', () => {
    it('verifies valid chain', async () => {
      const s = new Sentinel({ clock: createTestClock(), tracePath });
      await s.initialize();

      await s.authorize('FINAL', 'APPEND_FACT', { x: 1 }, ctx('C'));
      await s.authorize('FINAL', 'APPEND_FACT', { x: 2 }, ctx('C'));
      await s.authorize('FINAL', 'APPEND_FACT', { x: 3 }, ctx('C'));

      const v = await s.verifyTraceChain();
      expect(v.valid).toBe(true);
      expect(v.entries).toBe(3);
    });
  });
});
