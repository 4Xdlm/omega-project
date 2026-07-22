/**
 * OMEGA — L2 SHADOW correlation. ADVISORY (annotations IA != gold humain, tribunal).
 * Calcule emotion01 (C1/C2/C3) sur chaque item du gold-set vs son contrat-intention,
 * puis Spearman vs les notes de fidelite de chaque annotateur + consensus.
 * Physique legale seulement. Aucun usage qualifiant (emotion01 reste GELE).
 *   tsx scripts/l2-shadow-correlate.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { measureExtract, emotion01, type PhysicsContract } from '../src/gate/emotional/ws-c-physics.js';

const GOLD = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/L2B_GOLDSET.json';
const CONTRACTS = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/WS_C_SYNTHETIC_CONTRACTS_SPEC.json';
const OUT = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/L2_SHADOW_CORRELATION.json';

interface Arche { id: string; quartiles: { target_X_valence: number; target_Y_arousal: number }[]; rupture: { exists: boolean; quartile: number | null }; lambda: number }
const contractsRaw = JSON.parse(readFileSync(CONTRACTS, 'utf8')) as { archetypes_min_20: Arche[] };
const byId = new Map<string, PhysicsContract>();
for (const a of contractsRaw.archetypes_min_20) {
  byId.set(a.id, {
    id: a.id,
    X: a.quartiles.map((q) => q.target_X_valence) as unknown as [number, number, number, number],
    Y: a.quartiles.map((q) => q.target_Y_arousal) as unknown as [number, number, number, number],
    ruptureQ: a.rupture.exists ? a.rupture.quartile : null,
    lambda: a.lambda,
  });
}
const gold = JSON.parse(readFileSync(GOLD, 'utf8')) as { items: { id: string; intentionId: string; text: string }[] };

// Notes de FIDELITE fournies (0-5). IA1/IA2/Gemini = peu discriminantes ; ChatGPT/Claude = lectures reelles.
const F: Record<string, Record<string, number>> = {
  IA1:     { '01':4,'02':5,'03':4,'04':5,'05':4,'06':4,'07':4,'08':4,'09':4,'10':4,'11':4,'12':4,'13':4,'14':4,'15':4,'16':4,'17':5,'18':4,'19':5,'20':4,'21':4,'22':4,'23':4,'24':5,'25':4,'26':4,'27':4,'28':5,'29':5,'30':4 },
  IA2:     { '01':4,'02':4,'03':4,'04':3,'05':4,'06':4,'07':4,'08':4,'09':4,'10':4,'11':4,'12':4,'13':4,'14':3,'15':4,'16':4,'17':4,'18':4,'19':4,'20':4,'21':4,'22':4,'23':4,'24':4,'25':4,'26':4,'27':3,'28':4,'29':4,'30':4 },
  Gemini:  { '01':4,'02':5,'03':4,'04':5,'05':4,'06':4,'07':4,'08':5,'09':4,'10':4,'11':3,'12':4,'13':5,'14':4,'15':4,'16':4,'17':5,'18':4,'19':5,'20':4,'21':4,'22':4,'23':5,'24':5,'25':4,'26':4,'27':4,'28':5,'29':5,'30':5 },
  ChatGPT: { '01':1,'02':2,'03':3,'04':4,'05':2,'06':1,'07':2,'08':2,'09':1,'10':2,'11':2,'12':1,'13':5,'14':4,'15':2,'16':1,'17':5,'18':4,'19':1,'20':2,'21':2,'22':0,'23':4,'24':1,'25':2,'26':1,'27':4,'28':4,'29':1,'30':3 },
  Claude:  { '01':2,'02':3,'03':3,'04':4,'05':2,'06':1,'07':2,'08':2,'09':1,'10':2,'11':2,'12':1,'13':5,'14':4,'15':2,'16':1,'17':5,'18':4,'19':1,'20':2,'21':2,'22':1,'23':4,'24':1,'25':2,'26':1,'27':4,'28':4,'29':1,'30':3 },
};

function spearman(a: number[], b: number[]): number {
  const rank = (v: number[]): number[] => {
    const idx = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(v.length); let i = 0;
    while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
    return r;
  };
  const ra = rank(a), rb = rank(b), n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; }
  return da && db ? +(num / Math.sqrt(da * db)).toFixed(3) : 0;
}
function std(v: number[]): number { const m = v.reduce((s, x) => s + x, 0) / v.length; return +Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length).toFixed(2); }

// emotion01 par item
const ids = gold.items.map((it) => it.id.replace('item_', ''));
const e01: Record<'C1' | 'C2' | 'C3', number[]> = { C1: [], C2: [], C3: [] };
for (const it of gold.items) {
  const c = byId.get(it.intentionId);
  const words = it.text.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const q = Math.floor(words.length / 4);
  const qt: [string, string, string, string] = [words.slice(0, q).join(' '), words.slice(q, 2 * q).join(' '), words.slice(2 * q, 3 * q).join(' '), words.slice(3 * q).join(' ')];
  const e = c ? emotion01(measureExtract(qt), c) : { C1: 0, C2: 0, C3: 0 };
  e01.C1.push(e.C1); e01.C2.push(e.C2); e01.C3.push(e.C3);
}

const annotators = Object.keys(F);
const labelVec = (name: string): number[] => ids.map((id) => F[name][id]);
const consensusDiscr = ids.map((id) => (F.ChatGPT[id] + F.Claude[id]) / 2);
const consensusAll = ids.map((id) => annotators.reduce((s, a) => s + F[a][id], 0) / annotators.length);

const rows: Record<string, unknown> = {};
for (const name of [...annotators, 'CONSENSUS_discriminants', 'CONSENSUS_all']) {
  const lab = name === 'CONSENSUS_discriminants' ? consensusDiscr : name === 'CONSENSUS_all' ? consensusAll : labelVec(name);
  rows[name] = { std_notes: std(lab), rho_C1: spearman(e01.C1, lab), rho_C2: spearman(e01.C2, lab), rho_C3: spearman(e01.C3, lab) };
}
const out = {
  analysis: 'L2_SHADOW_CORRELATION (ADVISORY — annotations IA, PAS gold humain)',
  date: '2026-07-21', n: gold.items.length,
  note: 'Spearman(emotion01_Cx, fidelite). IA1/IA2/Gemini = quasi non-discriminants (std faible). ChatGPT/Claude = lectures reelles discriminantes.',
  perAnnotator: rows,
  emotion01_std: { C1: std(e01.C1), C2: std(e01.C2), C3: std(e01.C3) },
};
writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
console.log('annotator            std  rhoC1  rhoC2  rhoC3');
for (const [k, v] of Object.entries(rows)) { const r = v as Record<string, number>; console.log(`${k.padEnd(22)} ${String(r.std_notes).padStart(4)}  ${String(r.rho_C1).padStart(5)}  ${String(r.rho_C2).padStart(5)}  ${String(r.rho_C3).padStart(5)}`); }
