/**
 * OMEGA Forge — Dead Zone Detection Tests
 * Phase C.5 — 10 tests
 */

import { describe, it, expect } from 'vitest';
import { detectDeadZones } from '../../src/diagnosis/dead-zones.js';
import { makeState14D, makeOmega, DEFAULT_F5_CONFIG } from '../fixtures.js';
import type { ParagraphEmotionState, F5Config } from '../../src/types.js';

function makePES(index: number, Y: number, Z: number): ParagraphEmotionState {
  return {
    paragraph_index: index,
    paragraph_hash: `hash-${index}`,
    state_14d: makeState14D('fear', 0.5),
    omega_state: makeOmega(-2, Y, Z),
    dominant_emotion: 'fear',
    valence: -0.5,
    arousal: 0.5,
  };
}

const C = 100;

describe('detectDeadZones', () => {
  it('detects Z plateau dead zone', () => {
    // Z/C = 90/100 = 0.9 >= 0.8 threshold, for 4 consecutive paragraphs
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 90),
      makePES(1, 60, 90),
      makePES(2, 60, 90),
      makePES(3, 60, 90),
      makePES(4, 10, 10), // breaks the zone
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones.length).toBeGreaterThanOrEqual(1);
    expect(zones[0].start_index).toBe(0);
    expect(zones[0].length).toBeGreaterThanOrEqual(3);
  });

  it('returns no dead zone when Z values are low', () => {
    const states: ParagraphEmotionState[] = [
      makePES(0, 30, 10),
      makePES(1, 40, 15),
      makePES(2, 50, 20),
      makePES(3, 60, 25),
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones).toHaveLength(0);
  });

  it('respects minimum length requirement', () => {
    // DEAD_ZONE_MIN_LENGTH default = 3. Only 2 high-Z paragraphs => no dead zone.
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 90),
      makePES(1, 60, 90),
      makePES(2, 10, 10), // breaks zone before min length
      makePES(3, 10, 10),
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones).toHaveLength(0);
  });

  it('uses Z/C threshold correctly', () => {
    // Z=79 with C=100 => 0.79 < 0.8 => not a dead zone
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 79),
      makePES(1, 60, 79),
      makePES(2, 60, 79),
      makePES(3, 60, 79),
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones).toHaveLength(0);
  });

  it('identifies dissipation_blocked cause when intensity is stable', () => {
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 90),
      makePES(1, 60, 90),
      makePES(2, 60, 90),
      makePES(3, 60, 90),
      makePES(4, 10, 10), // breaks zone
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones.length).toBeGreaterThanOrEqual(1);
    // dissipation_rate = |endY - startY| / length, with stable Y => near 0 => 'dissipation_blocked'
    expect(zones[0].cause).toBe('dissipation_blocked');
  });

  it('detects multiple dead zones in the same sequence', () => {
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 90),
      makePES(1, 60, 90),
      makePES(2, 60, 90),
      makePES(3, 10, 10), // breaks zone 1
      makePES(4, 70, 95),
      makePES(5, 70, 95),
      makePES(6, 70, 95),
      makePES(7, 10, 10), // breaks zone 2
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones.length).toBeGreaterThanOrEqual(2);
  });

  it('handles edge case with C=0 (no capacity)', () => {
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 90),
      makePES(1, 60, 90),
      makePES(2, 60, 90),
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, 0);
    expect(zones).toHaveLength(0);
  });

  it('handles single paragraph (below min length)', () => {
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 90),
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones).toHaveLength(0);
  });

  it('is deterministic across multiple calls', () => {
    const states: ParagraphEmotionState[] = [
      makePES(0, 60, 90),
      makePES(1, 60, 90),
      makePES(2, 60, 90),
      makePES(3, 60, 90),
      makePES(4, 10, 10),
    ];
    const r1 = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    const r2 = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(r1).toEqual(r2);
  });

  it('diagnoses no_stimulus cause when Y values are very low', () => {
    const states: ParagraphEmotionState[] = [
      makePES(0, 2, 85),
      makePES(1, 3, 85),
      makePES(2, 2, 85),
      makePES(3, 10, 10), // breaks zone
    ];
    const zones = detectDeadZones(states, DEFAULT_F5_CONFIG, C);
    expect(zones.length).toBeGreaterThanOrEqual(1);
    expect(zones[0].cause).toBe('no_stimulus');
  });
});
