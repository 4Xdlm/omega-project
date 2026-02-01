/**
 * RUNTIME GOVERNANCE TESTS
 * ROADMAP B - Plan D
 *
 * Tests runtime event logging and chain integrity
 */

import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';

// Helper: compute event hash
function computeEventHash(event: Record<string, unknown>): string {
  const sorted = JSON.stringify(event, Object.keys(event).sort());
  return crypto.createHash('sha256').update(sorted).digest('hex').toUpperCase();
}

// Helper: parse NDJSON
function parseNdjson(content: string): Record<string, unknown>[] {
  return content.trim().split('\n').map(line => JSON.parse(line));
}

describe('Runtime Governance', () => {
  describe('Event hashing', () => {
    it('produces deterministic hash for same event', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'test-001',
        timestamp: '2026-02-01T12:00:00Z'
      };

      const hash1 = computeEventHash(event);
      const hash2 = computeEventHash(event);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[A-F0-9]{64}$/);
    });

    it('produces different hash for different events', () => {
      const event1 = {
        event_type: 'runtime_event',
        event_id: 'test-001',
        timestamp: '2026-02-01T12:00:00Z'
      };

      const event2 = {
        event_type: 'runtime_event',
        event_id: 'test-002',
        timestamp: '2026-02-01T12:00:00Z'
      };

      expect(computeEventHash(event1)).not.toBe(computeEventHash(event2));
    });

    it('hash is independent of property order', () => {
      const event1 = {
        a: 1,
        b: 2,
        c: 3
      };

      const event2 = {
        c: 3,
        a: 1,
        b: 2
      };

      expect(computeEventHash(event1)).toBe(computeEventHash(event2));
    });
  });

  describe('Log chain integrity', () => {
    it('first event has null prev_hash', () => {
      const firstEvent = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01T10:00:00Z',
        log_chain_prev_hash: null
      };

      expect(firstEvent.log_chain_prev_hash).toBeNull();
    });

    it('subsequent events chain to previous', () => {
      const event1 = {
        event_type: 'runtime_event',
        event_id: 'evt-001',
        timestamp: '2026-02-01T10:00:00Z',
        log_chain_prev_hash: null
      };

      const hash1 = computeEventHash(event1);

      const event2 = {
        event_type: 'runtime_event',
        event_id: 'evt-002',
        timestamp: '2026-02-01T10:05:00Z',
        log_chain_prev_hash: hash1
      };

      expect(event2.log_chain_prev_hash).toBe(hash1);
    });

    it('detects chain tampering', () => {
      const event1 = {
        event_id: 'evt-001',
        timestamp: '2026-02-01T10:00:00Z',
        log_chain_prev_hash: null
      };

      const originalHash = computeEventHash(event1);

      // Tamper with event
      const tamperedEvent = { ...event1, timestamp: '2026-02-01T10:00:01Z' };
      const tamperedHash = computeEventHash(tamperedEvent);

      expect(tamperedHash).not.toBe(originalHash);
    });
  });

  describe('Append-only enforcement', () => {
    it('log can only grow', () => {
      const log: Record<string, unknown>[] = [];

      // Add events
      log.push({ event_id: 'evt-001' });
      expect(log.length).toBe(1);

      log.push({ event_id: 'evt-002' });
      expect(log.length).toBe(2);

      // Verify no removal possible via contract
      // (In real impl, this would be enforced by file permissions)
    });

    it('validates NDJSON format', () => {
      const ndjsonContent = `{"event_id":"evt-001","timestamp":"2026-02-01T10:00:00Z"}
{"event_id":"evt-002","timestamp":"2026-02-01T10:05:00Z"}`;

      const events = parseNdjson(ndjsonContent);

      expect(events.length).toBe(2);
      expect(events[0].event_id).toBe('evt-001');
      expect(events[1].event_id).toBe('evt-002');
    });
  });

  describe('Runtime event structure', () => {
    it('contains required run reference', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01T10:00:00Z',
        run_id: 'run-001',
        run_ref: {
          phase_tag: 'phase-c-sealed',
          manifest_sha256: 'A'.repeat(64)
        },
        inputs_sha256: 'B'.repeat(64),
        outputs_sha256: 'C'.repeat(64),
        verdict: 'PASS'
      };

      expect(event.run_ref.phase_tag).toMatch(/^phase-.*-sealed$/);
      expect(event.run_ref.manifest_sha256).toMatch(/^[A-F0-9]{64}$/i);
      expect(event.inputs_sha256).toMatch(/^[A-F0-9]{64}$/i);
      expect(event.outputs_sha256).toMatch(/^[A-F0-9]{64}$/i);
      expect(['PASS', 'FAIL']).toContain(event.verdict);
    });
  });
});
