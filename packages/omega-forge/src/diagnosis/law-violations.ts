/**
 * OMEGA Forge — Law Violations Detection
 * Phase C.5 — Detect all law violations across transitions
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  ParagraphEmotionState, CanonicalEmotionTable, GenesisPlan,
  EmotionTransition, LawComplianceReport, OrganicDecayAnalysis,
  LawVerification, F5Config, Beat,
} from '../types.js';
import { getEmotionPhysics } from '../physics/canonical-table.js';
import { checkInertia, estimateNarrativeForce, computeResistance } from '../physics/law-1-inertia.js';
import { verifyLaw3 } from '../physics/law-3-feasibility.js';
import { analyzeDecaySegment } from '../physics/law-4-organic-decay.js';
import { computeFluxConservation } from '../physics/law-5-flux-conservation.js';
import { resolveF5ConfigValue } from '../config.js';

/** Find the beat corresponding to a paragraph transition */
function findBeatForTransition(
  plan: GenesisPlan,
  _fromIndex: number,
  toIndex: number,
): Beat | null {
  let beatIdx = 0;
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      for (const beat of scene.beats) {
        if (beatIdx === toIndex) return beat;
        beatIdx++;
      }
    }
  }
  return null;
}

/** Analyze all transitions between consecutive paragraphs */
export function analyzeTransitions(
  states: readonly ParagraphEmotionState[],
  plan: GenesisPlan,
  table: CanonicalEmotionTable,
  _config: F5Config,
): readonly EmotionTransition[] {
  const transitions: EmotionTransition[] = [];

  for (let i = 0; i < states.length - 1; i++) {
    const from = states[i];
    const to = states[i + 1];
    const beat = findBeatForTransition(plan, i, i + 1);
    const physics = getEmotionPhysics(table, from.dominant_emotion);

    const force = estimateNarrativeForce(beat, {
      from: from.omega_state,
      to: to.omega_state,
    });
    const resistance = computeResistance(from.omega_state, to.omega_state);
    const mass = physics.M;

    const inertiaCheck = checkInertia(force, mass, resistance);
    const l1: LawVerification = {
      law: 'L1',
      paragraph_indices: [i, i + 1],
      compliant: inertiaCheck.compliant,
      measured_value: force,
      threshold: mass * resistance,
      detail: inertiaCheck.compliant
        ? `Force ${force.toFixed(3)} > M*R ${(mass * resistance).toFixed(3)}`
        : `Force ${force.toFixed(3)} <= M*R ${(mass * resistance).toFixed(3)}`,
    };

    const l3 = verifyLaw3(beat, from.omega_state, to.omega_state, i, i + 1);

    transitions.push({
      from_index: i,
      to_index: i + 1,
      from_state: from.omega_state,
      to_state: to.omega_state,
      delta_intensity: Math.abs(to.omega_state.Y - from.omega_state.Y),
      narrative_force: force,
      inertia_mass: mass,
      resistance,
      law_results: [l1, l3],
      forced_transition: !inertiaCheck.compliant,
      feasibility_fail: !l3.compliant,
    });
  }

  return transitions;
}

/** Analyze organic decay segments (Law 4) */
export function analyzeDecaySegments(
  states: readonly ParagraphEmotionState[],
  table: CanonicalEmotionTable,
  C: number,
  tolerance: number,
): readonly OrganicDecayAnalysis[] {
  if (states.length < 3) return [];

  const segments: OrganicDecayAnalysis[] = [];
  let segStart = 0;

  for (let i = 1; i < states.length; i++) {
    const deltaY = states[i].omega_state.Y - states[i - 1].omega_state.Y;

    if (deltaY > 5 || i === states.length - 1) {
      if (i - segStart >= 2) {
        const segStates = states.slice(segStart, i);
        const intensities = segStates.map((s) => s.omega_state.Y);
        const zValues = segStates.map((s) => s.omega_state.Z);
        const dominant = segStates[0].dominant_emotion;
        const physics = getEmotionPhysics(table, dominant);

        const analysis = analyzeDecaySegment(intensities, physics, zValues, C);
        const adjusted: OrganicDecayAnalysis = {
          ...analysis,
          segment_start: segStart,
          segment_end: i - 1,
          compliant: analysis.deviation <= tolerance,
        };
        segments.push(adjusted);
      }
      segStart = i;
    }
  }

  return segments;
}

/** Build complete law compliance report */
export function buildLawComplianceReport(
  states: readonly ParagraphEmotionState[],
  plan: GenesisPlan,
  table: CanonicalEmotionTable,
  config: F5Config,
): LawComplianceReport {
  const C = resolveF5ConfigValue(config.SATURATION_CAPACITY_C);
  const decayTolerance = resolveF5ConfigValue(config.TAU_DECAY_TOLERANCE);
  const fluxTolerance = resolveF5ConfigValue(config.TAU_FLUX_BALANCE);

  const transitions = analyzeTransitions(states, plan, table, config);
  const decaySegments = analyzeDecaySegments(states, table, C, decayTolerance);
  const omegaStates = states.map((s) => s.omega_state);
  const flux = computeFluxConservation(omegaStates, fluxTolerance);

  const forced = transitions.filter((t) => t.forced_transition).length;
  const feasFails = transitions.filter((t) => t.feasibility_fail).length;
  const law4Violations = decaySegments.filter((s) => !s.compliant).length;
  const totalTransitions = transitions.length;
  const compliantTransitions = transitions.filter(
    (t) => !t.forced_transition && !t.feasibility_fail,
  ).length;

  const hashInput = {
    total: totalTransitions,
    forced,
    feas: feasFails,
    law4: law4Violations,
    flux_ok: flux.compliant,
  };

  return {
    transitions,
    organic_decay_segments: decaySegments,
    flux_conservation: flux,
    total_transitions: totalTransitions,
    forced_transitions: forced,
    feasibility_failures: feasFails,
    law4_violations: law4Violations,
    law5_compliant: flux.compliant,
    overall_compliance: totalTransitions > 0 ? compliantTransitions / totalTransitions : 1,
    compliance_hash: sha256(canonicalize(hashInput)),
  };
}
