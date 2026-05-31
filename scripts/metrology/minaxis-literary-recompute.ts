/**
 * OMEGA METROLOGY — MINAXIS_E_LITERARY_RECOMPUTE (sensor validation, READ-ONLY)
 * ============================================================================
 * Recompute the ACTUAL computeRCI (100% CALC) on REAL public-domain literary
 * prose (omega-autopsie/gutenberg_cache, Flaubert/Hugo/Proust/Maupassant/Zola/
 * Dickens/Austen/Brontë/Melville…) to probe: is RCI floor 85 mathematically
 * reachable by great literature? 0 engine code touched, 0 Ollama (RCI is CALC).
 *
 * PROBE PACKET = permissive (empty signature_words/forbidden, high abstraction
 * target, no symbol-map hooks). RCI sub-axes split:
 *   - rhythm, euphony   = PURE PROSE (no contract dependence)
 *   - signature, hook   = STRUCTURAL/CONTRACT drag (hook→75 neutral; signature
 *                         hit-rate→0 with empty signature_words)  [flagged]
 *   - voice             = weight 0 (neutralized)
 * RCI_ceiling = recompute substituting signature=hook=100 → upper bound the prose
 * can reach if the structural axes weren't dragging. BIAS (directive): a low RCI on
 * Hugo is NOT a beauty verdict — it's a reachability probe of the floor.
 *
 * Run: npx tsx scripts/metrology/minaxis-literary-recompute.ts
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
const OUT_DIR = path.join(REPO, 'docs', 'audit', 'minaxis');
const CACHE = path.join(REPO, 'omega-autopsie', 'gutenberg_cache');
const TS = '2026-01-01T00:00:00.000Z';
const FLOOR = 85;

function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string): number { return s.split(/\s+/).filter((w) => w.length > 0).length; }

// ---- permissive PROBE packet (RCI depends only on style_genome + symbol_map) ----
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
  return assembleForgePacket({ plan, scene: scene0, style_profile, kill_lists, canon, continuity, run_id: 'minaxis_E', language: 'fr' });
}

// ---- passage extraction from a Gutenberg text ----
function cleanGutenberg(raw: string): string {
  let t = raw;
  const s = t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);
  if (s >= 0) t = t.slice(t.indexOf('\n', s) + 1);
  const e = t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);
  if (e >= 0) t = t.slice(0, e);
  return t;
}
function extractPassages(raw: string, n: number, targetWords: number): string[] {
  const text = cleanGutenberg(raw);
  const paras = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => words(p) >= 8);
  // skip front matter (~first 8% of paragraphs), use middle 80%
  const lo = Math.floor(paras.length * 0.10), hi = Math.floor(paras.length * 0.92);
  const body = paras.slice(lo, hi);
  if (body.length < 4) return [];
  const out: string[] = [];
  const stride = Math.max(1, Math.floor(body.length / (n + 1)));
  for (let k = 1; k <= n; k++) {
    const start = Math.min(body.length - 1, k * stride);
    let acc: string[] = []; let w = 0;
    for (let i = start; i < body.length && w < targetWords; i++) { acc.push(body[i]!); w += words(body[i]!); }
    const passage = acc.join('\n\n');
    if (words(passage) >= 500) out.push(passage);
  }
  return out;
}

async function main() {
  log('=== MINAXIS_E LITERARY RECOMPUTE — computeRCI on real prose ===');
  const packet = buildPermissivePacket();

  // curated set across FR + EN, varied registers
  const BOOKS = [
    ['flaubert_bovary_14155.txt', 'Flaubert', 'fr'], ['flaubert_education_14285.txt', 'Flaubert', 'fr'],
    ['flaubert_salammbo_10884.txt', 'Flaubert', 'fr'], ['hugo_miserables_17489.txt', 'Hugo', 'fr'],
    ['hugo_travailleurs_10907.txt', 'Hugo', 'fr'], ['maupassant_une_vie_6902.txt', 'Maupassant', 'fr'],
    ['maupassant_bel_ami_3088.txt', 'Maupassant', 'fr'], ['proust_swann_2650.txt', 'Proust', 'fr'],
    ['proust_jeunes_filles_17180.txt', 'Proust', 'fr'], ['zola_bonheur_11953.txt', 'Zola', 'fr'],
    ['zola_bete_10007.txt', 'Zola', 'fr'], ['stendhal_chartreuse_7524.txt', 'Stendhal', 'fr'],
    ['balzac_lys_1237.txt', 'Balzac', 'fr'], ['balzac_eugenie_1715.txt', 'Balzac', 'fr'],
    ['dickens_two_cities_98.txt', 'Dickens', 'en'], ['dickens_copperfield_766.txt', 'Dickens', 'en'],
    ['bronte_e_wuthering_768.txt', 'Bronte', 'en'], ['austen_pride_1342.txt', 'Austen', 'en'],
    ['melville_moby_2701.txt', 'Melville', 'en'],
  ] as const;

  const rows: any[] = [];
  for (const [file, author, lang] of BOOKS) {
    const fp = path.join(CACHE, file);
    if (!fs.existsSync(fp)) { log(`  MISSING ${file}`); continue; }
    const raw = fs.readFileSync(fp, 'utf8');
    const passages = extractPassages(raw, 3, 1400);
    for (let i = 0; i < passages.length; i++) {
      const prose = passages[i]!;
      const w = words(prose);
      if (w < 500 || w > 2600) continue;
      const rci = await computeRCI(packet, prose);
      const subs0 = rci.sub_scores as any[];
      const find = (sub: string) => subs0.find((s) => String(s.name).includes(sub)) ?? { score: 0, weight: 0 };
      const sub = {
        rhythm: find('rhythm'), signature: find('signature'), hook_presence: find('hook'),
        euphony: find('euphony'), voice_conformity: find('voice'),
      } as Record<string, { score: number; weight: number }>;
      // RCI_ceiling: substitute signature=100, hook=100 (best structural case), same weights
      const subs = rci.sub_scores as any[];
      const tw = subs.reduce((a, s) => a + s.weight, 0);
      const ceil = tw ? subs.reduce((a, s) => a + ((s.name === 'signature' || s.name === 'hook_presence') ? 100 : s.score) * s.weight, 0) / tw : 0;
      rows.push({
        author, lang, file, passage: i, words: w,
        RCI: +rci.score.toFixed(2),
        rhythm: +(sub['rhythm']?.score ?? 0).toFixed(1), rhythm_w: +(sub['rhythm']?.weight ?? 0).toFixed(2),
        signature: +(sub['signature']?.score ?? 0).toFixed(1),
        hook: +(sub['hook_presence']?.score ?? 0).toFixed(1),
        euphony: +(sub['euphony']?.score ?? 0).toFixed(1),
        voice: +(sub['voice_conformity']?.score ?? 0).toFixed(1), voice_w: +(sub['voice_conformity']?.weight ?? 0).toFixed(2),
        RCI_ceiling: +ceil.toFixed(2),
        pass85: rci.score >= FLOOR ? 1 : 0, ceiling_pass85: ceil >= FLOOR ? 1 : 0,
      });
      log(`  ${author.padEnd(10)} p${i} w=${w} RCI=${rci.score.toFixed(1)} (rhythm=${(sub['rhythm']?.score ?? 0).toFixed(0)} euph=${(sub['euphony']?.score ?? 0).toFixed(0)} sig=${(sub['signature']?.score ?? 0).toFixed(0)} hook=${(sub['hook_presence']?.score ?? 0).toFixed(0)}) ceil=${ceil.toFixed(1)}`);
    }
  }

  // ---- stats ----
  function dist(xs: number[]) {
    const s = [...xs].sort((a, b) => a - b); const n = s.length; if (!n) return null;
    const q = (p: number) => s[Math.min(n - 1, Math.floor(p * (n - 1)))];
    return { n, mean: +(s.reduce((a, b) => a + b, 0) / n).toFixed(2), median: +q(0.5)!.toFixed(2), p10: +q(0.1)!.toFixed(2), p90: +q(0.9)!.toFixed(2), min: +s[0]!.toFixed(2), max: +s[n - 1]!.toFixed(2) };
  }
  const summary = {
    tool: 'minaxis-literary-recompute.ts', floor: FLOOR, n_passages: rows.length,
    n_authors: new Set(rows.map((r) => r.author)).size,
    pass85_actual: rows.filter((r) => r.pass85).length,
    pass85_ceiling: rows.filter((r) => r.ceiling_pass85).length,
    RCI_dist: dist(rows.map((r) => r.RCI)),
    RCI_ceiling_dist: dist(rows.map((r) => r.RCI_ceiling)),
    rhythm_dist: dist(rows.map((r) => r.rhythm)),
    euphony_dist: dist(rows.map((r) => r.euphony)),
    signature_dist: dist(rows.map((r) => r.signature)),
    hook_const: rows.length ? rows[0].hook : null,
    engine_RCI_reference_mean: 82.6, // from MINAXIS_DISTRIBUTION.csv (sovereign output)
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cols = ['author', 'lang', 'file', 'passage', 'words', 'RCI', 'rhythm', 'rhythm_w', 'signature', 'hook', 'euphony', 'voice', 'voice_w', 'RCI_ceiling', 'pass85', 'ceiling_pass85'];
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'MINAXIS_E_LITERARY_RECOMPUTE.csv'), csv + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'minaxis_E_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  log('\n=== SUMMARY ===');
  log(`passages=${rows.length} authors=${summary.n_authors}`);
  log(`RCI real-lit: ${JSON.stringify(summary.RCI_dist)}`);
  log(`PASS floor 85 (actual): ${summary.pass85_actual}/${rows.length} | (ceiling sig=hook=100): ${summary.pass85_ceiling}/${rows.length}`);
  log(`rhythm: ${JSON.stringify(summary.rhythm_dist)}`);
  log(`euphony: ${JSON.stringify(summary.euphony_dist)} | hook const=${summary.hook_const} | signature: ${JSON.stringify(summary.signature_dist)}`);
}
main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
