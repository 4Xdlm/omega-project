/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — MICRO-SURGEON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: microsurgery/micro-surgeon.ts
 * Version: 2.0.0 (Sprint SEAL)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Targeted micro-interventions on individual sentences.
 * The CONTREMAÎTRE decides WHAT to fix (CALC diagnosis).
 * The LLM executes ONLY the incision (1 sentence at a time).
 *
 * Sprint 3C: tension_14d only (max 2 interventions).
 * Sprint SEAL: + hook injection (max 3 total: 2 tension + 1 hook).
 *   - Seuil abaissé 0.45 → 0.35 (capturer plus de quartiles faibles)
 *   - Guard longueur 1.8× → 2.2× (ChatGPT-audit: pas 2.5, trop permissif)
 *   - Hook injection: 1 micro-appel si hook_presence < 70
 * Convergence: Claude (fusion) + ChatGPT (un levier à la fois → A+B cross-axe OK)
 *   + Gemini (hooks = gap le plus flagrant).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  analyzeEmotionFromText,
  cosineSimilarity14D,
} from '@omega/omega-forge';

import type { ForgePacket, SovereignProvider } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import { evaluateDamageGate, type ArchetypeId } from './damage-gate.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MicroIntervention {
  readonly type: 'TENSION_14D' | 'HOOK_INJECTION';
  readonly quartile: number;          // 0-3
  readonly target_emotion: string;    // dominant emotion for this quartile
  readonly physical_anchor: string;   // physical incarnation
  readonly target_sentence: string;   // exact sentence to modify
  readonly context_before: string;    // previous sentence
  readonly context_after: string;     // next sentence
  readonly similarity_before: number; // cosine similarity before intervention
  readonly hook_word?: string;        // for HOOK_INJECTION: the hook to inject
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
const INTERVENTION_THRESHOLD = 0.35; // Sprint SEAL: lowered from 0.45 to catch more weak quartiles

/** Maximum TENSION interventions per run */
const MAX_TENSION_INTERVENTIONS = 2;

/** Maximum HOOK interventions per run */
const MAX_HOOK_INTERVENTIONS = 1;

