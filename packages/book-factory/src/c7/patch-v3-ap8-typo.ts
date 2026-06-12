/**
 * OMEGA — AP-8 : correction typo diacritique « différe » -> « diffère » (Francky 2026-06-12).
 * Passe gardée SÉPARÉE des tics. Remplacement word-boundary Unicode (\p{L} lookarounds) :
 * seul le mot entier « différe » est touché ; « différent/différence/différemment/différend/
 * différé/différer » restent INTACTS (sous-chaînes jamais affectées).
 * Entrée = candidat micro-lot 8 (bf2462ce). Sortie = NOUVEAU fichier. Canon JAMAIS écrasé.
 *   tsx packages/book-factory/src/c7/patch-v3-ap8-typo.ts   (cwd = packages/book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V3_MICROLOT8.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V3_AP8.md`;
const LEDGER = `${OUT}/AP8_TYPO_LEDGER.jsonl`;

const TYPO = /(?<!\p{L})différe(?!\p{L})/gu;
const CAP = /(?<!\p{L})Différe(?!\p{L})/gu;

function rulesOnlyLedger(): AuthorDecisionLedger {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: Array<{ anchorExcerpt: string | null }> };
  return AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: parsed.decisions.filter((d) => d.anchorExcerpt === null) }));
}
function famTotals(text: string): Record<string, number> {
  const p = measureRepetition(text);
  const o: Record<string, number> = { exactRepeats: p.exactRepeatCount };
  for (const f of p.families) o[f.family] = f.total;
  return o;
}
function countWord(text: string, w: string): number {
  const re = new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, 'gu');
  return (text.match(re) ?? []).length;
}

async function main(): Promise<void> {
  const before = readFileSync(INPUT, 'utf8');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  writeFileSync(LEDGER, '');

  const typoBefore = (before.match(TYPO) ?? []).length + (before.match(CAP) ?? []).length;
  // garde-fous : formes légitimes mesurées AVANT
  const legit = ['différent', 'différents', 'différente', 'différentes', 'différence', 'différences', 'différemment', 'différend', 'différends', 'différer', 'différé', 'différée', 'différés', 'différées', 'diffère', 'différa'];
  const legitBefore: Record<string, number> = {};
  for (const w of legit) legitBefore[w] = countWord(before, w);

  const after = before.replace(TYPO, 'diffère').replace(CAP, 'Diffère');
  const typoAfter = (after.match(TYPO) ?? []).length + (after.match(CAP) ?? []).length;
  const legitAfter: Record<string, number> = {};
  for (const w of legit) legitAfter[w] = countWord(after, w);

  // INVARIANT 1 : tous les mots légitimes inchangés
  const legitChanged = legit.filter((w) => legitBefore[w] !== ((w === 'diffère') ? legitAfter[w] - typoBefore : legitAfter[w]));
  // 'diffère' doit augmenter exactement de typoBefore ; les autres strictement inchangés
  const otherChanged = legit.filter((w) => w !== 'diffère' && legitBefore[w] !== legitAfter[w]);

  const famBefore = famTotals(before);
  const famAfter = famTotals(after);
  const famDelta = Object.keys(famBefore).filter((k) => famBefore[k] !== famAfter[k]).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);

  const bBuild = await buildCanonical(before, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });
  const aBuild = await buildCanonical(after, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });

  const pass = typoBefore === 2 && typoAfter === 0 && otherChanged.length === 0 && legitAfter['diffère'] === legitBefore['diffère'] + typoBefore && aBuild.ok;
  log({ event: 'AP8', input: INPUT, typoBefore, typoAfter, differeBefore: legitBefore['diffère'], differeAfter: legitAfter['diffère'],
    otherLegitChanged: otherChanged, famDelta, inputCanon: bBuild.ok ? bBuild.value.finalHash : 'FAIL',
    outputCanon: aBuild.ok ? aBuild.value.finalHash : 'FAIL', narrativeClean: aBuild.ok ? aBuild.value.cleanliness.NARRATIVE_CLEAN : null,
    langClean: aBuild.ok ? aBuild.value.cleanliness.LANG_CLEAN : null, locksIntact: aBuild.ok ? aBuild.value.cleanliness.AUTHOR_LOCKS_INTACT : null,
    words: aBuild.ok ? aBuild.value.words : null, verdict: pass ? 'PASS' : 'FAIL' });

  if (pass) writeFileSync(OUT_MS, after, 'utf8');
  console.log(`AP8_DONE verdict=${pass ? 'PASS' : 'FAIL'} typo=${typoBefore}->${typoAfter} otherLegitChanged=${otherChanged.length} famDelta=[${famDelta.join(',')}] outCanon=${aBuild.ok ? aBuild.value.finalHash.slice(0, 12) : 'FAIL'} written=${pass}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
