/**
 * OMEGA — PX-5 : ROBUSTNESS_PROBE du classifieur de fonctions dramatiques.
 * HONNÊTETÉ D'ABORD : pas de fausse vérité terrain (aucun label humain par
 * chapitre n'existe). On mesure ce qui est mesurable sans mentir :
 *
 *  A. STABILITÉ PRÉFIXE — le runtime C17 classifie avec les chapitres 1..n
 *     (contexte partiel). Si le label d'un chapitre CHANGE quand le livre se
 *     complète, la gate runtime agirait sur des étiquettes instables.
 *     Mesure : accord(label@préfixe, label@livre-complet) à 10 checkpoints.
 *
 *  B. SENSIBILITÉ AU CONTEXTE — label(chapitre seul) vs label(livre complet).
 *     L'écart borne la part contextuelle du classifieur.
 *
 *  C. DISTRIBUTIONS 3 LIVRES — sanité inter-corpus (le classifieur ne doit pas
 *     dégénérer en constante sur un corpus donné).
 *
 * Sortie : DRAMATIC_CLASSIFIER_ROBUSTNESS.json + verdict d'usage C17.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';

const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];

interface Labeled { readonly chapter: number; readonly fn: string }

type Slices = ReturnType<typeof importManuscript> extends { ok: true; value: { chapters: infer C } } | { ok: false } ? C : never;

function labelsOf(chapters: Slices, protagonists: readonly string[]): readonly Labeled[] {
  const audit = runDoctorAudit(chapters, protagonists, SEEDS);
  if (!audit.ok) throw new Error('audit');
  return audit.value.arc.chapterFunctions.map((f) => ({ chapter: f.chapter, fn: String(f.fn) }));
}

function probeBook(path: string, id: string): Record<string, unknown> {
  const imp = importManuscript(readFileSync(path, 'utf8'));
  if (!imp.ok) throw new Error(`import ${id}`);
  const chapters = imp.value.chapters;
  const protagonists = imp.value.castProposal.slice(0, 4).map((c) => c.name);
  const full = new Map(labelsOf(chapters, protagonists).map((l) => [l.chapter, l.fn]));

  /* A. stabilité préfixe : 10 checkpoints équirépartis. */
  const n = chapters.length;
  const checkpoints = Array.from({ length: 10 }, (_, i) => Math.max(2, Math.round(((i + 1) / 10) * n)));
  let agreePrefix = 0; let totalPrefix = 0;
  for (const k of [...new Set(checkpoints)]) {
    const prefixLabels = labelsOf(chapters.slice(0, k), protagonists);
    for (const l of prefixLabels.slice(-5)) { // les 5 derniers = position runtime
      totalPrefix += 1;
      if (full.get(l.chapter) === l.fn) agreePrefix += 1;
    }
  }

  /* B. chapitre seul vs livre complet. */
  let agreeSolo = 0;
  for (const ch of chapters) {
    const solo = labelsOf([ch], protagonists);
    if (solo[0] !== undefined && full.get(ch.chapter) === solo[0].fn) agreeSolo += 1;
  }

  /* C. distribution. */
  const dist: Record<string, number> = {};
  for (const fn of full.values()) dist[fn] = (dist[fn] ?? 0) + 1;

  return {
    book: id, chapters: n,
    prefixAgreementLast5: Number((agreePrefix / Math.max(1, totalPrefix)).toFixed(4)),
    soloVsFullAgreement: Number((agreeSolo / Math.max(1, n)).toFixed(4)),
    distribution: dist,
  };
}

const books = [
  { id: '18k_silence', path: 'runs/c7_book/MANUSCRIT.md' },
  { id: '88k_c8', path: 'runs/c8_book60k/MANUSCRIT_V1_FINAL.md' },
  { id: 'emp16', path: 'runs/next_book_emp16/MANUSCRIT_CANONICAL.md' },
];
const results = books.map((b) => probeBook(b.path, b.id));
const minPrefix = Math.min(...results.map((r) => r['prefixAgreementLast5'] as number));
const verdict = minPrefix >= 0.8
  ? 'PREFIX_STABLE — usage runtime C17 fondé (étiquettes stables en condition préfixe)'
  : minPrefix >= 0.6
    ? 'PREFIX_MODERATE — usage C17 en shadow/soft acceptable, gate dure interdite tant que la stabilité ne monte pas'
    : 'PREFIX_UNSTABLE — la gate runtime agirait sur du bruit : recalibrer le classifieur AVANT tout soft réel';
const out = { date: '2026-06-08', results, minPrefixAgreement: minPrefix, verdict, limits: 'Aucun label humain par chapitre : ces mesures bornent la STABILITÉ, pas la JUSTESSE. La justesse relève du Gold-Set GS-1/GS-2 (proxys calibrés).' };
writeFileSync('runs/next_book_emp16/DRAMATIC_CLASSIFIER_ROBUSTNESS.json', JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify(out, null, 1));
