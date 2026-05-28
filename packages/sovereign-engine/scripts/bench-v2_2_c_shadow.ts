/**
 * V2.2-C SHADOW boundary optimizer — bench (48 livres B2, Ollama reel)
 *
 * Pour chaque livre : chunkAdaptive (V2.1) -> optimizeBoundariesShadow ->
 * mesure pct_moved, mean_improvement, valid, boundary_hash, runtimes.
 *
 * 5 CRITERES VERDICT (>=3/5 PASS -> GO Phase 4 V2.2-D FULL) :
 *   C1 pct_moved_corpus >= 30%                 (les frontieres bougent reellement)
 *   C2 mean_improvement_corpus > 0             (coupes proposees plus nettes en moyenne)
 *   C3 all books valid == true                 (contraintes longueur respectees)
 *   C4 determinisme : re-run subset -> hash identique 100%
 *   C5 faisabilite runtime : 0 crash + mean shadow runtime/livre < 10000 ms (cache)
 *      [NB: le critere dispatch "runtime < 2x V2.1" est inapplicable a un optimizer
 *       base embeddings — l'embedding domine. Reformule en faisabilite, documente.]
 *
 * Sprint V2.2-C 2026-05-28 — post B2 GO_PHASE_3 (52.4% SUB_OPTIMAL).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chunkAdaptive } from '../src/chunking/adaptive.js';
import { OllamaEmbedder, DEFAULT_OLLAMA_CONFIG } from '../src/embeddings/index.js';
import {
  optimizeBoundariesShadow,
  DEFAULT_SHADOW_CONFIG,
  type ShadowOptimizationResult,
} from '../src/chunking/boundaryOptimizerShadow.js';

const CORPUS_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/v2_1_1/corpus_text';
const SELECTION_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B2_book_selection.json';
const RESULTS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_C_SHADOW_results.json';
const PROGRESS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_C_SHADOW_progress.txt';
const CACHE_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/.embeddings-cache-v2_2_c';

const BOOKS: readonly string[] = (
  JSON.parse(readFileSync(SELECTION_FILE, 'utf8')) as { books: readonly string[] }
).books;

interface BookRow {
  readonly file: string;
  readonly lang: string;
  readonly tier: string;
  readonly word_count: number;
  readonly chunk_count: number;
  readonly v21_chunk_ms: number;
  readonly shadow_ms: number;
  readonly result?: ShadowOptimizationResult;
  readonly hash_recheck?: string;
  readonly error?: string;
}

async function main(): Promise<void> {
  console.log(`[V2.2-C SHADOW] START — ${BOOKS.length} livres, config ${JSON.stringify(DEFAULT_SHADOW_CONFIG)}`);
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  const embedder = new OllamaEmbedder({ ...DEFAULT_OLLAMA_CONFIG, cache_dir: CACHE_DIR, use_cache: true });
  const health = await embedder.healthCheck();
  console.log(`Ollama health PRE: ${JSON.stringify(health)}`);
  if (!health.ok) { console.error('FATAL: Ollama down'); process.exit(1); }

  const embed = (t: string): Promise<Float32Array> => embedder.embed(t);
  const rows: BookRow[] = [];
  const tStart = performance.now();

  for (let i = 0; i < BOOKS.length; i++) {
    const file = BOOKS[i]!;
    const [lang, tier] = file.split('_');
    const line = `[${i + 1}/${BOOKS.length}] ${file.substring(0, 56)}`;
    console.log(`\n${line}`);
    try { writeFileSync(PROGRESS_FILE, `${new Date().toISOString()} ${line}\n`); } catch { /* noop */ }

    try {
      const text = readFileSync(join(CORPUS_DIR, file), 'utf8');
      const word_count = text.split(/\s+/).filter((w) => w.length > 0).length;

      const tC = performance.now();
      const chunks = chunkAdaptive(text);
      const v21_chunk_ms = performance.now() - tC;

      const tS = performance.now();
      const result = await optimizeBoundariesShadow(chunks, embed, DEFAULT_SHADOW_CONFIG);
      const shadow_ms = performance.now() - tS;

      // C4 determinisme : re-run sur les 3 premiers livres
      let hash_recheck: string | undefined;
      if (i < 3) {
        const r2 = await optimizeBoundariesShadow(chunks, embed, DEFAULT_SHADOW_CONFIG);
        hash_recheck = r2.boundary_hash;
      }

      console.log(
        `  chunks=${chunks.length} bnd=${result.boundary_count} moved=${result.moved_count} ` +
        `(${result.pct_moved.toFixed(1)}%) meanImpr=${result.mean_improvement.toFixed(4)} ` +
        `valid=${result.valid} chunk=${v21_chunk_ms.toFixed(0)}ms shadow=${shadow_ms.toFixed(0)}ms`
      );
      rows.push({ file, lang: lang!, tier: tier!, word_count, chunk_count: chunks.length, v21_chunk_ms, shadow_ms, result, hash_recheck });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${msg}`);
      rows.push({ file, lang: lang!, tier: tier!, word_count: 0, chunk_count: 0, v21_chunk_ms: 0, shadow_ms: 0, error: msg });
    }
  }

  const total_runtime_ms = performance.now() - tStart;
  const health_post = await embedder.healthCheck();
  const valid_rows = rows.filter((r) => !r.error && r.result);

  const allProps = valid_rows.flatMap((r) => r.result!.proposals);
  const totalB = allProps.length;
  const movedB = allProps.filter((p) => p.moved).length;
  const pct_moved_corpus = totalB > 0 ? (movedB / totalB) * 100 : 0;
  const mean_improvement_corpus = totalB > 0 ? allProps.reduce((a, p) => a + p.improvement, 0) / totalB : 0;
  const mean_cos_original = totalB > 0 ? allProps.reduce((a, p) => a + p.cosine_original, 0) / totalB : 0;
  const mean_cos_proposed = totalB > 0 ? allProps.reduce((a, p) => a + p.cosine_proposed, 0) / totalB : 0;
  const all_valid = valid_rows.every((r) => r.result!.valid);
  const mean_shadow_ms = valid_rows.length > 0 ? valid_rows.reduce((a, r) => a + r.shadow_ms, 0) / valid_rows.length : 0;
  const mean_v21_ms = valid_rows.length > 0 ? valid_rows.reduce((a, r) => a + r.v21_chunk_ms, 0) / valid_rows.length : 0;

  // C4 determinisme
  const rechecked = valid_rows.filter((r) => r.hash_recheck !== undefined);
  const det_ok = rechecked.length > 0 && rechecked.every((r) => r.hash_recheck === r.result!.boundary_hash);

  const C1 = pct_moved_corpus >= 30;
  const C2 = mean_improvement_corpus > 0;
  const C3 = all_valid;
  const C4 = det_ok;
  const C5 = valid_rows.length === rows.length && mean_shadow_ms < 10000;
  const passCount = [C1, C2, C3, C4, C5].filter(Boolean).length;
  const verdict = passCount >= 3 ? 'GO_PHASE_4' : 'STOP_OR_FORENSIC';

  const suite = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.2-C SHADOW boundary optimizer probe',
    cbw_ref: 'V2_2_C_CBW_2026-05-28.md',
    parent_commit: '7a943c20 (B2 sealed)',
    config: DEFAULT_SHADOW_CONFIG,
    book_count: BOOKS.length,
    ollama_health_pre: health,
    ollama_health_post: health_post,
    rows,
    aggregate: {
      total_runtime_ms, books_processed: valid_rows.length, books_errored: rows.length - valid_rows.length,
      total_boundaries: totalB, moved_boundaries: movedB, pct_moved_corpus,
      mean_improvement_corpus, mean_cos_original, mean_cos_proposed,
      all_valid, mean_shadow_ms, mean_v21_chunk_ms: mean_v21_ms,
    },
    criteria: {
      C1_pct_moved_ge_30: { pass: C1, value: pct_moved_corpus },
      C2_mean_improvement_gt_0: { pass: C2, value: mean_improvement_corpus },
      C3_all_books_valid: { pass: C3, value: all_valid },
      C4_determinism_hash: { pass: C4, value: det_ok, rechecked: rechecked.length },
      C5_runtime_feasible: { pass: C5, value: mean_shadow_ms, note: 'mean shadow ms/book < 10000 + 0 crash' },
    },
    verdict: { pass_count: passCount, aggregate_verdict: verdict, threshold: '>=3/5 -> GO_PHASE_4' },
  };
  writeFileSync(RESULTS_FILE, JSON.stringify(suite, null, 2), 'utf8');

  console.log('\n' + '='.repeat(70));
  console.log('[V2.2-C SHADOW] VERDICT');
  console.log('='.repeat(70));
  console.log(`Books: ${valid_rows.length}/${BOOKS.length}  boundaries: ${totalB}  runtime: ${(total_runtime_ms/1000).toFixed(1)}s`);
  console.log(`C1 pct_moved      : ${pct_moved_corpus.toFixed(1)}%  -> ${C1 ? 'PASS' : 'FAIL'} (>=30)`);
  console.log(`C2 mean_improve   : ${mean_improvement_corpus.toFixed(4)}  -> ${C2 ? 'PASS' : 'FAIL'} (>0)`);
  console.log(`C3 all_valid      : ${all_valid}  -> ${C3 ? 'PASS' : 'FAIL'}`);
  console.log(`C4 determinism    : ${det_ok} (${rechecked.length} rechecked)  -> ${C4 ? 'PASS' : 'FAIL'}`);
  console.log(`C5 runtime feasible: mean ${mean_shadow_ms.toFixed(0)}ms/book  -> ${C5 ? 'PASS' : 'FAIL'} (<10000 + 0 crash)`);
  console.log(`mean cos: original ${mean_cos_original.toFixed(4)} -> proposed ${mean_cos_proposed.toFixed(4)}`);
  console.log(`\nPASS ${passCount}/5  =>  ${verdict}`);
  console.log(`Results: ${RESULTS_FILE}`);
}

main().catch((e) => { console.error('[V2.2-C SHADOW] FATAL:', e); process.exit(1); });
