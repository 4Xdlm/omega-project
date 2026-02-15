/**
 * OMEGA Forge — ForgeEmotionBrief Builder
 * Computes the complete emotion brief from contract parameters.
 * Uses EXISTING omega-forge functions — NEVER reimplements.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import { EMOTION_14_KEYS } from '../types.js';
import type { Emotion14, EmotionState14D, CanonicalEmotionTable } from '../types.js';
import { toOmegaState } from './omega-state.js';
import { dominantEmotion, singleEmotionState } from './emotion-space.js';
import { getEmotionPhysics } from './canonical-table.js';
import { computeResistance, estimateNarrativeForce } from './law-1-inertia.js';
import { checkFeasibility } from './law-3-feasibility.js';
import { buildScenePrescribedTrajectory } from './trajectory-analyzer.js';
import type {
  BriefParams, ForgeEmotionBrief, QuartileTarget,
  EmotionPhysicsProfile, TransitionConstraint, ForbiddenTransition,
  DecayExpectation, BlendZone, EnergyBudget,
} from './emotion-brief-types.js';

/**
 * Compute a complete ForgeEmotionBrief.
 * This is the SSOT payload — computed once, consumed everywhere.
 * FAIL-CLOSED: throws if params invalid.
 */
export function computeForgeEmotionBrief(params: BriefParams): ForgeEmotionBrief {
  // GATE: validate required params
  if (params.persistenceCeiling <= 0) {
    throw new Error('GATE-1 FAIL: persistenceCeiling must be > 0');
  }
  if (params.language !== 'fr' && params.language !== 'en') {
    throw new Error(`GATE-1 FAIL: language must be 'fr' or 'en', got '${params.language}'`);
  }
  if (params.totalParagraphs <= 0) {
    throw new Error('GATE-1 FAIL: totalParagraphs must be > 0');
  }

  const { waypoints, sceneStartPct, sceneEndPct, totalParagraphs, canonicalTable, persistenceCeiling, language, producerBuildHash } = params;

  // 1. Build trajectory (SSOT — via existing function)
  const trajectory = buildScenePrescribedTrajectory(
    waypoints,
    sceneStartPct,
    sceneEndPct,
    totalParagraphs,
    canonicalTable,
    persistenceCeiling,
  );

  // 2. Compute quartile targets
  const quartile_targets = computeQuartileTargets(trajectory, canonicalTable, persistenceCeiling);

  // 3. Compute physics profiles for active emotions
  const activeEmotions = detectActiveEmotions(trajectory);
  const physics_profiles = computePhysicsProfiles(activeEmotions, canonicalTable);

  // 4. Compute transition map between quartiles
  const transition_map = computeTransitionMap(quartile_targets, canonicalTable);

  // 5. Compute forbidden transitions
  const forbidden_transitions = computeForbiddenTransitions(activeEmotions, canonicalTable);

  // 6. Compute decay expectations
  const decay_expectations = computeDecayExpectations(quartile_targets, physics_profiles);

  // 7. Detect blend zones
  const blend_zones = detectBlendZones(quartile_targets);

  // 8. Compute energy budget
  const energy_budget = computeEnergyBudget(trajectory);

  // 9. Canonical table hash
  const canonical_table_hash = sha256(canonicalize(canonicalTable));

  // 10. Capabilities (what's actually in this brief)
  const capabilities: string[] = [
    'emotion.trajectory.prescribed.14d',
    'emotion.trajectory.prescribed.xyz',
    'emotion.physics_profile',
    'emotion.transition_map',
    'emotion.forbidden_transitions',
    'emotion.decay_expectations',
    'emotion.blend_zones',
    'emotion.energy_budget',
  ];

  // 11. Assemble brief WITHOUT hash
  const briefWithoutHash = {
    schema_version: 'forge.emotion.v1' as const,
    producer: 'omega-forge' as const,
    producer_build_hash: producerBuildHash,
    canonical_table_hash,
    persistence_ceiling: persistenceCeiling,
    language,
    brief_hash: '', // placeholder
    capabilities,
    trajectory,
    quartile_targets,
    physics_profiles,
    transition_map,
    forbidden_transitions,
    decay_expectations,
    blend_zones,
    energy_budget,
  };

  // 12. Compute hash on brief WITHOUT brief_hash field
  const { brief_hash: _, ...hashableContent } = briefWithoutHash;
  const brief_hash = sha256(canonicalize(hashableContent));

  return { ...briefWithoutHash, brief_hash };
}

