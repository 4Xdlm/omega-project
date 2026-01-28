/**
 * OMEGA Trace Manager Tests
 * Phase C - NASA-Grade L4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TraceManager } from '../../src/sentinel/trace.js';
import {
  SentinelContext,
  SentinelDecision,
  RuleId,
  TraceId,
  createTraceId,
} from '../../src/sentinel/types.js';
import { createTestClock } from '../../src/shared/clock.js';
import { mkdir, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TraceManager', () => {
  const testDir = join(tmpdir(), `omega-trace-${process.pid}-${Date.now()}`);
  const tracePath = join(testDir, 'judgements.ndjson');
  let tm: TraceManager;

  const ctx: SentinelContext = {
    phase: 'C',
    actor_id: 'test',
    reason: 'test reason',
    source: 'test',
    timestamp_mono_ns: 0n,
  };

  const dec: SentinelDecision = {
    verdict: 'DENY',
    rule_id: 'RULE-C-001' as RuleId,
    trace_id: createTraceId(),
    justification: 'test',
    timestamp_mono_ns: 0n,
  };

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    try {
      await unlink(tracePath);
    } catch {}
    try {
      await unlink(tracePath + '.lock');
    } catch {}
    tm = new TraceManager(createTestClock(1000n), tracePath);
  });

  afterEach(async () => {
    try {
      await unlink(tracePath);
    } catch {}
    try {
      await unlink(tracePath + '.lock');
    } catch {}
  });

  describe('INV-TRACE-01: Hash chain', () => {
    it('chains from genesis', async () => {
      await tm.initialize();
      const e1 = await tm.appendTrace('APPEND_FACT', 'FINAL', 'h1', ctx, dec);
      expect(e1.prev_chain_hash).toBe('0'.repeat(64));

      const e2 = await tm.appendTrace('APPEND_FACT', 'FINAL', 'h2', ctx, dec);
      expect(e2.prev_chain_hash).toBe(e1.chain_hash);
    });

    it('verifies chain integrity', async () => {
      await tm.initialize();
      await tm.appendTrace('APPEND_FACT', 'FINAL', 'h1', ctx, dec);
      await tm.appendTrace('APPEND_FACT', 'FINAL', 'h2', ctx, dec);
      await tm.appendTrace('APPEND_FACT', 'FINAL', 'h3', ctx, dec);

      const v = await tm.verifyChain();
      expect(v.valid).toBe(true);
      expect(v.entries).toBe(3);
    });
  });

  describe('Trace entry structure', () => {
    it('creates valid trace entry', async () => {
      await tm.initialize();
      const entry = await tm.appendTrace('APPEND_FACT', 'FINAL', 'payload_hash', ctx, dec);

      expect(entry.trace_id).toMatch(/^trace_/);
      expect(entry.operation).toBe('APPEND_FACT');
      expect(entry.stage).toBe('FINAL');
      expect(entry.payload_hash).toBe('payload_hash');
      expect(entry.entry_hash).toBeDefined();
      expect(entry.chain_hash).toBeDefined();
    });

    it('includes context in entry', async () => {
      await tm.initialize();
      const entry = await tm.appendTrace('APPEND_FACT', 'FINAL', 'h1', ctx, dec);

      expect(entry.context.phase).toBe('C');
      expect(entry.context.actor_id).toBe('test');
    });

    it('includes decision in entry', async () => {
      await tm.initialize();
      const entry = await tm.appendTrace('APPEND_FACT', 'FINAL', 'h1', ctx, dec);

      expect(entry.decision.verdict).toBe('DENY');
      expect(entry.decision.rule_id).toBe('RULE-C-001');
    });
  });

  describe('Chain recovery', () => {
    it('recovers chain on reinit', async () => {
      await tm.initialize();
      await tm.appendTrace('APPEND_FACT', 'FINAL', 'h1', ctx, dec);
      const hash = tm.getLastChainHash();

      const tm2 = new TraceManager(createTestClock(2000n), tracePath);
      await tm2.initialize();
      expect(tm2.getLastChainHash()).toBe(hash);
    });

    it('continues chain after reinit', async () => {
      await tm.initialize();
      const e1 = await tm.appendTrace('APPEND_FACT', 'FINAL', 'h1', ctx, dec);

      const tm2 = new TraceManager(createTestClock(2000n), tracePath);
      await tm2.initialize();
      const e2 = await tm2.appendTrace('APPEND_FACT', 'FINAL', 'h2', ctx, dec);

      expect(e2.prev_chain_hash).toBe(e1.chain_hash);
    });
  });

  describe('Empty trace file', () => {
    it('works with no existing trace', async () => {
      await tm.initialize();
      const v = await tm.verifyChain();
      expect(v.valid).toBe(true);
      expect(v.entries).toBe(0);
    });

    it('getLastChainHash returns genesis for empty', async () => {
      await tm.initialize();
      expect(tm.getLastChainHash()).toBe('0'.repeat(64));
    });
  });
});
