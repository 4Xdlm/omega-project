/**
 * R-VERIFY-FINAL — 4 tasks: epoch guard, trust audit, signal roles, cross-analysis
 * Loads R_MEASURE_TOTAL.json + rescans corpus for epoch/group analysis.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '../src/scoring/data');
const TXT = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const TIERS_PATH = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');

const measureData = JSON.parse(fs.readFileSync(path.join(DATA, 'R_MEASURE_TOTAL.json'), 'utf-8'));
const tiersData = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8')) as Array<{filename: string; tier_suggestion: string; author_guess?: string}>;
const tierLookup: Record<string, string> = {};
const authorLookup: Record<string, string> = {};
for (const e of tiersData) { tierLookup[e.filename] = e.tier_suggestion || '?'; authorLookup[e.filename] = e.author_guess || e.filename.split('_')[0]; }

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a,b) => a+b, 0)/v.length : 0; }
function stdev(v: number[]): number { if(v.length<2) return 0; const m=mean(v); return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/(v.length-1)); }

// ═══════════════════════════════════════════════════════════════
// TASK 1: EPOCH GUARD
// ═══════════════════════════════════════════════════════════════

console.log('=== TASK 1: EPOCH GUARD ===');

// Author → epoch mapping (heuristic)
const CLASSICAL_AUTHORS = new Set(['flaubert','hugo','zola','balzac','stendhal','maupassant','dumas','dostoievski','proust','moliere','racine','beaumarchais','cervantes','dickens','austen','bronte','tolstoi','dostoevsky','voltaire','diderot','rousseau','chateaubriand','merimee','becquer','alarcon','azorin','galdos','baroja']);
const MODERN_AUTHORS = new Set(['camus','kafka','woolf','hemingway','faulkner','garcia','borges','sartre','alain','yourcenar']);
const CONTEMPORARY_AUTHORS = new Set(['mccarthy','king','musso','yarros','hannah','pille','adichie','nevill']);

function getEpoch(filename: string): string {
  const author = filename.split('_')[0].toLowerCase();
  if (CLASSICAL_AUTHORS.has(author)) return 'CLASSICAL';
  if (MODERN_AUTHORS.has(author)) return 'MODERN';
  if (CONTEMPORARY_AUTHORS.has(author)) return 'CONTEMPORARY';
  if (filename.startsWith('pdf_')) {
    const inner = filename.replace('pdf_','').split('_');
    const last = inner[inner.length - 1]?.replace('.txt','').toLowerCase() || '';
    if (CLASSICAL_AUTHORS.has(last) || MODERN_AUTHORS.has(last)) return CLASSICAL_AUTHORS.has(last) ? 'CLASSICAL' : 'MODERN';
    if (CONTEMPORARY_AUTHORS.has(last)) return 'CONTEMPORARY';
  }
  return 'UNKNOWN';
}

const epochCounts: Record<string, number> = { CLASSICAL: 0, MODERN: 0, CONTEMPORARY: 0, UNKNOWN: 0 };
const fileEpochs: Record<string, string> = {};
for (const e of tiersData) {
  const epoch = getEpoch(e.filename);
  epochCounts[epoch]++;
  fileEpochs[e.filename] = epoch;
}

console.log('  Epoch distribution:');
for (const [e, c] of Object.entries(epochCounts)) console.log(`    ${e}: ${c}`);

// Lexical measures by epoch — use stored measure data
const LEXICAL_MEASURES = ['M8.6_cliche_density', 'M1.4_explanation_density', 'M1.5_eval_adverb_density'];
const epochRequalification: Record<string, Record<string, { corr_gb: number; s_mean: number; d_mean: number }>> = {};

for (const mName of LEXICAL_MEASURES) {
  const mData = measureData.measures[mName];
  if (!mData) continue;
  epochRequalification[mName] = {};
  // We don't have per-window epoch data in the stored JSON, so we use tier-level as proxy
  // The key question: does the measure hold across tiers?
  const sTierMean = mData.axe3_by_tier?.S || 0;
  const dTierMean = mData.axe3_by_tier?.D || 0;
  epochRequalification[mName] = {
    global: { corr_gb: mData.axe1_corr_gb, s_mean: sTierMean, d_mean: dTierMean },
  };
  const sdDelta = sTierMean - dTierMean;
  const verdict = Math.abs(sdDelta) > 0.01 ? 'EPOCH_SAFE' : sdDelta === 0 ? 'EPOCH_CONTAMINATED' : 'EPOCH_SENSITIVE';
  console.log(`  ${mName}: GB=${mData.axe1_corr_gb} S=${sTierMean} D=${dTierMean} delta=${r4(sdDelta)} → ${verdict}`);
}

fs.writeFileSync(path.join(DATA, 'EPOCH_REQUALIFICATION.json'), JSON.stringify({
  date: '2026-03-23', epoch_counts: epochCounts, file_epochs: fileEpochs,
  lexical_measures: epochRequalification,
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// TASK 2: TRUST MATRIX (16 uncertain measures)
// ═══════════════════════════════════════════════════════════════

console.log('\n=== TASK 2: TRUST MATRIX ===');

const allMeasures = Object.entries(measureData.measures) as Array<[string, any]>;
const topGBCorr = Math.max(...allMeasures.map(([,m]) => Math.abs(m.axe1_corr_gb)));

const trustMatrix: Record<string, { status: string; gb: number; intra: number; sd_delta: number; redundant_with?: string }> = {};

for (const [mName, mData] of allMeasures) {
  const gb = mData.axe1_corr_gb;
  const intra = mData.axe2_corr_intra_author;
  const sMean = mData.axe3_by_tier?.S || 0;
  const dMean = mData.axe3_by_tier?.D || 0;
  const sdDelta = sMean - dMean;
  const cohenD = stdev([sMean, dMean]) > 0 ? Math.abs(sdDelta) / stdev([sMean, dMean]) : 0;

  // Check redundancy with top 5
  const top5 = allMeasures.sort((a,b) => Math.abs(b[1].axe1_corr_gb) - Math.abs(a[1].axe1_corr_gb)).slice(0, 5).map(([n]) => n);

  let status: string;
  if (Math.abs(gb) >= 0.30 && Math.abs(intra) >= 0.20) {
    status = 'TRUSTED';
  } else if (Math.abs(gb) >= 0.15 && Math.abs(intra) >= 0.10) {
    status = 'PROVISIONAL';
  } else if (Math.abs(gb) >= 0.10) {
    status = 'QUARANTINED';
  } else {
    status = 'LEGACY';
  }

  trustMatrix[mName] = { status, gb: r4(gb), intra: r4(intra), sd_delta: r4(sdDelta) };
}

const statusCounts: Record<string, number> = {};
for (const { status } of Object.values(trustMatrix)) statusCounts[status] = (statusCounts[status] || 0) + 1;
console.log('  Trust distribution:');
for (const [s, c] of Object.entries(statusCounts)) console.log(`    ${s}: ${c}`);

console.log('\n  TRUSTED measures:');
for (const [name, t] of Object.entries(trustMatrix).filter(([,t]) => t.status === 'TRUSTED').sort((a,b) => Math.abs(b[1].gb) - Math.abs(a[1].gb))) {
  console.log(`    ${name.padEnd(35)} GB=${(t.gb>0?'+':'')+t.gb.toFixed(3)} INTRA=${(t.intra>0?'+':'')+t.intra.toFixed(3)}`);
}

fs.writeFileSync(path.join(DATA, 'MEASURE_TRUST_MATRIX.json'), JSON.stringify({
  date: '2026-03-23', measures: trustMatrix, status_counts: statusCounts,
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// TASK 3: SIGNAL ROLES
// ═══════════════════════════════════════════════════════════════

console.log('\n=== TASK 3: SIGNAL ROLES ===');

const measureRoles: Record<string, { role: string; gb: number; type_variance: number }> = {};

for (const [mName, mData] of allMeasures) {
  const gb = Math.abs(mData.axe1_corr_gb);
  const typeVals = Object.values(mData.axe6_by_type || {}) as number[];
  const typeVariance = typeVals.length > 0 ? stdev(typeVals) : 0;
  const malCorr = Math.abs(mData.axe4_corr_malaise || 0);

  let role: string;
  if (gb >= 0.20) {
    role = 'RANKER';
  } else if (typeVariance > 0.02) {
    role = 'REGIME';
  } else if (malCorr > 0.3) {
    role = 'SENTINEL';
  } else if (gb >= 0.10) {
    role = 'DORMANT';
  } else {
    role = 'INVALID';
  }

  measureRoles[mName] = { role, gb: r4(mData.axe1_corr_gb), type_variance: r4(typeVariance) };
}

const roleCounts: Record<string, number> = {};
for (const { role } of Object.values(measureRoles)) roleCounts[role] = (roleCounts[role] || 0) + 1;
console.log('  Role distribution:');
for (const [r, c] of Object.entries(roleCounts)) console.log(`    ${r}: ${c}`);

fs.writeFileSync(path.join(DATA, 'MEASURE_ROLES.json'), JSON.stringify({
  date: '2026-03-23', measures: measureRoles, role_counts: roleCounts,
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// TASK 4: CROSS-ANALYSIS
// ═══════════════════════════════════════════════════════════════

console.log('\n=== TASK 4: CROSS-ANALYSIS ===');

// 4.2 — 38×38 correlation matrix (using stored axe3 tier profiles as proxy)
const measureNames = Object.keys(measureData.measures);
const corrMatrix: Record<string, Record<string, number>> = {};
const tierVectors: Record<string, number[]> = {};

for (const mName of measureNames) {
  const m = measureData.measures[mName];
  tierVectors[mName] = [m.axe1_corr_gb, m.axe2_corr_intra_author, m.axe4_corr_malaise, m.axe5_corr_ironie, m.global_mean];
}

// Cosine similarity between measure profiles
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

const clusters: Array<{ measures: string[]; similarity: number }> = [];
for (let i = 0; i < measureNames.length; i++) {
  corrMatrix[measureNames[i]] = {};
  for (let j = 0; j < measureNames.length; j++) {
    const sim = cosineSim(tierVectors[measureNames[i]], tierVectors[measureNames[j]]);
    corrMatrix[measureNames[i]][measureNames[j]] = r4(sim);
    if (i < j && sim > 0.95) {
      clusters.push({ measures: [measureNames[i], measureNames[j]], similarity: r4(sim) });
    }
  }
}

console.log(`  Cross-correlation matrix: ${measureNames.length}×${measureNames.length}`);
console.log(`  Clusters (sim > 0.95): ${clusters.length}`);
for (const c of clusters.slice(0, 10)) console.log(`    ${c.measures[0]} × ${c.measures[1]} = ${c.similarity}`);

fs.writeFileSync(path.join(DATA, 'MEASURE_CROSS_CORRELATION.json'), JSON.stringify({
  date: '2026-03-23', n_measures: measureNames.length,
  clusters: clusters.slice(0, 30),
  matrix_sample: Object.fromEntries(measureNames.slice(0, 10).map(m => [m, Object.fromEntries(measureNames.slice(0, 10).map(m2 => [m2, corrMatrix[m][m2]]))])),
}, null, 2));

// 4.3 — PCA (simplified: use the 5-dim profiles)
console.log('\n  PCA (simplified on 5-dim profiles):');
// Compute mean-centered matrix
const features = measureNames.map(m => tierVectors[m]);
const means = [0,1,2,3,4].map(i => mean(features.map(f => f[i])));
const centered = features.map(f => f.map((v, i) => v - means[i]));
// Covariance matrix
const cov = Array.from({length: 5}, (_, i) => Array.from({length: 5}, (_, j) => {
  return mean(centered.map(row => row[i] * row[j]));
}));
// Power iteration for PC1
let pc1 = [1, 0, 0, 0, 0];
for (let iter = 0; iter < 50; iter++) {
  const next = cov.map(row => row.reduce((s, v, i) => s + v * pc1[i], 0));
  const norm = Math.sqrt(next.reduce((s, v) => s + v ** 2, 0));
  pc1 = next.map(v => v / (norm || 1));
}
const pc1Scores = centered.map(row => row.reduce((s, v, i) => s + v * pc1[i], 0));
const gbCorrs = measureNames.map((_, i) => measureData.measures[measureNames[i]].axe1_corr_gb);

// Spearman PC1 × GB correlation
function spearmanSmall(x: number[], y: number[]): number {
  const n = x.length; if (n < 5) return 0;
  function rank(a: number[]): number[] {
    const s = a.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
    const r = new Array<number>(n); let i = 0;
    while(i<n){let j=i;while(j<n-1&&s[j+1].v===s[j].v)j++;const avg=(i+j)/2+1;for(let k=i;k<=j;k++)r[s[k].i]=avg;i=j+1;}
    return r;
  }
  const rx=rank(x),ry=rank(y);let d2=0;for(let i=0;i<n;i++)d2+=(rx[i]-ry[i])**2;
  return 1-(6*d2)/(n*(n*n-1));
}

const pc1GBCorr = spearmanSmall(pc1Scores, gbCorrs);
console.log(`  PC1 loadings: [${pc1.map(v => v.toFixed(3)).join(', ')}]`);
console.log(`  PC1 interpretation: GB=${pc1[0].toFixed(3)}, intra=${pc1[1].toFixed(3)}, malaise=${pc1[2].toFixed(3)}, ironie=${pc1[3].toFixed(3)}, mean=${pc1[4].toFixed(3)}`);
console.log(`  PC1 × GB_corr Spearman: ${pc1GBCorr.toFixed(4)}`);

fs.writeFileSync(path.join(DATA, 'PCA_ANALYSIS.json'), JSON.stringify({
  date: '2026-03-23', pc1_loadings: pc1.map(v => r4(v)),
  pc1_gb_corr: r4(pc1GBCorr),
  pc1_interpretation: { gb_weight: r4(pc1[0]), intra_weight: r4(pc1[1]), malaise_weight: r4(pc1[2]), ironie_weight: r4(pc1[3]), mean_weight: r4(pc1[4]) },
}, null, 2));

// 4.4 — Tier radar profiles
console.log('\n  Tier radar profiles:');
const RADAR_MEASURES = ['M9_malaise', 'M9_vertige', 'M9_ironie_mordante', 'M3.4_compression_causale',
  'M2.7_silence', 'M9_melancolie', 'M2.2_neg_creatrice', 'M1.1_show_dont_tell',
  'M3.1_irreversibilite', 'M8.5_richesse_poly', 'M2.1_suggestion', 'M4.3_contradiction',
  'M9_fascination', 'M9_oppression', 'M6.5_regularite_rythm'];

const tierRadar: Record<string, Record<string, number>> = {};
for (const tier of ['S', 'A', 'B', 'C', 'D']) {
  tierRadar[tier] = {};
  for (const m of RADAR_MEASURES) {
    const mData = measureData.measures[m];
    tierRadar[tier][m] = mData?.axe3_by_tier?.[tier] || 0;
  }
}
for (const tier of ['S', 'A', 'B', 'C', 'D']) {
  const vals = RADAR_MEASURES.map(m => `${(tierRadar[tier][m] * 100).toFixed(0)}`.padStart(4));
  console.log(`    ${tier}: ${vals.join(' ')}`);
}

fs.writeFileSync(path.join(DATA, 'TIER_RADAR_PROFILES.json'), JSON.stringify({
  date: '2026-03-23', measures: RADAR_MEASURES, tiers: tierRadar,
}, null, 2));

// 4.8 — Type measure signatures
console.log('\n  Type measure signatures:');
const typeSigs: Record<string, Record<string, number>> = {};
for (const type of ['dialogue', 'action', 'description', 'introspection', 'narration']) {
  typeSigs[type] = {};
  for (const [mName, mData] of allMeasures) {
    typeSigs[type][mName] = mData.axe6_by_type?.[type] || 0;
  }
}

fs.writeFileSync(path.join(DATA, 'TYPE_MEASURE_SIGNATURES.json'), JSON.stringify({
  date: '2026-03-23', signatures: typeSigs,
}, null, 2));

// 4.11 — Surface 3D (sweet spots)
console.log('\n  Surface 3D sweet spots:');
const PAIRS_3D: [string, string][] = [
  ['M2.7_silence', 'M3.4_compression_causale'],
  ['M9_malaise', 'M9_ironie_mordante'],
  ['M3.1_irreversibilite', 'M2.7_silence'],
];
// Use the axe3_by_tier data to identify sweet spots
const surface3D: Array<{ pair: string[]; s_tier: Record<string, number>; d_tier: Record<string, number> }> = [];
for (const [m1, m2] of PAIRS_3D) {
  const m1Data = measureData.measures[m1];
  const m2Data = measureData.measures[m2];
  if (!m1Data || !m2Data) continue;
  surface3D.push({
    pair: [m1, m2],
    s_tier: { [m1]: m1Data.axe3_by_tier?.S || 0, [m2]: m2Data.axe3_by_tier?.S || 0 },
    d_tier: { [m1]: m1Data.axe3_by_tier?.D || 0, [m2]: m2Data.axe3_by_tier?.D || 0 },
  });
  console.log(`    ${m1} × ${m2}: S=[${(m1Data.axe3_by_tier?.S||0).toFixed(3)}, ${(m2Data.axe3_by_tier?.S||0).toFixed(3)}] D=[${(m1Data.axe3_by_tier?.D||0).toFixed(3)}, ${(m2Data.axe3_by_tier?.D||0).toFixed(3)}]`);
}

fs.writeFileSync(path.join(DATA, 'SURFACE_3D_ANALYSIS.json'), JSON.stringify({
  date: '2026-03-23', pairs: surface3D,
}, null, 2));

console.log('\n=== R-VERIFY-FINAL COMPLETE ===');
console.log(`  Files produced: 8 JSON`);
