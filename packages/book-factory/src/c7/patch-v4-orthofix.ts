/**
 * OMEGA — ORTHO-FIX V4 (perfectionnement Doctor 2026-07-19) : 2 vraies fautes FR
 * détectées par scan orthographique (pyspellchecker FR + tri) sur COH5 :
 *   (1) « ships-logs » (franglais, dialogue) -> « journaux de bord ».
 *   (2) « férocielle » (néologisme) -> « féroce ».
 * Tout le reste des OOV = FR rare valide (cœur, métronomique, contreplaqué, omerta…) ou noms propres.
 * Entrée MANUSCRIT_V4_COH5.md -> sortie MANUSCRIT_V4_COH6.md. Guardé buildCanonical + famRise=0 + phrase finale.
 *   tsx src/c7/patch-v4-orthofix.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V4_COH5.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V4_COH6.md`;
const LEDGER = `${OUT}/COH6_ORTHO_LEDGER.jsonl`;
const FINAL_LINE = 'La justice est une notion urbaine';

interface Edit { id: string; anchor: string; repl: string; }
const EDITS: Edit[] = [
  { id: 'ships-logs', anchor: 'Mon père avait ships-logs, des copies de tout.', repl: 'Mon père tenait des journaux de bord, des copies de tout.' },
  { id: 'ferocielle', anchor: 'une vigilance férocielle', repl: 'une vigilance féroce' },
];

function famTotals(text: string): Record<string, number> {
  const p = measureRepetition(text);
  const o: Record<string, number> = { exactRepeats: p.exactRepeatCount };
  for (const f of p.families) o[f.family] = f.total;
  return o;
}
function countOcc(t: string, s: string): number { if (s.length === 0) return 0; let n = 0; let i = t.indexOf(s); while (i >= 0) { n++; i = t.indexOf(s, i + s.length); } return n; }
function rulesOnlyLedger(): AuthorDecisionLedger {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: Array<{ anchorExcerpt: string | null }> };
  return AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: parsed.decisions.filter((d) => d.anchorExcerpt === null) }));
}

async function main(): Promise<void> {
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  let text = readFileSync(INPUT, 'utf8');
  const famBefore = famTotals(text);

  let applied = 0; const missed: string[] = [];
  for (const e of EDITS) {
    const n = countOcc(text, e.anchor);
    if (n !== 1) { missed.push(`${e.id}(${n})`); log({ id: e.id, accepted: false, count: n }); continue; }
    text = text.replace(e.anchor, e.repl); applied += 1; log({ id: e.id, accepted: true });
  }

  const stillBad = /\bships\b|\blogs\b|férocielle/iu.test(text);
  const finalOk = text.includes(FINAL_LINE);
  const famAfter = famTotals(text);
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const build = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: false });
  const pass = applied === EDITS.length && !stillBad && finalOk && famRise.length === 0 && build.ok;
  if (pass) writeFileSync(OUT_MS, text, 'utf8');
  log({ event: 'RESULT', applied, missed, stillBad, finalOk, famRise, langClean: build.ok ? build.value.cleanliness.LANG_CLEAN : null, words: build.ok ? build.value.words : null, outCanon: build.ok ? build.value.finalHash : 'FAIL', verdict: pass ? 'PASS' : 'FAIL' });
  console.log(`ORTHOFIX_DONE verdict=${pass ? 'PASS' : 'FAIL'} applied=${applied}/${EDITS.length} missed=[${missed.join(',')}] stillBad=${stillBad} famRise=[${famRise.join(',')}] words=${build.ok ? build.value.words : 'FAIL'} canon=${build.ok ? build.value.finalHash.slice(0, 12) : 'FAIL'}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
