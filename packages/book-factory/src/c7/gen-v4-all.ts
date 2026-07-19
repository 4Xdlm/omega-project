/**
 * OMEGA — Phase C : génération des slots neufs du V4 (draft machine, ear-pending).
 * v3 : + GARDE INCIPIT UNIQUE (le juge ne laisse plus passer un incipit qui clone un chapitre
 * existant — doctrine « tête de 4 mots UNIQUE dans le livre »). Contexte de continuité réduit
 * (moins d'écho → moins de recopie). Sélection best-of-seeds (propreté + longueur, non-clone).
 *   SLOTS_ONLY=N14_aveu,N19_pere_garcia tsx src/c7/gen-v4-all.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas/v4_slots';
const SRC = 'runs/atlas/MANUSCRIT_V3_COH2.md';
const MODEL = process.env['PATCH_MODEL'] ?? 'gemma4:31b';
const SEEDS = [7, 42, 123, 2024];
const ONLY = (process.env['SLOTS_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s.length > 0);

const BANNED = ['esquissa un sourire', 'sourire sans joie', "qui n'atteignait pas", 'le temps diffère', 'le temps différé', "s'étirent comme du caoutchouc", 'mâchoire', 'silence lourd', 'silence électrique', 'silence palpable', 'comme un coup de feu', 'tabac froid', 'cuir craquelé', 'monocorde', 'tranchante comme une lame'];

const SYS_SOLO = "Tu es un romancier français de polar littéraire (registre Simenon, Vargas maritime). Prose sobre, tenue, concrète, sensorielle au compte-gouttes, français impeccable. Tu écris un chapitre de SOLITUDE et d'intériorité : AUCUNE confrontation, AUCUN dialogue d'interrogatoire, AUCUN salon. Développe la scène, ne la résume pas. Tu n'écris QUE la prose du chapitre (ni titre, ni note, ni méta).";
const SYS_SCENE = "Tu es un romancier français de polar littéraire (registre Simenon, Vargas maritime). Prose sobre, tenue, concrète, français impeccable. Tu écris une scène tendue mais SANS bavardage : dialogues courts, secs, vrais. DÉVELOPPE la scène pleinement. Tu n'écris QUE la prose du chapitre (ni titre, ni note, ni méta).";

interface Slot { id: string; sys: string; minW: number; maxW: number; target: number; prevCh: number | null; nextCh: number | null; brief: string; }
const FAMILY = "PERSONNAGES : Garcia (inspecteur). Léna Marchetti (du village, tiraillée). Yvon Squarcioni (maire-patriarche, cerveau du meurtre). Gaspard (vieux du port, peureux). Dubois = gardien de phare ASSASSINÉ (maître-chanteur, il tenait les comptes sur tous — tué pour ça). Marc = revenant cru mort dans le naufrage. LIEU : Ker-Morvan, Bretagne. Naufrage du Triton (1998) = montage : cargaison détournée, butin partagé, silence acheté.";

const SLOTS: Slot[] = [
  { id: 'N3_garcia_cote', sys: SYS_SOLO, minW: 1200, maxW: 1900, target: 1500, prevCh: 2, nextCh: 4,
    brief: "Garcia SEUL sur la côte, après la scène de crime. Marche, doute, méthode, le village vu de l'extérieur, hostilité feutrée. Au plus une silhouette lointaine. Calme rêche avant que l'étau ne se resserre." },
  { id: 'N8_lena_pere', sys: SYS_SOLO, minW: 1200, maxW: 1900, target: 1500, prevCh: 11, nextCh: 42,
    brief: "Léna SEULE chez elle, le soir. Mémoire du père (mort, lié au naufrage). Ce qu'elle tait, sa peur, sa loyauté qui se fissure. Objets, gestes du quotidien. Prépare sa bascule. Aucune autre voix." },
  { id: 'N12_yvon_nuit', sys: SYS_SOLO, minW: 1250, maxW: 1900, target: 1500, prevCh: 20, nextCh: 46,
    brief: "Yvon Squarcioni SEUL la nuit. Derrière le patriarche : un vieil homme épuisé qui a peur. Insomnie, corps qui lâche, un souvenir précis du naufrage qui le hante. Aucune autre voix." },
  { id: 'N14_aveu', sys: SYS_SCENE, minW: 1500, maxW: 2100, target: 1750, prevCh: 46, nextCh: 35,
    brief: "CLIMAX — l'aveu unique et complet d'Yvon. Montée graduelle : résistance, questions qui resserrent, effondrement, aveu détaillé (naufrage du Triton 1998 = montage, cargaison détournée, butin partagé, silence acheté ; le gardien Dubois tenait les comptes et a voulu parler → Yvon a orchestré sa mort). Yvon assume, personne au-dessus. Garcia/Léna/Gaspard présents ; Léna encaisse le nom de son père. Dialogues secs. NE RÉSUME PAS. ~1750 mots." },
  { id: 'N19_pere_garcia', sys: SYS_SCENE, minW: 1200, maxW: 1800, target: 1500, prevCh: 45, nextCh: 44,
    brief: "Garcia vient de voir le NOM DE SON PÈRE dans le registre (« dette acquittée »). Conflit intérieur : il est compromis. Intériorité + bref échange avec Léna. Il vacille mais ne lâche pas ; tentation d'enterrer la preuve, refus." },
  { id: 'N25_coda', sys: SYS_SOLO, minW: 600, maxW: 1050, target: 800, prevCh: 50, nextCh: null,
    brief: "COURTE coda après la chute. Le prix payé. Ce qui ne sera pas jugé. Cendre froide, retenu. Pas de résolution propre." },
];

function words(s: string): number { return s.split(/\s+/u).filter((w) => w.length > 0).length; }
function tail(s: string, n: number): string { return s.split(/\s+/u).filter((w) => w.length > 0).slice(-n).join(' '); }
function head4(s: string): string { return s.trim().split(/\s+/u).slice(0, 4).join(' ').toLowerCase().replace(/[^\p{L}\s]/gu, ''); }
function head8(s: string): string { return s.trim().split(/\s+/u).slice(0, 8).join(' ').toLowerCase().replace(/[^\p{L}\s]/gu, ''); }
function chapters(md: string): Map<number, string> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const m = new Map<number, string>();
  for (let i = 1; i < parts.length; i += 2) m.set(Number(parts[i]), (parts[i + 1] ?? '').trim());
  return m;
}
// têtes d'incipit existantes = chapitres COH2 + slots déjà générés (hors slots régénérés maintenant)
function existingHeads(chs: Map<number, string>): { h4: Set<string>; h8: Set<string> } {
  const h4 = new Set<string>(); const h8 = new Set<string>();
  for (const p of chs.values()) { h4.add(head4(p)); h8.add(head8(p)); }
  for (const f of readdirSync(OUT)) {
    if (!f.endsWith('.md')) continue; const id = f.replace(/\.md$/, '');
    if (ONLY.includes(id)) continue; // le slot qu'on régénère ne compte pas contre lui-même
    try { const t = readFileSync(`${OUT}/${f}`, 'utf8'); h4.add(head4(t)); h8.add(head8(t)); } catch { /* skip */ }
  }
  return { h4, h8 };
}

