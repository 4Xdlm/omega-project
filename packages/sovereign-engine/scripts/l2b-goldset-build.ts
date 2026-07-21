/**
 * OMEGA — L2B_GOLDSET builder. Prepare un formulaire d'annotation HUMAINE (gold),
 * AVEUGLE : aucun score machine, aucun nom d'auteur affiche. Intention assignee
 * ALEATOIREMENT (seedee, stratifiee) => variance de note sans selection par le score
 * (anti-circularite). Le score emotion01 sera calcule SEPAREMENT plus tard.
 *   tsx scripts/l2b-goldset-build.ts   (cwd = sovereign-engine)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PROSE = 'runs/_wsc_frthriller_prose.txt';
const OUT_MD = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/L2B_ANNOTATION.md';
const OUT_JSON = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/L2B_GOLDSET.json';
const N_ITEMS = 30;
const WORDS = 500;

const INTENTIONS: Record<string, { desc: string; rupture: boolean }> = {
  C01_rise: { desc: "La tension emotionnelle doit MONTER progressivement du debut a la fin (du calme vers l'intense), sans rupture brutale.", rupture: false },
  C02_fall: { desc: "L'emotion doit RETOMBER progressivement (d'intense vers apaise ou sombre), sans a-coup.", rupture: false },
  C03_arc: { desc: "L'emotion doit former un ARC : montee jusqu'a un pic au milieu, puis redescente vers la fin.", rupture: false },
  C04_flat: { desc: "L'emotion doit rester STABLE et MODEREE du debut a la fin, sans montee ni chute.", rupture: false },
  C05_rupture_Q3: { desc: "Le passage reste tendu-bas, puis BASCULE brutalement vers l'intense au 3e quart (rupture nette), et reste haut.", rupture: true },
  C06_rupture_Q2: { desc: "Bascule emotionnelle BRUTALE des le 2e quart (rupture precoce), puis maintien de la tension.", rupture: true },
  C07_decant_slow: { desc: "Apres un pic initial, l'emotion DECANTE lentement, decroit en douceur jusqu'a la fin (persistance longue).", rupture: false },
  C08_drycut: { desc: "Pic initial fort, puis COUPE SECHE : l'emotion tombe brutalement et reste basse (aucune persistance).", rupture: true },
  C09_rise_neg: { desc: "Montee progressive vers une emotion NEGATIVE de plus en plus intense (angoisse / noirceur croissante).", rupture: false },
  C10_rise_pos_strong: { desc: "Forte montee vers une emotion POSITIVE eclatante a la fin (elan, soulagement, joie qui explose).", rupture: false },
  C11_fall_slow: { desc: "Lente redescente depuis une tension positive vers le calme, sans rupture.", rupture: false },
  C12_arc_neg: { desc: "Arc en tonalite SOMBRE : montee vers un pic negatif au milieu puis redescente.", rupture: false },
  C13_double_peak: { desc: "DEUX pics de tension (un tot, un vers la fin) separes par une accalmie.", rupture: true },
  C14_flat_high: { desc: "Tension SOUTENUE et HAUTE, constante, sans repit du debut a la fin.", rupture: false },
  C15_flat_low: { desc: "Calme PLAT et neutre, presque sans emotion, du debut a la fin.", rupture: false },
  C16_rupture_Q4: { desc: "Tout reste calme puis BASCULE brutale seulement au tout dernier quart (choc final).", rupture: true },
  C17_decant_medium: { desc: "Pic puis decroissance MOYENNE de la tension jusqu'a la fin.", rupture: false },
  C18_drycut_pos: { desc: "Pic positif fort, puis chute seche vers le neutre.", rupture: true },
  C19_rise_then_hold: { desc: "Montee de tension jusqu'au 3e quart puis MAINTIEN au sommet (plateau haut final).", rupture: false },
  C20_valley: { desc: "Depart tendu, CREUX negatif au milieu (vallee), puis remontee vers l'apaisement final.", rupture: true },
};
const INT_IDS = Object.keys(INTENTIONS);

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = mulberry32(20260721);

// parse books
const raw = readFileSync(PROSE, 'utf8');
const parts = raw.split(/===BOOK:([^=]+)===/).slice(1);
const books: { tag: string; words: string[] }[] = [];
for (let i = 0; i + 1 < parts.length; i += 2) {
  const tag = parts[i].trim();
  const words = parts[i + 1].split(/\s+/).filter((w) => /\p{L}/u.test(w));
  if (words.length > 8000) books.push({ tag, words });
}

// candidats : 2 fenetres mid-book par livre, propres (peu de chiffres)
function clean(win: string[]): boolean {
  const digits = win.filter((w) => /^\d+$/.test(w)).length;
  return digits / win.length < 0.03;
}
const cands: { tag: string; text: string }[] = [];
for (const b of books) {
  for (const frac of [0.4, 0.62]) {
    const start = Math.floor(b.words.length * frac);
    const win = b.words.slice(start, start + WORDS);
    if (win.length === WORDS && clean(win)) cands.push({ tag: b.tag, text: win.join(' ') });
  }
}
// shuffle seede, max 2 par livre deja garanti, prendre N
for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
const chosen = cands.slice(0, N_ITEMS);

// intentions stratifiees : rotation sur les 20 puis shuffle seede
const rotation: string[] = [];
for (let i = 0; i < N_ITEMS; i++) rotation.push(INT_IDS[i % INT_IDS.length]);
for (let i = rotation.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [rotation[i], rotation[j]] = [rotation[j], rotation[i]]; }

const goldset = chosen.map((c, i) => ({ id: `item_${String(i + 1).padStart(2, '0')}`, book: c.tag, intentionId: rotation[i], text: c.text }));
writeFileSync(OUT_JSON, JSON.stringify({ set: 'L2B_GOLDSET', date: '2026-07-21', n: goldset.length, seed: 20260721, blind: true, note: 'Aucun score machine. Intention aleatoire seedee. Auteur cache dans le formulaire (present ici pour tracabilite LOAO).', intentions: INTENTIONS, items: goldset }, null, 1), 'utf8');

// formulaire humain (aveugle : pas d'auteur, pas de score)
let md = `# L2B — Formulaire d'annotation (gold humain, AVEUGLE)\n\n`;
md += `**But** : juger, pour chaque extrait, dans quelle mesure il REALISE l'intention emotionnelle affichee — PAS si tu l'aimes.\n\n`;
md += `**Comment noter** (0 a 5) :\n- **Fidelite** : le passage suit-il la trajectoire emotionnelle demandee ? (0 = pas du tout, 5 = parfaitement)\n- **Impact** : produit-il l'effet emotionnel vise ? (0 = nul, 5 = fort)\n- **Rupture** : si l'intention en contient une, est-elle bien placee et nette ? (0-5, sinon \`N/A\`)\n- **Note libre** : un mot si tu veux.\n\n`;
md += `Remplis les \`____\`. Ne cherche pas la \"bonne reponse\" : ton ressenti EST la verite-terrain. ${goldset.length} items, ~${WORDS} mots chacun.\n\n---\n\n`;
for (const it of goldset) {
  const info = INTENTIONS[it.intentionId];
  md += `### ${it.id}\n`;
  md += `**Intention visee :** ${info.desc}  _(rupture attendue : ${info.rupture ? 'OUI' : 'NON'})_\n\n`;
  md += `> ${it.text}\n\n`;
  md += `- Fidelite (0-5) : ____\n- Impact (0-5) : ____\n- Rupture (0-5 ou N/A) : ____\n- Note libre : \n\n---\n\n`;
}
writeFileSync(OUT_MD, md, 'utf8');
console.log(`books=${books.length} candidats=${cands.length} items=${goldset.length}`);
console.log(`ecrit: ${OUT_MD}`);
console.log(`ecrit: ${OUT_JSON}`);
