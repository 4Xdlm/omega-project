/**
 * OMEGA — COH4 (P3, tribunal ChatGPT confirmé par mesure 2026-07-18) :
 * (1) MACRO-FIX ch14 : retirer l'ARRESTATION (menottes + voiture de police) qui contredit ch25
 *     (« Squarcioni toujours dans sa mairie ») et ch15-24 (Yvon confronté libre). Le roman est un
 *     noir où la justice ÉCHOUE → ch14 = confession SANS arrestation, Yvon libre et défiant.
 * (2) 16 scories franglais/typo réelles (viscous, lipids, passing, unplanned, equidistant, etc.)
 *     que le détecteur de langue avait laissé passer.
 * Entrée = MANUSCRIT_V4_DRAFT.md ; sortie = MANUSCRIT_V4_COH4.md. Guardé buildCanonical + famRise=0.
 *   tsx src/c7/patch-v4-coherence4.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V4_DRAFT.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V4_COH4.md`;
const LEDGER = `${OUT}/COH4_LEDGER.jsonl`;

const CH14_CUT = 'Garcia sortit lentement les menottes de sa poche.';
const CH14_NEW_ENDING = `Garcia glissa le carnet dans sa poche intérieure. La preuve était là, froide contre sa poitrine. Mais il savait déjà qu'elle ne suffirait pas.

— Vous n'avez rien, dit Yvon d'une voix redevenue calme. Un carnet. Des noms. Et un village entier qui jurera n'avoir jamais rien vu. Vous croyez avoir gagné, Garcia ? Ce village est bâti sur le Triton. Si vous tirez sur ce fil, tout s'écroule — et les gens tiennent à leurs mensonges quand ils leur tiennent chaud.

Garcia ne répondit rien. Il regarda le patriarche que rien ne semblait pouvoir atteindre, puis Léna, livide contre la fenêtre.

— On sort, dit-il.

Dehors, la pluie avait cessé, laissant un brouillard épais qui engloutissait les contours de la maison. Gaspard n'avait pas bougé de sa chaise, le regard perdu dans le vide. Léna resta à la fenêtre, à regarder la silhouette du maire regagner sa demeure d'un pas tranquille, en propriétaire qui rentre chez lui.

Garcia referma la porte derrière lui. Il tenait la vérité dans sa poche. Ici, elle ne pesait guère plus que la cendre d'un foyer éteint.`;

interface Edit { id: string; anchor: string; repl: string; }
const TYPOS: Edit[] = [
  { id: 'arrêa', anchor: "conversation s'arrêa net", repl: "conversation s'arrêta net" },
  { id: 'lipids', anchor: "des autres, lipids et nerveux", repl: "des autres, livides et nerveux" },
  { id: 'viscous', anchor: "Un froid viscous, pénétrant", repl: "Un froid visqueux, pénétrant" },
  { id: 'survivage', anchor: "qu'un survivage puisse errer", repl: "qu'un survivant puisse errer" },
  { id: 'spectralle', anchor: "Cette silhouette spectralle", repl: "Cette silhouette spectrale" },
  { id: 'fauxs', anchor: "ses ratures et ses fauxs", repl: "ses ratures et ses faux" },
  { id: 'passing', anchor: "s'accroupit, passing ses doigts", repl: "s'accroupit, passant ses doigts" },
  { id: 'equidistant', anchor: "Gaspard, toujours equidistant de Léna", repl: "Gaspard, toujours à égale distance de Léna" },
  { id: 'unplanned', anchor: "Léna s'interposa, unplanned, comme un rempart", repl: "Léna s'interposa d'un geste soudain, comme un rempart" },
  { id: 'vivs', anchor: "la soumission aux vivs qui manipulent", repl: "la soumission aux vivants qui manipulent" },
  { id: 'intactée', anchor: "sa dignité intactée", repl: "sa dignité intacte" },
  { id: 'repelé', anchor: "comme repelé par une force invisible", repl: "comme repoussé par une force invisible" },
  { id: 'un-rature', anchor: "une faille, un rature, une hésitation", repl: "une faille, une rature, une hésitation" },
  { id: 'sifflet', anchor: "d'intensité, sifflet aigu dans les oreilles", repl: "d'intensité, un sifflement aigu dans les oreilles" },
  { id: 'rideurs', anchor: "le regard des rideurs et des vieux du port", repl: "le regard des rôdeurs et des vieux du port" },
  { id: 'standing', anchor: "maintenir un certain standing", repl: "maintenir un certain rang" },
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
function chapters(md: string): Array<{ n: number; prose: string }> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const out: Array<{ n: number; prose: string }> = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ n: Number(parts[i]), prose: (parts[i + 1] ?? '').trim() });
  return out;
}

async function main(): Promise<void> {
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  let text = readFileSync(INPUT, 'utf8');
  const famBefore = famTotals(text);

  // (1) macro-fix ch14 via parsing
  const chs = chapters(text);
  const c14 = chs.find((c) => c.n === 14);
  if (!c14) throw new Error('ch14 absent');
  const idx = c14.prose.indexOf(CH14_CUT);
  if (idx < 0) throw new Error('CH14_CUT absent');
  c14.prose = c14.prose.slice(0, idx).trimEnd() + '\n\n' + CH14_NEW_ENDING;
  const md = chs.map((c) => `## Chapitre ${c.n}\n\n${c.prose}\n`).join('\n');
  text = md;
  log({ id: 'MACRO-ch14', accepted: true, rule: 'retire arrestation (menottes+voiture) → confession sans arrestation, Yvon libre' });

  // (2) scories
  let applied = 0; const missed: string[] = [];
  for (const e of TYPOS) {
    const n = countOcc(text, e.anchor);
    if (n !== 1) { missed.push(`${e.id}(${n})`); log({ id: e.id, accepted: false, count: n }); continue; }
    text = text.replace(e.anchor, e.repl); applied += 1; log({ id: e.id, accepted: true });
  }

  // vérifs
  const stillTypo = TYPOS.filter((e) => text.includes(e.anchor)).map((e) => e.id);
  const menotteLeft = /menotte|voiture de police/iu.test(chapters(text).find((c) => c.n === 14)?.prose ?? '');
  const finalLine = text.includes('La justice est une notion urbaine');
  const famAfter = famTotals(text);
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const build = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: false });
  const pass = applied === TYPOS.length && stillTypo.length === 0 && !menotteLeft && finalLine && famRise.length === 0 && build.ok;
  log({ event: 'RESULT', macroApplied: true, typosApplied: applied, missed, stillTypo, ch14MenotteLeft: menotteLeft, finalLinePreserved: finalLine, famRise, outputCanon: build.ok ? build.value.finalHash : 'FAIL', narrativeClean: build.ok ? build.value.cleanliness.NARRATIVE_CLEAN : null, langClean: build.ok ? build.value.cleanliness.LANG_CLEAN : null, words: build.ok ? build.value.words : null, verdict: pass ? 'PASS' : 'FAIL' });
  if (pass) writeFileSync(OUT_MS, text, 'utf8');
  console.log(`COH4_DONE verdict=${pass ? 'PASS' : 'FAIL'} typos=${applied}/${TYPOS.length} missed=[${missed.join(',')}] menotteLeft=${menotteLeft} finalLine=${finalLine} famRise=[${famRise.join(',')}] outCanon=${build.ok ? build.value.finalHash.slice(0, 12) : 'FAIL'}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
