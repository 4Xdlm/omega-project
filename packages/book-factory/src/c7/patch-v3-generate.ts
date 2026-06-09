/**
 * OMEGA — RUNNER de génération Patch V3 (GO 3-IA 2026-06-09). Item par item :
 * gemma4 RÉÉCRIT le chapitre (reinforce / nomover) → applyPatch (splice+guard+
 * re-certif vitalité+revert) → INTEGRITY_REPORT. N'avance JAMAIS si l'item courant
 * n'est pas certifié (mandat ChatGPT). Détaché, reprenable (WORKING.md + STATE).
 *
 * LEDGER : rules-only (14 décisions, vitalité) — les 2 SPAN anchors V2/88k cassent
 * le V3 gemma (UNRESOLVED_LOCK, sonde 2026-06-09) → exclus. La règle de vitalité
 * s'applique, les ancres d'un autre livre non.
 *
 * Génération ≠ admission (ADR-003) : gemma4 propose, l'exécuteur dispose.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { applyPatch } from './patch-v3.js';
import type { PatchContext } from './patch-v3.js';
import { FEWSHOT_EXEMPLARS } from '../rosetta/dramatic-grid.js';

const OUT = 'runs/patch_v3';
const SRC = 'runs/duel_gemma/MANUSCRIT.md';
const WORKING = `${OUT}/WORKING.md`;
const MODEL = process.env['PATCH_MODEL'] ?? 'gemma4:31b';
const START = Number(process.env['START_ITEM'] ?? '0');
const COUNT = Number(process.env['COUNT'] ?? '1');
const SEEDS = [7, 42, 123];

type Mode = 'reinforce' | 'nomover';
interface Item { readonly chapter: number; readonly mode: Mode; readonly defect: 'mover' | 'soft_transition'; readonly label: string }
const ITEMS: readonly Item[] = [
  { chapter: 21, mode: 'reinforce', defect: 'soft_transition', label: 'ch.21 REINFORCE (escalade la fissure Garcia/Léna)' },
  { chapter: 46, mode: 'reinforce', defect: 'soft_transition', label: 'ch.46 REINFORCE' },
  { chapter: 49, mode: 'reinforce', defect: 'soft_transition', label: 'ch.49 REINFORCE' },
  { chapter: 27, mode: 'nomover', defect: 'mover', label: 'ch.27 noMover regen' },
  { chapter: 31, mode: 'nomover', defect: 'mover', label: 'ch.31 noMover regen' },
  { chapter: 33, mode: 'nomover', defect: 'mover', label: 'ch.33 noMover regen' },
];

const CAST = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Thomas'];
const DEAD: readonly string[] = []; // V3 gemma : décès non établis par CALC → ne pas bloquer (vitalité+guard protègent)

const SYSTEM = "Tu es un romancier français de littérature de genre (polar, thriller). Prose sobre, tendue, concrète et sensorielle, français impeccable. Tu RÉÉCRIS un chapitre existant en corrigeant UN défaut précis, SANS changer le fil narratif, les personnages présents, ni le lieu, et en gardant une longueur proche. Tu n'écris QUE la prose du chapitre (aucun titre, note ni méta). Tu ne révèles aucun secret central non prévu.";

function tailWords(s: string, n: number): string { return s.split(/\s+/u).filter((w) => w.length > 0).slice(-n).join(' '); }
function headWords(s: string, n: number): string { return s.split(/\s+/u).filter((w) => w.length > 0).slice(0, n).join(' '); }

function prompt(item: Item, prose: string, prevTail: string, nextHead: string): string {
  const w = prose.split(/\s+/u).filter((x) => x.length > 0).length;
  const cont = `— Fin du chapitre précédent (continuité, ne pas recopier) : …${prevTail}\n— Début du chapitre suivant (continuité) : ${nextHead}…\n\n`;
  if (item.mode === 'nomover') {
    return `CHAPITRE ACTUEL (à réécrire) :\n${prose}\n\n${cont}DÉFAUT : aucun personnage moteur dans la scène. CONSIGNE : réécris ce chapitre (~${w} mots) ; un personnage NOMMÉ déjà présent doit AGIR par un verbe concret OU DÉCIDER quelque chose dans la scène ; garde le lieu, les personnages, le fil ; ne ressuscite aucun mort ; aucune intrigue nouvelle, aucune révélation centrale.\n\n${FEWSHOT_EXEMPLARS.CONFRONTATION}\n\nÉcris UNIQUEMENT la prose du chapitre réécrit.`;
  }
  return `CHAPITRE ACTUEL (à réécrire) :\n${prose}\n\n${cont}CONSIGNE : réécris ce chapitre (~${w} mots) en ESCALADANT la tension DÉJÀ présente (par ex. transformer une amorce de désaccord en confrontation, ou faire prendre une décision) : ajoute un acte concret, une décision, OU une micro-révélation LOCALE ; garde lieu, personnages, fil et longueur ; ne révèle PAS la vérité centrale ; aucune intrigue nouvelle.\n\nÉcris UNIQUEMENT la prose du chapitre réécrit.`;
}

async function gemma(text: string, seed: number, numPredict: number): Promise<string> {
  const body = { model: MODEL, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }], stream: false, think: false, options: { temperature: 0.85, top_p: 0.92, num_predict: numPredict, seed } };
  const res = await fetch('http://localhost:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}

function rulesOnlyLedger(): AuthorDecisionLedger {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: Array<{ anchorExcerpt: string | null }> };
  return AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: parsed.decisions.filter((d) => d.anchorExcerpt === null) }));
}

async function main(): Promise<void> {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  let working = existsSync(WORKING) ? readFileSync(WORKING, 'utf8') : readFileSync(SRC, 'utf8');
  const ctx: PatchContext = { cast: CAST, deadCanon: DEAD, build: { authorLocks: rulesOnlyLedger() } };
  const log = (m: string): void => appendFileSync(`${OUT}/progress.log`, `[${new Date().toISOString()}] ${m}\n`, 'utf8');

  for (let i = START; i < START + COUNT && i < ITEMS.length; i++) {
    const item = ITEMS[i];
    if (item === undefined) break;
    const imp = importManuscript(working);
    if (!imp.ok) { log(`IMPORT_FAIL item ${i}`); process.exitCode = 1; return; }
    const chs = imp.value.chapters;
    const idx = chs.findIndex((c) => c.chapter === item.chapter);
    if (idx < 0) { log(`ch ${item.chapter} ABSENT`); process.exitCode = 1; return; }
    const prose = chs[idx]?.prose ?? '';
    const prevTail = idx > 0 ? tailWords(chs[idx - 1]?.prose ?? '', 120) : '';
    const nextHead = idx + 1 < chs.length ? headWords(chs[idx + 1]?.prose ?? '', 80) : '';
    const numPredict = Math.min(3400, Math.round(prose.split(/\s+/u).length * 1.7) + 400);

    log(`ITEM ${i} ${item.label} — original ${prose.split(/\s+/u).length}w`);
    let accepted = false;
    for (const seed of SEEDS) {
      let cand = '';
      try { cand = await gemma(prompt(item, prose, prevTail, nextHead), seed, numPredict); }
      catch (e) { log(`  seed ${seed} GEN_ERR ${String(e)}`); continue; }
      if (cand.length < 200) { log(`  seed ${seed} too short (${cand.length})`); continue; }
      const { manuscript, report } = await applyPatch(working, { chapter: item.chapter, candidate: cand, defect: item.defect, label: item.label }, ctx);
      appendFileSync(`${OUT}/INTEGRITY.jsonl`, `${JSON.stringify({ item: i, seed, ...report })}\n`, 'utf8');
      log(`  seed ${seed} → ${report.accepted ? 'ACCEPT' : 'REVERT'} ${report.reason}${report.guard ? ` guard=${report.guard.verdict}[${report.guard.reasons.join(',')}] movers ${report.guard.metrics.moversBefore}->${report.guard.metrics.moversAfter}` : ''}`);
      if (report.accepted) { working = manuscript; writeFileSync(WORKING, working, 'utf8'); writeFileSync(`${OUT}/STATE.json`, JSON.stringify({ lastItemDone: i, chapter: item.chapter, words: report.wordsAfter }, null, 1), 'utf8'); accepted = true; break; }
    }
    if (!accepted) { log(`ITEM ${i} FAIL — aucune candidate certifiée (STOP, mandat: ne pas avancer)`); writeFileSync(`${OUT}/PATCH_FAIL.json`, JSON.stringify({ item: i, chapter: item.chapter }, null, 1), 'utf8'); process.exitCode = 2; return; }
    log(`ITEM ${i} CERTIFIED`);
  }
  log(`DONE range ${START}..${START + COUNT - 1}`);
  console.log('RUNNER_DONE');
}
main().catch((e: unknown) => { appendFileSync(`${OUT}/progress.log`, `FATAL ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
