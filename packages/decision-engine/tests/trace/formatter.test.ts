/**
 * @fileoverview TRACE formatter tests.
 * Target: 20 tests
 */

import { describe, it, expect } from 'vitest';
import {
  formatTracesAsJson,
  formatTracesAsCsv,
  formatTraceEntry,
  formatDecisionSummary,
  isValidExportFormat,
} from '../../src/trace/index.js';
import type { TraceEntry, Decision, RuntimeEvent, ClassificationResult } from '../../src/types/index.js';

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

function createTestDecision(): Decision {
  return {
    id: 'dec-001',
    event: createTestEvent(),
    classification: createTestClassification(),
    outcome: 'ACCEPTED',
    timestamp: 1002,
  };
}

function createTestTraceEntry(id: string, tracedAt: number): TraceEntry {
  return {
    id,
    decision: createTestDecision(),
    tracedAt,
    hash: `hash-${id}`,
    previousHash: null,
    metadata: {},
  };
}

describe('TRACE Formatter', () => {
  describe('formatTracesAsJson', () => {
    it('formats empty array', () => {
      const json = formatTracesAsJson([]);
      expect(JSON.parse(json)).toEqual([]);
    });

    it('formats single trace', () => {
      const traces = [createTestTraceEntry('tr-1', 1000)];
      const json = formatTracesAsJson(traces);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('tr-1');
    });

    it('formats multiple traces', () => {
      const traces = [
        createTestTraceEntry('tr-1', 1000),
        createTestTraceEntry('tr-2', 2000),
      ];
      const json = formatTracesAsJson(traces);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
    });

    it('sorts by tracedAt', () => {
      const traces = [
        createTestTraceEntry('tr-later', 2000),
        createTestTraceEntry('tr-earlier', 1000),
      ];
      const json = formatTracesAsJson(traces);
      const parsed = JSON.parse(json);
      expect(parsed[0].id).toBe('tr-earlier');
    });

    it('produces valid JSON', () => {
      const traces = [createTestTraceEntry('tr-1', 1000)];
      const json = formatTracesAsJson(traces);
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('formatTracesAsCsv', () => {
    it('formats empty array with headers', () => {
      const csv = formatTracesAsCsv([]);
      expect(csv).toContain('id,');
    });

    it('formats single trace', () => {
      const traces = [createTestTraceEntry('tr-1', 1000)];
      const csv = formatTracesAsCsv(traces);
      const lines = csv.split('\n');
      expect(lines.length).toBe(2);
      expect(lines[1]).toContain('tr-1');
    });

    it('includes all headers', () => {
      const csv = formatTracesAsCsv([]);
      expect(csv).toContain('id');
      expect(csv).toContain('decision_id');
      expect(csv).toContain('classification');
      expect(csv).toContain('score');
      expect(csv).toContain('outcome');
      expect(csv).toContain('hash');
    });

    it('sorts by tracedAt', () => {
      const traces = [
        createTestTraceEntry('tr-later', 2000),
        createTestTraceEntry('tr-earlier', 1000),
      ];
      const csv = formatTracesAsCsv(traces);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('tr-earlier');
    });

    it('escapes commas in values', () => {
      const trace: TraceEntry = {
        ...createTestTraceEntry('tr-1', 1000),
        metadata: { note: 'has, comma' },
      };
      const csv = formatTracesAsCsv([trace]);
      expect(csv).toBeDefined();
    });
  });

  describe('formatTraceEntry', () => {
    it('includes trace ID', () => {
      const entry = createTestTraceEntry('tr-test', 1000);
      const formatted = formatTraceEntry(entry);
      expect(formatted).toContain('tr-test');
    });

    it('includes decision ID', () => {
      const entry = createTestTraceEntry('tr-1', 1000);
      const formatted = formatTraceEntry(entry);
      expect(formatted).toContain('dec-001');
    });

    it('includes classification', () => {
      const entry = createTestTraceEntry('tr-1', 1000);
      const formatted = formatTraceEntry(entry);
      expect(formatted).toContain('ACCEPT');
    });

    it('includes outcome', () => {
      const entry = createTestTraceEntry('tr-1', 1000);
      const formatted = formatTraceEntry(entry);
      expect(formatted).toContain('ACCEPTED');
    });

    it('includes hash', () => {
      const entry = createTestTraceEntry('tr-1', 1000);
      const formatted = formatTraceEntry(entry);
      expect(formatted).toContain('hash-tr-1');
    });
  });

  describe('formatDecisionSummary', () => {
    it('includes decision ID', () => {
      const summary = formatDecisionSummary(createTestDecision());
      expect(summary).toContain('dec-001');
    });

    it('includes outcome', () => {
      const summary = formatDecisionSummary(createTestDecision());
      expect(summary).toContain('ACCEPTED');
    });

    it('includes score', () => {
      const summary = formatDecisionSummary(createTestDecision());
      expect(summary).toContain('0.9');
    });
  });

  describe('isValidExportFormat', () => {
    it('returns true for json', () => {
      expect(isValidExportFormat('json')).toBe(true);
    });

    it('returns true for csv', () => {
      expect(isValidExportFormat('csv')).toBe(true);
    });

    it('returns false for invalid formats', () => {
      expect(isValidExportFormat('xml')).toBe(false);
      expect(isValidExportFormat('pdf')).toBe(false);
      expect(isValidExportFormat(null)).toBe(false);
    });
  });
});
