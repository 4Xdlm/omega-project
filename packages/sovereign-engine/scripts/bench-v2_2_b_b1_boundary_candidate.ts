/**
 * V2.2-B B1 — Boundary candidate probe bench
 *
 * For each V2.1 boundary in 16 books, compare 4 candidate cuts:
 *   - actual: V2.1's chosen boundary
 *   - minus100: boundary shifted -100 words
 *   - plus100: boundary shifted +100 words
 *   - random_intra: random intra-chunk pair (control)
 *
 * Verdict per boundary:
 *   OPTIMAL    if cosine(actual) < min(cosine(shifted)) - 0.02
 *   SUB_OPTIMAL if cosine(actual) > min(cosine(shifted)) + 0.02
 *   AMBIGUOUS  otherwise
 *
 * Aggregate verdict:
 *   ≥70% OPTIMAL → V2.1 chunking excellent
 *   40-70%       → V2.1 mixed, scope V2.2-B FULL
 *   <40%         → V2.1 sub-optimal, MAJOR scope
 *
 * Sprint V2.2-B B1 — 2026-05-28 — post Option E sealing RC1 (91fa07e8).
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
const RESULTS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B1_results.json';
const CACHE_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/.embeddings-cache-v2_2_b_b1';
const ZONE_WORDS = 250;
const SHIFT = 100;
const VERDICT_THRESHOLD = 0.02;

// Deterministic seeded RNG (Mulberry32) for reproducibility
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

const BOOKS = [
  'fr_S_au_bonheur_des_dames_-_emile_zola.epub.txt',
  'fr_S_au_bonheur_des_dames_emile_zola.txt.txt',
  'en_S_a_farewell_to_arms_-_ernest_hemingway.epub.txt',
  'en_S_a_love_story_-_emile_zola.epub.txt',
  'fr_A_antigone_reine_french_edition_lolita_pille.txt.txt',
  'fr_A_ce_que_le_jour_doit_a_la_nuit_french_edition_-_yasmina_khadra.epub.txt',
  'en_A_a_connecticut_yankee_in_king_arthurs_cour_-_mark_twain.epub.txt',
  'en_A_a_good_man_is_hard_to_find_and_other_stories_-_flannery_oconnor.epub.txt',
  'fr_B_am_stram_gram_french_edition_-_mj_arlidge.epub.txt',
  'fr_B_antigone_reine_french_edition_-_lolita_pille.epub.txt',
  'en_B_50_shades_of_grey_-_el_james.epub.txt',
  'en_B_a_memory_of_light_-_robert_jordan.epub.txt',
  'fr_C_10_days_french_edition_-_cecilia_armand.epub.txt',
  'fr_C_14_minutes_2_secondes_french_edition_-_anouk_shutterberg.epub.txt',
  'en_C_a_ghetto_tale_from_ebony_ladies_night_chronicles_-_antoinette_sherell.epub.txt',
  'en_C_a_grant_county_collection_4-6_-_karin_slaughter.epub.txt',
];

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
  console.log("[V2.2-B B1] Boundary candidate probe — START");
  console.log(`Zone words: ${ZONE_WORDS}, Shift: ±${SHIFT}, Verdict threshold: ${VERDICT_THRESHOLD}`);

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  const embedder = new OllamaEmbedder({
    ...DEFAULT_OLLAMA_CONFIG,
    cache_dir: CACHE_DIR,
    use_cache: true,
  });

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
    console.log(`\n[${i + 1}/${BOOKS.length}] ${file.substring(0, 60)}`);
    const tBook = performance.now();

    try {
      const text = readFileSync(path, 'utf8');
      const word_count = text.split(/\s+/).filter((w) => w.length > 0).length;
      const chunks = chunkAdaptive(text);
      const rng = makeSeededRng(i * 1000 + 42);
      const scores: BoundaryCandidateScores[] = [];

      for (let b = 0; b < chunks.length - 1; b++) {
        const candidates = extractCandidateZones(chunks, b, ZONE_WORDS, SHIFT, rng);
        // Embed 8 zones (4 pairs × 2 each)
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
          `OPT=${metrics.count_optimal} SUB=${metrics.count_sub_optimal} AMB=${metrics.count_ambiguous}, ` +
          `meanΔshift=${metrics.mean_delta_shifted.toFixed(4)} meanΔrand=${metrics.mean_delta_random.toFixed(4)} ` +
          `(${runtime_ms.toFixed(0)}ms)`
      );

      results.push({
        file,
        tier,
        lang,
        word_count,
        chunk_count: chunks.length,
        boundary_count: scores.length,
        scores,
        metrics,
        runtime_ms,
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
        boundary_count: 0,
        scores: [],
        metrics: aggregateBookB1([]),
        runtime_ms: performance.now() - tBook,
        error: errMsg,
      });
    }
  }

  const total_runtime_ms = performance.now() - tStart;
  const health_post = await embedder.healthCheck();
  const valid = results.filter((r) => !r.error);

  // Cross-corpus aggregate
  const all_boundaries = valid.flatMap((r) => r.scores);
  const total_boundaries = all_boundaries.length;
  const total_optimal = all_boundaries.filter((s) => s.verdict === 'OPTIMAL').length;
  const total_sub_optimal = all_boundaries.filter((s) => s.verdict === 'SUB_OPTIMAL').length;
  const total_ambiguous = all_boundaries.filter((s) => s.verdict === 'AMBIGUOUS').length;
  const pct_optimal = total_boundaries > 0 ? (total_optimal / total_boundaries) * 100 : 0;
  const pct_sub_optimal = total_boundaries > 0 ? (total_sub_optimal / total_boundaries) * 100 : 0;
  const pct_ambiguous = total_boundaries > 0 ? (total_ambiguous / total_boundaries) * 100 : 0;

  const mean_delta_shifted_corpus =
    total_boundaries > 0
      ? all_boundaries.reduce((a, s) => a + s.delta_vs_shifted_min, 0) / total_boundaries
      : 0;
  const mean_delta_random_corpus =
    total_boundaries > 0
      ? all_boundaries.reduce((a, s) => a + s.delta_vs_random, 0) / total_boundaries
      : 0;
  const mean_cosine_actual_corpus =
    total_boundaries > 0
      ? all_boundaries.reduce((a, s) => a + s.cosine_actual, 0) / total_boundaries
      : 0;
  const mean_cosine_random_corpus =
    total_boundaries > 0
      ? all_boundaries.reduce((a, s) => a + s.cosine_random_intra, 0) / total_boundaries
      : 0;

  // Verdict aggregate
  let aggregate_verdict: string;
  let next_step: string;
  if (pct_optimal >= 70) {
    aggregate_verdict = 'V2.1_BOUNDARIES_EXCELLENT';
    next_step = 'V2.2-B scope: marginal optimization. Sealing V2.2-B FULL viable. B2+ optional.';
  } else if (pct_optimal >= 40) {
    aggregate_verdict = 'V2.1_BOUNDARIES_MIXED';
    next_step =
      'V2.2-B improvement scope PRESENT (~30-60% boundaries movable). Sealing V2.2-B with caveat.';
  } else {
    aggregate_verdict = 'V2.1_BOUNDARIES_SUBOPTIMAL';
    next_step =
      'V2.2-B MAJOR scope: most V2.1 boundaries movable. Consider V2.2-B FULL boundary optimizer impl.';
  }

  const random_control_gap = mean_cosine_random_corpus - mean_cosine_actual_corpus;
  const random_control_verdict =
    random_control_gap > 0.05
      ? 'random_intra_higher_than_actual'
      : random_control_gap > -0.05
        ? 'random_intra_similar_actual'
        : 'random_intra_lower_than_actual';

  const suite = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.2-B B1 boundary candidate probe',
    cbw_ref: 'V2_2_B_B1_CBW_PREFLIGHT_2026-05-28.md',
    parent_commit: '91fa07e8 (V2.2-B Option E SCELLÉ RC1)',
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
      random_control_verdict,
    },
    verdict: {
      aggregate_verdict,
      next_step,
    },
  };

  writeFileSync(RESULTS_FILE, JSON.stringify(suite, null, 2), 'utf8');

  console.log('\n' + '='.repeat(70));
  console.log('[V2.2-B B1] VERDICT FINAL');
  console.log('='.repeat(70));
  console.log(`Books processed: ${valid.length}/${BOOKS.length}`);
  console.log(`Total boundaries: ${total_boundaries}`);
  console.log(`Total runtime: ${(total_runtime_ms / 1000).toFixed(1)}s`);
  console.log(`Ollama post: ${health_post.ok ? 'UP' : 'DOWN'}`);
  console.log('');
  console.log(`OPTIMAL    : ${total_optimal}/${total_boundaries} (${pct_optimal.toFixed(1)}%)`);
  console.log(`SUB_OPTIMAL: ${total_sub_optimal}/${total_boundaries} (${pct_sub_optimal.toFixed(1)}%)`);
  console.log(`AMBIGUOUS  : ${total_ambiguous}/${total_boundaries} (${pct_ambiguous.toFixed(1)}%)`);
  console.log('');
  console.log(`Mean Δ shifted: ${mean_delta_shifted_corpus.toFixed(4)} (< 0 = V2.1 lower cos = good)`);
  console.log(`Mean Δ random : ${mean_delta_random_corpus.toFixed(4)} (< 0 = V2.1 lower cos = good)`);
  console.log(`Mean cos actual: ${mean_cosine_actual_corpus.toFixed(4)}`);
  console.log(`Mean cos random: ${mean_cosine_random_corpus.toFixed(4)}`);
  console.log(`Random control gap: ${random_control_gap.toFixed(4)} → ${random_control_verdict}`);
  console.log('');
  console.log(`Aggregate verdict: ${aggregate_verdict}`);
  console.log(`Next step: ${next_step}`);
  console.log(`\nResults: ${RESULTS_FILE}`);
}

main().catch((e) => {
  console.error('[V2.2-B B1] FATAL:', e);
  process.exit(1);
});
