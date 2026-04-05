/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — TYPE DEFINITIONS (CONTRAT GELÉ)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: loom-types.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Phase: R1 — Loom v1 Minimal
 *
 * Loom = couche de persistance branchée sur le CDE (Context Distillation Engine).
 * PAS un world model. PAS une mémoire parallèle. PAS une vérité concurrente.
 *
 * Règle de vérité :
 *   1. Source primaire   = CDE StateDelta
 *   2. Source secondaire = extraction LLM bornée depuis prose scellée
 *   3. Si conflit        = CDE gagne TOUJOURS
 *
 * Invariants:
 *   INV-LOOM-01 : Loom OFF = pipeline identique bit-à-bit (toggle pur)
 *   INV-LOOM-02 : LoomWriter uniquement sur prose SEAL/SAGA_READY (jamais REJECT)
 *   INV-LOOM-03 : Embeddings déterministes (même texte → même vecteur, toujours)
 *   INV-LOOM-04 : LoomReader ne modifie PAS les emotion_contract targets
 *   INV-LOOM-05 : Coût ≤ +1 LLM/scène (extraction) + 0 LLM (retrieval/scoring)
 *   INV-LOOM-06 : Merge non-destructif : ForgeContinuity fourni > Loom enrichi
 *   INV-LOOM-07 : CDE StateDelta = vérité primaire, extraction LLM = enrichissement borné
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgeContinuity } from '../types.js';
import type { StateDelta, ArcState, DebtEntry, CanonFact } from '../cde/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Clé composite pour isoler les données par livre. */
export interface LoomBookId {
  readonly book_id: string;
}

