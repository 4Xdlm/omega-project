/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — WRITER (Persistance post-SEAL)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: loom-writer.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * Phase: R1 — Loom v1 Minimal
 *
 * Point d'intégration : APRÈS verdict SEAL/SAGA_READY dans engine.ts.
 * Persiste l'état narratif via le LoomAdapter.
 *
 * Règle de vérité (INV-LOOM-07) :
 *   1. Source primaire   = CDE StateDelta (new_facts, debts, arc_movements)
 *   2. Source secondaire = extraction LLM bornée (summary, motifs seulement)
 *   3. Si conflit        = CDE gagne TOUJOURS
 *
 * Invariants :
 *   INV-LOOM-02 : Jamais appelé sur verdict REJECT
 *   INV-LOOM-05 : Coût ≤ +1 LLM/scène (extraction bornée)
 *   INV-LOOM-07 : CDE = vérité primaire
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgeContinuity, SovereignProvider } from '../types.js';
import type { StateDelta, ArcState, DebtEntry, CanonFact } from '../cde/types.js';
import type { LoomAdapter, LoomWriteInput, LoomWriteReceipt } from './loom-types.js';
import { getLoomConfig } from './loom-config.js';
import { sha256 } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Ce que l'extraction LLM produit (source secondaire bornée). */
interface LoomExtraction {
  readonly scene_summary: string;       // ≤3 phrases
  readonly new_motifs: readonly string[];  // motifs détectés (≤5)
  readonly emergent_threads: readonly string[]; // threads non dans CDE (≤3)
}