async function gemma(sys: string, user: string, seed: number, numPredict: number): Promise<string> {
  const body = { model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], stream: false, think: false, options: { temperature: 0.88, top_p: 0.92, num_predict: numPredict, seed } };
  const res = await fetch('http://localhost:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}
interface G { ok: boolean; words: number; ticDensity: number; banned: string[]; english: number; incipitClone: boolean; }
function guard(text: string, minW: number, maxW: number, heads: { h4: Set<string>; h8: Set<string> }): G {
  const w = words(text);
  const banned = BANNED.filter((b) => text.toLowerCase().includes(b.toLowerCase()));
  const rep = measureRepetition(text);
  const ticDensity = w > 0 ? (rep.families.reduce((a, f) => a + f.total, 0) / w) * 1000 : 0;
  const english = (text.match(/\b(the|and the|with the|something|nothing|standing)\b/giu) ?? []).length;
  const incipitClone = heads.h4.has(head4(text)) || heads.h8.has(head8(text));
  const ok = w >= minW && w <= maxW && banned.length === 0 && ticDensity <= 8.0 && english === 0 && !incipitClone;
  return { ok, words: w, ticDensity: Number(ticDensity.toFixed(2)), banned, english, incipitClone };
}
let c_minW = 0;
// choix : jamais un incipit-clone ; parmi les propres, le plus long dans la bande (densité<=8.5) ; sinon plus long propre.
function pick(cands: Array<{ seed: number; text: string; g: G }>): { seed: number; text: string; g: G } | null {
  if (cands.length === 0) return null;
  const nonClone = cands.filter((c) => !c.g.incipitClone);
  const base = nonClone.length > 0 ? nonClone : cands;
  const clean = base.filter((c) => c.g.banned.length === 0 && c.g.english === 0);
  const pool = clean.length > 0 ? clean : base;
  const inband = pool.filter((c) => c.g.words >= c_minW && c.g.ticDensity <= 8.5);
  if (inband.length > 0) return inband.sort((a, b) => b.g.words - a.g.words)[0] ?? null;
  return pool.sort((a, b) => (b.g.words - a.g.words) || (a.g.ticDensity - b.g.ticDensity))[0] ?? null;
}

async function main(): Promise<void> {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const chs = chapters(readFileSync(SRC, 'utf8'));
  const heads = existingHeads(chs);
  const status: Array<Record<string, unknown>> = [];
  for (const slot of SLOTS) {
    if (ONLY.length > 0 && !ONLY.includes(slot.id)) continue;
    c_minW = slot.minW;
    const lg = `${OUT}/${slot.id}_LEDGER.jsonl`; writeFileSync(lg, '');
    const prev = slot.prevCh !== null ? (chs.get(slot.prevCh) ?? '') : '';
    // contexte réduit : seulement la fin du chapitre précédent (40 mots), pas le début du suivant → moins d'écho
    const cont = prev ? `— Dernière image du chapitre précédent (NE PAS la recopier, enchaîne autrement) : …${tail(prev, 40)}\n` : '';
    const user = `${FAMILY}\n\nÉCRIS un chapitre d'environ ${slot.target} mots (développe) : ${slot.brief}\n\nCONTRAINTE D'OUVERTURE : la PREMIÈRE phrase doit être une image NEUVE, propre à ce chapitre — sa tête (4 premiers mots) doit être UNIQUE dans le livre. N'ouvre JAMAIS comme un autre chapitre.\nTICS INTERDITS : ${BANNED.join(' ; ')}. Varie les sensations.\n\n${cont}\nÉcris UNIQUEMENT la prose du chapitre.`;
    const numPredict = Math.min(4000, Math.round(slot.maxW * 1.9) + 400);
    const cands: Array<{ seed: number; text: string; g: G }> = [];
    for (const seed of SEEDS) {
      let cand = '';
      try { cand = await gemma(slot.sys, user, seed, numPredict); } catch (e) { appendFileSync(lg, `${JSON.stringify({ seed, err: String(e) })}\n`, 'utf8'); continue; }
      const g = guard(cand, slot.minW, slot.maxW, heads);
      appendFileSync(lg, `${JSON.stringify({ seed, ...g })}\n`, 'utf8');
      cands.push({ seed, text: cand, g });
      if (g.ok) break; // 1er pleinement OK suffit
    }
    const best = pick(cands);
    if (best) {
      writeFileSync(`${OUT}/${slot.id}.md`, best.text, 'utf8');
      status.push({ slot: slot.id, certified: best.g.ok, seed: best.seed, ...best.g });
      appendFileSync(`${OUT}/_GEN_STATUS.log`, `${slot.id} ${best.g.ok ? 'CERTIFIED' : 'DRAFT'} seed=${best.seed} w=${best.g.words} tic=${best.g.ticDensity} clone=${best.g.incipitClone} banned=[${best.g.banned.join(',')}]\n`, 'utf8');
    } else { status.push({ slot: slot.id, certified: false, error: 'no_candidate' }); appendFileSync(`${OUT}/_GEN_STATUS.log`, `${slot.id} NO_CANDIDATE\n`, 'utf8'); }
  }
  writeFileSync(`${OUT}/_GEN_STATUS_v3.json`, JSON.stringify(status, null, 1), 'utf8');
  console.log('GEN_DONE ' + status.map((s) => `${s['slot']}:${s['certified'] ? 'OK' : 'DRAFT'}(${s['words']}w/clone=${s['incipitClone']})`).join(' '));
}
main().catch((e: unknown) => { appendFileSync(`${OUT}/_GEN_STATUS.log`, `FATAL ${String(e)}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
