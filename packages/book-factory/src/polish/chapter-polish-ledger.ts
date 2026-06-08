/**
 * OMEGA — PE-2 : CHAPTER_POLISH_LEDGER sur V3 gemma4 (BASE_POLISH).
 * 7 axes/chapitre. Axes CALC-mesurés vs axes 3IA_REVIEW (contrôle = croisement
 * 3 IA, pas lecture humaine). Aucun patch ici — détecte et priorise (chirurgie
 * en PE-3, créatif → AUTHOR_REVIEW).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';
import { scanSemanticResidue } from '../doctor/semantic-residue.js';
import { chapterPolishRow, scanDialogueMode, scanPassiveCharacters } from './editorial-scanners.js';

const BASE = 'runs/duel_gemma/MANUSCRIT.md';
const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];
const CAST = ['Léna', 'Garcia', 'Yvon', 'Gaspard', 'Dubois', 'Henri', 'Maryvonne', 'Jean'];
const TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village', 'la peur', 'la mer', 'le vent'];

function cv(prose: string): number {
  const l = prose.split(/(?<=[.!?…»])\s+/u).map((s) => s.trim().split(/\s+/u).length).filter((n) => n > 1);
  if (l.length < 3) return 0;
  const m = l.reduce((a, b) => a + b, 0) / l.length;
  return Number((Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length) / Math.max(1, m)).toFixed(3));
}
function ticDensity(prose: string): number {
  const w = prose.split(/\s+/u).filter((x) => x.length > 0).length || 1;
  return Number(Math.max(...TICS.map((t) => (((prose.toLowerCase().match(new RegExp(t.replace(/ /gu, '\\s+'), 'gu')) ?? []).length * 1000) / w))).toFixed(2));
}

function main(): void {
  const imp = importManuscript(readFileSync(BASE, 'utf8'));
  if (!imp.ok) throw new Error('import');
  const chapters = imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose }));
  const audit = runDoctorAudit(imp.value.chapters, imp.value.castProposal.slice(0, 4).map((c) => c.name), SEEDS);
  const fnByCh = new Map<number, string>();
  const seedPayoff = new Map<number, string[]>();
  if (audit.ok) {
    for (const f of audit.value.arc.chapterFunctions) fnByCh.set(f.chapter, String(f.fn));
    for (const s of audit.value.arc.seedLedger) if (typeof s.payoffChapter === 'number') { const a = seedPayoff.get(s.payoffChapter) ?? []; a.push(s.seed); seedPayoff.set(s.payoffChapter, a); }
  }
  const residue = scanSemanticResidue(chapters);
  const reditByCh = new Map<number, number>();
  if (residue.ok) for (const f of residue.value.findings) if (f.kind === 'FUNCTIONAL_REDUNDANCY') reditByCh.set(f.chapter, (reditByCh.get(f.chapter) ?? 0) + 1);

  const rows = chapters.map((ch) => {
    const base = chapterPolishRow(ch, CAST);
    const dia = scanDialogueMode(ch.prose);
    const active = CAST.filter((c) => new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u').test(ch.prose)).filter((c) => !scanPassiveCharacters(ch.prose, [c]).includes(c));
    const fn = fnByCh.get(ch.chapter) ?? 'NA';
    const tic = ticDensity(ch.prose);
    const redites = reditByCh.get(ch.chapter) ?? 0;
    /* Action recommandée (dérivée des signaux CALC ; le créatif reste 3IA_REVIEW). */
    const flags: string[] = [];
    if (base.comfortRuns >= 2) flags.push('RENFORCER (passages de confort)');
    if (dia.conflictRatio >= 0 && dia.conflictRatio < 0.3) flags.push('DIALOGUE→sous-texte/conflit (3IA_REVIEW)');
    if (active.length === 0) flags.push('AUCUN personnage moteur (3IA_REVIEW)');
    if (fn === 'TRANSITION' && base.comfortRuns >= 2) flags.push('TRANSITION molle — candidat coupe/fusion');
    if (redites > 0) flags.push('REDITE de fonction (REPAIR/fusion)');
    if (tic > 1.5) flags.push(`TIC élevé ${tic}/1000w`);
    return {
      chapter: ch.chapter, fonction: fn, personnagesMoteurs: active, personnagesPassifs: base.passiveCharacters,
      dialogueConflictRatio: dia.conflictRatio, comfortRuns: base.comfortRuns, comfortRatio: base.comfortRatio,
      rythmeCv: cv(ch.prose), ticMax: tic, reditesFonction: redites,
      grainesPayees: seedPayoff.get(ch.chapter) ?? [],
      priorite: flags.length >= 3 ? 'HIGH' : flags.length >= 1 ? 'MED' : 'LOW', actions: flags,
      axes3iaReview: ['charisme de scène', 'naturel du dialogue', 'révélation qui blesse', 'envie de tourner la page'],
    };
  });

  const summary = {
    base: 'V3 gemma4 (BASE_POLISH)', chapters: rows.length,
    high: rows.filter((r) => r.priorite === 'HIGH').length, med: rows.filter((r) => r.priorite === 'MED').length, low: rows.filter((r) => r.priorite === 'LOW').length,
    chaptersNoMover: rows.filter((r) => r.personnagesMoteurs.length === 0).map((r) => r.chapter),
    transitionsMolles: rows.filter((r) => r.actions.some((a) => a.includes('TRANSITION molle'))).map((r) => r.chapter),
    reditesChapters: rows.filter((r) => r.reditesFonction > 0).map((r) => r.chapter),
    payoffByAct: { acte1_1to17: [...seedPayoff.keys()].filter((k) => k <= 17).length, acte2_18to34: [...seedPayoff.keys()].filter((k) => k > 17 && k <= 34).length, acte3_35to50: [...seedPayoff.keys()].filter((k) => k > 34).length },
    note: 'Axes 3IA_REVIEW = contrôle par croisement Gemini+ChatGPT+Claude (pas lecture Francky). Patch créatif JAMAIS auto — PE-3 ne touche que le déterministe-sûr.',
  };
  writeFileSync('runs/CHAPTER_POLISH_LEDGER.json', JSON.stringify({ summary, rows }, null, 2), 'utf8');
  const md = ['# CHAPTER_POLISH_LEDGER — V3 gemma4', '', `HIGH ${summary.high} · MED ${summary.med} · LOW ${summary.low} · sans personnage moteur : ${summary.chaptersNoMover.length} · transitions molles : ${summary.transitionsMolles.length} · redites : ${summary.reditesChapters.length}`, '', 'payoffs par acte : acte1=' + summary.payoffByAct.acte1_1to17 + ' acte2=' + summary.payoffByAct.acte2_18to34 + ' acte3=' + summary.payoffByAct.acte3_35to50 + ' (back-loading si acte3 ≫ acte1)', '', '| ch | fn | moteurs | conflit | confort | redite | tic | priorité | actions |', '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.chapter} | ${r.fonction} | ${r.personnagesMoteurs.join(',') || '∅'} | ${r.dialogueConflictRatio} | ${r.comfortRuns} | ${r.reditesFonction} | ${r.ticMax} | ${r.priorite} | ${r.actions.join(' ; ') || '—'} |`)].join('\n');
  writeFileSync('runs/CHAPTER_POLISH_LEDGER.md', md, 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main();
