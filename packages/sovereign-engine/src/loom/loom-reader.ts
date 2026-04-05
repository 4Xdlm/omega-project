/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — READER (Enrichissement pré-génération)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: loom-reader.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * Phase: R1 — Loom v1 Minimal
 *
 * Point d'intégration : AVANT assembleForgePacket() dans engine.ts.
 * Enrichit ForgeContinuity avec le contexte Loom (cross-chapitre).
 *
 * Invariants :
 *   INV-LOOM-01 : Loom OFF → retourne input.continuity EXACTEMENT tel quel
 *   INV-LOOM-04 : Ne modifie JAMAIS les emotion_contract targets
 *   INV-LOOM-06 : ForgeContinuity fourni > Loom enrichi (merge non-destructif)
 *
 * Coût LLM : 0 (retrieval pur)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgeContinuity, CharacterState } from '../types.js';
import type { LoomAdapter, LoomReadInput, LoomContext, LoomEnrichedContinuity, LoomCharacterEntry } from './loom-types.js';
import { getLoomConfig } from './loom-config.js';
import { NullLoomAdapter } from './loom-adapter.js';
import type { ForgePacketInput } from '../input/forge-packet-assembler.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enrichit le ForgePacketInput avec le contexte Loom cross-chapitre.
 *
 * Si Loom OFF → retourne input tel quel (INV-LOOM-01).
 * Si Loom ON + DB vide → retourne input tel quel (passthrough).
 * Si Loom ON + données trouvées → enrichit continuity via merge non-destructif.
 *
 * @param input - ForgePacketInput original
 * @param adapter - Backend Loom (NullLoomAdapter si OFF)
 * @param readInput - Paramètres de recherche Loom
 * @returns ForgePacketInput avec continuity enrichie (ou identique si OFF/vide)
 */
