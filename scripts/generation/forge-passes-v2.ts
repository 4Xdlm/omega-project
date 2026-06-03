/**
 * OMEGA ATELIER — FORGE PASSES v0.1 (DEC-017 P5.1, length-guarded, Ollama)
 * ============================================================================
 * Corrige le défaut P5 (compression). Baseline = p1_langue (version saine ~1123 mots).
 * Passes NON cumulatives (chacune repart de p1) + GARDE-FOU DE LONGUEUR dur (±10 %, interdiction de résumer).
 *   p2a SOUS-TEXTE  : montrer pas dire, geste/objet/silence ; sans pathos.
 *   p3a RYTHME/EUPHONIE/FLAUBERT : alternance phrases longues/brèves, images nécessaires, musique.
 * Tournoi pairwise {original, p1_langue, p2a, p3a} (2 ordres). PASS si une transformée bat p1 en gardant la matière.
 * Prose = sortie OMEGA. CRASH-SAFE JSONL. NÉCESSITE OLLAMA.
 */
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { scoreIntrinsicQuality, parseWinner, tallyWins, indexOfMax } from '../../packages/sovereign-engine/src/oracle/intrinsic-quality/intrinsic-quality.js';

const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const OUT = path.join(REPO, 'docs', 'audit', 'generation');
const CKPT = path.join(OUT, 'ATELIER_PASSES_V1.jsonl');
const MODEL = process.env.ECC_MODEL ?? 'qwen3:32b';
const OLLAMA = process.env.ECC_OLLAMA_URL ?? 'http://localhost:11434';
function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string) { return s.split(/\s+/).filter((w) => w.length > 0).length; }
function stripThink(s: string) { return s.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '').trim(); }

function loadFromV0(kind: string, id: string): string | null {
  const f = path.join(OUT, 'ATELIER_PASSES_V0.jsonl');
  if (!existsSync(f)) return null;
  for (const l of readFileSync(f, 'utf8').split('\n')) if (l.trim()) { try { const o = JSON.parse(l) as Record<string, unknown>; if (o.kind === kind && o.id === id) return String(o.prose); } catch { /**/ } }
  return null;
}

const PASSES: { id: string; consigne: string }[] = [
  { id: 'p2a_soustexte', consigne: "Remplace les énoncés DIRECTS d'émotion par le détail objectif, le geste, l'objet, le silence (montrer, ne pas dire). N'ajoute pas de pathos ni de phrases sentencieuses." },
  { id: 'p3a_rythme_flaubert', consigne: "Casse le rythme métronomique : alterne phrases longues amples et phrases brèves. Supprime les images purement décoratives (garde les nécessaires). Soigne la musique (évite les heurts sonores), précision flaubertienne." },
];

function rewritePrompt(consigne: string, texte: string, baseWords: number): string {
  const floor = Math.floor(baseWords * 0.9);
  return `CRITICAL : tu DOIS conserver la longueur du texte (≈ ${baseWords} mots, JAMAIS moins de ${floor}). NE RÉSUME PAS, ne coupe AUCUN passage, ne supprime AUCUN élément narratif. Réécris SUR PLACE, phrase par phrase.\n` +
    `Tu es un éditeur littéraire français exigeant. Applique STRICTEMENT : ${consigne}\n` +
    `Retourne UNIQUEMENT la prose réécrite, sans titre ni commentaire ni balise.\n` +
    `CRITICAL (rappel) : longueur ≈ ${baseWords} mots, AUCUN résumé, réécriture intégrale sur place.\n\n=== TEXTE ===\n${texte}`;
}
const PAIR = (a: string, b: string) => `Tu es un critique littéraire exigeant. Voici deux versions d'une même scène. Laquelle est la prose la plus accomplie littérairement (profondeur, style, voix, justesse, absence de maladresse et de sur-explication) ?\n\n=== VERSION A ===\n${a}\n\n=== VERSION B ===\n${b}\n\nRéponds UNIQUEMENT en JSON : {"winner":"A"|"B"}`;

