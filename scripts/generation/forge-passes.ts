/**
 * OMEGA ATELIER — FORGE PASSES v0 (DEC-017 P5, Ollama)
 * ============================================================================
 * Tooling PUR. Prend la variante gagnante v4 (BEST_OF_N_V0_WINNER.txt) et applique 3 passes CUMULATIVES
 * de réécriture (les acquis historiques = FORGES, pas juges) :
 *   p1 LANGUE  : corrige fautes d'accord/grammaire, lourdeurs, élisions ratées, répétitions faibles.
 *   p2 SOUS-TEXTE : remplace l'énoncé direct d'émotion par geste/objet/silence ; PAS de pathos ajouté.
 *   p3 RYTHME/EUPHONIE/FLAUBERT : casse le métronome (alternance longues/brèves), supprime images décoratives, musique.
 * Score profondeur/style/voix après chaque passe + tournoi pairwise {orig, p1, p2, p3} (2 ordres).
 * PASS si la version finale bat l'original en pairwise SANS devenir plus explicative/décorative (œil humain).
 *
 * Prose = sortie OMEGA (nôtre). CRASH-SAFE JSONL. NÉCESSITE OLLAMA.
 */
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { scoreIntrinsicQuality, parseWinner, tallyWins, indexOfMax } from '../../packages/sovereign-engine/src/oracle/intrinsic-quality/intrinsic-quality.js';

const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const OUT = path.join(REPO, 'docs', 'audit', 'generation');
const CKPT = path.join(OUT, 'ATELIER_PASSES_V0.jsonl');
const MODEL = process.env.ECC_MODEL ?? 'qwen3:32b';
const OLLAMA = process.env.ECC_OLLAMA_URL ?? 'http://localhost:11434';
function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string) { return s.split(/\s+/).filter((w) => w.length > 0).length; }
function stripThink(s: string) { return s.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '').trim(); }

const PASSES: { id: string; consigne: string }[] = [
  { id: 'p1_langue', consigne: "Corrige les fautes d'accord et de grammaire, les lourdeurs, les élisions ratées (ex. « que à » -> « qu'à »), et atténue les répétitions conceptuelles faibles. NE change NI le sens NI la structure narrative. N'ajoute rien." },
  { id: 'p2_soustexte', consigne: "Remplace les énoncés DIRECTS d'émotion par le détail objectif, le geste, l'objet, le silence (montrer, ne pas dire). N'AJOUTE PAS de pathos ni de phrases sentencieuses « profondes ». Garde le sens et la longueur." },
  { id: 'p3_rythme_flaubert', consigne: "Casse le rythme métronomique : alterne phrases longues amples et phrases brèves. Supprime les images purement décoratives (garde celles qui sont nécessaires). Soigne la musique (évite les heurts sonores), vise la précision flaubertienne. Garde le sens." },
];
const rewritePrompt = (consigne: string, texte: string) =>
  `Tu es un éditeur littéraire français exigeant. Réécris le texte ci-dessous en appliquant STRICTEMENT cette consigne :\n${consigne}\nRetourne UNIQUEMENT la prose réécrite, sans titre, sans commentaire, sans balise.\n\n=== TEXTE ===\n${texte}`;
const PAIR = (a: string, b: string) => `Tu es un critique littéraire exigeant. Voici deux versions d'une même scène. Laquelle est la prose la plus accomplie littérairement (profondeur, style, voix, justesse, absence de maladresse et de sur-explication) ?\n\n=== VERSION A ===\n${a}\n\n=== VERSION B ===\n${b}\n\nRéponds UNIQUEMENT en JSON : {"winner":"A"|"B"}`;

