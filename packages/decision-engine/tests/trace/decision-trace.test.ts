/**
 * @fileoverview DECISION_TRACE unit tests.
 * Target: 60 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDecisionTrace,
  DefaultDecisionTrace,
} from '../../src/trace/index.js';
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

describe('DECISION_TRACE', () => {
  describe('createDecisionTrace', () => {
    it('creates a trace instance', () => {
      const trace = createDecisionTrace();
      expect(trace).toBeDefined();
    });

    it('creates trace with custom clock', () => {
      let time = 5000;
      const trace = createDecisionTrace({ clock: () => time++ });
      const entry = trace.trace(createTestDecision());
      expect(entry.tracedAt).toBeGreaterThanOrEqual(5000);
    });

    it('creates trace with custom genesis hash', () => {
      const trace = new DefaultDecisionTrace({ genesisHash: 'custom-genesis' });
      expect(trace.getGenesisHash()).toBe('custom-genesis');
    });
  });

  describe('DefaultDecisionTrace', () => {
    let trace: DefaultDecisionTrace;

    beforeEach(() => {
      trace = new DefaultDecisionTrace();
    });

    describe('trace', () => {
      it('traces a decision', () => {
        const entry = trace.trace(createTestDecision());
        expect(entry).toBeDefined();
        expect(entry.decision.id).toBe('dec-001');
      });

      it('assigns unique ID', () => {
        const e1 = trace.trace(createTestDecision('a'));
        const e2 = trace.trace(createTestDecision('b'));
        expect(e1.id).not.toBe(e2.id);
      });

      it('computes hash', () => {
        const entry = trace.trace(createTestDecision());
        expect(entry.hash).toBeDefined();
        expect(entry.hash.length).toBeGreaterThan(0);
      });

      it('chains to previous hash', () => {
        const e1 = trace.trace(createTestDecision('a'));
        const e2 = trace.trace(createTestDecision('b'));

        expect(e1.previousHash).toBeNull();
        expect(e2.previousHash).toBe(e1.hash);
      });

      it('stores metadata', () => {
        const entry = trace.trace(createTestDecision(), { key: 'value' });
        expect(entry.metadata).toEqual({ key: 'value' });
      });

      it('entry is frozen', () => {
        const entry = trace.trace(createTestDecision());
        expect(Object.isFrozen(entry)).toBe(true);
      });

      it('records timestamp', () => {
        const entry = trace.trace(createTestDecision());
        expect(entry.tracedAt).toBeGreaterThan(0);
      });
    });

    describe('getTrace', () => {
      it('returns null for non-existent ID', () => {
        expect(trace.getTrace('does-not-exist')).toBeNull();
      });

      it('returns trace by ID', () => {
        const entry = trace.trace(createTestDecision());
        expect(trace.getTrace(entry.id)).not.toBeNull();
        expect(trace.getTrace(entry.id)?.id).toBe(entry.id);
      });
    });

    describe('getTraces', () => {
      it('returns empty array initially', () => {
        expect(trace.getTraces()).toEqual([]);
      });

      it('returns all traces without filter', () => {
        trace.trace(createTestDecision('a'));
        trace.trace(createTestDecision('b'));
        expect(trace.getTraces()).toHaveLength(2);
      });

      it('filters by since', () => {
        let time = 1000;
        const timedTrace = new DefaultDecisionTrace({ clock: () => time++ });
        const early = timedTrace.trace(createTestDecision('early'));
        const late = timedTrace.trace(createTestDecision('late'));

        // Filter for entries after the first one
        expect(timedTrace.getTraces({ since: early.tracedAt + 1 })).toHaveLength(1);
      });

      it('filters by until', () => {
        let time = 1000;
        const timedTrace = new DefaultDecisionTrace({ clock: () => time++ });
        const early = timedTrace.trace(createTestDecision('early'));
        const late = timedTrace.trace(createTestDecision('late'));

        // Filter for entries up to and including the first one
        expect(timedTrace.getTraces({ until: early.tracedAt })).toHaveLength(1);
      });

      it('filters by outcome', () => {
        trace.trace(createTestDecision('a'));
        trace.trace({
          ...createTestDecision('b'),
          outcome: 'BLOCKED',
        });

        expect(trace.getTraces({ outcome: 'ACCEPTED' })).toHaveLength(1);
      });

      it('limits results', () => {
        for (let i = 0; i < 10; i++) {
          trace.trace(createTestDecision(`dec-${i}`));
        }
        expect(trace.getTraces({ limit: 5 })).toHaveLength(5);
      });

      it('returns frozen array', () => {
        trace.trace(createTestDecision());
        const traces = trace.getTraces();
        expect(Object.isFrozen(traces)).toBe(true);
      });
    });

    describe('exportTraces', () => {
      it('exports as JSON', () => {
        trace.trace(createTestDecision());
        const json = trace.exportTraces('json');
        expect(() => JSON.parse(json)).not.toThrow();
      });

      it('exports as CSV', () => {
        trace.trace(createTestDecision());
        const csv = trace.exportTraces('csv');
        expect(csv).toContain('id,');
        expect(csv.split('\n').length).toBeGreaterThan(1);
      });

      it('throws for invalid format', () => {
        expect(() => trace.exportTraces('xml' as 'json')).toThrow();
      });

      it('empty trace exports correctly', () => {
        const json = trace.exportTraces('json');
        expect(JSON.parse(json)).toEqual([]);
      });
    });

    describe('getAll', () => {
      it('returns all traces', () => {
        trace.trace(createTestDecision('a'));
        trace.trace(createTestDecision('b'));
        expect(trace.getAll()).toHaveLength(2);
      });

      it('returns frozen array', () => {
        trace.trace(createTestDecision());
        expect(Object.isFrozen(trace.getAll())).toBe(true);
      });
    });

    describe('verifyChain', () => {
      it('returns true for empty trace', () => {
        expect(trace.verifyChain()).toBe(true);
      });

      it('returns true for valid chain', () => {
        trace.trace(createTestDecision('a'));
        trace.trace(createTestDecision('b'));
        trace.trace(createTestDecision('c'));
        expect(trace.verifyChain()).toBe(true);
      });

      it('verifies long chains', () => {
        for (let i = 0; i < 100; i++) {
          trace.trace(createTestDecision(`dec-${i}`));
        }
        expect(trace.verifyChain()).toBe(true);
      });
    });

    describe('verifyChainDetailed', () => {
      it('returns valid result for valid chain', () => {
        trace.trace(createTestDecision('a'));
        trace.trace(createTestDecision('b'));

        const result = trace.verifyChainDetailed();
        expect(result.valid).toBe(true);
        expect(result.entriesVerified).toBe(2);
        expect(result.firstInvalidId).toBeNull();
        expect(result.error).toBeNull();
      });
    });

    describe('size', () => {
      it('returns 0 for empty trace', () => {
        expect(trace.size()).toBe(0);
      });

      it('returns correct size', () => {
        trace.trace(createTestDecision('a'));
        trace.trace(createTestDecision('b'));
        expect(trace.size()).toBe(2);
      });
    });

    describe('getLastHash', () => {
      it('returns null for empty trace', () => {
        expect(trace.getLastHash()).toBeNull();
      });

      it('returns last entry hash', () => {
        const entry = trace.trace(createTestDecision());
        expect(trace.getLastHash()).toBe(entry.hash);
      });

      it('updates with each trace', () => {
        const e1 = trace.trace(createTestDecision('a'));
        expect(trace.getLastHash()).toBe(e1.hash);

        const e2 = trace.trace(createTestDecision('b'));
        expect(trace.getLastHash()).toBe(e2.hash);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles decision with empty matchedRules', () => {
      const trace = createDecisionTrace();
      const decision = {
        ...createTestDecision(),
        classification: {
          ...createTestClassification(),
          matchedRules: [],
        },
      };
      const entry = trace.trace(decision);
      expect(entry).toBeDefined();
    });

    it('handles decision with complex metadata', () => {
      const trace = createDecisionTrace();
      const metadata = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
      };
      const entry = trace.trace(createTestDecision(), metadata);
      expect(entry.metadata).toEqual(metadata);
    });

    it('handles many traces', () => {
      const trace = createDecisionTrace();
      for (let i = 0; i < 1000; i++) {
        trace.trace(createTestDecision(`dec-${i}`));
      }
      expect(trace.size()).toBe(1000);
      expect(trace.verifyChain()).toBe(true);
    });
  });
});