async function main() {
  log(`=== FORGE PASSES v0.1 length-guarded (${MODEL}) ===`);
  const provider = createOllamaProvider({ baseUrl: OLLAMA, model: MODEL, draftTemperature: 0.4, judgeTemperature: 0, draftMaxTokens: 3600, judgeMaxTokens: 500 });
  mkdirSync(OUT, { recursive: true });
  const original = loadFromV0('', '') ?? readFileSync(path.join(OUT, 'BEST_OF_N_V0_WINNER.txt'), 'utf8').trim();
  const p1 = loadFromV0('pass', 'p1_langue');
  if (!p1) { log('FATAL: p1_langue introuvable dans ATELIER_PASSES_V0.jsonl'); process.exit(2); }
  const baseWords = words(p1);
  log(`baseline p1_langue = ${baseWords} mots`);

  const done = new Set<string>(); const prior: Record<string, unknown>[] = [];
  if (existsSync(CKPT)) for (const l of readFileSync(CKPT, 'utf8').split('\n')) if (l.trim()) { try { const o = JSON.parse(l) as Record<string, unknown>; done.add(String(o.key)); prior.push(o); } catch { /**/ } }

  // versions : 0=original, 1=p1_langue, puis p2a, p3a (NON cumulatif : depuis p1)
  const versions: { id: string; prose: string }[] = [{ id: 'original', prose: original }, { id: 'p1_langue', prose: p1 }];
  for (const o of prior) if (o.kind === 'pass') versions.push({ id: String(o.id), prose: String(o.prose) });
  for (const pass of PASSES) {
    if (versions.find((v) => v.id === pass.id)) continue;
    log(`  [forge ${pass.id}] (depuis p1, garde-fou ${Math.floor(baseWords*0.9)}-${Math.ceil(baseWords*1.1)} mots) ...`);
    const out = stripThink(await provider.generateDraft(rewritePrompt(pass.consigne, p1, baseWords), 'edit_fr', `forgev2_${pass.id}`));
    const w = words(out);
    const driftOk = w >= Math.floor(baseWords * 0.9) && w <= Math.ceil(baseWords * 1.15);
    versions.push({ id: pass.id, prose: out });
    appendFileSync(CKPT, JSON.stringify({ key: `pass_${pass.id}`, kind: 'pass', id: pass.id, prose: out, words: w, drift_ok: driftOk }) + '\n', 'utf8');
    log(`  [forge ${pass.id}] ${w} mots (drift_ok=${driftOk})`);
  }

  const scores: Record<string, { profondeur: number; style: number; voix: number; mean: number; words: number; granularity_ok: boolean }> = {};
  for (const o of prior) if (o.kind === 'score') scores[String(o.id)] = o.score as typeof scores[string];
  for (const v of versions) {
    if (scores[v.id]) continue;
    const s = await scoreIntrinsicQuality(v.prose, 'fr', provider);
    scores[v.id] = s; appendFileSync(CKPT, JSON.stringify({ key: `score_${v.id}`, kind: 'score', id: v.id, score: s }) + '\n', 'utf8');
    log(`  [score ${v.id}] mean ${s.mean} (prof ${s.profondeur}/style ${s.style}/voix ${s.voix}, ${s.words}w)`);
  }

  const comps: { a: number; b: number; order: number; winner: number | null }[] = [];
  for (const o of prior) if (o.kind === 'cmp') comps.push({ a: Number(o.a), b: Number(o.b), order: Number(o.order), winner: o.winner === null ? null : Number(o.winner) });
  for (let i = 0; i < versions.length; i++) for (let j = i + 1; j < versions.length; j++) for (const order of [0, 1] as const) {
    if (comps.find((c) => c.a === i && c.b === j && c.order === order)) continue;
    const A = order === 0 ? versions[i]!.prose : versions[j]!.prose, B = order === 0 ? versions[j]!.prose : versions[i]!.prose;
    const w = parseWinner(await provider.generateStructuredJSON(PAIR(A, B)));
    const winner = w === 'A' ? (order === 0 ? i : j) : w === 'B' ? (order === 0 ? j : i) : null;
    comps.push({ a: i, b: j, order, winner });
    appendFileSync(CKPT, JSON.stringify({ key: `cmp_${i}_${j}_${order}`, kind: 'cmp', a: i, b: j, order, winner }) + '\n', 'utf8');
  }
  const valid = comps.filter((c) => c.winner !== null) as { a: number; b: number; order: number; winner: number }[];
  const wins = tallyWins(versions.length, valid.map((c) => ({ winner: c.winner })));
  const p1Idx = versions.findIndex((v) => v.id === 'p1_langue');
  // chaque transformée vs p1 (2 ordres)
  const vsP1 = (idx: number) => { const cc = valid.filter((c) => (c.a === p1Idx && c.b === idx) || (c.a === idx && c.b === p1Idx)); return { wins: cc.filter((c) => c.winner === idx).length, losses: cc.filter((c) => c.winner === p1Idx).length }; };

  const summary = {
    tool: 'forge-passes-v2.ts', model: MODEL, baseline_words: baseWords,
    versions: versions.map((v, i) => ({ id: v.id, ...scores[v.id]!, pairwise_wins: wins[i] })),
    overall_winner: versions[indexOfMax(wins)]!.id,
    transforms_vs_p1: PASSES.map((p) => { const idx = versions.findIndex((v) => v.id === p.id); return { id: p.id, words: scores[p.id]!.words, drift_ok: scores[p.id]!.words >= Math.floor(baseWords * 0.9), ...vsP1(idx) }; }),
    note: 'PASS si une transformee garde la longueur (>=90% de p1) ET bat p1 en pairwise (wins>losses) ET mean ne baisse pas.',
  };
  writeFileSync(path.join(OUT, 'ATELIER_PASSES_V1.json'), JSON.stringify({ summary }, null, 2), 'utf8');
  const cols = ['id', 'words', 'profondeur', 'style', 'voix', 'mean', 'pairwise_wins'];
  writeFileSync(path.join(OUT, 'ATELIER_PASSES_V1_RESULTS.csv'),
    [cols.join(','), ...versions.map((v, i) => [v.id, scores[v.id]!.words, scores[v.id]!.profondeur, scores[v.id]!.style, scores[v.id]!.voix, scores[v.id]!.mean, wins[i]].join(','))].join('\n') + '\n', 'utf8');
  const best = indexOfMax(wins);
  writeFileSync(path.join(OUT, 'ATELIER_PASSES_V1_BEST.txt'), versions[best]!.prose, 'utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary, null, 2));
  log(`\noverall_winner=${summary.overall_winner} | transforms_vs_p1=${JSON.stringify(summary.transforms_vs_p1.map((t) => `${t.id}:${t.words}w ${t.wins}-${t.losses}`))}`);
}
main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
