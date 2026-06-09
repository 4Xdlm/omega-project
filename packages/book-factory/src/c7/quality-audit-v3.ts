/** OMEGA — AP-3 : audit éditorial complet du V3 patché (50 chap). Réutilise les
 *  scanners existants → QUALITY_REPORT_V3.md : carte par chapitre pour orienter la
 *  RELECTURE HUMAINE (le souffle, que la machine ne mesure pas). Ne modifie rien. */

import { readFileSync, writeFileSync } from 'node:fs';

import { analyzeArcCoherence } from '../coherence/arc-coherence.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { chapterPolishRow } from '../polish/editorial-scanners.js';
import { transitionSignals } from '../polish/transition-triage.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';

const CAST = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Thomas'];
const SEEDS = ['phare', 'naufrage', 'registre', 'clé', 'lettre', 'carnet', 'nom', 'corps'];

const imp = importManuscript(readFileSync('runs/patch_v3/MANUSCRIT_V3_PATCHED.md', 'utf8'));
if (!imp.ok) { console.error('IMPORT_FAIL'); process.exitCode = 1; }
else {
  const chapters = imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose }));
  const arc = analyzeArcCoherence(chapters, { seeds: SEEDS });
  const fnByCh = arc.ok ? new Map(arc.value.chapterFunctions.map((r) => [r.chapter, r.fn])) : new Map<number, string>();

  interface Row { chapter: number; words: number; fn: string; comfortRuns: number; comfortRatio: number; conflict: number; passive: number; atmo: number; drama: number; lang: number; priority: string }
  const rows: Row[] = chapters.map((c) => {
    const pr = chapterPolishRow({ chapter: c.chapter, prose: c.prose }, CAST);
    const s = transitionSignals(c.chapter, c.prose);
    return {
      chapter: c.chapter, words: c.prose.split(/\s+/u).filter((w) => w.length > 0).length,
      fn: String(fnByCh.get(c.chapter) ?? '—'), comfortRuns: pr.comfortRuns, comfortRatio: pr.comfortRatio,
      conflict: pr.dialogueConflictRatio, passive: pr.passiveCharacters.length, atmo: s.atmosphereDensity,
      drama: s.dramaHits, lang: scanEnglishResiduals(c.prose).length, priority: pr.polishPriority,
    };
  });

  // Le binaire HIGH (PE-1) sur-flagge (~50/50) → inutile pour prioriser. On RANGE
  // par score de faiblesse RELATIF et on sort un top-10 (où l'œil humain rend le plus).
  const score = (r: Row): number => r.comfortRatio + r.passive * 0.3 + (r.conflict >= 0 && r.conflict < 0.3 ? 0.5 : 0) + (r.drama === 0 ? 0.4 : 0) + (r.fn === 'TRANSITION' ? 0.3 : 0) + (r.atmo < 10 ? 0.2 : 0);
  const top = [...rows].sort((a, b) => score(b) - score(a)).slice(0, 10).map((r) => r.chapter);
  const totalLang = rows.reduce((a, r) => a + r.lang, 0);
  const fnDist: Record<string, number> = {};
  for (const r of rows) fnDist[r.fn] = (fnDist[r.fn] ?? 0) + 1;

  const md = [
    '# AUDIT ÉDITORIAL V3 PATCHÉ — carte pour la relecture humaine',
    `Base : MANUSCRIT_V3_PATCHED.md · ${chapters.length} chapitres · ${rows.reduce((a, r) => a + r.words, 0)} mots · résidus anglais total : **${totalLang}** (doit être 0).`,
    '',
    `**Fonctions dramatiques** : ${Object.entries(fnDist).map(([k, v]) => `${k}=${v}`).join(' · ')}`,
    `**À relire en priorité (top-10 par score de faiblesse RELATIF — pas un verdict, juste où l'œil humain rend le plus)** : ${top.join(', ')}`,
    `*(Le binaire "priorité" PE-1 flagge ~50/50 = bruit ; ignore-le, suis le top-10.)*`,
    '',
    '| Ch | mots | fn | confortRuns | confort | conflit-dial | passifs | atmo | drama | lang | priorité |',
    '|---:|---:|:--|---:|---:|---:|---:|---:|---:|---:|:--|',
    ...rows.map((r) => `| ${r.chapter} | ${r.words} | ${r.fn} | ${r.comfortRuns} | ${r.comfortRatio} | ${r.conflict} | ${r.passive} | ${r.atmo} | ${r.drama} | ${r.lang} | ${r.priority} |`),
    '',
    '**Lecture** : `confortRuns`/`confort` haut = passages qui meublent (à dynamiser ?) · `conflit-dial` bas = dialogue explicatif possible · `passifs` = personnages présents mais inertes · `atmo` = densité sensorielle · `lang` = résidu anglais (0 attendu). Ces axes ORIENTENT l\'œil humain ; ils ne jugent pas le souffle.',
  ].join('\n');
  writeFileSync('runs/patch_v3/QUALITY_REPORT_V3.md', md, 'utf8');
  console.log(JSON.stringify({ chapters: rows.length, totalLangResiduals: totalLang, topToRead: top, fnDist }, null, 1));
}
