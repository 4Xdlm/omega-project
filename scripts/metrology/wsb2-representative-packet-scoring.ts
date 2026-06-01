/**
 * OMEGA METROLOGY — WS-B2 RCI REPRESENTATIVE-PACKET SCORING (CALC, READ-ONLY)
 * ============================================================================
 * Mesure le VRAI RCI des maîtres avec un packet REPRÉSENTATIF (ni vide=probe,
 * ni parfait=ceiling). Méthode documentée et UNIFORME pour les 57 passages :
 *   - signature_words = top-12 mots de contenu les plus fréquents du LIVRE ENTIER
 *     (hors stopwords FR/EN, longueur >= 4), pas du passage -> évite la tautologie
 *     (un passage peut contenir peu/beaucoup du lexique de l'oeuvre = variation réaliste).
 *   - recurrent_motifs = top-5 (sous-ensemble) pour les hooks.
 *   - AUCUNE optimisation pour gonfler le RCI ; AUCUNE connaissance externe ;
 *     signature/hook NON forcés à 100 ; même méthode pour tous.
 * Reproduit extractPassages/cleanGutenberg/BOOKS de minaxis-literary-recompute.ts
 * (mêmes frontières -> probe/representative/ceiling comparables passage par passage).
 * 0 Ollama, 0 patch, 0 floor change. Run via Start-Process node + tsx.
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
const OUT_DIR = path.join(REPO, 'docs', 'audit', 'minaxis');
const CACHE = path.join(REPO, 'omega-autopsie', 'gutenberg_cache');
const TS = '2026-01-01T00:00:00.000Z';
const FLOOR = 85;
function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string): number { return s.split(/\s+/).filter((w) => w.length > 0).length; }

const STOP = new Set<string>(('le la les un une des de du au aux et ou mais donc or ni car ce cet cette ces son sa ses mon ma mes ton ta tes notre nos votre vos leur leurs il elle ils elles je tu nous vous on que qui quoi dont quand comme dans sur sous avec sans pour par vers chez entre etait etaient sont fut furent avait avaient ont est ne pas plus tout tous toute toutes meme aussi bien tres alors apres avant encore puis cela celui celle ceux deja ' +
  'the and that was were have has had his her their they them you not but for with from this these those there here what which when where who whom how all any are our your she him out about into than then them too very upon would could should been being said one like ').split(/\s+/));

function buildPermissivePacket() {
  return buildPacket([], []);
}
function buildPacket(signature_words: string[], motifs: string[]) {
  const pack = JSON.parse(fs.readFileSync(path.join(REPO, 'golden/intents/intent_pack_gardien.json'), 'utf8'));
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, createDefaultConfig(), TS);
  const scene0: Scene = plan.arcs[0]!.scenes[0]!;
  const style_profile: StyleProfile = {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words, forbidden_words: [], abstraction_max_ratio: 0.95, concrete_min_ratio: 0.0 },
    rhythm: { avg_sentence_length_target: 20, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 0, min_compressions_per_scene: 0 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.0, 1.0] as readonly [number, number] },
    imagery: { recurrent_motifs: motifs, density_target_per_100_words: 0, banned_metaphors: [] },
    voice: DEFAULT_VOICE_GENOME,
  };
  const kill_lists: KillLists = { banned_words: [], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] };
  const canon: CanonEntry[] = [];
  const continuity: ForgeContinuity = { previous_scene_summary: '', character_states: [], open_threads: [] };
  return assembleForgePacket({ plan, scene: scene0, style_profile, kill_lists, canon, continuity, run_id: 'wsb2', language: 'fr' });
}
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
// work-level signature extraction (top content words of the WHOLE book)
function rankedContentWords(rawBook: string): string[] {
  const text = cleanGutenberg(rawBook).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const toks = text.split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w));
  const freq = new Map<string, number>();
  for (const t of toks) freq.set(t, (freq.get(t) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
}
// frequent (top-12) saturates (ubiquitous); mid-freq (ranks 30-42) = distinctive, non-ubiquitous
function extractSignature(rawBook: string, topN: number): string[] { return rankedContentWords(rawBook).slice(0, topN); }
function extractSignatureMid(rawBook: string): string[] { return rankedContentWords(rawBook).slice(30, 42); }

const BOOKS = [
  ['flaubert_bovary_14155.txt','Flaubert','fr'],['flaubert_education_14285.txt','Flaubert','fr'],
  ['flaubert_salammbo_10884.txt','Flaubert','fr'],['hugo_miserables_17489.txt','Hugo','fr'],
  ['hugo_travailleurs_10907.txt','Hugo','fr'],['maupassant_une_vie_6902.txt','Maupassant','fr'],
  ['maupassant_bel_ami_3088.txt','Maupassant','fr'],['proust_swann_2650.txt','Proust','fr'],
  ['proust_jeunes_filles_17180.txt','Proust','fr'],['zola_bonheur_11953.txt','Zola','fr'],
  ['zola_bete_10007.txt','Zola','fr'],['stendhal_chartreuse_7524.txt','Stendhal','fr'],
  ['balzac_lys_1237.txt','Balzac','fr'],['balzac_eugenie_1715.txt','Balzac','fr'],
  ['dickens_two_cities_98.txt','Dickens','en'],['dickens_copperfield_766.txt','Dickens','en'],
  ['bronte_e_wuthering_768.txt','Bronte','en'],['austen_pride_1342.txt','Austen','en'],
  ['melville_moby_2701.txt','Melville','en'],
] as const;

function distOf(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b); const n = s.length; if (!n) return null;
  const q = (p: number) => { const i = p * (n - 1), lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : +(s[lo] + (s[hi] - s[lo]) * (i - lo)).toFixed(2); };
  return { n, mean: +(s.reduce((a, b) => a + b, 0) / n).toFixed(2), p10: +q(0.1).toFixed(2), p25: +q(0.25).toFixed(2), p50: +q(0.5).toFixed(2), p75: +q(0.75).toFixed(2), p90: +q(0.9).toFixed(2), min: +s[0].toFixed(2), max: +s[n - 1].toFixed(2) };
}

async function main() {
  log('=== WS-B2 REPRESENTATIVE-PACKET RCI SCORING ===');
  const probePacket = buildPermissivePacket();
  const rows: any[] = [];
  for (const [file, author, lang] of BOOKS) {
    const fp = path.join(CACHE, file);
    if (!fs.existsSync(fp)) { log(`  MISSING ${file}`); continue; }
    const raw = fs.readFileSync(fp, 'utf8');
    const sig = extractSignature(raw, 12);
    const motifs = sig.slice(0, 5);
    const repPacket = buildPacket(sig, motifs);
    const sigMid = extractSignatureMid(raw);
    const repPacketMid = buildPacket(sigMid, sigMid.slice(0, 5));
    const passages = extractPassages(raw, 3, 1400);
    for (let i = 0; i < passages.length; i++) {
      const prose = passages[i]!; const w = words(prose);
      if (w < 500 || w > 2600) continue;
      const rP = await computeRCI(probePacket, prose);
      const rR = await computeRCI(repPacket, prose);
      const rM = await computeRCI(repPacketMid, prose);
      const subsM = rM.sub_scores as any[];
      const getM = (s: string) => subsM.find((x) => String(x.name).includes(s)) ?? { score: 0, weight: 0 };
      const subsR = rR.sub_scores as any[];
      const get = (s: string) => subsR.find((x) => String(x.name).includes(s)) ?? { score: 0, weight: 0 };
      const tw = subsR.reduce((a, s) => a + s.weight, 0);
      const ceil = subsR.reduce((a, s) => a + ((String(s.name).includes('signature') || String(s.name).includes('hook')) ? 100 : s.score) * s.weight, 0) / tw;
      rows.push({
        author, lang, passage: i, words: w,
        RCI_probe: +rP.score.toFixed(2), RCI_repr: +rR.score.toFixed(2), RCI_repr_mid: +rM.score.toFixed(2), RCI_ceiling: +ceil.toFixed(2),
        sig_repr: +get('signature').score.toFixed(1), hook_repr: +get('hook').score.toFixed(1),
        sig_mid: +getM('signature').score.toFixed(1), hook_mid: +getM('hook').score.toFixed(1),
        rhythm: +get('rhythm').score.toFixed(1), euphony: +get('euphony').score.toFixed(1),
        d_repr_probe: +(rR.score - rP.score).toFixed(2), d_ceil_repr: +(ceil - rR.score).toFixed(2),
        pass85_repr: rR.score >= FLOOR ? 1 : 0,
        sig_words: sig.slice(0, 6).join('|'),
      });
      log(`  ${author.padEnd(10)} p${i} w=${w} | probe=${rP.score.toFixed(1)} REPR=${rR.score.toFixed(1)} ceil=${ceil.toFixed(1)} | sig=${get('signature').score.toFixed(0)} hook=${get('hook').score.toFixed(0)} rhythm=${get('rhythm').score.toFixed(0)}`);
    }
  }
  const col = (k: string) => rows.map((r) => r[k]);
  const summary = {
    tool: 'wsb2-representative-packet-scoring.ts', n: rows.length, floor: FLOOR,
    method: 'signature_words = top-12 content words of WHOLE book (stopwords FR/EN removed, len>=4); motifs = top-5; each passage scored against work-level lexicon (not per-passage => realistic variation). signature/hook NOT forced.',
    pass85_probe: rows.filter((r) => r.RCI_probe >= FLOOR).length,
    pass85_repr_freq: rows.filter((r) => r.pass85_repr).length,
    pass85_repr_mid: rows.filter((r) => r.RCI_repr_mid >= FLOOR).length,
    pass85_ceiling: rows.filter((r) => r.RCI_ceiling >= FLOOR).length,
    RCI_probe_dist: distOf(col('RCI_probe')),
    RCI_repr_FREQ_dist: distOf(col('RCI_repr')),
    RCI_repr_MID_dist: distOf(col('RCI_repr_mid')),
    RCI_ceiling_dist: distOf(col('RCI_ceiling')),
    sig_freq_dist: distOf(col('sig_repr')),
    sig_mid_dist: distOf(col('sig_mid')),
    hook_mid_dist: distOf(col('hook_mid')),
    K2_ref_realpacket: 82.6,
    NOTE: 'FREQ (top-12 frequent words) sature signature/hook a 100 (mots ubiquitaires) => RCI_repr=ceiling. MID (ranks 30-42, distinctifs non-ubiquitaires) = estimation non-saturee, plus proche d une politique signature thematique production. Vrai RCI maitres ~ entre MID et FREQ/ceiling.',
    floor_candidates_MID: { p25: distOf(col('RCI_repr_mid'))?.p25, p50: distOf(col('RCI_repr_mid'))?.p50, p10: distOf(col('RCI_repr_mid'))?.p10 },
    floor_candidates_FREQ_ceiling: { p25: distOf(col('RCI_repr'))?.p25, p50: distOf(col('RCI_repr'))?.p50 },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cols = ['author','lang','passage','words','RCI_probe','RCI_repr_mid','RCI_repr','RCI_ceiling','sig_repr','sig_mid','hook_mid','rhythm','euphony','pass85_repr','sig_words'];
  fs.writeFileSync(path.join(OUT_DIR, 'RCI_REPRESENTATIVE_PACKET_SCORING.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'rci_representative_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
