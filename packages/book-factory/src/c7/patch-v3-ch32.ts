/**
 * OMEGA — RETRY ch.32 (payoff {clé→registre}) tic-aware + CERTIFICATION finale V3
 * (GO Architecte 2026-06-09). N'OPÈRE QUE sur ch.32 : ch.16 déjà certifié dans
 * WORKING.md reste intact. Directive enrichie d'une contrainte anti-tic SUR LES
 * VRAIES expressions surveillées (le silence/la mer/le vent/le village/la pluie/
 * la peur) — PAS registre/clé (sujets du beat, pas des tics). Le guard et la
 * vitalité restent durs (revert auto inchangé). 5 graines.
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';

import { sha256 } from '@omega/canon-kernel';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { buildCanonical } from './build-canonical.js';
import { applyPatch } from './patch-v3.js';
import type { PatchContext } from './patch-v3.js';

const OUT = 'runs/patch_v3';
const WORKING = `${OUT}/WORKING.md`;
const MODEL = process.env['PATCH_MODEL'] ?? 'gemma4:31b';
const SEEDS = [7, 42, 123, 256, 512];
const BASE_HASH = '3025744d35ea';
const CAST = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Thomas'];

const SYSTEM = "Tu es un romancier français de littérature de genre (polar). Prose sobre, tendue, concrète. Tu RÉÉCRIS un chapitre existant en y INJECTANT un beat de payoff précis, SANS changer le fil, les personnages, le lieu, ni la longueur. Tu n'écris QUE la prose (aucun titre, note, méta).";
const DIRECTIVE = 'CONSIGNE (PAYOFF LOCAL, acte 2) : transforme l\'accès au registre en BEAT PAYÉ — Léna découvre une ANOMALIE matérielle (une page récemment arrachée, OU le verrou déjà forcé avant elle, OU une seconde clé qui circulait). L\'indice POINTE discrètement vers Yvon OU Gaspard (quelqu\'un est passé avant) SANS RIEN PROUVER. INTERDIT : révéler la vérité centrale, nommer un coupable, prononcer la nature du naufrage, ouvrir une intrigue ou une dette nouvelle. CONTRAINTE DE STYLE (anti-répétition) : n\'emploie PAS plus d\'une fois chacune des expressions d\'ambiance « le silence », « la mer », « le vent », « le village », « la pluie », « la peur » ; varie le lexique d\'atmosphère.';

const tail = (s: string, n: number): string => s.split(/\s+/u).filter((w) => w.length > 0).slice(-n).join(' ');
const headw = (s: string, n: number): string => s.split(/\s+/u).filter((w) => w.length > 0).slice(0, n).join(' ');

async function gemma(text: string, seed: number, numPredict: number): Promise<string> {
  const body = { model: MODEL, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }], stream: false, think: false, options: { temperature: 0.85, top_p: 0.9, num_predict: numPredict, seed } };
  const res = await fetch('http://localhost:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return ((await res.json()) as { message?: { content?: string } }).message?.content?.replace(/<think>[\s\S]*?<\/think>/gu, '').trim() ?? '';
}

function rulesOnly(): AuthorDecisionLedger {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: Array<{ anchorExcerpt: string | null }> };
  return AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: parsed.decisions.filter((d) => d.anchorExcerpt === null) }));
}

async function main(): Promise<void> {
  if (!existsSync(WORKING)) { console.error('WORKING.md absent'); process.exitCode = 1; return; }
  let working = readFileSync(WORKING, 'utf8');
  const ledger = rulesOnly();
  const ctx: PatchContext = { cast: CAST, deadCanon: [], build: { authorLocks: ledger } };
  const log = (m: string): void => appendFileSync(`${OUT}/ch32.log`, `[${new Date().toISOString()}] ${m}\n`, 'utf8');

  const imp = importManuscript(working);
  if (!imp.ok) { log('IMPORT_FAIL'); process.exitCode = 1; return; }
  const chs = imp.value.chapters;
  const idx = chs.findIndex((c) => c.chapter === 32);
  const prose = chs[idx]?.prose ?? '';
  const w = prose.split(/\s+/u).filter((x) => x.length > 0).length;
  const prevTail = tail(chs[idx - 1]?.prose ?? '', 110);
  const nextHead = headw(chs[idx + 1]?.prose ?? '', 70);
  const prompt = `CHAPITRE ACTUEL (à réécrire) :\n${prose}\n\n— Continuité précédente : …${prevTail}\n— Continuité suivante : ${nextHead}…\n\n${DIRECTIVE}\n\nGarde lieu, personnages, fil et longueur (~${w} mots). Écris UNIQUEMENT la prose du chapitre réécrit.`;
  const numPredict = Math.min(3400, Math.round(w * 1.7) + 400);

  log(`RETRY ch.32 tic-aware — original ${w}w`);
  let done = false;
  for (const seed of SEEDS) {
    let cand = '';
    try { cand = await gemma(prompt, seed, numPredict); } catch (e) { log(`  seed ${seed} GEN_ERR ${String(e)}`); continue; }
    if (cand.length < 200) { log(`  seed ${seed} too short`); continue; }
    const { manuscript, report } = await applyPatch(working, { chapter: 32, candidate: cand, defect: 'soft_transition', label: 'ch.32 payoff{clé→registre} tic-aware' }, ctx);
    appendFileSync(`${OUT}/INTEGRITY.jsonl`, `${JSON.stringify({ payoff: 32, retry: true, seed, ...report })}\n`, 'utf8');
    log(`  seed ${seed} → ${report.accepted ? 'ACCEPT' : 'REVERT'} ${report.reason}${report.guard ? ` guard=${report.guard.verdict}[${report.guard.reasons.join(',')}] tic ${report.guard.metrics.ticBefore}->${report.guard.metrics.ticAfter}` : ''}`);
    if (report.accepted) { working = manuscript; writeFileSync(WORKING, working, 'utf8'); done = true; break; }
  }
  if (!done) { log('ch.32 FAIL après 5 graines tic-aware'); writeFileSync(`${OUT}/PAYOFF_FAIL.json`, JSON.stringify({ chapter: 32, retry: 'tic-aware' }, null, 1), 'utf8'); process.exitCode = 2; return; }
  log('ch.32 CERTIFIED');

  const finalBuild = await buildCanonical(working, { authorLocks: ledger, enforceAuthorRules: true });
  if (!finalBuild.ok) { log(`FINAL_CERT_FAIL ${finalBuild.error.code}`); process.exitCode = 3; return; }
  writeFileSync(`${OUT}/MANUSCRIT_V3_PATCHED.md`, finalBuild.value.text, 'utf8');
  const cert = {
    phase: 'CERTIFIED_V3_PATCHED', date: '2026-06-09',
    CERTIFIED_V3_PATCHED_HASH: finalBuild.value.finalHash, baseHash: BASE_HASH, words: finalBuild.value.words,
    cleanliness: finalBuild.value.cleanliness, workingRawHash: String(sha256(working.normalize('NFC'))),
    patches: ['ch.21 reinforce', 'ch.46 reinforce', 'ch.49 reinforce', 'ch.16 payoff{clé}', 'ch.32 payoff{clé→registre}', '27/31/33 accepted as-is (false noMover)'],
  };
  writeFileSync(`${OUT}/CERTIFIED_V3_PATCHED.json`, JSON.stringify(cert, null, 2), 'utf8');
  log(`CERTIFIED hash=${finalBuild.value.finalHash.slice(0, 16)} words=${finalBuild.value.words}`);
  console.log(JSON.stringify({ done: true, hash: finalBuild.value.finalHash, words: finalBuild.value.words }, null, 1));
}
main().catch((e: unknown) => { appendFileSync(`${OUT}/ch32.log`, `FATAL ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
