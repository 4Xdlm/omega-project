/**
 * OMEGA V2.3-A P3 — buildRewritePrompt (injection source->prompt, Option B, ISOLÉ)
 *
 * Compose le prompt de RÉÉCRITURE/EXPANSION : il INJECTE le texte source du segment
 * (manquant jusqu'ici, cf finding P2 brief figé) + le contrat émotionnel P0 + le brief P1.
 *
 * CONTRAT D'ISOLEMENT (Tribunal 2/2 GO_CODE P3 2026-05-29, Option B) :
 *   - Wrapper de prompt DÉDIÉ : ne pollue PAS beat.action, ne modifie PAS ForgePacket/
 *     SceneBrief/EmotionContract ni le chemin ex-nihilo. Rollback = supprimer ce module.
 *   - Pur, déterministe (même entrée -> même prompt -> même prompt_hash). Zéro LLM/réseau ici
 *     (la génération réelle = provider.generateDraft(prompt,'rewrite_v2_3',seed) en smoke opt-in séparé).
 *   - N'importe PAS generateChunkedDraft.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A — Sprint V2.3-A P3 2026-05-29
 */

import { createHash } from 'node:crypto';
import type { EmotionContract } from '../types.js';

export type RewriteMode = 'rewrite' | 'expand';

export interface RewritePromptInput {
  readonly scene_brief: string; // = forgePacketToSceneBrief(packet) (P1)
  readonly source_segment: string; // LE texte à réécrire (injection — cœur de P3)
  readonly source_segment_hash: string; // = candidate.segment_hash (traçabilité, obligatoire)
  readonly emotion_contract: EmotionContract; // = candidate.contract (P0)
  readonly rewrite_mode: RewriteMode;
  readonly constraints?: { readonly max_words?: number };
}

export interface RewritePromptResult {
  readonly prompt: string;
  readonly prompt_hash: string; // SHA256 du prompt (déterminisme auditable)
  readonly source_segment_hash: string;
  readonly mode: RewriteMode;
}

/** Mode de génération passé à provider.generateDraft (jamais generateChunkedDraft). */
export const REWRITE_GENERATION_MODE = 'rewrite_v2_3';

function consigne(mode: RewriteMode): string {
  const verbe =
    mode === 'expand'
      ? 'ÉTENDS (développe, enrichis) le SEGMENT SOURCE ci-dessous'
      : 'RÉÉCRIS le SEGMENT SOURCE ci-dessous';
  return (
    `[CONSIGNE SYSTÈME]\n` +
    `Tu ${verbe}. Règles inviolables :\n` +
    `- Préserve les FAITS, événements, personnages et lieux du segment source. N'invente PAS d'intrigue nouvelle.\n` +
    `- Applique le CONTRAT ÉMOTIONNEL (trajectoire des dominants Q1->Q4, niveau d'arousal, rupture).\n` +
    `- Prose française de qualité publication. Ne commente pas, ne résume pas : produis uniquement la prose ` +
    (mode === 'expand' ? 'étendue.' : 'réécrite.')
  );
}

function contractSection(c: EmotionContract): string {
  const q = c.curve_quartiles;
  const doms = `Q1=${q[0].dominant} Q2=${q[1].dominant} Q3=${q[2].dominant} Q4=${q[3].dominant}`;
  return (
    `[CONTRAT ÉMOTIONNEL]\n` +
    `Trajectoire dominants : ${doms}.\n` +
    `Arousal range : [${c.intensity_range.min.toFixed(2)}, ${c.intensity_range.max.toFixed(2)}] ; ` +
    `slope=${c.tension.slope_target} ; pic@${c.tension.pic_position_pct}% ; faille@${c.tension.faille_position_pct}%.\n` +
    `Rupture : ${c.rupture.exists ? `oui @${c.rupture.position_pct}% (${c.rupture.before_dominant}->${c.rupture.after_dominant})` : 'non'} ; ` +
    `valence ${c.valence_arc.start.toFixed(2)}->${c.valence_arc.end.toFixed(2)} (${c.valence_arc.direction}).`
  );
}

/**
 * Construit le prompt de réécriture (pur, déterministe). N'appelle aucun LLM.
 */
export function buildRewritePrompt(input: RewritePromptInput): RewritePromptResult {
  if (input.source_segment_hash.length === 0) {
    throw new Error('buildRewritePrompt: source_segment_hash obligatoire (traçabilité P0/P1/P3).');
  }
  const maxWords = input.constraints?.max_words;
  const outLine =
    maxWords && maxWords > 0
      ? `Prose ${input.rewrite_mode === 'expand' ? 'étendue' : 'réécrite'} uniquement (<= ${maxWords} mots).`
      : `Prose ${input.rewrite_mode === 'expand' ? 'étendue' : 'réécrite'} uniquement.`;

  const prompt = [
    consigne(input.rewrite_mode),
    `[SEGMENT SOURCE]\n${input.source_segment}`,
    contractSection(input.emotion_contract),
    `[BRIEF SCÈNE]\n${input.scene_brief}`,
    `[SORTIE ATTENDUE]\n${outLine}`,
  ].join('\n\n');

  return {
    prompt,
    prompt_hash: createHash('sha256').update(prompt).digest('hex'),
    source_segment_hash: input.source_segment_hash,
    mode: input.rewrite_mode,
  };
}
