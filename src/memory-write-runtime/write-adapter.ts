/**
 * OMEGA Write Adapter v1.0
 * Phase CD - NASA-Grade L4
 *
 * Bridges Sentinel authorization with Memory Write operations.
 *
 * INVARIANTS:
 * - INV-CD-01: All writes pass through Sentinel
 * - INV-CD-02: No write without ALLOW verdict
 * - INV-RCP-01: Every successful write has exactly one receipt
 */

import { Sentinel, AuthorizeResult } from '../sentinel/sentinel.js';
import { SentinelContext, SentinelOperation } from '../sentinel/types.js';
import { ReceiptManager, ReceiptInput } from './receipt-manager.js';
import {
  WriteRequest,
  WriteResult,
  WriteReceipt,
  WriteRuntimeError,
} from './types.js';
import { Clock, SystemClock } from '../shared/clock.js';

export interface WriteAdapterConfig {
  readonly clock: Clock;
  readonly receiptPath: string;
  readonly tracePath: string;
  readonly twoStepEnabled: boolean;
}

const DEFAULT_CONFIG: WriteAdapterConfig = {
  clock: SystemClock,
  receiptPath: './receipts.ndjson',
  tracePath: './trace.ndjson',
  twoStepEnabled: false,
};

export class WriteAdapter {
  private readonly sentinel: Sentinel;
  private readonly receiptManager: ReceiptManager;
  private readonly clock: Clock;
  private initialized = false;

  constructor(config: Partial<WriteAdapterConfig> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.clock = cfg.clock;
    this.sentinel = new Sentinel({
      clock: cfg.clock,
      tracePath: cfg.tracePath,
      twoStepEnabled: cfg.twoStepEnabled,
    });
    this.receiptManager = new ReceiptManager({
      clock: cfg.clock,
      receiptPath: cfg.receiptPath,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.sentinel.initialize();
    await this.receiptManager.initialize();
    this.initialized = true;
  }

  /**
   * Execute a write request through Sentinel authorization.
   * INV-CD-01: All writes pass through Sentinel
   * INV-CD-02: No write without ALLOW verdict
   */
  async write(request: WriteRequest): Promise<WriteResult> {
    if (!this.initialized) {
      throw new WriteRuntimeError('WriteAdapter not initialized', 'INTERNAL_ERROR');
    }

    // Build Sentinel context
    const context: SentinelContext = {
      phase: 'CD', // Integration phase
      actor_id: request.actor_id,
      reason: request.reason,
      source: request.source,
      timestamp_mono_ns: this.clock.nowMonoNs(),
    };

    // Request authorization from Sentinel (INV-CD-01)
    const authResult: AuthorizeResult = await this.sentinel.authorize(
      'FINAL',
      request.operation as SentinelOperation,
      request.payload,
      context
    );

    // Build receipt input
    const receiptInput: ReceiptInput = {
      ledger_entry_id: request.entry_id,
      sentinel_trace_id: authResult.decision.trace_id,
      sentinel_chain_hash: authResult.trace.chain_hash,
      rule_id: authResult.decision.rule_id,
      operation: request.operation,
      stage: 'FINAL',
      verdict: authResult.decision.verdict,
    };

    // Create receipt (INV-RCP-01)
    const receipt = await this.receiptManager.createReceipt(receiptInput);

    // INV-CD-02: No write without ALLOW verdict
    if (authResult.decision.verdict === 'DENY') {
      return {
        success: false,
        receipt,
        error: `Authorization denied: ${authResult.decision.justification}`,
      };
    }

    // ALLOW verdict - write would proceed here
    // In Phase CD, we record the receipt but actual ledger write
    // is handled by the Memory layer (which will be unblocked)
    return {
      success: true,
      receipt,
    };
  }

  /**
   * Verify both chains (Sentinel trace + Receipt)
   */
  async verifyChains(): Promise<{
    sentinelChain: { valid: boolean; entries: number; error?: string };
    receiptChain: { valid: boolean; receipts: number; error?: string };
  }> {
    const [sentinelResult, receiptResult] = await Promise.all([
      this.sentinel.verifyTraceChain(),
      this.receiptManager.verifyChain(),
    ]);

    return {
      sentinelChain: sentinelResult,
      receiptChain: receiptResult,
    };
  }

  /**
   * Get the underlying Sentinel instance (for advanced use)
   */
  getSentinel(): Sentinel {
    return this.sentinel;
  }

  /**
   * Get the underlying ReceiptManager (for advanced use)
   */
  getReceiptManager(): ReceiptManager {
    return this.receiptManager;
  }
}