/** Hook presence score threshold for intervention */
const HOOK_INTERVENTION_THRESHOLD = 70;

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
    if (interventions.length >= MAX_TENSION_INTERVENTIONS) break;
    if (diag.similarity >= INTERVENTION_THRESHOLD) continue;

    // Split quartile text into sentences
    const sentences = diag.text
      .split(/(?<=[.!?…»"])\s+/)
      .filter((s) => s.trim().length > 0);

    if (sentences.length === 0) continue;

    // Find the most "neutral" sentence — least emotionally charged AND not sensory-critical
    // Heuristic: pick the sentence with the fewest emotional keywords
    // Sprint SEAL fix (Gemini): EXCLUDE sentences with corporeal/sensory markers
    // to prevent IFI regression when tension surgery replaces sensory phrases
    const emotionalKeywords = [
      'colère', 'peur', 'rage', 'terreur', 'joie', 'tristesse', 'dégoût',
      'honte', 'culpabilité', 'mépris', 'horreur', 'douleur', 'angoisse',
      'serr', 'trembl', 'frisson', 'sueur', 'souffl', 'cœur', 'gorge',
      'ventre', 'mâchoire', 'poing', 'larme', 'cri', 'hurle',
    ];

    // Sensory/corporeal markers — sentences containing these are PROTECTED from tension surgery
    const sensoryProtectedKeywords = [
      'odeur', 'parfum', 'sentir', 'chaleur', 'froid', 'tiède', 'glacé', 'brûl',
      'toucher', 'peau', 'texture', 'caress', 'frôl', 'rugueux', 'doux',
      'bruit', 'silence', 'murmure', 'écho', 'grond', 'siffl',
      'lumière', 'ombre', 'couleur', 'reflet', 'lueur', 'obscur',
      'souffle', 'respir', 'pouls', 'muscle', 'os', 'nuque', 'épaule',
    ];

    let weakestIdx = 0;
    let minEmotionCount = Infinity;

    for (let i = 0; i < sentences.length; i++) {
      const lower = sentences[i].toLowerCase();

      // Skip sentences with sensory markers — they contribute to IFI
      const hasSensory = sensoryProtectedKeywords.some((kw) => lower.includes(kw));
      if (hasSensory) continue;

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
  archetype: ArchetypeId = 'BALANCED',
): Promise<MicroSurgeryResult> {
  const details: MicroInterventionResult[] = [];
  let currentProse = prose;

  // Calculate actual amplitude: 1 sentence modified out of total sentences in prose
  const allSentences = prose.split(/[.!?…]+/).filter(s => s.trim().length > 5);
  const realAmplitude = 1 / Math.max(allSentences.length, 1);

  for (const intervention of interventions) {
    // Damage Gate check — CALC-pure, 0 API calls
    console.log(`[DAMAGE-GATE] Checking intervention Q${intervention.quartile} (${intervention.type}) | amp=${realAmplitude.toFixed(4)} | arch=${archetype}`);
    const gateResult = evaluateDamageGate(intervention.type, realAmplitude, archetype);
    console.log(`[DAMAGE-GATE] ${gateResult.blocked ? 'BLOCKED' : 'PASS'} | ${intervention.type} | amp=${realAmplitude.toFixed(4)} | arch=${archetype}${gateResult.blocked ? ' | reasons: ' + gateResult.block_reasons.join('; ') : ''}`);
    if (gateResult.blocked) {
      console.warn(`[MICRO-SURGEON] DAMAGE-GATE BLOCKED Q${intervention.quartile} (${intervention.type}): ${gateResult.block_reasons.join('; ')}`);
      details.push({
        intervention,
        replacement: '',
        accepted: false,
        reject_reason: `Damage Gate: ${gateResult.block_reasons.join('; ')}`,
      });
      continue;
    }

    const prompt = buildMicroPrompt(intervention);

    try {
      const replacement = await provider.generateDraft(
        prompt,
        'micro_surgery',
        `micro_tension_Q${intervention.quartile}`,
      );

      const cleaned = replacement.trim();

      // Guard 1: replacement must not be too long
      // INV-MICRO-DIFF-01: micro-surgery = diff minimal, not rewrite.
      // Phase W vision: "infléchir, pas réécrire".
      // Adaptive guard: max(1.5× original, original + 15 chars)
      // Rationale: a 15-char phrase (e.g. "Il ferma.") × 1.5 = 22.5 → rejects 23-char inflexion.
      // But "Il ferma lentement." (21 chars) is NOT a rewrite — it's exactly an inflexion.
      // Fix: floor = original + 15 chars ensures short phrases can always receive 1 added word.
      // For longer phrases (e.g. 40 chars), 1.5× = 60 still applies.
      // For very long LLM rewrites (e.g. 85 chars vs 30 original), still blocked correctly.
      const maxLength = Math.max(intervention.target_sentence.length * 1.5,
                                  intervention.target_sentence.length + 15);
      if (cleaned.length > maxLength) {
        console.warn(`[MICRO-SURGEON] REJECTED Q${intervention.quartile}: replacement too long (${cleaned.length} vs ${intervention.target_sentence.length})`);
        details.push({
          intervention,
          replacement: cleaned,
          accepted: false,
          reject_reason: `Too long: ${cleaned.length} chars vs ${intervention.target_sentence.length} original (max ${maxLength.toFixed(0)})`,
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
 * Build the micro-prompt for an intervention.
 * Ultra-short (~60 tokens). The LLM responds with 1 sentence only.
 */
function buildMicroPrompt(intervention: MicroIntervention): string {
  if (intervention.type === 'HOOK_INJECTION' && intervention.hook_word) {
    return `Contexte : "${intervention.context_before}"
Phrase à modifier : "${intervention.target_sentence}"
Suite : "${intervention.context_after}"

Insère le mot ou concept "${intervention.hook_word}" dans cette phrase de manière organique et naturelle. Garde la même longueur et le même ton. Réponds UNIQUEMENT avec la phrase modifiée.`;
  }

  // TENSION_14D — directive positive, diff minimal
  // INV-MICRO-PROMPT-01: "infléchir, pas réécrire" (Phase W directive).
  // Positive constraint: what to DO (infuse emotion via body/action).
  // No negative blacklist: don't forbid words — trust the kill_lists in ForgePacket.
  // Simple/physical vocabulary is allowed: it is "living simplicity", not "inert cliché".
  return `Contexte : "${intervention.context_before}"
Phrase à modifier : "${intervention.target_sentence}"
Suite : "${intervention.context_after}"

Infléchis cette phrase pour y faire sentir l'émotion "${intervention.target_emotion}" via ${intervention.physical_anchor}.
Modifie 1 à 3 mots maximum. Ne réécris pas la phrase — infléchis-la.
Réponds UNIQUEMENT avec la phrase modifiée.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run micro-surgery on prose targeting tension_14d weak quartiles + hooks.
 *
 * Pipeline:
 * 1. Diagnose tension_14d (CALC, 0 API) — identify weakest quartiles
 * 2. Plan tension interventions (CALC, 0 API) — select sentences to modify
 * 3. Plan hook intervention (CALC, 0 API) — if hook_presence < 70
 * 4. Execute (1-3 micro-LLM calls) — apply interventions
 * 5. Return modified prose + traceability
 */
export async function runMicroSurgery(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
  archetype: ArchetypeId = 'BALANCED',
): Promise<MicroSurgeryResult> {
  // 1. Diagnose tension_14d
  const diagnostics = diagnoseTension14D(packet, prose);

  // Log diagnostic
  console.log(`[MICRO-SURGEON] Diagnostic (keyword-based):`);
  for (const d of diagnostics) {
    const status = d.similarity < INTERVENTION_THRESHOLD ? '🔴 TARGET' : '✅ OK';
    console.log(`  Q${d.quartile} similarity=${(d.similarity * 100).toFixed(1)}% target=${d.target_dominant} ${status}`);
  }

  // 2. Plan tension interventions
  const tensionInterventions = planInterventions(packet, prose, diagnostics);

  // 3. Plan hook intervention (Sprint SEAL)
  // INV-MICRO-HOOK-01: pass TENSION target quartiles so HOOK avoids same paragraphs
  const tensionTargetQuartiles = tensionInterventions.map(i => i.quartile);
  const hookInterventions = planHookIntervention(packet, prose, tensionTargetQuartiles);

  // 4. Merge all interventions — HOOKS FIRST, then tensions
  // Sprint SEAL fix: hooks modify prose minimally (insert 1 word), then tensions
  // can still find their target sentences. Reverse order caused "target sentence not found" errors.
  // Gemini: "exclusion mutuelle" — tension must not target a sentence already modified by hook.
  const allInterventions = [...hookInterventions, ...tensionInterventions];

  if (allInterventions.length === 0) {
    console.log(`[MICRO-SURGEON] No intervention needed`);
    return {
      interventions_planned: 0,
      interventions_applied: 0,
      interventions_rejected: 0,
      details: [],
      prose,
    };
  }

  console.log(`[MICRO-SURGEON] ${allInterventions.length} intervention(s) planned (${tensionInterventions.length} tension + ${hookInterventions.length} hook)`);

  // 5. Execute
  return await executeMicroSurgery(prose, allInterventions, provider, archetype);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK INTERVENTION (Sprint SEAL)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Plan a hook injection intervention.
 * Diagnoses which hooks from the SymbolMap are missing in prose.
 * Selects 1 missing hook and a neutral sentence to inject it into.
 * Max 1 hook intervention per run.
 *
 * INV-MICRO-HOOK-01: Hook targets a paragraph NOT targeted by any TENSION intervention.
 * Bug fixed: HOOK was always targeting paragraph 1 (Q2). If TENSION also targeted Q1,
 * HOOK would modify the sentence first → TENSION could not find its original target
 * in currentProse → "target sentence not found" error.
 * Fix: find a paragraph index that is NOT in the set of TENSION intervention quartiles.
 */
function planHookIntervention(
  packet: ForgePacket,
  prose: string,
  tensionTargetQuartiles: readonly number[] = [],
): MicroIntervention[] {
  // Gather all hooks from the packet
  const signatureWords = packet.style_genome?.lexicon?.signature_words ?? [];
  const motifs = packet.style_genome?.imagery?.recurrent_motifs ?? [];
  const allHooks = [...new Set([...signatureWords, ...motifs])].filter(h => h.length > 2);

  if (allHooks.length === 0) return [];

  // Check which hooks are missing
  const lowerProse = prose.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const missingHooks = allHooks.filter(hook => {
    const normalizedHook = hook.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    // Check each token of the hook
    const tokens = normalizedHook.split(/\s+/).filter(t => t.length > 2);
    return !tokens.some(token => lowerProse.includes(token));
  });

  if (missingHooks.length === 0) {
    console.log(`[MICRO-SURGEON] All hooks present — no hook intervention needed`);
    return [];
  }

  // Pick the first missing hook (most important = first in signature_words)
  const hookToInject = missingHooks[0];
  console.log(`[MICRO-SURGEON] Missing hooks: ${missingHooks.length}/${allHooks.length}. Targeting: "${hookToInject}"`);

  // Find a paragraph NOT targeted by TENSION interventions
  // INV-MICRO-HOOK-01: avoids "target sentence not found" when HOOK and TENSION target same para
  const paragraphs = prose.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  // Map TENSION quartile indices to paragraph indices
  // Q0=[0,25%], Q1=[25,50%], Q2=[50,75%], Q3=[75,100%] of paragraphs
  const tensionParaIndices = new Set<number>();
  for (const q of tensionTargetQuartiles) {
    const startIdx = Math.floor((q / 4) * paragraphs.length);
    const endIdx = Math.ceil(((q + 1) / 4) * paragraphs.length);
    for (let i = startIdx; i < endIdx; i++) tensionParaIndices.add(i);
  }

  // Prefer Q4 (last paragraph), then Q1 (setup), avoiding TENSION targets
  const candidates = [
    paragraphs.length - 1, // Q4 last — safest, rarely targeted by TENSION
    1,                      // Q1 setup — original default
    0,                      // Q0 first
    Math.floor(paragraphs.length / 2), // Q2 mid
  ];
  const targetParaIdx = candidates.find(i => !tensionParaIndices.has(i) && i < paragraphs.length)
    ?? paragraphs.length - 1; // fallback: last paragraph

  const targetPara = paragraphs[targetParaIdx];

  const sentences = targetPara
    .split(/(?<=[.!?…»"])\s+/)
    .filter(s => s.trim().length > 0);

  if (sentences.length === 0) return [];

  // Pick the longest sentence (most room for organic insertion)
  let bestIdx = 0;
  let maxLen = 0;
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].length > maxLen) {
      maxLen = sentences[i].length;
      bestIdx = i;
    }
  }

  const targetSentence = sentences[bestIdx];
  const contextBefore = bestIdx > 0 ? sentences[bestIdx - 1] : '';
  const contextAfter = bestIdx < sentences.length - 1 ? sentences[bestIdx + 1] : '';

  return [{
    type: 'HOOK_INJECTION',
    quartile: targetParaIdx,
    target_emotion: '',
    physical_anchor: '',
    target_sentence: targetSentence,
    context_before: contextBefore,
    context_after: contextAfter,
    similarity_before: 0,
    hook_word: hookToInject,
  }];
}
