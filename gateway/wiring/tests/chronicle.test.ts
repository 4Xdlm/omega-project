// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS CHRONICLE
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-ORCH-06: Chronicle Completeness
// @invariant INV-CHRON-01: Every Dispatch Has Terminal Record
// @invariant INV-CHRON-02: Causal Chain Integrity
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryChronicle,
  ChronicleWriter,
  createChronicle,
  createChronicleWriter,
} from '../src/orchestrator/chronicle.js';
import type { ChronicleRecord, NexusEnvelope } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createEnvelope(overrides: Partial<NexusEnvelope> = {}): NexusEnvelope {
  return {
    message_id: 'msg-001',
    trace_id: 'trace-001',
    timestamp: 1704499200000,
    source_module: 'gateway',
    target_module: 'memory',
    kind: 'command',
    payload_schema: 'memory.write',
    payload_version: 'v1.0.0',
    module_version: 'memory@3.21.0',
    replay_protection_key: 'rpk-001',
    payload: { key: 'test', value: 42 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS CHRONICLE
// ═══════════════════════════════════════════════════════════════════════════════

describe('InMemoryChronicle', () => {
  let chronicle: InMemoryChronicle;

  beforeEach(() => {
    chronicle = createChronicle();
  });

  describe('Basic operations', () => {
    it('appends records', () => {
      const record: ChronicleRecord = {
        record_id: 'rec-1',
        parent_id: null,
        event_type: 'DISPATCH_RECEIVED',
        timestamp: 1000,
        trace_id: 'trace-1',
        message_id: 'msg-1',
        target_module: 'memory',
        payload_schema: 'memory.write',
        module_version: 'memory@3.21.0',
      };

      chronicle.append(record);

      expect(chronicle.size()).toBe(1);
    });

    it('snapshot returns all records', () => {
      chronicle.append({
        record_id: 'rec-1',
        parent_id: null,
        event_type: 'DISPATCH_RECEIVED',
        timestamp: 1000,
        trace_id: 'trace-1',
        message_id: 'msg-1',
        target_module: 'memory',
        payload_schema: 'memory.write',
        module_version: 'memory@3.21.0',
      });

      chronicle.append({
        record_id: 'rec-2',
        parent_id: 'rec-1',
        event_type: 'VALIDATION_OK',
        timestamp: 1001,
        trace_id: 'trace-1',
        message_id: 'msg-1',
        envelope_hash: 'hash123',
      });

      const snapshot = chronicle.snapshot();

      expect(snapshot.length).toBe(2);
      expect(snapshot[0].event_type).toBe('DISPATCH_RECEIVED');
      expect(snapshot[1].event_type).toBe('VALIDATION_OK');
    });

    it('snapshot returns copy (immutable)', () => {
      chronicle.append({
        record_id: 'rec-1',
        parent_id: null,
        event_type: 'DISPATCH_RECEIVED',
        timestamp: 1000,
        trace_id: 'trace-1',
        message_id: 'msg-1',
        target_module: 'memory',
        payload_schema: 'memory.write',
        module_version: 'memory@3.21.0',
      });

      const snapshot1 = chronicle.snapshot();
      snapshot1.push({} as any);

      const snapshot2 = chronicle.snapshot();
      expect(snapshot2.length).toBe(1);
    });
  });

  describe('Index by trace_id', () => {
    it('forTrace returns records for specific trace', () => {
      chronicle.append({
        record_id: 'rec-1',
        parent_id: null,
        event_type: 'DISPATCH_RECEIVED',
        timestamp: 1000,
        trace_id: 'trace-A',
        message_id: 'msg-1',
        target_module: 'memory',
        payload_schema: 'memory.write',
        module_version: 'memory@3.21.0',
      });

      chronicle.append({
        record_id: 'rec-2',
        parent_id: null,
        event_type: 'DISPATCH_RECEIVED',
        timestamp: 1001,
        trace_id: 'trace-B',
        message_id: 'msg-2',
        target_module: 'query',
        payload_schema: 'query.search',
        module_version: 'query@3.21.0',
      });

      const traceA = chronicle.forTrace('trace-A');
      expect(traceA.length).toBe(1);
      expect(traceA[0].trace_id).toBe('trace-A');

      const traceB = chronicle.forTrace('trace-B');
      expect(traceB.length).toBe(1);
      expect(traceB[0].trace_id).toBe('trace-B');
    });

    it('forTrace returns empty for unknown trace', () => {
      const records = chronicle.forTrace('unknown');
      expect(records).toEqual([]);
    });
  });

  describe('Index by message_id', () => {
    it('forMessage returns records for specific message', () => {
      chronicle.append({
        record_id: 'rec-1',
        parent_id: null,
        event_type: 'DISPATCH_RECEIVED',
        timestamp: 1000,
        trace_id: 'trace-1',
        message_id: 'msg-A',
        target_module: 'memory',
        payload_schema: 'memory.write',
        module_version: 'memory@3.21.0',
      });

      chronicle.append({
        record_id: 'rec-2',
        parent_id: 'rec-1',
        event_type: 'VALIDATION_OK',
        timestamp: 1001,
        trace_id: 'trace-1',
        message_id: 'msg-A',
        envelope_hash: 'hash123',
      });

      const msgA = chronicle.forMessage('msg-A');
      expect(msgA.length).toBe(2);
    });
  });

  describe('Eviction', () => {
    it('evicts oldest records when maxSize reached', () => {
      const smallChronicle = new InMemoryChronicle(3);

      for (let i = 0; i < 5; i++) {
        smallChronicle.append({
          record_id: `rec-${i}`,
          parent_id: null,
          event_type: 'DISPATCH_RECEIVED',
          timestamp: 1000 + i,
          trace_id: `trace-${i}`,
          message_id: `msg-${i}`,
          target_module: 'memory',
          payload_schema: 'memory.write',
          module_version: 'memory@3.21.0',
        });
      }

      expect(smallChronicle.size()).toBe(3);

      const snapshot = smallChronicle.snapshot();
      expect(snapshot[0].record_id).toBe('rec-2');
      expect(snapshot[1].record_id).toBe('rec-3');
      expect(snapshot[2].record_id).toBe('rec-4');
    });
  });

  describe('clear', () => {
    it('removes all records and indexes', () => {
      chronicle.append({
        record_id: 'rec-1',
        parent_id: null,
        event_type: 'DISPATCH_RECEIVED',
        timestamp: 1000,
        trace_id: 'trace-1',
        message_id: 'msg-1',
        target_module: 'memory',
        payload_schema: 'memory.write',
        module_version: 'memory@3.21.0',
      });

      chronicle.clear();

      expect(chronicle.size()).toBe(0);
      expect(chronicle.forTrace('trace-1')).toEqual([]);
      expect(chronicle.forMessage('msg-1')).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS CHRONICLE WRITER
// ═══════════════════════════════════════════════════════════════════════════════

describe('ChronicleWriter', () => {
  let chronicle: InMemoryChronicle;
  let writer: ChronicleWriter;
  let clock: { now: () => number };
  let time: number;

  beforeEach(() => {
    chronicle = createChronicle();
    time = 1000;
    clock = { now: () => time++ };
    writer = createChronicleWriter(chronicle, clock);
  });

  describe('dispatchReceived', () => {
    it('writes DISPATCH_RECEIVED record', () => {
      const env = createEnvelope();
      const recordId = writer.dispatchReceived(env);

      expect(recordId).toMatch(/^rec-/);

      const records = chronicle.snapshot();
      expect(records.length).toBe(1);
      expect(records[0].event_type).toBe('DISPATCH_RECEIVED');
      expect(records[0].parent_id).toBeNull();
    });
  });

  describe('INV-CHRON-02: Causal chain', () => {
    it('links records via parent_id', () => {
      const env = createEnvelope();

      const receivedId = writer.dispatchReceived(env);
      const validationId = writer.validationOk(env, receivedId, 'hash123');
      const policyId = writer.policyOk(env, validationId);
      const replayId = writer.replayOk(env, policyId);
      const resolvedId = writer.handlerResolved(env, replayId, 'memory@3.21.0');
      const execStartId = writer.executionStart(env, resolvedId, 'memory@3.21.0');
      const execOkId = writer.executionOk(env, execStartId, 50);
      writer.dispatchComplete(env, execOkId, true, 100);

      const records = chronicle.snapshot();
      expect(records.length).toBe(8);

      // Verify chain
      expect(records[0].parent_id).toBeNull();
      expect(records[1].parent_id).toBe(records[0].record_id);
      expect(records[2].parent_id).toBe(records[1].record_id);
      expect(records[3].parent_id).toBe(records[2].record_id);
      expect(records[4].parent_id).toBe(records[3].record_id);
      expect(records[5].parent_id).toBe(records[4].record_id);
      expect(records[6].parent_id).toBe(records[5].record_id);
      expect(records[7].parent_id).toBe(records[6].record_id);
    });
  });

  describe('Error records', () => {
    it('writes VALIDATION_FAILED', () => {
      writer.validationFailed('trace-1', 'msg-1', null, 'VAL_ERR', 'Invalid');

      const records = chronicle.snapshot();
      expect(records[0].event_type).toBe('VALIDATION_FAILED');
      expect((records[0] as any).error_code).toBe('VAL_ERR');
    });

    it('writes POLICY_REJECTED', () => {
      const env = createEnvelope();
      const parentId = writer.dispatchReceived(env);
      writer.policyRejected(env, parentId, 'POL_BLOCKED', 'Not allowed');

      const records = chronicle.snapshot();
      expect(records[1].event_type).toBe('POLICY_REJECTED');
    });

    it('writes REPLAY_REJECTED', () => {
      const env = createEnvelope();
      const parentId = writer.dispatchReceived(env);
      writer.replayRejected(env, parentId);

      const records = chronicle.snapshot();
      expect(records[1].event_type).toBe('REPLAY_REJECTED');
    });

    it('writes HANDLER_NOT_FOUND', () => {
      const env = createEnvelope();
      const parentId = writer.dispatchReceived(env);
      writer.handlerNotFound(env, parentId, 'memory@3.21.0');

      const records = chronicle.snapshot();
      expect(records[1].event_type).toBe('HANDLER_NOT_FOUND');
    });

    it('writes EXECUTION_ERROR', () => {
      const env = createEnvelope();
      const parentId = writer.dispatchReceived(env);
      writer.executionError(env, parentId, 'EXEC_ERR', 50, true);

      const records = chronicle.snapshot();
      expect(records[1].event_type).toBe('EXECUTION_ERROR');
      expect((records[1] as any).retryable).toBe(true);
    });
  });

  describe('Dispatch complete', () => {
    it('records success with duration', () => {
      const env = createEnvelope();
      const parentId = writer.dispatchReceived(env);
      writer.dispatchComplete(env, parentId, true, 150);

      const records = chronicle.snapshot();
      const complete = records[1];
      expect(complete.event_type).toBe('DISPATCH_COMPLETE');
      expect((complete as any).success).toBe(true);
      expect((complete as any).total_duration_ms).toBe(150);
    });

    it('records failure with duration', () => {
      const env = createEnvelope();
      const parentId = writer.dispatchReceived(env);
      writer.dispatchComplete(env, parentId, false, 75);

      const records = chronicle.snapshot();
      const complete = records[1];
      expect((complete as any).success).toBe(false);
    });
  });
});
