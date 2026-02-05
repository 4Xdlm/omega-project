/**
 * REPLAY ATTACK DETECTOR TESTS (CASE-005)
 * Phase G - Misuse Detection System
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Tests for detectReplayAttack function.
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure function)
 */

import { describe, it, expect } from 'vitest';
import {
  detectReplayAttack,
  type MisuseObservationSources,
  type MisuseInputEvent,
  type EventRegistry
} from '../../../../governance/misuse/index.js';

describe('detectReplayAttack (CASE-005)', () => {
  // Helper to create an input event
  function createInputEvent(
    eventId: string,
    timestamp: string,
    source: string = 'test-source'
  ): MisuseInputEvent {
    return {
      event_id: eventId,
      timestamp,
      source,
      payload: {}
    };
  }

  // Helper to create an event registry
  function createRegistry(
    knownIds: string[],
    minValidTimestamp: string
  ): EventRegistry {
    return {
      known_event_ids: knownIds,
      min_valid_timestamp: minValidTimestamp
    };
  }

  describe('duplicate event_id detection', () => {
    it('detects duplicate event_id', () => {
      const registry = createRegistry(['existing-event-1', 'existing-event-2'], '2024-01-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('existing-event-1', '2024-06-15T10:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events.length).toBe(1);
      expect(events[0].case_id).toBe('CASE-005');
      expect(events[0].pattern_id).toBe('RA-001');
      expect(events[0].detection_method).toBe('id_registry_check');
      expect(events[0].evidence.description).toContain('Duplicate event_id');
      expect(events[0].evidence.description).toContain('existing-event-1');
    });

    it('allows new event_id not in registry', () => {
      const registry = createRegistry(['existing-event-1'], '2024-01-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('new-event-123', '2024-06-15T10:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events).toHaveLength(0);
    });
  });

  describe('stale timestamp detection', () => {
    it('detects stale timestamp (before min_valid_timestamp)', () => {
      const registry = createRegistry([], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('event-1', '2024-05-15T10:00:00Z') // Before min_valid
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events.length).toBe(1);
      expect(events[0].case_id).toBe('CASE-005');
      expect(events[0].pattern_id).toBe('RA-002');
      expect(events[0].detection_method).toBe('timestamp_validation');
      expect(events[0].evidence.description).toContain('older than minimum valid timestamp');
    });

    it('allows timestamp at min_valid_timestamp boundary', () => {
      const registry = createRegistry([], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('event-1', '2024-06-01T00:00:00Z') // Exactly at min_valid
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events).toHaveLength(0);
    });

    it('allows timestamp after min_valid_timestamp', () => {
      const registry = createRegistry([], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('event-1', '2024-06-15T10:00:00Z') // After min_valid
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events).toHaveLength(0);
    });
  });

  describe('valid events', () => {
    it('returns empty for valid events', () => {
      const registry = createRegistry(['old-event-1', 'old-event-2'], '2024-01-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('new-event-1', '2024-06-15T10:00:00Z'),
        createInputEvent('new-event-2', '2024-06-16T10:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events).toHaveLength(0);
    });
  });

  describe('missing eventRegistry handling', () => {
    it('handles missing eventRegistry gracefully', () => {
      const inputEvents = [
        createInputEvent('event-1', '2024-06-15T10:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents
        // No eventRegistry
      };

      const events = detectReplayAttack(observations, null);

      expect(events).toHaveLength(0);
    });

    it('handles undefined eventRegistry', () => {
      const observations: MisuseObservationSources = {
        inputEvents: [createInputEvent('event-1', '2024-06-15T10:00:00Z')],
        eventRegistry: undefined
      };

      const events = detectReplayAttack(observations, null);

      expect(events).toHaveLength(0);
    });
  });

  describe('event structure validation', () => {
    it('all events have case_id CASE-005', () => {
      const registry = createRegistry(['dup-event'], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-05-01T00:00:00Z') // Both duplicate and stale
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      for (const event of events) {
        expect(event.case_id).toBe('CASE-005');
      }
    });

    it('all events have severity high', () => {
      const registry = createRegistry(['dup-event'], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-06-15T00:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      for (const event of events) {
        expect(event.severity).toBe('high');
      }
    });

    it('all events have auto_action_taken as none (INV-G-01)', () => {
      const registry = createRegistry(['dup-event'], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-05-01T00:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      for (const event of events) {
        expect(event.auto_action_taken).toBe('none');
      }
    });

    it('all events have requires_human_decision true (INV-G-02)', () => {
      const registry = createRegistry(['dup-event'], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-06-15T00:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      for (const event of events) {
        expect(event.requires_human_decision).toBe(true);
      }
    });

    it('events have valid event_type and schema_version', () => {
      const registry = createRegistry(['dup-event'], '2024-01-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-06-15T00:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events[0].event_type).toBe('misuse_event');
      expect(events[0].schema_version).toBe('1.0.0');
    });
  });

  describe('multiple violations', () => {
    it('detects both duplicate and stale for same event', () => {
      const registry = createRegistry(['dup-event'], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-05-01T00:00:00Z') // Both duplicate and stale
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events.length).toBe(2);
      expect(events.some(e => e.pattern_id === 'RA-001')).toBe(true); // Duplicate
      expect(events.some(e => e.pattern_id === 'RA-002')).toBe(true); // Stale
    });

    it('detects violations across multiple input events', () => {
      const registry = createRegistry(['dup-1', 'dup-2'], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-1', '2024-06-15T00:00:00Z'),
        createInputEvent('dup-2', '2024-06-15T00:00:00Z'),
        createInputEvent('new-event', '2024-05-01T00:00:00Z') // Only stale
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events.length).toBe(3);
      // 2 duplicates + 1 stale timestamp
      const duplicates = events.filter(e => e.pattern_id === 'RA-001');
      const stale = events.filter(e => e.pattern_id === 'RA-002');
      expect(duplicates.length).toBe(2);
      expect(stale.length).toBe(1);
    });
  });

  describe('evidence content', () => {
    it('evidence for duplicate includes event_id', () => {
      const registry = createRegistry(['duplicate-id-123'], '2024-01-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('duplicate-id-123', '2024-06-15T00:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events[0].evidence.description).toContain('duplicate-id-123');
      expect(events[0].evidence.samples.some(s => s.includes('duplicate-id-123'))).toBe(true);
    });

    it('evidence for stale includes timestamps', () => {
      const registry = createRegistry([], '2024-06-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('event-1', '2024-05-15T10:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events[0].evidence.description).toContain('2024-05-15T10:00:00Z');
      expect(events[0].evidence.description).toContain('2024-06-01T00:00:00Z');
    });
  });

  describe('log chain prev hash handling', () => {
    it('uses provided prevHash for log_chain_prev_hash', () => {
      const registry = createRegistry(['dup-event'], '2024-01-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-06-15T00:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, 'previous-hash-abc');

      expect(events[0].log_chain_prev_hash).toBe('previous-hash-abc');
    });

    it('handles null prevHash', () => {
      const registry = createRegistry(['dup-event'], '2024-01-01T00:00:00Z');
      const inputEvents = [
        createInputEvent('dup-event', '2024-06-15T00:00:00Z')
      ];

      const observations: MisuseObservationSources = {
        inputEvents,
        eventRegistry: registry
      };

      const events = detectReplayAttack(observations, null);

      expect(events[0].log_chain_prev_hash).toBeNull();
    });
  });
});
