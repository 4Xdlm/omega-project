/**
 * OMEGA — V4.4->R6 SHADOW : simulation de divergence composite vs style-only.
 * Question centrale du mode shadow : passer du critere STYLE-ONLY au COMPOSITE
 * constitutionnel (60/25/15) change-t-il reellement les selections, et pour quel
 * GAIN EMOTIONNEL (a quel cout de style) ? Reponse quantifiee, DETERMINISTE (seed),
 * sur des distributions realistes ou style et emotion sont partiellement correles.
 * Aucune I/O reseau, aucun LLM. Mesure pure. tsx scripts/v44-r6-divergence-sim.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { CONSTITUTION_WEIGHTS, selectWithDivergence, type CandidateScores } from '../src/gate/emotional/composite-selection.js';

/** PRNG deterministe (Mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

const K = 7;            // N=7 candidats par chapitre (DUEL_RUNS=2 -> 7, cf R7)
const TRIALS = 5000;    // chapitres simules
const RHOS = [0.0, 0.3, 0.6, 0.9]; // correlation style<->emotion

interface RhoResult {
  rho: number; divergenceRate: number;
  meanEmotionGain_all: number; meanEmotionGain_whenDiverged: number;
  meanStyleDelta_whenDiverged: number; nDiverged: number;
}

function runRho(rho: number, rand: () => number): RhoResult {
  let diverged = 0; let sumGainAll = 0; let sumGainDiv = 0; let sumStyleDiv = 0;
  for (let t = 0; t < TRIALS; t++) {
    const cands: CandidateScores[] = [];
    for (let k = 0; k < K; k++) {
      const a = rand(); const b = rand();
      const style01 = clamp01(a);
      const emotion01 = clamp01(rho * a + (1 - rho) * b); // corr ~ rho avec le style
      const logic01 = clamp01(rand());
      cands.push({ id: String(k), emotion01, logic01, style01 });
    }
    const rep = selectWithDivergence(cands, CONSTITUTION_WEIGHTS);
    const sp = cands[Number(rep.styleOnlyPickId)]!;
    const cp = cands[Number(rep.compositePickId)]!;
    const gain = cp.emotion01 - sp.emotion01;
    sumGainAll += gain;
    if (rep.diverged) { diverged++; sumGainDiv += gain; sumStyleDiv += (cp.style01 - sp.style01); }
  }
  return {
    rho,
    divergenceRate: +(diverged / TRIALS).toFixed(4),
    meanEmotionGain_all: +(sumGainAll / TRIALS).toFixed(4),
    meanEmotionGain_whenDiverged: diverged ? +(sumGainDiv / diverged).toFixed(4) : 0,
    meanStyleDelta_whenDiverged: diverged ? +(sumStyleDiv / diverged).toFixed(4) : 0,
    nDiverged: diverged,
  };
}

const rand = mulberry32(42);
const results = RHOS.map((r) => runRho(r, rand));
const out = {
  sim: 'V4_4_R6_DIVERGENCE_SIM', date: '2026-07-21',
  purpose: 'Quantifier l impact du passage style-only -> composite 60/25/15 en shadow.',
  weights: CONSTITUTION_WEIGHTS, candidatesPerChapter: K, trialsPerRho: TRIALS, seed: 42,
  model: 'style01=a; emotion01=rho*a+(1-rho)*b; logic01=uniforme. a,b ~ U(0,1). Correlation style<->emotion = rho.',
  results,
  reading: 'divergenceRate = fraction de chapitres ou le composite choisit un AUTRE jet que le style-only. meanEmotionGain_whenDiverged = gain d emotion [0,1] sur ces chapitres. meanStyleDelta_whenDiverged = cout (negatif) en style. Plus style et emotion sont decorreles (rho bas), plus le composite corrige, au prix d un leger style.',
};
mkdirSync('runs', { recursive: true });
writeFileSync('runs/V4_4_R6_DIVERGENCE_SIM.json', JSON.stringify(out, null, 1), 'utf8');
console.log('V4_4_R6_DIVERGENCE_SIM (seed=42, K=7, trials=5000/rho)');
console.log('rho  | divRate | emoGain(div) | styleCost(div) | emoGain(all)');
for (const r of results) {
  console.log(`${r.rho.toFixed(1)}  |  ${(r.divergenceRate * 100).toFixed(1)}%  |   +${r.meanEmotionGain_whenDiverged.toFixed(3)}     |   ${r.meanStyleDelta_whenDiverged.toFixed(3)}      |  +${r.meanEmotionGain_all.toFixed(3)}`);
}
