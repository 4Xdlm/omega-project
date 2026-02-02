/**
 * @fileoverview INCIDENT_LOG unit tests.
 * Target: 30 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createIncidentLog,
  DefaultIncidentLog,
  createInMemoryStorage,
} from '../../src/incident/index.js';
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

describe('INCIDENT_LOG', () => {
  describe('createIncidentLog', () => {
    it('creates an incident log instance', () => {
      const log = createIncidentLog();
      expect(log).toBeDefined();
    });

    it('creates log with custom clock', () => {
      let time = 5000;
      const log = createIncidentLog({ clock: () => time++ });
      const entry = log.logIncident(createTestEvent(), 'test reason');
      expect(entry.loggedAt).toBe(5000);
    });

    it('creates log with custom storage', () => {
      const storage = createInMemoryStorage();
      const log = createIncidentLog({}, storage);
      log.logIncident(createTestEvent(), 'test');
      expect(storage.loadAll()).toHaveLength(1);
    });
  });

  describe('DefaultIncidentLog', () => {
    let log: DefaultIncidentLog;

    beforeEach(() => {
      log = new DefaultIncidentLog();
    });

    describe('logIncident', () => {
      it('logs an incident', () => {
        const entry = log.logIncident(createTestEvent(), 'blocked for testing');
        expect(entry).toBeDefined();
        expect(entry.reason).toBe('blocked for testing');
      });

      it('assigns unique ID', () => {
        const e1 = log.logIncident(createTestEvent('a'), 'reason 1');
        const e2 = log.logIncident(createTestEvent('b'), 'reason 2');
        expect(e1.id).not.toBe(e2.id);
      });

      it('computes hash', () => {
        const entry = log.logIncident(createTestEvent(), 'reason');
        expect(entry.hash).toBeDefined();
        expect(entry.hash.length).toBeGreaterThan(0);
      });

      it('stores event reference', () => {
        const event = createTestEvent('specific');
        const entry = log.logIncident(event, 'reason');
        expect(entry.event.id).toBe('specific');
      });

      it('records timestamp', () => {
        const entry = log.logIncident(createTestEvent(), 'reason');
        expect(entry.loggedAt).toBeGreaterThan(0);
      });

      it('entry is frozen', () => {
        const entry = log.logIncident(createTestEvent(), 'reason');
        expect(Object.isFrozen(entry)).toBe(true);
      });
    });

    describe('getIncident', () => {
      it('returns null for non-existent ID', () => {
        expect(log.getIncident('does-not-exist')).toBeNull();
      });

      it('returns incident by ID', () => {
        const entry = log.logIncident(createTestEvent(), 'reason');
        expect(log.getIncident(entry.id)).not.toBeNull();
        expect(log.getIncident(entry.id)?.id).toBe(entry.id);
      });
    });

    describe('getIncidents', () => {
      it('returns empty array when no incidents', () => {
        expect(log.getIncidents()).toEqual([]);
      });

      it('returns all incidents without filter', () => {
        log.logIncident(createTestEvent('a'), 'reason 1');
        log.logIncident(createTestEvent('b'), 'reason 2');
        expect(log.getIncidents()).toHaveLength(2);
      });

      it('filters by since', () => {
        let time = 1000;
        const timedLog = new DefaultIncidentLog({ clock: () => time++ });
        timedLog.logIncident(createTestEvent('early'), 'reason');
        timedLog.logIncident(createTestEvent('late'), 'reason');

        expect(timedLog.getIncidents({ since: 1001 })).toHaveLength(1);
      });

      it('filters by until', () => {
        let time = 1000;
        const timedLog = new DefaultIncidentLog({ clock: () => time++ });
        timedLog.logIncident(createTestEvent('early'), 'reason');
        timedLog.logIncident(createTestEvent('late'), 'reason');

        expect(timedLog.getIncidents({ until: 1000 })).toHaveLength(1);
      });

      it('filters by sourceType', () => {
        const oracleEvent = createTestEvent('oracle');
        const deEvent = {
          ...createTestEvent('de'),
          verdict: { ...createTestEvent().verdict, source: 'DECISION_ENGINE' as const },
        };

        log.logIncident(oracleEvent, 'reason');
        log.logIncident(deEvent, 'reason');

        expect(log.getIncidents({ sourceType: 'ORACLE' })).toHaveLength(1);
      });

      it('returns frozen array', () => {
        log.logIncident(createTestEvent(), 'reason');
        const incidents = log.getIncidents();
        expect(Object.isFrozen(incidents)).toBe(true);
      });
    });

    describe('count', () => {
      it('returns 0 for empty log', () => {
        expect(log.count()).toBe(0);
      });

      it('returns correct count', () => {
        log.logIncident(createTestEvent('a'), 'reason');
        log.logIncident(createTestEvent('b'), 'reason');
        expect(log.count()).toBe(2);
      });

      it('respects filter', () => {
        let time = 1000;
        const timedLog = new DefaultIncidentLog({ clock: () => time++ });
        timedLog.logIncident(createTestEvent('a'), 'reason');
        timedLog.logIncident(createTestEvent('b'), 'reason');

        expect(timedLog.count({ since: 1001 })).toBe(1);
      });
    });

    describe('getAll', () => {
      it('returns all incidents', () => {
        log.logIncident(createTestEvent('a'), 'reason');
        log.logIncident(createTestEvent('b'), 'reason');
        expect(log.getAll()).toHaveLength(2);
      });

      it('returns in chronological order', () => {
        let time = 1000;
        const timedLog = new DefaultIncidentLog({ clock: () => time++ });
        timedLog.logIncident(createTestEvent('first'), 'reason');
        timedLog.logIncident(createTestEvent('second'), 'reason');

        const all = timedLog.getAll();
        expect(all[0]?.event.id).toBe('first');
        expect(all[1]?.event.id).toBe('second');
      });
    });

    describe('verifyIntegrity', () => {
      it('returns true for empty log', () => {
        expect(log.verifyIntegrity()).toBe(true);
      });

      it('returns true for valid entries', () => {
        log.logIncident(createTestEvent('a'), 'reason 1');
        log.logIncident(createTestEvent('b'), 'reason 2');
        expect(log.verifyIntegrity()).toBe(true);
      });

      it('verifies all entry hashes', () => {
        for (let i = 0; i < 10; i++) {
          log.logIncident(createTestEvent(`evt-${i}`), `reason ${i}`);
        }
        expect(log.verifyIntegrity()).toBe(true);
      });
    });

    describe('size', () => {
      it('returns 0 for empty log', () => {
        expect(log.size()).toBe(0);
      });

      it('returns correct size', () => {
        log.logIncident(createTestEvent('a'), 'reason');
        log.logIncident(createTestEvent('b'), 'reason');
        expect(log.size()).toBe(2);
      });
    });
  });
});
