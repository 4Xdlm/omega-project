/**
 * OMEGA — WS_C_HARNESS_L0_L1_P0 runner. MESURE (pas de moteur, pas de R6, pas de COH7).
 * L0 = sensibilite a l'ordre (naturel vs melange, self-contract) = gate plancher.
 * L1B = selectivite de contrat par CONSTRUCTION (T_rise/T_fall), ADVISORY (signal partage).
 * Physique legale seulement (ws-c-physics -> features.ts). Zero garage, zero LLM.
 *   tsx scripts/ws-c-l0l1-run.ts   (cwd = sovereign-engine)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  measureExtract, emotion01, auc, shuffleQuartiles,
  type PhysicsContract, type ExtractMetrics,
} from '../src/gate/emotional/ws-c-physics.js';

const PROSE = 'runs/_wsc_frthriller_prose.txt';
const WORDS_PER_EXTRACT = 2000;
const MAX_EXTRACTS_PER_BOOK = 40;

function quartilesOf(words: string[]): [string, string, string, string] {
  const q = Math.floor(words.length / 4);
  return [words.slice(0, q).join(' '), words.slice(q, 2 * q).join(' '), words.slice(2 * q, 3 * q).join(' '), words.slice(3 * q).join(' ')];
}
function selfContract(m: ExtractMetrics): PhysicsContract {
  const mn = Math.min(...m.arousalRaw); const mx = Math.max(...m.arousalRaw);
  const y = m.arousalRaw.map((a) => (mx - mn < 1e-9 ? 0.5 : (a - mn) / (mx - mn))) as unknown as [number, number, number, number];
  const decay = (y[0] - y[3]);
  return { id: 'self', X: m.valence, Y: y, ruptureQ: null, lambda: Math.max(0, decay) };
}
const C_RISE: PhysicsContract = { id: 'rise', X: [0, 0.1, 0.2, 0.3], Y: [0.2, 0.4, 0.7, 0.9], ruptureQ: null, lambda: 0 };
const C_FALL: PhysicsContract = { id: 'fall', X: [0.3, 0.1, -0.1, -0.3], Y: [0.9, 0.7, 0.4, 0.2], ruptureQ: null, lambda: 0.6 };

const raw = readFileSync(PROSE, 'utf8');
const books = raw.split('===BOOK===').map((b) => b.trim()).filter((b) => b.length > 5000);

// Collecte
const L0 = { C1: { pos: [] as number[], neg: [] as number[] }, C2: { pos: [] as number[], neg: [] as number[] }, C3: { pos: [] as number[], neg: [] as number[] } };
const L1 = { C1: { pos: [] as number[], neg: [] as number[] }, C2: { pos: [] as number[], neg: [] as number[] }, C3: { pos: [] as number[], neg: [] as number[] } };
let nExtracts = 0;

for (const book of books) {
  const words = book.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const nEx = Math.min(MAX_EXTRACTS_PER_BOOK, Math.floor(words.length / WORDS_PER_EXTRACT));
  for (let e = 0; e < nEx; e++) {
    const slice = words.slice(e * WORDS_PER_EXTRACT, (e + 1) * WORDS_PER_EXTRACT);
    const qtexts = quartilesOf(slice);
    if (qtexts.some((t) => t.split(/\s+/).length < 50)) continue;
    const mNat = measureExtract(qtexts);
    nExtracts++;

    // L0 : naturel vs melange contre self-contract
    const c = selfContract(mNat);
    const natS = emotion01(mNat, c);
    const shuf = shuffleQuartiles(qtexts, (e + book.length) >>> 0);
    const mShuf = measureExtract(shuf);
    const shufS = emotion01(mShuf, c);
    (['C1', 'C2', 'C3'] as const).forEach((k) => { L0[k].pos.push(natS[k]); L0[k].neg.push(shufS[k]); });

    // L1B : construit T_rise (arousal croissant) -> contrat C_RISE connu a priori.
    const order = [0, 1, 2, 3].sort((i, j) => mNat.arousalRaw[i] - mNat.arousalRaw[j]);
    const riseTexts = order.map((i) => qtexts[i]) as unknown as [string, string, string, string];
    const mRise = measureExtract(riseTexts);
    const correct = emotion01(mRise, C_RISE);   // bon contrat
    const wrong = emotion01(mRise, C_FALL);      // mauvais contrat
    (['C1', 'C2', 'C3'] as const).forEach((k) => { L1[k].pos.push(correct[k]); L1[k].neg.push(wrong[k]); });
  }
}

const out = {
  harness: 'WS_C_HARNESS_L0_L1_P0', date: '2026-07-21',
  corpus: 'FR-thriller 20 livres (Thilliez/Chattam/Bussi/Loubry)', extracts: nExtracts, wordsPerExtract: WORDS_PER_EXTRACT,
  legality: 'imports: ws-c-physics -> features.ts (extractSentiment/featureIntensity/featureDistance). ZERO garage, ZERO LLM.',
  L0_order_sensitivity: {
    note: 'AUC naturel vs melange (self-contract). Plancher : haut = ordre-sensible (attendu), ~0.5 = FORMULE MORTE.',
    C1: +auc(L0.C1.pos, L0.C1.neg).toFixed(4), C2: +auc(L0.C2.pos, L0.C2.neg).toFixed(4), C3: +auc(L0.C3.pos, L0.C3.neg).toFixed(4),
    gap_C3: +(L0.C3.pos.reduce((a, b) => a + b, 0) / L0.C3.pos.length - L0.C3.neg.reduce((a, b) => a + b, 0) / L0.C3.neg.length).toFixed(4),
  },
  L1B_contract_selectivity_ADVISORY: {
    note: 'AUC bon-contrat vs mauvais-contrat sur textes construits (arousal croissant -> C_RISE). ADVISORY : le tri utilise le meme signal (arousal) que le score -> non qualifiant (cf L1_ASSIGNMENT_AUDIT).',
    C1: +auc(L1.C1.pos, L1.C1.neg).toFixed(4), C2: +auc(L1.C2.pos, L1.C2.neg).toFixed(4), C3: +auc(L1.C3.pos, L1.C3.neg).toFixed(4),
  },
  status: 'L0/L1 = gate mecanique. NE qualifie PAS emotion01 (exige L2 + EMP-16). emotion01 GELE.',
};
writeFileSync('runs/WS_C_L0_L1_RESULTS.json', JSON.stringify(out, null, 1), 'utf8');
console.log(`extracts=${nExtracts}`);
console.log(`L0 order-sensitivity AUC  : C1=${out.L0_order_sensitivity.C1}  C2=${out.L0_order_sensitivity.C2}  C3=${out.L0_order_sensitivity.C3}`);
console.log(`L1B contract-selectivity  : C1=${out.L1B_contract_selectivity_ADVISORY.C1}  C2=${out.L1B_contract_selectivity_ADVISORY.C2}  C3=${out.L1B_contract_selectivity_ADVISORY.C3}  [ADVISORY]`);
