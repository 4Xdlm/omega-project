/**
 * OMEGA Memory Write Runtime - Types
 * Phase CD - NASA-Grade L4
 *
 * INVARIANTS:
 * - INV-RCP-01: Every successful write has exactly one receipt
 * - INV-RCP-02: Receipt chain independent from Sentinel trace chain
 * - INV-RCP-03: Receipt links to Sentinel trace_id
 * - INV-RCP-04: Receipt includes ledger_entry_id
 * - INV-RCP-05: Receipt timestamp from monotonic clock
 * - INV-RCP-06: Receipt chain is append-only hash-chain
 */

import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED IDS
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type ReceiptId = Brand<string, 'ReceiptId'>;
export type ReceiptChainHash = Brand<string, 'ReceiptChainHash'>;

export function createReceiptId(): ReceiptId {
  return `rcpt_${randomUUID()}` as ReceiptId;
}

export function toReceiptChainHash(hash: string): ReceiptChainHash {
  return hash as ReceiptChainHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT ENTRY (INV-RCP-02: Independent chain)
// ─────────────────────────────────────────────────────────────────────────────

export interface WriteReceipt {
  readonly receipt_id: ReceiptId;
  readonly ledger_entry_id: string; // INV-RCP-04
  readonly sentinel_trace_id: string; // INV-RCP-03
  readonly sentinel_chain_hash: string;
  readonly rule_id: string;
  readonly operation: 'APPEND_FACT' | 'APPEND_DECISION' | 'APPEND_NOTE';
  readonly stage: 'PROPOSE' | 'FINAL';
  readonly verdict: 'ALLOW' | 'DENY';
  readonly timestamp_mono_ns: bigint; // INV-RCP-05
  readonly prev_receipt_hash: string; // INV-RCP-06
  readonly receipt_hash: string;
  readonly receipt_chain_hash: ReceiptChainHash; // INV-RCP-06
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE REQUEST/RESULT
// ─────────────────────────────────────────────────────────────────────────────

export type WriteOperation = 'APPEND_FACT' | 'APPEND_DECISION' | 'APPEND_NOTE';

export interface WriteRequest {
  readonly operation: WriteOperation;
  readonly entry_id: string;
  readonly payload: unknown;
  readonly actor_id: string;
  readonly reason: string;
  readonly source: string;
}

export interface WriteResult {
  readonly success: boolean;
  readonly receipt: WriteReceipt;
  readonly error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export type WriteRuntimeErrorCode =
  | 'AUTHORIZATION_DENIED'
  | 'WRITE_FAILED'
  | 'RECEIPT_CHAIN_BROKEN'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR';

export class WriteRuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: WriteRuntimeErrorCode,
    public readonly receipt?: WriteReceipt
  ) {
    super(message);
    this.name = 'WriteRuntimeError';
  }
}
