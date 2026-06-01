/**
 * OMEGA METROLOGY — WS-B0b JUDGE DRIFT PACKET-ORIGINAL DECOMPOSITION (CALC, READ-ONLY)
 * ============================================================================
 * Le judge-drift WS-B0 (-17.14) utilisait un probe packet (signature=60, hook=85
 * confounded). Les packets ALTERNANCE originaux ne sont PAS sauvegardés (seul le RCI
 * agrégé historique l'est ; pas de sous-composantes). On NE peut donc PAS reconstruire
 * le packet original. À la place — DÉCOMPOSITION par sensibilité packet :
 *   pour chaque passage on recompose l'agrégat RCI en forçant signature=100 ET hook=100
 *   (plafond packet), en gardant rhythm/euphony/voice PROSE-PURS intacts.
 *   - RCI_now_probe   = computeRCI actuel (probe : sig=60, hook=85)
 *   - RCI_packetmax   = même prose, signature & hook forcés à 100 (meilleur packet possible)
 *   - delta_packet    = RCI_packetmax - RCI_now_probe   (part RÉCUPÉRABLE par le packet)
 *   - residual_drift  = hist_RCI - RCI_packetmax        (dérive NON récupérable = formule pure)
 * Verdict : si residual_drift ~ 0 -> le -17 est packet-confound (formule n'a PAS dérivé).
 *           si residual_drift << 0 -> dérive de formule réelle (rhythm/euphony).
 * Agrégation reproduite EXACTEMENT depuis macro-axes.ts:computeRCI :
 *   rci_raw = sum(score*weight)/sum(weight) ; score_final = clamp(rci_raw + penalty).
 *   penalty dépend du rythme seul (gini/syncopes) -> INVARIANTE à signature/hook.
 * 0 Ollama, 0 patch, 0 floor change. Run: node <tsx> scripts/metrology/wsb0b-judge-drift-packet-original.ts
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

const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const ALT = path.join(REPO, 'packages', 'sovereign-engine', 'sessions', 'ALTERNANCE_STUDY_2026-03-26T21-03-33');
const OUT_DIR = path.join(REPO, 'docs', 'audit', 'minaxis');
const TS = '2026-01-01T00:00:00.000Z';
const FLOOR = 85;
function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string): number { return s.split(/\s+/).filter((w) => w.length > 0).length; }

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
  return assembleForgePacket({ plan, scene: scene0, style_profile, kill_lists, canon, continuity, run_id: 'wsb0b', language: 'fr' });
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

function clamp(x: number) { return Math.max(0, Math.min(100, x)); }

async function main() {
  log('=== WS-B0b JUDGE DRIFT PACKET-ORIGINAL DECOMPOSITION ===');
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
    const get = (s: string) => subs.find((x) => String(x.name).includes(s)) ?? { score: 0, weight: 0 };
    const totW = subs.reduce((a, s) => a + s.weight, 0);
    const rci_raw = subs.reduce((a, s) => a + s.score * s.weight, 0) / totW;
    const penalty = rci.score - rci_raw; // invariant to signature/hook (rhythm-only)
    // packet-max: force signature & hook to 100, keep weights + others
    const rawMax = subs.reduce((a, s) => {
      const name2 = String(s.name);
      const sc = (name2.includes('signature') || name2.includes('hook')) ? 100 : s.score;
      return a + sc * s.weight;
    }, 0) / totW;
    const rci_packetmax = clamp(rawMax + penalty);
    const delta_packet = +(rci_packetmax - rci.score).toFixed(2);     // recoverable by packet
    const residual_drift = +(h.RCI - rci_packetmax).toFixed(2);        // pure-formula residual
    rows.push({
      name, scene, words: words(prose),
      hist_RCI: +h.RCI.toFixed(2), now_probe: +rci.score.toFixed(2), packet_max: +rci_packetmax.toFixed(2),
      dRCI_total: +(rci.score - h.RCI).toFixed(2), delta_packet, residual_drift,
      rhythm: +get('rhythm').score.toFixed(1), euphony: +get('euphony').score.toFixed(1),
      signature_probe: +get('signature').score.toFixed(1), hook_probe: +get('hook').score.toFixed(1),
      w_rhythm: +get('rhythm').weight.toFixed(3), w_sig: +get('signature').weight.toFixed(3), w_hook: +get('hook').weight.toFixed(3), w_euph: +get('euphony').weight.toFixed(3),
    });
    log(`  ${name}/${scene}: hist=${h.RCI.toFixed(1)} probe=${rci.score.toFixed(1)} pktMax=${rci_packetmax.toFixed(1)} | dPacket=${delta_packet} residual=${residual_drift} | rhythm=${get('rhythm').score.toFixed(0)} euph=${get('euphony').score.toFixed(0)} sigP=${get('signature').score.toFixed(0)} hookP=${get('hook').score.toFixed(0)}`);
  }
  const col = (k: string) => rows.map((r) => r[k]);
  const mean = (xs: number[]) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : 0;
  const summary = {
    tool: 'wsb0b-judge-drift-packet-original.ts', dataset: 'ALTERNANCE_STUDY_2026-03-26', n: rows.length,
    mean_dRCI_total: mean(col('dRCI_total')),
    mean_delta_packet: mean(col('delta_packet')),       // avg points recoverable by perfect signature/hook
    mean_residual_drift: mean(col('residual_drift')),   // avg pure-formula drift (rhythm/euphony/voice)
    packetmax_pass85: rows.filter((r) => r.packet_max >= FLOOR).length,
    interpretation: 'residual_drift ~0 => -17 est packet-confound (formule stable). residual_drift <<0 => derive formule reelle. packet_max = RCI si signature&hook=100 (autres axes prose-purs intacts).',
    note: 'Packets ALTERNANCE originaux NON sauvegardes (seul RCI agrege historique present, pas de sous-composantes). Decomposition par sensibilite packet (bracketing), pas reconstruction.',
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cols = ['name','scene','words','hist_RCI','now_probe','packet_max','dRCI_total','delta_packet','residual_drift','rhythm','euphony','signature_probe','hook_probe','w_rhythm','w_sig','w_hook','w_euph'];
  fs.writeFileSync(path.join(OUT_DIR, 'JUDGE_DRIFT_PACKET_ORIGINAL.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'judge_drift_packet_original_summary.json'), JSON.stringify({ summary, rows }, null, 2), 'utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { log('ERR ' + (e && e.stack ? e.stack : e)); process.exit(1); });
