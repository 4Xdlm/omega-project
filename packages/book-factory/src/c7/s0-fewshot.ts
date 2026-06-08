/**
 * OMEGA — S0-bis : le SEUL bras non testé = FEW-SHOT (montrer, pas dire).
 * S0 a prouvé que reformuler la directive (A→D) ne lève pas REVELATION/
 * CONFRONTATION (gemma4 sous-produit 37× vs humain). Hypothèse restante : un
 * EXEMPLE concret amorce le bon registre lexical. Variante E = D + 1 exemplar.
 * Décisif : si E mord ⇒ levier trouvé (réinjectable) ; si E échoue aussi ⇒
 * gemma4:31b ne sait pas produire ces beats, lever = modèle/temp (consigné).
 */

import { appendFileSync, writeFileSync } from 'node:fs';

import { measureMarkers, measureCollateral } from '../rosetta/dramatic-markers.js';

const OUT = 'runs/s0_rosetta';
const MODEL = process.env['S0_MODEL'] ?? 'gemma4:31b';
const TEMP = Number(process.env['S0_TEMP'] ?? 0.8);
const SEEDS = [101, 202, 303] as const;

const FIXED = [
  'Personnages : Garcia (ancien gardien de phare) et Léna (sa nièce).',
  'Situation : ils sont dans la cale du vieux bateau, un registre maritime ouvert entre eux sur une caisse.',
  'Écris UNE scène d\'environ 300 mots en français, prose littéraire, à la troisième personne.',
].join('\n');

/* Exemplars : DÉMONSTRATION du registre lexical cible (pas une consigne). */
const REVELATION_EX = 'EXEMPLE du registre attendu (ne PAS le recopier, écris une scène neuve dans le même registre d\'aveu) :\n« Garcia baissa les yeux. Puis il avoua : c\'était lui qui avait éteint le phare cette nuit-là. Léna comprit alors que tout ce qu\'on lui avait raconté était faux. La vérité éclata d\'un coup : son père n\'était pas mort en mer. »';
const CONFRONTATION_EX = 'EXEMPLE du registre attendu (ne PAS le recopier, écris une scène neuve dans le même registre d\'affrontement) :\n« — Tu m\'accuses, moi ? exigea Léna.\n— Je t\'accuse, oui, dit Garcia, et je te défie de le nier.\nElle se dressa, menaça de tout révéler. Le ton montait, réplique après réplique. »';

const D_REV = 'STRUCTURE OBLIGATOIRE : (1) AVANT — ce que le personnage croit ; (2) RÉVÉLATION — un personnage avoue ou découvre un fait nouveau vérifiable (verbe d\'aveu : avoua, comprit que, la vérité éclata) ; (3) APRÈS — il modifie sa décision.';
const D_CONF = 'STRUCTURE OBLIGATOIRE : un personnage ACCUSE, MENACE ou EXIGE (verbe explicite) ; l\'autre RIPOSTE en dialogue ; le ton MONTE.';

interface FsCell { fn: string; variant: 'E'; seed: number; argmax: string; success: boolean; revelationHits: number; confrontHits: number; dialogueRatio: number; words: number; maxTicPer1000w: number }

async function ollama(prompt: string, seed: number): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, think: false, options: { temperature: TEMP, seed, num_predict: 520 } }),
  });
  return ((await res.json()) as { response?: string }).response ?? '';
}

async function main(): Promise<void> {
  const cells: FsCell[] = [];
  const jobs: ReadonlyArray<{ fn: 'REVELATION' | 'CONFRONTATION'; ex: string; d: string }> = [
    { fn: 'REVELATION', ex: REVELATION_EX, d: D_REV },
    { fn: 'CONFRONTATION', ex: CONFRONTATION_EX, d: D_CONF },
  ];
  for (const job of jobs) {
    for (const seed of SEEDS) {
      const prompt = `${FIXED}\n\n${job.ex}\n\nCONTRAINTE : ${job.d}\n\nScène neuve :`;
      let prose = '';
      try { prose = await ollama(prompt, seed); } catch (e) { appendFileSync(`${OUT}/progress.log`, `ERR fewshot ${job.fn} s${seed}: ${String(e)}\n`, 'utf8'); continue; }
      const m = measureMarkers(prose);
      const col = measureCollateral(prose);
      const cell: FsCell = { fn: job.fn, variant: 'E', seed, argmax: m.argmax, success: m.argmax === job.fn, revelationHits: m.revelationHits, confrontHits: m.confrontHits, dialogueRatio: m.dialogueRatio, words: m.words, maxTicPer1000w: col.maxTicPer1000w };
      cells.push(cell);
      writeFileSync(`${OUT}/scene_${job.fn}_E_${seed}.txt`, prose, 'utf8');
      appendFileSync(`${OUT}/progress.log`, `[FEWSHOT ${job.fn} E s${seed}] argmax=${m.argmax} success=${cell.success} rev=${m.revelationHits} conf=${m.confrontHits} dia=${m.dialogueRatio} w=${m.words}\n`, 'utf8');
    }
  }
  const rate = (fn: string): number => { const s = cells.filter((c) => c.fn === fn); return s.length === 0 ? 0 : s.filter((c) => c.success).length / s.length; };
  const out = {
    arm: 'FEW_SHOT (variante E = D + exemplar)',
    revelationSuccessRate_E: rate('REVELATION'), confrontationSuccessRate_E: rate('CONFRONTATION'),
    baseline_D_successRate: { REVELATION: 0, CONFRONTATION: 0 },
    cells,
    verdict: (rate('REVELATION') >= 0.5 || rate('CONFRONTATION') >= 0.5)
      ? 'FEW_SHOT_MORD — l\'exemplar lève ce que la directive seule ne levait pas. Levier TROUVÉ et réinjectable dans l\'escalade C17.'
      : 'FEW_SHOT_INSUFFISANT — même l\'exemplar ne lève pas le beat : gemma4:31b sous-produit structurellement ces fonctions. Lever = modèle/few-shot multi-exemplaire/température (consigné, pas bricolé).',
  };
  writeFileSync(`${OUT}/S0_FEWSHOT.json`, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, (k, v) => (k === 'cells' ? undefined : v), 1));
}

main().catch((e: unknown) => { appendFileSync(`${OUT}/progress.log`, `FATAL fewshot ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
