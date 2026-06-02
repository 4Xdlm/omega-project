/**
 * OMEGA ATELIER — BEST-OF-N v0 (DEC-017, Ollama, terminal/DC PATHEXT)
 * ============================================================================
 * Tooling PUR (zéro code moteur figé). Pour 1 brief de scène riche :
 *   1. génère N=5 variantes (~1500 mots) via provider.generateDraft (seeds diversifiés)
 *   2. score chaque variante (profondeur/style/voix/mean) via scoreIntrinsicQuality
 *   3. tournoi PAIRWISE complet, 2 ordres (A1) -> matrice + classement + gagnante
 * Prouve que le juge sait SÉLECTIONNER la meilleure variante générée (≠ certifier un chef-d'œuvre).
 *
 * Prose générée = sortie OMEGA (nôtre) -> peut être loguée/committée.
 * CRASH-SAFE : checkpoint JSONL (variantes + scores + comparaisons), reprise. NÉCESSITE OLLAMA.
 * Run (cwd=packages/sovereign-engine), PATHEXT corrigé :
 *   set PATHEXT=.COM;.EXE;.BAT;.CMD;.PS1 & node <tsx> ../../scripts/generation/atelier-best-of-n.ts
 * Options : N (R4_N=5), R4_TARGET_WORDS=1500, R4_BRIEF=gardien
 */
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { scoreIntrinsicQuality, parseWinner, tallyWins, indexOfMax } from '../../packages/sovereign-engine/src/oracle/intrinsic-quality/intrinsic-quality.js';

const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const OUT = path.join(REPO, 'docs', 'audit', 'generation');
const CKPT = path.join(OUT, 'BEST_OF_N_V0.jsonl');
const MODEL = process.env.ECC_MODEL ?? 'qwen3:32b';
const OLLAMA = process.env.ECC_OLLAMA_URL ?? 'http://localhost:11434';
const N = Number(process.env.R4_N ?? '5');
const TARGET = Number(process.env.R4_TARGET_WORDS ?? '1500');
function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string) { return s.split(/\s+/).filter((w) => w.length > 0).length; }
function sha(s: string) { return createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 12); }
function stripThink(s: string) { return s.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '').trim(); }

// BRIEF "Le Gardien" — micro-trajectoire émotionnelle riche (peur -> mélancolie -> acceptation), FR littéraire.
const BRIEF = `Écris une scène de fiction littéraire française d'environ ${TARGET} mots, niveau prix littéraire.
SITUATION : un gardien de phare, seul, à la tombée de la nuit, sur une côte battue par la tempête. Il sait que c'est sa dernière nuit de garde avant que le phare ne soit automatisé et qu'on le mette à la retraite.
MICRO-TRAJECTOIRE ÉMOTIONNELLE (à suivre dans l'ordre, sans la nommer explicitement) : appréhension sourde -> peur devant la violence des éléments -> bascule vers la mélancolie du temps qui passe -> acceptation grave et lucide.
EXIGENCES : prose française soutenue et incarnée ; intériorité ; sous-texte ; rythme varié (alternance de phrases longues amples et de phrases brèves) ; images précises et non décoratives ; PAS de dialogue ; PAS de titre ni de méta-commentaire. Commence directement par la prose.`;

function genPrompt(): string { return BRIEF; }

