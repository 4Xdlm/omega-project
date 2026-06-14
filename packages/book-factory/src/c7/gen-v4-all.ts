/**
 * OMEGA — Phase C : génération des 6 slots neufs du V4 (draft machine, ear-pending).
 * gemma4 via Ollama. Voix littéraire + tics bannis. Garde : longueur, tics bannis, densité-tics
 * (<= moyenne livre), zéro anglais. Multi-seed, garde le 1er qui passe sinon le meilleur (longueur
 * OK + densité mini), flag NON-CERTIFIED si aucun ne passe. Écrit chaque slot + ledger. Pas
 * d'auto-promotion : ces chapitres sont des DRAFTS à valider par l'auteur.
 *   tsx packages/book-factory/src/c7/gen-v4-all.ts   (cwd = packages/book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas/v4_slots';
const SRC = 'runs/atlas/MANUSCRIT_V3_COH1.md';
const MODEL = process.env['PATCH_MODEL'] ?? 'gemma4:31b';
const SEEDS = [7, 42, 123];

const BANNED = ['esquissa un sourire', 'sourire sans joie', "qui n'atteignait pas", 'le temps diffère', 'le temps différé', "s'étirent comme du caoutchouc", 'mâchoire', 'silence lourd', 'silence électrique', 'silence palpable', 'comme un coup de feu', 'tabac froid', 'cuir craquelé', 'monocorde', 'tranchante comme une lame'];

const SYS_SOLO = "Tu es un romancier français de polar littéraire (registre Simenon, Vargas maritime). Prose sobre, tenue, concrète, sensorielle au compte-gouttes, français impeccable. Tu écris un chapitre de SOLITUDE et d'intériorité : AUCUNE confrontation, AUCUN dialogue d'interrogatoire, AUCUN salon. Tu n'écris QUE la prose du chapitre (ni titre, ni note, ni méta). Tu ne révèles aucun secret central non prévu.";
const SYS_SCENE = "Tu es un romancier français de polar littéraire (registre Simenon, Vargas maritime). Prose sobre, tenue, concrète, français impeccable. Tu écris une scène tendue mais SANS bavardage : dialogues courts, secs, vrais (les gens hésitent, se coupent). Tu n'écris QUE la prose du chapitre (ni titre, ni note, ni méta).";

interface Slot { id: string; sys: string; minW: number; maxW: number; prevCh: number | null; nextCh: number | null; brief: string; }

const FAMILY = "PERSONNAGES : Garcia (inspecteur, sobre, obstiné). Léna Marchetti (du village, tiraillée). Yvon Squarcioni (le maire-patriarche, cerveau). Gaspard (vieux du port, peureux). Dubois = le gardien de phare ASSASSINÉ (il tenait des comptes secrets sur tout le monde — c'est pour ça qu'on l'a tué). Marc = un revenant cru mort dans le naufrage. LIEU : Ker-Morvan, Bretagne. Le naufrage du Triton (1998) était un montage : cargaison détournée, butin partagé, silence acheté.";

const SLOTS: Slot[] = [
  { id: 'N3_garcia_cote', sys: SYS_SOLO, minW: 1200, maxW: 1900, prevCh: 2, nextCh: 4,
    brief: "Garcia SEUL sur la côte, après la scène de crime. Sa marche, le doute, sa méthode d'enquêteur, le village vu de l'extérieur et son hostilité feutrée. Au plus une silhouette lointaine. Un moment de calme rêche avant que l'étau ne se resserre." },
  { id: 'N8_lena_pere', sys: SYS_SOLO, minW: 1200, maxW: 1900, prevCh: 11, nextCh: 42,
    brief: "Léna SEULE chez elle, le soir. La mémoire de son père (mort, lié au naufrage). Ce qu'elle sait et qu'elle tait. Sa peur, sa loyauté qui se fissure. Objets de la maison, gestes du quotidien. Prépare sa future bascule. Aucune autre voix." },
  { id: 'N12_yvon_nuit', sys: SYS_SOLO, minW: 1200, maxW: 1900, prevCh: 20, nextCh: 46,
    brief: "Yvon Squarcioni SEUL la nuit. Derrière le patriarche : un vieil homme épuisé qui a peur. Le poids de trente ans de silence. Pas une posture — la fatigue, le corps, l'insomnie. On le voit pour ce qu'il est. Aucune autre voix." },
  { id: 'N14_aveu', sys: SYS_SCENE, minW: 1300, maxW: 2000, prevCh: 46, nextCh: 35,
    brief: "L'AVEU UNIQUE d'Yvon, en UN seul moment (il n'avouera plus jamais après). Il confesse : le naufrage du Triton 1998 était un montage ; le butin partagé ; le gardien Dubois tenait les comptes sur tous et a voulu parler ; alors on l'a fait taire. Yvon assume — c'est lui qui a tenu le village, pas un patron au-dessus. Garcia, Léna, Gaspard présents. Dialogue sec, pas de sentences. C'est lourd, définitif." },
  { id: 'N19_pere_garcia', sys: SYS_SCENE, minW: 1100, maxW: 1700, prevCh: 45, nextCh: 44,
    brief: "Garcia vient de voir le NOM DE SON PROPRE PÈRE dans le registre (mention « dette acquittée »). Conflit intérieur : il est compromis, l'enquête le touche personnellement. Surtout intériorité, peut-être un bref échange avec Léna. Il vacille mais ne lâche pas." },
  { id: 'N25_coda', sys: SYS_SOLO, minW: 600, maxW: 1000, prevCh: 50, nextCh: null,
    brief: "COURTE coda après la chute. Le prix payé. Garcia quitte (ou reste dans) Ker-Morvan ; ce que l'affaire a coûté, ce qui ne sera pas jugé. Ton de cendre froide, retenu. Pas de résolution propre — le village reste le village." },
];

function tail(s: string, n: number): string { return s.split(/\s+/u).filter((w) => w.length > 0).slice(-n).join(' '); }
function head(s: string, n: number): string { return s.split(/\s+/u).filter((w) => w.length > 0).slice(0, n).join(' '); }
function chapters(md: string): Map<number, string> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const m = new Map<number, string>();
  for (let i = 1; i < parts.length; i += 2) m.set(Number(parts[i]), (parts[i + 1] ?? '').trim());
  return m;
}
async function gemma(sys: string, user: string, seed: number, numPredict: number): Promise<string> {
  const body = { model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], stream: false, think: false, options: { temperature: 0.85, top_p: 0.92, num_predict: numPredict, seed } };
  const res = await fetch('http://localhost:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}
function guard(text: string, minW: number, maxW: number): { ok: boolean; words: number; ticDensity: number; banned: string[]; english: number } {
  const words = text.split(/\s+/u).filter((w) => w.length > 0).length;
  const banned = BANNED.filter((b) => text.toLowerCase().includes(b.toLowerCase()));
  const rep = measureRepetition(text);
  const totalTics = rep.families.reduce((a, f) => a + f.total, 0);
  const ticDensity = words > 0 ? (totalTics / words) * 1000 : 0;
  const english = (text.match(/\b(the|and the|with the|something|nothing|standing)\b/giu) ?? []).length;
  const ok = words >= minW && words <= maxW && banned.length === 0 && ticDensity <= 8.0 && english === 0;
  return { ok, words, ticDensity: Number(ticDensity.toFixed(2)), banned, english };
}

async function main(): Promise<void> {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const chs = chapters(readFileSync(SRC, 'utf8'));
  const status: Array<Record<string, unknown>> = [];
  for (const slot of SLOTS) {
    const lg = `${OUT}/${slot.id}_LEDGER.jsonl`; writeFileSync(lg, '');
    const prev = slot.prevCh !== null ? (chs.get(slot.prevCh) ?? '') : '';
    const next = slot.nextCh !== null ? (chs.get(slot.nextCh) ?? '') : '';
    const cont = `${prev ? `— Fin du chapitre précédent (continuité, ne pas recopier) : …${tail(prev, 110)}\n` : ''}${next ? `— Début du chapitre suivant (continuité) : ${head(next, 70)}…\n` : ''}`;
    const user = `${FAMILY}\n\nÉCRIS un chapitre (~${Math.round((slot.minW + slot.maxW) / 2)} mots) : ${slot.brief}\n\nTICS INTERDITS (ne JAMAIS écrire) : ${BANNED.join(' ; ')}. Varie les sensations, n'en mets pas à chaque phrase.\n\n${cont}\nÉcris UNIQUEMENT la prose du chapitre.`;
    const numPredict = Math.min(3600, Math.round(slot.maxW * 1.7) + 300);
    let best: { seed: number; text: string; g: ReturnType<typeof guard> } | null = null;
    for (const seed of SEEDS) {
      let cand = '';
      try { cand = await gemma(slot.sys, user, seed, numPredict); } catch (e) { appendFileSync(lg, `${JSON.stringify({ seed, err: String(e) })}\n`, 'utf8'); continue; }
      const g = guard(cand, slot.minW, slot.maxW);
      appendFileSync(lg, `${JSON.stringify({ seed, ...g })}\n`, 'utf8');
      if (g.ok) { best = { seed, text: cand, g }; break; }
      // garder le meilleur fallback : longueur dans la borne basse + densité la plus faible
      if (best === null || (g.words >= slot.minW && g.ticDensity < best.g.ticDensity)) best = { seed, text: cand, g };
    }
    if (best) {
      writeFileSync(`${OUT}/${slot.id}.md`, best.text, 'utf8');
      status.push({ slot: slot.id, certified: best.g.ok, seed: best.seed, ...best.g });
      appendFileSync(`${OUT}/_GEN_STATUS.log`, `${slot.id} ${best.g.ok ? 'CERTIFIED' : 'DRAFT_FLAGGED'} seed=${best.seed} w=${best.g.words} tic=${best.g.ticDensity} banned=[${best.g.banned.join(',')}] en=${best.g.english}\n`, 'utf8');
    } else {
      status.push({ slot: slot.id, certified: false, error: 'no_candidate' });
      appendFileSync(`${OUT}/_GEN_STATUS.log`, `${slot.id} NO_CANDIDATE\n`, 'utf8');
    }
  }
  writeFileSync(`${OUT}/_GEN_STATUS.json`, JSON.stringify(status, null, 1), 'utf8');
  console.log('GEN_ALL_DONE ' + status.map((s) => `${s['slot']}:${s['certified'] ? 'OK' : 'DRAFT'}`).join(' '));
}
main().catch((e: unknown) => { appendFileSync(`${OUT}/_GEN_STATUS.log`, `FATAL ${String(e)}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
