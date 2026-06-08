/**
 * OMEGA — S0_DRAMATIC_ROSETTA_GEMMA4 (harness de calibration, GO 2/2).
 * Micro-scènes COURTES, contexte FIXE, UNE seule variable : la directive.
 * Mesure mécanisme (argmax marqueur) + collatéral (tics/répétition/longueur).
 * Ollama RÉEL (Windows-side). Crash-safe : écrit chaque cellule à la volée.
 *
 * EMP-19 : on calibre le COUPLE {gemma4:31b + prompt + temp + format}. La temp
 * est FIXE et CONSIGNÉE ; tout changement = profil EXPIRED.
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import { DRAMATIC_GRID } from '../rosetta/dramatic-grid.js';
import type { MeasurableFn, Variant } from '../rosetta/dramatic-grid.js';
import { measureCollateral, measureMarkers } from '../rosetta/dramatic-markers.js';

const OUT = 'runs/s0_rosetta';
const MODEL = process.env['S0_MODEL'] ?? 'gemma4:31b';
const TEMP = Number(process.env['S0_TEMP'] ?? 0.8);
const SEEDS = [101, 202, 303] as const; // 3 graines / cellule (stabilité)
const RESULTS = `${OUT}/S0_RESULTS.jsonl`;

/* Contexte FIXE — minimal, neutre, identique pour les 16 cellules. Seule la
 * directive change. Deux personnages connus, une situation ouverte. */
const FIXED_CONTEXT = [
  'Personnages : Garcia (ancien gardien de phare) et Léna (sa nièce).',
  'Situation : ils sont dans la cale du vieux bateau, un registre maritime ouvert entre eux sur une caisse.',
  'Écris UNE scène d\'environ 300 mots en français, prose littéraire, à la troisième personne.',
].join('\n');

interface Cell {
  readonly fn: MeasurableFn; readonly variant: Variant; readonly seed: number;
  readonly argmax: string; readonly success: boolean;
  readonly revelationHits: number; readonly confrontHits: number; readonly actionHits: number;
  readonly dialogueRatio: number; readonly words: number;
  readonly maxTicPer1000w: number; readonly trigramRepeatRate: number;
}

async function ollama(prompt: string, seed: number): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, think: false, options: { temperature: TEMP, seed, num_predict: 520 } }),
  });
  const j = (await res.json()) as { response?: string };
  return j.response ?? '';
}

function alreadyDone(): ReadonlySet<string> {
  if (!existsSync(RESULTS)) return new Set();
  const done = new Set<string>();
  for (const line of readFileSync(RESULTS, 'utf8').split('\n').filter((l) => l.trim().length > 0)) {
    try { const c = JSON.parse(line) as Cell; done.add(`${c.fn}_${c.variant}_${c.seed}`); } catch { /* ignore */ }
  }
  return done;
}

async function main(): Promise<void> {
  appendFileSync(`${OUT}/progress.log`, `[${new Date().toISOString()}] S0 start model=${MODEL} temp=${TEMP} cells=${DRAMATIC_GRID.length}x${SEEDS.length}\n`, 'utf8');
  const done = alreadyDone();

  for (const d of DRAMATIC_GRID) {
    for (const seed of SEEDS) {
      const key = `${d.fn}_${d.variant}_${seed}`;
      if (done.has(key)) continue;
      const prompt = `${FIXED_CONTEXT}\n\nCONTRAINTE DRAMATIQUE : ${d.text}\n\nScène :`;
      let prose = '';
      try { prose = await ollama(prompt, seed); } catch (e) { appendFileSync(`${OUT}/progress.log`, `ERR ${key}: ${String(e)}\n`, 'utf8'); continue; }
      const m = measureMarkers(prose);
      const col = measureCollateral(prose);
      const cell: Cell = {
        fn: d.fn, variant: d.variant, seed,
        argmax: m.argmax, success: m.argmax === d.fn,
        revelationHits: m.revelationHits, confrontHits: m.confrontHits, actionHits: m.actionHits,
        dialogueRatio: m.dialogueRatio, words: m.words,
        maxTicPer1000w: col.maxTicPer1000w, trigramRepeatRate: col.trigramRepeatRate,
      };
      appendFileSync(RESULTS, `${JSON.stringify(cell)}\n`, 'utf8');
      writeFileSync(`${OUT}/scene_${key}.txt`, prose, 'utf8');
      appendFileSync(`${OUT}/progress.log`, `[${d.fn} ${d.variant} s${seed}] argmax=${m.argmax} success=${cell.success} rev=${m.revelationHits} conf=${m.confrontHits} act=${m.actionHits} dia=${m.dialogueRatio} w=${m.words} tic=${col.maxTicPer1000w}\n`, 'utf8');
    }
  }
  appendFileSync(`${OUT}/progress.log`, `[${new Date().toISOString()}] S0 done.\n`, 'utf8');
}

main().catch((e: unknown) => { appendFileSync(`${OUT}/progress.log`, `FATAL ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
