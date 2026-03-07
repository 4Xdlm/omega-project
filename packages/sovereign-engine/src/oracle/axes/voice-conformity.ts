/**
 * Voice Conformity Axis — mesure le drift entre genome cible et genome mesuré
 * Invariant: ART-VOICE-03
 * Méthode: CALC (déterministe)
 * Poids: 1.0
 * Macro-axe: RCI
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import {
  measureVoice,
  computeVoiceDrift,
  NON_APPLICABLE_VOICE_PARAMS,
  measureRosette,
  ROSETTE_TARGETS,
} from '../../voice/voice-genome.js';

export async function scoreVoiceConformity(
  packet: ForgePacket,
  prose: string,
): Promise<AxisScore> {
  // Si pas de genome dans packet, retourner score neutre
  if (!packet.style_genome || !packet.style_genome.voice) {
    return {
      name: 'voice_conformity',
      axis_id: 'voice_conformity',
      score: 70,
      weight: 1.0,
      method: 'CALC',
      details: 'No voice genome specified in packet — neutral score',
      reasons: {
        top_contributors: [],
        top_penalties: [],
      },
    };
  }

  const targetGenome = packet.style_genome.voice;
  const actualGenome = measureVoice(prose);
  const driftResult = computeVoiceDrift(targetGenome, actualGenome, NON_APPLICABLE_VOICE_PARAMS);

  // Score = (1 - drift) × 100, clamp [0, 100]
  const rawScore = (1 - driftResult.drift) * 100;
  const score = Math.max(0, Math.min(100, rawScore));

  // Identifier les plus grandes divergences
  const paramDrifts = Object.entries(driftResult.per_param)
    .map(([param, drift]) => ({ param, drift }))
    .sort((a, b) => b.drift - a.drift);

  const topPenalties = paramDrifts.slice(0, 3).map(p => ({
    reason: `${p.param} drift: ${(p.drift * 100).toFixed(1)}%`,
    impact: p.drift * 10, // Scale pour affichage
  }));

  const topContributors = paramDrifts.slice(-3).reverse().map(p => ({
    reason: `${p.param} conforming: ${((1 - p.drift) * 100).toFixed(1)}%`,
    impact: (1 - p.drift) * 10,
  }));

  // U-ROSETTE-01: shadow logging des métriques F31/F32/F33
  // INV-ROSETTE-01: aucun impact sur score — shadow uniquement
  const rosette = measureRosette(prose);
  const rosetteLog = [
    `[SHADOW] F31_participes=${rosette.f31_participes_presents.toFixed(2)}/100m`,
    `(Camus:0.8-1.6|Proust:2-4|Simon:>4.8)`,
    `F32_imbrication=${rosette.f32_imbrication_fractale.toFixed(3)}`,
    `(Camus:0.08-0.18|Proust:0.60-0.85) SHADOW`,
    `F33_parenthetiques=${rosette.f33_coeff_parenthetiques.toFixed(3)}/phrase`,
    `(Camus:0.15-0.35|Proust:2.5-4.0)`,
    `pos2D=(${rosette.position_expansion.toFixed(3)},${rosette.position_imbrication.toFixed(3)})`,
    `target=(${ROSETTE_TARGETS.position_expansion_max},${ROSETTE_TARGETS.position_imbrication_max})`,
  ].join(' ');

  return {
    name: 'voice_conformity',
    axis_id: 'voice_conformity',
    score,
    weight: 1.0,
    method: 'CALC',
    details: `Drift: ${(driftResult.drift * 100).toFixed(2)}%, Conforming: ${driftResult.conforming}, N_applicable: ${driftResult.n_applicable}/10, Excluded: [${driftResult.excluded.join(', ')}] | ${rosetteLog}`,
    reasons: {
      top_contributors: topContributors,
      top_penalties: topPenalties,
    },
  };
}
