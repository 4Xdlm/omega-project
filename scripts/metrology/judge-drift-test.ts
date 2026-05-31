/**
 * OMEGA METROLOGY — JUDGE DRIFT TEST (WS-B0, READ-ONLY)
 * Re-score ALTERNANCE_STUDY 2026-03-26 prose with the CURRENT computeRCI,
 * compare to historical recorded RCI -> judge drift (same prose, then vs now).
 * Pure-prose axes (rhythm, euphony) = clean drift ; signature/hook = packet-confounded
 * (re-score uses permissive probe packet, not the original ALTERNANCE packet).
 * 0 engine code touched, 0 Ollama (RCI is CALC). Run: npx tsx scripts/metrology/judge-drift-test.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { computeRCI } from '../../packages/sovereign-engine/src/oracle/macro-axes.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO = path.resolve(process.cwd());
const ALT = path.join(REPO, 'packages', 'sovereign-engine', 'sessions', 'ALTERNANCE_STUDY_2026-03-26T21-03-33');
const OUT_DIR = path.join(REPO, 'docs', 'audit', 'minaxis');
const TS = '2026-01-01T00:00:00.000Z';
const FLOOR = 85;
function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string): number { return s.split(/\s+/).filter((w) => w.length > 0).length; }
function sentenceCV(prose: string): number {
  const sents = prose.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  const wc = sents.map((s) => s.split(/\s+/).filter((w) => w.length > 0).length);
  const n = wc.length; if (n < 2) return 0;
  const mean = wc.reduce((a, b) => a + b, 0) / n;
  const v = wc.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return mean > 0 ? Math.sqrt(v) / mean : 0;
}

function buildPermissivePacket() {
  const pack = JSON.parse(fs.readFileSync(path.join(REPO, 'golden/intents/intent_pack_gardien.json'), 'utf8'));
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, createDefaultConfig(), TS);
  const scene0: Scene = plan.arcs[0]!.scenes[0]!;
  const style_profile: StyleProfile = {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words: [], forbidden_words: [], abstraction_max_ratio: 0.95, concrete_min_ratio: 0.0 },
    rhythm: { avg_sentence_length_target: 20, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 0, min_compressions_per_scene: 0 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.0, 1.0] as readonly [number, number] },
    imagery: { recurrent_motifs: [], density_target_per_100_words: 0, banned_metaphors: [] },
    voice: DEFAULT_VOICE_GENOME,
  };
  const kill_lists: KillLists = { banned_words: [], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] };
  const canon: CanonEntry[] = [];
  const continuity: ForgeContinuity = { previous_scene_summary: '', character_states: [], open_threads: [] };
  return assembleForgePacket({ plan, scene: scene0, style_profile, kill_lists, canon, continuity, run_id: 'judge_drift', language: 'fr' });
}
const MAP: ReadonlyArray<readonly [string, string, string]> = [
  ['prose_A_baseline.txt', 'A_baseline', 'menace'],
  ['prose_B_exemplar.txt', 'B_exemplar', 'menace'],
  ['prose_C_sysprompt.txt', 'C_sysprompt', 'menace'],
  ['prose_D_antimono_menace.txt', 'D_antimono', 'menace'],
  ['prose_E_skeleton_menace.txt', 'E_skeleton', 'menace'],
  ['prose_F_mask_menace.txt', 'F_mask', 'menace'],
  ['prose_C_revelation.txt', 'C_sysprompt', 'revelation'],
];

async function main() {
  log('=== JUDGE DRIFT TEST — computeRCI now vs ALTERNANCE 2026-03-26 ===');
  const packet = buildPermissivePacket();
  const hist = JSON.parse(fs.readFileSync(path.join(ALT, 'phase2_results.json'), 'utf8')) as any[];
  const findHist = (name: string, scene: string) => hist.find((h) => h.name === name && h.scene === scene);
  const rows: any[] = [];
  for (const [file, name, scene] of MAP) {
    const fp = path.join(ALT, file);
    if (!fs.existsSync(fp)) { log('  MISSING ' + file); continue; }
    const prose = fs.readFileSync(fp, 'utf8');
    const h = findHist(name, scene);
    if (!h) { log('  NO HIST ' + name + '/' + scene); continue; }
    const rci = await computeRCI(packet, prose);
    const subs = rci.sub_scores as any[];
    const find = (s: string) => subs.find((x) => String(x.name).includes(s)) ?? { score: 0, weight: 0 };
    const now_cv = sentenceCV(prose);
    rows.push({
      name, scene, words: words(prose),
      hist_RCI: +h.RCI.toFixed(2), now_RCI: +rci.score.toFixed(2), dRCI: +(rci.score - h.RCI).toFixed(2),
      hist_cv: h.cv, now_cv: +now_cv.toFixed(3),
      rhythm: +find('rhythm').score.toFixed(1), euphony: +find('euphony').score.toFixed(1),
      signature: +find('signature').score.toFixed(1), hook: +find('hook').score.toFixed(1),
      hist_pass85: h.RCI >= FLOOR ? 1 : 0, now_pass85: rci.score >= FLOOR ? 1 : 0,
      hist_composite: +h.composite.toFixed(2), hist_ECC: +h.ECC.toFixed(2),
    });
    log(`  ${name}/${scene}: histRCI=${h.RCI.toFixed(1)} nowRCI=${rci.score.toFixed(1)} dRCI=${(rci.score - h.RCI).toFixed(1)} | cv ${h.cv}->${now_cv.toFixed(2)} | rhythm=${find('rhythm').score.toFixed(0)} euph=${find('euphony').score.toFixed(0)} sig=${find('signature').score.toFixed(0)} hook=${find('hook').score.toFixed(0)}`);
  }
  const ds = rows.map((r) => r.dRCI); const n = ds.length;
  const mean = n ? ds.reduce((a, b) => a + b, 0) / n : 0;
  const mae = n ? ds.reduce((a, b) => a + Math.abs(b), 0) / n : 0;
  const rmse = n ? Math.sqrt(ds.reduce((a, b) => a + b * b, 0) / n) : 0;
  const summary = {
    tool: 'judge-drift-test.ts', dataset: 'ALTERNANCE_STUDY_2026-03-26', n,
    hist_pass85: rows.filter((r) => r.hist_pass85).length, now_pass85: rows.filter((r) => r.now_pass85).length,
    mean_dRCI: +mean.toFixed(2), MAE_RCI: +mae.toFixed(2), RMSE_RCI: +rmse.toFixed(2),
    note: 'now = permissive probe packet (signature/hook packet-confounded vs original ALTERNANCE packet); rhythm/euphony = pure prose. Aggregate RCI drift indicative, not pure-formula isolated.',
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cols = ['name', 'scene', 'words', 'hist_RCI', 'now_RCI', 'dRCI', 'hist_cv', 'now_cv', 'rhythm', 'euphony', 'signature', 'hook', 'hist_pass85', 'now_pass85', 'hist_composite', 'hist_ECC'];
  fs.writeFileSync(path.join(OUT_DIR, 'JUDGE_DRIFT_TEST.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'judge_drift_summary.json'), JSON.stringify({ summary, rows }, null, 2), 'utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { log('ERR ' + (e && e.stack ? e.stack : e)); process.exit(1); });
