/** OMEGA — analyse seed ledger pour PROPOSER 2 cibles de micro-payoff (GO 3-IA :
 *  PROPOSE, zéro génération). Sur WORKING.md (V3 + 3 reinforces). Repère les fils
 *  plantés mais NON soldés (UNPAID) par acte → candidats payoff local sûrs. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { analyzeArcCoherence } from '../coherence/arc-coherence.js';
import { importManuscript } from '../doctor/manuscript-import.js';

const WORKING = 'runs/patch_v3/WORKING.md';
const SRC = existsSync(WORKING) ? WORKING : 'runs/duel_gemma/MANUSCRIT.md';
const SEEDS = ['phare', 'naufrage', 'registre', 'photo', 'lettre', 'clé', 'carnet', 'journal', 'tempête', 'marée', 'empreinte', 'médaille', 'disparu', 'corps', 'cargo'];

const imp = importManuscript(readFileSync(SRC, 'utf8'));
if (!imp.ok) { console.error('IMPORT_FAIL'); process.exitCode = 1; }
else {
  const chapters = imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose }));
  const arc = analyzeArcCoherence(chapters, { seeds: SEEDS });
  if (!arc.ok) { console.error('ARC_FAIL'); process.exitCode = 1; }
  else {
    const act = (ch: number | 'ABSENT'): string => ch === 'ABSENT' ? '—' : ch <= 17 ? 'acte1' : ch <= 34 ? 'acte2' : 'acte3';
    const rows = arc.value.seedLedger
      .filter((s) => s.plantedChapter !== 'ABSENT')
      .map((s) => ({
        seed: s.seed, planted: s.plantedChapter, plantedAct: act(s.plantedChapter),
        recalls: s.recallChapters.length, lastRecall: s.recallChapters[s.recallChapters.length - 1] ?? s.plantedChapter,
        payoff: s.payoffChapter,
        status: s.payoffChapter === 'UNPAID' ? 'UNPAID' : s.payoffChapter === 'UNCERTAIN_LATE_RECALL' ? 'UNCERTAIN_LATE' : `PAID@${String(s.payoffChapter)}`,
      }))
      .sort((a, b) => (a.planted as number) - (b.planted as number));
    const out = { phase: 'SEED_PAYOFF_ANALYSIS', date: '2026-06-09', source: SRC, rows };
    writeFileSync('runs/SEED_PAYOFF_ANALYSIS.json', JSON.stringify(out, null, 2), 'utf8');
    console.log(rows.map((r) => `${r.seed}: planté ch${String(r.planted)}(${r.plantedAct}) recalls=${r.recalls} last=ch${String(r.lastRecall)} → ${r.status}`).join('\n'));
  }
}
