/**
 * OMEGA — Phase D : assemblage V4 DRAFT (chapitres COH1 conservés + 6 slots générés) dans
 * l'ordre causal N1..N25, renumérotés 1..25. buildCanonical pour certif propreté book-level +
 * measureRepetition (vérifier que les clusters ne réémergent pas). V4 = DRAFT, ear-pending.
 * Canon V3 24bb55df JAMAIS touché.
 *   tsx packages/book-factory/src/c7/gen-v4-assemble.ts   (cwd = packages/book-factory)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const COH1 = `${OUT}/MANUSCRIT_V3_COH2.md`;
const SLOTS = `${OUT}/v4_slots`;
const OUT_MS = `${OUT}/MANUSCRIT_V4_DRAFT.md`;
const REPORT = `${OUT}/V4_ASSEMBLY_REPORT.json`;

// slot -> source : { ch: <num COH1> } ou { gen: '<fichier slot>' }
type Src = { ch: number } | { gen: string };
const ORDER: Src[] = [
  { ch: 1 }, { ch: 2 }, { gen: 'N3_garcia_cote' }, { ch: 4 }, { ch: 29 }, { ch: 13 }, { ch: 11 },
  { gen: 'N8_lena_pere' }, { ch: 42 }, { ch: 30 }, { ch: 20 }, { gen: 'N12_yvon_nuit' }, { ch: 46 },
  { gen: 'N14_aveu' }, { ch: 35 }, { ch: 41 }, { ch: 39 }, { ch: 45 }, { gen: 'N19_pere_garcia' },
  { ch: 44 }, { ch: 48 }, { ch: 47 }, { ch: 49 }, { ch: 50 }, { gen: 'N25_coda' },
];

function chapters(md: string): Map<number, string> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const m = new Map<number, string>();
  for (let i = 1; i < parts.length; i += 2) m.set(Number(parts[i]), (parts[i + 1] ?? '').trim());
  return m;
}
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

async function main(): Promise<void> {
  const chs = chapters(readFileSync(COH1, 'utf8'));
  const lines: string[] = [];
  const map: Array<Record<string, unknown>> = [];
  let n = 0; const missing: string[] = [];
  for (const src of ORDER) {
    n += 1;
    let prose = '';
    if ('ch' in src) { prose = chs.get(src.ch) ?? ''; if (!prose) missing.push(`ch${src.ch}`); map.push({ slot: n, source: `COH1 ch${src.ch}` }); }
    else { const f = `${SLOTS}/${src.gen}.md`; if (existsSync(f)) prose = readFileSync(f, 'utf8').trim(); else missing.push(src.gen); map.push({ slot: n, source: `GEN ${src.gen}` }); }
    lines.push(`## Chapitre ${n}`, '', prose, '');
  }
  const v4 = lines.join('\n');
  writeFileSync(OUT_MS, v4, 'utf8');

  const fam = famTotals(v4);
  const build = await buildCanonical(v4, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: false });
  const words = v4.split(/\s+/u).filter((w) => w.length > 0).length;
  const rep = build.ok ? build.value.cleanliness : null;
  const report = { source: COH1, chapters: n, words, missing, finalHash: build.ok ? build.value.finalHash : 'BUILD_FAIL',
    cleanliness: rep, families: fam, map };
  writeFileSync(REPORT, JSON.stringify(report, null, 1), 'utf8');
  console.log(`ASSEMBLE_DONE chapters=${n} words=${words} missing=[${missing.join(',')}] hash=${build.ok ? build.value.finalHash.slice(0, 12) : 'FAIL'}`);
  if (rep) console.log(`CLEAN narrative=${rep.NARRATIVE_CLEAN} lang=${rep.LANG_CLEAN} semantic=${rep.SEMANTIC_CLEAN} seam=${rep.SEAM_CLEAN} | fam ${JSON.stringify(fam)}`);
}
main().catch((e: unknown) => { console.error('FATAL', e); process.exitCode = 1; });
