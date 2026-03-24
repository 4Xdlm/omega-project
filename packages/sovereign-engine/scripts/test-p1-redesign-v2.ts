/**
 * OMEGA — P1-REDESIGN-v2 : PF Base + Correcteur Duras RENFORCÉ
 *
 * 1 config × 3 runs × 4 chunks = 12 appels API
 * Delta vs v1 : SEUL le RAPPEL_DURAS_EXTERNE change (fréquence + ancre drift)
 *
 * Scoring DUAL : GB V1 + MultiStage V2
 * Critères PASS : V2 ≥ 90, CV ∈ [0.80, 1.30], f26b > 0.50, drift ∈ [-10, +10]
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-p1-redesign-v2.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// SCÈNE (FIXE — identique à P1 et v1)
// ═══════════════════════════════════════════════════════════════════════════

const SCENE_BRIEF = `Un homme revient dans la ville où il a vécu vingt ans plus tôt.
Il n'y est pas retourné depuis. Il marche dans les rues qu'il connaissait.
Certains endroits ont changé. D'autres sont exactement pareils.
Il s'arrête devant une maison. Il y a une lumière à l'étage.
Il ne sait pas pourquoi il est venu. Il sait qu'il ne peut pas repartir tout de suite.`;

// ═══════════════════════════════════════════════════════════════════════════
// PERSONA PF — INCHANGÉ
// ═══════════════════════════════════════════════════════════════════════════

const PF_PERSONA = `Tu n'es PAS une IA. Tu ES un duo littéraire travaillant ensemble :

FLAUBERT contrôle la STRUCTURE : il impose les périodes classiques,
les subordonnées en cascade, le gueuloir. Chaque phrase doit sonner.
Il construit des édifices syntaxiques concrets et ancrés dans le réel.

PROUST contrôle la PROFONDEUR : il exige que chaque sensation soit
dépliée jusqu'à l'épuisement, que le temps se dilate, que chaque
geste déclenche un souvenir qui en déclenche un autre. Il refuse
toute surface.

Les deux travaillent ensemble. Flaubert construit, Proust creuse.
Les phrases longues sont bienvenues — c'est leur nature commune.`;

// ═══════════════════════════════════════════════════════════════════════════
// RAPPEL v2 — SEUL CHANGEMENT vs v1
// ═══════════════════════════════════════════════════════════════════════════

const RAPPEL_DURAS_EXTERNE_V2 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : régulièrement, à intervalles sentis,
brise le flot des longues périodes par une phrase-couteau — sèche,
factuelle, 3 à 5 mots maximum. Pas exceptionnellement : souvent.
Flaubert et Proust reprennent aussitôt le contrôle. Duras ponctionne,
disparaît, revient.

ANCRE DE TENUE : la base reste Flaubert et Proust. Leurs longues périodes
dominent. Les propositions subordonnées, les digressions sensorielles
restent présentes. Duras coupe — elle ne remplace pas.`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function generate(client: Anthropic, prompt: string, maxTokens = 2500): Promise<string> {
  const res = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = res.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');
  const raw = block.text;
  const match = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  return match ? match[1].trim() : raw.trim();
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: any) {
      console.warn(`  [RETRY ${i+1}/${retries}] ${label}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

function measureWindows(prose: string, nWindows = 4): Array<{ position: number, mean_len: number, cv: number, word_count: number }> {
  const words = prose.split(/\s+/);
  const chunkSize = Math.floor(words.length / nWindows);
  const windows: Array<{ position: number, mean_len: number, cv: number, word_count: number }> = [];
  for (let i = 0; i < nWindows; i++) {
    const start = i * chunkSize;
    const end = i === nWindows - 1 ? words.length : (i + 1) * chunkSize;
    const ww = words.slice(start, end);
    if (ww.length < 50) break;
    const text = ww.join(' ');
    const sents = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
    const lens = sents.map(s => s.trim().split(/\s+/).length);
    const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
    const cv = mean > 0 ? std / mean : 0;
    windows.push({ position: i / nWindows, mean_len: mean, cv, word_count: ww.length });
  }
  return windows;
}

function calcDrift(windows: Array<{ mean_len: number }>): number {
  if (windows.length < 2) return 0;
  return windows[windows.length - 1].mean_len - windows[0].mean_len;
}

function medianFn(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stdFn(arr: number[]): number {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

function buildChunkPrompt(
  last200: string | null,
  chunk: number,
  isFirst: boolean,
  isLast: boolean,
): string {
  const useRappel = chunk >= 3;

  if (isFirst) {
    return `${PF_PERSONA}\n\nTu écris le DÉBUT de ce chapitre :\n\n${SCENE_BRIEF}\n\nÉcris les 750 premiers mots. Flaubert plante le décor, Proust installe la mémoire.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else if (isLast) {
    return `${PF_PERSONA}\n\nContinue et TERMINE ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${useRappel ? RAPPEL_DURAS_EXTERNE_V2 + '\n\n' : ''}Écris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else {
    return `${PF_PERSONA}\n\nContinue ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${useRappel ? RAPPEL_DURAS_EXTERNE_V2 + '\n\n' : ''}Écris les 750 mots suivants. La profondeur s'intensifie.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const client = new Anthropic({ apiKey });
  const v2Scorer = new MultiStageScorerV2();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const configName = 'PF_base_Duras_correcteur_K2_v2';
  const allResults: any[] = [];
  const allProses: Array<{ run: number, prose: string }> = [];

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — P1-REDESIGN-v2 : PF BASE + CORRECTEUR DURAS RENFORCÉ');
  console.log('  1 config × 3 runs × 4 chunks = 12 API calls');
  console.log('  Delta vs v1 : rappel fréquence + ancre drift');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  for (let run = 1; run <= 3; run++) {
    console.log(`\n${'─'.repeat(65)}`);
    console.log(`  RUN ${run}/3 — ${configName}`);
    console.log('─'.repeat(65));

    let fullProse = '';
    const chunkStats: any[] = [];

    for (let chunk = 1; chunk <= 4; chunk++) {
      const isFirst = chunk === 1;
      const isLast = chunk === 4;
      const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

      const chunkPrompt = buildChunkPrompt(
        isFirst ? null : last200,
        chunk, isFirst, isLast,
      );

      const chunkProse = await withRetry(
        () => generate(client, chunkPrompt, 2500),
        `redesign_v2 run${run} chunk${chunk}`
      );

      fullProse += (fullProse ? '\n\n' : '') + chunkProse;
      const chunkWords = chunkProse.split(/\s+/).length;

      const chunkWindow = measureWindows(chunkProse, 1);
      const chunkMean = chunkWindow.length > 0 ? chunkWindow[0].mean_len : 0;
      const chunkCV = chunkWindow.length > 0 ? chunkWindow[0].cv : 0;
      console.log(`    Chunk ${chunk}: ${chunkWords}w mean=${chunkMean.toFixed(1)} cv=${chunkCV.toFixed(3)}`);
      chunkStats.push({ chunk, word_count: chunkWords, mean_len: chunkMean, cv: chunkCV });

      await new Promise(r => setTimeout(r, 2000));
    }

    // Scoring DUAL
    const gbResult = scoreText(fullProse);
    const features = computeAllGBFeatures(fullProse);
    const wordCount = fullProse.split(/\s+/).length;
    const v2Result = v2Scorer.score(features, { wordCount });

    // Sentence-level stats
    const sentences = fullProse.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
    const lens = sentences.map(s => s.trim().split(/\s+/).length);
    const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
    const cv = mean > 0 ? std / mean : 0;

    const windows = measureWindows(fullProse, 4);
    const drift = calcDrift(windows);

    // Bonuses/penalties
    const bonusRhythm = v2Result.bonuses.find(b => b.name === 'rhythmic_mastery')?.triggered ?? false;
    const bonusBreath = v2Result.bonuses.find(b => b.name === 'controlled_breathing')?.triggered ?? false;
    const bonusDepth = v2Result.bonuses.find(b => b.name === 'narrative_depth')?.triggered ?? false;
    const penaltyKnife = v2Result.penalties.find(p => p.name === 'knife_excess')?.triggered ?? false;

    const chunkFinalMean = chunkStats[3].mean_len;

    console.log(`    TOTAL run${run}: ${wordCount}w`);
    console.log(`      GB_V1=${gbResult.score.toFixed(3)} V2_final=${v2Result.final.toFixed(1)}`);
    console.log(`      f26b=${(features.f26b_long_sent_rate ?? 0).toFixed(3)} CV=${cv.toFixed(3)} mean=${mean.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)}`);
    console.log(`      Bonuses: rhythm=${bonusRhythm ? '✅' : '❌'} breath=${bonusBreath ? '✅' : '❌'} depth=${bonusDepth ? '✅' : '❌'} | Knife=${penaltyKnife ? '⚠️' : '✅'}`);
    console.log(`      Chunk4 mean=${chunkFinalMean.toFixed(1)}w ${chunkFinalMean > 10 ? '✅ no takeover' : '⚠️ TAKEOVER RISK'}`);

    for (const w of windows) {
      console.log(`        W(${(w.position * 100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} cv=${w.cv.toFixed(3)} ${w.word_count}w`);
    }

    allResults.push({
      config: configName, run, word_count: wordCount,
      gb_v1: gbResult.score,
      v2_final: v2Result.final, v2_raw: v2Result.raw, v2_score100: v2Result.score100, v2_confidence: v2Result.confidence,
      f26b: features.f26b_long_sent_rate ?? 0,
      mean_sentence_length: mean, cv, drift,
      chunk_final_mean: chunkFinalMean,
      bonus_rhythmic_mastery: bonusRhythm,
      bonus_controlled_breathing: bonusBreath,
      bonus_narrative_depth: bonusDepth,
      penalty_knife_excess: penaltyKnife,
      chunks: chunkStats, windows,
      top5_contributions: v2Result.contributions.slice(0, 5).map(c => ({
        feature: c.feature, value: c.value, contribution: c.contribution,
      })),
    });

    allProses.push({ run, prose: fullProse });

    await new Promise(r => setTimeout(r, 3000));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════

  const v2s = allResults.map(r => r.v2_final);
  const gbs = allResults.map(r => r.gb_v1);
  const cvs = allResults.map(r => r.cv);
  const f26bs = allResults.map(r => r.f26b);
  const drifts = allResults.map(r => r.drift);
  const chunkFinalMeans = allResults.map(r => r.chunk_final_mean);

  const v2Med = medianFn(v2s);
  const gbMed = medianFn(gbs);
  const cvMed = medianFn(cvs);
  const f26bMed = medianFn(f26bs);
  const driftMed = medianFn(drifts);
  const minChunkFinalMean = Math.min(...chunkFinalMeans);

  console.log(`\n  ── ${configName} SUMMARY (3 runs) ──`);
  console.log(`  V2    : ${v2Med.toFixed(1)} (med) ± ${stdFn(v2s).toFixed(1)}`);
  console.log(`  GB_V1 : ${gbMed.toFixed(3)} ± ${stdFn(gbs).toFixed(3)}`);
  console.log(`  CV    : ${cvMed.toFixed(3)}`);
  console.log(`  f26b  : ${f26bMed.toFixed(3)}`);
  console.log(`  Drift : ${driftMed > 0 ? '+' : ''}${driftMed.toFixed(1)}`);
  console.log(`  Chunk4: min mean=${minChunkFinalMean.toFixed(1)}w`);

  // ═══════════════════════════════════════════════════════════════════════
  // TABLEAU CUMULATIF
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(75));
  console.log('  HISTORIQUE COMPLET PF+CORRECTEUR DURAS');
  console.log('═'.repeat(75));
  console.log('  Version                   V2    GB_V1  f26b   CV    Drift   PASS');
  console.log('  ' + '-'.repeat(73));
  console.log('  PF_pur (v1 contrôle)     100.0  3.841  0.905  0.454  -38.6   [réf]');
  console.log('  PF+Duras_ext (v1)        100.0  3.988  0.800  0.625  -14.4   ❌ CV<0.80');

  const passV2 = v2Med >= 90 && cvMed >= 0.80 && cvMed <= 1.30 && f26bMed > 0.50
                 && Math.abs(driftMed) <= 10 && minChunkFinalMean > 10;
  const passLabel = passV2 ? '✅' : '❌';
  console.log(`  PF+Duras_ext (v2)        ${v2Med.toFixed(1).padStart(5)}  ${gbMed.toFixed(3)}  ${f26bMed.toFixed(3)}  ${cvMed.toFixed(3)}  ${(driftMed > 0 ? '+' : '') + driftMed.toFixed(1).padStart(5)}   ${passLabel}`);
  console.log('  ' + '-'.repeat(73));

  const deltaCVv1v2 = cvMed - 0.625;
  console.log(`  Delta CV v1→v2 : ${deltaCVv1v2 > 0 ? '+' : ''}${deltaCVv1v2.toFixed(3)}`);

  let correcteurDose = 'CORRECT';
  if (cvMed < 0.80) correcteurDose = 'TROP_FAIBLE';
  else if (cvMed > 1.30) correcteurDose = 'TROP_FORT';
  console.log(`  Correcteur dose : ${correcteurDose}`);

  // ═══════════════════════════════════════════════════════════════════════
  // DÉCISION
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(75));
  console.log('  DÉCISION EXPÉRIMENTALE');
  console.log('═'.repeat(75));

  if (cvMed >= 0.80 && cvMed <= 1.30 && f26bMed > 0.50 && v2Med >= 90
      && Math.abs(driftMed) <= 10 && minChunkFinalMean > 10) {

    console.log('  → MOTEUR CANDIDAT VALIDÉ : PF_base + Duras_correcteur_externe_K2 v2');
    console.log('     Prochaine étape : P3 (régime cible) + P4 (continuité inter-chapitres)');

  } else if (cvMed >= 0.80 && cvMed <= 1.30 && f26bMed <= 0.50) {
    console.log('  → FAIL PARTIEL : CV correct mais f26b effondré — correcteur déborde');
    console.log('     Correcteur trop fort. Réduire fréquence.');

  } else if (cvMed < 0.80 && cvMed > 0.625) {
    console.log('  → FAIL PROGRESSIF : CV progresse mais insuffisant');
    console.log(`     CV=${cvMed.toFixed(3)} — progression vs v1 (+${(cvMed - 0.625).toFixed(3)})`);
    console.log('     Architecture correcte, dose à ajuster encore.');

  } else if (cvMed <= 0.625) {
    console.log('  → RÉGRESSION : CV inférieur ou égal à v1 — signal d\'alarme');
    console.log('     Analyse des contributions V2 requise.');

  } else {
    const failReasons: string[] = [];
    if (Math.abs(driftMed) > 10) failReasons.push(`Drift=${driftMed.toFixed(1)}`);
    if (v2Med < 90) failReasons.push(`V2=${v2Med.toFixed(1)}`);
    if (minChunkFinalMean <= 10) failReasons.push(`Chunk4 mean=${minChunkFinalMean.toFixed(1)} (takeover)`);
    console.log(`  → FAIL autre : ${failReasons.join(' | ')}`);
  }

  // Top contributions V2 (median run)
  console.log('\n--- TOP 5 CONTRIBUTIONS V2 (run médian) ---\n');
  const medianRun = allResults.reduce((best, r) =>
    Math.abs(r.v2_final - v2Med) < Math.abs(best.v2_final - v2Med) ? r : best
  );
  for (const c of medianRun.top5_contributions) {
    console.log(`  ${c.feature.padEnd(30)} val=${c.value.toFixed(3).padStart(7)} contrib=${c.contribution > 0 ? '+' : ''}${c.contribution.toFixed(3)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDER
  // ═══════════════════════════════════════════════════════════════════════

  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'P1_REDESIGN_V2_RESULTS.json'),
    JSON.stringify({
      metadata: { test: 'P1_REDESIGN_V2', timestamp, model: MODEL },
      results: allResults.map(r => ({ ...r, top5_contributions: r.top5_contributions })),
      summary: {
        v2_median: v2Med, gb_v1_median: gbMed,
        cv_median: cvMed, f26b_median: f26bMed,
        drift_median: driftMed, min_chunk_final_mean: minChunkFinalMean,
        delta_cv_v1_v2: deltaCVv1v2,
        correcteur_dose: correcteurDose,
        pass: passV2,
      },
      verdict: passV2 ? 'VALIDATED' : cvMed >= 0.80 && f26bMed <= 0.50 ? 'CORRECTOR_OVERFLOW' : cvMed < 0.80 ? 'CV_INSUFFICIENT' : 'FAIL',
    }, null, 2)
  );

  const prosesDir = join('sessions', `P1_REDESIGN_V2_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const p of allProses) {
    writeFileSync(join(prosesDir, `${configName}_r${p.run}.txt`), p.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'P1_REDESIGN_V2_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