/** Résultat nul quand extraction désactivée ou CDE suffit. */
const NULL_EXTRACTION: LoomExtraction = {
  scene_summary: '',
  new_motifs: [],
  emergent_threads: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contexte nécessaire pour construire le LoomWriteInput.
 * Assemblé dans engine.ts depuis les données disponibles post-verdict.
 */
export interface LoomWriteContext {
  readonly book_id: string;
  readonly chapter: number;
  readonly scene_id: string;
  readonly cde_delta: StateDelta;
  readonly arc_states: readonly ArcState[];
  readonly canon_facts: readonly CanonFact[];
  readonly open_debts: readonly DebtEntry[];
  readonly sealed_prose: string;
  readonly prose_hash: string;
  readonly characters_present: readonly string[];
  readonly conflict_type: string;
  readonly terminal_emotion: string;
  readonly terminal_valence: number;
  readonly input_continuity: ForgeContinuity;
}

/**
 * Persiste l'état narratif après une scène scellée.
 *
 * INV-LOOM-02 : ne JAMAIS appeler sur verdict REJECT.
 * INV-LOOM-07 : CDE StateDelta = source primaire.
 *
 * @param adapter - Backend Loom (ChromaDB, InMemory, etc.)
 * @param ctx - Contexte d'écriture assemblé depuis le pipeline
 * @param provider - SovereignProvider pour extraction LLM (optionnel)
 * @returns LoomWriteReceipt avec hash de traçabilité
 */
export async function updateLoomFromSealedProse(
  adapter: LoomAdapter,
  ctx: LoomWriteContext,
  provider?: SovereignProvider,
): Promise<LoomWriteReceipt> {
  const config = getLoomConfig();

  // ── INV-LOOM-01 : Loom OFF → receipt vide ──
  if (!config.ENABLED) {
    return makeNullReceipt(ctx);
  }

  // ── Health check ──
  const healthy = await adapter.healthCheck();
  if (!healthy) {
    return makeNullReceipt(ctx);
  }

  // ── Extraction LLM secondaire (si activée et provider disponible) ──
  let extraction = NULL_EXTRACTION;

  if (config.EXTRACTION_ENABLED && provider) {
    try {
      extraction = await extractFromProse(ctx.sealed_prose, ctx.cde_delta, provider);
    } catch {
      // Extraction failed → degrade gracefully, CDE seul
      extraction = NULL_EXTRACTION;
    }
  }

  // ── Assembler le LoomWriteInput ──
  // Note : le scene_summary est construit par l'adapter depuis cde_delta.new_facts
  // (source primaire) + extraction si disponible. Pas de pré-calcul ici.
  const writeInput: LoomWriteInput = {
    book_id: ctx.book_id,
    chapter: ctx.chapter,
    scene_id: ctx.scene_id,
    cde_delta: ctx.cde_delta,
    arc_states: ctx.arc_states,
    canon_facts: ctx.canon_facts,
    open_debts: mergeDebtsWithExtraction(ctx.open_debts, extraction.emergent_threads, ctx.chapter),
    sealed_prose: ctx.sealed_prose,
    prose_hash: ctx.prose_hash,
    characters_present: ctx.characters_present,
    conflict_type: ctx.conflict_type,
    terminal_emotion: ctx.terminal_emotion,
    terminal_valence: ctx.terminal_valence,
    input_continuity: ctx.input_continuity,
  };

  // ── Écrire dans le backend ──
  const receipt = await adapter.writeState(writeInput);

  return receipt;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION LLM BORNÉE — Source secondaire (INV-LOOM-05 : +1 LLM max)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extraction LLM minimale depuis la prose scellée.
 *
 * Ne produit QUE :
 * - scene_summary (≤3 phrases) — si CDE new_facts insuffisant
 * - new_motifs (≤5) — symboles/images récurrents
 * - emergent_threads (≤3) — threads non détectés par CDE
 *
 * INV-LOOM-05 : exactement 1 appel generateStructuredJSON.
 * INV-LOOM-07 : ne remplace JAMAIS les données CDE.
 */
async function extractFromProse(
  prose: string,
  cdeDelta: StateDelta,
  provider: SovereignProvider,
): Promise<LoomExtraction> {
  const prompt = buildExtractionPrompt(prose, cdeDelta);
  const raw = await provider.generateStructuredJSON(prompt);

  return parseExtraction(raw);
}

/**
 * Prompt d'extraction rigide — force la concision.
 */
function buildExtractionPrompt(prose: string, cdeDelta: StateDelta): string {
  const existingFacts = cdeDelta.new_facts.join('; ');
  const existingDebts = cdeDelta.debts_opened.map((d) => d.content).join('; ');
  const existingArcs = cdeDelta.arc_movements.map((a) => `${a.character_id}: ${a.movement}`).join('; ');

  return `Tu es un extracteur narratif. Analyse cette prose scellée et retourne UNIQUEMENT un JSON.

PROSE :
"""
${prose.slice(0, 3000)}
"""

FAITS DÉJÀ EXTRAITS PAR LE CDE (NE PAS DUPLIQUER) :
- Faits : ${existingFacts || 'aucun'}
- Dettes : ${existingDebts || 'aucune'}
- Arcs : ${existingArcs || 'aucun'}

INSTRUCTIONS STRICTES :
1. scene_summary : résumé de la scène en 3 phrases MAXIMUM. Ne PAS répéter les faits CDE.
2. new_motifs : liste de symboles, images ou phrases récurrentes détectés (MAX 5). Exemples : "la lettre froissée", "l'odeur de cendre", "les mains qui tremblent".
3. emergent_threads : fils narratifs NON présents dans les dettes CDE (MAX 3). Un thread = une question ouverte ou une tension non résolue.

RETOURNE UNIQUEMENT CE JSON (pas de texte avant/après) :
{
  "scene_summary": "...",
  "new_motifs": ["...", "..."],
  "emergent_threads": ["...", "..."]
}`;
}

/**
 * Parse le JSON retourné par le LLM. Borne les longueurs.
 * Si le parse échoue → retourne NULL_EXTRACTION.
 */
function parseExtraction(raw: unknown): LoomExtraction {
  if (!raw || typeof raw !== 'object') return NULL_EXTRACTION;

  const obj = raw as Record<string, unknown>;

  const sceneSummary = typeof obj.scene_summary === 'string'
    ? obj.scene_summary.slice(0, 500)
    : '';

  const newMotifs = Array.isArray(obj.new_motifs)
    ? obj.new_motifs.filter((m): m is string => typeof m === 'string').slice(0, 5)
    : [];

  const emergentThreads = Array.isArray(obj.emergent_threads)
    ? obj.emergent_threads.filter((t): t is string => typeof t === 'string').slice(0, 3)
    : [];

  return { scene_summary: sceneSummary, new_motifs: newMotifs, emergent_threads: emergentThreads };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fusionne les dettes CDE avec les threads émergents de l'extraction LLM.
 * Les threads LLM sont ajoutés comme nouvelles DebtEntry ouvertes.
 */
function mergeDebtsWithExtraction(
  cdeDebts: readonly DebtEntry[],
  emergentThreads: readonly string[],
  chapter: number,
): readonly DebtEntry[] {
  if (emergentThreads.length === 0) return cdeDebts;

  const newDebts: DebtEntry[] = emergentThreads.map((thread, i) => ({
    id: `loom-extracted-${chapter}-${i}`,
    content: thread,
    opened_at: String(chapter),
    resolved: false,
  }));

  return [...cdeDebts, ...newDebts];
}

/**
 * Receipt vide pour quand Loom est OFF ou backend down.
 */
function makeNullReceipt(ctx: LoomWriteContext): LoomWriteReceipt {
  return {
    book_id: ctx.book_id,
    chapter: ctx.chapter,
    scene_id: ctx.scene_id,
    input_hash: sha256(JSON.stringify({ book_id: ctx.book_id, chapter: ctx.chapter, scene_id: ctx.scene_id })),
    upserted: { characters: 0, threads: 0, scenes: 0, motifs: 0, arcs: 0 },
    source_provenance: 'cde_only',
    written_at: new Date().toISOString(),
  };
}
