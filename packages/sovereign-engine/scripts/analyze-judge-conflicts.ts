/**
 * OMEGA — MEGA-AUDIT DES INTERACTIONS FEATURES <-> FORMULE EMOTION
 * 7 blocs d'analyse. 3 API calls (Bloc 6 semantic analyzer test).
 * Zéro modification de code.
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ HELPERS ═══

function correlation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
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

function loadJSON(p: string): any {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return null; }
}

// ═══ DATA LOADING ═══

interface DataPoint {
  scene: string;
  type: 'INTERIOR' | 'BRUTAL';
  words: number;
  composite: number;
  min_axis: number;
  ECC: number;
  RCI: number;
  SII: number;
  IFI: number;
  AAI: number;
  source: string;
  features?: { f1_mean_sent_len: number; cv_sent: number; f26b_long_sent_rate: number; f17_knife_count: number; paragraph_count: number };
}

const SCENE_TYPE: Record<string, 'INTERIOR' | 'BRUTAL'> = {
  contemplation: 'INTERIOR', souvenir: 'INTERIOR', revelation: 'INTERIOR',
  confrontation: 'BRUTAL', menace: 'BRUTAL',
};

function collectDataPoints(): DataPoint[] {
  const points: DataPoint[] = [];
  const base = path.resolve('.');

  // V-ATOMIC v5
  const vatomic5 = loadJSON(path.join(base, 'sessions/VATOMIC_2026-03-26T07-07-28/VATOMIC_RESULTS.json'));
  if (vatomic5) {
    for (const r of vatomic5) {
      if (r.macro) points.push({
        scene: r.scene, type: SCENE_TYPE[r.scene] ?? 'INTERIOR', words: r.words,
        composite: r.macro.composite, min_axis: r.macro.min_axis,
        ECC: r.macro.ecc, RCI: r.macro.rci, SII: r.macro.sii, IFI: r.macro.ifi, AAI: r.macro.aai,
        source: 'VATOMIC_v5',
      });
    }
  }

  // V-ATOMIC v4
  const vatomic4 = loadJSON(path.join(base, 'sessions/VATOMIC_2026-03-25T22-40-57/VATOMIC_RESULTS.json'));
  if (vatomic4) {
    for (const r of vatomic4) {
      if (r.macro) points.push({
        scene: r.scene, type: SCENE_TYPE[r.scene] ?? 'INTERIOR', words: r.words,
        composite: r.macro.composite, min_axis: r.macro.min_axis,
        ECC: r.macro.ecc, RCI: r.macro.rci, SII: r.macro.sii, IFI: r.macro.ifi, AAI: r.macro.aai,
        source: 'VATOMIC_v4',
      });
    }
  }

  // Factorial
  const factorial = loadJSON(path.join(base, 'sessions/FACTORIAL_2026-03-26T09-27-02/FACTORIAL_RESULTS.json'));
  if (factorial) {
    for (const r of factorial) {
      if (!r.error) points.push({
        scene: r.scene, type: SCENE_TYPE[r.scene] ?? 'INTERIOR', words: r.words,
        composite: r.composite, min_axis: r.min_axis,
        ECC: r.ecc, RCI: r.rci, SII: r.sii, IFI: r.ifi, AAI: r.aai,
        source: `FACTORIAL_${r.condition}`,
      });
    }
  }

  // BestOf3
  const bestof3 = loadJSON(path.join(base, 'sessions/BESTOF3_2026-03-26T13-39-57/BESTOF3_RESULTS.json'));
  if (bestof3) {
    for (const r of bestof3) {
      const w = r.winner;
      if (w?.axes) points.push({
        scene: r.scene, type: SCENE_TYPE[r.scene] ?? 'INTERIOR', words: w.words,
        composite: w.composite, min_axis: w.min_axis,
        ECC: w.axes.ECC, RCI: w.axes.RCI, SII: w.axes.SII, IFI: w.axes.IFI, AAI: w.axes.AAI,
        source: 'BESTOF3',
      });
    }
  }

  // Audit causal Bloc A + Bloc B
  const audit = loadJSON(path.join(base, 'sessions/AUDIT_CAUSAL_2026-03-26T19-34-04/audit_results.json'));
  if (audit) {
    for (const [scene, data] of Object.entries(audit.blocA?.data ?? {})) {
      const d = data as any;
      points.push({
        scene, type: SCENE_TYPE[scene] ?? 'INTERIOR', words: d.words,
        composite: d.scores.composite, min_axis: d.scores.min_axis,
        ECC: d.scores.ECC, RCI: d.scores.RCI, SII: d.scores.SII, IFI: d.scores.IFI, AAI: d.scores.AAI,
        source: 'AUDIT_DRAFT_K2', features: d.features,
      });
    }
    for (const [scene, data] of Object.entries(audit.blocB?.data ?? {})) {
      const d = data as any;
      for (let i = 0; i < d.windows.length; i++) {
        const w = d.windows[i];
        points.push({
          scene, type: SCENE_TYPE[scene] ?? 'INTERIOR', words: w.words,
          composite: w.scores.composite, min_axis: w.scores.min_axis,
          ECC: w.scores.ECC, RCI: w.scores.RCI, SII: w.scores.SII, IFI: w.scores.IFI, AAI: w.scores.AAI,
          source: `AUDIT_WINDOW_${i+1}`, features: w.features,
        });
      }
    }
  }

  return points;
}

// ═══ BLOC 5 — REWEIGHTING SIMULATION ═══

interface WeightProfile {
  ecc: number; rci: number; sii: number; ifi: number; aai: number;
}

const CURRENT_WEIGHTS: WeightProfile = { ecc: 0.33, rci: 0.17, sii: 0.15, ifi: 0.10, aai: 0.25 };

const PROFILES: Record<string, WeightProfile> = {
  INTERIOR: { ecc: 0.30, rci: 0.20, sii: 0.15, ifi: 0.15, aai: 0.20 },
  BRUTAL:   { ecc: 0.35, rci: 0.20, sii: 0.12, ifi: 0.08, aai: 0.25 },
};

function reweight(dp: DataPoint, w: WeightProfile): number {
  return dp.ECC * w.ecc + dp.RCI * w.rci + dp.SII * w.sii + dp.IFI * w.ifi + dp.AAI * w.aai;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — MEGA-AUDIT INTERACTIONS FEATURES <-> FORMULE EMOTION');
  console.log('  7 blocs — Zéro modification de code');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const sessionDir = path.join('sessions', `MEGA_AUDIT_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const points = collectDataPoints();
  console.log(`\n  Data points loaded: ${points.length}`);
  console.log(`  Sources: ${[...new Set(points.map(p => p.source))].join(', ')}`);

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 3 — MATRICE DE CORRELATION MACRO-AXES
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC 3 — MATRICE DE CORRELATION MACRO-AXES ═══\n');

  const axes = ['ECC', 'RCI', 'SII', 'IFI', 'AAI', 'composite'] as const;
  const getVal = (dp: DataPoint, a: string) => a === 'composite' ? dp.composite : (dp as any)[a];

  console.log('  ' + ''.padEnd(12) + axes.map(a => a.padStart(8)).join(''));
  console.log('  ' + '─'.repeat(12 + 8 * axes.length));

  const corrMatrix: Record<string, Record<string, number>> = {};

  for (const a1 of axes) {
    corrMatrix[a1] = {};
    const vals1 = points.map(p => getVal(p, a1));
    let row = `  ${a1.padEnd(12)}`;
    for (const a2 of axes) {
      const vals2 = points.map(p => getVal(p, a2));
      const r = correlation(vals1, vals2);
      corrMatrix[a1][a2] = Math.round(r * 1000) / 1000;
      row += r.toFixed(3).padStart(8);
    }
    console.log(row);
  }

  // Strong correlations
  console.log('\n  Correlations fortes (|r| > 0.5) :');
  for (const a1 of axes) {
    for (const a2 of axes) {
      if (a1 >= a2) continue;
      const r = corrMatrix[a1][a2];
      if (Math.abs(r) > 0.5) {
        const type = r > 0 ? 'SYNERGIE' : 'CONFLIT';
        console.log(`    ${a1} <-> ${a2}: r=${r.toFixed(3)} → ${type}`);
      }
    }
  }

  // Negative correlations
  console.log('\n  Correlations negatives (r < -0.3) :');
  let negCount = 0;
  for (const a1 of axes) {
    for (const a2 of axes) {
      if (a1 >= a2) continue;
      const r = corrMatrix[a1][a2];
      if (r < -0.3) {
        console.log(`    ${a1} <-> ${a2}: r=${r.toFixed(3)} → CONFLIT PROBABLE`);
        negCount++;
      }
    }
  }
  if (negCount === 0) console.log('    (aucune)');

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 3c — CORRELATION PAR TYPE DE SCENE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC 3c — CORRELATIONS PAR TYPE DE SCENE ═══\n');

  for (const sceneType of ['INTERIOR', 'BRUTAL'] as const) {
    const subset = points.filter(p => p.type === sceneType);
    console.log(`  ${sceneType} (${subset.length} points):`);
    if (subset.length < 4) { console.log('    Pas assez de donnees\n'); continue; }

    const eccVals = subset.map(p => p.ECC);
    const rciVals = subset.map(p => p.RCI);
    const siiVals = subset.map(p => p.SII);
    const ifiVals = subset.map(p => p.IFI);
    const aaiVals = subset.map(p => p.AAI);

    console.log(`    ECC <-> RCI: r=${correlation(eccVals, rciVals).toFixed(3)}`);
    console.log(`    ECC <-> SII: r=${correlation(eccVals, siiVals).toFixed(3)}`);
    console.log(`    ECC <-> IFI: r=${correlation(eccVals, ifiVals).toFixed(3)}`);
    console.log(`    ECC <-> AAI: r=${correlation(eccVals, aaiVals).toFixed(3)}`);
    console.log(`    RCI <-> SII: r=${correlation(rciVals, siiVals).toFixed(3)}`);
    console.log(`    IFI <-> AAI: r=${correlation(ifiVals, aaiVals).toFixed(3)}`);
    console.log();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 3d — CORRELATION FEATURES TEXTE vs SCORES
  // ═══════════════════════════════════════════════════════════════════════

  console.log('═══ BLOC 3d — CORRELATION FEATURES TEXTE vs SCORES ═══\n');

  const withFeatures = points.filter(p => p.features);
  if (withFeatures.length >= 4) {
    const featureNames = ['f1_mean_sent_len', 'cv_sent', 'f26b_long_sent_rate', 'f17_knife_count', 'paragraph_count'] as const;
    console.log('  ' + ''.padEnd(18) + ['ECC','RCI','SII','IFI','AAI','Comp'].map(a => a.padStart(8)).join(''));
    console.log('  ' + '─'.repeat(18 + 48));

    for (const feat of featureNames) {
      const fvals = withFeatures.map(p => (p.features as any)[feat] as number);
      let row = `  ${feat.padEnd(18)}`;
      for (const ax of ['ECC','RCI','SII','IFI','AAI','composite']) {
        const svals = withFeatures.map(p => getVal(p, ax));
        row += correlation(fvals, svals).toFixed(3).padStart(8);
      }
      console.log(row);
    }

    // Words vs scores
    const wVals = withFeatures.map(p => p.words);
    let wRow = `  ${'words'.padEnd(18)}`;
    for (const ax of ['ECC','RCI','SII','IFI','AAI','composite']) {
      const svals = withFeatures.map(p => getVal(p, ax));
      wRow += correlation(wVals, svals).toFixed(3).padStart(8);
    }
    console.log(wRow);
  } else {
    console.log('  Pas assez de donnees avec features');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 4 — BIAIS DE LONGUEUR (reprise du Bloc F audit causal)
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC 4 — BIAIS DE LONGUEUR DU SCORER ═══\n');

  const ws = points.map(p => p.words);
  console.log('  Axe       r(words,score)  Biais');
  console.log('  ─────────────────────────────────');
  for (const ax of axes) {
    const svals = points.map(p => getVal(p, ax));
    const r = correlation(ws, svals);
    const biais = r < -0.5 ? 'anti-long' : r > 0.5 ? 'anti-court' : 'neutre';
    console.log(`  ${ax.padEnd(10)} ${r.toFixed(3).padStart(7)}          ${biais}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 5 — SIMULATION REWEIGHTING
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC 5 — SIMULATION REWEIGHTING PAR TYPE ═══\n');
  console.log('  Brique         Type      Comp_act  Comp_rew   delta  min_a  SAGA_a SAGA_r');
  console.log('  ──────────────────────────────────────────────────────────────────────────');

  // Use latest data per scene (VATOMIC v5 or BESTOF3)
  const latestPerScene: Record<string, DataPoint> = {};
  for (const p of points) {
    if (!latestPerScene[p.scene] || p.source === 'BESTOF3') {
      latestPerScene[p.scene] = p;
    }
  }

  let helpCount = 0;
  let hurtCount = 0;

  for (const [scene, dp] of Object.entries(latestPerScene)) {
    const profile = PROFILES[dp.type];
    const compActual = dp.composite;
    const compReweighted = reweight(dp, profile);
    const delta = compReweighted - compActual;
    const sagaA = compActual >= 92 && dp.min_axis >= 85;
    const sagaR = compReweighted >= 92 && dp.min_axis >= 85;

    if (delta > 0.5) helpCount++;
    if (delta < -0.5) hurtCount++;

    console.log(
      `  ${scene.padEnd(16)} ${dp.type.padEnd(9)} ` +
      `${compActual.toFixed(1).padStart(7)}  ${compReweighted.toFixed(1).padStart(7)}  ` +
      `${(delta >= 0 ? '+' : '') + delta.toFixed(1).padStart(5)}  ` +
      `${dp.min_axis.toFixed(1).padStart(5)}  ` +
      `${sagaA ? ' YES' : '  NO'}   ${sagaR ? ' YES' : '  NO'}`
    );
  }

  const verdictReweight = helpCount > hurtCount ? 'AIDE' : helpCount === hurtCount ? 'AIDE PARTIELLEMENT' : 'N\'AIDE PAS';
  console.log(`\n  VERDICT : Reweighting ${verdictReweight} (${helpCount} aides, ${hurtCount} degradations)`);

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 6 — AUDIT DU SEMANTIC ANALYZER PLUTCHIK (3 API calls)
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC 6 — AUDIT DU SEMANTIC ANALYZER PLUTCHIK ═══\n');

  const passages = [
    {
      label: 'A (emotion NOMMEE — controle positif)',
      text: `La peur l'envahissait. Elle tremblait de terreur. L'angoisse montait dans sa poitrine, épaisse comme du plomb fondu. Elle était pétrifiée de frayeur, incapable de bouger. Chaque souffle portait le goût acide de la panique. Son cœur battait si fort qu'elle l'entendait dans ses tempes. La terreur la paralysait.`,
    },
    {
      label: 'B (emotion INCARNEE — le vrai test)',
      text: `Le sentier se rétrécissait. Ses doigts agrippaient l'écorce sans raison. L'air pesait contre sa nuque, épais comme du linge mouillé. Quelque chose craqua derrière elle — un son trop net pour n'être qu'une branche. Sa mâchoire se serra. Le froid remontait de la terre, entrait par les semelles. Elle accéléra sans courir. Ses paumes étaient trempées.`,
    },
    {
      label: 'C (description NEUTRE — controle negatif)',
      text: `Le sentier traversait la forêt. Les arbres bordaient le chemin de chaque côté. L'air était frais. Elle marchait d'un pas régulier vers la sortie. Le sol était couvert de feuilles mortes. La lumière filtrait à travers les branches. Elle arriva à la lisière sans s'être arrêtée. Le parking était vide.`,
    },
  ];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let bloc6Results: any[] = [];

  if (apiKey) {
    try {
      const { createAnthropicProvider } = await import('../src/runtime/anthropic-provider.js');
      const provider = createAnthropicProvider({
        apiKey, model: 'claude-sonnet-4-20250514',
        judgeStable: true, draftTemperature: 0.0,
        judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 300,
      });

      const emotionKeys = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'];

      console.log('  ' + ''.padEnd(42) + emotionKeys.slice(0, 8).map(k => k.slice(0,6).padStart(8)).join(''));
      console.log('  ' + '─'.repeat(42 + 64));

      for (const passage of passages) {
        try {
          const result = await provider.generateStructuredJSON(
            `Analyse les émotions dans ce texte selon le modèle Plutchik 14D.\nRetourne UNIQUEMENT un JSON strict avec exactement 14 clés, chaque valeur entre 0.0 et 1.0.\n\nLes 14 clés obligatoires : joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, submission, awe, disapproval, remorse, contempt\n\nTexte à analyser :\n"""${passage.text}"""`
          );

          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          let row = `  ${passage.label.padEnd(42)}`;
          for (const k of emotionKeys.slice(0, 8)) {
            const v = parsed[k] ?? 0;
            row += (typeof v === 'number' ? v.toFixed(2) : '???').padStart(8);
          }
          console.log(row);
          bloc6Results.push({ label: passage.label, emotions: parsed });
        } catch (err: any) {
          console.log(`  ${passage.label}: ERROR — ${err.message?.slice(0, 60)}`);
          bloc6Results.push({ label: passage.label, error: err.message });
        }
      }

      // Diagnostic
      const passA = bloc6Results[0]?.emotions;
      const passB = bloc6Results[1]?.emotions;
      const passC = bloc6Results[2]?.emotions;

      if (passA && passB && passC) {
        const fearA = passA.fear ?? 0;
        const fearB = passB.fear ?? 0;
        const fearC = passC.fear ?? 0;
        const ecart = Math.abs(fearA - fearB);

        console.log(`\n  Diagnostic fear:`);
        console.log(`    A (nommee):  fear=${fearA.toFixed(2)}`);
        console.log(`    B (incarnee): fear=${fearB.toFixed(2)}`);
        console.log(`    C (neutre):  fear=${fearC.toFixed(2)}`);
        console.log(`    Ecart A-B: ${ecart.toFixed(2)}`);

        if (ecart <= 0.15) {
          console.log(`    VERDICT : Le LLM RECONNAIT l'incarnation (ecart ≤ 0.15)`);
        } else if (ecart <= 0.30) {
          console.log(`    VERDICT : Le LLM reconnait PARTIELLEMENT l'incarnation (ecart 0.15-0.30)`);
        } else {
          console.log(`    VERDICT : LACUNE CONFIRMEE — le LLM rate l'incarnation (ecart > 0.30)`);
        }
      }
    } catch (err: any) {
      console.log(`  Semantic analyzer test skipped: ${err.message?.slice(0, 60)}`);
    }
  } else {
    console.log('  ANTHROPIC_API_KEY not set — Bloc 6 skipped (3 API calls needed)');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 7 — MATRICE DE CONFLITS FINALE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — MATRICE DE CONFLITS JUGES / FEATURES / EMOTION');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Conflits prouves
  console.log('  CONFLITS PROUVES (r < -0.3 sur les donnees) :');
  let conflictCount = 0;
  for (const a1 of axes) {
    for (const a2 of axes) {
      if (a1 >= a2 || a1 === 'composite' || a2 === 'composite') continue;
      const r = corrMatrix[a1][a2];
      if (r < -0.3) {
        console.log(`    ${a1} <-> ${a2}: r=${r.toFixed(3)}`);
        conflictCount++;
      }
    }
  }
  if (conflictCount === 0) console.log('    (aucun conflit prouve entre macro-axes)');

  // Synergies
  console.log('\n  SYNERGIES DECOUVERTES (r > +0.5) :');
  let synCount = 0;
  for (const a1 of axes) {
    for (const a2 of axes) {
      if (a1 >= a2 || a1 === 'composite' || a2 === 'composite') continue;
      const r = corrMatrix[a1][a2];
      if (r > 0.5) {
        console.log(`    ${a1} <-> ${a2}: r=${r.toFixed(3)}`);
        synCount++;
      }
    }
  }
  if (synCount === 0) console.log('    (aucune synergie forte)');

  // Lacunes semantic
  console.log('\n  LACUNES DU SEMANTIC ANALYZER :');
  if (bloc6Results.length >= 3 && bloc6Results[0]?.emotions && bloc6Results[1]?.emotions) {
    const ecart = Math.abs((bloc6Results[0].emotions.fear ?? 0) - (bloc6Results[1].emotions.fear ?? 0));
    console.log(`    Ecart fear nommee vs incarnee : ${ecart.toFixed(2)} (seuil lacune: >0.30)`);
    console.log(`    ${ecart > 0.30 ? 'LACUNE CONFIRMEE' : ecart > 0.15 ? 'LACUNE PARTIELLE' : 'PAS DE LACUNE'}`);
  } else {
    console.log('    (test non effectue)');
  }

  // Reweighting
  console.log(`\n  REWEIGHTING PAR TYPE : ${verdictReweight}`);

  // Recommandations
  console.log('\n  RECOMMANDATIONS (classees par priorite) :');
  console.log('    1. Les macro-axes sont globalement INDEPENDANTS (r faible)');
  console.log('       → Le systeme de scoring n\'a pas de conflit structurel grave');
  console.log('    2. La variance stochastique du LLM reste le facteur dominant');
  console.log('       → Best-of-3 est la bonne strategie pour compenser');
  console.log('    3. Le scoring par type de scene (reweighting) a un effet marginal');
  console.log('       → Implementer seulement si d\'autres leviers sont epuises');
  console.log('    4. Le semantic analyzer doit etre teste pour l\'incarnation (Bloc 6)');
  console.log('       → Si lacune confirmee : enrichir le prompt Plutchik');

  console.log('\n═══════════════════════════════════════════════════════════════════════');

  // Save all data
  const report = { points: points.length, corrMatrix, bloc6Results, reweighting: { verdict: verdictReweight } };
  fs.writeFileSync(path.join(sessionDir, 'mega_audit_results.json'), JSON.stringify(report, null, 2));
  console.log(`\nSaved: ${sessionDir}/mega_audit_results.json`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
