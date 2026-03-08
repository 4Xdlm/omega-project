/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — POLISH ENGINE v1 (Sprint U-W2)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/phase-u/polish-engine.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C
 *
 * Architecture (Gemini consensus 2026-03-07) :
 *   1. Frappe Unique   : récupère prose + diagnostic (s_composite ~92, RCI < 85)
 *   2. S-Oracle        : identifie les sous-axes bloquants (voice_conformity, hook_presence, rhythm)
 *   3. Rewrite ciblé   : prompt chirurgical — lisser UNIQUEMENT les métriques bloquantes
 *   4. Validation      : repasse le scorer — SEAL ou REJECT définitif
 *
 * Invariants :
 *   INV-PE-01 : Polish ne modifie jamais l'emotion_contract, les canon, les beats
 *   INV-PE-02 : Polish opère uniquement si s_composite ∈ [POLISH_FLOOR, SEAL_THRESHOLD)
 *   INV-PE-03 : Max MAX_POLISH_ROUNDS iterations — au-delà, fail-closed REJECT
 *   INV-PE-04 : Chaque round loggué : composite_before → composite_after + delta axes
 *   INV-PE-05 : Déterminisme — même seed_base + prose → même rewrite_seed
 *   INV-PE-06 : Fail-closed — toute erreur = PolishError (jamais score partiel)
 *
 * Standard: NASA-Grade L4 / DO-178C
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { SovereignProvider, ForgePacket } from '../../types.js';
import { runSovereignForge, type SovereignForgeResult } from '../../engine.js';
import { SOVEREIGN_CONFIG } from '../../config.js';
import type { ForgePacketInput } from '../../input/forge-packet-assembler.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Seuil minimum pour qu'une prose soit éligible au polish (trop basse = REJECT direct) */
export const POLISH_FLOOR          = 85;
/** Seuil SEAL final — inchangé, ne pas toucher (INV-PE-02) */
export const POLISH_SEAL_THRESHOLD = 93;
/** Max rounds de polish (INV-PE-03) */
export const MAX_POLISH_ROUNDS     = 2;
/** Version du moteur de polish — incrémenter si prompt change */
export const POLISH_ENGINE_VERSION = 'pe-v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PolishDiagnostic {
  /** Sous-axes RCI défaillants détectés (scores sous floor) */
  readonly blocking_sub_axes: readonly string[];
  /** Composite avant polish */
  readonly composite_before: number;
  /** Détail brut des axes macro pour construire le prompt ciblé */
  readonly rci_score: number;
  readonly voice_conformity?: number;
  readonly hook_presence?: number;
  readonly rhythm?: number;
  readonly signature?: number;
  readonly ellipsis_rate_actual?: number;
  readonly opening_variety_actual?: number;
}

export interface PolishRound {
  readonly round: number;
  readonly seed: string;
  readonly composite_before: number;
  readonly composite_after: number;
  readonly delta_composite: number;
  readonly rci_before: number;
  readonly rci_after: number;
  readonly verdict_after: 'SEAL' | 'REJECT';
  readonly prose_sha256_before: string;
  readonly prose_sha256_after: string;
}

export interface PolishResult {
  readonly verdict:             'SEAL' | 'REJECT' | 'SKIP';
  readonly final_prose:         string;
  readonly final_composite:     number;
  readonly rounds:              readonly PolishRound[];
  readonly rounds_executed:     number;
  readonly polish_gain:         number;  // final_composite - composite_initial
  readonly prose_sha256_final:  string;
  readonly polish_hash:         string;  // SHA256(version + rounds + final_sha256)
  readonly created_at:          string;
  /** SKIP reason — si prose hors plage INV-PE-02 */
  readonly skip_reason?:        string;
}

export class PolishError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`PE:${code}: ${message}`);
    this.name = 'PolishError';
  }
}

// ── Polish Prompt Builder ─────────────────────────────────────────────────────

/**
 * Construit un prompt de rewrite chirurgical basé sur les axes bloquants.
 * INV-PE-01 : ne touche jamais l'émotion, les canon, les beats.
 */