async function main() {
  log(`=== ATELIER BEST-OF-N v0 (${MODEL}) | N=${N} target=${TARGET} mots ===`);
  const provider = createOllamaProvider({ baseUrl: OLLAMA, model: MODEL, draftTemperature: 0.85, judgeTemperature: 0, draftMaxTokens: 3200, judgeMaxTokens: 500 });
  mkdirSync(OUT, { recursive: true });

  // reprise
  const done = new Set<string>();
  const prior: Record<string, unknown>[] = [];
  if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) if (l.trim()) { try { const o = JSON.parse(l) as Record<string, unknown>; done.add(String(o.key)); prior.push(o); } catch { /* ignore */ } }
  log(`[RESUME] ${done.size} entrées au checkpoint`);

  // ---- Phase A : génération des variantes
  const variants: { i: number; prose: string; words: number; sha: string }[] = [];
  for (const o of prior) if (o.kind === 'variant') variants.push({ i: Number(o.i), prose: String(o.prose), words: Number(o.words), sha: String(o.sha) });
  for (let i = 0; i < N; i++) {
    if (variants.find((v) => v.i === i)) continue;
    log(`  [gen ${i + 1}/${N}] ...`);
    const raw = await provider.generateDraft(genPrompt(), 'literary_fr', `bestofn_v${i}_seed`);
    const prose = stripThink(raw);
    const v = { i, prose, words: words(prose), sha: sha(prose) };
    variants.push(v);
    appendFileSync(CKPT, JSON.stringify({ key: `variant_${i}`, kind: 'variant', ...v }) + '\n', 'utf8');
    log(`  [gen ${i + 1}/${N}] ${v.words} mots, sha ${v.sha}`);
  }
  variants.sort((a, b) => a.i - b.i);

  // ---- Phase B : scoring profondeur/style/voix
  const scores: Record<number, { profondeur: number; style: number; voix: number; mean: number; words: number; granularity_ok: boolean }> = {};
  for (const o of prior) if (o.kind === 'score') scores[Number(o.i)] = o.score as typeof scores[number];
  for (const v of variants) {
    if (scores[v.i]) continue;
    const s = await scoreIntrinsicQuality(v.prose, 'fr', provider);
    scores[v.i] = s;
    appendFileSync(CKPT, JSON.stringify({ key: `score_${v.i}`, kind: 'score', i: v.i, score: s }) + '\n', 'utf8');
    log(`  [score v${v.i}] prof ${s.profondeur} style ${s.style} voix ${s.voix} mean ${s.mean} (${s.words}w gran ${s.granularity_ok})`);
  }

  // ---- Phase C : tournoi pairwise complet, 2 ordres (A1)
  const comparisons: { i: number; j: number; order: number; winner: number | null }[] = [];
  for (const o of prior) if (o.kind === 'cmp') comparisons.push({ i: Number(o.i), j: Number(o.j), order: Number(o.order), winner: o.winner === null ? null : Number(o.winner) });
  const PAIR = (a: string, b: string) => `Tu es un critique littéraire exigeant. Voici deux extraits de prose française de longueur comparable. Lequel est la prose la plus accomplie littérairement (profondeur, style, voix, justesse — PAS la quantité de péripéties) ?\n\n=== EXTRAIT A ===\n${a}\n\n=== EXTRAIT B ===\n${b}\n\nRéponds UNIQUEMENT en JSON : {"winner":"A"|"B"}`;
  for (let i = 0; i < variants.length; i++) for (let j = i + 1; j < variants.length; j++) for (const order of [0, 1] as const) {
    if (comparisons.find((c) => c.i === i && c.j === j && c.order === order)) continue;
    const A = order === 0 ? variants[i]!.prose : variants[j]!.prose;
    const B = order === 0 ? variants[j]!.prose : variants[i]!.prose;
    const w = parseWinner(await provider.generateStructuredJSON(PAIR(A, B)));
    const winner = w === 'A' ? (order === 0 ? i : j) : w === 'B' ? (order === 0 ? j : i) : null;
    comparisons.push({ i, j, order, winner });
    appendFileSync(CKPT, JSON.stringify({ key: `cmp_${i}_${j}_${order}`, kind: 'cmp', i, j, order, winner }) + '\n', 'utf8');
  }
  log(`  [pairwise] ${comparisons.length} comparaisons`);

  // ---- Agrégation : matrice + classement + gagnante
  const valid = comparisons.filter((c) => c.winner !== null) as { i: number; j: number; order: number; winner: number }[];
  const wins = tallyWins(variants.length, valid.map((c) => ({ winner: c.winner })));
  const winner = indexOfMax(wins);
  // matrice M[a][b] = nb de fois où a bat b (sur 2 ordres)
  const M: number[][] = variants.map(() => variants.map(() => 0));
  for (const c of valid) { const loser = c.winner === c.i ? c.j : c.i; M[c.winner]![loser]! += 1; }

  // sortie
  const summary = {
    tool: 'atelier-best-of-n.ts', model: MODEL, N: variants.length, target_words: TARGET,
    scores: variants.map((v) => ({ i: v.i, words: scores[v.i]!.words, ...scores[v.i]! })),
    pairwise_wins: wins, winner_index: winner,
    winner_by_score: indexOfMax(variants.map((v) => scores[v.i]!.mean)),
    note: 'pairwise prime (A3). winner_index = vainqueur du tournoi ; winner_by_score = meilleur mean absolu. Coherence si egaux.',
  };
  writeFileSync(path.join(OUT, 'BEST_OF_N_V0.json'), JSON.stringify({ summary }, null, 2), 'utf8');
  // RESULTS.csv
  const rcols = ['i', 'words', 'profondeur', 'style', 'voix', 'mean', 'granularity_ok', 'pairwise_wins'];
  writeFileSync(path.join(OUT, 'BEST_OF_N_V0_RESULTS.csv'),
    [rcols.join(','), ...variants.map((v) => [v.i, scores[v.i]!.words, scores[v.i]!.profondeur, scores[v.i]!.style, scores[v.i]!.voix, scores[v.i]!.mean, scores[v.i]!.granularity_ok, wins[v.i]].join(','))].join('\n') + '\n', 'utf8');
  // MATRIX.csv
  writeFileSync(path.join(OUT, 'BEST_OF_N_V0_PAIRWISE_MATRIX.csv'),
    ['beats\\,' + variants.map((v) => 'v' + v.i).join(','), ...M.map((row, a) => 'v' + a + ',' + row.join(','))].join('\n') + '\n', 'utf8');
  // prose gagnante (notre sortie -> ok a logger)
  writeFileSync(path.join(OUT, 'BEST_OF_N_V0_WINNER.txt'), variants[winner]!.prose, 'utf8');

  log('\n=== SUMMARY ==='); log(JSON.stringify(summary, null, 2));
  log(`\nGAGNANTE = variante v${winner} (wins=${wins[winner]}, mean=${scores[winner]!.mean}). Prose -> BEST_OF_N_V0_WINNER.txt`);
}
main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
