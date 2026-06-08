/**
 * OMEGA — S0 ANALYSE : agrège S0_RESULTS.jsonl → gagnante par fonction.
 * Gagnante = variante qui MAXIMISE le taux de succès SANS salir (collatéral
 * non pire que la variante A baseline). INTERDIT (tribunal) de promouvoir une
 * directive qui augmente la fonction mais dégrade tics/répétition.
 * Produit le PROFIL DE CALIBRATION EMP-19 (couple gemma4+prompt+temp).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { DRAMATIC_GRID } from '../rosetta/dramatic-grid.js';
import type { MeasurableFn, Variant } from '../rosetta/dramatic-grid.js';

interface Cell {
  fn: MeasurableFn; variant: Variant; seed: number; success: boolean;
  revelationHits: number; confrontHits: number; actionHits: number; dialogueRatio: number;
  words: number; maxTicPer1000w: number; trigramRepeatRate: number;
}

const RUN = 'runs/s0_rosetta';
const FNS: readonly MeasurableFn[] = ['REVELATION', 'CONFRONTATION', 'ACTION', 'TRANSITION'];
const VARS: readonly Variant[] = ['A', 'B', 'C', 'D'];

function mean(xs: readonly number[]): number { return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length; }

function main(): void {
  const cells = readFileSync(`${RUN}/S0_RESULTS.jsonl`, 'utf8').split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l) as Cell);

  const agg: Record<string, { successRate: number; n: number; ticMean: number; repeatMean: number; wordsMean: number; targetHitsMean: number }> = {};
  for (const fn of FNS) {
    for (const v of VARS) {
      const sub = cells.filter((c) => c.fn === fn && c.variant === v);
      if (sub.length === 0) continue;
      const targetHits = (c: Cell): number => fn === 'REVELATION' ? c.revelationHits : fn === 'CONFRONTATION' ? c.confrontHits : fn === 'ACTION' ? c.actionHits : 0;
      agg[`${fn}_${v}`] = {
        successRate: Number(mean(sub.map((c) => (c.success ? 1 : 0))).toFixed(3)),
        n: sub.length,
        ticMean: Number(mean(sub.map((c) => c.maxTicPer1000w)).toFixed(2)),
        repeatMean: Number(mean(sub.map((c) => c.trigramRepeatRate)).toFixed(4)),
        wordsMean: Math.round(mean(sub.map((c) => c.words))),
        targetHitsMean: Number(mean(sub.map(targetHits)).toFixed(2)),
      };
    }
  }

  /* Gagnante par fonction : meilleur successRate ; en cas d'égalité, le moins
   * sale (tic + répétition). VETO si la candidate salit > +20% vs variante A. */
  const winners: Record<string, { variant: Variant | 'NONE'; successRate: number; reason: string }> = {};
  for (const fn of FNS) {
    if (fn === 'TRANSITION') { winners[fn] = { variant: 'NONE', successRate: agg[`${fn}_A`]?.successRate ?? 0, reason: 'fonction de contrôle (baseline du modèle) — non promue' }; continue; }
    const baseTic = agg[`${fn}_A`]?.ticMean ?? 0;
    const ranked = VARS
      .map((v) => ({ v, ...(agg[`${fn}_${v}`] ?? { successRate: -1, ticMean: 0, repeatMean: 0 }) }))
      .filter((r) => r.successRate >= 0)
      .sort((a, b) => b.successRate - a.successRate || (a.ticMean + a.repeatMean) - (b.ticMean + b.repeatMean));
    const best = ranked[0];
    if (best === undefined || best.successRate <= 0) { winners[fn] = { variant: 'NONE', successRate: 0, reason: 'aucune variante n\'a produit la fonction — gemma4 résiste ; escalade insuffisante' }; continue; }
    const dirties = baseTic > 0 && best.ticMean > baseTic * 1.2;
    winners[fn] = dirties
      ? { variant: 'NONE', successRate: best.successRate, reason: `meilleure variante ${best.v} VETO : salit (tic ${best.ticMean} > 1.2× baseline ${baseTic})` }
      : { variant: best.v, successRate: best.successRate, reason: `variante ${best.v} : meilleur succès sans salir` };
  }

  /* Gradient A→D par fonction (la thèse ChatGPT : la directive vérifiable mord). */
  const gradient: Record<string, string> = {};
  for (const fn of FNS) gradient[fn] = VARS.map((v) => `${v}:${agg[`${fn}_${v}`]?.successRate ?? 'NA'}`).join(' ');

  const profile = {
    concept: 'CONCEPT-ROSETTA-DRAMATIC-FUNCTION-CALIBRATION-001',
    couple: { model: 'gemma4:31b', temp: 0.8, format: 'micro-scene-300w', promptFamily: 'FIXED_CONTEXT + CONTRAINTE DRAMATIQUE' },
    date: new Date().toISOString().slice(0, 10),
    cells: cells.length, agg, gradient, winners,
    directives: Object.fromEntries(FNS.filter((f) => winners[f]?.variant !== 'NONE' && winners[f]?.variant !== undefined).map((f) => {
      const v = winners[f]?.variant; const d = DRAMATIC_GRID.find((x) => x.fn === f && x.variant === v);
      return [f, d?.text ?? ''];
    })),
    note: 'EMP-19 : profil valable pour le COUPLE ci-dessus. Tout changement modèle/temp/format = EXPIRED. DECISION/REVERSAL hors périmètre (classifieur ne les lit pas).',
  };
  writeFileSync(`${RUN}/S0_CALIBRATION_PROFILE.json`, JSON.stringify(profile, null, 2), 'utf8');
  console.log(JSON.stringify({ gradient, winners, directivesCalibrated: Object.keys(profile.directives) }, null, 1));
}

main();