/** Identifiant de scène dans le contexte Loom. */
export interface LoomSceneId extends LoomBookId {
  readonly chapter: number;
  readonly scene_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS — Ce que Loom persiste (5 collections ChromaDB)
// ═══════════════════════════════════════════════════════════════════════════════

/** État d'un personnage persisté cross-chapitre. */
export interface LoomCharacterEntry {
  readonly book_id: string;
  readonly character_id: string;
  readonly character_name: string;
  readonly emotional_state: string;
  readonly physical_state: string;
  readonly location: string;
  /** Phase de l'arc narratif (source : CDE ArcState). */
  readonly arc_phase: 'setup' | 'confrontation' | 'resolution' | 'unknown';
  /** Besoin courant du personnage (source : CDE ArcState). */
  readonly current_need: string;
  /** Tension interne active (source : CDE ArcState). */
  readonly tension: string;
  /** Chapitre + scène de dernière mise à jour. */
  readonly last_seen_chapter: number;
  readonly last_seen_scene_id: string;
  readonly updated_at: string; // ISO 8601
}

/** Thread narratif persisté (dette = graine plantée). */
export interface LoomThreadEntry {
  readonly book_id: string;
  readonly thread_id: string;
  readonly content: string;
  readonly status: 'open' | 'resolved' | 'dormant';
  /** Chapitre où le thread a été ouvert. */
  readonly opened_chapter: number;
  /** Chapitre de dernière mention. */
  readonly last_seen_chapter: number;
  /** Évidence de résolution (si resolved). */
  readonly resolution_evidence: string | null;
  readonly updated_at: string;
}

/** Résumé d'une scène persistée. */
export interface LoomSceneEntry {
  readonly book_id: string;
  readonly chapter: number;
  readonly scene_id: string;
  /** Résumé court (≤3 phrases, source primaire: CDE, secondaire: extraction LLM). */
  readonly summary: string;
  /** Personnages présents dans la scène. */
  readonly characters_present: readonly string[];
  /** Type de conflit dominant. */
  readonly conflict_type: string;
  /** Émotion dominante en fin de scène. */
  readonly terminal_emotion: string;
  /** Valence émotionnelle terminale [-10, +10]. */
  readonly terminal_valence: number;
  /** Hash SHA256 de la prose scellée. */
  readonly prose_hash: string;
  readonly created_at: string;
}

/** Motif narratif récurrent. */
export interface LoomMotifEntry {
  readonly book_id: string;
  readonly motif_id: string;
  /** Description du motif (symbole, image, phrase clé). */
  readonly content: string;
  readonly category: 'symbol' | 'image' | 'phrase' | 'sensory';
  /** Nombre d'occurrences détectées. */
  readonly frequency: number;
  readonly first_chapter: number;
  readonly last_chapter: number;
  readonly updated_at: string;
}

/** Trajectoire émotionnelle globale du livre/arc. */
export interface LoomArcEntry {
  readonly book_id: string;
  /** Identifiant d'arc (ex: 'main_arc', 'character:{id}', 'theme:{id}'). */
  readonly arc_id: string;
  readonly arc_type: 'main' | 'character' | 'thematic';
  /** Valence de départ (chapitre 1). */
  readonly valence_start: number;
  /** Valence courante (dernier chapitre). */
  readonly valence_current: number;
  /** Direction calculée. */
  readonly direction: 'darkening' | 'brightening' | 'stable' | 'oscillating';
  /** Chapitres clés (pics, ruptures, tournants). */
  readonly key_chapters: readonly number[];
  readonly updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOM CONTEXT — Ce que LoomReader produit (sortie enrichissement)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contexte narratif récupéré par le LoomReader depuis le store persistant.
 * Sert à enrichir ForgeContinuity AVANT assembleForgePacket().
 *
 * INV-LOOM-06 : ForgeContinuity fourni a TOUJOURS priorité sur LoomContext.
 * Le merge est additif, jamais destructif.
 */
export interface LoomContext {
  /** Résumé enrichi (concaténation des scènes proches + previous_scene_summary). */
  readonly enriched_summary: string;
  /** États personnages cross-chapitre (les plus récents). */
  readonly character_states: readonly LoomCharacterEntry[];
  /** Threads actifs + dormants pertinents. */
  readonly active_threads: readonly LoomThreadEntry[];
  /** Motifs récurrents à maintenir (frequency ≥ 2). */
  readonly active_motifs: readonly LoomMotifEntry[];
  /** Trajectoire émotionnelle globale de l'arc principal. */
  readonly arc_trajectory: LoomArcEntry | null;
  /** Scènes sources utilisées pour le retrieval (traçabilité). */
  readonly retrieved_scenes: readonly LoomSceneReference[];
  /** Métadonnées de retrieval pour telemetry. */
  readonly retrieval_metadata: LoomRetrievalMetadata;
}

/** Référence à une scène utilisée dans le retrieval (traçabilité). */
export interface LoomSceneReference {
  readonly chapter: number;
  readonly scene_id: string;
  readonly similarity_score: number;
  readonly summary_excerpt: string;
}

/** Métadonnées de retrieval pour observabilité (Phase R3). */
export interface LoomRetrievalMetadata {
  readonly query_count: number;
  readonly total_hits: number;
  readonly embedding_model: string;
  readonly retrieval_time_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOM READ — Input pour le LoomReader
// ═══════════════════════════════════════════════════════════════════════════════

/** Ce que le LoomReader reçoit pour savoir quoi chercher. */
export interface LoomReadInput {
  readonly book_id: string;
  readonly chapter: number;
  readonly scene_id: string;
  /** Objectif de la scène (pour retrieval sémantique). */
  readonly scene_goal: string;
  /** Personnages prévus dans la scène (pour filtrer character_states). */
  readonly expected_characters: readonly string[];
  /** Type de conflit (pour filtrer threads pertinents). */
  readonly conflict_type: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOM WRITE — Input pour le LoomWriter
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ce que le LoomWriter reçoit pour persister l'état post-SEAL.
 *
 * INV-LOOM-07 : CDE StateDelta = source primaire.
 * L'extraction LLM ne complète que les champs absents du delta.
 */
export interface LoomWriteInput {
  readonly book_id: string;
  readonly chapter: number;
  readonly scene_id: string;

  // ── Source primaire : CDE ──
  /** StateDelta produit par le CDE après génération. */
  readonly cde_delta: StateDelta;
  /** ArcStates courants des personnages (source CDE). */
  readonly arc_states: readonly ArcState[];
  /** CanonFacts mis à jour. */
  readonly canon_facts: readonly CanonFact[];
  /** Dettes narratives (source CDE). */
  readonly open_debts: readonly DebtEntry[];

