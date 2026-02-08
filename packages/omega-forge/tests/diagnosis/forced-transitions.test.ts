/**
 * OMEGA Forge — Forced Transitions Tests
 * Phase C.5 — 8 tests
 */

import { describe, it, expect } from 'vitest';
import { detectForcedTransitions, detectFeasibilityFailures, forcedTransitionRatio } from '../../src/diagnosis/forced-transitions.js';
import { makeOmega } from '../fixtures.js';
import type { EmotionTransition, LawVerification } from '../../src/types.js';

function makeTransition(
  fromIdx: number,
  toIdx: number,
  forced: boolean,
  feasFail: boolean,
): EmotionTransition {
  const dummyLaw: LawVerification = {
    law: 'L1',
    paragraph_indices: [fromIdx, toIdx],
    compliant: !forced,
    measured_value: forced ? 0.1 : 5.0,
    threshold: 1.0,
    detail: forced ? 'Force insufficient' : 'Force sufficient',
  };
  return {
    from_index: fromIdx,
    to_index: toIdx,
    from_state: makeOmega(-2, 50, 10),
    to_state: makeOmega(-3, 60, 15),
    delta_intensity: 10,
    narrative_force: forced ? 0.1 : 5.0,
    inertia_mass: 1.0,
    resistance: 1.0,
    law_results: [dummyLaw],
    forced_transition: forced,
    feasibility_fail: feasFail,
  };
}

describe('detectForcedTransitions', () => {
  it('returns forced transitions when present', () => {
    const transitions = [
      makeTransition(0, 1, true, false),
      makeTransition(1, 2, false, false),
    ];
    const forced = detectForcedTransitions(transitions);
    expect(forced).toHaveLength(1);
    expect(forced[0].from_index).toBe(0);
  });

  it('returns empty when no forced transitions', () => {
    const transitions = [
      makeTransition(0, 1, false, false),
      makeTransition(1, 2, false, false),
    ];
    const forced = detectForcedTransitions(transitions);
    expect(forced).toHaveLength(0);
  });

  it('returns multiple forced transitions', () => {
    const transitions = [
      makeTransition(0, 1, true, false),
      makeTransition(1, 2, true, false),
      makeTransition(2, 3, false, false),
    ];
    const forced = detectForcedTransitions(transitions);
    expect(forced).toHaveLength(2);
  });

  it('handles empty transitions array', () => {
    const forced = detectForcedTransitions([]);
    expect(forced).toHaveLength(0);
  });
});

describe('detectFeasibilityFailures', () => {
  it('returns feasibility failures when present', () => {
    const transitions = [
      makeTransition(0, 1, false, true),
      makeTransition(1, 2, false, false),
    ];
    const failures = detectFeasibilityFailures(transitions);
    expect(failures).toHaveLength(1);
    expect(failures[0].feasibility_fail).toBe(true);
  });

  it('handles mixed forced and feasibility failures', () => {
    const transitions = [
      makeTransition(0, 1, true, false),
      makeTransition(1, 2, false, true),
      makeTransition(2, 3, true, true),
    ];
    const forced = detectForcedTransitions(transitions);
    const feasFails = detectFeasibilityFailures(transitions);
    expect(forced).toHaveLength(2);
    expect(feasFails).toHaveLength(2);
  });
});

describe('forcedTransitionRatio', () => {
  it('returns correct ratio for mixed transitions', () => {
    const transitions = [
      makeTransition(0, 1, true, false),
      makeTransition(1, 2, false, false),
      makeTransition(2, 3, true, false),
      makeTransition(3, 4, false, false),
    ];
    const ratio = forcedTransitionRatio(transitions);
    expect(ratio).toBe(0.5);
  });

  it('returns 0 for empty array', () => {
    const ratio = forcedTransitionRatio([]);
    expect(ratio).toBe(0);
  });

  it('edge case: all transitions forced', () => {
    const transitions = [
      makeTransition(0, 1, true, false),
      makeTransition(1, 2, true, false),
    ];
    const ratio = forcedTransitionRatio(transitions);
    expect(ratio).toBe(1);
  });

  it('is deterministic across multiple calls', () => {
    const transitions = [
      makeTransition(0, 1, true, false),
      makeTransition(1, 2, false, false),
    ];
    const r1 = forcedTransitionRatio(transitions);
    const r2 = forcedTransitionRatio(transitions);
    expect(r1).toBe(r2);
  });
});
