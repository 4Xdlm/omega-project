/** OMEGA — AP-4 : tic forensic au niveau PHRASE (n-grammes récurrents trans-chapitres).
 *  La gate de tics (build-canonical) ne surveille que des MOTS isolés ; un tic de
 *  PHRASE (« le temps diffère ici ») passe. Ce forensic cartographie les n-grammes
 *  de contenu qui se répètent à travers les chapitres → tics réels. Diagnostic,
 *  ne modifie rien. Écrit runs/patch_v3/TIC_FORENSIC_V3.md. */

import { readFileSync, writeFileSync } from 'node:fs';

import { importManuscript } from '../doctor/manuscript-import.js';

const STOP = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'à', 'en', 'dans', 'sur', 'que', 'qui', 'ne', 'pas', 'se', 'sa', 'son', 'ses', 'il', 'elle', 'était', 'avait', 'd', 'l', 'au', 'aux', 'ce', 'cette', 'ces', 'pour', 'par', 'avec', 'plus', 'comme', 'sans', 'mais', 'ou', 'où', 'dont', 'leur', 'lui', 'y', 'on', 'nous', 'vous', 'ils', 'elles', 'est', 'sont', 'être', 'avoir', 'sa', 'ya', 'a', 's', 'n', 'qu', 'me', 'te', 'si', 'leurs', 'mon', 'ma', 'tout', 'toute']);

function tokens(prose: string): string[] {
  return prose.normalize('NFC').toLowerCase().replace(/[«»"().,;:!?…—–-]/gu, ' ').split(/\s+/u).filter((w) => w.length > 0);
}
// Tokens d'ENTITÉ (cast + lieu) : leur récurrence est normale, pas un tic stylistique.
const NAMES = new Set(['ker', 'morvan', 'léna', 'lena', 'garcia', 'yvon', 'gaspard', 'squarcioni', 'marchetti', 'thomas', 'henri', 'vallet']);
function ngrams(words: readonly string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) {
    const g = words.slice(i, i + n);
    if (g.every((w) => STOP.has(w))) continue; // n-gramme tout-stopword = bruit
    if (g.some((w) => NAMES.has(w))) continue; // entité (nom/lieu) = pas un tic
    out.push(g.join(' '));
  }
  return out;
}

const imp = importManuscript(readFileSync('runs/patch_v3/MANUSCRIT_V3_PATCHED.md', 'utf8'));
if (!imp.ok) { console.error('IMPORT_FAIL'); process.exitCode = 1; }
else {
  const chapters = imp.value.chapters;
  const docFreq = new Map<string, Set<number>>();
  const total = new Map<string, number>();
  for (const c of chapters) {
    const w = tokens(c.prose);
    for (const n of [3, 4]) {
      for (const g of ngrams(w, n)) {
        total.set(g, (total.get(g) ?? 0) + 1);
        let s = docFreq.get(g); if (s === undefined) { s = new Set(); docFreq.set(g, s); }
        s.add(c.chapter);
      }
    }
  }
  // Tic = phrase présente dans BEAUCOUP de chapitres (récurrence trans-livre).
  const rows = [...docFreq.entries()]
    .map(([phrase, set]) => ({ phrase, chapters: set.size, total: total.get(phrase) ?? 0, words: phrase.split(' ').length }))
    .filter((r) => r.chapters >= 5 && r.total >= 6) // seuils : ≥5 chapitres, ≥6 occurrences
    .sort((a, b) => b.chapters - a.chapters || b.total - a.total)
    .slice(0, 40);

  const md = [
    '# TIC FORENSIC V3 — n-grammes récurrents trans-chapitres (niveau PHRASE)',
    `Base : MANUSCRIT_V3_PATCHED.md · ${chapters.length} chapitres. Tic = phrase de contenu présente dans ≥5 chapitres ET ≥6 fois.`,
    `**${rows.length} tics de phrase détectés** (la gate de tics actuelle, mono-mot, ne les voit pas → trou identifié).`,
    '',
    '| Phrase | chapitres | occurrences | mots |',
    '|:--|---:|---:|---:|',
    ...rows.map((r) => `| « ${r.phrase} » | ${r.chapters} | ${r.total} | ${r.words} |`),
    '',
    '**Lecture** : « chapitres » = sur combien de chapitres la phrase revient (récurrence structurelle). Les plus hauts = tics book-wide à surveiller pour la relecture / un futur gate phrase-niveau. Ce n\'est PAS un verdict de style — certaines récurrences sont des motifs voulus (à l\'œil humain de trancher).',
  ].join('\n');
  writeFileSync('runs/patch_v3/TIC_FORENSIC_V3.md', md, 'utf8');
  console.log(JSON.stringify({ ticPhrases: rows.length, top10: rows.slice(0, 10).map((r) => `${r.phrase} (${r.chapters}ch/${r.total}x)`) }, null, 1));
}
