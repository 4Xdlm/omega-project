/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AESTHETIC ORACLE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/aesthetic-oracle.ts
 * Version: 1.1.0
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
 * P2-03c: Prose-hash cache. Identical prose within a run → cached result.
 * Saves ~4 LLM calls (existingProse re-scored in duel after sovereign loop).
 * Toggle: OMEGA_PROSE_CACHE=0 to disable (default: enabled).
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
// P3-02: Shared emotion analysis
import { analyzeProseEmotions } from './shared-emotion-analysis.js';
import { scoreInteriority } from './axes/interiority.js';
import { scoreSensoryDensity } from './axes/sensory-density.js';
import { scoreNecessity } from './axes/necessity.js';
import { scoreImpact } from './axes/impact.js';

import { computeSScore } from './s-score.js';
import type { MacroSScore } from './macro-score-types.js';
import { computeECC, computeRCI, computeSII, computeIFI, computeAAI, computeMacroSScore, type MacroAxesScores } from './macro-axes.js';

// ── P2-03c: Prose-hash cache ────────────────────────────────────────────────
// Key: scene_id + prose length + prose content (identity, not hash — Map handles it)
// Scoped per run — resetProseCache() at run start.

const _v1Cache = new Map<string, SScore>();
const _v3Cache = new Map<string, MacroSScore>();
let _v1Hits = 0;
let _v3Hits = 0;

function makeCacheKey(prose: string, sceneId: string): string {
  return `${sceneId}::${prose.length}::${prose}`;
}

/** Reset cache between runs. Call at the start of runSovereignForge. */
export function resetProseCache(): void {
  if (_v1Hits > 0 || _v3Hits > 0) {
    console.log(`[PROSE-CACHE] Session end — V1 hits=${_v1Hits} V3 hits=${_v3Hits} (saved ~${_v1Hits * 4 + _v3Hits * 6} LLM calls)`);
  }
  _v1Cache.clear();
  _v3Cache.clear();
  _v1Hits = 0;
  _v3Hits = 0;
}

/** Expose cache stats for telemetry/tests. */
export function getProseCacheStats(): { v1_size: number; v3_size: number; v1_hits: number; v3_hits: number } {
  return { v1_size: _v1Cache.size, v3_size: _v3Cache.size, v1_hits: _v1Hits, v3_hits: _v3Hits };
}

export async function judgeAesthetic(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<SScore> {
  // P2-03c: cache check
  const cacheEnabled = process.env.OMEGA_PROSE_CACHE !== '0';
  if (cacheEnabled) {
    const key = makeCacheKey(prose, packet.scene_id);
    const cached = _v1Cache.get(key);
    if (cached) {
      _v1Hits++;
      console.log(`[PROSE-CACHE] V1 HIT #${_v1Hits} (scene=${packet.scene_id}, words=${prose.split(/\s+/).length}, composite=${cached.composite.toFixed(1)})`);
      return cached;
    }
  }

  // P3-02: Shared emotion analysis for V1 path too
  const sharedEnabled = process.env.OMEGA_SHARED_EMOTION !== '0';
  const sharedEmotions = sharedEnabled
    ? await analyzeProseEmotions(prose, packet, provider)
    : undefined;

  const tension_14d = await scoreTension14D(packet, prose, provider, sharedEmotions);
  const anti_cliche = scoreAntiCliche(packet, prose);
  const rhythm = scoreRhythm(packet, prose);
  const signature = scoreSignature(packet, prose);
  const emotion_coherence = await scoreEmotionCoherence(packet, prose, provider, sharedEmotions);

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

  // P2-03c: store in cache
  if (cacheEnabled) {
    const key = makeCacheKey(prose, packet.scene_id);
    _v1Cache.set(key, s_score);
  }

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
  // P2-03c: V3 cache check
  const cacheEnabled = process.env.OMEGA_PROSE_CACHE !== '0';
  if (cacheEnabled) {
    const key = makeCacheKey(prose, packet.scene_id);
    const cached = _v3Cache.get(key);
    if (cached) {
      _v3Hits++;
      console.log(`[PROSE-CACHE] V3 HIT #${_v3Hits} (scene=${packet.scene_id}, composite=${cached.composite.toFixed(1)})`);
      return cached;
    }
  }

  const ecc = await computeECC(packet, prose, provider, physicsAudit);
  const rci = await computeRCI(packet, prose, provider);
  const sii = await computeSII(packet, prose, provider);
  const ifi = await computeIFI(packet, prose, provider);
  const aai = await computeAAI(packet, prose, provider);

  const macroAxes: MacroAxesScores = { ecc, rci, sii, ifi, aai };

  const result = computeMacroSScore(macroAxes, packet.scene_id, packet.seeds.llm_seed);

  // P2-03c: store in V3 cache
  if (cacheEnabled) {
    const key = makeCacheKey(prose, packet.scene_id);
    _v3Cache.set(key, result);
  }

  return result;
}
