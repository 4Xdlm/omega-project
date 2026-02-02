/**
 * @fileoverview TRACE invariant tests.
 * Tests for INV-TRACE-01 through INV-TRACE-03
 * Target: 20 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDecisionTrace, DefaultDecisionTrace } from '../../src/trace/index.js';
import type { Decision, RuntimeEvent, ClassificationResult } from '../../src/types/index.js';

function createTestEvent(): RuntimeEvent {
  return {
    id: 'evt-001',
    timestamp: 1000,
    type: 'VERDICT_OBSERVED',
    verdict: {
      id: 'v-001',
      timestamp: 999,
      source: 'ORACLE',
      verdict: 'ACCEPT',
      payload: {},
      hash: 'hash123',
    },
    metadata: { observedAt: 1000, hash: 'event-hash' },
  };
}

function createTestClassification(): ClassificationResult {
  return {
    event: createTestEvent(),
    classification: 'ACCEPT',
    score: 0.9,
    matchedRules: ['rule-1'],
    reasoning: 'Test reasoning',
    timestamp: 1001,
  };
}

function createTestDecision(id: string = 'dec-001'): Decision {
  return {
    id,
    event: createTestEvent(),
    classification: createTestClassification(),
    outcome: 'ACCEPTED',
    timestamp: 1002,
  };
}

describe('TRACE Invariants', () => {
  describe('INV-TRACE-01: All decisions traced', () => {
    it('trace returns entry for every decision', () => {
      const trace = createDecisionTrace();
      const decisions = [
        createTestDecision('a'),
        createTestDecision('b'),
        createTestDecision('c'),
      ];

      const entries = decisions.map(d => trace.trace(d));

      expect(entries).toHaveLength(3);
      entries.forEach((entry, i) => {
        expect(entry.decision.id).toBe(decisions[i]?.id);
      });
    });

    it('all traced decisions are retrievable', () => {
      const trace = createDecisionTrace();

      for (let i = 0; i < 50; i++) {
        trace.trace(createTestDecision(`dec-${i}`));
      }

      expect(trace.size()).toBe(50);
      expect(trace.getAll()).toHaveLength(50);
    });

    it('each decision gets unique trace entry', () => {
      const trace = createDecisionTrace();
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const entry = trace.trace(createTestDecision(`dec-${i}`));
        ids.add(entry.id);
      }

      expect(ids.size).toBe(100);
    });

    it('decision data is preserved in trace', () => {
      const trace = createDecisionTrace();
      const decision: Decision = {
        ...createTestDecision(),
        outcome: 'BLOCKED',
      };

      const entry = trace.trace(decision);

      expect(entry.decision.outcome).toBe('BLOCKED');
      expect(entry.decision.classification.classification).toBe('ACCEPT');
    });
  });

  describe('INV-TRACE-02: Hash chained (merkle-style)', () => {
    it('first entry has null previousHash', () => {
      const trace = createDecisionTrace();
      const entry = trace.trace(createTestDecision());
      expect(entry.previousHash).toBeNull();
    });

    it('subsequent entries chain to previous', () => {
      const trace = createDecisionTrace();
      const e1 = trace.trace(createTestDecision('a'));
      const e2 = trace.trace(createTestDecision('b'));
      const e3 = trace.trace(createTestDecision('c'));

      expect(e2.previousHash).toBe(e1.hash);
      expect(e3.previousHash).toBe(e2.hash);
    });

    it('chain is verifiable', () => {
      const trace = createDecisionTrace();

      for (let i = 0; i < 50; i++) {
        trace.trace(createTestDecision(`dec-${i}`));
      }

      expect(trace.verifyChain()).toBe(true);
    });

    it('each hash is unique', () => {
      const trace = createDecisionTrace();
      const hashes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const entry = trace.trace(createTestDecision(`dec-${i}`));
        hashes.add(entry.hash);
      }

      expect(hashes.size).toBe(100);
    });

    it('verifyChainDetailed provides full verification', () => {
      const trace = createDecisionTrace();

      for (let i = 0; i < 10; i++) {
        trace.trace(createTestDecision(`dec-${i}`));
      }

      const result = trace.verifyChainDetailed();
      expect(result.valid).toBe(true);
      expect(result.entriesVerified).toBe(10);
      expect(result.firstInvalidId).toBeNull();
      expect(result.error).toBeNull();
    });

    it('getLastHash tracks chain head', () => {
      const trace = createDecisionTrace();

      expect(trace.getLastHash()).toBeNull();

      const e1 = trace.trace(createTestDecision('a'));
      expect(trace.getLastHash()).toBe(e1.hash);

      const e2 = trace.trace(createTestDecision('b'));
      expect(trace.getLastHash()).toBe(e2.hash);
    });
  });

  describe('INV-TRACE-03: Export reproducible', () => {
    it('JSON export is deterministic', () => {
      const trace = createDecisionTrace();
      trace.trace(createTestDecision('a'));
      trace.trace(createTestDecision('b'));

      const export1 = trace.exportTraces('json');
      const export2 = trace.exportTraces('json');

      expect(export1).toBe(export2);
    });

    it('CSV export is deterministic', () => {
      const trace = createDecisionTrace();
      trace.trace(createTestDecision('a'));
      trace.trace(createTestDecision('b'));

      const export1 = trace.exportTraces('csv');
      const export2 = trace.exportTraces('csv');

      expect(export1).toBe(export2);
    });

    it('export sorts by tracedAt', () => {
      let time = 1000;
      const trace = new DefaultDecisionTrace({ clock: () => time++ });

      trace.trace(createTestDecision('first'));
      trace.trace(createTestDecision('second'));

      const json = trace.exportTraces('json');
      const parsed = JSON.parse(json);

      expect(parsed[0].decision.id).toBe('first');
      expect(parsed[1].decision.id).toBe('second');
    });

    it('JSON export can be re-parsed', () => {
      const trace = createDecisionTrace();
      trace.trace(createTestDecision());

      const json = trace.exportTraces('json');
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBeDefined();
      expect(parsed[0].hash).toBeDefined();
    });

    it('CSV export has consistent structure', () => {
      const trace = createDecisionTrace();
      trace.trace(createTestDecision('a'));
      trace.trace(createTestDecision('b'));

      const csv = trace.exportTraces('csv');
      const lines = csv.split('\n');

      // All lines should have same number of columns
      const columnCounts = lines.map(line => line.split(',').length);
      expect(new Set(columnCounts).size).toBe(1);
    });
  });
});
