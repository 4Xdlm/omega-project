/**
 * OMEGA Receipt Manager v1.0
 * Phase CD - NASA-Grade L4
 *
 * INVARIANTS:
 * - INV-RCP-01: Every successful write has exactly one receipt
 * - INV-RCP-02: Receipt chain independent from Sentinel trace chain
 * - INV-RCP-06: Receipt chain is append-only hash-chain
 */

import { appendFile, readFile } from 'fs/promises';
import { hashCanonical, canonicalize } from '../shared/canonical.js';
import { Clock, SystemClock } from '../shared/clock.js';
import { withLock } from '../shared/lock.js';
import {
  WriteReceipt,
  ReceiptId,
  ReceiptChainHash,
  WriteOperation,
  createReceiptId,
  toReceiptChainHash,
} from './types.js';

const GENESIS_HASH = '0'.repeat(64);

export interface ReceiptManagerConfig {
  readonly clock: Clock;
  readonly receiptPath: string;
}

export interface ReceiptInput {
  readonly ledger_entry_id: string;
  readonly sentinel_trace_id: string;
  readonly sentinel_chain_hash: string;
  readonly rule_id: string;
  readonly operation: WriteOperation;
  readonly stage: 'PROPOSE' | 'FINAL';
  readonly verdict: 'ALLOW' | 'DENY';
}

export interface ChainVerification {
  readonly valid: boolean;
  readonly receipts: number;
  readonly error?: string;
}

export class ReceiptManager {
  private lastReceiptHash: string = GENESIS_HASH;
  private lastChainHash: ReceiptChainHash = toReceiptChainHash(GENESIS_HASH);
  private readonly clock: Clock;
  private readonly receiptPath: string;
  private initialized = false;

  constructor(config: Partial<ReceiptManagerConfig> = {}) {
    this.clock = config.clock ?? SystemClock;
    this.receiptPath = config.receiptPath ?? './receipts.ndjson';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const content = await readFile(this.receiptPath, 'utf-8');
      const lines = content.trim().split('\n').filter((l) => l.length > 0);

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const lastReceipt = JSON.parse(lastLine) as WriteReceipt;
        this.lastReceiptHash = lastReceipt.receipt_hash;
        this.lastChainHash = lastReceipt.receipt_chain_hash;
      }
    } catch {
      // File doesn't exist yet - start fresh
    }

    this.initialized = true;
  }

  /**
   * Create and persist a receipt (INV-RCP-01)
   */
  async createReceipt(input: ReceiptInput): Promise<WriteReceipt> {
    if (!this.initialized) {
      throw new Error('ReceiptManager not initialized');
    }

    return withLock(this.receiptPath + '.lock', async () => {
      const receiptId: ReceiptId = createReceiptId();
      const timestamp = this.clock.nowMonoNs();

      // Build receipt without hashes first
      const receiptCore = {
        receipt_id: receiptId,
        ledger_entry_id: input.ledger_entry_id,
        sentinel_trace_id: input.sentinel_trace_id,
        sentinel_chain_hash: input.sentinel_chain_hash,
        rule_id: input.rule_id,
        operation: input.operation,
        stage: input.stage,
        verdict: input.verdict,
        timestamp_mono_ns: timestamp,
        prev_receipt_hash: this.lastReceiptHash,
      };

      // Compute receipt hash (content hash)
      const receiptHash = hashCanonical(receiptCore);

      // Compute chain hash = H(prev_chain_hash || receipt_hash)
      const chainHash = toReceiptChainHash(
        hashCanonical({ prev: this.lastChainHash, entry: receiptHash })
      );

      const receipt: WriteReceipt = {
        ...receiptCore,
        receipt_hash: receiptHash,
        receipt_chain_hash: chainHash,
      };

      // Persist (INV-RCP-06: append-only)
      const line = canonicalize(this.serializeForStorage(receipt)) + '\n';
      await appendFile(this.receiptPath, line, 'utf-8');

      // Update state
      this.lastReceiptHash = receiptHash;
      this.lastChainHash = chainHash;

      return receipt;
    });
  }

  /**
   * Verify receipt chain integrity (INV-RCP-06)
   */
  async verifyChain(): Promise<ChainVerification> {
    let content: string;
    try {
      content = await readFile(this.receiptPath, 'utf-8');
    } catch {
      // File doesn't exist - empty chain is valid
      return { valid: true, receipts: 0 };
    }

    try {
      const lines = content.trim().split('\n').filter((l) => l.length > 0);

      if (lines.length === 0) {
        return { valid: true, receipts: 0 };
      }

      let prevReceiptHash = GENESIS_HASH;
      let prevChainHash = GENESIS_HASH;

      for (let i = 0; i < lines.length; i++) {
        const receipt = this.deserializeFromStorage(JSON.parse(lines[i]));

        // Verify prev_receipt_hash link
        if (receipt.prev_receipt_hash !== prevReceiptHash) {
          return {
            valid: false,
            receipts: i,
            error: `Receipt ${i}: prev_receipt_hash mismatch`,
          };
        }

        // Recompute receipt hash
        const receiptCore = {
          receipt_id: receipt.receipt_id,
          ledger_entry_id: receipt.ledger_entry_id,
          sentinel_trace_id: receipt.sentinel_trace_id,
          sentinel_chain_hash: receipt.sentinel_chain_hash,
          rule_id: receipt.rule_id,
          operation: receipt.operation,
          stage: receipt.stage,
          verdict: receipt.verdict,
          timestamp_mono_ns: receipt.timestamp_mono_ns,
          prev_receipt_hash: receipt.prev_receipt_hash,
        };
        const expectedHash = hashCanonical(receiptCore);

        if (receipt.receipt_hash !== expectedHash) {
          return {
            valid: false,
            receipts: i,
            error: `Receipt ${i}: receipt_hash mismatch`,
          };
        }

        // Verify chain hash
        const expectedChainHash = hashCanonical({ prev: prevChainHash, entry: receipt.receipt_hash });
        if (receipt.receipt_chain_hash !== expectedChainHash) {
          return {
            valid: false,
            receipts: i,
            error: `Receipt ${i}: chain_hash mismatch`,
          };
        }

        prevReceiptHash = receipt.receipt_hash;
        prevChainHash = receipt.receipt_chain_hash;
      }

      return { valid: true, receipts: lines.length };
    } catch (e) {
      return { valid: false, receipts: 0, error: String(e) };
    }
  }

  getLastChainHash(): ReceiptChainHash {
    return this.lastChainHash;
  }

  /**
   * Serialize for JSON storage (bigint -> string)
   */
  private serializeForStorage(receipt: WriteReceipt): Record<string, unknown> {
    return {
      ...receipt,
      timestamp_mono_ns: receipt.timestamp_mono_ns.toString(),
    };
  }

  /**
   * Deserialize from JSON storage (string -> bigint)
   */
  private deserializeFromStorage(data: Record<string, unknown>): WriteReceipt {
    return {
      ...data,
      timestamp_mono_ns: BigInt(data.timestamp_mono_ns as string),
    } as WriteReceipt;
  }
}
