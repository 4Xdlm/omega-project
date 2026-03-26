/**
 * OMEGA — AUDIT DE COHABITATION f26b vs RYTHME SUR CORPUS DES MAITRES
 * ~241 oeuvres FR, 6 blocs, 0 API
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ HELPERS ═══

function correlation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

function spearman(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const rank = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return arr.map(v => sorted.indexOf(v) + 1);
  };
  return correlation(rank(xs), rank(ys));
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p / 100 * (sorted.length - 1));
  return sorted[idx];
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function fmt(n: number, d = 3): string {
  return isNaN(n) ? '  NaN' : n.toFixed(d);
}

// ═══ TYPES ═══

interface CorpusEntry {
  filename: string;
  tier: string;
  language: string;
  word_count: number;
  features: Record<string, number>;
}

interface V3Entry {
  filename: string;
  author_guess: string;
  language: string;
  tier_suggestion: string;
}

interface DepthEntry {
  filename: string;
  tier: string;
  depth_features: Record<string, number>;
}

interface WorkData {
  filename: string;
  author: string;
  tier: string;
  words: number;
  f26b: number;
  f1a: number;
  f1_mean: number;
  f17_knife: number;
  f1b_ratio: number;
  f26c_period: number;
  f19a_entropy: number;
  f16c_surprise: number;
  cv_sent: number; // derived: sqrt(f1a) / f1_mean
  depth_variance_local?: number;
  depth_variance_of_variance?: number;
}

// ═══ MAIN ═══

function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — AUDIT COHABITATION f26b vs RYTHME SUR CORPUS DES MAITRES');
  console.log('  ~241 oeuvres FR — 6 blocs — 0 API');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const base = path.resolve('../..'); // omega-project root
  const corpusPath = path.join(base, 'omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json');
  const tiersPath = path.join(base, 'omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');
  const depthPath = path.join(base, 'omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json');

  // ═══ BLOC 1 — CHARGEMENT ═══

  const corpus: CorpusEntry[] = JSON.parse(fs.readFileSync(corpusPath, 'utf-8'));
  const tiers: V3Entry[] = JSON.parse(fs.readFileSync(tiersPath, 'utf-8'));
  const depth: DepthEntry[] = JSON.parse(fs.readFileSync(depthPath, 'utf-8'));

  const tiersMap = new Map(tiers.map(t => [t.filename, t]));
  const depthMap = new Map(depth.map(d => [d.filename, d]));

  const frWorks: WorkData[] = corpus
    .filter(c => c.language === 'fr')
    .map(c => {
      const t = tiersMap.get(c.filename);
      const d = depthMap.get(c.filename);
      const f = c.features;
      const f1a = f.f1a_rhythm_variance ?? 0;
      const f1m = f.f1_mean ?? 1;
      return {
        filename: c.filename,
        author: t?.author_guess ?? 'unknown',
        tier: c.tier,
        words: c.word_count,
        f26b: f.f26b_long_sent_rate ?? 0,
        f1a: f1a,
        f1_mean: f1m,
        f17_knife: f.f17_knife_count ?? 0,
        f1b_ratio: f.f1b_rhythm_ratio ?? 0,
        f26c_period: f.f26c_period_score ?? 0,
        f19a_entropy: f.f19a_approx_entropy ?? 0,
        f16c_surprise: f.f16c_lexical_surprise ?? 0,
        cv_sent: f1m > 0 ? Math.sqrt(f1a) / f1m : 0,
        depth_variance_local: d?.depth_features?.f_sentence_variance_local,
        depth_variance_of_variance: d?.depth_features?.f_variance_of_variance,
      };
    })
    .filter(w => w.f26b > 0 || w.f1a > 0); // exclure les entrees vides

  const tierGroups: Record<string, WorkData[]> = {};
  for (const w of frWorks) {
    (tierGroups[w.tier] ??= []).push(w);
  }

  console.log(`\n  Corpus FR charge: ${frWorks.length} oeuvres`);
  for (const [t, ws] of Object.entries(tierGroups).sort()) {
    console.log(`    Tier ${t}: ${ws.length}`);
  }

  // ═══ BLOC 2 — CORRELATION GLOBALE ═══

  console.log('\n═══ BLOC 2 — CORRELATION GLOBALE f26b vs RYTHME ═══\n');

  const featureKeys: (keyof WorkData)[] = ['f26b', 'f1a', 'f1_mean', 'f17_knife', 'f1b_ratio', 'f26c_period', 'cv_sent'];
  const featureLabels = ['f26b', 'f1a', 'f1_mean', 'f17_knife', 'f1b_ratio', 'f26c', 'cv_sent'];

  // 2a. Matrice de correlation
  console.log('  Matrice Pearson (corpus FR complet) :');
  console.log('  ' + ''.padEnd(12) + featureLabels.map(l => l.padStart(9)).join(''));
  console.log('  ' + '─'.repeat(12 + 9 * featureLabels.length));

  const corrMatrixGlobal: Record<string, Record<string, number>> = {};

  for (let i = 0; i < featureKeys.length; i++) {
    corrMatrixGlobal[featureLabels[i]] = {};
    const vals1 = frWorks.map(w => w[featureKeys[i]] as number);
    let row = `  ${featureLabels[i].padEnd(12)}`;
    for (let j = 0; j < featureKeys.length; j++) {
      const vals2 = frWorks.map(w => w[featureKeys[j]] as number);
      const r = correlation(vals1, vals2);
      corrMatrixGlobal[featureLabels[i]][featureLabels[j]] = Math.round(r * 1000) / 1000;
      row += fmt(r).padStart(9);
    }
    console.log(row);
  }

  // 2b. Question centrale
  const r_central = corrMatrixGlobal['f26b']['f1a'];
  const r_spearman = spearman(frWorks.map(w => w.f26b), frWorks.map(w => w.f1a));
  console.log(`\n  QUESTION CENTRALE: r(f26b, f1a) = ${fmt(r_central)} (Pearson), ${fmt(r_spearman)} (Spearman)`);
  if (r_central > 0.3) console.log('  → Les phrases longues COHABITENT avec le rythme');
  else if (r_central < -0.3) console.log('  → Les phrases longues TUENT le rythme');
  else console.log('  → Pas de lien fort — les deux sont relativement INDEPENDANTS');

  // 2c. Par tier
  console.log('\n  Par Tier :');
  console.log('  Tier    N   r(f26b,f1a)  r(f26b,f17)  r(f17,f1a)   f26b_moy  f1a_moy   f17_moy');
  console.log('  ─────────────────────────────────────────────────────────────────────────────────');

  const tierCorrData: Record<string, any> = {};

  for (const tier of ['A', 'B', 'C', 'S', 'D']) {
    const ws = tierGroups[tier] ?? [];
    if (ws.length < 3) continue;
    const r1 = correlation(ws.map(w => w.f26b), ws.map(w => w.f1a));
    const r2 = correlation(ws.map(w => w.f26b), ws.map(w => w.f17_knife));
    const r3 = correlation(ws.map(w => w.f17_knife), ws.map(w => w.f1a));
    tierCorrData[tier] = { r_f26b_f1a: r1, r_f26b_f17: r2, r_f17_f1a: r3, n: ws.length };
    console.log(`  ${tier.padEnd(5)} ${String(ws.length).padStart(3)}   ${fmt(r1).padStart(11)}  ${fmt(r2).padStart(11)}  ${fmt(r3).padStart(10)}  ${mean(ws.map(w=>w.f26b)).toFixed(3).padStart(8)}  ${mean(ws.map(w=>w.f1a)).toFixed(1).padStart(7)}  ${mean(ws.map(w=>w.f17_knife)).toFixed(1).padStart(8)}`);
  }

  // 2d. Knife role
  const r_knife_f26b_A = tierGroups['A']?.length >= 3 ? correlation(tierGroups['A'].map(w => w.f17_knife), tierGroups['A'].map(w => w.f26b)) : NaN;
  console.log(`\n  Role du knife (Tier A): r(f17, f26b) = ${fmt(r_knife_f26b_A)}`);
  if (r_knife_f26b_A > 0.3) console.log('  → Les maitres utilisent les phrases courtes AVEC les phrases longues (contraste)');
  else if (r_knife_f26b_A < -0.3) console.log('  → Les phrases courtes sont INVERSES aux phrases longues');
  else console.log('  → Pas de lien fort — usage independant');

  // ═══ BLOC 3 — FRONT DE PARETO ═══

  console.log('\n═══ BLOC 3 — FRONT DE PARETO f26b vs RYTHME ═══\n');

  const p75_f26b = percentile(frWorks.map(w => w.f26b), 75);
  const p25_f1a = percentile(frWorks.map(w => w.f1a), 25);
  const p75_f1a = percentile(frWorks.map(w => w.f1a), 75);
  const p25_f26b = percentile(frWorks.map(w => w.f26b), 25);

  // 3b. Champions de cohabitation
  const champions = frWorks.filter(w => w.f26b >= p75_f26b && w.f1a >= p75_f1a);
  console.log(`  Champions de cohabitation (f26b >= P75=${p75_f26b.toFixed(3)} ET f1a >= P75=${p75_f1a.toFixed(1)}) :`);
  console.log(`  ${'Auteur'.padEnd(35)} ${'Tier'.padStart(4)} ${'f26b'.padStart(7)} ${'f1a'.padStart(8)} ${'f17'.padStart(6)} ${'f1_mean'.padStart(8)}`);
  console.log('  ' + '─'.repeat(72));

  const champsSorted = [...champions].sort((a, b) => b.f26b - a.f26b);
  for (const c of champsSorted.slice(0, 20)) {
    const name = c.author.slice(0, 33);
    console.log(`  ${name.padEnd(35)} ${c.tier.padStart(4)} ${c.f26b.toFixed(3).padStart(7)} ${c.f1a.toFixed(1).padStart(8)} ${c.f17_knife.toFixed(0).padStart(6)} ${c.f1_mean.toFixed(1).padStart(8)}`);
  }
  console.log(`  Total: ${champions.length} | Tier A: ${champions.filter(c=>c.tier==='A').length} | Tier B: ${champions.filter(c=>c.tier==='B').length} | Tier S: ${champions.filter(c=>c.tier==='S').length}`);

  // 3c. Victimes
  const victims_longFlatRhythm = frWorks.filter(w => w.f26b >= p75_f26b && w.f1a <= p25_f1a);
  const victims_shortHighRhythm = frWorks.filter(w => w.f26b <= p25_f26b && w.f1a >= p75_f1a);

  console.log(`\n  Victimes (f26b haut + f1a bas): ${victims_longFlatRhythm.length}`);
  for (const v of victims_longFlatRhythm.slice(0, 10)) {
    console.log(`    ${v.author.slice(0, 30).padEnd(32)} ${v.tier} f26b=${v.f26b.toFixed(3)} f1a=${v.f1a.toFixed(1)}`);
  }

  console.log(`  Victimes inverses (f26b bas + f1a haut): ${victims_shortHighRhythm.length}`);
  for (const v of victims_shortHighRhythm.slice(0, 10)) {
    console.log(`    ${v.author.slice(0, 30).padEnd(32)} ${v.tier} f26b=${v.f26b.toFixed(3)} f1a=${v.f1a.toFixed(1)}`);
  }

  // 3d. Zone optimale Tier A
  const tierA = tierGroups['A'] ?? [];
  if (tierA.length >= 4) {
    console.log('\n  Zone optimale Tier A (percentiles P25-P75) :');
    console.log(`    f26b  : [${percentile(tierA.map(w=>w.f26b), 25).toFixed(3)} — ${percentile(tierA.map(w=>w.f26b), 75).toFixed(3)}]`);
    console.log(`    f1a   : [${percentile(tierA.map(w=>w.f1a), 25).toFixed(1)} — ${percentile(tierA.map(w=>w.f1a), 75).toFixed(1)}]`);
    console.log(`    f17   : [${percentile(tierA.map(w=>w.f17_knife), 25).toFixed(0)} — ${percentile(tierA.map(w=>w.f17_knife), 75).toFixed(0)}]`);
    console.log(`    f1_mean: [${percentile(tierA.map(w=>w.f1_mean), 25).toFixed(1)} — ${percentile(tierA.map(w=>w.f1_mean), 75).toFixed(1)}]`);
    console.log(`    cv_sent: [${percentile(tierA.map(w=>w.cv_sent), 25).toFixed(3)} — ${percentile(tierA.map(w=>w.cv_sent), 75).toFixed(3)}]`);
  }

  // ═══ BLOC 4 — MULTI-ECHELLE (depth features) ═══

  console.log('\n═══ BLOC 4 — ANALYSE MULTI-ECHELLE ═══\n');

  const withDepth = frWorks.filter(w => w.depth_variance_local !== undefined);
  if (withDepth.length >= 5) {
    const r_local = correlation(withDepth.map(w => w.f26b), withDepth.map(w => w.depth_variance_local!));
    const r_vov = correlation(withDepth.map(w => w.f26b), withDepth.map(w => w.depth_variance_of_variance!));
    console.log(`  Avec depth features (${withDepth.length} oeuvres) :`);
    console.log(`    r(f26b, variance_locale)       = ${fmt(r_local)}`);
    console.log(`    r(f26b, variance_of_variance)  = ${fmt(r_vov)}`);
    console.log(`    r(f1a, variance_locale)         = ${fmt(correlation(withDepth.map(w => w.f1a), withDepth.map(w => w.depth_variance_local!)))}`);
  } else {
    console.log('  Pas assez de donnees depth features pour analyse multi-echelle');
  }

  console.log('\n  Note: Les features MASTER sont moyennees sur 5 passages de ~500w.');
  console.log('  Pour une analyse par passage, relancer full_work_analyzer_v4.py');
  console.log('  avec mode fenetre glissante (recommandation, pas fait ici).');

  // ═══ BLOC 5 — LOI DE COHABITATION ═══

  console.log('\n═══ BLOC 5 — LOI DE COHABITATION ═══\n');

  const r_A = tierCorrData['A']?.r_f26b_f1a ?? NaN;

  if (r_A < -0.3) {
    console.log('  CAS 1 : CONFLIT UNIVERSEL (r < -0.3 meme chez Tier A)');
    console.log('  LOI L31 : "f26b et rythme sont structurellement en conflit.');
    console.log('  Les maitres naviguent ce conflit par alternance, pas par cohabitation.');
    console.log('  Best-of-3 est la bonne strategie."');
  } else if (r_A > 0.3) {
    console.log('  CAS 2 : COHABITATION PAR ALTERNANCE (r > +0.3 chez Tier A)');
    console.log('  LOI L31 : "Les maitres font cohabiter phrases longues et rythme.');
    console.log('  La cle est le f17_knife (contraste) : des phrases tres courtes');
    console.log('  intercalees dans les phrases longues."');
  } else {
    console.log('  CAS 3 : INDEPENDANCE (|r| < 0.3 chez Tier A)');
    console.log('  LOI L31 : "f26b et rythme sont INDEPENDANTS chez les maitres.');
    console.log('  Le conflit observe dans OMEGA (r=-0.802) est un artefact du scorer/LLM,');
    console.log('  pas une loi universelle de la prose litteraire."');
  }

  // Recommandations
  console.log('\n  RECOMMANDATIONS :');
  if (r_A < -0.3) {
    console.log('    - Ne pas chercher a maximiser les deux en meme temps');
    console.log('    - Best-of-3 navigue le compromis stochastiquement');
    console.log('    - Profils de poids par type justifies');
  } else if (r_A > 0.3) {
    console.log('    - Enrichir les prompts avec la "loi d\'alternance"');
    console.log('    - Le moteur doit produire des PARAGRAPHES longs + des COUPES courtes');
    console.log('    - Le scorer doit comprendre que f17 + f26b = richesse');
  } else {
    console.log('    - Le conflit r=-0.802 dans OMEGA est un ARTEFACT');
    console.log('    - Investiguer pourquoi les briques OMEGA montrent un conflit absent chez les maitres');
    console.log('    - Probablement un probleme de prompt de generation (LLM ne varie pas assez)');
    console.log('    - Le scorer fonctionne correctement — les axes sont bien independants');
  }

  // ═══ BLOC 6 — PROFILS PAR TYPE ═══

  console.log('\n═══ BLOC 6 — PROFILS PAR TYPE D\'OEUVRE ═══\n');

  // Manual classification of well-known Tier A authors
  const contemplativeAuthors = ['proust', 'modiano', 'duras', 'gracq', 'simon', 'woolf', 'gide'];
  const actionAuthors = ['dumas', 'hugo', 'zola', 'stendhal', 'maupassant', 'merimee'];
  const dialogueAuthors = ['celine', 'queneau', 'san-antonio', 'simenon'];

  function classify(author: string): string {
    const low = author.toLowerCase();
    for (const a of contemplativeAuthors) { if (low.includes(a)) return 'CONTEMPLATIF'; }
    for (const a of actionAuthors) { if (low.includes(a)) return 'ACTION'; }
    for (const a of dialogueAuthors) { if (low.includes(a)) return 'DIALOGUE'; }
    return 'AUTRE';
  }

  const typeGroups: Record<string, WorkData[]> = {};
  for (const w of frWorks) {
    const type = classify(w.author);
    (typeGroups[type] ??= []).push(w);
  }

  console.log('  Type           N    f26b_moy  f1a_moy   f17_moy  f1_mean_moy  cv_moy');
  console.log('  ─────────────────────────────────────────────────────────────────────');
  for (const [type, ws] of Object.entries(typeGroups).sort()) {
    if (ws.length < 3) continue;
    console.log(`  ${type.padEnd(14)} ${String(ws.length).padStart(3)}   ${mean(ws.map(w=>w.f26b)).toFixed(3).padStart(8)}  ${mean(ws.map(w=>w.f1a)).toFixed(1).padStart(7)}  ${mean(ws.map(w=>w.f17_knife)).toFixed(1).padStart(8)}  ${mean(ws.map(w=>w.f1_mean)).toFixed(1).padStart(11)}  ${mean(ws.map(w=>w.cv_sent)).toFixed(3).padStart(6)}`);
  }

  // ═══ RAPPORT FINAL ═══

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  SYNTHESE — COHABITATION f26b vs RYTHME');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log(`  Corpus        : ${frWorks.length} oeuvres FR`);
  console.log(`  r(f26b, f1a)  : ${fmt(r_central)} (global), ${fmt(r_A)} (Tier A)`);
  console.log(`  Champions     : ${champions.length} (Tier A: ${champions.filter(c=>c.tier==='A').length})`);
  console.log(`  Victimes      : ${victims_longFlatRhythm.length} (f26b haut + f1a bas)`);
  console.log(`  Knife role    : r(f17, f26b) Tier A = ${fmt(r_knife_f26b_A)}`);
  console.log(`  LOI L31       : ${r_A < -0.3 ? 'CONFLIT' : r_A > 0.3 ? 'COHABITATION' : 'INDEPENDANCE'}`);
  console.log(`  Conflit OMEGA : r=-0.802 → ${Math.abs(r_A) < 0.3 ? 'ARTEFACT (absent chez les maitres)' : 'CONFIRME par les maitres'}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');

  // ═══ SAVE ═══

  const sessionDir = path.join('sessions', `MASTERS_COHABITATION`);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Scatter data
  const scatterData = frWorks.map(w => ({
    filename: w.filename, author: w.author, tier: w.tier, words: w.words,
    f26b: w.f26b, f1a: w.f1a, f17: w.f17_knife, f1_mean: w.f1_mean, cv_sent: w.cv_sent,
  }));
  fs.writeFileSync(path.join(sessionDir, 'scatter_data.json'), JSON.stringify(scatterData, null, 2));

  // Correlation matrix
  fs.writeFileSync(path.join(sessionDir, 'correlation_matrix.json'), JSON.stringify({
    global: corrMatrixGlobal,
    by_tier: tierCorrData,
    central: { pearson: r_central, spearman: r_spearman, r_A },
    champions: champions.map(c => ({ author: c.author, tier: c.tier, f26b: c.f26b, f1a: c.f1a, f17: c.f17_knife })),
    zone_optimale_A: tierA.length >= 4 ? {
      f26b: [percentile(tierA.map(w=>w.f26b), 25), percentile(tierA.map(w=>w.f26b), 75)],
      f1a: [percentile(tierA.map(w=>w.f1a), 25), percentile(tierA.map(w=>w.f1a), 75)],
      f17: [percentile(tierA.map(w=>w.f17_knife), 25), percentile(tierA.map(w=>w.f17_knife), 75)],
      f1_mean: [percentile(tierA.map(w=>w.f1_mean), 25), percentile(tierA.map(w=>w.f1_mean), 75)],
    } : null,
    loi_l31: r_A < -0.3 ? 'CONFLIT' : r_A > 0.3 ? 'COHABITATION' : 'INDEPENDANCE',
  }, null, 2));

  console.log(`\nSaved: ${sessionDir}/scatter_data.json + correlation_matrix.json`);
}

main();
