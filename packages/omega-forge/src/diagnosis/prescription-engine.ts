/**
 * OMEGA Forge — Prescription Engine
 * Phase C.5 — Generate actionable prescriptions from violations
 * F5-INV-12: Each prescription has location, diagnostic, action, values.
 */

import type {
  Prescription,
  TrajectoryAnalysis, LawComplianceReport, QualityEnvelope,
  DeadZone, F5Config,
} from '../types.js';
import { resolveF5ConfigValue } from '../config.js';

let prescriptionCounter = 0;

function nextId(): string {
  prescriptionCounter++;
  return `PRESC-${String(prescriptionCounter).padStart(4, '0')}`;
}

/** Reset the counter for deterministic IDs (call at start of each forge run) */
export function resetPrescriptionCounter(): void {
  prescriptionCounter = 0;
}

/** Generate prescriptions from all violations and metrics */
export function generatePrescriptions(
  trajectory: TrajectoryAnalysis,
  laws: LawComplianceReport,
  quality: QualityEnvelope,
  deadZones: readonly DeadZone[],
  config: F5Config,
): readonly Prescription[] {
  const prescriptions: Prescription[] = [];

  for (const transition of laws.transitions) {
    if (transition.forced_transition) {
      prescriptions.push({
        prescription_id: nextId(),
        domain: 'law_1_inertia',
        priority: 'CRITICAL',
        paragraph_indices: [transition.from_index, transition.to_index],
        law_violated: 'L1',
        metric_violated: null,
        diagnostic: `Forced transition: narrative force ${transition.narrative_force.toFixed(3)} < M*R ${(transition.inertia_mass * transition.resistance).toFixed(3)}`,
        action: 'Add narrative event (beat, dialogue, revelation) to justify emotional shift',
        current_value: transition.narrative_force,
        target_value: transition.inertia_mass * transition.resistance,
      });
    }

    if (transition.feasibility_fail) {
      prescriptions.push({
        prescription_id: nextId(),
        domain: 'law_3_feasibility',
        priority: 'CRITICAL',
        paragraph_indices: [transition.from_index, transition.to_index],
        law_violated: 'L3',
        metric_violated: null,
        diagnostic: `Infeasible transition: insufficient narrative energy`,
        action: 'Provide narrative justification for emotional change (event, action, revelation)',
        current_value: transition.narrative_force,
        target_value: transition.narrative_force * 2,
      });
    }
  }

  for (const segment of laws.organic_decay_segments) {
    if (!segment.compliant) {
      const indices: number[] = [];
      for (let i = segment.segment_start; i <= segment.segment_end; i++) {
        indices.push(i);
      }
      prescriptions.push({
        prescription_id: nextId(),
        domain: 'law_4_organic_decay',
        priority: 'HIGH',
        paragraph_indices: indices,
        law_violated: 'L4',
        metric_violated: null,
        diagnostic: `Organic decay violation: MSE ${segment.deviation.toFixed(4)} (regime: ${segment.zeta_regime})`,
        action: 'Adjust emotional pacing to match natural decay curve',
        current_value: segment.deviation,
        target_value: resolveF5ConfigValue(config.TAU_DECAY_TOLERANCE),
      });
    }
  }

  if (!laws.flux_conservation.compliant) {
    prescriptions.push({
      prescription_id: nextId(),
      domain: 'law_5_flux',
      priority: 'HIGH',
      paragraph_indices: [0, Math.max(0, trajectory.paragraph_states.length - 1)],
      law_violated: 'L5',
      metric_violated: null,
      diagnostic: `Flux conservation violation: balance error ${laws.flux_conservation.balance_error.toFixed(4)}`,
      action: 'Rebalance emotional energy: ensure intensity lost is accounted for by persistence or dissipation',
      current_value: laws.flux_conservation.balance_error,
      target_value: resolveF5ConfigValue(config.TAU_FLUX_BALANCE),
    });
  }

  for (const zone of deadZones) {
    const indices: number[] = [];
    for (let i = zone.start_index; i <= zone.end_index; i++) {
      indices.push(i);
    }
    prescriptions.push({
      prescription_id: nextId(),
      domain: 'dead_zone',
      priority: 'HIGH',
      paragraph_indices: indices,
      law_violated: null,
      metric_violated: null,
      diagnostic: `Dead zone: ${zone.length} paragraphs with avg Z=${zone.avg_Z.toFixed(1)}, cause=${zone.cause}`,
      action: 'Introduce stimulus (event, revelation, conflict) to restart emotional flow',
      current_value: zone.dissipation_rate,
      target_value: 1.0,
    });
  }

  for (const deviation of trajectory.deviations) {
    if (!deviation.compliant) {
      prescriptions.push({
        prescription_id: nextId(),
        domain: 'forced_transition',
        priority: 'MEDIUM',
        paragraph_indices: [deviation.paragraph_index],
        law_violated: null,
        metric_violated: 'trajectory_deviation',
        diagnostic: `Trajectory deviation: cosine=${deviation.cosine_distance.toFixed(3)}, euclidean=${deviation.euclidean_distance.toFixed(3)}`,
        action: 'Align paragraph emotion with prescribed trajectory target',
        current_value: deviation.cosine_distance,
        target_value: resolveF5ConfigValue(config.TAU_COSINE_DEVIATION),
      });
    }
  }

  addQualityPrescriptions(prescriptions, quality, config);

  return prescriptions;
}

