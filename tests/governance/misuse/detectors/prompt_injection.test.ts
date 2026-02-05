/**
 * PROMPT INJECTION DETECTOR TESTS (CASE-001)
 * Phase G — Tests for prompt injection detection
 *
 * Tests: detectPromptInjection pure function
 * Detector signature: (observations, prevHash) => MisuseEvent[]
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { detectPromptInjection } from '../../../../governance/misuse/index.js';
import type {
  MisuseObservationSources,
  MisuseInputEvent
} from '../../../../governance/misuse/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function makeInputEvent(
  payload: Record<string, unknown>,
  overrides: Partial<MisuseInputEvent> = {}
): MisuseInputEvent {
  return {
    event_id: 'EVT-001',
    timestamp: '2025-05-01T10:00:00Z',
    source: 'test-source',
    run_id: 'RUN-001',
    inputs_hash: 'abc123',
    payload,
    ...overrides
  };
}

function makeObservations(
  inputEvents: MisuseInputEvent[]
): MisuseObservationSources {
  return { inputEvents };
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/detectPromptInjection', () => {
  it('detects SQL injection pattern', () => {
    const payload = { query: "'; DROP TABLE users " };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].case_id).toBe('CASE-001');
    expect(events[0].pattern_id).toBe('PI-001');
    expect(events[0].evidence.description).toContain('SQL Injection');
  });

  it('detects script tag pattern', () => {
    const payload = { input: '<script>alert("xss")</script>' };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].case_id).toBe('CASE-001');
    expect(events[0].pattern_id).toBe('PI-002');
    expect(events[0].evidence.description).toContain('Script Tag Injection');
  });

  it('detects null byte pattern', () => {
    const payload = { filename: 'file.txt%00.exe' };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].case_id).toBe('CASE-001');
    expect(events[0].pattern_id).toBe('PI-003');
    expect(events[0].evidence.description).toContain('Null Byte Injection');
  });

  it('detects command injection', () => {
    const payload = { command: '; rm -rf /' };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].case_id).toBe('CASE-001');
    expect(events[0].pattern_id).toBe('PI-004');
    expect(events[0].evidence.description).toContain('Command Injection');
  });

  it('detects path traversal', () => {
    const payload = { path: '../../etc/passwd' };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].case_id).toBe('CASE-001');
    expect(events[0].pattern_id).toBe('PI-005');
    expect(events[0].evidence.description).toContain('Path Traversal');
  });

  it('returns empty array for clean input', () => {
    const payload = { name: 'John Doe', email: 'john@example.com' };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events).toHaveLength(0);
  });

  it('handles empty payload', () => {
    const payload = {};
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events).toHaveLength(0);
  });

  it('handles empty input events array', () => {
    const obs = makeObservations([]);

    const events = detectPromptInjection(obs, null);

    expect(events).toHaveLength(0);
  });

  it('all events have correct case_id CASE-001', () => {
    const payload = {
      a: "'; SELECT * FROM users ",
      b: '<script src="evil.js"></script>'
    };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.case_id).toBe('CASE-001');
    }
  });

  it('all events have severity high', () => {
    const payload = { input: "'; DROP TABLE test " };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.severity).toBe('high');
    }
  });

  it('events have auto_action_taken as none (INV-G-01)', () => {
    const payload = { input: '<script>bad()</script>' };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.auto_action_taken).toBe('none');
    }
  });

  it('events have requires_human_decision as true (INV-G-02)', () => {
    const payload = { input: '; cat /etc/shadow ' };
    const obs = makeObservations([makeInputEvent(payload)]);

    const events = detectPromptInjection(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.requires_human_decision).toBe(true);
    }
  });
});
