/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — MICRO-SURGEON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: microsurgery/micro-surgeon.ts
 * Version: 1.0.0 (Sprint 3C)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Targeted micro-interventions on individual sentences.
 * The CONTREMAÎTRE decides WHAT to fix (CALC diagnosis).
 * The LLM executes ONLY the incision (1 sentence at a time).
 *
 * Sprint 3C scope: tension_14d ONLY (max 2 interventions).
 * Convergence 3/3: Claude + ChatGPT + Gemini.
 *
 * Principle (Architecte):
 *   "Un ouvrier seul ne peut pas construire une maison.
 *    Il faut plusieurs corps de métier spécialisés
 *    et un maître d'œuvre."
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  analyzeEmotionFromText,
  cosineSimilarity14D,
} from '@omega/omega-forge';

import type { ForgePacket, SovereignProvider } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MicroIntervention {
  readonly type: 'TENSION_14D';
  readonly quartile: number;          // 0-3
  readonly target_emotion: string;    // dominant emotion for this quartile
  readonly physical_anchor: string;   // physical incarnation
  readonly target_sentence: string;   // exact sentence to modify
  readonly context_before: string;    // previous sentence
  readonly context_after: string;     // next sentence
  readonly similarity_before: number; // cosine similarity before intervention
}

export interface MicroSurgeryResult {
  readonly interventions_planned: number;
  readonly interventions_applied: number;
  readonly interventions_rejected: number;
  readonly details: readonly MicroInterventionResult[];
  readonly prose: string;
}