  // ── Source secondaire : prose scellée ──
  /** Prose scellée (pour extraction LLM bornée si enrichissement nécessaire). */
  readonly sealed_prose: string;
  /** Hash SHA256 de la prose scellée. */
  readonly prose_hash: string;

  // ── Contexte de scène ──
  /** Personnages présents dans la scène. */
  readonly characters_present: readonly string[];
  /** Type de conflit. */
  readonly conflict_type: string;
  /** Émotion terminale dominante. */
  readonly terminal_emotion: string;
  /** Valence terminale. */
  readonly terminal_valence: number;

  // ── ForgeContinuity d'entrée (pour merge). */
  readonly input_continuity: ForgeContinuity;
}

/** Reçu d'écriture Loom — preuve de persistance. */
export interface LoomWriteReceipt {
  readonly book_id: string;
  readonly chapter: number;
  readonly scene_id: string;
  /** Hash SHA256 de tout l'input sérialisé. */
  readonly input_hash: string;
  /** Nombre d'entrées upsertées par collection. */
  readonly upserted: {
    readonly characters: number;
    readonly threads: number;
    readonly scenes: number;
    readonly motifs: number;
    readonly arcs: number;
  };
  /** Source primaire utilisée pour chaque champ. */
  readonly source_provenance: 'cde_only' | 'cde_plus_extraction';
  /** Timestamp d'écriture. */
  readonly written_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOM ADAPTER — Interface backend swappable
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface backend pour le Loom.
 *
 * Implémentations prévues :
 *   - loom-chromadb-adapter.ts (v1 : fichier local)
 *   - loom-root-ledger-adapter.ts (futur : root memory ledger)
 *   - loom-gateway-memory-adapter.ts (futur : gateway memory layer)
 *   - loom-in-memory-adapter.ts (tests)
 */
export interface LoomAdapter {
  /**
   * Récupère le contexte narratif pertinent pour une scène à venir.
   * Coût : 0 LLM. Retrieval pur (embeddings + metadata filtering).
   */
  readContext(input: LoomReadInput): Promise<LoomContext>;

  /**
   * Persiste l'état narratif après une scène scellée.
   * Coût maximal : +1 LLM (extraction bornée si cde_delta insuffisant).
   *
   * INV-LOOM-02 : ne JAMAIS appeler sur verdict REJECT.
   */
  writeState(input: LoomWriteInput): Promise<LoomWriteReceipt>;

  /**
   * Vérifie que le backend est opérationnel.
   * Retourne false si ChromaDB n'est pas joignable / DB corrompue.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Retourne le nombre d'entrées par collection (debug/telemetry).
   */
  getStats(): Promise<LoomStoreStats>;
}

/**
 * Identifiant du backend Loom.
 * Contrat stable — tout nouveau backend s'ajoute ici AVANT implémentation.
 */
export type LoomBackendId =
  | 'null-v1'          // NullLoomAdapter — Loom OFF
  | 'memory-v1'        // InMemoryLoomAdapter — tests/dev
  | 'jsonfile-v1'      // JsonFileLoomAdapter — R1 backend réel
  | 'chromadb-vfuture'; // ChromaDbLoomAdapter — R2+ quand plateforme stabilisée

/** Statistiques du store pour telemetry. */
export interface LoomStoreStats {
  readonly characters: number;
  readonly threads: number;
  readonly scenes: number;
  readonly motifs: number;
  readonly arcs: number;
  readonly backend: LoomBackendId;
  readonly db_path: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOM ENRICHED CONTINUITY — Résultat du merge Reader + ForgeContinuity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ForgeContinuity enrichi par le Loom.
 * Compatible bit-à-bit avec ForgeContinuity (mêmes champs readonly).
 * Le merge suit INV-LOOM-06 : l'original a priorité.
 */
export interface LoomEnrichedContinuity extends ForgeContinuity {
  /** Contexte Loom complet (pour traçabilité, pas pour la génération directe). */
  readonly loom_context?: LoomContext;
}
