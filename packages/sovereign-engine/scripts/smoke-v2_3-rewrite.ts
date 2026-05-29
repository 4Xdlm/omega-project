/**
 * V2.3-A P3 — SMOKE réécriture 1 scène (qwen3:32b) — OPT-IN STRICT.
 *
 * Ne fire Qwen QUE si OMEGA_V2_3_CHUNK_COUPLING=1 (sinon : message + exit 0, zéro GPU).
 * Chaîne : 1 segment source -> P0 deriveEmotionContract -> P1 buildForgePacket ->
 *          forgePacketToSceneBrief -> P3 buildRewritePrompt -> provider.generateDraft(prompt,'rewrite_v2_3',seed).
 * N'appelle PAS generateChunkedDraft (chemin ex-nihilo intact).
 *
 * Critères PASS (cf design P3 §3) : prompt contient la source ; sortie non vide ; >=1 token source
 * partagé ; pas de crash/timeout ; runtime loggé.
 *
 * Sprint V2.3-A P3 smoke 2026-05-29.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { deriveEmotionContractFromSegment } from '../src/chunking/deriveEmotionContract.js';
import { buildForgePacketFromSegment } from '../src/chunking/deriveForgePacket.js';
import { forgePacketToSceneBrief } from '../src/generation/forge-to-brief.js';
import { buildRewritePrompt, REWRITE_GENERATION_MODE } from '../src/chunking/rewritePrompt.js';
import { scalpelSegments } from '../src/chunking/abRouting.js';
import { createOllamaProvider } from '../src/runtime/ollama-provider.js';

const FLAG = process.env.OMEGA_V2_3_CHUNK_COUPLING;
const RESULTS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_3_P3_SMOKE_result.json';
const CORPUS_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/v2_1_1/corpus_text';
const SELECTION_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B2_book_selection.json';

const FALLBACK_SOURCE =
  "L'aube se levait sur les toits. Marie poussa la porte de l'atelier ; le bois grinça. " +
  "Sur la table, la toile inachevée attendait. Elle prit un pinceau, hésita, la main tremblante. " +
  "Dehors un merle chanta puis se tut. Le silence revint, dense. Elle approcha la couleur, le cœur battant.";

function loadSourceSegment(): { seg: string; origin: string } {
  try {
    if (existsSync(SELECTION_FILE)) {
      const books = (JSON.parse(readFileSync(SELECTION_FILE, 'utf8')) as { books: string[] }).books;
      const file = books[0];
      if (file && existsSync(join(CORPUS_DIR, file))) {
        const raw = readFileSync(join(CORPUS_DIR, file), 'utf8');
        const words = raw.replace(/\s+/g, ' ').trim().split(' ').slice(0, 3000).join(' ');
        const chunks = scalpelSegments(words); // 1er chunk Scalpel = 1 scène source
        if (chunks[0]) return { seg: chunks[0], origin: `corpus:${file} (1er chunk scalpel)` };
      }
    }
  } catch { /* fallback */ }
  return { seg: FALLBACK_SOURCE, origin: 'fallback_inline' };
}

function sharedTokens(a: string, b: string): number {
  const norm = (s: string) =>
    new Set(
      s.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 5)
    );
  const sa = norm(a);
  const sb = norm(b);
  let n = 0;
  for (const w of sa) if (sb.has(w)) n++;
  return n;
}

async function main(): Promise<void> {
  if (FLAG !== '1') {
    console.log('[V2.3-A P3 SMOKE] OPT-IN OFF. Pour lancer le tir qwen3:32b :');
    console.log('  set OMEGA_V2_3_CHUNK_COUPLING=1  (puis relancer ce script)');
    console.log('Aucun appel GPU effectué. Exit 0.');
    return;
  }

  console.log('[V2.3-A P3 SMOKE] OPT-IN ON — 1 scène réécriture qwen3:32b');
  const { seg, origin } = loadSourceSegment();
  const candidate = deriveEmotionContractFromSegment(seg);
  const fp = buildForgePacketFromSegment(seg, candidate);
  const brief = forgePacketToSceneBrief(fp.packet);
  const r = buildRewritePrompt({
    scene_brief: brief,
    source_segment: seg,
    source_segment_hash: candidate.segment_hash,
    emotion_contract: candidate.contract,
    rewrite_mode: 'rewrite',
  });

  const provider = createOllamaProvider({
    model: 'qwen3:32b',
    baseUrl: 'http://localhost:11434',
    draftTemperature: 0.6,
    judgeTemperature: 0.3,
    draftMaxTokens: 1200,
    repeatPenalty: 1.4,
    frequencyPenalty: 0.6,
    repeatLastN: 256,
  });

  console.log(`Source : ${origin} (${seg.split(' ').length} mots). Prompt: ${r.prompt.length} chars, hash ${r.prompt_hash.slice(0, 12)}.`);
  console.log('Appel qwen3:32b (rewrite_v2_3)...');
  const t0 = performance.now();
  let output = '';
  let error: string | undefined;
  try {
    output = await provider.generateDraft(r.prompt, REWRITE_GENERATION_MODE, `smoke_${candidate.segment_hash.slice(0, 8)}`);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const runtime_ms = performance.now() - t0;

  const prompt_contains_source = r.prompt.includes(seg);
  const output_non_empty = output.trim().length > 0;
  const shared = output_non_empty ? sharedTokens(seg, output) : 0;
  const pass =
    !error && prompt_contains_source && output_non_empty && shared >= 1;

  const result = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.3-A P3 smoke rewrite (qwen3:32b, opt-in)',
    source_origin: origin,
    source_words: seg.split(' ').length,
    prompt_chars: r.prompt.length,
    prompt_hash: r.prompt_hash,
    prompt_contains_source,
    output_words: output_non_empty ? output.split(/\s+/).length : 0,
    output_non_empty,
    shared_source_tokens: shared,
    runtime_ms: Math.round(runtime_ms),
    runtime_min: Math.round((runtime_ms / 60000) * 100) / 100,
    error: error ?? null,
    verdict: pass ? 'PASS' : 'FAIL',
    output_preview: output.slice(0, 600),
  };
  writeFileSync(RESULTS_FILE, JSON.stringify(result, null, 2), 'utf8');

  console.log('\n' + '='.repeat(60));
  console.log(`[V2.3-A P3 SMOKE] verdict=${result.verdict} runtime=${result.runtime_min}min`);
  console.log(`prompt_contains_source=${prompt_contains_source} output_non_empty=${output_non_empty} shared_tokens=${shared} output_words=${result.output_words}`);
  if (error) console.log(`ERROR: ${error}`);
  console.log(`\n--- APERÇU SORTIE (600c) ---\n${result.output_preview}`);
  console.log(`\nResults: ${RESULTS_FILE}`);
}

main().catch((e) => { console.error('[V2.3-A P3 SMOKE] FATAL:', e); process.exit(1); });
