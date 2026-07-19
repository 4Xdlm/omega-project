/**
 * OMEGA — Phase C3 (P3) : corrections note de lecture R1/R2/ch24 (Francky 2026-07-18).
 * R1 : désamorcer les re-confessions les plus nettes (ch45=V4-18 recap montage → « déjà connu »
 *      + pivot preuve ; ch47=V4-22 second restatement du naufrage → « on connaît, le nom »).
 * R2 : sceller l'allégeance de Léna post-rupture (ch49=V4-23).
 * ch24 (ch50=V4-24) : trim densité + coupe du paragraphe qui DOUBLE l'ouverture (cadavre décrit
 *      2×, incohérent sur le perron) + retrait du tic banni « comme un coup de feu ». Phrase
 *      finale « La justice est une notion urbaine » PRÉSERVÉE.
 * Entrée COH2 ; sortie COH3. Guardé buildCanonical + famRise=0. Canon 24bb55df intact.
 *   tsx src/c7/patch-v3-coherence3.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V3_COH2.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V3_COH3.md`;
const LEDGER = `${OUT}/COH3_LEDGER.jsonl`;

interface Edit { id: string; anchor: string; repl: string; rule: string; }
const EDITS: Edit[] = [
  { id: 'R1a-ch45', rule: 'défuse recap montage (déjà avoué au climax) → pivot preuve',
    anchor: "— C'est la dette. La dette de sang. Le naufrage n'était pas un accident, c'était un montage. On a récupéré la cargaison, on a partagé les gains, mais on a dû payer pour que les dossiers disparaissent. Sauf que l'argent n'a jamais suffi. Le prix a été revu à la hausse, chaque année, pour chaque famille.",
    repl: "— Vous connaissez déjà l'histoire, Garcia. Le montage, le butin, l'omerta payée famille par famille. Ce que vous ignorez, c'est que l'argent n'a jamais suffi. Le prix a été revu à la hausse, chaque année." },
  { id: 'R1b-ch47', rule: 'défuse le 2e restatement du naufrage → pousse vers le nom',
    anchor: "— Le naufrage n'était pas un accident, n'est-ce pas ? continua Garcia. Un signal éteint, une trajectoire déviée. Un profit rapide pour combler un trou financier, et un homme qui devient gênant parce qu'il a vu trop de choses.",
    repl: "— On connaît la mécanique, maintenant, continua Garcia. Un signal éteint, une trajectoire déviée, un homme qui a vu trop de choses. Ce que je veux, ce n'est plus l'histoire. C'est le nom de celui qui a tenu le couteau." },
  { id: 'R2-ch49', rule: 'scelle l allégeance de Léna post-rupture',
    anchor: "Bras croisés, visage fermé, elle portait une fatigue qui ne masquait pas une vigilance aiguë.",
    repl: "Bras croisés, visage fermé, elle portait une fatigue qui ne masquait pas sa résolution : elle avait choisi son camp, et ce n'était plus celui d'Yvon." },
  { id: 'C24a-cut-ch50', rule: 'coupe le paragraphe qui double l ouverture (cadavre 2x, incohérent perron)',
    anchor: "Le sang avait séché. Une croûte sombre, presque noire, s'était formée autour de la plaie béante du cou, là où la lame avait tranché avec une précision chirurgicale. Garcia fixa le corps étendu sur le sol de pierre, immobile, dépouillé de toute dignité. C'était l'image finale, l'image brute. Le reste n'était que du bruit.\n\n",
    repl: "" },
  { id: 'C24b-trim-ch50', rule: 'retire « silence organique presque palpable » (densité)',
    anchor: "Le silence qui suivit fut dense. Un silence organique, presque palpable, qui semblait absorber les sons environnants. Garcia pensa à Léna.",
    repl: "Le silence qui suivit fut dense. Garcia pensa à Léna." },
  { id: 'C24c-trim-ch50', rule: 'retire tic banni « comme un coup de feu » + empilement atmosphérique',
    anchor: "Garcia fit un pas vers lui. Le craquement d'une latte de bois sous sa botte résonna comme un coup de feu dans l'immobilité de la pièce. L'air semblait s'être épaissi, saturé d'une tension électrique qui faisait dresser les poils sur ses bras.",
    repl: "Garcia fit un pas vers lui. Une latte de bois craqua sous sa botte." },
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
function countOcc(t: string, s: string): number { return t.split(s).length - 1; }
function chapters(md: string): Map<number, string> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const m = new Map<number, string>();
  for (let i = 1; i < parts.length; i += 2) m.set(Number(parts[i]), (parts[i + 1] ?? '').trim());
  return m;
}

async function main(): Promise<void> {
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  let text = readFileSync(INPUT, 'utf8');
  const famBefore = famTotals(text);
  const ch50Before = measureRepetition(chapters(text).get(50) ?? '');
  const dens50Before = (ch50Before.families.reduce((a, f) => a + f.total, 0) / (chapters(text).get(50) ?? '').split(/\s+/u).length) * 1000;

  let applied = 0; let halted: string | null = null;
  for (const e of EDITS) {
    const n = countOcc(text, e.anchor);
    if (n !== 1) { log({ id: e.id, accepted: false, reason: `ANCHOR_COUNT=${n}` }); halted = `${e.id} ANCHOR_COUNT=${n}`; break; }
    text = text.replace(e.anchor, e.repl); applied += 1;
    log({ id: e.id, accepted: true, rule: e.rule });
  }
  text = text.replace(/\n{3,}/gu, '\n\n');

  const famAfter = famTotals(text);
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const ch50After = chapters(text).get(50) ?? '';
  const dens50After = (measureRepetition(ch50After).families.reduce((a, f) => a + f.total, 0) / ch50After.split(/\s+/u).length) * 1000;
  const build = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: false });
  const finalLine = ch50After.includes('La justice est une notion urbaine');
  const pass = applied === EDITS.length && famRise.length === 0 && build.ok && finalLine;
  log({ event: 'RESULT', applied, total: EDITS.length, halted, famRise, ch50Density: `${dens50Before.toFixed(2)}->${dens50After.toFixed(2)}`, finalLinePreserved: finalLine, outputCanon: build.ok ? build.value.finalHash : 'FAIL', narrativeClean: build.ok ? build.value.cleanliness.NARRATIVE_CLEAN : null, langClean: build.ok ? build.value.cleanliness.LANG_CLEAN : null, words: build.ok ? build.value.words : null, verdict: pass ? 'PASS' : 'FAIL' });
  if (pass) writeFileSync(OUT_MS, text, 'utf8');
  console.log(`COH3_DONE verdict=${pass ? 'PASS' : 'FAIL'} applied=${applied}/${EDITS.length} famRise=[${famRise.join(',')}] ch50dens=${dens50Before.toFixed(1)}->${dens50After.toFixed(1)} finalLine=${finalLine} outCanon=${build.ok ? build.value.finalHash.slice(0, 12) : 'FAIL'}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
