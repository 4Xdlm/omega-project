/**
 * OMEGA — Phase B (P3) : normalisation des dates du naufrage -> 1998 (Architecte 2026-06-12).
 * Corrige les 3 dates divergentes (ch47 « quarante ans », ch45 « vingt ans », ch29 « dix ans »)
 * en « 1998 », cohérent avec ch20/ch42. Remplacement ancré, chaque ancre vérifiée UNIQUE
 * book-wide. Guardé buildCanonical. Entrée = AP8 ; sortie = NOUVEAU fichier. Canon JAMAIS écrasé.
 *   tsx packages/book-factory/src/c7/patch-v3-datefix.ts   (cwd = packages/book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V3_AP8.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V3_DATEFIX.md`;
const LEDGER = `${OUT}/DATEFIX_LEDGER.jsonl`;

interface Edit { id: string; anchor: string; repl: string; rule: string; }
const EDITS: Edit[] = [
  { id: 'D47', anchor: 'Celui de quarante ans', repl: 'Celui de 1998', rule: 'date naufrage 40->1998 (ch47)' },
  { id: 'D45', anchor: "naufrage d'il y a vingt ans n'était pas un accident", repl: 'naufrage de 1998 n\'était pas un accident', rule: 'date naufrage 20->1998 (ch45)' },
  { id: 'D29', anchor: "mort dans le naufrage d'il y a dix ans", repl: 'mort dans le naufrage de 1998', rule: 'date naufrage 10->1998 (ch29)' },
];

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
function countOcc(text: string, s: string): number { return text.split(s).length - 1; }

async function main(): Promise<void> {
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  let text = readFileSync(INPUT, 'utf8');
  const famBefore = famTotals(text);
  const bBuild = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });
  log({ event: 'BASE', input: INPUT, inputCanon: bBuild.ok ? bBuild.value.finalHash : 'FAIL', families: famBefore });

  let applied = 0; let halted: string | null = null;
  for (const e of EDITS) {
    const n = countOcc(text, e.anchor);
    if (n !== 1) { log({ id: e.id, accepted: false, reason: `ANCHOR_COUNT=${n}`, anchor: e.anchor }); halted = `${e.id} ANCHOR_COUNT=${n}`; break; }
    text = text.replace(e.anchor, e.repl);
    applied += 1;
    log({ id: e.id, accepted: true, rule: e.rule, anchor: e.anchor, repl: e.repl });
  }

  const famAfter = famTotals(text);
  const famDelta = Object.keys(famBefore).filter((k) => famBefore[k] !== famAfter[k]).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const aBuild = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });
  const pass = applied === EDITS.length && famRise.length === 0 && aBuild.ok;
  log({ event: 'RESULT', applied, total: EDITS.length, halted, famDelta, famRise, outputCanon: aBuild.ok ? aBuild.value.finalHash : 'FAIL',
    narrativeClean: aBuild.ok ? aBuild.value.cleanliness.NARRATIVE_CLEAN : null, langClean: aBuild.ok ? aBuild.value.cleanliness.LANG_CLEAN : null,
    locksIntact: aBuild.ok ? aBuild.value.cleanliness.AUTHOR_LOCKS_INTACT : null, words: aBuild.ok ? aBuild.value.words : null, verdict: pass ? 'PASS' : 'FAIL' });
  if (pass) writeFileSync(OUT_MS, text, 'utf8');
  console.log(`DATEFIX_DONE verdict=${pass ? 'PASS' : 'FAIL'} applied=${applied}/${EDITS.length} famDelta=[${famDelta.join(',')}] outCanon=${aBuild.ok ? aBuild.value.finalHash.slice(0, 12) : 'FAIL'} written=${pass}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
