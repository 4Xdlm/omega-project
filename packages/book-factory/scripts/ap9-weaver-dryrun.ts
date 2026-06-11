/**
 * OMEGA Book-Factory — WEAVER DRY-RUN RÉEL AP-9 + AP-10 (SHADOW, lecture seule).
 * Vérité TS : vrai `guardPatch` (seam-surgeon) + règle unifiée `patchAdmissible`
 * (RepetitionSensor) + re-scan ciblé corrigé (INV-TW-02). NE MUTE RIEN : lit le
 * canon, mesure, n'écrit aucun manuscrit.
 *
 *   npx tsx packages/book-factory/scripts/ap9-weaver-dryrun.ts
 * HOLD applyTicRepair prod : ceci ne patche pas le canon.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_FAMILIES, measureRepetition, patchAdmissible, type TicFamily } from '../src/coherence/repetition-sensor.js';
import { operateTic, type TicOccurrence } from '../src/doctor/tic-weaver.js';
import { makeWorldProvider, type WorldStateData } from '../src/doctor/world-provider.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', 'runs');
const j = (p: string): any => JSON.parse(readFileSync(path.join(ROOT, 'atlas', p), 'utf8'));
const CANON = readFileSync(path.join(ROOT, 'patch_v3', 'MANUSCRIT_V3_PATCHED.md'), 'utf8');
const wp = makeWorldProvider(j('world-state-v3.json').chapters as WorldStateData);

const GESTURAL_LEX = (DEFAULT_FAMILIES.find((f) => f.family === 'GESTURAL') ?? { patterns: [] }).patterns;
const PHRASE_LEX = ['fit un pas', 'fit un pas vers', 'fit un pas en avant'];

interface Job { occ: TicOccurrence; lex: readonly string[]; family: TicFamily; }

// AP-9 gestuel (ancres ré-ancrées branchées).
const ap9 = j('ap9-proposed-patches.json').patches as Array<{ ticId: string; chapter: number; tic: string; anchorSentence: string; proposedReplacement: string; familyTags: string[] }>;
const reMap = new Map((j('ap9-reanchored.json').reanchored as Array<{ ticId: string; reanchoredAnchor: string }>).map((r) => [r.ticId, r.reanchoredAnchor]));
const jobs: Job[] = ap9.map((p) => ({
  occ: { ticId: p.ticId, chapter: p.chapter, tic: p.tic, anchorSentence: reMap.get(p.ticId) ?? p.anchorSentence, proposedReplacement: p.proposedReplacement, familyTags: p.familyTags ?? [] },
  lex: GESTURAL_LEX, family: 'GESTURAL',
}));
// AP-10 phrase « fit un pas ».
const ap10 = j('AP10_PROPOSED_PATCHES.json').patches as Array<{ ticId: string; chapter: number; phraseTic: string; anchorSentence: string; proposedReplacement: string; familyTags: string[] }>;
for (const p of ap10) jobs.push({
  occ: { ticId: p.ticId, chapter: p.chapter, tic: 'fit un pas', anchorSentence: p.anchorSentence, proposedReplacement: p.proposedReplacement, familyTags: p.familyTags ?? [] },
  lex: PHRASE_LEX, family: 'PHRASE',
});

let applied = 0;
const esc: Record<string, number> = {};
let text = CANON;
for (const job of jobs) {
  const { result } = operateTic(text, job.occ, wp(job.occ.chapter), job.lex);
  if (result.verdict !== 'APPLIED') { esc[result.verdict] = (esc[result.verdict] ?? 0) + 1; continue; }
  const idx = text.indexOf(job.occ.anchorSentence);
  const after = text.slice(0, idx) + job.occ.proposedReplacement + text.slice(idx + job.occ.anchorSentence.length);
  const adm = patchAdmissible(text, after, job.family);
  if (!adm.admissible) { const k = `UNIFIED:${(adm.reasons[0] ?? 'REJECT').split(':')[0]}`; esc[k] = (esc[k] ?? 0) + 1; continue; }
  text = after; applied += 1;
}

const before = measureRepetition(CANON);
const a = measureRepetition(text);
console.log('=== WEAVER DRY-RUN RÉEL AP-9 + AP-10 (guardPatch + règle unifiée + re-scan ciblé) ===');
console.log(`jobs: ${jobs.length} (AP-9 ${ap9.length} + AP-10 ${ap10.length})`);
console.log(`APPLIQUÉS (2 gates) : ${applied}`);
console.log('ESCALATE/REJET :', esc);
// Le verdict « aucun axe ne monte » se juge en COMPTES (ce qu'on contrôle : on
// n'AJOUTE aucune occurrence). La densité /1000w est affichée pour info mais monte
// mécaniquement quand on RACCOURCIT le texte — ce qui est l'objectif, pas un défaut.
console.log('— par famille : COMPTE (verdict) + densité/1000w (info) (canon → dry-run) —');
let countRose = false;
for (const f of before.families) {
  const af = a.families.find((x) => x.family === f.family);
  const tBefore = f.total; const tAfter = af?.total ?? 0;
  const rose = tAfter > tBefore;
  if (rose) countRose = true;
  const flag = rose ? '  ⚠ COMPTE MONTE' : '';
  console.log(`  ${f.family.padEnd(12)} compte ${tBefore}→${tAfter}  | dens ${f.maxDensityPer1000w.toFixed(3)}→${(af?.maxDensityPer1000w ?? 0).toFixed(3)}${flag}`);
}
console.log(`exactRepeats (compte) : ${before.exactRepeatCount} → ${a.exactRepeatCount}`);
console.log(`AUCUN AXE NE MONTE (en compte) : ${!countRose && a.exactRepeatCount <= before.exactRepeatCount ? 'OUI ✓' : 'NON ✗'}`);
console.log('NOTE: densité↑ = livre plus court (objectif). Canon NON modifié (SHADOW).');
