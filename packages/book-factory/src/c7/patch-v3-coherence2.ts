/**
 * OMEGA — Phase C2b (P3) : D2 (réduire ex-35 à saisie+père, retirer sa confession — l'aveu
 * unique est désormais le chapitre neuf N14) + D3 (date « trente ans »→« vingt-cinq ans »
 * quand elle désigne le naufrage, ch46). Entrée COH1 ; sortie COH2 (manuscrit 50 ch complet).
 * Guardé buildCanonical + famRise=0. Canon 24bb55df intact.
 *   tsx src/c7/patch-v3-coherence2.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V3_COH1.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V3_COH2.md`;
const LEDGER = `${OUT}/COH2_LEDGER.jsonl`;

const CUT35 = "Ker-Morvan semblait s'être figée";
const BRIDGE35 = "L'aveu ne valait rien sans la preuve. Il fallait le registre lui-même, celui qu'Yvon venait de nommer du bout des lèvres. Garcia n'attendit pas le matin.\n\n";
const DATE_FROM = 'il y a trente ans, répondit Yvon';
const DATE_TO = 'il y a vingt-cinq ans, répondit Yvon';

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
function parse(md: string): Array<{ n: number; prose: string }> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const out: Array<{ n: number; prose: string }> = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ n: Number(parts[i]), prose: (parts[i + 1] ?? '').trim() });
  return out;
}

async function main(): Promise<void> {
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  const chs = parse(readFileSync(INPUT, 'utf8'));
  const famBefore = famTotals(chs.map((c) => c.prose).join('\n\n'));

  let did35 = false; let did46 = false;
  for (const c of chs) {
    if (c.n === 35) {
      const idx = c.prose.indexOf(CUT35);
      if (idx < 0) { log({ id: 'D2', accepted: false, reason: 'CUT35_ABSENT' }); throw new Error('CUT35 absent'); }
      const wordsBefore = c.prose.split(/\s+/u).length;
      c.prose = BRIDGE35 + c.prose.slice(idx);
      did35 = true;
      log({ id: 'D2', accepted: true, rule: 'ex-35 réduit à saisie+père (confession retirée)', wordsBefore, wordsAfter: c.prose.split(/\s+/u).length, keepsFather: c.prose.includes('son propre père') && c.prose.includes('Dette acquittée') });
    }
    if (c.n === 46) {
      const n = c.prose.split(DATE_FROM).length - 1;
      if (n !== 1) { log({ id: 'D3', accepted: false, reason: `DATE_COUNT=${n}` }); throw new Error(`DATE anchor ${n}`); }
      c.prose = c.prose.replace(DATE_FROM, DATE_TO); did46 = true;
      log({ id: 'D3', accepted: true, rule: 'trente ans -> vingt-cinq ans (naufrage, ch46)' });
    }
  }
  if (!did35 || !did46) throw new Error(`missing edit did35=${did35} did46=${did46}`);

  const md = chs.map((c) => `## Chapitre ${c.n}\n\n${c.prose}\n`).join('\n');
  const famAfter = famTotals(chs.map((c) => c.prose).join('\n\n'));
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const build = await buildCanonical(md, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: false });
  const pass = famRise.length === 0 && build.ok;
  log({ event: 'RESULT', famRise, outputCanon: build.ok ? build.value.finalHash : 'FAIL', narrativeClean: build.ok ? build.value.cleanliness.NARRATIVE_CLEAN : null, langClean: build.ok ? build.value.cleanliness.LANG_CLEAN : null, words: build.ok ? build.value.words : null, verdict: pass ? 'PASS' : 'FAIL' });
  if (pass) writeFileSync(OUT_MS, md, 'utf8');
  console.log(`COH2_DONE verdict=${pass ? 'PASS' : 'FAIL'} famRise=[${famRise.join(',')}] outCanon=${build.ok ? build.value.finalHash.slice(0, 12) : 'FAIL'} words=${build.ok ? build.value.words : '?'} written=${pass}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
