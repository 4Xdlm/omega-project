/**
 * V2.2-B PROBE Phase B0' — EMBEDDING MODEL SANITY (NOT boundary validation)
 *
 * CRITICAL SCOPE LIMITATION (per ChatGPT Tribunal 2026-05-28) :
 *   This bench validates that nomic-embed-text PRODUCES sane embeddings on V2.1
 *   chunks compatible with Ollama context window (≤8192 tokens).
 *   This bench does NOT validate that crossChunkContinuity() detects boundaries
 *   meaningfully. Boundary validation requires post-α B0 original 16 livres rerun.
 *
 * Goal: confirm embedding model produces non-degenerate, discriminant vectors on
 *       compatible chunks, and that Ollama daemon survives the workload.
 *
 * Method:
 *   1. 12 stratified short books ≤95KB (~≤19K words, chunks ≤2.7K words ≤3.5K tokens)
 *   2. For each: chunkAdaptive() V2.1 default → 7 chunks
 *   3. OllamaEmbedder.getCachedOrCompute per chunk → 768-dim vector
 *   4. crossChunkContinuity(embeddings) → continuity score [0,1]
 *   5. Output JSON with measures + extended verdict (sanity criteria, not boundary)
 *
 * Verdict B0' (per ChatGPT Tribunal extended criteria) :
 *   PASS requires ALL of :
 *     - ≥8 books processed (statistical minimum)
 *     - 0 Ollama daemon crashes (no 500 cascade)
 *     - 0 NaN scores
 *     - 0 constant-score degenerate books (all pair_scores identical)
 *     - continuity_range > 0.2 (discriminant inter-book signal)
 *     - all embeddings 768 dims (model integrity)
 *   FAIL = any criterion failed
 *
 * Next steps :
 *   PASS → GO Option α : circuit breaker IN PRODUCTION CODE (OllamaEmbedder.embed()),
 *          NOT only bench script. Plus sub-chunking pré-embedding + pooling + tests.
 *          Then rerun B0 original 16 livres for true Ollama-survival validation.
 *   FAIL → STOP. Do NOT kill V2.2 immediately. Investigate :
 *          (a) embedding model integrity (dims, NaN),
 *          (b) crossChunkContinuity() metric quality,
 *          (c) corpus short bias,
 *          (d) chunking output validity.
 *
 * Sprint: V2.2-B PROBE 2026-05-28 (post FAIL_INFRASTRUCTURE B0)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * CBW: V2_2_B_CBW_PREFLIGHT_2026-05-28.md (GO_WRITE) + extension B0' empirical
 * Tribunal 2/2 IA convergence: Gemini GO δ→α + ChatGPT GO δ→α (corrections appliquées)
 * Sequence: δ (this) → if PASS → α (sub-chunking + circuit breaker PRODUCTION)
 * Forbidden: bulk (>20), production-ready, integration pipeline, B1 before B0-post-α PASS
 *
 * Safety margin: word_count/chunk_count = 19K/7 = 2.7K words max (≈3.5K tokens),
 * well below nomic-embed-text 8192 token limit. No Ollama crash expected.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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
const RESULTS_FILE = join(OUTPUT_DIR, 'V2_2_B_B0_PRIME_results.json');
const CACHE_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/.embeddings-cache-v2_2_b';

// 12 livres stratifiés ≤95KB (max ~19K mots, chunks ≤2.7K mots ≤3.5K tokens)
// Note : tier S représenté FR uniquement (en_S minimum ≥141KB ~28K mots, marge insuffisante)
const BOOKS = [
  // fr_S (2) — corpus court extrême classique français
  'fr_S_tentative_depuisement_dun_lieu_parisien_french_edition_-_georges_perec.epub.txt', // 43KB
  'fr_S_oeuvres_completes_ii_french_edition_-_montesquieu.epub.txt', // 55KB
  // fr_A (1) — best ≤100KB
  'fr_A_pathemata_ou_lhistoire_de_ma_bouche_french_edition_-_maggie_nelson.epub.txt', // 94KB
  // en_A (2)
  'en_A_the_fall_of_the_house_of_usher_-_edgar_allan_poe.epub.txt', // 42KB
  'en_A_the_wolf_hall_picture_book_-_hilary_mantel.epub.txt', // 95KB
  // fr_B (1) — seul fr_B ≤120KB
  'fr_B_vorace_french_edition_-_anne-sylvie_sprenger.epub.txt', // 95KB
  // en_B (2)
  'en_B_necessary_women_and_the_mean_time_-_karin_slaughter.epub.txt', // 32KB
  'en_B_father_christmass_fake_beard_-_terry_pratchett.epub.txt', // 87KB
  // fr_C (2)
  'fr_C_la_sirene_french_edition_-_kiera_cass.epub.txt', // 34KB
  'fr_C_hard_bikers_french_edition_-_laura_spark.epub.txt', // 42KB
  // en_C (2)
  'en_C_milked_by_the_italian_mafia_hucow_for_mafioso_book_1_-_leandra_camilli.epub.txt', // 27KB
  'en_C_the_reno_man_and_my_hotwife_epub_-_the_reno_man.epub.txt', // 40KB
];

// === Safety: pre-check max words/chunk before fetch ===
const MAX_WORDS_PER_CHUNK_SAFE = 5000; // ~6500 tokens, marge sous 8192

// === Types ===

interface BookResult {
  readonly file: string;
  readonly tier: string;
  readonly lang: string;
  readonly word_count: number;
  readonly chunk_count: number;
  readonly chunk_word_counts: readonly number[];
  readonly max_words_per_chunk: number;
  readonly chunking_runtime_ms: number;
  readonly embedding_runtime_ms: number;
  readonly embedding_cache_hits: number;
  readonly embedding_cache_misses: number;
  readonly continuity_score: number;
  readonly continuity_pair_scores: readonly number[];
  readonly safety_skipped: boolean;
  readonly error?: string;
}

interface SuiteResult {
  readonly date_iso: string;
  readonly sprint: "V2.2-B PROBE Phase B0' EMBEDDING MODEL SANITY (NOT boundary validation)";
  readonly cbw_ref: 'V2_2_B_CBW_PREFLIGHT_2026-05-28.md';
  readonly fail_predecessor_ref: 'V2_2_B_B0_FAIL_INFRASTRUCTURE_2026-05-28.md';
  readonly tribunal_ref: '2/2 IA convergence Gemini+ChatGPT GO δ→α 2026-05-28';
  readonly ollama_health_pre: { ok: boolean; reason?: string };
  readonly ollama_health_post: { ok: boolean; reason?: string };
  readonly cache_dir: string;
  readonly book_count: number;
  readonly safety_max_words_per_chunk: number;
  readonly results: readonly BookResult[];
  readonly aggregate: {
    readonly total_books_attempted: number;
    readonly total_books_processed: number;
    readonly total_books_safety_skipped: number;
    readonly total_books_error: number;
    readonly total_books_nan_or_constant: number;
    readonly total_chunks: number;
    readonly total_embeddings: number;
    readonly total_runtime_ms: number;
    readonly cache_hit_ratio: number;
    readonly continuity_mean: number;
    readonly continuity_std: number;
    readonly continuity_min: number;
    readonly continuity_max: number;
    readonly continuity_range: number;
    readonly all_dims_match_768: boolean;
  };
  readonly verdict: {
    readonly b0_prime_pass: boolean;
    readonly criteria: {
      readonly books_min_8: boolean;
      readonly ollama_post_up: boolean;
      readonly no_nan_scores: boolean;
      readonly no_constant_degenerate: boolean;
      readonly continuity_range_above_threshold: boolean;
      readonly all_dims_768: boolean;
    };
    readonly b0_prime_reason: string;
    readonly threshold_range: number;
    readonly next_step: string;
  };
}

// === Main ===

async function main(): Promise<void> {
  console.log("[V2.2-B B0'] Embedding Oracle Sanity SHORT CORPUS — START");
  console.log(`[V2.2-B B0'] CBW ref: V2_2_B_CBW_PREFLIGHT_2026-05-28.md (GO_WRITE)`);
  console.log(`[V2.2-B B0'] Predecessor FAIL: V2_2_B_B0_FAIL_INFRASTRUCTURE_2026-05-28.md`);
  console.log(`[V2.2-B B0'] Books: ${BOOKS.length} stratified short (≤95KB)`);
  console.log(`[V2.2-B B0'] Safety max_words/chunk: ${MAX_WORDS_PER_CHUNK_SAFE} (~6500 tokens)`);

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`[V2.2-B B0'] Cache dir created: ${CACHE_DIR}`);
  }

  const embedder = new OllamaEmbedder({
    ...DEFAULT_OLLAMA_CONFIG,
    cache_dir: CACHE_DIR,
    use_cache: true,
  });

  // Health check Ollama PRE-bench
  const health_pre = await embedder.healthCheck();
  console.log(`[V2.2-B B0'] Ollama health PRE: ${JSON.stringify(health_pre)}`);
  if (!health_pre.ok) {
    console.error("[V2.2-B B0'] FATAL: Ollama unavailable pre-bench, abort.");
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
      const chunk_word_counts = chunks.map((c) => c.metadata.word_count);
      const max_words_per_chunk = Math.max(...chunk_word_counts);

      console.log(
        `  word_count=${word_count}, chunks=${chunks.length}, max_words/chunk=${max_words_per_chunk}, chunking=${chunking_runtime_ms.toFixed(0)}ms`
      );

      // SAFETY CIRCUIT BREAKER — skip if chunk too large (avoid Ollama crash)
      if (max_words_per_chunk > MAX_WORDS_PER_CHUNK_SAFE) {
        console.warn(
          `  SAFETY SKIP: max_words/chunk ${max_words_per_chunk} > ${MAX_WORDS_PER_CHUNK_SAFE} (Ollama crash risk)`
        );
        results.push({
          file,
          tier,
          lang,
          word_count,
          chunk_count: chunks.length,
          chunk_word_counts,
          max_words_per_chunk,
          chunking_runtime_ms,
          embedding_runtime_ms: 0,
          embedding_cache_hits: 0,
          embedding_cache_misses: 0,
          continuity_score: 0,
          continuity_pair_scores: [],
          safety_skipped: true,
        });
        continue;
      }

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
        chunk_word_counts,
        max_words_per_chunk,
        chunking_runtime_ms,
        embedding_runtime_ms,
        embedding_cache_hits: cache_hits,
        embedding_cache_misses: cache_misses,
        continuity_score: continuity.score,
        continuity_pair_scores: continuity.pair_scores,
        safety_skipped: false,
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
        max_words_per_chunk: 0,
        chunking_runtime_ms: 0,
        embedding_runtime_ms: 0,
        embedding_cache_hits: 0,
        embedding_cache_misses: 0,
        continuity_score: 0,
        continuity_pair_scores: [],
        safety_skipped: false,
        error: errMsg,
      });
    }
  }

  const tEnd = performance.now();
  const total_runtime_ms = tEnd - tStart;

  // Health check Ollama POST-bench (criterion: daemon survived workload)
  const health_post = await embedder.healthCheck();
  console.log(`\n[V2.2-B B0'] Ollama health POST: ${JSON.stringify(health_post)}`);

  // Aggregate
  const valid = results.filter((r) => !r.error && !r.safety_skipped);
  const safetySkipped = results.filter((r) => r.safety_skipped);
  const errored = results.filter((r) => !!r.error);
  const total_chunks = valid.reduce((sum, r) => sum + r.chunk_count, 0);
  const total_embeddings = total_chunks;
  const total_hits = valid.reduce((sum, r) => sum + r.embedding_cache_hits, 0);
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

  // === Extended criteria per ChatGPT Tribunal ===
  const THRESHOLD_RANGE = 0.2;

  // Critère 1 : min 8 livres traités
  const books_min_8 = valid.length >= 8;

  // Critère 2 : Ollama UP post-bench (daemon survived)
  const ollama_post_up = health_post.ok;

  // Critère 3 : 0 NaN scores
  const no_nan_scores = valid.every((r) => Number.isFinite(r.continuity_score));

  // Critère 4 : 0 livre dégénéré (tous pair_scores identiques)
  const no_constant_degenerate = valid.every((r) => {
    if (r.continuity_pair_scores.length < 2) return true;
    const first = r.continuity_pair_scores[0];
    return r.continuity_pair_scores.some((s) => Math.abs(s - first!) > 1e-9);
  });

  // Critère 5 : continuity_range exploitable
  const continuity_range_above_threshold = continuity_range > THRESHOLD_RANGE;

  // Critère 6 : all dims 768 (déjà validé par OllamaEmbedder DIMENSION_MISMATCH check)
  // Si on est arrivé ici sans throw DIMENSION_MISMATCH, all_dims_768 = true
  const all_dims_768 = errored.every((r) => !r.error?.includes('DIMENSION_MISMATCH'));

  // Aggregate degenerate count
  const total_books_nan_or_constant = valid.filter(
    (r) =>
      !Number.isFinite(r.continuity_score) ||
      (r.continuity_pair_scores.length >= 2 &&
        r.continuity_pair_scores.every(
          (s) => Math.abs(s - r.continuity_pair_scores[0]!) < 1e-9
        ))
  ).length;

  const b0_prime_pass =
    books_min_8 &&
    ollama_post_up &&
    no_nan_scores &&
    no_constant_degenerate &&
    continuity_range_above_threshold &&
    all_dims_768;

  let b0_prime_reason: string;
  let next_step: string;
  const failedCriteria: string[] = [];
  if (!books_min_8) failedCriteria.push(`books_min_8 (${valid.length}/8)`);
  if (!ollama_post_up) failedCriteria.push(`ollama_post_up (DOWN)`);
  if (!no_nan_scores) failedCriteria.push(`no_nan_scores (NaN detected)`);
  if (!no_constant_degenerate) failedCriteria.push(`no_constant_degenerate (degenerate scores)`);
  if (!continuity_range_above_threshold)
    failedCriteria.push(`continuity_range > ${THRESHOLD_RANGE} (${continuity_range.toFixed(4)})`);
  if (!all_dims_768) failedCriteria.push(`all_dims_768 (dimension mismatch)`);

  if (b0_prime_pass) {
    b0_prime_reason = `PASS — all 6 criteria met. ${valid.length}/${BOOKS.length} books processed, continuity_range=${continuity_range.toFixed(4)} > ${THRESHOLD_RANGE}, Ollama daemon survived workload, no NaN/degenerate, all embeddings 768 dims.`;
    next_step =
      'GO Option α: implement circuit breaker IN PRODUCTION OllamaEmbedder.embed() (not bench-only) + sub-chunking pre-embedding + pooling + typed OVERSIZE_INPUT error + unit tests. Then RERUN B0 ORIGINAL 16 livres for Ollama-survival validation. NOT B1 yet.';
  } else {
    b0_prime_reason = `FAIL — criteria failed: ${failedCriteria.join('; ')}. STOP — do NOT kill V2.2 yet. Investigate: (a) embedding model integrity, (b) crossChunkContinuity() metric quality, (c) corpus short bias, (d) chunking output validity.`;
    next_step =
      'STOP. Forensic analysis required: embedding model dims/NaN check, crossChunkContinuity() formula audit, corpus bias check, chunkAdaptive() output validation. Do NOT proceed Option α/β/γ until root cause identified.';
  }

  const suiteResult: SuiteResult = {
    date_iso: new Date().toISOString(),
    sprint: "V2.2-B PROBE Phase B0' EMBEDDING MODEL SANITY (NOT boundary validation)",
    cbw_ref: 'V2_2_B_CBW_PREFLIGHT_2026-05-28.md',
    fail_predecessor_ref: 'V2_2_B_B0_FAIL_INFRASTRUCTURE_2026-05-28.md',
    tribunal_ref: '2/2 IA convergence Gemini+ChatGPT GO δ→α 2026-05-28',
    ollama_health_pre: health_pre,
    ollama_health_post: health_post,
    cache_dir: CACHE_DIR,
    book_count: BOOKS.length,
    safety_max_words_per_chunk: MAX_WORDS_PER_CHUNK_SAFE,
    results,
    aggregate: {
      total_books_attempted: BOOKS.length,
      total_books_processed: valid.length,
      total_books_safety_skipped: safetySkipped.length,
      total_books_error: errored.length,
      total_books_nan_or_constant,
      total_chunks,
      total_embeddings,
      total_runtime_ms,
      cache_hit_ratio,
      continuity_mean,
      continuity_std,
      continuity_min,
      continuity_max,
      continuity_range,
      all_dims_match_768: all_dims_768,
    },
    verdict: {
      b0_prime_pass,
      criteria: {
        books_min_8,
        ollama_post_up,
        no_nan_scores,
        no_constant_degenerate,
        continuity_range_above_threshold,
        all_dims_768,
      },
      b0_prime_reason,
      threshold_range: THRESHOLD_RANGE,
      next_step,
    },
  };

  writeFileSync(RESULTS_FILE, JSON.stringify(suiteResult, null, 2), 'utf8');

  console.log(`\n${'='.repeat(70)}`);
  console.log("[V2.2-B B0'] VERDICT FINAL — EMBEDDING MODEL SANITY (NOT boundary)");
  console.log('='.repeat(70));
  console.log(`Books attempted     : ${BOOKS.length}`);
  console.log(`Books processed     : ${valid.length}`);
  console.log(`Books safety skip   : ${safetySkipped.length}`);
  console.log(`Books errored       : ${errored.length}`);
  console.log(`Books NaN/constant  : ${total_books_nan_or_constant}`);
  console.log(`Total chunks        : ${total_chunks}`);
  console.log(`Cache hit ratio     : ${(cache_hit_ratio * 100).toFixed(1)}%`);
  console.log(`Total runtime       : ${(total_runtime_ms / 1000).toFixed(1)}s`);
  console.log(`Ollama health POST  : ${health_post.ok ? 'UP' : 'DOWN'} (daemon survived workload)`);
  console.log(
    `Continuity mean±std : ${continuity_mean.toFixed(4)} ± ${continuity_std.toFixed(4)}`
  );
  console.log(`Continuity range    : [${continuity_min.toFixed(4)}, ${continuity_max.toFixed(4)}]`);
  console.log(`Continuity Δ range  : ${continuity_range.toFixed(4)}`);
  console.log(`\n--- 6 PASS criteria ---`);
  console.log(`  books_min_8                   : ${books_min_8 ? 'PASS' : 'FAIL'} (${valid.length}/8)`);
  console.log(`  ollama_post_up                : ${ollama_post_up ? 'PASS' : 'FAIL'}`);
  console.log(`  no_nan_scores                 : ${no_nan_scores ? 'PASS' : 'FAIL'}`);
  console.log(`  no_constant_degenerate        : ${no_constant_degenerate ? 'PASS' : 'FAIL'}`);
  console.log(`  continuity_range > ${THRESHOLD_RANGE}        : ${continuity_range_above_threshold ? 'PASS' : 'FAIL'} (${continuity_range.toFixed(4)})`);
  console.log(`  all_dims_768                  : ${all_dims_768 ? 'PASS' : 'FAIL'}`);
  console.log(`\nVerdict B0'         : ${b0_prime_pass ? 'PASS' : 'FAIL'}`);
  console.log(`Reason              : ${b0_prime_reason}`);
  console.log(`Next step           : ${next_step}`);
  console.log(`\nResults             : ${RESULTS_FILE}`);
}

main().catch((e) => {
  console.error("[V2.2-B B0'] FATAL:", e);
  process.exit(1);
});
