/**
 * V2.2-B PROBE Phase B0 — Embedding Oracle Sanity
 *
 * Goal: verify nomic-embed-text embeddings detect coherence/rupture
 *       semantic signal exploitable on V2.1 chunks.
 *
 * Method:
 *   1. Load 16 stratified books (FR/EN × S/A/B/C, 2 each) from corpus_text/
 *   2. For each: chunkAdaptive() V2.1 default → N chunks
 *   3. OllamaEmbedder.getCachedOrCompute per chunk → 768-dim vector
 *   4. crossChunkContinuity(embeddings) → continuity score [0,1]
 *   5. Output JSON with measures: runtime, cache hit/miss, memory, score distribution
 *
 * Verdict B0:
 *   PASS if continuity score range > 0.2 cross-books (signal cohérent)
 *   FAIL if continuity ≈ uniforme (embeddings inutiles for discrimination)
 *
 * Sprint: V2.2-B PROBE 2026-05-28
 * Standard: NASA-Grade L4 / DO-178C Level A
 * CBW: V2_2_B_CBW_PREFLIGHT_2026-05-28.md (GO_WRITE validé)
 * Forbidden: bulk (>20), production-ready, integration pipeline
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chunkAdaptive } from '../src/chunking/adaptive.js';
import {
  OllamaEmbedder,
  DEFAULT_OLLAMA_CONFIG,
  crossChunkContinuity,
} from '../src/embeddings/index.js';

// === Configuration ===

const CORPUS_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/v2_1_1/corpus_text';
const OUTPUT_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs';
const RESULTS_FILE = join(OUTPUT_DIR, 'V2_2_B_B0_results.json');
const CACHE_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/.embeddings-cache-v2_2_b';

// 16 livres stratifiés FR/EN × tier S/A/B/C (2 par strate)
const BOOKS = [
  // fr_S
  'fr_S_au_bonheur_des_dames_-_emile_zola.epub.txt',
  'fr_S_au_bonheur_des_dames_emile_zola.txt.txt',
  // en_S
  'en_S_a_farewell_to_arms_-_ernest_hemingway.epub.txt',
  'en_S_a_love_story_-_emile_zola.epub.txt',
  // fr_A
  'fr_A_antigone_reine_french_edition_lolita_pille.txt.txt',
  'fr_A_ce_que_le_jour_doit_a_la_nuit_french_edition_-_yasmina_khadra.epub.txt',
  // en_A
  'en_A_a_connecticut_yankee_in_king_arthurs_cour_-_mark_twain.epub.txt',
  'en_A_a_good_man_is_hard_to_find_and_other_stories_-_flannery_oconnor.epub.txt',
  // fr_B
  'fr_B_am_stram_gram_french_edition_-_mj_arlidge.epub.txt',
  'fr_B_antigone_reine_french_edition_-_lolita_pille.epub.txt',
  // en_B
  'en_B_50_shades_of_grey_-_el_james.epub.txt',
  'en_B_a_memory_of_light_-_robert_jordan.epub.txt',
  // fr_C
  'fr_C_10_days_french_edition_-_cecilia_armand.epub.txt',
  'fr_C_14_minutes_2_secondes_french_edition_-_anouk_shutterberg.epub.txt',
  // en_C
  'en_C_a_ghetto_tale_from_ebony_ladies_night_chronicles_-_antoinette_sherell.epub.txt',
  'en_C_a_grant_county_collection_4-6_-_karin_slaughter.epub.txt',
];

// === Types ===

interface BookResult {
  readonly file: string;
  readonly tier: string;
  readonly lang: string;
  readonly word_count: number;
  readonly chunk_count: number;
  readonly chunk_word_counts: readonly number[];
  readonly chunking_runtime_ms: number;
  readonly embedding_runtime_ms: number;
  readonly embedding_cache_hits: number;
  readonly embedding_cache_misses: number;
  readonly continuity_score: number;
  readonly continuity_pair_scores: readonly number[];
  readonly error?: string;
}

interface SuiteResult {
  readonly date_iso: string;
  readonly sprint: 'V2.2-B PROBE Phase B0';
  readonly cbw_ref: 'V2_2_B_CBW_PREFLIGHT_2026-05-28.md';
  readonly ollama_health: { ok: boolean; reason?: string };
  readonly cache_dir: string;
  readonly book_count: number;
  readonly results: readonly BookResult[];
  readonly aggregate: {
    readonly total_books: number;
    readonly total_chunks: number;
    readonly total_embeddings: number;
    readonly total_runtime_ms: number;
    readonly cache_hit_ratio: number;
    readonly continuity_mean: number;
    readonly continuity_std: number;
    readonly continuity_min: number;
    readonly continuity_max: number;
    readonly continuity_range: number;
  };
  readonly verdict: {
    readonly b0_pass: boolean;
    readonly b0_reason: string;
    readonly threshold_range: number;
  };
}

// === Main ===

async function main(): Promise<void> {
  console.log('[V2.2-B B0] Embedding Oracle Sanity — START');
  console.log(`[V2.2-B B0] CBW ref: V2_2_B_CBW_PREFLIGHT_2026-05-28.md (GO_WRITE)`);
  console.log(`[V2.2-B B0] Books: ${BOOKS.length} stratified FR/EN × S/A/B/C`);

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`[V2.2-B B0] Cache dir created: ${CACHE_DIR}`);
  }

  const embedder = new OllamaEmbedder({
    ...DEFAULT_OLLAMA_CONFIG,
    cache_dir: CACHE_DIR,
    use_cache: true,
  });

  // Health check Ollama
  const health = await embedder.healthCheck();
  console.log(`[V2.2-B B0] Ollama health: ${JSON.stringify(health)}`);
  if (!health.ok) {
    console.error('[V2.2-B B0] FATAL: Ollama unavailable, abort.');
    process.exit(1);
  }

  const results: BookResult[] = [];
  const tStart = performance.now();

  for (let i = 0; i < BOOKS.length; i++) {
    const file = BOOKS[i]!;
    const parts = file.split('_');
    const lang = parts[0]!;
    const tier = parts[1]!;
    const path = join(CORPUS_DIR, file);

    console.log(`\n[${i + 1}/${BOOKS.length}] ${file}`);

    try {
      const text = readFileSync(path, 'utf8');
      const word_count = text.split(/\s+/).filter((w) => w.length > 0).length;

      // Step 1: chunkAdaptive V2.1 default
      const tChunkStart = performance.now();
      const chunks = chunkAdaptive(text);
      const chunking_runtime_ms = performance.now() - tChunkStart;

      console.log(
        `  word_count=${word_count}, chunks=${chunks.length}, chunking=${chunking_runtime_ms.toFixed(0)}ms`
      );

      // Step 2: Embed each chunk
      const tEmbedStart = performance.now();
      const embeddings: Float32Array[] = [];
      let cache_hits = 0;
      let cache_misses = 0;

      for (const chunk of chunks) {
        const result = await embedder.getCachedOrCompute(chunk.text);
        embeddings.push(result.vector);
        if (result.cache_hit) cache_hits++;
        else cache_misses++;
      }

      const embedding_runtime_ms = performance.now() - tEmbedStart;
      console.log(
        `  embeddings=${embeddings.length}, hits=${cache_hits}, misses=${cache_misses}, embed=${embedding_runtime_ms.toFixed(0)}ms`
      );

      // Step 3: Continuity score
      const continuity = crossChunkContinuity(embeddings);
      console.log(
        `  continuity_score=${continuity.score.toFixed(4)}, pairs=${continuity.pair_scores.length}`
      );

      results.push({
        file,
        tier,
        lang,
        word_count,
        chunk_count: chunks.length,
        chunk_word_counts: chunks.map((c) => c.metadata.word_count),
        chunking_runtime_ms,
        embedding_runtime_ms,
        embedding_cache_hits: cache_hits,
        embedding_cache_misses: cache_misses,
        continuity_score: continuity.score,
        continuity_pair_scores: continuity.pair_scores,
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${errMsg}`);
      results.push({
        file,
        tier,
        lang,
        word_count: 0,
        chunk_count: 0,
        chunk_word_counts: [],
        chunking_runtime_ms: 0,
        embedding_runtime_ms: 0,
        embedding_cache_hits: 0,
        embedding_cache_misses: 0,
        continuity_score: 0,
        continuity_pair_scores: [],
        error: errMsg,
      });
    }
  }

  const tEnd = performance.now();
  const total_runtime_ms = tEnd - tStart;

  // Aggregate
  const valid = results.filter((r) => !r.error);
  const total_chunks = valid.reduce((sum, r) => sum + r.chunk_count, 0);
  const total_embeddings = total_chunks;
  const total_hits = valid.reduce((sum, r) => sum + r.embedding_cache_hits, 0);
  const total_misses = valid.reduce((sum, r) => sum + r.embedding_cache_misses, 0);
  const cache_hit_ratio = total_embeddings > 0 ? total_hits / total_embeddings : 0;

  const scores = valid.map((r) => r.continuity_score);
  const continuity_mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const continuity_std =
    scores.length > 0
      ? Math.sqrt(
          scores.map((s) => (s - continuity_mean) ** 2).reduce((a, b) => a + b, 0) / scores.length
        )
      : 0;
  const continuity_min = scores.length > 0 ? Math.min(...scores) : 0;
  const continuity_max = scores.length > 0 ? Math.max(...scores) : 0;
  const continuity_range = continuity_max - continuity_min;

  // Verdict B0
  const THRESHOLD_RANGE = 0.2;
  const b0_pass = continuity_range > THRESHOLD_RANGE;
  const b0_reason = b0_pass
    ? `PASS — continuity_range=${continuity_range.toFixed(4)} > threshold=${THRESHOLD_RANGE} (signal discriminant détecté)`
    : `FAIL — continuity_range=${continuity_range.toFixed(4)} <= threshold=${THRESHOLD_RANGE} (embeddings uniformes, inutiles pour discrimination)`;

  const suiteResult: SuiteResult = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.2-B PROBE Phase B0',
    cbw_ref: 'V2_2_B_CBW_PREFLIGHT_2026-05-28.md',
    ollama_health: health,
    cache_dir: CACHE_DIR,
    book_count: BOOKS.length,
    results,
    aggregate: {
      total_books: valid.length,
      total_chunks,
      total_embeddings,
      total_runtime_ms,
      cache_hit_ratio,
      continuity_mean,
      continuity_std,
      continuity_min,
      continuity_max,
      continuity_range,
    },
    verdict: {
      b0_pass,
      b0_reason,
      threshold_range: THRESHOLD_RANGE,
    },
  };

  writeFileSync(RESULTS_FILE, JSON.stringify(suiteResult, null, 2), 'utf8');

  console.log(`\n${'='.repeat(70)}`);
  console.log('[V2.2-B B0] VERDICT FINAL');
  console.log('='.repeat(70));
  console.log(`Books processed     : ${valid.length}/${BOOKS.length}`);
  console.log(`Total chunks        : ${total_chunks}`);
  console.log(`Cache hit ratio     : ${(cache_hit_ratio * 100).toFixed(1)}%`);
  console.log(`Total runtime       : ${(total_runtime_ms / 1000).toFixed(1)}s`);
  console.log(
    `Continuity mean±std : ${continuity_mean.toFixed(4)} ± ${continuity_std.toFixed(4)}`
  );
  console.log(`Continuity range    : [${continuity_min.toFixed(4)}, ${continuity_max.toFixed(4)}]`);
  console.log(`Continuity Δ range  : ${continuity_range.toFixed(4)}`);
  console.log(`\nVerdict B0          : ${b0_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Reason              : ${b0_reason}`);
  console.log(`\nResults             : ${RESULTS_FILE}`);
}

main().catch((e) => {
  console.error('[V2.2-B B0] FATAL:', e);
  process.exit(1);
});
