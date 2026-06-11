/**
 * OMEGA — RUNNER MICRO-LOT 7 (GO convergent Gemini+ChatGPT 2026-06-11).
 * Applique les 7 substitutions SAFE (gemma KEEP ∩ proxy de souffle non-dégradant),
 * UNE PAR UNE, sous TRIPLE garde :
 *   1. operateTic (seam-surgeon guardPatch + re-scan ciblé)        — phrase
 *   2. applyPatch (guardRegen 'tic' + buildCanonical enforceAuthorRules + REVERT) — chapitre/vitalité/lang/identité
 *   3. measureRepetition book-wide : aucune famille ne monte, DEFAULT_TICS ≤ baseline — livre
 * HALT TOTAL si une famille émerge. REVERT bit-identique si une garde refuse.
 * Le canon (MANUSCRIT_V3_PATCHED.md) n'est JAMAIS écrasé : sortie = NOUVEAU fichier.
 *
 * Génération ≠ admission (ADR-003) : ici AUCUNE génération — substitutions pré-décidées.
 *   tsx packages/book-factory/src/c7/patch-v3-microlot7.ts   (cwd = packages/book-factory)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { applyPatch } from './patch-v3.js';
import type { PatchContext } from './patch-v3.js';
import { buildCanonical } from './build-canonical.js';
import { operateTic } from '../doctor/tic-weaver.js';
import { DEFAULT_FAMILIES, measureRepetition, patchAdmissible, type TicFamily } from '../coherence/repetition-sensor.js';
import { makeWorldProvider, type WorldStateData } from '../doctor/world-provider.js';

const OUT = 'runs/atlas';
const BASE = 'runs/patch_v3/MANUSCRIT_V3_PATCHED.md';
const OPS_FILE = `${OUT}/MICROLOT7_OPS.json`;
const OUT_MS = `${OUT}/MANUSCRIT_V3_MICROLOT7.md`;
const LEDGER = `${OUT}/AP_MICROLOT7_LEDGER.jsonl`;
const SCAN = `${OUT}/AP_MICROLOT7_REPETITION_SCAN.md`;

const CAST = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Thomas'];
const GESTURAL_LEX = (DEFAULT_FAMILIES.find((f) => f.family === 'GESTURAL') ?? { patterns: [] }).patterns;

interface Op { order: number; id: string; chapter: number; family: TicFamily; tic: string; anchor: string; replacement: string; label: string; }

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
// Le livre ne doit JAMAIS voir une famille monter (en COMPTE) ni les répétitions exactes.
function bookGate(before: Record<string, number>, after: Record<string, number>): string[] {
  const bad: string[] = [];
  for (const k of Object.keys(before)) if ((after[k] ?? 0) > (before[k] ?? 0)) bad.push(`${k}:${before[k]}→${after[k]}`);
  return bad;
}

async function main(): Promise<void> {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const ops = (JSON.parse(readFileSync(OPS_FILE, 'utf8')) as { ops: Op[] }).ops;
  const wsData = JSON.parse(readFileSync(`${OUT}/world-state-v3.json`, 'utf8')).chapters as WorldStateData;
  const wp = makeWorldProvider(wsData);
  const ctx: PatchContext = { cast: CAST, deadCanon: [], build: { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true } };

  let working = readFileSync(BASE, 'utf8');
  const baseFamilies = famTotals(working);
  const baseBuild = await buildCanonical(working, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });
  const baseCanonHash = baseBuild.ok ? baseBuild.value.finalHash : 'BASE_BUILD_FAIL';
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  log({ event: 'BASE', file: BASE, rawSha: '24bb55dfa009', canonHash: baseCanonHash, families: baseFamilies, baseOk: baseBuild.ok });

  let applied = 0; let halted: string | null = null;
  for (const op of ops) {
    // -- charge le chapitre courant --
    const imp = importManuscript(working);
    if (!imp.ok) { log({ id: op.id, accepted: false, reason: 'IMPORT_FAIL' }); halted = `${op.id} IMPORT_FAIL`; break; }
    const ch = imp.value.chapters.find((c) => c.chapter === op.chapter);
    if (!ch) { log({ id: op.id, accepted: false, reason: `CH_${op.chapter}_ABSENT` }); halted = `${op.id} CH_ABSENT`; break; }
    const prose = ch.prose;
    const occN = prose.split(op.anchor).length - 1;
    if (occN !== 1) { log({ id: op.id, accepted: false, reason: `ANCHOR_COUNT=${occN}` }); halted = `${op.id} ANCHOR_COUNT=${occN}`; break; }
    const candidate = prose.replace(op.anchor, op.replacement);

    // -- GATE 1 : phrase (operateTic seam-surgeon) --
    const lex = op.family === 'GESTURAL' ? GESTURAL_LEX : [op.tic];
    const { result: tw } = operateTic(working, { ticId: op.id, chapter: op.chapter, tic: op.tic, anchorSentence: op.anchor, proposedReplacement: op.replacement, familyTags: [op.family] }, wp(op.chapter), lex);
    if (tw.verdict !== 'APPLIED') { log({ id: op.id, accepted: false, gate: 'operateTic', verdict: tw.verdict, reasons: tw.reasons }); halted = `${op.id} operateTic ${tw.verdict}`; break; }
    // -- GATE 1b : RepetitionSensor admissible (famille ciblée baisse, aucune ne monte) --
    const adm = patchAdmissible(prose, candidate, op.family);
    if (!adm.admissible) { log({ id: op.id, accepted: false, gate: 'patchAdmissible', reasons: adm.reasons }); halted = `${op.id} patchAdmissible`; break; }

    // -- GATE 2 : chapitre/vitalité/lang/identité (applyPatch + buildCanonical) --
    const { manuscript: next, report } = await applyPatch(working, { chapter: op.chapter, candidate, defect: 'tic', label: op.label }, ctx);
    if (!report.accepted) { log({ id: op.id, accepted: false, gate: 'applyPatch', reason: report.reason, guard: report.guard?.verdict ?? null }); halted = `${op.id} applyPatch ${report.reason}`; break; }

    // -- GATE 3 : book-wide (aucune famille ne monte) --
    const afterFamilies = famTotals(next);
    const rose = bookGate(baseFamilies, afterFamilies);
    if (rose.length > 0) { log({ id: op.id, accepted: false, gate: 'bookGate', rose }); halted = `${op.id} FAMILY_ROSE ${rose.join(',')}`; break; }

    // -- ACCEPT --
    const built = await buildCanonical(next, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });
    working = next; applied += 1;
    log({ id: op.id, chapter: op.chapter, accepted: true, tic: op.tic, anchor: op.anchor, replacement: op.replacement,
      rawHashBefore: report.hashBefore, rawHashAfter: report.hashAfter, canonHashAfter: built.ok ? built.value.finalHash : 'BUILD_FAIL',
      wordsBefore: report.wordsBefore, wordsAfter: report.wordsAfter, guard: report.guard?.verdict ?? null,
      famAfter: afterFamilies });
  }

  // -- sortie --
  writeFileSync(OUT_MS, working, 'utf8');
  const finalFamilies = famTotals(working);
  const finalBuild = await buildCanonical(working, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: true });
  const scanLines = ['# AP_MICROLOT7 — scan répétition book-wide (avant/après)', '',
    `Base : ${BASE} (rawSha 24bb55dfa009, canon ${baseCanonHash})`,
    `Micro-lot : ${OUT_MS} — ${applied}/${ops.length} appliqués${halted ? ` — HALT à ${halted}` : ''}`,
    `Canon final : ${finalBuild.ok ? finalBuild.value.finalHash : 'BUILD_FAIL'}`, '',
    '| famille | base | final | Δ |', '|---|---|---|---|'];
  for (const k of Object.keys(baseFamilies)) scanLines.push(`| ${k} | ${baseFamilies[k]} | ${finalFamilies[k] ?? 0} | ${(finalFamilies[k] ?? 0) - (baseFamilies[k] ?? 0)} |`);
  writeFileSync(SCAN, scanLines.join('\n') + '\n', 'utf8');
  console.log(`MICROLOT7_DONE applied=${applied}/${ops.length}${halted ? ` HALT=${halted}` : ''} canonFinal=${finalBuild.ok ? finalBuild.value.finalHash : 'FAIL'}`);
}
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
