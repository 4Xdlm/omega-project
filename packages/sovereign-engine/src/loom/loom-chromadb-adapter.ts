/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — CHROMADB ADAPTER (Backend persistant v1)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: loom-chromadb-adapter.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * Phase: R1 — Loom v1 Minimal
 *
 * Backend ChromaDB local pour persistance Loom cross-chapitre.
 * 5 collections : characters, threads, scenes, motifs, arcs.
 *
 * Dépendance : chromadb (npm, import dynamique).
 * Si chromadb non installé → factory retourne NullLoomAdapter.
 * Si ChromaDB serveur down → healthCheck false → degrade gracefully.
 *
 * Embeddings : local-embedding-model.ts (BoW cosine, déterministe, 0 API).
 * INV-LOOM-03 : même texte → même vecteur, toujours.
 *
 * Invariants :
 *   INV-LOOM-01 : Factory retourne NullLoomAdapter si Loom OFF ou ChromaDB absent
 *   INV-LOOM-02 : writeState ne doit JAMAIS être appelé sur verdict REJECT
 *   INV-LOOM-03 : Embeddings déterministes via local-embedding-model
 *   INV-LOOM-05 : 0 LLM dans cet adapter (retrieval pur)
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
  LoomMotifEntry,
  LoomArcEntry,
  LoomSceneReference,
} from './loom-types.js';
import { NullLoomAdapter, EMPTY_LOOM_CONTEXT } from './loom-adapter.js';
import { getLoomConfig } from './loom-config.js';
import { tokenize, getEmbeddingModelInfo } from '../genius/embeddings/local-embedding-model.js';
import { sha256 } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// CHROMADB TYPE ABSTRACTIONS (évite dépendance compiletime)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types minimaux pour l'API ChromaDB v3.
 * Définis ici pour compiler SANS chromadb installé.
 * Le binding réel se fait via import dynamique dans la factory.
 */
interface ChromaCollection {
  add(params: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, unknown>[];
    documents?: string[];
  }): Promise<void>;
  upsert(params: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, unknown>[];
    documents?: string[];
  }): Promise<void>;
  query(params: {
    queryEmbeddings?: number[][];
    nResults?: number;
    where?: Record<string, unknown>;
    include?: string[];
  }): Promise<{
    ids: string[][];
    metadatas: (Record<string, unknown> | null)[][];
    documents: (string | null)[][];
    distances: (number | null)[][];
  }>;
  get(params?: {
    ids?: string[];
    where?: Record<string, unknown>;
    include?: string[];
  }): Promise<{
    ids: string[];
    metadatas: (Record<string, unknown> | null)[];
    documents: (string | null)[];
  }>;
  count(): Promise<number>;
}

interface ChromaClient {
  getOrCreateCollection(params: { name: string; metadata?: Record<string, unknown> }): Promise<ChromaCollection>;
  heartbeat(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDING — Déterministe via local-embedding-model (INV-LOOM-03)
// ═══════════════════════════════════════════════════════════════════════════════

/** Dimension fixe du vecteur BoW. */
const EMBEDDING_DIM = 512;

/**
 * Produit un embedding BoW déterministe de dimension fixe.
 * Utilise tokenize() du local-embedding-model (French-aware, stopwords removal).
 *
 * INV-LOOM-03 : même texte → même vecteur, toujours.
 */
function textToEmbedding(text: string): number[] {
  const tokens = tokenize(text);
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);

  if (tokens.length === 0) return vec;

  // Hash chaque token vers un index dans [0, EMBEDDING_DIM)
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % EMBEDDING_DIM;
    vec[idx] += 1;
  }

