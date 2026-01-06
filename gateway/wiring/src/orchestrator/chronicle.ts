// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — CHRONICLE (Flight Recorder)
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: Causal Chronicle avec Structured Events
//
// Chaque record a un ID unique et peut pointer vers un parent.
// Cela permet de reconstruire l'arbre de causalité complet.
// Les events sont fortement typés pour analyse automatisée.
//
// @invariant INV-ORCH-06: Chronicle Completeness (start + terminal)
// @invariant INV-CHRON-01: Every Dispatch Has Terminal Record
// @invariant INV-CHRON-02: Causal Chain Integrity
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusError } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RECORD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types d'events Chronicle
 */
export type ChronicleEventType =
  | 'DISPATCH_RECEIVED'
  | 'VALIDATION_OK'
  | 'VALIDATION_FAILED'
  | 'POLICY_OK'
  | 'POLICY_REJECTED'
  | 'REPLAY_OK'
  | 'REPLAY_REJECTED'
  | 'HANDLER_RESOLVED'
  | 'HANDLER_NOT_FOUND'
  | 'EXECUTION_START'
  | 'EXECUTION_OK'
  | 'EXECUTION_ERROR'
  | 'DISPATCH_COMPLETE';

/**
 * Record de base
 */
interface ChronicleRecordBase {
  /** ID unique du record */
  readonly record_id: string;
  /** ID du record parent (pour causalité) */
  readonly parent_id: string | null;
  /** Type d'event */
  readonly event_type: ChronicleEventType;
  /** Timestamp précis */
  readonly timestamp: number;
  /** Trace ID de l'envelope */
  readonly trace_id: string;
  /** Message ID de l'envelope */
  readonly message_id: string;
}

/**
 * Record: Dispatch reçu
 */
export interface DispatchReceivedRecord extends ChronicleRecordBase {
  readonly event_type: 'DISPATCH_RECEIVED';
  readonly target_module: string;
  readonly payload_schema: string;
  readonly module_version: string;
}

/**
 * Record: Validation OK
 */
export interface ValidationOkRecord extends ChronicleRecordBase {
  readonly event_type: 'VALIDATION_OK';
  readonly envelope_hash: string;
}

/**
 * Record: Validation Failed
 */
export interface ValidationFailedRecord extends ChronicleRecordBase {
  readonly event_type: 'VALIDATION_FAILED';
  readonly error_code: string;
  readonly error_message: string;
}

/**
 * Record: Policy OK
 */
export interface PolicyOkRecord extends ChronicleRecordBase {
  readonly event_type: 'POLICY_OK';
}

/**
 * Record: Policy Rejected
 */
export interface PolicyRejectedRecord extends ChronicleRecordBase {
  readonly event_type: 'POLICY_REJECTED';
  readonly policy_code: string;
  readonly reason: string;
}

/**
 * Record: Replay OK
 */
export interface ReplayOkRecord extends ChronicleRecordBase {
  readonly event_type: 'REPLAY_OK';
  readonly replay_key: string;
}

/**
 * Record: Replay Rejected
 */
export interface ReplayRejectedRecord extends ChronicleRecordBase {
  readonly event_type: 'REPLAY_REJECTED';
  readonly replay_key: string;
}

/**
 * Record: Handler Resolved
 */
export interface HandlerResolvedRecord extends ChronicleRecordBase {
  readonly event_type: 'HANDLER_RESOLVED';
  readonly handler_key: string;
}

/**
 * Record: Handler Not Found
 */
export interface HandlerNotFoundRecord extends ChronicleRecordBase {
  readonly event_type: 'HANDLER_NOT_FOUND';
  readonly lookup_key: string;
}

/**
 * Record: Execution Start
 */
export interface ExecutionStartRecord extends ChronicleRecordBase {
  readonly event_type: 'EXECUTION_START';
  readonly handler_key: string;
}

/**
 * Record: Execution OK
 */
export interface ExecutionOkRecord extends ChronicleRecordBase {
  readonly event_type: 'EXECUTION_OK';
  readonly duration_ms: number;
}

/**
 * Record: Execution Error
 */
