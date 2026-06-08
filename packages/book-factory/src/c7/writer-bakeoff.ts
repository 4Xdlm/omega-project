/**
 * OMEGA — WRITER BAKE-OFF (remarque Architecte 2026-06-08).
 * On a calibré plusieurs modèles comme JUGES ; le SCRIBE a toujours été gemma4
 * — que S0 a prouvé sous-producteur dramatique (37× vs humain). Question :
 * un autre modèle local produit-il les beats NATIVEMENT (sans béquille few-shot) ?
 *
 * Les marqueurs FR (REVELATION_RE/CONFRONT_RE/ACTION_RE, validés Gold-Set
 * recall 0.75) sont MODEL-AGNOSTIQUES : ils lisent la prose, pas le modèle.
 * Comparaison croisée donc ÉQUITABLE. EMP-19 : chaque modèle = un COUPLE
 * distinct ; on consigne le couple, on ne mélange pas.
 *
 * Deux conditions : D = directive vérifiable seule (production NATIVE) ;
 * E = few-shot (plafond). + score de MIMÉTISME (copie de l'imagerie de
 * l'exemplar — garde-fou FEWSHOT_MIMICRY_GUARD demandé par ChatGPT).
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import { FEWSHOT_EXEMPLARS, directivesFor } from '../rosetta/dramatic-grid.js';
import { measureCollateral, measureMarkers } from '../rosetta/dramatic-markers.js';

const OUT = 'runs/writer_bakeoff';
const MODELS = (process.env['BAKEOFF_MODELS'] ?? 'gemma4:31b,qwen3:32b,qwen3.5:35b-a3b,mistral-small:24b,mistral:latest').split(',');
const TEMP = Number(process.env['BAKEOFF_TEMP'] ?? 0.8);
const SEEDS = [101, 202] as const;
const FNS = ['REVELATION', 'CONFRONTATION', 'ACTION'] as const;
const RESULTS = `${OUT}/BAKEOFF_RESULTS.jsonl`;

const FIXED = [
  'Personnages : Garcia (ancien gardien de phare) et Léna (sa nièce).',
  'Situation : ils sont dans la cale du vieux bateau, un registre maritime ouvert entre eux sur une caisse.',
  'Écris UNE scène d\'environ 300 mots en français, prose littéraire, à la troisième personne.',
].join('\n');

/* Mots de contenu PROPRES à l'exemplar (hors contexte fixe) — pour le mimétisme. */
const FIXED_TOKENS = new Set((FIXED.toLowerCase().match(/[a-zà-ÿ]{4,}/giu) ?? []));
function exemplarOwnTokens(ex: string): ReadonlySet<string> {
  const t = new Set((ex.toLowerCase().match(/[a-zà-ÿ]{4,}/giu) ?? []).filter((w) => !FIXED_TOKENS.has(w)));
  for (const stop of ['exemple', 'registre', 'attendu', 'scène', 'neuve', 'même', 'recopier', 'écris', 'dans']) t.delete(stop);
  return t;
}
function mimicry(prose: string, ownTokens: ReadonlySet<string>): number {
  if (ownTokens.size === 0) return 0;
  const w = new Set((prose.toLowerCase().match(/[a-zà-ÿ]{4,}/giu) ?? []));
  let hit = 0; for (const t of ownTokens) if (w.has(t)) hit += 1;
  return Number((hit / ownTokens.size).toFixed(3));
}

async function ollama(model: string, prompt: string, seed: number): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, think: false, options: { temperature: TEMP, seed, num_predict: 520 } }),
  });
  return ((await res.json()) as { response?: string }).response ?? '';
}

function done(): ReadonlySet<string> {
  if (!existsSync(RESULTS)) return new Set();
  const s = new Set<string>();
  for (const l of readFileSync(RESULTS, 'utf8').split('\n').filter((x) => x.trim())) { try { const c = JSON.parse(l) as { key: string }; s.add(c.key); } catch { /* */ } }
  return s;
}

async function main(): Promise<void> {
  appendFileSync(`${OUT}/progress.log`, `[${new Date().toISOString()}] bakeoff start models=${MODELS.join('|')} temp=${TEMP}\n`, 'utf8');
  const already = done();
  for (const model of MODELS) {
    const t0 = Date.now();
    for (const fn of FNS) {
      const dDir = directivesFor(fn).find((d) => d.variant === 'D')?.text ?? '';
      const exemplar = fn === 'REVELATION' || fn === 'CONFRONTATION' ? FEWSHOT_EXEMPLARS[fn] : undefined;
      const own = exemplar !== undefined ? exemplarOwnTokens(exemplar) : new Set<string>();
      const conditions: ReadonlyArray<{ cond: 'D' | 'E'; prompt: string }> = [
        { cond: 'D', prompt: `${FIXED}\n\nCONTRAINTE DRAMATIQUE : ${dDir}\n\nScène :` },
        ...(exemplar !== undefined ? [{ cond: 'E' as const, prompt: `${FIXED}\n\n${exemplar}\n\nCONTRAINTE : ${dDir}\n\nScène neuve :` }] : []),
      ];
      for (const c of conditions) {
        for (const seed of SEEDS) {
          const key = `${model}__${fn}__${c.cond}__${seed}`;
          if (already.has(key)) continue;
          let prose = '';
          try { prose = await ollama(model, c.prompt, seed); } catch (e) { appendFileSync(`${OUT}/progress.log`, `ERR ${key}: ${String(e)}\n`, 'utf8'); continue; }
          const m = measureMarkers(prose); const col = measureCollateral(prose);
          const rec = {
            key, model, fn, cond: c.cond, seed, argmax: m.argmax, success: m.argmax === fn,
            revelationHits: m.revelationHits, confrontHits: m.confrontHits, actionHits: m.actionHits,
            dialogueRatio: m.dialogueRatio, words: m.words, maxTicPer1000w: col.maxTicPer1000w,
            trigramRepeatRate: col.trigramRepeatRate, mimicry: c.cond === 'E' ? mimicry(prose, own) : 0,
          };
          appendFileSync(RESULTS, `${JSON.stringify(rec)}\n`, 'utf8');
          writeFileSync(`${OUT}/scene_${key.replace(/[:.]/gu, '-')}.txt`, prose, 'utf8');
          appendFileSync(`${OUT}/progress.log`, `[${model} ${fn} ${c.cond} s${seed}] argmax=${m.argmax} ok=${rec.success} rev=${m.revelationHits} conf=${m.confrontHits} act=${m.actionHits} w=${m.words} mim=${rec.mimicry}\n`, 'utf8');
        }
      }
    }
    appendFileSync(`${OUT}/progress.log`, `[${model}] terminé en ${Math.round((Date.now() - t0) / 1000)}s\n`, 'utf8');
  }
  appendFileSync(`${OUT}/progress.log`, `[${new Date().toISOString()}] bakeoff done.\n`, 'utf8');
}

main().catch((e: unknown) => { appendFileSync(`${OUT}/progress.log`, `FATAL ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
