/**
 * THRESHOLD GAMING DETECTOR TESTS (CASE-002)
 * Phase G — Tests for threshold gaming detection
 *
 * Tests: detectThresholdGaming pure function
 * Detector signature: (observations, prevHash) => MisuseEvent[]
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { detectThresholdGaming } from '../../../../governance/misuse/index.js';
import type {
  MisuseObservationSources,
  ThresholdHistoryEntry
} from '../../../../governance/misuse/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function makeThresholdEntry(
  value: number,
  threshold: number,
  timestamp: string = '2025-05-01T10:00:00Z'
): ThresholdHistoryEntry {
  return { timestamp, value, threshold };
}

function makeObservations(
  thresholdHistory: ThresholdHistoryEntry[]
): MisuseObservationSources {
  return { inputEvents: [], thresholdHistory };
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/detectThresholdGaming', () => {
  it('detects clustering near threshold (within 5%)', () => {
    // Threshold is 100, values at 96, 97, 98 are within 5% (95-105)
    const entries = [
      makeThresholdEntry(96, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(97, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(98, 100, '2025-05-01T10:02:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].case_id).toBe('CASE-002');
    expect(events[0].detection_method).toBe('threshold_proximity');
  });

  it('requires minimum 3 clustered values to trigger', () => {
    // Only 2 values near threshold - should not trigger
    const entries = [
      makeThresholdEntry(96, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(97, 100, '2025-05-01T10:01:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events).toHaveLength(0);
  });

  it('returns empty for values not near threshold', () => {
    // Values are more than 5% away from threshold
    const entries = [
      makeThresholdEntry(50, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(55, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(60, 100, '2025-05-01T10:02:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events).toHaveLength(0);
  });

  it('handles empty thresholdHistory', () => {
    const obs = makeObservations([]);

    const events = detectThresholdGaming(obs, null);

    expect(events).toHaveLength(0);
  });

  it('handles missing thresholdHistory', () => {
    const obs: MisuseObservationSources = { inputEvents: [] };

    const events = detectThresholdGaming(obs, null);

    expect(events).toHaveLength(0);
  });

  it('all events have correct case_id CASE-002', () => {
    const entries = [
      makeThresholdEntry(99, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(100, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(101, 100, '2025-05-01T10:02:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.case_id).toBe('CASE-002');
    }
  });

  it('all events have severity medium', () => {
    const entries = [
      makeThresholdEntry(95, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(96, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(97, 100, '2025-05-01T10:02:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.severity).toBe('medium');
    }
  });

  it('events have auto_action_taken as none (INV-G-01)', () => {
    const entries = [
      makeThresholdEntry(102, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(103, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(104, 100, '2025-05-01T10:02:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.auto_action_taken).toBe('none');
    }
  });

  it('events have requires_human_decision as true (INV-G-02)', () => {
    const entries = [
      makeThresholdEntry(99, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(99, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(99, 100, '2025-05-01T10:02:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.requires_human_decision).toBe(true);
    }
  });

  it('detects gaming for multiple different thresholds', () => {
    // Cluster near threshold 100 AND cluster near threshold 200
    const entries = [
      makeThresholdEntry(99, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(100, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(101, 100, '2025-05-01T10:02:00Z'),
      makeThresholdEntry(199, 200, '2025-05-01T10:03:00Z'),
      makeThresholdEntry(200, 200, '2025-05-01T10:04:00Z'),
      makeThresholdEntry(201, 200, '2025-05-01T10:05:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events.length).toBe(2);
  });

  it('evidence includes value proximity details', () => {
    const entries = [
      makeThresholdEntry(98, 100, '2025-05-01T10:00:00Z'),
      makeThresholdEntry(99, 100, '2025-05-01T10:01:00Z'),
      makeThresholdEntry(100, 100, '2025-05-01T10:02:00Z')
    ];
    const obs = makeObservations(entries);

    const events = detectThresholdGaming(obs, null);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].evidence.samples.length).toBeGreaterThan(0);
    expect(events[0].evidence.description).toContain('5%');
  });
});
