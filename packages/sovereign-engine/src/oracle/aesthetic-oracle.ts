/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AESTHETIC ORACLE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/aesthetic-oracle.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Orchestrates all 9 axes + computes S-Score.
 * This is the ultimate judge of prose quality.
 *
 * EXECUTION ORDER:
 * 1. CALC axes (parallel, 0 token): tension_14d, anti_cliche, rhythm, signature, emotion_coherence
 * 2. LLM axes (sequential or parallel, depends on provider): interiority, sensory_density, necessity, impact
 * 3. Compute S-Score composite
 * 4. Emit verdict: SEAL (≥92) or REJECT (<92)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SScore, SovereignProvider, AxesScores } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';

import { scoreTension14D } from './axes/tension-14d.js';
import { scoreAntiCliche } from './axes/anti-cliche.js';
import { scoreRhythm } from './axes/rhythm.js';
import { scoreSignature } from './axes/signature.js';
import { scoreEmotionCoherence } from './axes/emotion-coherence.js';
import { scoreInteriority } from './axes/interiority.js';
import { scoreSensoryDensity } from './axes/sensory-density.js';
import { scoreNecessity } from './axes/necessity.js';
import { scoreImpact } from './axes/impact.js';

import { computeSScore, computeMacroSScore, type MacroSScore } from './s-score.js';
import { computeECC, computeRCI, computeSII, computeIFI, type MacroAxesScores } from './macro-axes.js';

export async function judgeAesthetic(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<SScore> {
  const tension_14d = scoreTension14D(packet, prose);
  const anti_cliche = scoreAntiCliche(packet, prose);
  const rhythm = scoreRhythm(packet, prose);
  const signature = scoreSignature(packet, prose);
  const emotion_coherence = scoreEmotionCoherence(packet, prose);

  const interiority = await scoreInteriority(packet, prose, provider);
  const sensory_density = await scoreSensoryDensity(packet, prose, provider);
  const necessity = await scoreNecessity(packet, prose, provider);
  const impact = await scoreImpact(packet, prose, provider);

  const axes: AxesScores = {
    interiority,
    tension_14d,
    sensory_density,
    necessity,
    anti_cliche,
    rhythm,
    signature,
    impact,
    emotion_coherence,
  };

  const s_score = computeSScore(axes, packet.scene_id, packet.seeds.llm_seed);

  return s_score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AESTHETIC ORACLE v3 — avec 4 macro-axes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Juge esthétique v3 avec macro-axes
 * @param symbolMap - SymbolMap optionnel (peut être null si pas encore généré)
 * @param physicsAudit - PhysicsAuditResult optionnel (Sprint 3.4 — physics_compliance)
 */
export async function judgeAestheticV3(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
  _symbolMap: SymbolMap | null, // symbolMap pour usage futur
  physicsAudit?: import('./physics-audit.js').PhysicsAuditResult,
): Promise<MacroSScore> {
  const ecc = await computeECC(packet, prose, provider, physicsAudit);
  const rci = computeRCI(packet, prose);
  const sii = await computeSII(packet, prose, provider);
  const ifi = await computeIFI(packet, prose, provider);

  const macroAxes: MacroAxesScores = { ecc, rci, sii, ifi };

  return computeMacroSScore(macroAxes, packet.scene_id, packet.seeds.llm_seed);
}
