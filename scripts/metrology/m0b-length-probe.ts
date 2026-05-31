/**
 * OMEGA METROLOGY — M0.b LENGTH-SENSITIVITY PROBE (CF8)
 * ============================================================================
 * Measures S-Oracle V2 (judgeAestheticV3) sensitivity to prose LENGTH on
 * IDENTICAL content: judge the saved sovereign prose at full length, then
 * truncated (at paragraph boundaries) to the scribe word-count and to 50%.
 * Isolates "writes more" vs "writes better". READ-ONLY, Ollama only.
 *
 * Run AFTER m0b-bench.ts N=5 (single GPU — never concurrent):
 *   npx tsx scripts/metrology/m0b-length-probe.ts
 * Limit: truncation makes the scene INCOMPLETE (unresolved ending) — a residual
 * confound that itself can lower some axes independent of raw length. Reported.
 */
process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';

import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { judgeAestheticV3 } from '../../packages/sovereign-engine/src/oracle/aesthetic-oracle.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';
import type { MacroSScore } from '../../packages/sovereign-engine/src/oracle/macro-score-types.js';

const REPO_ROOT = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'metrology', 'm0b-runs');
const MODEL = process.env.M0B_MODEL ?? 'qwen3:32b';
const OLLAMA_URL = process.env.M0B_OLLAMA_URL ?? 'http://localhost:11434';
const TS = '2026-01-01T00:00:00.000Z';
const GOLDEN = process.env.M0B_GOLDEN ?? 'golden/intents/intent_pack_gardien.json';

function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string): number { return s.split(/\s+/).filter((w) => w.length > 0).length; }

/** truncate prose at a paragraph boundary so total words ≤ target (keeps whole paragraphs). */
function truncateToWords(prose: string, target: number): string {
  const paras = prose.split(/\n\s*\n/);
  const out: string[] = []; let acc = 0;
  for (const p of paras) {
    const w = words(p);
    if (acc + w > target && out.length > 0) break;
    out.push(p); acc += w;
  }
  return out.join('\n\n');
}

const judgeProvider = createOllamaProvider({
  baseUrl: OLLAMA_URL, model: MODEL, draftTemperature: 0.0, judgeTemperature: 0.0,
  draftMaxTokens: 2048, judgeMaxTokens: 2000,
});

function buildPacket() {
  const pack = JSON.parse(readFileSync(path.join(REPO_ROOT, GOLDEN), 'utf8'));
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, createDefaultConfig(), TS);
  const scene0: Scene = plan.arcs[0]!.scenes[0]!;
  const style_profile: StyleProfile = {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words: ['phare', 'mer', 'lumiere', 'profondeur', 'silence'], forbidden_words: pack.constraints.banned_words ?? [], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
    rhythm: { avg_sentence_length_target: pack.genome?.target_avg_sentence_length ?? 15, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.9] as readonly [number, number] },
    imagery: { recurrent_motifs: ['phare', 'ocean', 'lumiere'], density_target_per_100_words: 3, banned_metaphors: pack.constraints.forbidden_cliches ?? [] },
    voice: DEFAULT_VOICE_GENOME,
  };
  const kill_lists: KillLists = { banned_words: pack.constraints.banned_words ?? [], banned_cliches: pack.constraints.forbidden_cliches ?? [], banned_ai_patterns: [], banned_filter_words: [] };
  const canon: CanonEntry[] = (pack.canon?.entries ?? []).map((e: any) => ({ id: e.id, statement: e.statement }));
  const continuity: ForgeContinuity = { previous_scene_summary: '', character_states: [], open_threads: [] };
  return assembleForgePacket({ plan, scene: scene0, style_profile, kill_lists, canon, continuity, run_id: 'm0b_lenprobe', language: 'fr' });
}

function row(ms: MacroSScore, w: number) {
  return { words: w, composite: ms.composite, min_axis: ms.min_axis, ECC: ms.macro_axes.ecc.score, RCI: ms.macro_axes.rci.score, SII: ms.macro_axes.sii.score, IFI: ms.macro_axes.ifi.score, AAI: ms.macro_axes.aai.score };
}

async function main() {
  const sovPath = path.join(OUT_DIR, 'sample_sovereign.txt');
  const scPath = path.join(OUT_DIR, 'sample_scribe.txt');
  if (!existsSync(sovPath)) { log('FATAL: sample_sovereign.txt missing — run m0b-bench.ts first.'); process.exit(1); }
  const sovProse = readFileSync(sovPath, 'utf8');
  const scribeWords = existsSync(scPath) ? words(readFileSync(scPath, 'utf8')) : 846;
  const packet = buildPacket();

  const fullW = words(sovProse);
  const targets = [fullW, scribeWords, Math.round(fullW * 0.5)].filter((v, i, a) => a.indexOf(v) === i && v > 0).sort((a, b) => b - a);
  log(`[length-probe] sovereign full=${fullW}w, scribe=${scribeWords}w. Judging at: ${targets.join(', ')}w`);

  const results: any[] = [];
  for (const t of targets) {
    const text = t >= fullW ? sovProse : truncateToWords(sovProse, t);
    const aw = words(text);
    const ms = await judgeAestheticV3(packet, text, judgeProvider, null);
    const r = { target_words: t, actual_words: aw, ...row(ms, aw) };
    results.push(r);
    log(`  @${aw}w → composite=${ms.composite.toFixed(1)} min=${ms.min_axis.toFixed(1)} IFI=${ms.macro_axes.ifi.score.toFixed(1)} SII=${ms.macro_axes.sii.score.toFixed(1)}`);
  }

  const full = results[0];
  const atScribeLen = results.find((r) => r.target_words === scribeWords);
  const lengthSensitivity = atScribeLen ? (full.composite - atScribeLen.composite) : null;
  const out = {
    note: 'CF8 length-sensitivity: same sovereign content judged at decreasing length (paragraph-boundary truncation). Truncation => incomplete scene (residual confound).',
    model: MODEL, sovereign_full_words: fullW, scribe_words: scribeWords,
    results,
    composite_drop_full_to_scribeLen: lengthSensitivity,
    interpretation: 'If composite falls sharply when sovereign prose is cut to scribe length, S-Oracle V2 rewards length → raw Δ is partly a length artifact.',
  };
  writeFileSync(path.join(OUT_DIR, 'm0b_length_probe.json'), JSON.stringify(out, null, 2), 'utf8');
  log(`[length-probe] composite full→scribeLen drop = ${lengthSensitivity?.toFixed(2) ?? 'n/a'}. Wrote m0b_length_probe.json`);
}

main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
