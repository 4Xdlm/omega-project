/**
 * OMEGA Receipt Manager Tests
 * Phase CD - NASA-Grade L4
 *
 * Tests for:
 * - INV-RCP-01: Every successful write has exactly one receipt
 * - INV-RCP-02: Receipt chain independent from Sentinel trace chain
 * - INV-RCP-06: Receipt chain is append-only hash-chain
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ReceiptManager, ReceiptInput } from '../../src/memory-write-runtime/receipt-manager.js';
import { createTestClock } from '../../src/shared/clock.js';
import { WriteReceipt } from '../../src/memory-write-runtime/types.js';

describe('ReceiptManager', () => {
  let testDir: string;
  let receiptPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `omega-receipt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    receiptPath = join(testDir, 'receipts.ndjson');
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const makeInput = (id: number): ReceiptInput => ({
    ledger_entry_id: `entry_${id}`,
    sentinel_trace_id: `trace_${id}`,
    sentinel_chain_hash: '0'.repeat(64),
    rule_id: 'RULE-C-002',
    operation: 'APPEND_FACT',
    stage: 'FINAL',
    verdict: 'ALLOW',
  });

  describe('initialization', () => {
    it('should initialize with empty state', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      expect(mgr.getLastChainHash()).toBe('0'.repeat(64));
    });

    it('should resume from existing file', async () => {
      const clock = createTestClock();
      const mgr1 = new ReceiptManager({ clock, receiptPath });
      await mgr1.initialize();

      await mgr1.createReceipt(makeInput(1));
      await mgr1.createReceipt(makeInput(2));
      const hash1 = mgr1.getLastChainHash();

      // New manager on same file
      const mgr2 = new ReceiptManager({ clock: createTestClock(), receiptPath });
      await mgr2.initialize();

      expect(mgr2.getLastChainHash()).toBe(hash1);
    });
  });

  describe('createReceipt (INV-RCP-01)', () => {
    it('should create receipt with unique ID', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const r1 = await mgr.createReceipt(makeInput(1));
      const r2 = await mgr.createReceipt(makeInput(2));

      expect(r1.receipt_id).toMatch(/^rcpt_/);
      expect(r2.receipt_id).toMatch(/^rcpt_/);
      expect(r1.receipt_id).not.toBe(r2.receipt_id);
    });

    it('should include ledger_entry_id (INV-RCP-04)', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const receipt = await mgr.createReceipt(makeInput(42));
      expect(receipt.ledger_entry_id).toBe('entry_42');
    });

    it('should include sentinel_trace_id (INV-RCP-03)', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const receipt = await mgr.createReceipt(makeInput(1));
      expect(receipt.sentinel_trace_id).toBe('trace_1');
    });

    it('should use monotonic timestamp (INV-RCP-05)', async () => {
      const clock = createTestClock(1000n);
      const mgr = new ReceiptManager({ clock, receiptPath });
      await mgr.initialize();

      const r1 = await mgr.createReceipt(makeInput(1));
      const r2 = await mgr.createReceipt(makeInput(2));

      expect(r1.timestamp_mono_ns).toBe(1000n);
      expect(r2.timestamp_mono_ns).toBe(1001n);
    });

    it('should persist to file', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      await mgr.createReceipt(makeInput(1));
      await mgr.createReceipt(makeInput(2));

      const content = await readFile(receiptPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);

      const r1 = JSON.parse(lines[0]);
      const r2 = JSON.parse(lines[1]);
      expect(r1.ledger_entry_id).toBe('entry_1');
      expect(r2.ledger_entry_id).toBe('entry_2');
    });
  });

  describe('hash-chain (INV-RCP-06)', () => {
    it('should link receipts via prev_receipt_hash', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const r1 = await mgr.createReceipt(makeInput(1));
      const r2 = await mgr.createReceipt(makeInput(2));
      const r3 = await mgr.createReceipt(makeInput(3));

      expect(r1.prev_receipt_hash).toBe('0'.repeat(64)); // Genesis
      expect(r2.prev_receipt_hash).toBe(r1.receipt_hash);
      expect(r3.prev_receipt_hash).toBe(r2.receipt_hash);
    });

    it('should maintain chain_hash', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const r1 = await mgr.createReceipt(makeInput(1));
      const r2 = await mgr.createReceipt(makeInput(2));

      expect(r1.receipt_chain_hash).not.toBe(r2.receipt_chain_hash);
      expect(r2.receipt_chain_hash).toBe(mgr.getLastChainHash());
    });
  });

  describe('verifyChain', () => {
    it('should verify empty chain', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const result = await mgr.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.receipts).toBe(0);
    });

    it('should verify valid chain', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      for (let i = 0; i < 10; i++) {
        await mgr.createReceipt(makeInput(i));
      }

      const result = await mgr.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.receipts).toBe(10);
    });
  });

  describe('different operations and verdicts', () => {
    it('should handle APPEND_DECISION', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const receipt = await mgr.createReceipt({
        ...makeInput(1),
        operation: 'APPEND_DECISION',
      });

      expect(receipt.operation).toBe('APPEND_DECISION');
    });

    it('should handle DENY verdict', async () => {
      const mgr = new ReceiptManager({
        clock: createTestClock(),
        receiptPath,
      });
      await mgr.initialize();

      const receipt = await mgr.createReceipt({
        ...makeInput(1),
        verdict: 'DENY',
      });

      expect(receipt.verdict).toBe('DENY');
    });
  });
});
