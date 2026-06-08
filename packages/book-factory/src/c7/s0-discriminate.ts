/**
 * OMEGA — S0 DISCRIMINATEUR : le fork « marqueurs sous-détectent » VS « gemma4
 * sous-produit » tranché par densité comparée (mécanisme causal, pas opinion).
 * Densité de marqueurs de révélation / 100 mots :
 *   - scènes de révélation HUMAINES (Gold-Set positifs, recall RE V2 = 0.75)
 *   - micro-scènes gemma4 ciblant REVELATION (les 12 cellules S0)
 * Si humain ≫ gemma4 ⇒ gemma4 SOUS-PRODUIT (mesure innocentée par le Gold-Set).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { PROXY_GOLDSET } from '../goldset/proxy-goldset.js';
import { measureMarkers } from '../rosetta/dramatic-markers.js';

interface Cell { fn: string; variant: string; revelationHits: number; confrontHits: number; words: number }

function density100(hits: number, words: number): number { return words === 0 ? 0 : (hits / words) * 100; }

function main(): void {
  /* Humain : scènes de révélation labellisées vraies. */
  const humanPos = PROXY_GOLDSET.filter((g) => g.revelation);
  const humanDens = humanPos.map((g) => { const m = measureMarkers(g.text); return density100(m.revelationHits, m.words); });
  const humanMean = humanDens.reduce((a, b) => a + b, 0) / Math.max(1, humanDens.length);
  const humanHitRate = humanPos.filter((g) => measureMarkers(g.text).revelationHits >= 1).length / Math.max(1, humanPos.length);

  /* gemma4 : micro-scènes ciblant REVELATION (S0). */
  const cells = readFileSync('runs/s0_rosetta/S0_RESULTS.jsonl', 'utf8').split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l) as Cell);
  const gRev = cells.filter((c) => c.fn === 'REVELATION');
  const gemmaDens = gRev.map((c) => density100(c.revelationHits, c.words));
  const gemmaMean = gemmaDens.reduce((a, b) => a + b, 0) / Math.max(1, gemmaDens.length);

  /* Idem CONFRONTATION (densité conf/100 mots) — pas de gold humain dédié, on
   * compare la densité gemma4 à la densité de révélation humaine comme borne
   * d'ordre de grandeur d'un « beat » dramatique concentré. */
  const gConf = cells.filter((c) => c.fn === 'CONFRONTATION');
  const gConfDens = gConf.map((c) => density100(c.confrontHits, c.words));
  const gConfMean = gConfDens.reduce((a, b) => a + b, 0) / Math.max(1, gConfDens.length);

  const ratio = gemmaMean > 0 ? humanMean / gemmaMean : Infinity;
  const verdict = humanHitRate >= 0.7 && ratio >= 2
    ? 'GEMMA4_UNDERPRODUCES — la mesure est innocentée (Gold-Set hitRate ' + humanHitRate.toFixed(2) + ', densité humaine ' + ratio.toFixed(1) + '× celle de gemma4). Le levier n\'est PAS la directive (réfutation « D mord ») ni le lexique RE. Prochain bras VALIDÉ : few-shot (montrer un AVEU réel), pas re-formuler.'
    : 'AMBIGU — relancer avec corpus humain plus long (densité non concluante).';

  const out = {
    concept: 'CONCEPT-ROSETTA-DRAMATIC-FUNCTION-CALIBRATION-001',
    discriminator: 'densité de marqueurs / 100 mots — humain (Gold-Set) vs gemma4 (S0)',
    revelation: {
      humanScenes: humanPos.length, humanHitRate: Number(humanHitRate.toFixed(3)),
      humanDensityPer100w: Number(humanMean.toFixed(2)), gemmaDensityPer100w: Number(gemmaMean.toFixed(2)),
      humanOverGemma: Number(ratio.toFixed(2)),
    },
    confrontation: { gemmaDensityPer100w: Number(gConfMean.toFixed(2)) },
    markersValidation: { source: 'GOLDSET_PROXY_REPORT revelationV2', recall: 0.75, precision: 1.0, f1: 0.857 },
    verdict,
  };
  writeFileSync('runs/s0_rosetta/S0_DISCRIMINATOR.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 1));
}

main();