export interface MicroInterventionResult {
  readonly intervention: MicroIntervention;
  readonly replacement: string;
  readonly accepted: boolean;
  readonly reject_reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION PHYSICAL MAP (same as prompt-assembler-v4.ts)
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_PHYSICAL_MAP: Record<string, string> = {
  'anger': 'mâchoires serrées, gestes saccadés',
  'fear': 'souffle court, regard fuyant',
  'sadness': 'épaules affaissées, regard dans le vide',
  'joy': 'corps détendu, mouvements fluides',
  'surprise': 'corps figé, souffle coupé',
  'disgust': 'recul physique, visage détourné',
  'anticipation': 'corps penché en avant, muscles tendus',
  'trust': 'posture ouverte, rythme calme',
  'tension': 'immobilité chargée, gestes retenus',
  'dread': 'froid dans la nuque, respiration suspendue',
  'despair': 'corps vidé, bras le long du corps',
  'contempt': 'menton relevé, sourire froid',
  'guilt': 'épaules rentrées, mains qui se tordent',
  'shame': 'tête baissée, corps replié',
};

function getPhysical(emotion: string): string {
  return EMOTION_PHYSICAL_MAP[emotion.toLowerCase()] || 'corps en alerte';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC (CALC pur — 0 API)
// Uses keyword-based emotion analysis (not LLM semantic) for speed.
// Goal: identify which quartile has the LOWEST cosine similarity
// with its target 14D vector.
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuartileDiagnostic {
  readonly quartile: number;
  readonly similarity: number;
  readonly text: string;
  readonly target_dominant: string;
}

/**
 * Diagnose per-quartile tension_14d conformity using KEYWORD analysis (0 API).
 * Returns diagnostics sorted by similarity (worst first).
 */
export function diagnoseTension14D(
  packet: ForgePacket,
  prose: string,
): QuartileDiagnostic[] {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const total = paragraphs.length;
  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;
  const quartileKeys = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

  const diagnostics: QuartileDiagnostic[] = [];

  for (let i = 0; i < 4; i++) {
    const [startFrac, endFrac] = bounds[quartileKeys[i]];
    const startIdx = Math.floor(startFrac * total);
    const endIdx = Math.ceil(endFrac * total);
    const quartileText = paragraphs.slice(startIdx, endIdx).join('\n\n');

    // Keyword-based analysis (fast, 0 API)
    const actualState = analyzeEmotionFromText(quartileText, packet.language);
    const targetState = packet.emotion_contract.curve_quartiles[i].target_14d;
    const similarity = cosineSimilarity14D(targetState as any, actualState as any);
    const dominant = packet.emotion_contract.curve_quartiles[i].dominant;

    diagnostics.push({
      quartile: i,
      similarity,
      text: quartileText,
      target_dominant: dominant,
    });
  }

  // Sort by similarity (worst first)
  return diagnostics.sort((a, b) => a.similarity - b.similarity);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERVENTION PLANNING
// ═══════════════════════════════════════════════════════════════════════════════

/** Similarity threshold below which a quartile needs intervention */
const INTERVENTION_THRESHOLD = 0.45;

/** Maximum interventions per run (ChatGPT-audit: start with 2, not 8) */
const MAX_INTERVENTIONS = 2;

/**
 * Plan micro-interventions for the weakest quartiles.
 * Only targets quartiles with similarity < INTERVENTION_THRESHOLD.
 */
export function planInterventions(
  packet: ForgePacket,
  prose: string,
  diagnostics: QuartileDiagnostic[],
): MicroIntervention[] {
  const interventions: MicroIntervention[] = [];

  for (const diag of diagnostics) {
    if (interventions.length >= MAX_INTERVENTIONS) break;
    if (diag.similarity >= INTERVENTION_THRESHOLD) continue;

    // Split quartile text into sentences
    const sentences = diag.text
      .split(/(?<=[.!?…»"])\s+/)
      .filter((s) => s.trim().length > 0);

    if (sentences.length === 0) continue;

    // Find the most "neutral" sentence — shortest, least emotionally charged
    // Heuristic: pick the sentence with the fewest emotional keywords
    const emotionalKeywords = [
      'colère', 'peur', 'rage', 'terreur', 'joie', 'tristesse', 'dégoût',
      'honte', 'culpabilité', 'mépris', 'horreur', 'douleur', 'angoisse',
      'serr', 'trembl', 'frisson', 'sueur', 'souffl', 'cœur', 'gorge',
      'ventre', 'mâchoire', 'poing', 'larme', 'cri', 'hurle',
    ];

    let weakestIdx = 0;
    let minEmotionCount = Infinity;

    for (let i = 0; i < sentences.length; i++) {
      const lower = sentences[i].toLowerCase();
      const count = emotionalKeywords.filter((kw) => lower.includes(kw)).length;
      if (count < minEmotionCount) {
        minEmotionCount = count;
        weakestIdx = i;
      }
    }

    const targetSentence = sentences[weakestIdx];
    const contextBefore = weakestIdx > 0 ? sentences[weakestIdx - 1] : '';
    const contextAfter = weakestIdx < sentences.length - 1 ? sentences[weakestIdx + 1] : '';
    const dominant = diag.target_dominant;
    const physical = getPhysical(dominant);

    interventions.push({
      type: 'TENSION_14D',
      quartile: diag.quartile,
      target_emotion: dominant,
      physical_anchor: physical,
      target_sentence: targetSentence,
      context_before: contextBefore,
      context_after: contextAfter,
      similarity_before: diag.similarity,
    });
  }

  return interventions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute planned micro-interventions.
 * Each intervention = 1 micro-LLM call (~50 tokens prompt, ~30 tokens response).
 * Guard: reject if replacement is too long (hallucination) or too different.
 */
export async function executeMicroSurgery(
  prose: string,
  interventions: MicroIntervention[],
  provider: SovereignProvider,
): Promise<MicroSurgeryResult> {
  const details: MicroInterventionResult[] = [];
  let currentProse = prose;

  for (const intervention of interventions) {
    const prompt = buildMicroPrompt(intervention);

    try {
      const replacement = await provider.generateDraft(
        prompt,
        'micro_surgery',
        `micro_tension_Q${intervention.quartile}`,
      );

      const cleaned = replacement.trim();

      // Guard 1: replacement must not be too long (max 1.8× original)
      if (cleaned.length > intervention.target_sentence.length * 1.8) {
        console.warn(`[MICRO-SURGEON] REJECTED Q${intervention.quartile}: replacement too long (${cleaned.length} vs ${intervention.target_sentence.length})`);
        details.push({
          intervention,
          replacement: cleaned,
          accepted: false,
          reject_reason: `Too long: ${cleaned.length} chars vs ${intervention.target_sentence.length} original`,
        });
        continue;
      }

      // Guard 2: replacement must not be empty
      if (cleaned.length < 10) {
        console.warn(`[MICRO-SURGEON] REJECTED Q${intervention.quartile}: replacement too short`);
        details.push({
          intervention,
          replacement: cleaned,
          accepted: false,
          reject_reason: 'Too short',
        });
        continue;
      }

      // Guard 3: original sentence must exist in current prose
      if (!currentProse.includes(intervention.target_sentence)) {
        console.warn(`[MICRO-SURGEON] REJECTED Q${intervention.quartile}: target sentence not found in prose`);
        details.push({
          intervention,
          replacement: cleaned,
          accepted: false,
          reject_reason: 'Target sentence not found in prose',
        });
        continue;
      }

      // Apply the replacement
      currentProse = currentProse.replace(intervention.target_sentence, cleaned);

      console.log(`[MICRO-SURGEON] APPLIED Q${intervention.quartile} (${intervention.target_emotion}): "${intervention.target_sentence.slice(0, 40)}..." → "${cleaned.slice(0, 40)}..."`);

      details.push({
        intervention,
        replacement: cleaned,
        accepted: true,
      });
    } catch (err) {
      console.error(`[MICRO-SURGEON] ERROR Q${intervention.quartile}:`, err);
      details.push({
        intervention,
        replacement: '',
        accepted: false,
        reject_reason: `LLM error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return {
    interventions_planned: interventions.length,
    interventions_applied: details.filter((d) => d.accepted).length,
    interventions_rejected: details.filter((d) => !d.accepted).length,
    details,
    prose: currentProse,
  };
}

/**
 * Build the micro-prompt for a tension_14d intervention.
 * Ultra-short (~60 tokens). The LLM responds with 1 sentence only.
 */
function buildMicroPrompt(intervention: MicroIntervention): string {
  return `Contexte : "${intervention.context_before}"
Phrase à modifier : "${intervention.target_sentence}"
Suite : "${intervention.context_after}"

Cette phrase manque d'émotion "${intervention.target_emotion}".
Réécris-la en y infusant cette émotion par le CORPS (${intervention.physical_anchor}).
Garde la même longueur. Réponds UNIQUEMENT avec la phrase modifiée.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run micro-surgery on prose targeting tension_14d weak quartiles.
 *
 * Pipeline:
 * 1. Diagnose (CALC, 0 API) — identify weakest quartiles
 * 2. Plan (CALC, 0 API) — select sentences to modify
 * 3. Execute (1-2 micro-LLM calls) — apply interventions
 * 4. Return modified prose + traceability
 *
 * If no quartile needs intervention (all > threshold), returns prose unchanged.
 */
export async function runMicroSurgery(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<MicroSurgeryResult> {
  // 1. Diagnose
  const diagnostics = diagnoseTension14D(packet, prose);

  // Log diagnostic
  console.log(`[MICRO-SURGEON] Diagnostic (keyword-based):`);
  for (const d of diagnostics) {
    const status = d.similarity < INTERVENTION_THRESHOLD ? '🔴 TARGET' : '✅ OK';
    console.log(`  Q${d.quartile} similarity=${(d.similarity * 100).toFixed(1)}% target=${d.target_dominant} ${status}`);
  }

  // 2. Plan
  const interventions = planInterventions(packet, prose, diagnostics);

  if (interventions.length === 0) {
    console.log(`[MICRO-SURGEON] No intervention needed (all quartiles above threshold ${INTERVENTION_THRESHOLD})`);
    return {
      interventions_planned: 0,
      interventions_applied: 0,
      interventions_rejected: 0,
      details: [],
      prose,
    };
  }

  console.log(`[MICRO-SURGEON] ${interventions.length} intervention(s) planned`);

  // 3. Execute
  return await executeMicroSurgery(prose, interventions, provider);
}