function addQualityPrescriptions(
  prescriptions: Prescription[],
  quality: QualityEnvelope,
  config: F5Config,
): void {
  const m = quality.metrics;

  if (m.M1_contradiction_rate > 0) {
    prescriptions.push({
      prescription_id: nextId(),
      domain: 'canon_compliance',
      priority: 'HIGH',
      paragraph_indices: [],
      law_violated: null,
      metric_violated: 'M1',
      diagnostic: `Canon contradictions detected: ${m.M1_contradiction_rate}`,
      action: 'Resolve canon contradictions in text',
      current_value: m.M1_contradiction_rate,
      target_value: 0,
    });
  }

  if (m.M2_canon_compliance < 1) {
    prescriptions.push({
      prescription_id: nextId(),
      domain: 'canon_compliance',
      priority: 'MEDIUM',
      paragraph_indices: [],
      law_violated: null,
      metric_violated: 'M2',
      diagnostic: `Canon compliance ${(m.M2_canon_compliance * 100).toFixed(1)}% < 100%`,
      action: 'Reference all canon entries in the text',
      current_value: m.M2_canon_compliance,
      target_value: 1.0,
    });
  }

  const tauNec = resolveF5ConfigValue(config.TAU_NECESSITY);
  if (m.M8_sentence_necessity < tauNec) {
    prescriptions.push({
      prescription_id: nextId(),
      domain: 'necessity',
      priority: 'MEDIUM',
      paragraph_indices: [],
      law_violated: null,
      metric_violated: 'M8',
      diagnostic: `Sentence necessity ${(m.M8_sentence_necessity * 100).toFixed(1)}% < ${(tauNec * 100).toFixed(1)}%`,
      action: 'Remove redundant sentences that add no unique information',
      current_value: m.M8_sentence_necessity,
      target_value: tauNec,
    });
  }

  const tauDisMin = resolveF5ConfigValue(config.TAU_DISCOMFORT_MIN);
  const tauDisMax = resolveF5ConfigValue(config.TAU_DISCOMFORT_MAX);
  if (m.M11_discomfort_index < tauDisMin) {
    prescriptions.push({
      prescription_id: nextId(),
      domain: 'complexity',
      priority: 'LOW',
      paragraph_indices: [],
      law_violated: null,
      metric_violated: 'M11',
      diagnostic: `Discomfort index ${m.M11_discomfort_index.toFixed(3)} < minimum ${tauDisMin}`,
      action: 'Add productive friction: tension, conflict, challenge',
      current_value: m.M11_discomfort_index,
      target_value: tauDisMin,
    });
  }
  if (m.M11_discomfort_index > tauDisMax) {
    prescriptions.push({
      prescription_id: nextId(),
      domain: 'complexity',
      priority: 'LOW',
      paragraph_indices: [],
      law_violated: null,
      metric_violated: 'M11',
      diagnostic: `Discomfort index ${m.M11_discomfort_index.toFixed(3)} > maximum ${tauDisMax}`,
      action: 'Reduce excessive friction: balance tension with respite',
      current_value: m.M11_discomfort_index,
      target_value: tauDisMax,
    });
  }
}