  // Normaliser L2
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTION NAMES
// ═══════════════════════════════════════════════════════════════════════════════

function collectionNames(bookId: string) {
  const prefix = `loom_${bookId}`;
  return {
    characters: `${prefix}_characters`,
    threads: `${prefix}_threads`,
    scenes: `${prefix}_scenes`,
    motifs: `${prefix}_motifs`,
    arcs: `${prefix}_arcs`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHROMADB ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Backend ChromaDB pour Loom.
 * Utilise 5 collections par livre.
 * Embeddings déterministes via local-embedding-model.
 *
 * NE PAS instancier directement — utiliser createChromaLoomAdapter().
 */
export class ChromaLoomAdapter implements LoomAdapter {
  private readonly client: ChromaClient;
  private readonly dbPath: string;
  private collectionsCache = new Map<string, ChromaCollection>();

  constructor(client: ChromaClient, dbPath: string) {
    this.client = client;
    this.dbPath = dbPath;
  }

  // ── Collection getter avec cache ──
  private async getCollection(name: string): Promise<ChromaCollection> {
    let col = this.collectionsCache.get(name);
    if (!col) {
      col = await this.client.getOrCreateCollection({
        name,
        metadata: { 'hnsw:space': 'cosine' },
      });
      this.collectionsCache.set(name, col);
    }
    return col;
  }

  // ── HEALTH CHECK ──
  async healthCheck(): Promise<boolean> {
    try {
      const hb = await Promise.race([
        this.client.heartbeat(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      return typeof hb === 'number';
    } catch {
      return false;
    }
  }

  // ── READ CONTEXT ──
  async readContext(input: LoomReadInput): Promise<LoomContext> {
    const config = getLoomConfig();
    const names = collectionNames(input.book_id);
    const startTime = Date.now();
    let queryCount = 0;
    let totalHits = 0;

    try {
      // ── Scenes : retrieval sémantique par scene_goal ──
      const scenesCol = await this.getCollection(names.scenes);
      const sceneQueryEmb = textToEmbedding(input.scene_goal || input.scene_id);
      const sceneResults = await scenesCol.query({
        queryEmbeddings: [sceneQueryEmb],
        nResults: config.RETRIEVAL_TOP_K,
        include: ['metadatas', 'documents', 'distances'],
      });
      queryCount++;

      const retrievedScenes: LoomSceneReference[] = [];
      const sceneSummaries: string[] = [];
      if (sceneResults.ids[0]) {
        for (let i = 0; i < sceneResults.ids[0].length; i++) {
          const meta = sceneResults.metadatas[0]?.[i];
          const doc = sceneResults.documents[0]?.[i] || '';
          const dist = sceneResults.distances[0]?.[i] ?? 1;
          // ChromaDB cosine distance = 1 - similarity
          const similarity = Math.max(0, 1 - dist);

          retrievedScenes.push({
            chapter: (meta?.chapter as number) || 0,
            scene_id: (meta?.scene_id as string) || '',
            similarity_score: similarity,
            summary_excerpt: doc.slice(0, 100),
          });
          sceneSummaries.push(doc);
          totalHits++;
        }
      }

      // ── Characters : filter par expected_characters ──
      const charsCol = await this.getCollection(names.characters);
      const characterStates: LoomCharacterEntry[] = [];
      if (input.expected_characters.length > 0) {
        for (const charId of input.expected_characters) {
          const charResult = await charsCol.get({
            ids: [`${input.book_id}:${charId}`],
            include: ['metadatas'],
          });
          queryCount++;
          if (charResult.ids.length > 0 && charResult.metadatas[0]) {
            const meta = charResult.metadatas[0];
            characterStates.push({
              book_id: input.book_id,
              character_id: (meta.character_id as string) || charId,
              character_name: (meta.character_name as string) || charId,
              emotional_state: (meta.emotional_state as string) || '',
              physical_state: (meta.physical_state as string) || '',
              location: (meta.location as string) || '',
              arc_phase: (meta.arc_phase as LoomCharacterEntry['arc_phase']) || 'unknown',
              current_need: (meta.current_need as string) || '',
              tension: (meta.tension as string) || '',
              last_seen_chapter: (meta.last_seen_chapter as number) || 0,
              last_seen_scene_id: (meta.last_seen_scene_id as string) || '',
              updated_at: (meta.updated_at as string) || '',
            });
            totalHits++;
          }
        }
      }

      // ── Threads : open + dormant ──
      const threadsCol = await this.getCollection(names.threads);
      const activeThreads: LoomThreadEntry[] = [];
      for (const status of ['open', 'dormant'] as const) {
        const threadResult = await threadsCol.get({
          where: { status, book_id: input.book_id },
          include: ['metadatas'],
        });
        queryCount++;
        for (let i = 0; i < threadResult.ids.length; i++) {
          const meta = threadResult.metadatas[i];
          if (meta) {
            activeThreads.push({
              book_id: input.book_id,
              thread_id: (meta.thread_id as string) || threadResult.ids[i],
              content: (meta.content as string) || '',
              status,
              opened_chapter: (meta.opened_chapter as number) || 0,
              last_seen_chapter: (meta.last_seen_chapter as number) || 0,
              resolution_evidence: (meta.resolution_evidence as string) || null,
              updated_at: (meta.updated_at as string) || '',
            });
            totalHits++;
          }
        }
      }

      // ── Motifs : frequency ≥ 2 ──
      const motifsCol = await this.getCollection(names.motifs);
      const motifResult = await motifsCol.get({
        where: { book_id: input.book_id },
        include: ['metadatas'],
      });
      queryCount++;
      const activeMotifs: LoomMotifEntry[] = [];
      for (let i = 0; i < motifResult.ids.length; i++) {
        const meta = motifResult.metadatas[i];
        if (meta && (meta.frequency as number) >= 2) {
          activeMotifs.push({
            book_id: input.book_id,
            motif_id: (meta.motif_id as string) || motifResult.ids[i],
            content: (meta.content as string) || '',
            category: (meta.category as LoomMotifEntry['category']) || 'symbol',
            frequency: (meta.frequency as number) || 0,
            first_chapter: (meta.first_chapter as number) || 0,
            last_chapter: (meta.last_chapter as number) || 0,
            updated_at: (meta.updated_at as string) || '',
          });
          totalHits++;
        }
      }

      // ── Arc principal ──
      const arcsCol = await this.getCollection(names.arcs);
      const arcResult = await arcsCol.get({
        where: { book_id: input.book_id, arc_type: 'main' },
        include: ['metadatas'],
      });
      queryCount++;
      let arcTrajectory: LoomArcEntry | null = null;
      if (arcResult.ids.length > 0 && arcResult.metadatas[0]) {
        const meta = arcResult.metadatas[0];
        arcTrajectory = {
          book_id: input.book_id,
          arc_id: (meta.arc_id as string) || 'main_arc',
          arc_type: 'main',
          valence_start: (meta.valence_start as number) || 0,
          valence_current: (meta.valence_current as number) || 0,
          direction: (meta.direction as LoomArcEntry['direction']) || 'stable',
          key_chapters: JSON.parse((meta.key_chapters as string) || '[]'),
          updated_at: (meta.updated_at as string) || '',
        };
        totalHits++;
      }

      // ── Résumé enrichi ──
      const enrichedSummary = sceneSummaries.slice(0, 3).join(' ');

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
      // ChromaDB error → degrade gracefully
      return EMPTY_LOOM_CONTEXT;
    }
  }

  // ── WRITE STATE ──
  async writeState(input: LoomWriteInput): Promise<LoomWriteReceipt> {
    const names = collectionNames(input.book_id);
    const now = new Date().toISOString();
    let upsertedCharacters = 0;
    let upsertedThreads = 0;
    let upsertedMotifs = 0;
    let upsertedArcs = 0;

    try {
      // ── Characters ──
      const charsCol = await this.getCollection(names.characters);
      for (const arc of input.arc_states) {
        const charState = input.input_continuity.character_states.find(
          (cs) => cs.character_id === arc.character_id,
        );
        const charId = `${input.book_id}:${arc.character_id}`;
        const doc = `${charState?.character_name || arc.character_id} — ${charState?.emotional_state || ''} — ${arc.current_need}`;
        await charsCol.upsert({
          ids: [charId],
          embeddings: [textToEmbedding(doc)],
          documents: [doc],
          metadatas: [{
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
          }],
        });
        upsertedCharacters++;
      }

      // ── Threads (CDE debts) ──
      const threadsCol = await this.getCollection(names.threads);
      for (const debt of input.open_debts) {
        const threadId = `${input.book_id}:${debt.id}`;
        await threadsCol.upsert({
          ids: [threadId],
          embeddings: [textToEmbedding(debt.content)],
          documents: [debt.content],
          metadatas: [{
            book_id: input.book_id,
            thread_id: debt.id,
            content: debt.content,
            status: debt.resolved ? 'resolved' : 'open',
            opened_chapter: parseInt(debt.opened_at, 10) || input.chapter,
            last_seen_chapter: input.chapter,
            resolution_evidence: '',
            updated_at: now,
          }],
        });
        upsertedThreads++;
      }

      // Dettes résolues dans le delta
      for (const resolved of input.cde_delta.debts_resolved) {
        const threadId = `${input.book_id}:${resolved.id}`;
        await threadsCol.upsert({
          ids: [threadId],
          embeddings: [textToEmbedding(resolved.id)],
          documents: [resolved.evidence],
          metadatas: [{
            book_id: input.book_id,
            thread_id: resolved.id,
            content: resolved.evidence,
            status: 'resolved',
            opened_chapter: 0,
            last_seen_chapter: input.chapter,
            resolution_evidence: resolved.evidence,
            updated_at: now,
          }],
        });
        upsertedThreads++;
      }

      // ── Scene ──
      const scenesCol = await this.getCollection(names.scenes);
      const sceneSummary = input.cde_delta.new_facts.join('. ') || `Scène ${input.scene_id}`;
      const sceneId = `${input.book_id}:${input.chapter}:${input.scene_id}`;
      await scenesCol.upsert({
        ids: [sceneId],
        embeddings: [textToEmbedding(sceneSummary)],
        documents: [sceneSummary],
        metadatas: [{
          book_id: input.book_id,
          chapter: input.chapter,
          scene_id: input.scene_id,
          characters_present: JSON.stringify(input.characters_present),
          conflict_type: input.conflict_type,
          terminal_emotion: input.terminal_emotion,
          terminal_valence: input.terminal_valence,
          prose_hash: input.prose_hash,
          created_at: now,
        }],
      });

      // ── Arc movements ──
      const arcsCol = await this.getCollection(names.arcs);
      for (const movement of input.cde_delta.arc_movements) {
        const arcId = `${input.book_id}:character:${movement.character_id}`;

        // Lire l'arc existant pour merge
        let existingKeyChapters: number[] = [];
        let existingValenceStart = input.terminal_valence;
        let existingValenceCurrent = 0;
        try {
          const existing = await arcsCol.get({ ids: [arcId], include: ['metadatas'] });
          if (existing.ids.length > 0 && existing.metadatas[0]) {
            const meta = existing.metadatas[0];
            existingKeyChapters = JSON.parse((meta.key_chapters as string) || '[]');
            existingValenceStart = (meta.valence_start as number) ?? input.terminal_valence;
            existingValenceCurrent = (meta.valence_current as number) ?? 0;
          }
        } catch {
          // Premier arc → valeurs par défaut
        }

        const direction = input.terminal_valence > existingValenceCurrent
          ? 'brightening' : input.terminal_valence < existingValenceCurrent
            ? 'darkening' : 'stable';

        const keyChapters = [...existingKeyChapters, input.chapter];
        await arcsCol.upsert({
          ids: [arcId],
          embeddings: [textToEmbedding(`${movement.character_id} ${movement.movement}`)],
          documents: [`${movement.character_id}: ${movement.movement}`],
          metadatas: [{
            book_id: input.book_id,
            arc_id: `character:${movement.character_id}`,
            arc_type: 'character',
            valence_start: existingValenceStart,
            valence_current: input.terminal_valence,
            direction,
            key_chapters: JSON.stringify(keyChapters),
            updated_at: now,
          }],
        });
        upsertedArcs++;
      }

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
      // ChromaDB write error → receipt vide (pas de crash)
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
    try {
      // On ne connaît pas le book_id ici — stats globales approximatives
      // Pour v1, on retourne 0 et le backend name
      return {
        characters: 0,
        threads: 0,
        scenes: 0,
        motifs: 0,
        arcs: 0,
        backend: 'chromadb-vfuture',
        db_path: this.dbPath,
      };
    } catch {
      return {
        characters: 0,
        threads: 0,
        scenes: 0,
        motifs: 0,
        arcs: 0,
        backend: 'chromadb-vfuture',
        db_path: this.dbPath,
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY — Import dynamique + fallback NullLoomAdapter
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un LoomAdapter backed par ChromaDB.
 *
 * - Si chromadb non installé → retourne NullLoomAdapter (pas de crash)
 * - Si ChromaDB serveur non joignable → retourne NullLoomAdapter
 * - Si Loom OFF → retourne NullLoomAdapter
 *
 * Usage dans engine.ts :
 *   const adapter = await createChromaLoomAdapter();
 */
export async function createChromaLoomAdapter(): Promise<LoomAdapter> {
  const config = getLoomConfig();

  // ── INV-LOOM-01 : Loom OFF → NullLoomAdapter ──
  if (!config.ENABLED) {
    return new NullLoomAdapter();
  }

  try {
    // Import dynamique — ne crash pas si chromadb absent
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleName = 'chromadb'; // Variable pour éviter l'analyse statique TS
    const chromaModule = await import(/* webpackIgnore: true */ moduleName) as {
      ChromaClient: new (params: { path: string }) => ChromaClient;
    };

    const client = new chromaModule.ChromaClient({ path: config.DB_PATH });

    // Test de connexion avec timeout
    const healthy = await Promise.race([
      client.heartbeat().then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);

    if (!healthy) {
      // ChromaDB serveur down → fallback silencieux
      return new NullLoomAdapter();
    }

    return new ChromaLoomAdapter(client, config.DB_PATH);
  } catch {
    // chromadb non installé ou erreur d'import → fallback silencieux
    return new NullLoomAdapter();
  }
}
