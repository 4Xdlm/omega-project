/**
 * V2.3-A P4 — Bench A/B réécriture RÉEL (qwen3:32b + Oracle judgeAestheticV3) — OPT-IN STRICT.
 *
 * Ne tourne QUE si OMEGA_V2_3_CHUNK_COUPLING=1 (sinon message + exit 0, zéro GPU).
 * control_naive (aligné phrases) vs treatment_scalpel, K identique. Chaque segment :
 *   P0 -> P1 -> brief -> P3 buildRewritePrompt -> provider.generateDraft(.,'rewrite_v2_3',.) -> judgeAestheticV3.
 * Sauvegarde JSONL incrémentale REPRENABLE (resume-on-crash EPIPE). Kill-switch FIGÉ (abBench).
 * Verdict : GO_B_CANDIDATE / SHADOW / REJECT (recommandation, décision Architecte — jamais auto-promotion).
 *
 * Coût ~1.5-3h (dominé par le scoring Oracle, ~10-15 appels qwen/prose). Run détaché conseillé.
 * Sprint V2.3-A P4 2026-05-29.
 */
import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { runABBench, type BenchRow, type ScoreResult, type RewriteGenerateFn, type ScoreFn } from '../src/chunking/abBench.js';
import { REWRITE_GENERATION_MODE } from '../src/chunking/rewritePrompt.js';
import { createOllamaProvider } from '../src/runtime/ollama-provider.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';

const FLAG = process.env.OMEGA_V2_3_CHUNK_COUPLING;
const OUT_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs';
const JSONL = join(OUT_DIR, 'V2_3_P4_AB_rows.jsonl');
const RESULTS_FILE = join(OUT_DIR, 'V2_3_P4_AB_verdict.json');
const CORPUS_DIR = join(OUT_DIR, 'v2_1_1/corpus_text');
const SELECTION_FILE = join(OUT_DIR, 'V2_2_B_B2_book_selection.json');

// FIGÉS avant run (anti post-hoc) :
const SEEDS = ['v23seedA', 'v23seedB'];
const N_SOURCES = Number(process.env.OMEGA_V2_3_N_SOURCES ?? 2);
const WORDS_PER_SOURCE = 2000;

function loadSources(): { texts: string[]; origins: string[] } {
  const texts: string[] = [];
  const origins: string[] = [];
  if (existsSync(SELECTION_FILE)) {
    const books = (JSON.parse(readFileSync(SELECTION_FILE, 'utf8')) as { books: string[] }).books;
    for (const file of books.slice(0, N_SOURCES)) {
      const p = join(CORPUS_DIR, file);
      if (existsSync(p)) {
        const words = readFileSync(p, 'utf8').replace(/\s+/g, ' ').trim().split(' ').slice(0, WORDS_PER_SOURCE).join(' ');
        texts.push(words);
        origins.push(file);
      }
    }
  }
  return { texts, origins };
}

function loadDone(): BenchRow[] {
  if (!existsSync(JSONL)) return [];
  return readFileSync(JSONL, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as BenchRow);
}

async function main(): Promise<void> {
  if (FLAG !== '1') {
    console.log('[V2.3-A P4 BENCH] OPT-IN OFF. Pour lancer (run ~1.5-3h qwen) :');
    console.log('  set OMEGA_V2_3_CHUNK_COUPLING=1  puis relancer (détaché conseillé).');
    return;
  }
  console.log('[V2.3-A P4 BENCH] OPT-IN ON — A/B réécriture qwen3:32b + Oracle');
  const { texts, origins } = loadSources();
  if (texts.length === 0) { console.error('FATAL: aucune source corpus'); process.exit(1); }
  console.log(`Sources (${texts.length}) : ${origins.join(', ')} | seeds=${SEEDS.join(',')}`);

  const provider = createOllamaProvider({
    model: 'qwen3:32b', baseUrl: 'http://localhost:11434',
    draftTemperature: 0.6, judgeTemperature: 0.3, draftMaxTokens: 1200,
    repeatPenalty: 1.4, frequencyPenalty: 0.6, repeatLastN: 256,
  });

  const generate: RewriteGenerateFn = (prompt, seed) => provider.generateDraft(prompt, REWRITE_GENERATION_MODE, seed);
  const score: ScoreFn = async (packet, prose): Promise<ScoreResult> => {
    const m = await judgeAestheticV3(packet, prose, provider, null);
    return { composite: m.composite, min_axis: m.min_axis, macro_axes: { ecc_score: m.ecc_score, emotion_weight_pct: m.emotion_weight_pct } };
  };

  // Persistance JSONL reprenable
  const persistence = {
    loadDone: (): readonly BenchRow[] => loadDone(),
    append: (r: BenchRow): void => { appendFileSync(JSONL, JSON.stringify(r) + '\n', 'utf8'); },
  };

  const resumedCount = loadDone().length;
  if (resumedCount > 0) console.log(`Reprise : ${resumedCount} rows déjà présentes (skip).`);

  const t0 = Date.now();
  const result = await runABBench(texts, generate, score, { seeds: SEEDS, persistence });
  const elapsed_min = Math.round(((Date.now() - t0) / 60000) * 100) / 100;

  const suite = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.3-A P4 A/B rewrite (qwen + Oracle)',
    sources: origins,
    seeds: SEEDS,
    elapsed_min,
    n_rows: result.rows.length,
    verdict: result.verdict,
  };
  writeFileSync(RESULTS_FILE, JSON.stringify(suite, null, 2), 'utf8');

  console.log('\n' + '='.repeat(64));
  console.log(`[V2.3-A P4 BENCH] VERDICT = ${result.verdict.verdict}`);
  console.log(`  n_pairs=${result.verdict.n_pairs} Δcomposite=${result.verdict.delta_composite.toFixed(2)} ` +
    `CI95=[${result.verdict.delta_ci95_low.toFixed(2)}, ${result.verdict.delta_ci95_high.toFixed(2)}]`);
  console.log(`  control=${result.verdict.mean_control.toFixed(2)} treatment=${result.verdict.mean_treatment.toFixed(2)} ` +
    `min_axis ${result.verdict.mean_min_axis_control.toFixed(1)}->${result.verdict.mean_min_axis_treatment.toFixed(1)}`);
  console.log(`  reason: ${result.verdict.reason}`);
  console.log(`  elapsed=${elapsed_min}min rows=${result.rows.length}`);
  console.log(`Results: ${RESULTS_FILE}`);
}

main().catch((e) => { console.error('[V2.3-A P4 BENCH] FATAL:', e); process.exit(1); });