export interface ExecutionErrorRecord extends ChronicleRecordBase {
  readonly event_type: 'EXECUTION_ERROR';
  readonly error_code: string;
  readonly duration_ms: number;
  readonly retryable: boolean;
}

/**
 * Record: Dispatch Complete
 */
export interface DispatchCompleteRecord extends ChronicleRecordBase {
  readonly event_type: 'DISPATCH_COMPLETE';
  readonly success: boolean;
  readonly total_duration_ms: number;
}

/**
 * Union de tous les records
 */
export type ChronicleRecord =
  | DispatchReceivedRecord
  | ValidationOkRecord
  | ValidationFailedRecord
  | PolicyOkRecord
  | PolicyRejectedRecord
  | ReplayOkRecord
  | ReplayRejectedRecord
  | HandlerResolvedRecord
  | HandlerNotFoundRecord
  | ExecutionStartRecord
  | ExecutionOkRecord
  | ExecutionErrorRecord
  | DispatchCompleteRecord;

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONICLE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface Chronicle
 */
export interface Chronicle {
  /** Append un record */
  append(record: ChronicleRecord): void;
  /** Snapshot de tous les records */
  snapshot(): ChronicleRecord[];
  /** Records pour un trace_id */
  forTrace(traceId: string): ChronicleRecord[];
  /** Records pour un message_id */
  forMessage(messageId: string): ChronicleRecord[];
  /** Nombre de records */
  size(): number;
  /** Clear tous les records */
  clear(): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY CHRONICLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chronicle en mémoire avec index
 */
export class InMemoryChronicle implements Chronicle {
  private readonly records: ChronicleRecord[] = [];
  private readonly byTrace = new Map<string, ChronicleRecord[]>();
  private readonly byMessage = new Map<string, ChronicleRecord[]>();
  private readonly maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  append(record: ChronicleRecord): void {
    // Eviction si nécessaire
    if (this.records.length >= this.maxSize) {
      const evicted = this.records.shift();
      if (evicted) {
        this.removeFromIndex(evicted);
      }
    }

    this.records.push(record);
    this.addToIndex(record);
  }

  snapshot(): ChronicleRecord[] {
    return [...this.records];
  }

  forTrace(traceId: string): ChronicleRecord[] {
    return [...(this.byTrace.get(traceId) ?? [])];
  }

  forMessage(messageId: string): ChronicleRecord[] {
    return [...(this.byMessage.get(messageId) ?? [])];
  }

  size(): number {
    return this.records.length;
  }

  clear(): void {
    this.records.length = 0;
    this.byTrace.clear();
    this.byMessage.clear();
  }

  private addToIndex(record: ChronicleRecord): void {
    // By trace
    let traceRecords = this.byTrace.get(record.trace_id);
    if (!traceRecords) {
      traceRecords = [];
      this.byTrace.set(record.trace_id, traceRecords);
    }
    traceRecords.push(record);

    // By message
    let msgRecords = this.byMessage.get(record.message_id);
    if (!msgRecords) {
      msgRecords = [];
      this.byMessage.set(record.message_id, msgRecords);
    }
    msgRecords.push(record);
  }

  private removeFromIndex(record: ChronicleRecord): void {
    const traceRecords = this.byTrace.get(record.trace_id);
    if (traceRecords) {
      const idx = traceRecords.indexOf(record);
      if (idx >= 0) traceRecords.splice(idx, 1);
      if (traceRecords.length === 0) this.byTrace.delete(record.trace_id);
    }

    const msgRecords = this.byMessage.get(record.message_id);
    if (msgRecords) {
      const idx = msgRecords.indexOf(record);
      if (idx >= 0) msgRecords.splice(idx, 1);
      if (msgRecords.length === 0) this.byMessage.delete(record.message_id);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONICLE WRITER — Helper pour construction de records
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Writer pour faciliter la création de records avec causalité
 */
export class ChronicleWriter {
  private recordCounter = 0;
  private readonly getNow: () => number;

  constructor(
    private readonly chronicle: Chronicle,
    clock: { now(): number } | { nowMs(): number }
  ) {
    // Support both clock interfaces
    if ('nowMs' in clock) {
      this.getNow = () => clock.nowMs();
    } else {
      this.getNow = () => clock.now();
    }
  }

  /**
   * Génère un ID de record unique
   */
  private nextRecordId(): string {
    return `rec-${++this.recordCounter}-${Date.now().toString(36)}`;
  }

  /**
   * Record: Dispatch reçu
   */
  dispatchReceived(
    env: NexusEnvelope
  ): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: null,
      event_type: 'DISPATCH_RECEIVED',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      target_module: env.target_module,
      payload_schema: env.payload_schema,
      module_version: env.module_version,
    });
    return recordId;
  }

