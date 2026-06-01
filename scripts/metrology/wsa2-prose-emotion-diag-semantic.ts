/**
 * OMEGA METROLOGY — WS-A.2 PROSE EMOTION DIAGNOSTIC (SEMANTIC variant, Ollama)
 * ============================================================================
 * Re-run du diagnostic keyword (wsa2-prose-emotion-diag.ts) avec le CORTEX
 * SEMANTIQUE (analyzeEmotionSemantic + Ollama qwen3:32b), pour confirmer que le
 * verdict keyword (prose scene-0 = sadness/fear, cos FORGE<<HAND) tient sous le
 * meme analyseur que le bench prod (tension_14d quand SEMANTIC_CORTEX_ENABLED=true).
 * READ-ONLY. Ollama local (zero API payante). k=ECC_K (defaut 1).
 * Run (cwd=packages/sovereign-engine) : node <tsx> ../../scripts/metrology/wsa2-prose-emotion-diag-semantic.ts
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { GenesisPlan, Scene } from '../../packages/genesis-planner/src/types.js';

import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { SOVEREIGN_CONFIG } from '../../packages/sovereign-engine/src/config.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { analyzeEmotionSemantic } from '../../packages/sovereign-engine/src/semantic/semantic-analyzer.js';
import type {
  StyleProfile, KillLists, CanonEntry, ForgeContinuity,
} from '../../packages/sovereign-engine/src/types.js';

import { cosineSimilarity14D } from '@omega/omega-forge';

const DIMS = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'] as const;
const TS = '2026-01-01T00:00:00.000Z';
const REPO_ROOT = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const GOLDEN = process.env.M0B_GOLDEN ?? 'golden/intents/intent_pack_gardien.json';
const RUNS_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'metrology', 'm0b-runs');
const MODEL = process.env.ECC_MODEL ?? 'qwen3:32b';
const OLLAMA_URL = process.env.ECC_OLLAMA_URL ?? 'http://localhost:11434';
const K = parseInt(process.env.ECC_K ?? '1', 10);

function z(): Record<string, number> { return Object.fromEntries(DIMS.map((d) => [d, 0])); }
function qq(over: Record<string, number>) { return { ...z(), ...over }; }
function handQuartiles() {
  return [
    qq({ fear: 0.6, anticipation: 0.3, sadness: 0.1 }),
    qq({ fear: 0.7, surprise: 0.2, anticipation: 0.1 }),
    qq({ fear: 0.6, sadness: 0.3, awe: 0.1 }),
    qq({ sadness: 0.5, fear: 0.3, remorse: 0.2 }),
  ];
}
function dominant(v: Record<string, number>): string {
  let best = ''; let bv = -Infinity;
  for (const d of DIMS) { const x = v[d] ?? 0; if (x > bv) { bv = x; best = d; } }
  return `${best}(${bv.toFixed(2)})`;
}
function topN(v: Record<string, number>, n = 3): string {
  return [...DIMS].map((d) => [d, v[d] ?? 0] as const).sort((a, b) => b[1] - a[1]).slice(0, n)
    .filter(([, x]) => x > 0).map(([d, x]) => `${d}=${x.toFixed(2)}`).join(' ');
}
function avg(xs: number[]) { return xs.reduce((a, b) => a + b, 0) / xs.length; }

async function main() {
  const pack = JSON.parse(readFileSync(path.join(REPO_ROOT, GOLDEN), 'utf8'));
  const g = createDefaultConfig();
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, g, TS) as { plan: GenesisPlan };
  const scene0: Scene = plan.arcs[0]!.scenes[0]!;
  const style_profile: StyleProfile = {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words: ['phare','mer','lumiere','profondeur','silence'], forbidden_words: pack.constraints.banned_words ?? [], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
    rhythm: { avg_sentence_length_target: pack.genome?.target_avg_sentence_length ?? 15, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.9] as readonly [number, number] },
    imagery: { recurrent_motifs: ['phare','ocean','lumiere'], density_target_per_100_words: 3, banned_metaphors: pack.constraints.forbidden_cliches ?? [] },
    voice: DEFAULT_VOICE_GENOME,
  };
  const kill_lists: KillLists = { banned_words: pack.constraints.banned_words ?? [], banned_cliches: pack.constraints.forbidden_cliches ?? [], banned_ai_patterns: [], banned_filter_words: [] };
  const canon: CanonEntry[] = (pack.canon?.entries ?? []).map((e: any) => ({ id: e.id, statement: e.statement }));
  const continuity: ForgeContinuity = { previous_scene_summary: '', character_states: [], open_threads: [] };
  const forgePacket = assembleForgePacket({ plan, scene: scene0, style_profile, kill_lists, canon, continuity, run_id: 'wsa2_sem', language: 'fr' });
  const forgeQ = forgePacket.emotion_contract.curve_quartiles.map((c: any) => c.target_14d);
  const handQ = handQuartiles();

  const provider = createOllamaProvider({ baseUrl: OLLAMA_URL, model: MODEL, draftTemperature: 0.0, judgeTemperature: 0.0, draftMaxTokens: 2000, judgeMaxTokens: 2000 });

  const prose = readFileSync(path.join(RUNS_DIR, 'sample_sovereign.txt'), 'utf8');
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const total = paragraphs.length;
  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;
  const quartiles = ['Q1','Q2','Q3','Q4'] as const;

  console.log('=== WS-A.2 PROSE EMOTION DIAGNOSTIC (SEMANTIC cortex, Ollama) ===');
  console.log(`model=${MODEL} | k=${K} | paragraphs=${total} | scene0.emotion_target=${scene0.emotion_target} | SEMANTIC_CORTEX_ENABLED=${SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED}`);
  const cosF: number[] = []; const cosH: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [sF, eF] = bounds[quartiles[i]];
    const startIdx = Math.floor(sF * total);
    const endIdx = Math.ceil(eF * total);
    const qtext = paragraphs.slice(startIdx, endIdx).join('\n\n');
    // k runs, average the 14D vector (semantic judge variance)
    const acc: Record<string, number> = z();
    for (let kk = 0; kk < K; kk++) {
      const r = await analyzeEmotionSemantic(qtext, 'fr', provider) as unknown as Record<string, number>;
      for (const d of DIMS) acc[d] += (r[d] ?? 0) / K;
    }
    const cf = cosineSimilarity14D(forgeQ[i] as any, acc as any);
    const ch = cosineSimilarity14D(handQ[i] as any, acc as any);
    cosF.push(cf); cosH.push(ch);
    console.log(`${quartiles[i]} actual_top3: ${topN(acc)} | dom=${dominant(acc)} | cosFORGE=${cf.toFixed(3)} cosHAND=${ch.toFixed(3)}`);
  }
  console.log(`AVG cosine SEMANTIC: FORGE=${avg(cosF).toFixed(3)}  HAND=${avg(cosH).toFixed(3)}`);
  console.log('Compare keyword (commit 32dfdec8): FORGE=0.083 HAND=0.564. Si meme ordre FORGE<<HAND -> verdict WS-A.2 robuste sous semantic.');
}

main().catch((e) => { console.error('SEMANTIC_DIAG_ERROR:', e?.message ?? e); process.exit(1); });