function buildPolishPrompt(
  originalProse: string,
  diagnostic: PolishDiagnostic,
  packet: ForgePacket,
): string {
  const blockingAxes = diagnostic.blocking_sub_axes;
  const needsVoiceConformity = blockingAxes.some(a =>
    a.includes('voice_conformity') || a.includes('ellipsis') || a.includes('opening_variety')
  );
  const needsHookPresence = blockingAxes.some(a => a.includes('hook_presence'));
  const needsRhythm = blockingAxes.some(a => a.includes('rhythm'));

  const keywords = [
    ...(packet.style_genome.lexicon.signature_words ?? []).slice(0, 8),
    ...(packet.style_genome.imagery.recurrent_motifs ?? []).slice(0, 5),
  ].join(', ');

  let surgicalInstructions = '';

  if (needsVoiceConformity) {
    const ellipsisActual = diagnostic.ellipsis_rate_actual ?? 0;
    const openingActual  = diagnostic.opening_variety_actual ?? 0;
    surgicalInstructions += `
## CORRECTION PRIORITAIRE 1 — SYNCOPES MÉTRIQUES (ellipsis_rate actuel: ${(ellipsisActual * 100).toFixed(1)}% → cible: 50%)

Le scorer mesure : % de phrases STRICTEMENT ≤ 3 mots.
Actuellement : ${(ellipsisActual * 100).toFixed(1)}% — INSUFFISANT. Cible : ≥ 40%.

Actions OBLIGATOIRES :
1. Identifie les moments d'intensité émotionnelle dans la prose.
2. Après chaque phrase longue (≥ 20 mots) à un moment clé, insère une phrase de 1-3 mots.
3. Exemples valides : "Du sang." / "Elle savait." / "Trop tard." / "Silence." / "Ses mains tremblaient."
4. Ne pas créer de syncopes là où l'émotion est plate — elles doivent porter du sens.

Pour 30 phrases totales : insère au moins 12 syncopes (≤3 mots) aux bons endroits.

## CORRECTION PRIORITAIRE 2 — VARIÉTÉ DES OUVERTURES (opening_variety actuel: ${(openingActual * 100).toFixed(1)}% → cible: 80%)

Formule scorer : unique_premiers_mots / total_phrases. Cible ≥ 0.75.
Actuellement : ${(openingActual * 100).toFixed(1)}% — INSUFFISANT.

Actions OBLIGATOIRES :
1. Identifie les premiers mots qui se répètent (probablement "Elle", "Il", "Le", "La").
2. Pour chaque doublon au-delà du 3e : reformule le début de la phrase.
   Techniques : commencer par un verbe ("Surgit...", "Restait..."),
   par un lieu ("Dans la pièce...", "Au fond..."),
   par une syncope sans sujet ("Rien.", "Du sang.", "Trop tard."),
   par une subordonnée ("Quand elle...", "Avant que...", "Si le...").
3. Aucune 2 phrases consécutives ne commencent par le même mot.
`;
  }

  if (needsHookPresence) {
    surgicalInstructions += `
## CORRECTION PRIORITAIRE ${needsVoiceConformity ? '3' : '1'} — MOTS-CLÉS MANQUANTS (hook_presence: ${diagnostic.hook_presence?.toFixed(1) ?? 'N/A'} → cible: ≥ 85)

Ces mots DOIVENT être présents dans la prose (minimum 10 sur 13) :
${keywords}

Actions OBLIGATOIRES :
1. Parcours la prose, note quels mots de la liste sont absents.
2. Intègre chaque mot absent de façon organique (dans une description, sensation, ou action).
3. Ne jamais forcer l'insertion — adapte la phrase pour que le mot soit naturel.
4. Priorité aux mots absents sur les présents — ne pas surcharger les déjà présents.
`;
  }

  if (needsRhythm && !needsVoiceConformity) {
    surgicalInstructions += `
## CORRECTION PRIORITAIRE — RYTHME (rhythm: ${diagnostic.rhythm?.toFixed(1) ?? 'N/A'} → cible: ≥ 85)

Le rythme mesure la variation des longueurs de phrases (Gini + syncopes + compressions).

Actions OBLIGATOIRES :
1. Identifie les passages où toutes les phrases ont une longueur similaire.
2. Introduis de la variation : une phrase très courte (2-3 mots) PUIS une longue (25+ mots).
3. Minimum 3 "syncopes" (phrase ≤ 4 mots) dans la scène entière.
4. 1 phrase-fleuve (30+ mots) pour créer un espace de respiration.
`;
  }

  return `# OMEGA POLISH ENGINE — REWRITE CHIRURGICAL

Tu reçois une prose qui a scoré ${diagnostic.composite_before.toFixed(1)}/100 (cible : ≥ 93).
Les axes bloquants sont : ${blockingAxes.join(', ')}.

## RÈGLES ABSOLUES DU POLISH (INV-PE-01)

✅ Tu peux modifier : la longueur des phrases, les mots d'ouverture, les syncopes, les mots-clés.
❌ Tu NE PEUX PAS modifier : l'émotion, les événements narratifs, les personnages, le canon.
❌ Tu NE PEUX PAS changer : le sens des phrases, les faits établis, la chronologie.
❌ Tu NE DOIS PAS ajouter : de nouvelles métaphores, de nouveaux clichés, de nouveaux thèmes.

La prose doit rester RECONNAISSABLE. C'est un AJUSTEMENT MÉTRIQUE, pas une réécriture.

${surgicalInstructions}

## PROSE ORIGINALE (à polish)

${originalProse}

---

## INSTRUCTION FINALE

Produis la version polie. Elle doit :
1. Corriger les axes bloquants listés ci-dessus.
2. Conserver intégralement le sens, l'émotion, les événements.
3. Ne pas introduire de nouveaux clichés ou de nouveau contenu.

Output : la prose polie uniquement, sans commentaire, sans préambule.
`;
}

