/**
 * OMEGA — PE-7 : applique TRANSITION_TRIAGE aux 19 transitions molles du work
 * order 3-IA (V3 gemma4) + ch.25 en CONTRÔLE (verdict HUMAIN KEEP). Produit le
 * tri CUT_MERGE / REINFORCE / KEEP exigé par ChatGPT AVANT toute coupe. NE coupe
 * rien (loi PE-3 + INV-TRIAGE-001). Écrit runs/TRANSITION_TRIAGE.json + .md.
 *
 * CONTRÔLE ch.25 : la station humaine a tranché KEEP (« atmosphère lourde utile »).
 * Si l'instrument classe ch.25 en CUT_MERGE, il SUR-PÉNALISE l'atmosphère (FAIL,
 * la crainte ChatGPT confirmée) ; s'il dit KEEP/REINFORCE, il est cohérent avec
 * l'œil humain (calibration validée par un point réel, esprit EMP-16).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { analyzeArcCoherence } from '../coherence/arc-coherence.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { transitionSignals, triageTransitions } from './transition-triage.js';
import type { TriageRow } from './transition-triage.js';

const FLAGGED = [1, 3, 4, 11, 12, 16, 20, 21, 24, 26, 32, 34, 36, 37, 38, 46, 48, 49, 50];
const CONTROL = [25]; // verdict humain KEEP — l'instrument NE doit PAS le couper

function main(): void {
  const text = readFileSync('runs/duel_gemma/MANUSCRIT.md', 'utf8');
  const imp = importManuscript(text);
  if (!imp.ok) { console.error('IMPORT_FAIL', JSON.stringify(imp.error)); process.exitCode = 1; return; }
  const chapters = imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose }));
  const arc = analyzeArcCoherence(chapters);
  if (!arc.ok) { console.error('ARC_FAIL', JSON.stringify(arc.error)); process.exitCode = 1; return; }
  const noveltyByCh = new Map(arc.value.chapterFunctions.map((r) => [r.chapter, r.noveltyVsPrev]));
  const fnByCh = new Map(arc.value.chapterFunctions.map((r) => [r.chapter, r.fn]));

  const targets = [...FLAGGED, ...CONTROL];
  const signals = chapters
    .filter((c) => targets.includes(c.chapter))
    .map((c) => transitionSignals(c.chapter, c.prose, noveltyByCh.get(c.chapter) ?? 1));
  const rows = triageTransitions(signals);

  const flaggedRows = rows.filter((r) => FLAGGED.includes(r.chapter));
  const controlRow = rows.find((r) => CONTROL.includes(r.chapter));
  const tally = (rs: readonly TriageRow[]): Record<string, number> => ({
    CUT_MERGE: rs.filter((r) => r.bucket === 'CUT_MERGE').length,
    REINFORCE: rs.filter((r) => r.bucket === 'REINFORCE').length,
    KEEP: rs.filter((r) => r.bucket === 'KEEP').length,
  });
  const controlVerdict = controlRow === undefined ? 'CH25_ABSENT'
    : controlRow.bucket === 'CUT_MERGE' ? 'FAIL — instrument sur-pénalise l\'atmosphère (ch.25 humain=KEEP)'
      : `PASS — instrument cohérent avec l'œil humain (ch.25 → ${controlRow.bucket}, humain=KEEP)`;

  const out = {
    phase: 'PE-7 TRANSITION_TRIAGE', date: '2026-06-08', base: 'V3 gemma4 (runs/duel_gemma)',
    mandate: 'ChatGPT : HOLD coupe / GO classification. Gemini : gate dramatique. Convergence = trier avant couper.',
    law: 'INV-TRIAGE-001 ne coupe rien · INV-TRIAGE-002 un acte dramatique n\'est jamais CUT · PE-3 créatif=3-IA.',
    flaggedTally: tally(flaggedRows),
    controlCh25: controlRow === undefined ? null : { ...controlRow, fn: fnByCh.get(25) ?? null },
    controlVerdict,
    rows: flaggedRows.map((r) => ({ ...r, fn: fnByCh.get(r.chapter) ?? null })),
    reading: 'CUT_MERGE = candidat coupe/fusion (à valider 3-IA) · REINFORCE = ajouter un acte/décision/micro-révélation (créatif, 3-IA) · KEEP = atmosphère défendable, NE PAS toucher. Le tri est un CLASSEMENT relatif, pas un oracle — décision finale 3-IA sur les nombres bruts.',
  };
  writeFileSync('runs/TRANSITION_TRIAGE.json', JSON.stringify(out, null, 2), 'utf8');

  const md = [
    '# PE-7 — TRANSITION_TRIAGE (V3 gemma4)', '',
    `**Mandat** : ${out.mandate}`, '',
    `**Tri des 19 transitions molles** : CUT_MERGE ${out.flaggedTally.CUT_MERGE} · REINFORCE ${out.flaggedTally.REINFORCE} · KEEP ${out.flaggedTally.KEEP}`, '',
    `**Contrôle ch.25** (humain=KEEP) : ${controlVerdict}`, '',
    '| Ch | fn(arc) | atmoDens | rythmeCV | confort | nouveauté | atmoScore | vide | drama | **BUCKET** |',
    '|---:|:--|---:|---:|---:|---:|---:|---:|---:|:--|',
    ...flaggedRows.map((r) => `| ${r.chapter} | ${fnByCh.get(r.chapter) ?? '—'} | ${r.atmosphereDensity} | ${r.rhythmCV} | ${r.comfortRatio} | ${r.noveltyVsPrev} | ${r.atmoScore} | ${r.emptiness} | ${r.dramaHits} | **${r.bucket}** |`),
    '',
    `> ${out.reading}`, '',
    '**Loi** : aucune coupe, aucune fusion, aucun renfort appliqué ici. Ce tri part au croisement 3-IA. Le module classe ; il ne touche pas le manuscrit.',
  ].join('\n');
  writeFileSync('runs/TRANSITION_TRIAGE.md', md, 'utf8');

  console.log(JSON.stringify({ flaggedTally: out.flaggedTally, controlVerdict, ch25: controlRow?.bucket ?? 'ABSENT' }, null, 1));
}
main();