async function main() {
  log(`=== FORGE PASSES v0 (${MODEL}) ===`);
  const provider = createOllamaProvider({ baseUrl: OLLAMA, model: MODEL, draftTemperature: 0.4, judgeTemperature: 0, draftMaxTokens: 3200, judgeMaxTokens: 500 });
  mkdirSync(OUT, { recursive: true });
  const original = readFileSync(path.join(OUT, 'BEST_OF_N_V0_WINNER.txt'), 'utf8').trim();

  const done = new Set<string>(); const prior: Record<string, unknown>[] = [];
  if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) if (l.trim()) { try { const o = JSON.parse(l) as Record<string, unknown>; done.add(String(o.key)); prior.push(o); } catch { /**/ } }

  // versions : index 0 = original, puis p1, p2, p3 (cumulatif)
  const versions: { id: string; prose: string }[] = [{ id: 'original', prose: original }];
  for (const o of prior) if (o.kind === 'pass') versions.push({ id: String(o.id), prose: String(o.prose) });
  for (const pass of PASSES) {
    if (versions.find((v) => v.id === pass.id)) continue;
    const base = versions[versions.length - 1]!.prose; // cumulatif sur la version précédente
    log(`  [forge ${pass.id}] ...`);
    const out = stripThink(await provider.generateDraft(rewritePrompt(pass.consigne, base), 'edit_fr', `forge_${pass.id}`));
    versions.push({ id: pass.id, prose: out });
    appendFileSync(CKPT, JSON.stringify({ key: `pass_${pass.id}`, kind: 'pass', id: pass.id, prose: out }) + '\n', 'utf8');
    log(`  [forge ${pass.id}] ${words(out)} mots`);
  }

  // scores après chaque version
  const scores: Record<string, { profondeur: number; style: number; voix: number; mean: number; words: number; granularity_ok: boolean }> = {};
  for (const o of prior) if (o.kind === 'score') scores[String(o.id)] = o.score as typeof scores[string];
  for (const v of versions) {
    if (scores[v.id]) continue;
    const s = await scoreIntrinsicQuality(v.prose, 'fr', provider);
    scores[v.id] = s;
    appendFileSync(CKPT, JSON.stringify({ key: `score_${v.id}`, kind: 'score', id: v.id, score: s }) + '\n', 'utf8');
    log(`  [score ${v.id}] prof ${s.profondeur} style ${s.style} voix ${s.voix} mean ${s.mean} (${s.words}w)`);
  }

  // tournoi pairwise complet {original, p1, p2, p3}, 2 ordres
  const comps: { a: number; b: number; order: number; winner: number | null }[] = [];
  for (const o of prior) if (o.kind === 'cmp') comps.push({ a: Number(o.a), b: Number(o.b), order: Number(o.order), winner: o.winner === null ? null : Number(o.winner) });
  for (let i = 0; i < versions.length; i++) for (let j = i + 1; j < versions.length; j++) for (const order of [0, 1] as const) {
    if (comps.find((c) => c.a === i && c.b === j && c.order === order)) continue;
    const A = order === 0 ? versions[i]!.prose : versions[j]!.prose;
    const B = order === 0 ? versions[j]!.prose : versions[i]!.prose;
    const w = parseWinner(await provider.generateStructuredJSON(PAIR(A, B)));
    const winner = w === 'A' ? (order === 0 ? i : j) : w === 'B' ? (order === 0 ? j : i) : null;
    comps.push({ a: i, b: j, order, winner });
    appendFileSync(CKPT, JSON.stringify({ key: `cmp_${i}_${j}_${order}`, kind: 'cmp', a: i, b: j, order, winner }) + '\n', 'utf8');
  }
  const valid = comps.filter((c) => c.winner !== null) as { a: number; b: number; order: number; winner: number }[];
  const wins = tallyWins(versions.length, valid.map((c) => ({ winner: c.winner })));
  const overallWinner = indexOfMax(wins);

  // final (p3) vs original : compte des 2 ordres
  const origIdx = 0; const finalIdx = versions.findIndex((v) => v.id === 'p3_rythme_flaubert');
  const finalVsOrig = valid.filter((c) => (c.a === origIdx && c.b === finalIdx) || (c.a === finalIdx && c.b === origIdx));
  const finalWins = finalVsOrig.filter((c) => c.winner === finalIdx).length;
  const origWins = finalVsOrig.filter((c) => c.winner === origIdx).length;

  const summary = {
    tool: 'forge-passes.ts', model: MODEL,
    versions: versions.map((v) => ({ id: v.id, ...scores[v.id]! })),
    pairwise_wins: versions.map((v, i) => ({ id: v.id, wins: wins[i] })),
    overall_winner: versions[overallWinner]!.id,
    final_vs_original: { final_id: 'p3_rythme_flaubert', final_wins: finalWins, original_wins: origWins, orders: finalVsOrig.length },
    note: 'PASS si overall_winner != original ET final bat original (final_wins>original_wins) ET mean ne baisse pas. OEil humain requis (anti religion du score).',
  };
  writeFileSync(path.join(OUT, 'ATELIER_PASSES_V0.json'), JSON.stringify({ summary }, null, 2), 'utf8');
  const cols = ['id', 'words', 'profondeur', 'style', 'voix', 'mean', 'granularity_ok', 'pairwise_wins'];
  writeFileSync(path.join(OUT, 'ATELIER_PASSES_V0_RESULTS.csv'),
    [cols.join(','), ...versions.map((v, i) => [v.id, scores[v.id]!.words, scores[v.id]!.profondeur, scores[v.id]!.style, scores[v.id]!.voix, scores[v.id]!.mean, scores[v.id]!.granularity_ok, wins[i]].join(','))].join('\n') + '\n', 'utf8');
  const M: number[][] = versions.map(() => versions.map(() => 0));
  for (const c of valid) { const loser = c.winner === c.a ? c.b : c.a; M[c.winner]![loser]! += 1; }
  writeFileSync(path.join(OUT, 'ATELIER_PASSES_V0_PAIRWISE_MATRIX.csv'),
    ['beats\\,' + versions.map((v) => v.id).join(','), ...M.map((row, a) => versions[a]!.id + ',' + row.join(','))].join('\n') + '\n', 'utf8');
  writeFileSync(path.join(OUT, 'ATELIER_PASSES_V0_FINAL.txt'), versions[finalIdx]!.prose, 'utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary, null, 2));
  log(`\nfinal(p3) vs original : ${finalWins}-${origWins} (2 ordres). overall_winner=${summary.overall_winner}`);
}
main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