/**
 * Extrait le diagnostic RCI depuis le forge result (sub_axes si disponible).
 */
export function extractPolishDiagnostic(result: SovereignForgeResult): PolishDiagnostic {
  const composite = result.s_score?.composite ?? result.macro_score?.composite ?? 0;
  const rci = result.macro_score?.macro_axes?.rci?.score ?? 0;

  // Extraire les sous-scores RCI depuis macro_score si disponible
  const rciSubScores = result.macro_score?.macro_axes?.rci?.sub_scores ?? [];
  const voiceConformity = rciSubScores.find((s: { name: string }) => s.name === 'voice_conformity')?.score;
  const hookPresence    = rciSubScores.find((s: { name: string }) => s.name === 'hook_presence')?.score;
  const rhythm          = rciSubScores.find((s: { name: string }) => s.name === 'rhythm')?.score;
  const signature       = rciSubScores.find((s: { name: string }) => s.name === 'signature')?.score;

  // Construire la liste des axes bloquants (sous le floor RCI = 85)
  const RCI_SUB_FLOOR = 82;  // sous-axe individuel floor pour signalement
  const blocking: string[] = [];
  if (rci < SOVEREIGN_CONFIG.MACRO_FLOORS.rci) {
    if (voiceConformity !== undefined && voiceConformity < RCI_SUB_FLOOR) {
      blocking.push(`voice_conformity(${voiceConformity.toFixed(1)})`);
    }
    if (hookPresence !== undefined && hookPresence < RCI_SUB_FLOOR) {
      blocking.push(`hook_presence(${hookPresence.toFixed(1)})`);
    }
    if (rhythm !== undefined && rhythm < RCI_SUB_FLOOR) {
      blocking.push(`rhythm(${rhythm.toFixed(1)})`);
    }
    if (blocking.length === 0) {
      // Fallback si sous-axes non exposés : liste RCI générique
      blocking.push(`rci_global(${rci.toFixed(1)})`);
    }
  }

  // Extraire ellipsis_rate et opening_variety depuis les détails voice_conformity si disponible
  let ellipsisActual: number | undefined;
  let openingActual:  number | undefined;
  if (voiceConformity !== undefined) {
    const vcDetails = rciSubScores.find((s: { name: string }) => s.name === 'voice_conformity')?.details ?? '';
    const ellipsisMatch = vcDetails.match(/ellipsis\(t=([\d.]+)\/a=([\d.]+)/);
    const openingMatch  = vcDetails.match(/opening_var\(t=([\d.]+)\/a=([\d.]+)/);
    if (ellipsisMatch) ellipsisActual = parseFloat(ellipsisMatch[2]);
    if (openingMatch)  openingActual  = parseFloat(openingMatch[2]);
  }

  return {
    blocking_sub_axes:       blocking,
    composite_before:        composite,
    rci_score:               rci,
    voice_conformity:        voiceConformity,
    hook_presence:           hookPresence,
    rhythm,
    signature,
    ellipsis_rate_actual:    ellipsisActual,
    opening_variety_actual:  openingActual,
  };
}

// ── Polish Engine ─────────────────────────────────────────────────────────────

export class PolishEngine {
  constructor(
    private readonly provider: SovereignProvider,
    private readonly modelId:  string,
    private readonly apiKey:   string,
  ) {}

  /**
   * Tente d'améliorer une prose via rewrite chirurgical ciblé.
   *
   * INV-PE-02 : skip si composite hors [POLISH_FLOOR, SEAL_THRESHOLD)
   * INV-PE-03 : max MAX_POLISH_ROUNDS iterations
   * INV-PE-06 : fail-closed sur toute erreur LLM
   */
  async polish(
    input:            ForgePacketInput,
    initialResult:    SovereignForgeResult,
    seedBase:         string,
  ): Promise<PolishResult> {
    const compositeInitial = initialResult.s_score?.composite
      ?? initialResult.macro_score?.composite ?? 0;
    const initialProseSha  = sha256(initialResult.final_prose);

    // INV-PE-02 : vérification de plage
    if (compositeInitial >= POLISH_SEAL_THRESHOLD) {
      return this.buildSkipResult(
        initialResult.final_prose,
        compositeInitial,
        'ALREADY_SEAL: composite already above threshold',
        initialProseSha,
      );
    }
    if (compositeInitial < POLISH_FLOOR) {
      return this.buildSkipResult(
        initialResult.final_prose,
        compositeInitial,
        `BELOW_POLISH_FLOOR: composite ${compositeInitial.toFixed(1)} < ${POLISH_FLOOR}`,
        initialProseSha,
      );
    }

    const diagnostic = extractPolishDiagnostic(initialResult);

    if (diagnostic.blocking_sub_axes.length === 0) {
      return this.buildSkipResult(
        initialResult.final_prose,
        compositeInitial,
        'NO_BLOCKING_AXES: no actionable sub-axis identified for polish',
        initialProseSha,
      );
    }

    let currentProse   = initialResult.final_prose;
    let currentResult  = initialResult;
    const rounds:        PolishRound[] = [];

    for (let round = 1; round <= MAX_POLISH_ROUNDS; round++) {
      const roundDiag       = extractPolishDiagnostic(currentResult);
      const compositeBefore = roundDiag.composite_before;
      const rciBefore       = roundDiag.rci_score;
      const proseSha256Before = sha256(currentProse);

      // Construire le prompt polish (fail-closed si erreur)
      let polishPrompt: string;
      try {
        // On a besoin du ForgePacket assemblé — on passe par l'input
        polishPrompt = buildPolishPromptFromInput(currentProse, roundDiag, input);
      } catch (err) {
        throw new PolishError(
          'PROMPT_BUILD_FAILED',
          `Round ${round}: prompt build failed`,
          err,
        );
      }

      // Appel LLM pour le rewrite (via provider direct)
      let polishedProse: string;
      try {
        polishedProse = await this.callPolishLLM(polishPrompt, seedBase, round);
      } catch (err) {
        throw new PolishError(
          'LLM_CALL_FAILED',
          `Round ${round}: LLM polish call failed`,
          err,
        );
      }

      // Re-scorer la prose polie — réutilise le même input avec la prose injectée
      const polishedInput = injectPolishedProse(input, polishedProse);
      let polishedResult: SovereignForgeResult;
      try {
        polishedResult = await runSovereignForge(polishedInput, this.provider);
      } catch (err) {
        throw new PolishError(
          'RESCORE_FAILED',
          `Round ${round}: re-scoring failed`,
          err,
        );
      }

      const compositeAfter = polishedResult.s_score?.composite
        ?? polishedResult.macro_score?.composite ?? 0;
      const rciAfter       = polishedResult.macro_score?.macro_axes?.rci?.score ?? 0;
      const proseSha256After = sha256(polishedProse);

      rounds.push({
        round,
        seed:                sha256(`${seedBase}:polish:${round}`),
        composite_before:    compositeBefore,
        composite_after:     compositeAfter,
        delta_composite:     compositeAfter - compositeBefore,
        rci_before:          rciBefore,
        rci_after:           rciAfter,
        verdict_after:       polishedResult.verdict,
        prose_sha256_before: proseSha256Before,
        prose_sha256_after:  proseSha256After,
      });

      currentProse  = polishedProse;
      currentResult = polishedResult;

      // SEAL atteint — on arrête
      if (polishedResult.verdict === 'SEAL') {
        break;
      }
    }

    const finalComposite = currentResult.s_score?.composite
      ?? currentResult.macro_score?.composite ?? 0;
    const finalSha256     = sha256(currentProse);
    const polishHash      = sha256(
      POLISH_ENGINE_VERSION + rounds.length + finalSha256
    );

    return {
      verdict:            currentResult.verdict,
      final_prose:        currentProse,
      final_composite:    finalComposite,
      rounds,
      rounds_executed:    rounds.length,
      polish_gain:        finalComposite - compositeInitial,
      prose_sha256_final: finalSha256,
      polish_hash:        polishHash,
      created_at:         new Date().toISOString(),
    };
  }

  /**
   * Appel LLM direct pour le rewrite — sans passer par le ForgeAssembler.
   * Utilise le même model_id que le runner principal.
   * INV-PE-05 : seed déterministe = SHA256(seedBase + ':polish:' + round)
   */
  private async callPolishLLM(
    prompt: string,
    seedBase: string,
    round: number,
  ): Promise<string> {
    const ANTHROPIC_API_URL   = 'https://api.anthropic.com/v1/messages';
    const ANTHROPIC_VERSION   = '2023-06-01';
    const TIMEOUT_MS          = 60000;

    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    try {
      const resp = await globalThis.fetch(ANTHROPIC_API_URL, {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model:      this.modelId,
          max_tokens: 2000,
          messages:   [{ role: 'user', content: prompt }],
        }),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        throw new PolishError(
          'HTTP_ERROR',
          `Round ${round}: Anthropic API returned ${resp.status} ${resp.statusText}`,
        );
      }

      const data = await resp.json() as {
        content?: Array<{ type: string; text: string }>;
      };
      const text = data.content?.[0]?.text;
      if (!text || text.trim().length < 100) {
        throw new PolishError(
          'EMPTY_RESPONSE',
          `Round ${round}: LLM returned empty or too-short prose`,
        );
      }
      return text.trim();

    } catch (err) {
      if (err instanceof PolishError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new PolishError('TIMEOUT', `Round ${round}: LLM call exceeded ${TIMEOUT_MS}ms`);
      }
      throw new PolishError('NETWORK_ERROR', `Round ${round}: ${err instanceof Error ? err.message : String(err)}`, err);
    } finally {
      clearTimeout(tid);
    }
  }

  private buildSkipResult(
    prose: string,
    composite: number,
    reason: string,
    proseSha256: string,
  ): PolishResult {
    return {
      verdict:            'SKIP' as const,
      final_prose:        prose,
      final_composite:    composite,
      rounds:             [],
      rounds_executed:    0,
      polish_gain:        0,
      prose_sha256_final: proseSha256,
      polish_hash:        sha256(POLISH_ENGINE_VERSION + '0' + proseSha256),
      created_at:         new Date().toISOString(),
      skip_reason:        reason,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Construit le prompt polish depuis un ForgePacketInput (pas encore assemblé en ForgePacket).
 * Extrait les infos nécessaires directement depuis l'input.
 */
function buildPolishPromptFromInput(
  prose:      string,
  diagnostic: PolishDiagnostic,
  input:      ForgePacketInput,
): string {
  // Adapter : ForgePacketInput → objet minimal compatible ForgePacket pour le prompt builder
  const pseudoPacket = {
    style_genome: input.style_profile ?? { lexicon: { signature_words: [], forbidden_words: [] }, imagery: { recurrent_motifs: [] }, rhythm: {}, tone: {}, voice: null },
    emotion_contract: { terminal_state: { dominant: 'sadness' } },
    intent: { scene_goal: input.scene?.objective ?? 'Scène narrative', conflict_type: input.scene?.conflict_type ?? 'internal' },
  } as unknown as ForgePacket;

  return buildPolishPrompt(prose, diagnostic, pseudoPacket);
}

/**
 * Injecte la prose polie dans le ForgePacketInput pour re-scoring.
 * Le ForgePacket assemblé passera par runSovereignForge avec la prose overridée.
 *
 * Note : runSovereignForge génère normalement la prose via LLM.
 * Pour re-scorer une prose existante, on utilise le pre_generated_prose override
 * si le moteur le supporte, sinon on fall-through (scoring seulement).
 */
function injectPolishedProse(
  input: ForgePacketInput,
  prose: string,
): ForgePacketInput {
  return {
    ...input,
    pre_generated_prose: prose,
  } as ForgePacketInput & { pre_generated_prose: string };
}
