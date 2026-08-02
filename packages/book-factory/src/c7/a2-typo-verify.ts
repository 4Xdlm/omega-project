/**
 * OMEGA — A2 : verification de la normalisation typographique sur le corpus GELE A0.
 *
 * Pourquoi le corpus gele plutot qu'une relance : relancer la generation
 * reintroduirait la variabilite Ollama (enveloppe A0 : 1084 +/- 57 mots) et ne
 * prouverait RIEN sur la typographie. Appliquer la normalisation aux 21 sorties
 * deja figees prouve directement que seule la surface change, a texte source
 * strictement identique.
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/a2-typo-verify.ts
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  normalizeFrenchTypography,
  wordsPreserved,
  typoDiff,
  type TypoRuleId,
} from '../seal/french-typography.js';

const SRC = 'runs/a0_baseline/candidates';
const OUT = 'runs/a0_baseline/typo_verify';

interface FileReport {
  readonly file: string;
  readonly shaBefore: string;
  readonly shaAfter: string;
  readonly wordsPreserved: boolean;
  readonly idempotent: boolean;
  readonly counts: Record<string, number>;
  readonly totalApplied: number;
  readonly aposStraightBefore: number;
  readonly aposTypoBefore: number;
  readonly aposStraightAfter: number;
  readonly aposTypoAfter: number;
  readonly diffSample: number;
}

function sha(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function count(s: string, re: RegExp): number {
  return (s.match(re) ?? []).length;
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();
  const reports: FileReport[] = [];
  const totals: Record<string, number> = {};

  for (const f of files) {
    const before = readFileSync(`${SRC}/${f}`, 'utf8');
    const r1 = normalizeFrenchTypography(before);
    const r2 = normalizeFrenchTypography(r1.text);
    const counts: Record<string, number> = {};
    for (const c of r1.counts) {
      counts[c.rule] = c.applied;
      totals[c.rule] = (totals[c.rule] ?? 0) + c.applied;
    }
    writeFileSync(`${OUT}/${f}`, r1.text, 'utf8');
    reports.push({
      file: f,
      shaBefore: sha(before),
      shaAfter: sha(r1.text),
      wordsPreserved: wordsPreserved(before, r1.text),
      idempotent: r2.text === r1.text && r2.totalApplied === 0,
      counts,
      totalApplied: r1.totalApplied,
      aposStraightBefore: count(before, /'/gu),
      aposTypoBefore: count(before, /’/gu),
      aposStraightAfter: count(r1.text, /'/gu),
      aposTypoAfter: count(r1.text, /’/gu),
      diffSample: typoDiff(before, r1.text).length,
    });
  }

  const allWords = reports.every((r) => r.wordsPreserved);
  const allIdem = reports.every((r) => r.idempotent);
  const sumBeforeStraight = reports.reduce((a, r) => a + r.aposStraightBefore, 0);
  const sumBeforeTypo = reports.reduce((a, r) => a + r.aposTypoBefore, 0);
  const sumAfterStraight = reports.reduce((a, r) => a + r.aposStraightAfter, 0);
  const sumAfterTypo = reports.reduce((a, r) => a + r.aposTypoAfter, 0);

  const manifest = {
    spec: 'A2_TYPOGRAPHY_VERIFICATION',
    source: 'runs/a0_baseline/candidates (corpus GELE A0, 21 sorties)',
    files: reports.length,
    invariants: {
      'INV-TYPO-01_idempotence': allIdem,
      'INV-TYPO-03_words_preserved': allWords,
    },
    ruleTotals: totals,
    apostrophes: {
      before: { straight: sumBeforeStraight, typographic: sumBeforeTypo },
      after: { straight: sumAfterStraight, typographic: sumAfterTypo },
    },
    reports,
  };
  writeFileSync(`${OUT}/A2_TYPO_REPORT.json`, JSON.stringify(manifest, null, 2), 'utf8');

  process.stdout.write(`[A2] ${reports.length} fichiers du corpus gele A0\n`);
  process.stdout.write(`[A2] INV-TYPO-01 idempotence      : ${allIdem ? 'PASS' : 'FAIL'}\n`);
  process.stdout.write(`[A2] INV-TYPO-03 mots preserves   : ${allWords ? 'PASS' : 'FAIL'}\n`);
  process.stdout.write('[A2] applications par regle :\n');
  for (const [k, v] of Object.entries(totals)) {
    process.stdout.write(`       ${(k as TypoRuleId).padEnd(24)} ${String(v).padStart(6)}\n`);
  }
  process.stdout.write(
    `[A2] apostrophes AVANT : droite ${sumBeforeStraight} / typo ${sumBeforeTypo}\n` +
      `[A2] apostrophes APRES : droite ${sumAfterStraight} / typo ${sumAfterTypo}\n`,
  );
  if (!allIdem || !allWords) {
    process.stderr.write('[A2] ECHEC INVARIANT — ne pas commiter\n');
    process.exitCode = 1;
  }
}

main();
