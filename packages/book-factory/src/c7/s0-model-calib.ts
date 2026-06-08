/**
 * OMEGA — S0 calibration GÉNÉRIQUE par modèle (S0_MODEL + S0_OUT env).
 * Décide la config d'escalade dramatique du COUPLE {modèle} : production
 * NATIVE (directive D seule) vs FEW-SHOT (D + exemplar). Sortie : recommandation
 * par fonction (NATIVE si D≥0.5 et D≥E ; FEWSHOT si E>D ; UNSOLVED sinon).
 * Réutilisé pour mistral-small (ordre Francky : calibrer avant le livre).
 */

import { appendFileSync, writeFileSync } from 'node:fs';

import { FEWSHOT_EXEMPLARS, directivesFor } from '../rosetta/dramatic-grid.js';
import { measureCollateral, measureMarkers } from '../rosetta/dramatic-markers.js';

const MODEL = process.env['S0_MODEL'] ?? 'mistral-small:24b';
const OUT = process.env['S0_OUT'] ?? 'runs/s0_mistral';
const TEMP = Number(process.env['S0_TEMP'] ?? 0.8);
const SEEDS = [101, 202, 303] as const;
const FIXED = [
  'Personnages : Garcia (ancien gardien de phare) et Léna (sa nièce).',
  'Situation : ils sont dans la cale du vieux bateau, un registre maritime ouvert entre eux sur une caisse.',
  'Écris UNE scène d\'environ 300 mots en français, prose littéraire, à la troisième personne.',
].join('\n');

async function ollama(prompt: string, seed: number): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, think: false, options: { temperature: TEMP, seed, num_predict: 520 } }),
  });
  return ((await res.json()) as { response?: string }).response ?? '';
}

async function main(): Promise<void> {
  appendFileSync(`${OUT}/progress.log`, `[${new Date().toISOString()}] calib model=${MODEL}\n`, 'utf8');
  const fns = ['REVELATION', 'CONFRONTATION'] as const;
  const cells: Array<{ fn: string; cond: 'D' | 'E'; seed: number; success: boolean; hits: number; tic: number }> = [];
  for (const fn of fns) {
    const d = directivesFor(fn).find((x) => x.variant === 'D')?.text ?? '';
    const conds: ReadonlyArray<{ c: 'D' | 'E'; p: string }> = [
      { c: 'D', p: `${FIXED}\n\nCONTRAINTE DRAMATIQUE : ${d}\n\nScène :` },
      { c: 'E', p: `${FIXED}\n\n${FEWSHOT_EXEMPLARS[fn]}\n\nCONTRAINTE : ${d}\n\nScène neuve :` },
    ];
    for (const cc of conds) {
      for (const seed of SEEDS) {
        let prose = ''; try { prose = await ollama(cc.p, seed); } catch (e) { appendFileSync(`${OUT}/progress.log`, `ERR ${fn} ${cc.c} ${seed}: ${String(e)}\n`, 'utf8'); continue; }
        const m = measureMarkers(prose); const col = measureCollateral(prose);
        const hits = fn === 'REVELATION' ? m.revelationHits : m.confrontHits;
        cells.push({ fn, cond: cc.c, seed, success: m.argmax === fn, hits, tic: col.maxTicPer1000w });
        writeFileSync(`${OUT}/scene_${fn}_${cc.c}_${seed}.txt`, prose, 'utf8');
        appendFileSync(`${OUT}/progress.log`, `[${fn} ${cc.c} s${seed}] ok=${m.argmax === fn} argmax=${m.argmax} hits=${hits} tic=${col.maxTicPer1000w}\n`, 'utf8');
      }
    }
  }
  const rate = (fn: string, c: string): number => { const s = cells.filter((x) => x.fn === fn && x.cond === c); return s.length ? s.filter((x) => x.success).length / s.length : 0; };
  const reco: Record<string, string> = {};
  for (const fn of fns) {
    const d = rate(fn, 'D'); const e = rate(fn, 'E');
    reco[fn] = d >= 0.5 && d >= e ? 'NATIVE' : e > d ? 'FEWSHOT' : d > 0 ? 'NATIVE_WEAK' : 'UNSOLVED';
  }
  const out = { model: MODEL, temp: TEMP, date: new Date().toISOString().slice(0, 10),
    rates: { REVELATION: { D: rate('REVELATION', 'D'), E: rate('REVELATION', 'E') }, CONFRONTATION: { D: rate('CONFRONTATION', 'D'), E: rate('CONFRONTATION', 'E') } },
    ticMean: Number((cells.reduce((a, b) => a + b.tic, 0) / Math.max(1, cells.length)).toFixed(2)),
    recommendation: reco, cells };
  writeFileSync(`${OUT}/S0_MODEL_CALIB.json`, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ model: MODEL, rates: out.rates, reco, ticMean: out.ticMean }, null, 1));
}

main().catch((e: unknown) => { appendFileSync(`${OUT}/progress.log`, `FATAL ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
