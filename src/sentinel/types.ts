/**
 * OMEGA Sentinel Types v1.0
 * Phase C - NASA-Grade L4
 */

import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED IDS
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type TraceId = Brand<string, 'TraceId'>;
export type RuleId = Brand<string, 'RuleId'>;
export type ReceiptId = Brand<string, 'ReceiptId'>;
export type ChainHash = Brand<string, 'ChainHash'>;

export function createTraceId(): TraceId {
  return `trace_${randomUUID()}` as TraceId;
}

export function createRuleId(code: string): RuleId {
  return `RULE-C-${code}` as RuleId;
}

export function createReceiptId(): ReceiptId {
  return `rcpt_${randomUUID()}` as ReceiptId;
}

export function toChainHash(hash: string): ChainHash {
  return hash as ChainHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS & STAGES
// ─────────────────────────────────────────────────────────────────────────────

export type SentinelOperation = 'APPEND_FACT' | 'APPEND_DECISION' | 'APPEND_NOTE';

/** R2(B): TWO_STEP mode uses PROPOSE->FINAL, default uses FINAL only */
export type SentinelStage = 'PROPOSE' | 'FINAL';

export type SentinelVerdict = 'ALLOW' | 'DENY';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT & DECISION
// ─────────────────────────────────────────────────────────────────────────────

export interface SentinelContext {
  readonly phase: string;
  readonly actor_id: string;
  readonly reason: string;
  readonly source: string;
  readonly timestamp_mono_ns: bigint;
}

export interface SentinelDecision {
  readonly verdict: SentinelVerdict;
  readonly rule_id: RuleId;
  readonly trace_id: TraceId;
  readonly justification: string;
  readonly timestamp_mono_ns: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACE ENTRY (Hash-chain R1)
// ─────────────────────────────────────────────────────────────────────────────

export interface JudgementTraceEntry {
  readonly trace_id: TraceId;
  readonly operation: SentinelOperation;
  readonly stage: SentinelStage;
  readonly payload_hash: string;
  readonly context: SentinelContext;
  readonly decision: SentinelDecision;
  readonly prev_chain_hash: ChainHash;
  readonly entry_hash: string;
  readonly chain_hash: ChainHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT ENTRY (Hash-chain independent - INV-RCP-06)
// ─────────────────────────────────────────────────────────────────────────────

export interface JudgementReceiptEntry {
  readonly receipt_id: ReceiptId;
  readonly ledger_entry_id: string;
  readonly sentinel_trace_id: TraceId;
  readonly sentinel_chain_hash: ChainHash;
  readonly rule_id: RuleId;
  readonly operation: SentinelOperation;
  readonly stage: SentinelStage;
  readonly timestamp_mono_ns: bigint;
  readonly prev_receipt_hash: string;
  readonly receipt_hash: string;
  readonly receipt_chain_hash: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export type SentinelErrorCode =
  | 'RULE_NOT_FOUND'
  | 'INVALID_PAYLOAD'
  | 'INVALID_CONTEXT'
  | 'TRACE_FAILED'
  | 'CHAIN_BROKEN'
  | 'TWO_STEP_REQUIRED'
  | 'INTERNAL_ERROR';

export class SentinelError extends Error {
  constructor(
    message: string,
    public readonly code: SentinelErrorCode
  ) {
    super(message);
    this.name = 'SentinelError';
  }
}