  /**
   * Record: Validation OK
   */
  validationOk(
    env: NexusEnvelope,
    parentId: string,
    envelopeHash: string
  ): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'VALIDATION_OK',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      envelope_hash: envelopeHash,
    });
    return recordId;
  }

  /**
   * Record: Validation Failed
   */
  validationFailed(
    traceId: string,
    messageId: string,
    parentId: string | null,
    errorCode: string,
    errorMessage: string
  ): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'VALIDATION_FAILED',
      timestamp: this.getNow(),
      trace_id: traceId,
      message_id: messageId,
      error_code: errorCode,
      error_message: errorMessage,
    });
    return recordId;
  }

  /**
   * Record: Policy OK
   */
  policyOk(env: NexusEnvelope, parentId: string): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'POLICY_OK',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
    });
    return recordId;
  }

  /**
   * Record: Policy Rejected
   */
  policyRejected(
    env: NexusEnvelope,
    parentId: string,
    policyCode: string,
    reason: string
  ): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'POLICY_REJECTED',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      policy_code: policyCode,
      reason,
    });
    return recordId;
  }

  /**
   * Record: Replay OK
   */
  replayOk(env: NexusEnvelope, parentId: string): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'REPLAY_OK',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      replay_key: env.replay_protection_key,
    });
    return recordId;
  }

  /**
   * Record: Replay Rejected
   */
  replayRejected(env: NexusEnvelope, parentId: string): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'REPLAY_REJECTED',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      replay_key: env.replay_protection_key,
    });
    return recordId;
  }

  /**
   * Record: Handler Resolved
   */
  handlerResolved(env: NexusEnvelope, parentId: string, handlerKey: string): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'HANDLER_RESOLVED',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      handler_key: handlerKey,
    });
    return recordId;
  }

  /**
   * Record: Handler Not Found
   */
  handlerNotFound(env: NexusEnvelope, parentId: string, lookupKey: string): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'HANDLER_NOT_FOUND',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      lookup_key: lookupKey,
    });
    return recordId;
  }

  /**
   * Record: Execution Start
   */
  executionStart(env: NexusEnvelope, parentId: string, handlerKey: string): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'EXECUTION_START',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      handler_key: handlerKey,
    });
    return recordId;
  }

  /**
   * Record: Execution OK
   */
  executionOk(env: NexusEnvelope, parentId: string, durationMs: number): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'EXECUTION_OK',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      duration_ms: durationMs,
    });
    return recordId;
  }

  /**
   * Record: Execution Error
   */
  executionError(
    env: NexusEnvelope,
    parentId: string,
    errorCode: string,
    durationMs: number,
    retryable: boolean
  ): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'EXECUTION_ERROR',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      error_code: errorCode,
      duration_ms: durationMs,
      retryable,
    });
    return recordId;
  }

  /**
   * Record: Dispatch Complete
   */
  dispatchComplete(
    env: NexusEnvelope,
    parentId: string,
    success: boolean,
    totalDurationMs: number
  ): string {
    const recordId = this.nextRecordId();
    this.chronicle.append({
      record_id: recordId,
      parent_id: parentId,
      event_type: 'DISPATCH_COMPLETE',
      timestamp: this.getNow(),
      trace_id: env.trace_id,
      message_id: env.message_id,
      success,
      total_duration_ms: totalDurationMs,
    });
    return recordId;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createChronicle(maxSize?: number): InMemoryChronicle {
  return new InMemoryChronicle(maxSize);
}

export function createChronicleWriter(
  chronicle: Chronicle,
  clock: { now(): number }
): ChronicleWriter {
  return new ChronicleWriter(chronicle, clock);
}
