/**
 * OMEGA Forge — Prescription Engine Tests
 * Phase C.5 — 12 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generatePrescriptions, resetPrescriptionCounter } from '../../src/diagnosis/prescription-engine.js';
import { makeState14D, makeOmega, DEFAULT_F5_CONFIG } from '../fixtures.js';
import type {
  TrajectoryAnalysis, LawComplianceReport, QualityEnvelope, DeadZone,
  EmotionTransition, LawVerification, ParagraphEmotionState, FluxConservation,
  QualityMetrics,
} from '../../src/types.js';

// ═══════════════ Mock Factories ═══════════════

function makePES(index: number): ParagraphEmotionState {
  return {
    paragraph_index: index,
    paragraph_hash: `hash-${index}`,
    state_14d: makeState14D('fear', 0.5),
    omega_state: makeOmega(-2, 50, 10),
    dominant_emotion: 'fear',
    valence: -0.5,
    arousal: 0.5,
  };
}

function makeTransition(fromIdx: number, toIdx: number, forced: boolean, feasFail: boolean): EmotionTransition {
  const law1: LawVerification = {
    law: 'L1', paragraph_indices: [fromIdx, toIdx], compliant: !forced,
    measured_value: forced ? 0.1 : 5.0, threshold: 1.0, detail: '',
  };
  const law3: LawVerification = {
    law: 'L3', paragraph_indices: [fromIdx, toIdx], compliant: !feasFail,
    measured_value: feasFail ? 0.1 : 5.0, threshold: 1.0, detail: '',
  };
  return {
    from_index: fromIdx, to_index: toIdx,
    from_state: makeOmega(-2, 50, 10), to_state: makeOmega(-3, 60, 15),
    delta_intensity: 10, narrative_force: forced ? 0.1 : 5.0,
    inertia_mass: 1.0, resistance: 1.0,
    law_results: [law1, law3], forced_transition: forced, feasibility_fail: feasFail,
  };
}

function makeFlux(compliant: boolean): FluxConservation {
  return {
    phi_transferred: 10, phi_stored: 5, phi_dissipated: 3, phi_total: 18,
    balance_error: compliant ? 0.01 : 0.2, compliant,
  };
}

function makeLawReport(overrides: {
  transitions?: EmotionTransition[];
  fluxCompliant?: boolean;
  decayViolations?: number;
}): LawComplianceReport {
  const { transitions = [], fluxCompliant = true, decayViolations = 0 } = overrides;
  const forced = transitions.filter(t => t.forced_transition).length;
  const feasFails = transitions.filter(t => t.feasibility_fail).length;

  const decaySegments = Array.from({ length: decayViolations }, (_, i) => ({
    segment_start: i * 3, segment_end: i * 3 + 2,
    expected_curve: [0.8, 0.6, 0.4], actual_curve: [0.8, 0.7, 0.65],
    deviation: 0.15, zeta_regime: 'underdamped' as const, compliant: false,
  }));

  return {
    transitions,
    organic_decay_segments: decaySegments,
    flux_conservation: makeFlux(fluxCompliant),
    total_transitions: transitions.length,
    forced_transitions: forced,
    feasibility_failures: feasFails,
    law4_violations: decayViolations,
    law5_compliant: fluxCompliant,
    overall_compliance: transitions.length > 0
      ? transitions.filter(t => !t.forced_transition && !t.feasibility_fail).length / transitions.length
      : 1,
    compliance_hash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345',
  };
}

function makeTrajectory(deviationCount: number, compliant: boolean): TrajectoryAnalysis {
  const states = Array.from({ length: deviationCount + 1 }, (_, i) => makePES(i));
  const deviations = Array.from({ length: deviationCount }, (_, i) => ({
    paragraph_index: i,
    cosine_distance: compliant ? 0.1 : 0.5,
    euclidean_distance: compliant ? 0.5 : 2.0,
    vad_distance: compliant ? 0.2 : 0.8,
    delta_X: 0, delta_Y: 5, delta_Z: 2,
    compliant,
  }));
  return {
    paragraph_states: states,
    prescribed_states: states.map((s, i) => ({
      paragraph_index: i, target_14d: s.state_14d,
      target_omega: s.omega_state, source: 'test',
    })),
    deviations,
    avg_cosine_distance: compliant ? 0.1 : 0.5,
    avg_euclidean_distance: compliant ? 0.5 : 2.0,
    max_deviation_index: 0,
    compliant_ratio: compliant ? 1 : 0,
    trajectory_hash: 'traj_hash_64chars_padded_000000000000000000000000000000000000000',
  };
}

function makeQuality(overrides: Partial<QualityMetrics> = {}): QualityEnvelope {
  const metrics: QualityMetrics = {
    M1_contradiction_rate: 0,
    M2_canon_compliance: 1,
    M3_coherence_span: 100,
    M4_arc_maintenance: 3,
    M5_memory_integrity: 0.9,
    M6_style_emergence: 0.8,
    M7_author_fingerprint: 0.7,
    M8_sentence_necessity: 0.96,
    M9_semantic_density: 0.5,
    M10_reading_levels: 3,
    M11_discomfort_index: 0.5,
    M12_superiority_index: 0.8,
    ...overrides,
  };
  return {
    metrics,
    quality_score: 0.8,
    quality_hash: 'qhash64chars_000000000000000000000000000000000000000000000000000',
  };
}

const emptyDeadZones: DeadZone[] = [];

describe('generatePrescriptions', () => {
  beforeEach(() => {
    resetPrescriptionCounter();
  });

  it('generates CRITICAL prescription from L1 law violation', () => {
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, true, false)],
    });
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality();
    const prescriptions = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    const critical = prescriptions.filter(p => p.priority === 'CRITICAL');
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical[0].domain).toBe('law_1_inertia');
    expect(critical[0].law_violated).toBe('L1');
  });

  it('generates HIGH prescription from dead zone', () => {
    const laws = makeLawReport({});
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality();
    const deadZones: DeadZone[] = [{
      start_index: 0, end_index: 3, length: 4, avg_Z: 90, dissipation_rate: 0.1, cause: 'Z_plateau',
    }];
    const prescriptions = generatePrescriptions(trajectory, laws, quality, deadZones, DEFAULT_F5_CONFIG);

    const dzPresc = prescriptions.filter(p => p.domain === 'dead_zone');
    expect(dzPresc.length).toBeGreaterThanOrEqual(1);
    expect(dzPresc[0].priority).toBe('HIGH');
  });

  it('generates MEDIUM prescription from quality metric violation', () => {
    const laws = makeLawReport({});
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality({ M2_canon_compliance: 0.5 });
    const prescriptions = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    const m2Presc = prescriptions.filter(p => p.metric_violated === 'M2');
    expect(m2Presc.length).toBeGreaterThanOrEqual(1);
    expect(m2Presc[0].priority).toBe('MEDIUM');
  });

  it('generates LOW prescription for discomfort out of range', () => {
    const laws = makeLawReport({});
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality({ M11_discomfort_index: 0.1 });
    const prescriptions = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    const m11Presc = prescriptions.filter(p => p.metric_violated === 'M11');
    expect(m11Presc.length).toBeGreaterThanOrEqual(1);
    expect(m11Presc[0].priority).toBe('LOW');
  });

  it('F5-INV-12: each prescription has location, diagnostic, and action', () => {
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, true, false)],
    });
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality({ M1_contradiction_rate: 3 });
    const deadZones: DeadZone[] = [{
      start_index: 2, end_index: 5, length: 4, avg_Z: 88, dissipation_rate: 0.05, cause: 'dissipation_blocked',
    }];
    const prescriptions = generatePrescriptions(trajectory, laws, quality, deadZones, DEFAULT_F5_CONFIG);

    for (const p of prescriptions) {
      expect(p).toHaveProperty('paragraph_indices');
      expect(Array.isArray(p.paragraph_indices)).toBe(true);
      expect(p).toHaveProperty('diagnostic');
      expect(typeof p.diagnostic).toBe('string');
      expect(p.diagnostic.length).toBeGreaterThan(0);
      expect(p).toHaveProperty('action');
      expect(typeof p.action).toBe('string');
      expect(p.action.length).toBeGreaterThan(0);
    }
  });

  it('covers all prescription domains', () => {
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, true, true)],
      fluxCompliant: false,
      decayViolations: 1,
    });
    const trajectory = makeTrajectory(2, false);
    const quality = makeQuality({
      M1_contradiction_rate: 2,
      M2_canon_compliance: 0.5,
      M8_sentence_necessity: 0.8,
      M11_discomfort_index: 0.1,
    });
    const deadZones: DeadZone[] = [{
      start_index: 0, end_index: 3, length: 4, avg_Z: 90, dissipation_rate: 0.1, cause: 'Z_plateau',
    }];
    const prescriptions = generatePrescriptions(trajectory, laws, quality, deadZones, DEFAULT_F5_CONFIG);

    const domains = new Set(prescriptions.map(p => p.domain));
    expect(domains.has('law_1_inertia')).toBe(true);
    expect(domains.has('law_3_feasibility')).toBe(true);
    expect(domains.has('dead_zone')).toBe(true);
  });

  it('generates no prescriptions when everything is compliant', () => {
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, false, false)],
    });
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality();
    const prescriptions = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);
    expect(prescriptions).toHaveLength(0);
  });

  it('handles edge case: empty transitions and dead zones', () => {
    const laws = makeLawReport({});
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality();
    const prescriptions = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);
    expect(prescriptions).toHaveLength(0);
  });

  it('is deterministic across multiple calls', () => {
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, true, false)],
    });
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality({ M1_contradiction_rate: 1 });

    resetPrescriptionCounter();
    const p1 = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);
    resetPrescriptionCounter();
    const p2 = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    expect(p1.length).toBe(p2.length);
    for (let i = 0; i < p1.length; i++) {
      expect(p1[i].prescription_id).toBe(p2[i].prescription_id);
      expect(p1[i].domain).toBe(p2[i].domain);
      expect(p1[i].priority).toBe(p2[i].priority);
    }
  });

  it('prescriptions are ordered by generation: critical law violations first', () => {
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, true, true)],
      decayViolations: 1,
    });
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality({ M1_contradiction_rate: 2 });
    const prescriptions = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    // First prescriptions should be law violations (CRITICAL)
    expect(prescriptions.length).toBeGreaterThan(0);
    expect(prescriptions[0].priority).toBe('CRITICAL');
  });

  it('generates complete prescription with all required fields', () => {
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, true, false)],
    });
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality();
    const prescriptions = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    expect(prescriptions.length).toBeGreaterThan(0);
    const p = prescriptions[0];
    expect(p).toHaveProperty('prescription_id');
    expect(p.prescription_id).toMatch(/^PRESC-\d{4}$/);
    expect(p).toHaveProperty('domain');
    expect(p).toHaveProperty('priority');
    expect(p).toHaveProperty('paragraph_indices');
    expect(p).toHaveProperty('law_violated');
    expect(p).toHaveProperty('metric_violated');
    expect(p).toHaveProperty('diagnostic');
    expect(p).toHaveProperty('action');
    expect(p).toHaveProperty('current_value');
    expect(p).toHaveProperty('target_value');
  });

  it('counter reset works for deterministic IDs', () => {
    resetPrescriptionCounter();
    const laws = makeLawReport({
      transitions: [makeTransition(0, 1, true, false)],
    });
    const trajectory = makeTrajectory(0, true);
    const quality = makeQuality();
    const p1 = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    resetPrescriptionCounter();
    const p2 = generatePrescriptions(trajectory, laws, quality, emptyDeadZones, DEFAULT_F5_CONFIG);

    expect(p1[0].prescription_id).toBe('PRESC-0001');
    expect(p2[0].prescription_id).toBe('PRESC-0001');
  });
});
