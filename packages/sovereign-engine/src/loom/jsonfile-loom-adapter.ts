/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — JSON FILE ADAPTER (Backend R1)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: jsonfile-loom-adapter.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * Phase: R1 — Loom v1 Minimal
 *
 * Backend fichier JSON local pour persistance Loom cross-chapitre.
 * 6 fichiers par book : index.json, characters.json, threads.json,
 * scenes.json, motifs.json, arcs.json.
 *
 * Design :
 *   - 0 dépendance externe (Node fs/path natifs)
 *   - Écriture atomique (write temp → rename)
 *   - Hash receipt SHA256
 *   - Deterministic sort avant write
 *   - Schema version pour migration future
 *   - Retrieval simple : lookup exact + filtre metadata + BoW similarity
 *   - Compatible Windows/Linux
 *
 * Invariants :
 *   INV-LOOM-01 : Factory retourne NullLoomAdapter si Loom OFF
 *   INV-LOOM-03 : Embeddings déterministes via local-embedding-model (retrieval)
 *   INV-LOOM-05 : 0 LLM dans cet adapter (retrieval pur)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'fs';
import { join, dirname } from 'path';
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
import { NullLoomAdapter, EMPTY_LOOM_CONTEXT } from './loom-adapter.js';
import { getLoomConfig } from './loom-config.js';
import { semanticSimilarity, getEmbeddingModelInfo } from '../genius/embeddings/local-embedding-model.js';
import { sha256 } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA VERSION — pour migration future
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEMA_VERSION = '1.0.0';

interface JsonFileHeader {
  schema_version: string;
  book_id: string;
  collection: string;
  updated_at: string;
  entry_count: number;
}

interface JsonFileEnvelope<T> {
  header: JsonFileHeader;
  entries: Record<string, T>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE PATHS
// ═══════════════════════════════════════════════════════════════════════════════

function bookDir(basePath: string, bookId: string): string {
  // Sanitize bookId for filesystem
  const safeId = bookId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(basePath, safeId);
}

function collectionFile(basePath: string, bookId: string, collection: string): string {
  return join(bookDir(basePath, bookId), `${collection}.json`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMIC FILE I/O
// ═══════════════════════════════════════════════════════════════════════════════

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/** Écriture atomique : write to .tmp → rename. */
function atomicWrite(filePath: string, data: string): void {
  ensureDir(dirname(filePath));
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, data, 'utf-8');
  renameSync(tmpPath, filePath);
}

/** Lecture sûre : retourne null si fichier absent. */
function safeRead<T>(filePath: string): JsonFileEnvelope<T> | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as JsonFileEnvelope<T>;
  } catch {
    return null;
  }
}

/** Sauvegarde une collection avec sort déterministe. */
function saveCollection<T>(
  basePath: string,
  bookId: string,
  collection: string,
  entries: Record<string, T>,
): void {
  // Sort déterministe par clé
  const sorted: Record<string, T> = {};
  for (const key of Object.keys(entries).sort()) {
    sorted[key] = entries[key];
  }

  const envelope: JsonFileEnvelope<T> = {
    header: {
      schema_version: SCHEMA_VERSION,
      book_id: bookId,
      collection,
      updated_at: new Date().toISOString(),
      entry_count: Object.keys(sorted).length,
    },
    entries: sorted,
  };

  const filePath = collectionFile(basePath, bookId, collection);
  atomicWrite(filePath, JSON.stringify(envelope, null, 2));
}

