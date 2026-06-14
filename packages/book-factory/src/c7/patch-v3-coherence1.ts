/**
 * OMEGA — Phase C1 (P3) : cohérence carte personnages (Architecte 2026-06-12).
 * Décision : Dubois = victime/gardien (= le maître-chanteur tué) ; Yvon = cerveau du meurtre ;
 * l'homme du môle = Marc (pas Dubois). 4 corrections ancrées des lignes où Dubois (mort) agit
 * au présent ou est l'homme du môle. Reste du texte = past tense cohérent, non touché.
 * Entrée = DATEFIX ; sortie = NOUVEAU fichier. Canon JAMAIS écrasé.
 *   tsx packages/book-factory/src/c7/patch-v3-coherence1.ts   (cwd = packages/book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V3_DATEFIX.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V3_COH1.md`;
const LEDGER = `${OUT}/COH1_LEDGER.jsonl`;

interface Edit { id: string; anchor: string; repl: string; rule: string; }
const EDITS: Edit[] = [
  { id: 'C44a', anchor: "L'homme du môle, c'est Dubois.", repl: "L'homme du môle, c'est Marc.", rule: 'môle=Marc (Dubois=victime morte)' },
  { id: 'C44b', anchor: 'comme un coup de poing. Dubois. Le nom qui apparaissait dans les marges', repl: 'comme un coup de poing. Marc. Le nom qui apparaissait dans les marges', rule: 'môle=Marc' },
  { id: 'C30a', anchor: 'Dubois pouvait organiser sa défense ou effacer des traces', repl: 'le cercle pouvait organiser sa défense ou effacer des traces', rule: 'Dubois mort: pas d action présente' },
  { id: 'C30b', anchor: 'Si Dubois apprend que je vous ai parlé de la cale', repl: 'Si les autres apprennent que je vous ai parlé de la cale', rule: 'Dubois mort: pas d action présente' },
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
  log({ event: 'BASE', input: INPUT, inputCanon: bBuild.ok ? bBuild.value.finalHash : 'FAIL', families: famBefore, duboisCount: countOcc(text, 'Dubois') });

  let applied = 0; let halted: string | null = null;
  for (const e of EDITS) {
    const n = countOcc(text, e.anchor);
    if (n !== 1) { log({ id: e.id, accepted: false, reason: `ANCHOR_COUNT=${n}`, anchor: e.anchor }); halted = `${e.id} ANCHOR_COUNT=${n}`; break; }
    text = text.replace(e.anchor, e.repl);
    applied += 1;
    log({ id: e.id, accepted: true, rule: e.rule });
  }

  const famAfter = famTotals(text);
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const aBuild = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });
  const pass = applied === EDITS.length && famRise.length === 0 && aBuild.ok;
  log({ event: 'RESULT', applied, total: EDITS.length, halted, famRise, outputCanon: aBuild.ok ? aBuild.value.finalHash : 'FAIL',
    narrativeClean: aBuild.ok ? aBuild.value.cleanliness.NARRATIVE_CLEAN : null, langClean: aBuild.ok ? aBuild.value.cleanliness.LANG_CLEAN : null,
    locksIntact: aBuild.ok ? aBuild.value.cleanliness.AUTHOR_LOCKS_INTACT : null, words: aBuild.ok ? aBuild.value.words : null,
    duboisAfter: countOcc(text, 'Dubois'), marcAfter: countOcc(text, 'Marc'), verdict: pass ? 'PASS' : 'FAIL' });
  if (pass) writeFileSync(OUT_MS, text, 'utf8');
  console.log(`COH1_DONE verdict=${pass ? 'PASS' : 'FAIL'} applied=${applied}/${EDITS.length} famRise=[${famRise.join(',')}] outCanon=${aBuild.ok ? aBuild.value.finalHash.slice(0, 12) : 'FAIL'} written=${pass}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
