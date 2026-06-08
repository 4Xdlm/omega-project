/**
 * OMEGA — WRITER BAKE-OFF analyse : classe les scribes candidats.
 * Critère PRIMAIRE = production dramatique NATIVE (directive D seule) sur les
 * fonctions dures (REVELATION+CONFRONTATION) — un modèle qui produit le beat
 * sans béquille est un meilleur écrivain dramatique. Secondaire : plafond
 * few-shot, mimétisme (bas = mieux), collatéral (tics/répétition bas), fluidité.
 */

import { readFileSync, writeFileSync } from 'node:fs';

interface Rec {
  model: string; fn: string; cond: 'D' | 'E'; success: boolean;
  revelationHits: number; confrontHits: number; actionHits: number;
  words: number; maxTicPer1000w: number; trigramRepeatRate: number; mimicry: number;
}

const RUN = 'runs/writer_bakeoff';
const HARD = ['REVELATION', 'CONFRONTATION'];
const mean = (xs: readonly number[]): number => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const rate = (xs: readonly Rec[]): number => xs.length ? xs.filter((r) => r.success).length / xs.length : 0;

function main(): void {
  const recs = readFileSync(`${RUN}/BAKEOFF_RESULTS.jsonl`, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Rec);
  const models = [...new Set(recs.map((r) => r.model))];

  const table = models.map((model) => {
    const mine = recs.filter((r) => r.model === model);
    const nativeHard = mine.filter((r) => r.cond === 'D' && HARD.includes(r.fn));
    const fewHard = mine.filter((r) => r.cond === 'E' && HARD.includes(r.fn));
    const nativeAction = mine.filter((r) => r.cond === 'D' && r.fn === 'ACTION');
    const wordsMean = Math.round(mean(mine.map((r) => r.words)));
    return {
      model,
      nativeDramaticSuccess: Number(rate(nativeHard).toFixed(2)),
      nativeActionSuccess: Number(rate(nativeAction).toFixed(2)),
      fewshotDramaticSuccess: Number(rate(fewHard).toFixed(2)),
      fewshotMimicry: Number(mean(fewHard.map((r) => r.mimicry)).toFixed(3)),
      ticMean: Number(mean(mine.map((r) => r.maxTicPer1000w)).toFixed(2)),
      repeatMean: Number(mean(mine.map((r) => r.trigramRepeatRate)).toFixed(4)),
      wordsMean,
      degenerate: wordsMean < 120 || wordsMean > 600, // hors-format = disqualif fluidité
    };
  });

  /* Classement : native dramatique d'abord (le Graal), puis few-shot plafond,
   * puis pénalité mimétisme + collatéral. Disqualifie le dégénéré. */
  const ranked = [...table].filter((t) => !t.degenerate).sort((a, b) =>
    b.nativeDramaticSuccess - a.nativeDramaticSuccess
    || b.fewshotDramaticSuccess - a.fewshotDramaticSuccess
    || (a.fewshotMimicry + a.ticMean / 10) - (b.fewshotMimicry + b.ticMean / 10),
  );
  const best = ranked[0];
  const gemma = table.find((t) => t.model.startsWith('gemma4'));

  const verdict = best === undefined
    ? 'AUCUN modèle exploitable (tous dégénérés ou hors-format).'
    : best.model.startsWith('gemma4')
      ? `gemma4 RESTE le meilleur scribe dramatique natif (${best.nativeDramaticSuccess}). Le bake-off CONFIRME le choix — few-shot reste nécessaire (la béquille est justifiée).`
      : best.nativeDramaticSuccess > (gemma?.nativeDramaticSuccess ?? 0)
        ? `${best.model} BAT gemma4 en production dramatique NATIVE (${best.nativeDramaticSuccess} vs ${gemma?.nativeDramaticSuccess ?? 0}). Candidat scribe V3 — re-calibration EMP-19 requise (nouveau couple) AVANT adoption. Mimétisme few-shot ${best.fewshotMimicry}.`
        : `${best.model} en tête au classement composite mais SANS supériorité native nette vs gemma4 — pas de bascule justifiée (EMP-16 : pas de changement moteur sans gain prouvé).`;

  const out = {
    bakeoff: 'WRITER_BAKEOFF', date: new Date().toISOString().slice(0, 10), temp: 0.8,
    note: 'Marqueurs FR model-agnostiques (Gold-Set recall 0.75). Chaque modèle = COUPLE EMP-19 distinct.',
    table, ranked: ranked.map((r) => r.model), best: best?.model ?? null, verdict,
  };
  writeFileSync(`${RUN}/WRITER_BAKEOFF_VERDICT.json`, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 1));
}

main();
