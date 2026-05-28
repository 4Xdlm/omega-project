/**
 * V2.2-B Option E — Boundary-zone embedding bench
 *
 * Tests innovation : embedding boundary zones (250w end+start of adjacent
 * chunks) directly, without full-chunk pooling. Measures if cosine between
 * left-end and right-start zones produces a discriminant signal across
 * V2.1 chunk boundaries.
 *
 * Expected: signal preserved (no pooling dilution) → range_cross_books > 0.2.
 *
 * Sprint V2.2-B Option E 2026-05-28.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chunkAdaptive } from '../src/chunking/adaptive.js';
import { OllamaEmbedder, DEFAULT_OLLAMA_CONFIG } from '../src/embeddings/index.js';
import {
  extractBoundaryZones,
  computeBoundaryScores,
  aggregateBookBoundaries,
} from '../src/embeddings/boundaryZone.js';

const CORPUS_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/v2_1_1/corpus_text';
const RESULTS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_BOUNDARY_ZONE_results.json';
const CACHE_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/.embeddings-cache-v2_2_b_boundary';
const ZONE_WORDS = 250;

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
  readonly boundary_scores: readonly number[];
  readonly min_boundary: number;
  readonly mean_boundary: number;
  readonly max_boundary: number;
  readonly std_boundary: number;
  readonly range_boundary: number;
  readonly runtime_ms: number;
  readonly error?: string;
}

async function main(): Promise<void> {
  console.log("[V2.2-B Option E] Boundary-zone embedding bench — START");
  console.log(`Zone words: ${ZONE_WORDS} (per side)`);

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

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
    const tBookStart = performance.now();

    try {
      const text = readFileSync(path, 'utf8');
      const word_count = text.split(/\s+/).filter((w) => w.length > 0).length;
      const chunks = chunkAdaptive(text);
      const zones = extractBoundaryZones(chunks, ZONE_WORDS);
      console.log(`  word_count=${word_count}, chunks=${chunks.length}, boundaries=${zones.length}`);

      // Embed each boundary zone (left + right per pair)
      const embedded = [];
      for (const z of zones) {
        const left_vector = await embedder.embed(z.end_of_left);
        const right_vector = await embedder.embed(z.start_of_right);
        embedded.push({
          boundary_index: z.boundary_index,
          left_vector,
          right_vector,
          left_word_count: z.left_word_count,
          right_word_count: z.right_word_count,
        });
      }

      const scores = computeBoundaryScores(embedded);
      const agg = aggregateBookBoundaries(scores);
      const runtime_ms = performance.now() - tBookStart;
      console.log(
        `  boundaries=${agg.boundary_count}, min=${agg.min_boundary.toFixed(4)}, mean=${agg.mean_boundary.toFixed(4)}, max=${agg.max_boundary.toFixed(4)}, range=${agg.range_boundary.toFixed(4)} (${runtime_ms.toFixed(0)}ms)`
      );

      results.push({
        file,
        tier,
        lang,
        word_count,
        chunk_count: chunks.length,
        boundary_count: agg.boundary_count,
        boundary_scores: agg.boundary_scores,
        min_boundary: agg.min_boundary,
        mean_boundary: agg.mean_boundary,
        max_boundary: agg.max_boundary,
        std_boundary: agg.std_boundary,
        range_boundary: agg.range_boundary,
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
        boundary_scores: [],
        min_boundary: 0,
        mean_boundary: 0,
        max_boundary: 0,
        std_boundary: 0,
        range_boundary: 0,
        runtime_ms: performance.now() - tBookStart,
        error: errMsg,
      });
    }
  }

  const total_runtime_ms = performance.now() - tStart;
  const health_post = await embedder.healthCheck();

  const valid = results.filter((r) => !r.error);
  const metrics = ['min_boundary', 'mean_boundary', 'max_boundary', 'std_boundary'] as const;
  const ranges: Record<string, { min: number; max: number; range: number; mean: number; std: number }> = {};
  for (const m of metrics) {
    const vals = valid.map((r) => r[m]);
    const minv = Math.min(...vals);
    const maxv = Math.max(...vals);
    const meanv = vals.reduce((a, b) => a + b, 0) / vals.length;
    const stdv = Math.sqrt(
      vals.map((v) => (v - meanv) ** 2).reduce((a, b) => a + b, 0) / vals.length
    );
    ranges[m] = { min: minv, max: maxv, range: maxv - minv, mean: meanv, std: stdv };
  }

  const candidates = metrics.filter((m) => ranges[m]!.range > 0.2);
  const verdict_pass = candidates.length > 0 && valid.length >= 8 && health_post.ok;

  const suite = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.2-B Option E (boundary-zone embedding)',
    zone_words: ZONE_WORDS,
    cache_dir: CACHE_DIR,
    book_count: BOOKS.length,
    ollama_health_pre: health,
    ollama_health_post: health_post,
    results,
    aggregate: { total_runtime_ms, ranges, candidates },
    verdict: { pass: verdict_pass, candidates, reason: verdict_pass ? `PASS — discriminant metrics: ${candidates.join(', ')}` : 'FAIL — all ranges ≤ 0.2' },
  };

  writeFileSync(RESULTS_FILE, JSON.stringify(suite, null, 2), 'utf8');

  console.log('\n' + '='.repeat(70));
  console.log('[V2.2-B Option E] VERDICT FINAL');
  console.log('='.repeat(70));
  console.log(`Books processed: ${valid.length}/${BOOKS.length}`);
  console.log(`Total runtime: ${(total_runtime_ms / 1000).toFixed(1)}s`);
  console.log(`Ollama post: ${health_post.ok ? 'UP' : 'DOWN'}`);
  console.log('\n--- Cross-book ranges (DISCRIMINATION) ---');
  for (const m of metrics) {
    const r = ranges[m]!;
    console.log(`  ${m.padEnd(18)} min=${r.min.toFixed(4)} max=${r.max.toFixed(4)} RANGE=${r.range.toFixed(4)} mean=${r.mean.toFixed(4)}`);
  }
  console.log(`\nVerdict: ${verdict_pass ? 'PASS' : 'FAIL'} (${candidates.join(', ') || 'no discriminant metric'})`);
  console.log(`Results: ${RESULTS_FILE}`);
}

main().catch((e) => {
  console.error('[V2.2-B Option E] FATAL:', e);
  process.exit(1);
});
