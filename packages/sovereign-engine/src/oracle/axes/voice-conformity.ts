/**
 * Voice Conformity Axis — mesure le drift entre genome cible et genome mesuré
 * Invariant: ART-VOICE-03
 * Méthode: CALC (déterministe)
 * Poids: 1.0
 * Macro-axe: RCI
 */

import type { ForgePacket, AxisScore, SovereignProvider } from '../../types.js';
import { measureVoice, computeVoiceDrift } from '../../voice/voice-genome.js';

export async function scoreVoiceConformity(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<AxisScore> {
  // Si pas de genome dans packet, retourner score neutre
  if (!packet.style_genome || !packet.style_genome.voice) {
    return {
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
  const driftResult = computeVoiceDrift(targetGenome, actualGenome);

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

  return {
    axis_id: 'voice_conformity',
    score,
    weight: 1.0,
    method: 'CALC',
    details: `Drift: ${(driftResult.drift * 100).toFixed(2)}%, Conforming: ${driftResult.conforming}`,
    reasons: {
      top_contributors: topContributors,
      top_penalties: topPenalties,
    },
  };
}
