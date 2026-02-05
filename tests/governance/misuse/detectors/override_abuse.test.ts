/**
 * OVERRIDE ABUSE DETECTOR TESTS (CASE-003)
 * Phase G — Tests for override abuse detection
 *
 * Tests: detectOverrideAbuse pure function
 * Detector signature: (observations, prevHash) => MisuseEvent[]
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { detectOverrideAbuse } from '../../../../governance/misuse/index.js';
import type {
  MisuseObservationSources,
  OverrideRecord,
  DecisionRecord
} from '../../../../governance/misuse/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function makeOverrideRecord(id: number): OverrideRecord {
  return {
    override_id: `OVR-${id.toString().padStart(3, '0')}`,
    timestamp: '2025-05-01T10:00:00Z',
    decision_id: `DEC-${id.toString().padStart(3, '0')}`,
    approved_by: 'admin',
    reason: 'Manual override'
  };
}

function makeDecisionRecord(id: number, wasOverridden: boolean = false): DecisionRecord {
  return {
    decision_id: `DEC-${id.toString().padStart(3, '0')}`,
    timestamp: '2025-05-01T10:00:00Z',
    verdict: 'PASS',
    was_overridden: wasOverridden
  };
}

function makeObservations(
  overrideCount: number,
  decisionCount: number
): MisuseObservationSources {
  const overrideRecords: OverrideRecord[] = [];
  const decisionRecords: DecisionRecord[] = [];

  for (let i = 0; i < overrideCount; i++) {
    overrideRecords.push(makeOverrideRecord(i + 1));
  }

  for (let i = 0; i < decisionCount; i++) {
    decisionRecords.push(makeDecisionRecord(i + 1, i < overrideCount));
  }

  return { inputEvents: [], overrideRecords, decisionRecords };
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/detectOverrideAbuse', () => {
  it('detects override ratio > 10%', () => {
    // 12 overrides out of 100 decisions = 12% (above 10% threshold)
    const obs = makeObservations(12, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events.length).toBe(1);
    expect(events[0].case_id).toBe('CASE-003');
    expect(events[0].detection_method).toBe('ratio_counting');
  });

  it('returns empty when ratio <= 10%', () => {
    // 10 overrides out of 100 decisions = 10% (exactly at threshold)
    const obs = makeObservations(10, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events).toHaveLength(0);
  });

  it('returns empty when ratio is below 10%', () => {
    // 5 overrides out of 100 decisions = 5%
    const obs = makeObservations(5, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events).toHaveLength(0);
  });

  it('handles empty records', () => {
    const obs: MisuseObservationSources = {
      inputEvents: [],
      overrideRecords: [],
      decisionRecords: []
    };

    const events = detectOverrideAbuse(obs, null);

    expect(events).toHaveLength(0);
  });

  it('handles zero decisions gracefully', () => {
    const obs: MisuseObservationSources = {
      inputEvents: [],
      overrideRecords: [makeOverrideRecord(1)],
      decisionRecords: []
    };

    const events = detectOverrideAbuse(obs, null);

    // Cannot calculate ratio with 0 decisions - should return empty
    expect(events).toHaveLength(0);
  });

  it('handles missing overrideRecords', () => {
    const obs: MisuseObservationSources = {
      inputEvents: [],
      decisionRecords: [makeDecisionRecord(1)]
    };

    const events = detectOverrideAbuse(obs, null);

    expect(events).toHaveLength(0);
  });

  it('handles missing decisionRecords', () => {
    const obs: MisuseObservationSources = {
      inputEvents: [],
      overrideRecords: [makeOverrideRecord(1)]
    };

    const events = detectOverrideAbuse(obs, null);

    expect(events).toHaveLength(0);
  });

  it('all events have correct case_id CASE-003', () => {
    // 20 overrides out of 100 decisions = 20%
    const obs = makeObservations(20, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events.length).toBe(1);
    expect(events[0].case_id).toBe('CASE-003');
  });

  it('all events have severity medium', () => {
    // 15 overrides out of 100 decisions = 15%
    const obs = makeObservations(15, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events.length).toBe(1);
    expect(events[0].severity).toBe('medium');
  });

  it('events have auto_action_taken as none (INV-G-01)', () => {
    const obs = makeObservations(25, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events.length).toBe(1);
    expect(events[0].auto_action_taken).toBe('none');
  });

  it('events have requires_human_decision as true (INV-G-02)', () => {
    const obs = makeObservations(30, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events.length).toBe(1);
    expect(events[0].requires_human_decision).toBe(true);
  });

  it('evidence includes override count and ratio details', () => {
    const obs = makeObservations(15, 100);

    const events = detectOverrideAbuse(obs, null);

    expect(events.length).toBe(1);
    expect(events[0].evidence.description).toContain('15');
    expect(events[0].evidence.description).toContain('100');
    expect(events[0].evidence.evidence_refs).toContainEqual('override_count:15');
    expect(events[0].evidence.evidence_refs).toContainEqual('decision_count:100');
  });
});
