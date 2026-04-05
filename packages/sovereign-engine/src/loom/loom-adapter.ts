/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — ADAPTER INTERFACE + IN-MEMORY IMPLEMENTATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: loom-adapter.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * Phase: R1 — Loom v1 Minimal
 *
 * Ce fichier exporte :
 *   1. Re-export de l'interface LoomAdapter (définie dans loom-types.ts)
 *   2. InMemoryLoomAdapter — implémentation test/fallback sans dépendance externe
 *   3. NullLoomAdapter — implémentation no-op pour Loom OFF (INV-LOOM-01)
 *
 * Le backend ChromaDB v1 sera dans loom-chromadb-adapter.ts (R1-d).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  LoomAdapter,
  LoomReadInput,
  LoomWriteInput,
  LoomContext,
  LoomWriteReceipt,
  LoomStoreStats,
  LoomCharacterEntry,
  LoomThreadEntry,
  LoomSceneEntry,
  LoomMotifEntry,
  LoomArcEntry,
  LoomSceneReference,
} from './loom-types.js';
import { sha256 } from '@omega/canon-kernel';

// Re-export pour usage externe
export type { LoomAdapter } from './loom-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// NULL ADAPTER — Loom OFF (INV-LOOM-01)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adapter no-op pour quand Loom est désactivé.
 * Retourne toujours un contexte vide, n'écrit jamais rien.
 * Garantit INV-LOOM-01 : pipeline identique bit-à-bit.
 */
export class NullLoomAdapter implements LoomAdapter {
  async readContext(_input: LoomReadInput): Promise<LoomContext> {
    return EMPTY_LOOM_CONTEXT;
  }

  async writeState(input: LoomWriteInput): Promise<LoomWriteReceipt> {
    return {
      book_id: input.book_id,
      chapter: input.chapter,
      scene_id: input.scene_id,
      input_hash: sha256(JSON.stringify(input)),
      upserted: { characters: 0, threads: 0, scenes: 0, motifs: 0, arcs: 0 },
      source_provenance: 'cde_only',
      written_at: new Date().toISOString(),
    };
  }

  async healthCheck(): Promise<boolean> {
    return true; // Toujours "sain" car il ne fait rien
  }

