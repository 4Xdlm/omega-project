/**
 * @fileoverview INCIDENT invariant tests.
 * Tests for INV-INCIDENT-01 through INV-INCIDENT-03
 * Target: 10 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createIncidentLog, DefaultIncidentLog } from '../../src/incident/index.js';
import type { RuntimeEvent } from '../../src/types/index.js';

function createTestEvent(id: string = 'evt-001'): RuntimeEvent {
  return {
    id,
    timestamp: 1000,
    type: 'VERDICT_OBSERVED',
    verdict: {
      id: 'v-001',
      timestamp: 999,
      source: 'ORACLE',
      verdict: 'REJECT',
      payload: {},
      hash: 'hash123',
    },
    metadata: { observedAt: 1000, hash: 'event-hash' },
  };
}

describe('INCIDENT Invariants', () => {
  describe('INV-INCIDENT-01: Append-only (never modify)', () => {
    it('cannot modify existing entries', () => {
      const log = createIncidentLog();
      const entry = log.logIncident(createTestEvent(), 'reason');

      // Entry should be frozen
      expect(Object.isFrozen(entry)).toBe(true);

      // Attempting to modify should throw or have no effect
      expect(() => {
        (entry as { reason: string }).reason = 'modified';
      }).toThrow();
    });

    it('new entries do not affect existing ones', () => {
      const log = createIncidentLog();
      const entry1 = log.logIncident(createTestEvent('a'), 'reason 1');
      log.logIncident(createTestEvent('b'), 'reason 2');

      expect(log.getIncident(entry1.id)?.reason).toBe('reason 1');
    });

    it('entries persist after many additions', () => {
      const log = createIncidentLog();
      const firstEntry = log.logIncident(createTestEvent('first'), 'first reason');

      for (let i = 0; i < 100; i++) {
        log.logIncident(createTestEvent(`evt-${i}`), `reason ${i}`);
      }

      expect(log.getIncident(firstEntry.id)?.reason).toBe('first reason');
    });
  });

  describe('INV-INCIDENT-02: Hash verifiable', () => {
    it('entries have valid hashes', () => {
      const log = createIncidentLog();
      const entry = log.logIncident(createTestEvent(), 'reason');
      expect(entry.hash).toBeDefined();
      expect(entry.hash.length).toBeGreaterThan(0);
    });

    it('verifyIntegrity validates all hashes', () => {
      const log = createIncidentLog();
      for (let i = 0; i < 10; i++) {
        log.logIncident(createTestEvent(`evt-${i}`), `reason ${i}`);
      }
      expect(log.verifyIntegrity()).toBe(true);
    });

    it('different entries have different hashes', () => {
      const log = createIncidentLog();
      const entry1 = log.logIncident(createTestEvent('a'), 'reason 1');
      const entry2 = log.logIncident(createTestEvent('b'), 'reason 2');
      expect(entry1.hash).not.toBe(entry2.hash);
    });
  });

  describe('INV-INCIDENT-03: Strict chronology', () => {
    it('entries are ordered by loggedAt', () => {
      let time = 1000;
      const log = new DefaultIncidentLog({ clock: () => time++ });

      log.logIncident(createTestEvent('a'), 'reason');
      log.logIncident(createTestEvent('b'), 'reason');
      log.logIncident(createTestEvent('c'), 'reason');

      const all = log.getAll();
      for (let i = 1; i < all.length; i++) {
        expect(all[i]!.loggedAt).toBeGreaterThan(all[i - 1]!.loggedAt);
      }
    });

    it('maintains chronology even with same timestamp input', () => {
      const log = new DefaultIncidentLog({ clock: () => 1000 });

      log.logIncident(createTestEvent('a'), 'reason');
      log.logIncident(createTestEvent('b'), 'reason');

      const all = log.getAll();
      expect(all[0]!.loggedAt).toBeLessThan(all[1]!.loggedAt);
    });

    it('getIncidents returns chronological order', () => {
      let time = 1000;
      const log = new DefaultIncidentLog({ clock: () => time++ });

      for (let i = 0; i < 10; i++) {
        log.logIncident(createTestEvent(`evt-${i}`), `reason ${i}`);
      }

      const incidents = log.getIncidents();
      for (let i = 1; i < incidents.length; i++) {
        expect(incidents[i]!.loggedAt).toBeGreaterThan(incidents[i - 1]!.loggedAt);
      }
    });
  });
});
