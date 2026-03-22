/**
 * OMEGA Unified Bench — Phase P3
 * Date: 2026-03-22
 * Role: Unified benchmark combining V3 Legacy + GB V1 + R-8 Diagnostic + Endurance
 *
 * Modes:
 *   MOCK (default): no API key needed — uses fixed sample prose per scene
 *   API:  --api flag with ANTHROPIC_API_KEY → generates via runSovereignForge
 *
 * Usage:
 *   npx tsx scripts/run-benchmark-unified.ts
 *   npx tsx scripts/run-benchmark-unified.ts --api
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// V3 Legacy scoring
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorer } from '../src/scoring/multi-stage-scorer.js';
import { isSpacyBridgeAvailable, computeSpacyFeatures } from '../src/scoring/spacy-bridge.js';

// GB V1 scoring (Phase P0)
import { scoreText } from '../src/scoring/gb-scorer.js';

// R-8 diagnostic (Phase P1)
import { quickDiagnose } from '../src/scoring/r8-diagnostic.js';

// Endurance (Phase P2) — not applicable to short scenes but flagged
import { MIN_WORDS_FOR_VERIFICATION } from '../src/scoring/multi-scale-scorer.js';

// API mode imports
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { runSovereignForge } from '../src/engine.js';
import type { SovereignProvider } from '../src/types.js';
import {
  buildInputs as buildPhaseWInputs,
  SCENE_LABELS,
  SCENE_ARCHETYPES,
} from './run-benchmark-phase-w.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');
const OUT_DIR = path.resolve(__dirname, '../sessions');

const IS_API = process.argv.includes('--api');
const P_REL_NEUTRAL = 0.50;
const MODEL_ID = 'claude-sonnet-4-20250514';
const DRAFT_TEMPERATURE = 0.75;

// ── Reference V3 Legacy scores from bench 9ea5c2fc ──────────────────────────
const LEGACY_REFERENCE: Record<string, {
  composite: number;
  min_axis: { name: string; value: number };
  verdict: string;
  archetype: string;
  label: string;
}> = {
  'w4-confrontation': { composite: 88.41, min_axis: { name: 'SII', value: 81.73 }, verdict: 'REJECT', archetype: 'BRUTAL', label: 'Confrontation' },
  'w4-elegie':        { composite: 92.42, min_axis: { name: 'RCI', value: 88.05 }, verdict: 'REJECT', archetype: 'INTERIOR', label: 'Élégie' },
  'w4-panique':       { composite: 93.58, min_axis: { name: 'SII', value: 87.20 }, verdict: 'SEAL', archetype: 'BRUTAL', label: 'Panique' },
  'w4-contemplation': { composite: 91.94, min_axis: { name: 'SII', value: 87.87 }, verdict: 'REJECT', archetype: 'SENSORY', label: 'Contemplation' },
  'w4-dialogue-tendu':{ composite: 92.40, min_axis: { name: 'RCI', value: 85.64 }, verdict: 'REJECT', archetype: 'BALANCED', label: 'Dialogue tendu' },
  'w4-lyrique':       { composite: 91.35, min_axis: { name: 'IFI', value: 86.08 }, verdict: 'REJECT', archetype: 'CATHEDRAL', label: 'Description lyrique' },
  'w4-action':        { composite: 91.10, min_axis: { name: 'RCI', value: 87.10 }, verdict: 'REJECT', archetype: 'BRUTAL', label: 'Action pure' },
  'w4-monologue':     { composite: 87.71, min_axis: { name: 'RCI', value: 83.91 }, verdict: 'REJECT', archetype: 'INTERIOR', label: 'Monologue intérieur' },
};

// ── MOCK prose (imported from dual bench — same exact prose) ─────────────────
// Note: in a real deployment, this would be imported from a shared fixture.
// For now, we read from the dual bench file inline to avoid circular deps.
const MOCK_PROSE_PATH = path.resolve(__dirname, 'run-benchmark-dual.ts');
let MOCK_PROSE: Record<string, string> = {};

// Load MOCK prose by reading a subset from the corpus
function loadMockProse(): void {
  // Use the first 600 words of corpus texts as deterministic mock prose
  const corpusTxt = path.resolve(ROOT_DIR, 'omega-autopsie/corpus_r/txt');
  const mockSources: Record<string, string> = {
    'w4-confrontation': 'flaubert_bovary_14155.txt',
    'w4-elegie':        'flaubert_education_14285.txt',
    'w4-panique':       'flaubert_salammbo_10884.txt',
    'w4-contemplation': 'proust_swann_2650.txt',
    'w4-dialogue-tendu':'hugo_miserables_17489.txt',
    'w4-lyrique':       'notre_dame_de_paris_victor_hugo.txt',
    'w4-action':        'dostoievski_crime_36034.txt',
    'w4-monologue':     'la_peste_french_edition_albert_camus.txt',
  };

  for (const [sceneId, filename] of Object.entries(mockSources)) {
    const fullPath = path.join(corpusTxt, filename);
    if (fs.existsSync(fullPath)) {
      const text = fs.readFileSync(fullPath, 'utf-8');
      const words = text.split(/\s+/);
      // Extract 600 words from middle of text (position 0.5)
      const center = Math.floor(words.length * 0.5);
      const start = Math.max(0, center - 300);
      MOCK_PROSE[sceneId] = words.slice(start, start + 600).join(' ');
    }
  }
}

// ── Utils ────────────────────────────────────────────────────────────────────
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}
function getGitHead(): string {
  try { return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim(); }
  catch { return 'unknown'; }
}
function pad(s: string, n: number): string { return s.padEnd(n); }
function rpad(s: string, n: number): string { return s.padStart(n); }
function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface UnifiedSceneResult {
  scene_id: string;
  label: string;
  archetype: string;
  prose_hash: string;
  prose_word_count: number;
  legacy: {
    composite: number;
    min_axis: { name: string; value: number };
    verdict: string;
    source: 'reference' | 'live';
  };
  gb_v1: {
    score: number;
    tier: string;
    tk_master_count: number;
    tk_total: number;
    dominant_type: string;
    top_features: Array<{ name: string; value: number; importance: number }>;
  };
  endurance: {
    flag: 'VERIFIED' | 'VERIFIED_STRONG' | 'NON_VERIFIABLE';
    reason: string;
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const gitHead = getGitHead();
  const mode: 'MOCK' | 'API' = IS_API ? 'API' : 'MOCK';

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA UNIFIED BENCH — 3-LAYER TRIBUNAL');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  HEAD=${gitHead}  Mode=${mode}  Date=${new Date().toISOString().slice(0, 19)}`);
  console.log('');

  // Load MOCK prose from corpus texts
  if (mode === 'MOCK') {
    loadMockProse();
    console.log(`  MOCK prose loaded: ${Object.keys(MOCK_PROSE).length} scenes from corpus texts`);
  }

  // API mode setup
  let provider: SovereignProvider | null = null;
  if (mode === 'API') {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey?.trim()) {
      console.error('[FATAL] ANTHROPIC_API_KEY not set.');
      process.exit(1);
    }
    provider = createAnthropicProvider({
      apiKey, model: MODEL_ID, judgeStable: true,
      draftTemperature: DRAFT_TEMPERATURE, judgeTemperature: 0.0,
      judgeTopP: 1.0, judgeMaxTokens: 200,
    });
  }

  // R6 scorer (legacy, kept for reference)
  const hasMetro = fs.existsSync(METRO_PATH);
  const r6Scorer = hasMetro
    ? new MultiStageScorer(COEFF_PATH, METRO_PATH)
    : new MultiStageScorer(COEFF_PATH);

  const results: UnifiedSceneResult[] = [];
  const proseTexts: Array<{ id: string; label: string; text: string }> = [];

  const forgeInputs = mode === 'API' ? buildPhaseWInputs() : null;
  const sceneIds = mode === 'API'
    ? forgeInputs!.map(inp => inp.scene.scene_id)
    : Object.keys(LEGACY_REFERENCE);

  // ── Score each scene ──────────────────────────────────────────────────

  for (let i = 0; i < sceneIds.length; i++) {
    const sceneId = sceneIds[i];
    const ref = LEGACY_REFERENCE[sceneId];
    if (!ref) continue;

    let prose: string;
    let legacyComposite: number;
    let legacyMinAxis: { name: string; value: number };
    let legacyVerdict: string;
    let legacySource: 'reference' | 'live';

    if (mode === 'API') {
      const input = forgeInputs![i];
      const forgeResult = await runSovereignForge(input, provider!);
      prose = forgeResult.final_prose;
      if (forgeResult.macro_score) {
        const ma = forgeResult.macro_score.macro_axes;
        legacyComposite = forgeResult.macro_score.composite;
        const axes: Record<string, number> = {
          ECC: ma.ecc.score, RCI: ma.rci.score, SII: ma.sii.score,
          IFI: ma.ifi.score, AAI: ma.aai.score,
        };
        let minAx = { name: 'unknown', value: 100 };
        for (const [name, value] of Object.entries(axes)) {
          if (value < minAx.value) minAx = { name, value };
        }
        legacyMinAxis = minAx;
      } else {
        legacyComposite = forgeResult.s_score.composite;
        legacyMinAxis = { name: 'unknown', value: 0 };
      }
      legacyVerdict = forgeResult.verdict;
      legacySource = 'live';
    } else {
      prose = MOCK_PROSE[sceneId];
      if (!prose) { console.error(`  SKIP: no MOCK prose for ${sceneId}`); continue; }
      legacyComposite = ref.composite;
      legacyMinAxis = ref.min_axis;
      legacyVerdict = ref.verdict;
      legacySource = 'reference';
    }

    const wordCount = prose.split(/\s+/).length;
    const proseHash = sha256(prose);

    // ── GB V1 + R-8 Diagnostic ────────────────────────────────────────
    const gbResult = scoreText(prose);
    const diag = quickDiagnose(prose);

    // ── Endurance flag ────────────────────────────────────────────────
    let enduranceFlag: 'VERIFIED' | 'VERIFIED_STRONG' | 'NON_VERIFIABLE';
    let enduranceReason: string;
    if (wordCount >= 5000) {
      enduranceFlag = 'VERIFIED_STRONG';
      enduranceReason = `${wordCount} words >= 5000`;
    } else if (wordCount >= MIN_WORDS_FOR_VERIFICATION) {
      enduranceFlag = 'VERIFIED';
      enduranceReason = `${wordCount} words >= ${MIN_WORDS_FOR_VERIFICATION}`;
    } else {
      enduranceFlag = 'NON_VERIFIABLE';
      enduranceReason = `${wordCount} words < ${MIN_WORDS_FOR_VERIFICATION} — scene too short for endurance test`;
    }

    const result: UnifiedSceneResult = {
      scene_id: sceneId,
      label: ref.label,
      archetype: ref.archetype,
      prose_hash: proseHash,
      prose_word_count: wordCount,
      legacy: {
        composite: legacyComposite,
        min_axis: legacyMinAxis,
        verdict: legacyVerdict,
        source: legacySource,
      },
      gb_v1: {
        score: Math.round(gbResult.score * 1000) / 1000,
        tier: gbResult.tier,
        tk_master_count: diag.tk_master_count,
        tk_total: diag.tk_total,
        dominant_type: diag.dominant_type,
        top_features: gbResult.topFeatures.slice(0, 5),
      },
      endurance: {
        flag: enduranceFlag,
        reason: enduranceReason,
      },
    };

    results.push(result);
    proseTexts.push({ id: sceneId, label: ref.label, text: prose });
  }

  // ── Print unified table ───────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  TABLEAU DE BORD COMPLET');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(
    `  ${pad('Scene', 22)} ${rpad('V3', 7)} ${rpad('GB V1', 6)} ${pad('Tier', 5)} ` +
    `${rpad('Tk', 6)} ${pad('Type', 14)} ${pad('Flag', 10)}`,
  );
  console.log('  ' + '\u2500'.repeat(75));

  const gbScores: number[] = [];
  for (const r of results) {
    gbScores.push(r.gb_v1.score);
    console.log(
      `  ${pad(r.label, 22)} ${rpad(r.legacy.composite.toFixed(2), 7)} ` +
      `${rpad(r.gb_v1.score.toFixed(2), 6)} ${pad(r.gb_v1.tier, 5)} ` +
      `${rpad(`${r.gb_v1.tk_master_count}/${r.gb_v1.tk_total}`, 6)} ` +
      `${pad(r.gb_v1.dominant_type, 14)} ${pad(r.endurance.flag.replace('NON_VERIFIABLE', 'NON_VER'), 10)}`,
    );
  }

  console.log('  ' + '\u2500'.repeat(75));
  const v3Med = median(results.map(r => r.legacy.composite));
  const gbMed = median(gbScores);
  console.log(
    `  ${pad('MEDIANE', 22)} ${rpad(v3Med.toFixed(2), 7)} ${rpad(gbMed.toFixed(2), 6)}`,
  );
  console.log('');
  console.log('  REFERENCE: S >= 4.5 | A >= 3.5 | B >= 2.5 | C >= 1.5');
  console.log('═══════════════════════════════════════════════════════════════════════');

  // ── Save results ──────────────────────────────────────────────────────

  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const dirName = `UnifiedBench_${mode}_${dateStr}_${gitHead}`;
  const packDir = path.join(OUT_DIR, dirName);
  fs.mkdirSync(packDir, { recursive: true });

  const summary = {
    version: '2.0.0',
    mode,
    git_head: gitHead,
    created_at: new Date().toISOString(),
    scene_count: results.length,
    legacy_median: v3Med,
    gb_v1_median: gbMed,
    scenes: results,
  };

  fs.writeFileSync(path.join(packDir, 'unified_results.json'), JSON.stringify(summary, null, 2));

  // Prose files
  const proseDir = path.join(packDir, 'prose');
  fs.mkdirSync(proseDir, { recursive: true });
  for (const pt of proseTexts) {
    fs.writeFileSync(path.join(proseDir, `${pt.id}.txt`), pt.text, 'utf-8');
  }

  // SHA256SUMS
  const files = ['unified_results.json', ...proseTexts.map(pt => `prose/${pt.id}.txt`)];
  const sums = files.map(f => {
    const hash = createHash('sha256').update(fs.readFileSync(path.join(packDir, f))).digest('hex');
    return `${hash}  ${f}`;
  });
  fs.writeFileSync(path.join(packDir, 'SHA256SUMS.txt'), sums.join('\n') + '\n');

  console.log(`\n  Session saved: ${packDir}`);
  console.log(`  Prose: ${proseTexts.length} files`);
  console.log(`  Hashes: ${sums.length} files`);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