// ── PRIVATE FUNCTIONS ──────────────────────────────────────────────

/** Split trajectory into 4 quartiles and compute average 14D + XYZ per quartile */
function computeQuartileTargets(
  trajectory: readonly import('../types.js').PrescribedState[],
  table: CanonicalEmotionTable,
  C: number,
): readonly QuartileTarget[] {
  const total = trajectory.length;
  const quartileNames: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];
  const bounds: Array<[number, number]> = [[0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1.0]];

  return quartileNames.map((q, idx) => {
    const [startFrac, endFrac] = bounds[idx];
    const startIdx = Math.floor(startFrac * total);
    const endIdx = Math.ceil(endFrac * total);
    const slice = trajectory.slice(startIdx, endIdx);

    if (slice.length === 0) {
      const zero14d = Object.fromEntries(EMOTION_14_KEYS.map((k) => [k, 0])) as EmotionState14D;
      return { quartile: q, target_14d: zero14d, target_omega: { X: 0, Y: 0, Z: 0 }, dominant: 'anticipation' as Emotion14 };
    }

    // Average 14D
    const avg: Record<string, number> = {};
    for (const e of EMOTION_14_KEYS) {
      avg[e] = slice.reduce((s, p) => s + p.target_14d[e], 0) / slice.length;
    }
    const target_14d = avg as EmotionState14D;
    const target_omega = toOmegaState(target_14d, table, C);
    const dominant = dominantEmotion(target_14d);

    return { quartile: q, target_14d, target_omega, dominant };
  });
}

/** Detect which emotions are active (dominant in at least one paragraph) */
function detectActiveEmotions(trajectory: readonly import('../types.js').PrescribedState[]): readonly Emotion14[] {
  const active = new Set<Emotion14>();
  for (const state of trajectory) {
    active.add(dominantEmotion(state.target_14d));
  }
  return [...active];
}

/** Compute physics profile for each active emotion from canonical table */
function computePhysicsProfiles(
  activeEmotions: readonly Emotion14[],
  table: CanonicalEmotionTable,
): readonly EmotionPhysicsProfile[] {
  return activeEmotions.map((emotion) => {
    const physics = getEmotionPhysics(table, emotion);
    if (!physics) {
      return {
        emotion,
        mass: 5, lambda: 0.1, kappa: 1.0,
        decay_half_life_paragraphs: Math.round(Math.log(2) / 0.1),
        behavior_fr: `Émotion ${emotion} — paramètres par défaut`,
      };
    }

    const halfLife = physics.lambda > 0
      ? Math.round(Math.log(2) / physics.lambda * 10) / 10
      : 999;

    // Deterministic behavior description
    const massDesc = physics.M < 4 ? 'légère, mobile' : physics.M > 6 ? 'lourde, persistante' : 'modérée';
    const lambdaDesc = physics.lambda > 0.15 ? 'rapide à s\'estomper' : physics.lambda < 0.08 ? 'persiste longtemps' : 'rythme modéré';
    const kappaDesc = physics.kappa > 1.5 ? 'fortement couplée' : physics.kappa < 0.7 ? 'indépendante' : 'couplage normal';

    return {
      emotion,
      mass: physics.M,
      lambda: physics.lambda,
      kappa: physics.kappa,
      decay_half_life_paragraphs: halfLife,
      behavior_fr: `${emotion}: ${massDesc}, ${lambdaDesc}, ${kappaDesc}`,
    };
  });
}

/** Compute transition constraints between consecutive quartiles */
function computeTransitionMap(
  quartiles: readonly QuartileTarget[],
  table: CanonicalEmotionTable,
): readonly TransitionConstraint[] {
  const constraints: TransitionConstraint[] = [];
  for (let i = 0; i < quartiles.length - 1; i++) {
    const from = quartiles[i];
    const to = quartiles[i + 1];

    const fromPhysics = getEmotionPhysics(table, from.dominant);
    const M = fromPhysics?.M ?? 5;
    const R = computeResistance(from.target_omega, to.target_omega);
    const required_force = M * R;

    // Check feasibility: calculate force and compare
    const force = estimateNarrativeForce(null, { from: from.target_omega, to: to.target_omega });
    const feasibilityResult = checkFeasibility(force, from.target_omega, to.target_omega);
    const feasible = from.dominant === to.dominant || feasibilityResult.compliant;

    const hint = feasible
      ? `Transition ${from.dominant}→${to.dominant}: force requise ${required_force.toFixed(1)}`
      : `ATTENTION: transition ${from.dominant}→${to.dominant} difficile, catalyseur narratif requis`;

    constraints.push({
      from_quartile: from.quartile,
      to_quartile: to.quartile,
      from_dominant: from.dominant,
      to_dominant: to.dominant,
      required_force,
      feasible,
      narrative_hint_fr: hint,
    });
  }
  return constraints;
}