  async getStats(): Promise<LoomStoreStats> {
    return {
      characters: 0,
      threads: 0,
      scenes: 0,
      motifs: 0,
      arcs: 0,
      backend: 'null-v1',
      db_path: '',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY ADAPTER — Tests + Dev
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adapter en mémoire pour tests unitaires et développement local.
 * Stocke tout dans des Maps TypeScript. Perd tout à la fin du process.
 * Implémente le même contrat que le backend ChromaDB.
 */
export class InMemoryLoomAdapter implements LoomAdapter {
  private readonly characters = new Map<string, LoomCharacterEntry>();
  private readonly threads = new Map<string, LoomThreadEntry>();
  private readonly scenes = new Map<string, LoomSceneEntry>();
  private readonly motifs = new Map<string, LoomMotifEntry>();
  private readonly arcs = new Map<string, LoomArcEntry>();

  async readContext(input: LoomReadInput): Promise<LoomContext> {
    const bookId = input.book_id;

    // ── Characters : filtrer par book_id + expected_characters ──
    const characterStates: LoomCharacterEntry[] = [];
    for (const entry of this.characters.values()) {
      if (entry.book_id === bookId && input.expected_characters.includes(entry.character_id)) {
        characterStates.push(entry);
      }
    }

    // ── Threads : filtrer par book_id, statut open ou dormant ──
    const activeThreads: LoomThreadEntry[] = [];
    for (const entry of this.threads.values()) {
      if (entry.book_id === bookId && (entry.status === 'open' || entry.status === 'dormant')) {
        activeThreads.push(entry);
      }
    }

    // ── Scenes : toutes les scènes du livre, triées par chapitre (top-K) ──
    const bookScenes: LoomSceneEntry[] = [];
    for (const entry of this.scenes.values()) {
      if (entry.book_id === bookId) {
        bookScenes.push(entry);
      }
    }
    bookScenes.sort((a, b) => b.chapter - a.chapter);
    const topScenes = bookScenes.slice(0, 5); // top-K simplifié pour in-memory

    const retrievedScenes: LoomSceneReference[] = topScenes.map((s) => ({
      chapter: s.chapter,
      scene_id: s.scene_id,
      similarity_score: 1.0, // In-memory : pas de vrai calcul de similarité
      summary_excerpt: s.summary.slice(0, 100),
    }));

    // ── Motifs : frequency ≥ 2 ──
    const activeMotifs: LoomMotifEntry[] = [];
    for (const entry of this.motifs.values()) {
      if (entry.book_id === bookId && entry.frequency >= 2) {
        activeMotifs.push(entry);
      }
    }

    // ── Arc principal ──
    let arcTrajectory: LoomArcEntry | null = null;
    for (const entry of this.arcs.values()) {
      if (entry.book_id === bookId && entry.arc_type === 'main') {
        arcTrajectory = entry;
        break;
      }
    }

    // ── Résumé enrichi (concaténation des résumés récents) ──
    const enrichedSummary = topScenes
      .slice(0, 3)
      .map((s) => s.summary)
      .join(' ');

    return {
      enriched_summary: enrichedSummary,
      character_states: characterStates,
      active_threads: activeThreads,
      active_motifs: activeMotifs,
      arc_trajectory: arcTrajectory,
      retrieved_scenes: retrievedScenes,
      retrieval_metadata: {
        query_count: 5,
        total_hits: topScenes.length + characterStates.length + activeThreads.length,
        embedding_model: 'in-memory-passthrough',
        retrieval_time_ms: 0,
      },
    };
  }

  async writeState(input: LoomWriteInput): Promise<LoomWriteReceipt> {
    const now = new Date().toISOString();
    let upsertedCharacters = 0;
    let upsertedThreads = 0;
    let upsertedMotifs = 0;
    let upsertedArcs = 0;

    // ── Characters : depuis CDE arc_states + input.input_continuity.character_states ──
    for (const arc of input.arc_states) {
      // Trouver le CharacterState correspondant dans input_continuity
      const charState = input.input_continuity.character_states.find(
        (cs) => cs.character_id === arc.character_id,
      );
      const key = `${input.book_id}:${arc.character_id}`;
      this.characters.set(key, {
        book_id: input.book_id,
        character_id: arc.character_id,
        character_name: charState?.character_name || arc.character_id,
        emotional_state: charState?.emotional_state || '',
        physical_state: charState?.physical_state || '',
        location: charState?.location || '',
        arc_phase: arc.arc_phase,
        current_need: arc.current_need,
        tension: arc.tension,
        last_seen_chapter: input.chapter,
        last_seen_scene_id: input.scene_id,
        updated_at: now,
      });
      upsertedCharacters++;
    }

    // ── Threads : depuis CDE debts ──
    for (const debt of input.open_debts) {
      const key = `${input.book_id}:${debt.id}`;
      this.threads.set(key, {
        book_id: input.book_id,
        thread_id: debt.id,
        content: debt.content,
        status: debt.resolved ? 'resolved' : 'open',
        opened_chapter: parseInt(debt.opened_at, 10) || input.chapter,
        last_seen_chapter: input.chapter,
        resolution_evidence: null,
        updated_at: now,
      });
      upsertedThreads++;
    }
    // Marquer les dettes résolues dans le delta
    for (const resolved of input.cde_delta.debts_resolved) {
      const key = `${input.book_id}:${resolved.id}`;
      const existing = this.threads.get(key);
      if (existing) {
        this.threads.set(key, {
          ...existing,
          status: 'resolved',
          resolution_evidence: resolved.evidence,
          last_seen_chapter: input.chapter,
          updated_at: now,
        });
        upsertedThreads++;
      }
    }

    // ── Scene : résumé depuis CDE new_facts + scene metadata ──
    const sceneSummary = input.cde_delta.new_facts.join('. ') || `Scène ${input.scene_id}`;
    const sceneKey = `${input.book_id}:${input.chapter}:${input.scene_id}`;
    this.scenes.set(sceneKey, {
      book_id: input.book_id,
      chapter: input.chapter,
      scene_id: input.scene_id,
      summary: sceneSummary,
      characters_present: input.characters_present,
      conflict_type: input.conflict_type,
      terminal_emotion: input.terminal_emotion,
      terminal_valence: input.terminal_valence,
      prose_hash: input.prose_hash,
      created_at: now,
    });

    // ── Arc movements : depuis CDE ──
    for (const movement of input.cde_delta.arc_movements) {
      const key = `${input.book_id}:character:${movement.character_id}`;
      const existing = this.arcs.get(key);
      this.arcs.set(key, {
        book_id: input.book_id,
        arc_id: `character:${movement.character_id}`,
        arc_type: 'character',
        valence_start: existing?.valence_start ?? input.terminal_valence,
        valence_current: input.terminal_valence,
        direction: input.terminal_valence > (existing?.valence_current ?? 0) ? 'brightening' : 'darkening',
        key_chapters: [...(existing?.key_chapters ?? []), input.chapter],
        updated_at: now,
      });
      upsertedArcs++;
    }

    return {
      book_id: input.book_id,
      chapter: input.chapter,
      scene_id: input.scene_id,
      input_hash: sha256(JSON.stringify(input)),
      upserted: {
        characters: upsertedCharacters,
        threads: upsertedThreads,
        scenes: 1,
        motifs: upsertedMotifs,
        arcs: upsertedArcs,
      },
      source_provenance: 'cde_only',
      written_at: now,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async getStats(): Promise<LoomStoreStats> {
    return {
      characters: this.characters.size,
      threads: this.threads.size,
      scenes: this.scenes.size,
      motifs: this.motifs.size,
      arcs: this.arcs.size,
      backend: 'memory-v1',
      db_path: ':memory:',
    };
  }

  /** Reset toutes les collections (pour tests). */
  clear(): void {
    this.characters.clear();
    this.threads.clear();
    this.scenes.clear();
    this.motifs.clear();
    this.arcs.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Contexte Loom vide — retourné quand Loom OFF ou DB vide. */
export const EMPTY_LOOM_CONTEXT: LoomContext = {
  enriched_summary: '',
  character_states: [],
  active_threads: [],
  active_motifs: [],
  arc_trajectory: null,
  retrieved_scenes: [],
  retrieval_metadata: {
    query_count: 0,
    total_hits: 0,
    embedding_model: 'none',
    retrieval_time_ms: 0,
  },
};
