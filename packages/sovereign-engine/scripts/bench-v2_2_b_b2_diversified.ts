/**
 * V2.2-B B2 — Boundary candidate probe, corpus DIVERSIFIE (48 livres FR+EN, tiers S/A/B/C/D, zero doublon)
 *
 * Identique a B1 (methode scellee) mais corpus elargi pour generalisation :
 *   - 48 livres selectionnes deterministiquement (seed 42), zero doublon titre, 16 B1 exclus.
 *   - Selection : Claude-Workspace/OMEGA/outputs/V2_2_B_B2_book_selection.json
 *
 * Pour chaque frontiere V2.1, 4 coupes candidates (actual / -100w / +100w / random_intra control).
 * Verdict/frontiere : OPTIMAL si cos(actual) < min(cos(shifted)) - 0.02 ;
 *                     SUB_OPTIMAL si cos(actual) > min(cos(shifted)) + 0.02 ; sinon AMBIGUOUS.
 *
 * Verdict agrege B2 (critere = scope d'amelioration via SUB_OPTIMAL) :
 *   pct_sub_optimal >= 30%  -> GO_PHASE_3 (scope reel, SHADOW optimizer justifie)
 *   20-30%                  -> CONDITIONAL (scope marginal, decision Architect)
 *   < 20%                   -> STOP (V2.1 boundaries suffisantes, pas de FULL optimizer)
 *
 * Zones embeddees = 250 mots << 1200 (limite Ollama LAW-CHUNK-047) -> pas de crash 500.
 * Sprint V2.2-B B2 — 2026-05-28 — post B1 (V2.1_SUBOPTIMAL 47.9% sur 16 livres).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chunkAdaptive } from '../src/chunking/adaptive.js';
import { OllamaEmbedder, DEFAULT_OLLAMA_CONFIG } from '../src/embeddings/index.js';
import {
  extractCandidateZones,
  computeBoundaryVerdict,
  pairCosine,
  aggregateBookB1,
  type BoundaryCandidateScores,
} from '../src/embeddings/boundaryCandidate.js';

const CORPUS_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/v2_1_1/corpus_text';
const SELECTION_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B2_book_selection.json';
const RESULTS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B2_results.json';
const PROGRESS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B2_progress.txt';
const CACHE_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/.embeddings-cache-v2_2_b_b2';
const ZONE_WORDS = 250;
const SHIFT = 100;
const VERDICT_THRESHOLD = 0.02;

function makeSeededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SELECTION = JSON.parse(readFileSync(SELECTION_FILE, 'utf8')) as { books: readonly string[] };
const BOOKS: readonly string[] = SELECTION.books;

interface BookResult {
  readonly file: string;
  readonly tier: string;
  readonly lang: string;
  readonly word_count: number;
  readonly chunk_count: number;
  readonly boundary_count: number;
  readonly scores: readonly BoundaryCandidateScores[];
  readonly metrics: ReturnType<typeof aggregateBookB1>;
  readonly runtime_ms: number;
  readonly error?: string;
}

async function main(): Promise<void> {
  console.log('[V2.2-B B2] Boundary candidate probe DIVERSIFIE — START');
  console.log(`Books: ${BOOKS.length}, Zone words: ${ZONE_WORDS}, Shift: +/-${SHIFT}, Threshold: ${VERDICT_THRESHOLD}`);

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  const embedder = new OllamaEmbedder({ ...DEFAULT_OLLAMA_CONFIG, cache_dir: CACHE_DIR, use_cache: true });
  const health = await embedder.healthCheck();
  console.log(`Ollama health PRE: ${JSON.stringify(health)}`);
  if (!health.ok) {
    console.error('FATAL: Ollama unavailable');
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
    const progressLine = `[${i + 1}/${BOOKS.length}] ${file.substring(0, 60)}`;
    console.log(`\n${progressLine}`);
    try { writeFileSync(PROGRESS_FILE, `${new Date().toISOString()} ${progressLine}\n`, 'utf8'); } catch { /* noop */ }
    const tBook = performance.now();

    try {
      const text = readFileSync(path, 'utf8');
      const word_count = text.split(/\s+/).filter((w) => w.length > 0).length;
      const chunks = chunkAdaptive(text);
      const rng = makeSeededRng(i * 1000 + 42);
      const scores: BoundaryCandidateScores[] = [];

      for (let b = 0; b < chunks.length - 1; b++) {
        const candidates = extractCandidateZones(chunks, b, ZONE_WORDS, SHIFT, rng);
        const vec_actual_L = await embedder.embed(candidates.actual.end_left);
        const vec_actual_R = await embedder.embed(candidates.actual.start_right);
        const vec_m100_L = await embedder.embed(candidates.shifted_minus100.end_left);
        const vec_m100_R = await embedder.embed(candidates.shifted_minus100.start_right);
        const vec_p100_L = await embedder.embed(candidates.shifted_plus100.end_left);
        const vec_p100_R = await embedder.embed(candidates.shifted_plus100.start_right);
        const vec_rand_L = await embedder.embed(candidates.random_intra.end_left);
        const vec_rand_R = await embedder.embed(candidates.random_intra.start_right);

        const cos_actual = pairCosine(vec_actual_L, vec_actual_R);
        const cos_m100 = pairCosine(vec_m100_L, vec_m100_R);
        const cos_p100 = pairCosine(vec_p100_L, vec_p100_R);
        const cos_rand = pairCosine(vec_rand_L, vec_rand_R);

        const v = computeBoundaryVerdict(cos_actual, cos_m100, cos_p100, cos_rand, VERDICT_THRESHOLD);
        scores.push({ ...v, boundary_index: b });
      }

      const metrics = aggregateBookB1(scores);
      const runtime_ms = performance.now() - tBook;
      console.log(
        `  chunks=${chunks.length}, boundaries=${scores.length}, ` +
          `OPT=${metrics.count_optimal} SUB=${metrics.count_sub_optimal} AMB=${metrics.count_ambiguous} (${runtime_ms.toFixed(0)}ms)`
      );
      results.push({ file, tier, lang, word_count, chunk_count: chunks.length, boundary_count: scores.length, scores, metrics, runtime_ms });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${errMsg}`);
      results.push({ file, tier, lang, word_count: 0, chunk_count: 0, boundary_count: 0, scores: [], metrics: aggregateBookB1([]), runtime_ms: performance.now() - tBook, error: errMsg });
    }
  }

  const total_runtime_ms = performance.now() - tStart;
  const health_post = await embedder.healthCheck();
  const valid = results.filter((r) => !r.error);

  const all_boundaries = valid.flatMap((r) => r.scores);
  const total_boundaries = all_boundaries.length;
  const total_optimal = all_boundaries.filter((s) => s.verdict === 'OPTIMAL').length;
  const total_sub_optimal = all_boundaries.filter((s) => s.verdict === 'SUB_OPTIMAL').length;
  const total_ambiguous = all_boundaries.filter((s) => s.verdict === 'AMBIGUOUS').length;
  const pct_optimal = total_boundaries > 0 ? (total_optimal / total_boundaries) * 100 : 0;
  const pct_sub_optimal = total_boundaries > 0 ? (total_sub_optimal / total_boundaries) * 100 : 0;
  const pct_ambiguous = total_boundaries > 0 ? (total_ambiguous / total_boundaries) * 100 : 0;

  const mean_delta_shifted_corpus = total_boundaries > 0 ? all_boundaries.reduce((a, s) => a + s.delta_vs_shifted_min, 0) / total_boundaries : 0;
  const mean_delta_random_corpus = total_boundaries > 0 ? all_boundaries.reduce((a, s) => a + s.delta_vs_random, 0) / total_boundaries : 0;
  const mean_cosine_actual_corpus = total_boundaries > 0 ? all_boundaries.reduce((a, s) => a + s.cosine_actual, 0) / total_boundaries : 0;
  const mean_cosine_random_corpus = total_boundaries > 0 ? all_boundaries.reduce((a, s) => a + s.cosine_random_intra, 0) / total_boundaries : 0;
  const random_control_gap = mean_cosine_random_corpus - mean_cosine_actual_corpus;

  // Verdict B2 keye sur SUB_OPTIMAL (scope amelioration)
  let aggregate_verdict: string;
  let next_step: string;
  if (pct_sub_optimal >= 30) {
    aggregate_verdict = 'GO_PHASE_3';
    next_step = 'Scope amelioration REEL (>=30% boundaries SUB_OPTIMAL). V2.2-C SHADOW boundary optimizer justifie.';
  } else if (pct_sub_optimal >= 20) {
    aggregate_verdict = 'CONDITIONAL';
    next_step = 'Scope marginal (20-30% SUB_OPTIMAL). Decision Architect : SHADOW probe ou STOP.';
  } else {
    aggregate_verdict = 'STOP';
    next_step = 'V2.1 boundaries suffisantes (<20% SUB_OPTIMAL). Pas de FULL optimizer. Pivot autre levier V2.2.';
  }

  // per-tier / per-lang breakdown
  const breakdown: Record<string, { boundaries: number; sub_optimal: number; pct_sub: number }> = {};
  for (const r of valid) {
    const key = `${r.lang}_${r.tier}`;
    const b = breakdown[key] ?? { boundaries: 0, sub_optimal: 0, pct_sub: 0 };
    b.boundaries += r.scores.length;
    b.sub_optimal += r.scores.filter((s) => s.verdict === 'SUB_OPTIMAL').length;
    breakdown[key] = b;
  }
  for (const k of Object.keys(breakdown)) {
    const b = breakdown[k]!;
    b.pct_sub = b.boundaries > 0 ? (b.sub_optimal / b.boundaries) * 100 : 0;
  }

  const suite = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.2-B B2 boundary candidate probe DIVERSIFIE',
    cbw_ref: 'V2_2_B_CBW_B2_2026-05-28.md',
    parent_commit: 'ebb9ea1a (Phase 1 Codex v1.3.1 sealed)',
    selection_file: SELECTION_FILE,
    zone_words: ZONE_WORDS,
    shift: SHIFT,
    verdict_threshold: VERDICT_THRESHOLD,
    book_count: BOOKS.length,
    cache_dir: CACHE_DIR,
    ollama_health_pre: health,
    ollama_health_post: health_post,
    results,
    aggregate: {
      total_runtime_ms,
      books_processed: valid.length,
      books_errored: results.length - valid.length,
      total_boundaries,
      total_optimal,
      total_sub_optimal,
      total_ambiguous,
      pct_optimal,
      pct_sub_optimal,
      pct_ambiguous,
      mean_delta_shifted_corpus,
      mean_delta_random_corpus,
      mean_cosine_actual_corpus,
      mean_cosine_random_corpus,
      random_control_gap,
      breakdown_by_lang_tier: breakdown,
    },
    verdict: { aggregate_verdict, next_step, b1_comparison_pct_sub_optimal: 47.9 },
  };

  writeFileSync(RESULTS_FILE, JSON.stringify(suite, null, 2), 'utf8');

  console.log('\n' + '='.repeat(70));
  console.log('[V2.2-B B2] VERDICT FINAL');
  console.log('='.repeat(70));
  console.log(`Books processed: ${valid.length}/${BOOKS.length} (errored: ${results.length - valid.length})`);
  console.log(`Total boundaries: ${total_boundaries}`);
  console.log(`Total runtime: ${(total_runtime_ms / 1000).toFixed(1)}s`);
  console.log(`Ollama post: ${health_post.ok ? 'UP' : 'DOWN'}`);
  console.log('');
  console.log(`OPTIMAL    : ${total_optimal}/${total_boundaries} (${pct_optimal.toFixed(1)}%)`);
  console.log(`SUB_OPTIMAL: ${total_sub_optimal}/${total_boundaries} (${pct_sub_optimal.toFixed(1)}%)  [B1 was 47.9%]`);
  console.log(`AMBIGUOUS  : ${total_ambiguous}/${total_boundaries} (${pct_ambiguous.toFixed(1)}%)`);
  console.log(`Random control gap: ${random_control_gap.toFixed(4)}`);
  console.log('');
  console.log(`AGGREGATE VERDICT: ${aggregate_verdict}`);
  console.log(`Next step: ${next_step}`);
  console.log(`\nResults: ${RESULTS_FILE}`);
}

main().catch((e) => {
  console.error('[V2.2-B B2] FATAL:', e);
  process.exit(1);
});
