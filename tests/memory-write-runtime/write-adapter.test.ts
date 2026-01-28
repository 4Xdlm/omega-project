/**
 * OMEGA Write Adapter Tests
 * Phase CD - NASA-Grade L4
 *
 * Tests for:
 * - INV-CD-01: All writes pass through Sentinel
 * - INV-CD-02: No write without ALLOW verdict
 * - INV-RCP-01: Every successful write has exactly one receipt
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { WriteAdapter } from '../../src/memory-write-runtime/write-adapter.js';
import { WriteRequest } from '../../src/memory-write-runtime/types.js';
import { createTestClock } from '../../src/shared/clock.js';

describe('WriteAdapter', () => {
  let testDir: string;
  let receiptPath: string;
  let tracePath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `omega-adapter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    receiptPath = join(testDir, 'receipts.ndjson');
    tracePath = join(testDir, 'trace.ndjson');
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const makeRequest = (id: number, phase: string = 'CD'): WriteRequest => ({
    operation: 'APPEND_FACT',
    entry_id: `entry_${id}`,
    payload: { id, data: 'test' },
    actor_id: 'test_actor',
    reason: 'test write reason for validation',
    source: 'test_source',
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });

      await expect(adapter.initialize()).resolves.not.toThrow();
    });

    it('should throw if not initialized', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });

      await expect(adapter.write(makeRequest(1))).rejects.toThrow('not initialized');
    });
  });

  describe('write with authorization (INV-CD-01, INV-CD-02)', () => {
    it('should return success for valid CD write', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      const result = await adapter.write(makeRequest(1));

      expect(result.success).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.verdict).toBe('ALLOW');
    });

    it('should return failure for denied write (Phase C)', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      // Empty payload will be denied by RULE-C-003
      const result = await adapter.write({
        ...makeRequest(1),
        payload: {},
      });

      expect(result.success).toBe(false);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.verdict).toBe('DENY');
      expect(result.error).toBeDefined();
    });

    it('should create receipt for every write (INV-RCP-01)', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      const r1 = await adapter.write(makeRequest(1));
      const r2 = await adapter.write(makeRequest(2));
      const r3 = await adapter.write({ ...makeRequest(3), payload: {} }); // Denied

      expect(r1.receipt).toBeDefined();
      expect(r2.receipt).toBeDefined();
      expect(r3.receipt).toBeDefined();

      // All have unique receipt IDs
      const ids = [r1.receipt.receipt_id, r2.receipt.receipt_id, r3.receipt.receipt_id];
      expect(new Set(ids).size).toBe(3);
    });

    it('should include sentinel trace link in receipt (INV-RCP-03)', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      const result = await adapter.write(makeRequest(1));

      expect(result.receipt.sentinel_trace_id).toMatch(/^trace_/);
      expect(result.receipt.sentinel_chain_hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyChains', () => {
    it('should verify both chains', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      for (let i = 0; i < 5; i++) {
        await adapter.write(makeRequest(i));
      }

      const verification = await adapter.verifyChains();

      expect(verification.sentinelChain.valid).toBe(true);
      expect(verification.sentinelChain.entries).toBe(5);
      expect(verification.receiptChain.valid).toBe(true);
      expect(verification.receiptChain.receipts).toBe(5);
    });
  });

  describe('different operations', () => {
    it('should handle APPEND_DECISION', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      const result = await adapter.write({
        ...makeRequest(1),
        operation: 'APPEND_DECISION',
      });

      expect(result.success).toBe(true);
      expect(result.receipt.operation).toBe('APPEND_DECISION');
    });

    it('should handle APPEND_NOTE', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      const result = await adapter.write({
        ...makeRequest(1),
        operation: 'APPEND_NOTE',
      });

      expect(result.success).toBe(true);
      expect(result.receipt.operation).toBe('APPEND_NOTE');
    });
  });

  describe('receipt chain independence (INV-RCP-02)', () => {
    it('should maintain independent receipt chain', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      const r1 = await adapter.write(makeRequest(1));
      const r2 = await adapter.write(makeRequest(2));

      // Receipt chain is linked
      expect(r2.receipt.prev_receipt_hash).toBe(r1.receipt.receipt_hash);

      // But chain hashes differ from sentinel chain hashes
      expect(r1.receipt.receipt_chain_hash).not.toBe(r1.receipt.sentinel_chain_hash);
    });
  });

  describe('denied writes still get receipts', () => {
    it('should create receipt even for denied writes', async () => {
      const adapter = new WriteAdapter({
        clock: createTestClock(),
        receiptPath,
        tracePath,
      });
      await adapter.initialize();

      // null payload will be denied
      const result = await adapter.write({
        ...makeRequest(1),
        payload: null,
      });

      expect(result.success).toBe(false);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.verdict).toBe('DENY');
      expect(result.receipt.ledger_entry_id).toBe('entry_1');
    });
  });
});