/** Charge une collection. Retourne {} si absent. */
function loadCollection<T>(basePath: string, bookId: string, collection: string): Record<string, T> {
  const envelope = safeRead<T>(collectionFile(basePath, bookId, collection));
  if (!envelope) return {};
  // Vérification schema_version
  if (envelope.header.schema_version !== SCHEMA_VERSION) {
    // Migration future — pour l'instant, on charge tel quel
  }
  return envelope.entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON FILE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Backend fichier JSON pour Loom.
 * 6 fichiers par livre : characters, threads, scenes, motifs, arcs, index.
 * Retrieval par lookup exact + filtre metadata + BoW similarity.
 *
 * Usage via factory : createJsonFileLoomAdapter()
 */
export class JsonFileLoomAdapter implements LoomAdapter {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  // ── HEALTH CHECK ──
  async healthCheck(): Promise<boolean> {
    try {
      ensureDir(this.basePath);
      return true;
    } catch {
      return false;
    }
  }

  // ── READ CONTEXT ──
  async readContext(input: LoomReadInput): Promise<LoomContext> {
    const config = getLoomConfig();
    const startTime = Date.now();
    let queryCount = 0;
    let totalHits = 0;

    try {
      // ── Characters : lookup par expected_characters ──
      const allChars = loadCollection<LoomCharacterEntry>(this.basePath, input.book_id, 'characters');
      queryCount++;
      const characterStates: LoomCharacterEntry[] = [];
      for (const charId of input.expected_characters) {
        const key = `${input.book_id}:${charId}`;
        const entry = allChars[key];
        if (entry) {
          characterStates.push(entry);
          totalHits++;
        }
      }

      // ── Threads : open + dormant ──
      const allThreads = loadCollection<LoomThreadEntry>(this.basePath, input.book_id, 'threads');
      queryCount++;
      const activeThreads: LoomThreadEntry[] = [];
      for (const entry of Object.values(allThreads)) {
        if (entry.book_id === input.book_id && (entry.status === 'open' || entry.status === 'dormant')) {
          activeThreads.push(entry);
          totalHits++;
        }
      }

      // ── Scenes : retrieval par similarité BoW (INV-LOOM-03) ──
      const allScenes = loadCollection<LoomSceneEntry>(this.basePath, input.book_id, 'scenes');
      queryCount++;
      const sceneQuery = input.scene_goal || input.scene_id;
      const scoredScenes: Array<{ entry: LoomSceneEntry; similarity: number }> = [];

      for (const entry of Object.values(allScenes)) {
        if (entry.book_id === input.book_id) {
          // Similarité BoW déterministe via local-embedding-model
          const sim = semanticSimilarity(sceneQuery, entry.summary);
          scoredScenes.push({ entry, similarity: sim });
        }
      }

      // Tri par similarité décroissante, puis par chapitre récent
      scoredScenes.sort((a, b) => {
        const simDiff = b.similarity - a.similarity;
        if (Math.abs(simDiff) > 0.01) return simDiff;
        return b.entry.chapter - a.entry.chapter;
      });

      const topK = config.RETRIEVAL_TOP_K;
      const topScenes = scoredScenes.slice(0, topK);

      const retrievedScenes: LoomSceneReference[] = topScenes.map((s) => ({
        chapter: s.entry.chapter,
        scene_id: s.entry.scene_id,
        similarity_score: s.similarity,
        summary_excerpt: s.entry.summary.slice(0, 100),
      }));
      totalHits += topScenes.length;

      // ── Motifs : frequency ≥ 2 ──
      const allMotifs = loadCollection<LoomMotifEntry>(this.basePath, input.book_id, 'motifs');
      queryCount++;
      const activeMotifs: LoomMotifEntry[] = [];
      for (const entry of Object.values(allMotifs)) {
        if (entry.book_id === input.book_id && entry.frequency >= 2) {
          activeMotifs.push(entry);
          totalHits++;
        }
      }

      // ── Arc principal ──
      const allArcs = loadCollection<LoomArcEntry>(this.basePath, input.book_id, 'arcs');
      queryCount++;
      let arcTrajectory: LoomArcEntry | null = null;
      for (const entry of Object.values(allArcs)) {
        if (entry.book_id === input.book_id && entry.arc_type === 'main') {
          arcTrajectory = entry;
          break;
        }
      }

      // ── Résumé enrichi (top-3 scènes) ──
      const enrichedSummary = topScenes
        .slice(0, 3)
        .map((s) => s.entry.summary)
        .join(' ');

      const retrievalTimeMs = Date.now() - startTime;

      return {
        enriched_summary: enrichedSummary,
        character_states: characterStates,
        active_threads: activeThreads,
        active_motifs: activeMotifs,
        arc_trajectory: arcTrajectory,
        retrieved_scenes: retrievedScenes,
        retrieval_metadata: {
          query_count: queryCount,
          total_hits: totalHits,
          embedding_model: getEmbeddingModelInfo().model_id,
          retrieval_time_ms: retrievalTimeMs,
        },
      };
    } catch {
      return EMPTY_LOOM_CONTEXT;
    }
  }

  // ── WRITE STATE ──
  async writeState(input: LoomWriteInput): Promise<LoomWriteReceipt> {
    const now = new Date().toISOString();
    let upsertedCharacters = 0;
    let upsertedThreads = 0;
    let upsertedMotifs = 0;
    let upsertedArcs = 0;

    try {
      // ── Characters : depuis CDE arc_states + input.input_continuity ──
      const chars = loadCollection<LoomCharacterEntry>(this.basePath, input.book_id, 'characters');
      for (const arc of input.arc_states) {
        const charState = input.input_continuity.character_states.find(
          (cs) => cs.character_id === arc.character_id,
        );
        const key = `${input.book_id}:${arc.character_id}`;
        chars[key] = {
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
        };
        upsertedCharacters++;
      }
      saveCollection(this.basePath, input.book_id, 'characters', chars);

      // ── Threads : depuis CDE debts ──
      const threads = loadCollection<LoomThreadEntry>(this.basePath, input.book_id, 'threads');
      for (const debt of input.open_debts) {
        const key = `${input.book_id}:${debt.id}`;
        threads[key] = {
          book_id: input.book_id,
          thread_id: debt.id,
          content: debt.content,
          status: debt.resolved ? 'resolved' : 'open',
          opened_chapter: parseInt(debt.opened_at, 10) || input.chapter,
          last_seen_chapter: input.chapter,
          resolution_evidence: null,
          updated_at: now,
        };
        upsertedThreads++;
      }
      // Dettes résolues dans le delta
      for (const resolved of input.cde_delta.debts_resolved) {
        const key = `${input.book_id}:${resolved.id}`;
        const existing = threads[key];
        if (existing) {
          threads[key] = {
            ...existing,
            status: 'resolved',
            resolution_evidence: resolved.evidence,
            last_seen_chapter: input.chapter,
            updated_at: now,
          };
          upsertedThreads++;
        }
      }
      saveCollection(this.basePath, input.book_id, 'threads', threads);

      // ── Scene — R2: prefer cde_delta.scene_summary over raw facts join ──
      const scenes = loadCollection<LoomSceneEntry>(this.basePath, input.book_id, 'scenes');
      const sceneSummary = input.cde_delta.scene_summary
        || input.cde_delta.new_facts.join('. ')
        || `Scène ${input.scene_id}`;
      // R2: prefer cde_delta.characters_present if available
      const sceneCharacters = (input.cde_delta.characters_present && input.cde_delta.characters_present.length > 0)
        ? input.cde_delta.characters_present
        : input.characters_present;
      const sceneKey = `${input.book_id}:${input.chapter}:${input.scene_id}`;
      scenes[sceneKey] = {
        book_id: input.book_id,
        chapter: input.chapter,
        scene_id: input.scene_id,
        summary: sceneSummary,
        characters_present: sceneCharacters,
        conflict_type: input.conflict_type,
        terminal_emotion: input.terminal_emotion,
        terminal_valence: input.terminal_valence,
        prose_hash: input.prose_hash,
        created_at: now,
      };
      saveCollection(this.basePath, input.book_id, 'scenes', scenes);

      // ── Arc movements ──
      const arcs = loadCollection<LoomArcEntry>(this.basePath, input.book_id, 'arcs');
      for (const movement of input.cde_delta.arc_movements) {
        const key = `${input.book_id}:character:${movement.character_id}`;
        const existing = arcs[key];
        arcs[key] = {
          book_id: input.book_id,
          arc_id: `character:${movement.character_id}`,
          arc_type: 'character',
          valence_start: existing?.valence_start ?? input.terminal_valence,
          valence_current: input.terminal_valence,
          direction: input.terminal_valence > (existing?.valence_current ?? 0) ? 'brightening' : 'darkening',
          key_chapters: [...(existing?.key_chapters ?? []), input.chapter],
          updated_at: now,
        };
        upsertedArcs++;
      }
      if (input.cde_delta.arc_movements.length > 0) {
        saveCollection(this.basePath, input.book_id, 'arcs', arcs);
      }

      // ── Motifs : R2 — CDE extractDelta now provides motifs (CALC) ──
      if (input.cde_delta.motifs && input.cde_delta.motifs.length > 0) {
        const motifs = loadCollection<LoomMotifEntry>(this.basePath, input.book_id, 'motifs');
        for (const motif of input.cde_delta.motifs) {
          const key = `${input.book_id}:${motif}`;
          const existing = motifs[key];
          motifs[key] = {
            book_id: input.book_id,
            motif_id: motif,
            content: motif,
            category: 'symbol' as const,
            frequency: (existing?.frequency ?? 0) + 1,
            first_chapter: existing?.first_chapter ?? input.chapter,
            last_chapter: input.chapter,
            updated_at: now,
          };
          upsertedMotifs++;
        }
        saveCollection(this.basePath, input.book_id, 'motifs', motifs);
      }

      // ── Index : métadonnées du dernier write ──
      const indexData = loadCollection<Record<string, unknown>>(this.basePath, input.book_id, 'index');
      indexData['last_write'] = {
        chapter: input.chapter,
        scene_id: input.scene_id,
        prose_hash: input.prose_hash,
        cde_delta_hash: sha256(JSON.stringify(input.cde_delta)),
        written_at: now,
      };
      const currentMotifs = loadCollection<LoomMotifEntry>(this.basePath, input.book_id, 'motifs');
      indexData['stats'] = {
        total_scenes: Object.keys(scenes).length,
        total_characters: Object.keys(chars).length,
        total_threads: Object.keys(threads).length,
        total_arcs: Object.keys(arcs).length,
        total_motifs: Object.keys(currentMotifs).length,
      };
      saveCollection(this.basePath, input.book_id, 'index', indexData);

      return {
        book_id: input.book_id,
        chapter: input.chapter,
        scene_id: input.scene_id,
        input_hash: sha256(JSON.stringify({
          cde_delta_hash: sha256(JSON.stringify(input.cde_delta)),
          prose_hash: input.prose_hash,
        })),
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
    } catch {
      // Erreur I/O → receipt vide (pas de crash)
      return {
        book_id: input.book_id,
        chapter: input.chapter,
        scene_id: input.scene_id,
        input_hash: sha256(JSON.stringify({ book_id: input.book_id, scene_id: input.scene_id })),
        upserted: { characters: 0, threads: 0, scenes: 0, motifs: 0, arcs: 0 },
        source_provenance: 'cde_only',
        written_at: new Date().toISOString(),
      };
    }
  }

  // ── STATS ──
  async getStats(): Promise<LoomStoreStats> {
    // Scan rapide : compter les entrées dans chaque collection
    // On ne connaît pas le book_id — on scan le premier sous-dossier
    try {
      const { readdirSync } = await import('fs');
      const dirs = readdirSync(this.basePath, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      if (dirs.length === 0) {
        return {
          characters: 0, threads: 0, scenes: 0, motifs: 0, arcs: 0,
          backend: 'jsonfile-v1',
          db_path: this.basePath,
        };
      }

      // Stats du premier livre trouvé
      const firstBook = dirs[0].name;
      const chars = loadCollection<LoomCharacterEntry>(this.basePath, firstBook, 'characters');
      const threads = loadCollection<LoomThreadEntry>(this.basePath, firstBook, 'threads');
      const scenes = loadCollection<LoomSceneEntry>(this.basePath, firstBook, 'scenes');
      const motifs = loadCollection<LoomMotifEntry>(this.basePath, firstBook, 'motifs');
      const arcs = loadCollection<LoomArcEntry>(this.basePath, firstBook, 'arcs');

      return {
        characters: Object.keys(chars).length,
        threads: Object.keys(threads).length,
        scenes: Object.keys(scenes).length,
        motifs: Object.keys(motifs).length,
        arcs: Object.keys(arcs).length,
        backend: 'jsonfile-v1',
        db_path: this.basePath,
      };
    } catch {
      return {
        characters: 0, threads: 0, scenes: 0, motifs: 0, arcs: 0,
        backend: 'jsonfile-v1',
        db_path: this.basePath,
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un LoomAdapter backed par fichiers JSON.
 *
 * - Si Loom OFF → NullLoomAdapter
 * - Si le répertoire n'est pas accessible → NullLoomAdapter
 * - Sinon → JsonFileLoomAdapter prêt à écrire
 *
 * Usage dans engine.ts :
 *   const adapter = await createJsonFileLoomAdapter();
 */
export async function createJsonFileLoomAdapter(): Promise<LoomAdapter> {
  const config = getLoomConfig();

  if (!config.ENABLED) {
    return new NullLoomAdapter();
  }

  try {
    const adapter = new JsonFileLoomAdapter(config.DB_PATH);
    const healthy = await adapter.healthCheck();
    if (!healthy) {
      return new NullLoomAdapter();
    }
    return adapter;
  } catch {
    return new NullLoomAdapter();
  }
}
