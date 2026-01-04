/**
 * OMEGA DECISION TRACE TESTS
 * ==========================
 * NASA-Grade L4 / DO-178C / AS9100D
 * 
 * Tests exhaustifs pour le système de traçabilité
 * 
 * @module decision_trace.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DecisionTrace,
  DecisionTraceBuilder,
  DecisionTraceStore,
  createTestTraceContext,
  quickTrace,
} from '../../src/hardening/decision_trace';

// ============================================================================
// INV-TRACE-01: TOUTE DÉCISION CRITIQUE EST TRACÉE
// ============================================================================

describe('INV-TRACE-01: Toute décision critique est tracée', () => {
  let store: DecisionTraceStore;

  beforeEach(() => {
    const context = createTestTraceContext();
    store = new DecisionTraceStore(context);
  });

  it('should record a simple trace', () => {
    const trace = store.createTrace()
      .setModule('TEST_MODULE')
      .setAction('TEST_ACTION')
      .setActor('TEST_ACTOR')
      .approve('Test approved');

    store.record(trace);

    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].module).toBe('TEST_MODULE');
  });

  it('should record multiple traces', () => {
    const trace1 = store.createTrace()
      .setModule('MODULE_A')
      .setAction('ACTION_1')
      .approve('OK');
    store.record(trace1);

    const trace2 = store.createTrace()
      .setModule('MODULE_B')
      .setAction('ACTION_2')
      .reject('DENIED');
    store.record(trace2);

    expect(store.getAll()).toHaveLength(2);
  });

  it('should capture all decision outcomes', () => {
    const approved = store.createTrace().setModule('M').approve('OK');
    store.record(approved);

    const rejected = store.createTrace().setModule('M').reject('DENIED');
    store.record(rejected);

    const pending = store.createTrace().setModule('M').pending('WAITING');
    store.record(pending);

    const error = store.createTrace().setModule('M').error('FAILED');
    store.record(error);

    const all = store.getAll();
    expect(all[0].outcome).toBe('APPROVED');
    expect(all[1].outcome).toBe('REJECTED');
    expect(all[2].outcome).toBe('PENDING');
    expect(all[3].outcome).toBe('ERROR');
  });
});

// ============================================================================
// INV-TRACE-02: TRACES IMMUABLES APRÈS CRÉATION
// ============================================================================

describe('INV-TRACE-02: Traces immuables après création', () => {
  let store: DecisionTraceStore;

  beforeEach(() => {
    const context = createTestTraceContext();
    store = new DecisionTraceStore(context);
  });

  it('should return frozen trace', () => {
    const trace = store.createTrace()
      .setModule('TEST')
      .approve('OK');

    expect(Object.isFrozen(trace)).toBe(true);
  });

  it('should return frozen inputs array', () => {
    const trace = store.createTrace()
      .setModule('TEST')
      .addInput('key1', 'value1')
      .approve('OK');

    expect(Object.isFrozen(trace.inputs)).toBe(true);
  });

  it('should return frozen invariants array', () => {
    const trace = store.createTrace()
      .setModule('TEST')
      .addInvariantCheck('INV-001', 'Test Invariant', true)
      .approve('OK');

    expect(Object.isFrozen(trace.invariantsChecked)).toBe(true);
  });

  it('should prevent modification of returned traces', () => {
    const trace = store.createTrace().setModule('TEST').approve('OK');
    store.record(trace);

    const all = store.getAll();
    expect(() => {
      (all as any).push({});
    }).toThrow();
  });

  it('should return copy of traces, not reference', () => {
    const trace = store.createTrace().setModule('TEST').approve('OK');
    store.record(trace);

    const all1 = store.getAll();
    const all2 = store.getAll();

    expect(all1).not.toBe(all2);
    expect(all1[0]).toBe(all2[0]); // Same trace objects
  });
});

// ============================================================================
// INV-TRACE-03: REJEU DÉTERMINISTE POSSIBLE
// ============================================================================

describe('INV-TRACE-03: Rejeu déterministe possible', () => {

  it('should produce identical traces for identical inputs', () => {
    const context1 = createTestTraceContext('2026-01-04T12:00:00.000Z');
    const context2 = createTestTraceContext('2026-01-04T12:00:00.000Z');

    const store1 = new DecisionTraceStore(context1);
    const store2 = new DecisionTraceStore(context2);

    const trace1 = store1.createTrace()
      .setModule('TEST')
      .setAction('ACTION')
      .setActor('ACTOR')
      .addInput('key', 'value')
      .approve('OK');

    const trace2 = store2.createTrace()
      .setModule('TEST')
      .setAction('ACTION')
      .setActor('ACTOR')
      .addInput('key', 'value')
      .approve('OK');

    expect(trace1.hash).toBe(trace2.hash);
  });

  it('should export replay format', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = store.createTrace()
      .setModule('TEST')
      .setAction('ACTION')
      .addInput('data', { foo: 'bar' })
      .approve('OK');
    store.record(trace);

    const replay = store.exportForReplay();
    const parsed = JSON.parse(replay);

    expect(parsed.version).toBe('1.0.0');
    expect(parsed.traces).toHaveLength(1);
    expect(parsed.traces[0].expectedOutcome).toBe('APPROVED');
    expect(parsed.traces[0].expectedHash).toBe(trace.hash);
  });

  it('should have consistent hash for same data across fresh contexts', () => {
    // Créer deux contextes IDENTIQUES (même timestamp, même compteur ID)
    const context1 = createTestTraceContext('2026-01-04T12:00:00.000Z');
    const context2 = createTestTraceContext('2026-01-04T12:00:00.000Z');
    
    const store1 = new DecisionTraceStore(context1);
    const store2 = new DecisionTraceStore(context2);

    // Créer des traces avec EXACTEMENT les mêmes paramètres
    const trace1 = store1.createTrace()
      .setModule('TEST')
      .setAction('SAME')
      .setActor('ACTOR')
      .approve('OK');

    const trace2 = store2.createTrace()
      .setModule('TEST')
      .setAction('SAME')
      .setActor('ACTOR')
      .approve('OK');

    // Même ID (compteur commence à 1 dans les deux cas)
    expect(trace1.id).toBe(trace2.id);
    // Même timestamp
    expect(trace1.timestamp).toBe(trace2.timestamp);
    // Même previousHash (null pour les deux)
    expect(trace1.previousHash).toBe(trace2.previousHash);
    // Donc même hash final
    expect(trace1.hash).toBe(trace2.hash);
  });
});

// ============================================================================
// INV-TRACE-04: HASH D'INTÉGRITÉ SUR CHAQUE TRACE
// ============================================================================

describe('INV-TRACE-04: Hash d\'intégrité sur chaque trace', () => {
  let store: DecisionTraceStore;

  beforeEach(() => {
    const context = createTestTraceContext();
    store = new DecisionTraceStore(context);
  });

  it('should generate hash for each trace', () => {
    const trace = store.createTrace()
      .setModule('TEST')
      .approve('OK');

    expect(trace.hash).toBeDefined();
    expect(trace.hash.length).toBe(16);
  });

  it('should link traces with previousHash', () => {
    const trace1 = store.createTrace().setModule('M').approve('OK');
    store.record(trace1);

    const trace2 = store.createTrace().setModule('M').approve('OK');
    store.record(trace2);

    expect(trace1.previousHash).toBeNull();
    expect(trace2.previousHash).toBe(trace1.hash);
  });

  it('should verify chain integrity', () => {
    const trace1 = store.createTrace().setModule('M').approve('OK');
    store.record(trace1);

    const trace2 = store.createTrace().setModule('M').approve('OK');
    store.record(trace2);

    const result = store.verifyChain();
    expect(result.valid).toBe(true);
  });

  it('should reject trace with wrong previousHash', () => {
    const trace1 = store.createTrace().setModule('M').approve('OK');
    store.record(trace1);

    // Créer une trace avec un mauvais previousHash
    const fakeTrace: DecisionTrace = {
      id: 'FAKE',
      timestamp: '2026-01-04T12:00:00.000Z',
      module: 'M',
      action: '',
      level: 'NORMAL',
      actor: '',
      inputs: [],
      invariantsChecked: [],
      outcome: 'APPROVED',
      reason: 'OK',
      durationMs: 1,
      hash: 'fakehash',
      previousHash: 'wronghash', // Mauvais hash
    };

    expect(() => store.record(fakeTrace)).toThrow('CHAIN_INTEGRITY_VIOLATION');
  });

  it('should reject first trace with non-null previousHash', () => {
    const fakeTrace: DecisionTrace = {
      id: 'FAKE',
      timestamp: '2026-01-04T12:00:00.000Z',
      module: 'M',
      action: '',
      level: 'NORMAL',
      actor: '',
      inputs: [],
      invariantsChecked: [],
      outcome: 'APPROVED',
      reason: 'OK',
      durationMs: 1,
      hash: 'fakehash',
      previousHash: 'shouldbenull', // Devrait être null
    };

    expect(() => store.record(fakeTrace)).toThrow('CHAIN_INTEGRITY_VIOLATION');
  });
});

// ============================================================================
// INV-TRACE-05: EXPORT FORENSIC COMPLET
// ============================================================================

describe('INV-TRACE-05: Export forensic complet', () => {
  let store: DecisionTraceStore;

  beforeEach(() => {
    const context = createTestTraceContext();
    store = new DecisionTraceStore(context);
  });

  it('should generate audit summary', () => {
    const trace1 = store.createTrace().setModule('MODULE_A').setLevel('CRITICAL').approve('OK');
    store.record(trace1);

    const trace2 = store.createTrace().setModule('MODULE_A').setLevel('NORMAL').reject('DENIED');
    store.record(trace2);

    const trace3 = store.createTrace().setModule('MODULE_B').setLevel('INFO').approve('OK');
    store.record(trace3);

    const summary = store.getAuditSummary();

    expect(summary.totalDecisions).toBe(3);
    expect(summary.approved).toBe(2);
    expect(summary.rejected).toBe(1);
    expect(summary.byModule['MODULE_A']).toBe(2);
    expect(summary.byModule['MODULE_B']).toBe(1);
    expect(summary.byLevel.CRITICAL).toBe(1);
    expect(summary.byLevel.NORMAL).toBe(1);
    expect(summary.byLevel.INFO).toBe(1);
    expect(summary.chainValid).toBe(true);
  });

  it('should export complete JSON', () => {
    const trace = store.createTrace()
      .setModule('TEST')
      .setAction('ACTION')
      .setActor('ACTOR')
      .setLevel('CRITICAL')
      .addInput('key', 'value')
      .addInvariantCheck('INV-001', 'Test', true)
      .approve('OK');
    store.record(trace);

    const json = store.exportJSON();
    const parsed = JSON.parse(json);

    expect(parsed.traces).toHaveLength(1);
    expect(parsed.summary.totalDecisions).toBe(1);
    expect(parsed.exportedAt).toBeDefined();
  });

  it('should filter by module', () => {
    store.record(store.createTrace().setModule('A').approve('OK'));
    store.record(store.createTrace().setModule('B').approve('OK'));
    store.record(store.createTrace().setModule('A').approve('OK'));

    const moduleA = store.getByModule('A');
    expect(moduleA).toHaveLength(2);
  });

  it('should filter by level', () => {
    store.record(store.createTrace().setLevel('CRITICAL').approve('OK'));
    store.record(store.createTrace().setLevel('NORMAL').approve('OK'));
    store.record(store.createTrace().setLevel('CRITICAL').approve('OK'));

    const critical = store.getByLevel('CRITICAL');
    expect(critical).toHaveLength(2);
  });

  it('should get rejected decisions', () => {
    store.record(store.createTrace().approve('OK'));
    store.record(store.createTrace().reject('DENIED'));
    store.record(store.createTrace().approve('OK'));

    const rejected = store.getRejected();
    expect(rejected).toHaveLength(1);
    expect(rejected[0].outcome).toBe('REJECTED');
  });

  it('should get by ID', () => {
    const trace = store.createTrace().setModule('TEST').approve('OK');
    store.record(trace);

    const found = store.getById(trace.id);
    expect(found).toBe(trace);
  });
});

// ============================================================================
// BUILDER TESTS
// ============================================================================

describe('DecisionTraceBuilder', () => {

  it('should capture all input values', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = store.createTrace()
      .addInput('string', 'hello')
      .addInput('number', 42)
      .addInput('object', { foo: 'bar' })
      .addInput('array', [1, 2, 3])
      .approve('OK');

    expect(trace.inputs).toHaveLength(4);
    expect(trace.inputs[0].key).toBe('string');
    expect(trace.inputs[0].value).toBe('hello');
    expect(trace.inputs[1].value).toBe(42);
  });

  it('should hash each input separately', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = store.createTrace()
      .addInput('a', 'value1')
      .addInput('b', 'value2')
      .approve('OK');

    expect(trace.inputs[0].hash).toBeDefined();
    expect(trace.inputs[1].hash).toBeDefined();
    expect(trace.inputs[0].hash).not.toBe(trace.inputs[1].hash);
  });

  it('should capture invariant checks', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = store.createTrace()
      .addInvariantCheck('INV-001', 'First Invariant', true)
      .addInvariantCheck('INV-002', 'Second Invariant', false, 'Failed validation')
      .approve('OK');

    expect(trace.invariantsChecked).toHaveLength(2);
    expect(trace.invariantsChecked[0].passed).toBe(true);
    expect(trace.invariantsChecked[1].passed).toBe(false);
    expect(trace.invariantsChecked[1].details).toBe('Failed validation');
  });

  it('should set all properties correctly', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = store.createTrace()
      .setModule('MY_MODULE')
      .setAction('MY_ACTION')
      .setActor('MY_ACTOR')
      .setLevel('IRREVERSIBLE')
      .approve('All good');

    expect(trace.module).toBe('MY_MODULE');
    expect(trace.action).toBe('MY_ACTION');
    expect(trace.actor).toBe('MY_ACTOR');
    expect(trace.level).toBe('IRREVERSIBLE');
    expect(trace.outcome).toBe('APPROVED');
    expect(trace.reason).toBe('All good');
  });
});

// ============================================================================
// QUICK TRACE HELPER
// ============================================================================

describe('quickTrace helper', () => {

  it('should create approved trace', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = quickTrace(store, 'MODULE', 'ACTION', 'APPROVED', 'Quick OK');
    store.record(trace);

    expect(trace.outcome).toBe('APPROVED');
    expect(trace.module).toBe('MODULE');
  });

  it('should create rejected trace', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = quickTrace(store, 'MODULE', 'ACTION', 'REJECTED', 'Quick DENIED');
    store.record(trace);

    expect(trace.outcome).toBe('REJECTED');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge cases', () => {

  it('should handle empty store', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    expect(store.getAll()).toHaveLength(0);
    expect(store.verifyChain().valid).toBe(true);
    
    const summary = store.getAuditSummary();
    expect(summary.totalDecisions).toBe(0);
  });

  it('should handle large number of traces', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    for (let i = 0; i < 100; i++) {
      const trace = store.createTrace()
        .setModule(`MODULE_${i % 5}`)
        .approve(`Trace ${i}`);
      store.record(trace);
    }

    expect(store.getAll()).toHaveLength(100);
    expect(store.verifyChain().valid).toBe(true);
  });

  it('should handle special characters in inputs', () => {
    const context = createTestTraceContext();
    const store = new DecisionTraceStore(context);

    const trace = store.createTrace()
      .addInput('unicode', '日本語 🎉')
      .addInput('quotes', '"hello" \'world\'')
      .addInput('newlines', 'line1\nline2')
      .approve('OK');
    store.record(trace);

    expect(trace.inputs[0].value).toBe('日本語 🎉');
    expect(store.verifyChain().valid).toBe(true);
  });
});
