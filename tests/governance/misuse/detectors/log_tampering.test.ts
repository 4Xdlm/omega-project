/**
 * LOG TAMPERING DETECTOR TESTS (CASE-004)
 * Phase G - Misuse Detection System
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Tests for detectLogTampering function.
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure function)
 */

import { describe, it, expect } from 'vitest';
import {
  detectLogTampering,
  type MisuseObservationSources,
  type LogChainEntry
} from '../../../../governance/misuse/index.js';

describe('detectLogTampering (CASE-004)', () => {
  // Helper to create a valid log chain entry
  function createLogEntry(
    entryId: string,
    contentHash: string,
    prevHash: string | null,
    timestamp?: string
  ): LogChainEntry {
    return {
      entry_id: entryId,
      timestamp: timestamp ?? new Date().toISOString(),
      content_hash: contentHash,
      prev_hash: prevHash
    };
  }

  describe('hash chain break detection', () => {
    it('detects hash chain break', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH'), // Break: expected hash-A
        createLogEntry('entry-3', 'hash-C', 'hash-B')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events.length).toBe(1);
      expect(events[0].case_id).toBe('CASE-004');
      expect(events[0].evidence.description).toContain('Hash chain break');
      expect(events[0].evidence.description).toContain('index 1');
    });

    it('returns empty for valid chain', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'hash-A'),
        createLogEntry('entry-3', 'hash-C', 'hash-B')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events).toHaveLength(0);
    });

    it('handles single entry chain', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null)
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events).toHaveLength(0);
    });

    it('handles empty logChain', () => {
      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain: []
      };

      const events = detectLogTampering(observations, null);

      expect(events).toHaveLength(0);
    });

    it('handles missing logChain (undefined)', () => {
      const observations: MisuseObservationSources = {
        inputEvents: []
      };

      const events = detectLogTampering(observations, null);

      expect(events).toHaveLength(0);
    });

    it('multiple breaks create multiple events', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-1'), // Break at index 1
        createLogEntry('entry-3', 'hash-C', 'hash-B'),
        createLogEntry('entry-4', 'hash-D', 'WRONG-2')  // Break at index 3
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events.length).toBe(2);
      expect(events[0].evidence.description).toContain('index 1');
      expect(events[1].evidence.description).toContain('index 3');
    });
  });

  describe('event structure validation', () => {
    it('all events have case_id CASE-004', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      for (const event of events) {
        expect(event.case_id).toBe('CASE-004');
      }
    });

    it('all events have severity critical', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      for (const event of events) {
        expect(event.severity).toBe('critical');
      }
    });

    it('all events have auto_action_taken as none (INV-G-01)', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-1'),
        createLogEntry('entry-3', 'hash-C', 'WRONG-2')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      for (const event of events) {
        expect(event.auto_action_taken).toBe('none');
      }
    });

    it('all events have requires_human_decision true (INV-G-02)', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      for (const event of events) {
        expect(event.requires_human_decision).toBe(true);
      }
    });

    it('events have valid event_type and schema_version', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events[0].event_type).toBe('misuse_event');
      expect(events[0].schema_version).toBe('1.0.0');
    });

    it('events have detection_method hash_chain_verification', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events[0].detection_method).toBe('hash_chain_verification');
    });
  });

  describe('evidence content', () => {
    it('evidence contains entry IDs', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-001', 'hash-A', null),
        createLogEntry('entry-002', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events[0].evidence.description).toContain('entry-002');
      expect(events[0].evidence.description).toContain('entry-001');
    });

    it('evidence contains expected vs actual hash', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'expected-hash', null),
        createLogEntry('entry-2', 'hash-B', 'actual-wrong-hash')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events[0].evidence.description).toContain('expected-hash');
      expect(events[0].evidence.description).toContain('actual-wrong-hash');
    });

    it('evidence_refs include break index', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      const refs = events[0].evidence.evidence_refs;
      expect(refs.some(ref => ref.includes('break_index:1'))).toBe(true);
    });
  });

  describe('log chain prev hash handling', () => {
    it('first event uses provided prevHash', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-HASH')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, 'previous-chain-hash');

      expect(events[0].log_chain_prev_hash).toBe('previous-chain-hash');
    });

    it('subsequent events chain to previous event_id', () => {
      const logChain: LogChainEntry[] = [
        createLogEntry('entry-1', 'hash-A', null),
        createLogEntry('entry-2', 'hash-B', 'WRONG-1'),
        createLogEntry('entry-3', 'hash-C', 'hash-B'),
        createLogEntry('entry-4', 'hash-D', 'WRONG-2')
      ];

      const observations: MisuseObservationSources = {
        inputEvents: [],
        logChain
      };

      const events = detectLogTampering(observations, null);

      expect(events.length).toBe(2);
      // Second event should chain to first event's ID
      expect(events[1].log_chain_prev_hash).toBe(events[0].event_id);
    });
  });
});