/** Detect emotion pairs whose direct transition is infeasible */
function computeForbiddenTransitions(
  activeEmotions: readonly Emotion14[],
  table: CanonicalEmotionTable,
): readonly ForbiddenTransition[] {
  const forbidden: ForbiddenTransition[] = [];
  const C = 100; // standard persistence ceiling for feasibility check
  for (const from of activeEmotions) {
    for (const to of activeEmotions) {
      if (from === to) continue;
      const fromState = singleEmotionState(from, 0.8);
      const toState = singleEmotionState(to, 0.8);
      const fromOmega = toOmegaState(fromState, table, C);
      const toOmega = toOmegaState(toState, table, C);

      const force = estimateNarrativeForce(null, { from: fromOmega, to: toOmega });
      const result = checkFeasibility(force, fromOmega, toOmega);

      if (!result.compliant) {
        forbidden.push({
          from, to,
          reason_fr: `Transition directe ${from}→${to} viole la faisabilité (Law 3)`,
        });
      }
    }
  }
  return forbidden;
}

/** Compute expected decay after emotional peaks */
function computeDecayExpectations(
  quartiles: readonly QuartileTarget[],
  profiles: readonly EmotionPhysicsProfile[],
): readonly DecayExpectation[] {
  const expectations: DecayExpectation[] = [];
  for (let i = 0; i < quartiles.length - 1; i++) {
    const q = quartiles[i];
    const profile = profiles.find((p) => p.emotion === q.dominant);
    if (!profile) continue;

    const peakIntensity = q.target_14d[q.dominant] ?? 0;
    if (peakIntensity < 0.3) continue; // not a real peak

    const lambda = profile.lambda;
    const dropPct = (1 - Math.exp(-lambda * 1)) * 100; // 1 quartile ≈ 1 unit

    expectations.push({
      peak_quartile: q.quartile,
      emotion: q.dominant,
      peak_intensity: peakIntensity,
      lambda,
      expected_drop_pct_at_next_quartile: Math.round(dropPct * 10) / 10,
      instruction_fr: `Après pic ${q.dominant} en ${q.quartile}: décroissance attendue ~${Math.round(dropPct)}%`,
    });
  }
  return expectations;
}

/** Detect quartiles where 2+ emotions are above threshold */
function detectBlendZones(quartiles: readonly QuartileTarget[]): readonly BlendZone[] {
  const BLEND_THRESHOLD = 0.15;
  const zones: BlendZone[] = [];

  for (const q of quartiles) {
    const significant: Partial<Record<Emotion14, number>> = {};
    let count = 0;
    for (const e of EMOTION_14_KEYS) {
      if (q.target_14d[e] >= BLEND_THRESHOLD) {
        significant[e] = Math.round(q.target_14d[e] * 1000) / 1000;
        count++;
      }
    }
    if (count >= 2) {
      const emotionList = Object.keys(significant).join('+');
      zones.push({
        quartile: q.quartile,
        blend: significant,
        instruction_fr: `${q.quartile}: zone de mélange ${emotionList}`,
      });
    }
  }
  return zones;
}

/** Compute energy budget (Law 5 conservation check) */
function computeEnergyBudget(trajectory: readonly import('../types.js').PrescribedState[]): EnergyBudget {
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 1; i < trajectory.length; i++) {
    const prev = trajectory[i - 1];
    const curr = trajectory[i];

    for (const e of EMOTION_14_KEYS) {
      const delta = curr.target_14d[e] - prev.target_14d[e];
      if (delta > 0) totalIn += delta;
      else totalOut += Math.abs(delta);
    }
  }

  const balanceError = Math.abs(totalIn - totalOut);

  return {
    total_in: Math.round(totalIn * 1000) / 1000,
    total_out: Math.round(totalOut * 1000) / 1000,
    balance_error: Math.round(balanceError * 1000) / 1000,
    constraint_fr: `Énergie entrée=${totalIn.toFixed(2)}, sortie=${totalOut.toFixed(2)}, erreur=${balanceError.toFixed(3)}`,
  };
}