export async function enrichPacketWithLoom(
  input: ForgePacketInput,
  adapter: LoomAdapter,
  readInput: LoomReadInput,
): Promise<ForgePacketInput> {
  const config = getLoomConfig();

  // ── INV-LOOM-01 : Loom OFF → passthrough exact ──
  if (!config.ENABLED) {
    return input;
  }

  // ── Adapter null guard ──
  if (adapter instanceof NullLoomAdapter) {
    return input;
  }

  // ── Health check ──
  const healthy = await adapter.healthCheck();
  if (!healthy) {
    // Backend down → degrade gracefully, pas de crash
    return input;
  }

  // ── Retrieval ──
  const loomContext = await adapter.readContext(readInput);

  // ── Si rien trouvé → passthrough ──
  if (isEmptyContext(loomContext)) {
    return input;
  }

  // ── Merge non-destructif (INV-LOOM-06) ──
  const enrichedContinuity = mergeContinuity(input.continuity, loomContext);

  return {
    ...input,
    continuity: enrichedContinuity,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERGE — INV-LOOM-06 : ForgeContinuity fourni > Loom enrichi
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merge non-destructif : l'original a TOUJOURS priorité.
 *
 * - previous_scene_summary : original conservé, Loom ajouté en suffixe séparé
 * - character_states : originaux conservés, Loom bouche les trous (personnages absents)
 * - open_threads : originaux conservés, Loom ajoute les threads absents
 * - loom_context : attaché pour traçabilité (jamais lu par le pipeline)
 */
export function mergeContinuity(
  original: ForgeContinuity,
  loomContext: LoomContext,
): LoomEnrichedContinuity {
  // ── Summary : original en priorité, Loom en enrichissement ──
  // J4 FIX: pas de tags internes [Loom]/[Motifs] — texte naturel uniquement
  let mergedSummary = original.previous_scene_summary;
  if (loomContext.enriched_summary && loomContext.enriched_summary.length > 0) {
    if (mergedSummary.length > 0) {
      // Ajouter le contexte Loom APRÈS l'original, en prose naturelle
      mergedSummary = `${mergedSummary} Par ailleurs, ${loomContext.enriched_summary}`;
    } else {
      // Pas de summary original → utiliser Loom
      mergedSummary = loomContext.enriched_summary;
    }
  }

  // ── R2/R3: Motifs récurrents injectés dans le summary ──
  // J4 FIX: formulation naturelle au lieu de tag [Motifs]
  if (loomContext.active_motifs.length > 0) {
    const motifList = loomContext.active_motifs
      .slice(0, 5) // max 5 motifs
      .map((m) => m.content)
      .join(', ');
    mergedSummary = `${mergedSummary} Motifs récurrents à maintenir : ${motifList}.`;
  }

  // ── Character states : originaux prioritaires, Loom comble les absents ──
  const mergedCharacters = mergeCharacterStates(
    original.character_states,
    loomContext.character_states,
  );

  // ── Threads : originaux prioritaires, Loom ajoute les manquants ──
  const mergedThreads = mergeThreads(
    original.open_threads,
    loomContext.active_threads,
  );

  return {
    previous_scene_summary: mergedSummary,
    character_states: mergedCharacters,
    open_threads: mergedThreads,
    loom_context: loomContext,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merge character states : les originaux gagnent toujours.
 * Les personnages Loom ne sont ajoutés que s'ils n'existent pas dans l'original.
 */
function mergeCharacterStates(
  original: readonly CharacterState[],
  loomCharacters: readonly LoomCharacterEntry[],
): readonly CharacterState[] {
  const originalIds = new Set(original.map((c) => c.character_id));
  const loomAdditions: CharacterState[] = [];

  for (const loomChar of loomCharacters) {
    if (!originalIds.has(loomChar.character_id)) {
      // Personnage absent de l'original → ajouter depuis Loom
      loomAdditions.push({
        character_id: loomChar.character_id,
        character_name: loomChar.character_name,
        emotional_state: loomChar.emotional_state,
        physical_state: loomChar.physical_state,
        location: loomChar.location,
      });
    }
    // Si le personnage est déjà dans l'original → on garde l'original (INV-LOOM-06)
  }

  if (loomAdditions.length === 0) {
    return original; // Aucun ajout → référence identique
  }

  return [...original, ...loomAdditions];
}

/**
 * Merge threads : les originaux sont conservés tels quels.
 * Les threads Loom ne sont ajoutés que s'ils n'apparaissent pas déjà.
 * Comparaison par contenu (pas d'ID sur open_threads dans ForgeContinuity).
 */
function mergeThreads(
  original: readonly string[],
  loomThreads: readonly { readonly content: string }[],
): readonly string[] {
  const originalSet = new Set(original.map((t) => t.toLowerCase().trim()));
  const loomAdditions: string[] = [];

  for (const loomThread of loomThreads) {
    const normalized = loomThread.content.toLowerCase().trim();
    if (!originalSet.has(normalized)) {
      loomAdditions.push(loomThread.content);
    }
  }

  if (loomAdditions.length === 0) {
    return original; // Aucun ajout → référence identique
  }

  return [...original, ...loomAdditions];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════

/** Vérifie si un LoomContext est vide (rien trouvé dans le store). */
function isEmptyContext(ctx: LoomContext): boolean {
  return (
    ctx.enriched_summary.length === 0 &&
    ctx.character_states.length === 0 &&
    ctx.active_threads.length === 0 &&
    ctx.active_motifs.length === 0 &&
    ctx.arc_trajectory === null &&
    ctx.retrieved_scenes.length === 0
  );
}

/**
 * Construit le LoomReadInput depuis un ForgePacketInput.
 * Utilitaire pour engine.ts — extrait les infos nécessaires au retrieval.
 */
export function buildLoomReadInput(
  input: ForgePacketInput,
  bookId: string,
  chapter: number,
): LoomReadInput {
  return {
    book_id: bookId,
    chapter,
    scene_id: input.scene?.scene_id || `scene-${chapter}`,
    scene_goal: input.scene?.objective || '',
    expected_characters: input.continuity.character_states.map((c) => c.character_id),
    conflict_type: input.scene?.conflict_type || 'unknown',
  };
}
