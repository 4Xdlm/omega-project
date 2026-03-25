/**
 * OMEGA — P1-REDESIGN-v3 : PF + Mini-correcteur Chunks 1-2 + Ancre Drift
 *
 * 1 config × 3 runs × 4 chunks = 12 appels API
 * Delta vs v2 :
 *   1. RAPPEL_PF_CHUNKS12 (nouveau) : ancre mean ~70w + mini-correcteur doux
 *   2. RAPPEL_DURAS_EXTERNE_V3 : v2 + ancre cohérence longueur
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-p1-redesign-v3.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// SCÈNE (FIXE)
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
// RAPPELS v3 — LES DEUX CHANGEMENTS
// ═══════════════════════════════════════════════════════════════════════════

// NOUVEAU : mini-correcteur doux + ancre mean pour chunks 1-2
const RAPPEL_PF_CHUNKS12 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

SOUFFLE DE FLAUBERT : chaque période se déploie jusqu'à épuiser la sensation
ou l'idée — elle prend le temps d'une respiration complète, ni écourtée
ni interminable. Le rythme naturel d'une phrase lue à voix haute
dans le gueuloir.

MURMURE DE DURAS : de loin en loin, une phrase brève et nue coupe le flux
— un verdict, pas un résumé. Elle apparaît comme un silence entre deux
mouvements d'orchestre.`;

// v2 + ancre cohérence drift pour chunks 3-4
const RAPPEL_DURAS_EXTERNE_V3 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : régulièrement, à intervalles sentis,
brise le flot des longues périodes par une phrase-couteau — sèche,
factuelle, quelques mots à peine. Pas exceptionnellement : souvent.
Flaubert et Proust reprennent aussitôt le contrôle. Duras ponctionne,
disparaît, revient.

ANCRE DE TENUE : la cadence de fin ne s'effondre pas.
Les chunks 3-4 gardent le souffle installé par les chunks 1-2.
Duras frappe par éclairs brefs — elle n'abaisse pas
la nappe phrastique dominante. Même dans le dialogue
ou la confrontation, les répliques s'enchâssent dans
des périodes narratives et descriptives amples.
La lame Duras crée le contraste — elle ne change pas
le registre de fond.

COHÉRENCE DE LONGUEUR : la longueur moyenne des phrases reste dans
la continuité de ce qui précède — ni soudainement plus courte,
ni soudainement plus longue.`;

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
  // Chunks 1-2 : RAPPEL_PF_CHUNKS12, Chunks 3-4 : RAPPEL_DURAS_EXTERNE_V3
  const rappel = chunk <= 2 ? RAPPEL_PF_CHUNKS12 : RAPPEL_DURAS_EXTERNE_V3;

  if (isFirst) {
    return `${PF_PERSONA}\n\nTu écris le DÉBUT de ce chapitre :\n\n${SCENE_BRIEF}\n\n${rappel}\n\nÉcris les 750 premiers mots. Flaubert plante le décor, Proust installe la mémoire.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else if (isLast) {
    return `${PF_PERSONA}\n\nContinue et TERMINE ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${rappel}\n\nÉcris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else {
    return `${PF_PERSONA}\n\nContinue ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${rappel}\n\nÉcris les 750 mots suivants. La profondeur s'intensifie.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
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

  const configName = 'PF_base_Duras_correcteur_K2_v3';
  const allResults: any[] = [];
  const allProses: Array<{ run: number, prose: string }> = [];

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — P1-REDESIGN-v3 : PF + MINI-CORRECTEUR 1-2 + ANCRE DRIFT');
  console.log('  1 config × 3 runs × 4 chunks = 12 API calls');
  console.log('  Delta vs v2 : RAPPEL_PF_CHUNKS12 + ancre cohérence v3');
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
        `redesign_v3 run${run} chunk${chunk}`
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
    const chunk1Mean = chunkStats[0].mean_len;

    console.log(`    TOTAL run${run}: ${wordCount}w`);
    console.log(`      GB_V1=${gbResult.score.toFixed(3)} V2_final=${v2Result.final.toFixed(1)}`);
    console.log(`      f26b=${(features.f26b_long_sent_rate ?? 0).toFixed(3)} CV=${cv.toFixed(3)} mean=${mean.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)}`);
    console.log(`      Bonuses: rhythm=${bonusRhythm ? '✅' : '❌'} breath=${bonusBreath ? '✅' : '❌'} depth=${bonusDepth ? '✅' : '❌'} | Knife=${penaltyKnife ? '⚠️' : '✅'}`);
    console.log(`      Chunk1 mean=${chunk1Mean.toFixed(1)}w | Chunk4 mean=${chunkFinalMean.toFixed(1)}w ${chunkFinalMean > 10 ? '✅' : '⚠️ TAKEOVER'}`);

    for (const w of windows) {
      console.log(`        W(${(w.position * 100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} cv=${w.cv.toFixed(3)} ${w.word_count}w`);
    }

    allResults.push({
      config: configName, run, word_count: wordCount,
      gb_v1: gbResult.score,
      v2_final: v2Result.final, v2_raw: v2Result.raw, v2_score100: v2Result.score100, v2_confidence: v2Result.confidence,
      f26b: features.f26b_long_sent_rate ?? 0,
      mean_sentence_length: mean, cv, drift,
      chunk1_mean: chunk1Mean, chunk_final_mean: chunkFinalMean,
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
  const chunk1Means = allResults.map(r => r.chunk1_mean);
  const chunkFinalMeans = allResults.map(r => r.chunk_final_mean);

  const v2Med = medianFn(v2s);
  const gbMed = medianFn(gbs);
  const cvMed = medianFn(cvs);
  const f26bMed = medianFn(f26bs);
  const driftMed = medianFn(drifts);
  const chunk1MedMean = medianFn(chunk1Means);
  const chunk4MedMean = medianFn(chunkFinalMeans);
  const minChunkFinalMean = Math.min(...chunkFinalMeans);

  console.log(`\n  ── ${configName} SUMMARY (3 runs) ──`);
  console.log(`  V2    : ${v2Med.toFixed(1)} (med) ± ${stdFn(v2s).toFixed(1)}`);
  console.log(`  GB_V1 : ${gbMed.toFixed(3)} ± ${stdFn(gbs).toFixed(3)}`);
  console.log(`  CV    : ${cvMed.toFixed(3)}`);
  console.log(`  f26b  : ${f26bMed.toFixed(3)}`);
  console.log(`  Drift : ${driftMed > 0 ? '+' : ''}${driftMed.toFixed(1)}`);
  console.log(`  Chunk1: med mean=${chunk1MedMean.toFixed(1)}w`);
  console.log(`  Chunk4: med mean=${chunk4MedMean.toFixed(1)}w, min=${minChunkFinalMean.toFixed(1)}w`);

  // ═══════════════════════════════════════════════════════════════════════
  // TABLEAU CUMULATIF
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(80));
  console.log('  HISTORIQUE COMPLET PF+CORRECTEUR DURAS');
  console.log('═'.repeat(80));
  console.log('  Version           V2     GB_V1   f26b   CV     Drift   chunk1  chunk4  PASS');
  console.log('  ' + '-'.repeat(78));
  console.log('  PF_pur (ctrl)    100.0   3.841  0.905  0.454  -38.6    109w    80w    [réf]');
  console.log('  v1               100.0   3.988  0.800  0.625  -14.4     94w    58w    ❌ CV');
  console.log('  v2               100.0   4.002  0.647  0.702  -47.4    115w    52w    ❌ CV+drift');

  const passV3 = v2Med >= 90 && cvMed >= 0.80 && cvMed <= 1.30 && f26bMed > 0.50
                 && Math.abs(driftMed) <= 10 && minChunkFinalMean > 10;
  const passLabel = passV3 ? '✅' : '❌';
  console.log(`  v3               ${v2Med.toFixed(1).padStart(5)}   ${gbMed.toFixed(3)}  ${f26bMed.toFixed(3)}  ${cvMed.toFixed(3)}  ${(driftMed > 0 ? '+' : '') + driftMed.toFixed(1).padStart(5)}    ${chunk1MedMean.toFixed(0).padStart(3)}w    ${chunk4MedMean.toFixed(0).padStart(3)}w    ${passLabel}`);
  console.log('  ' + '-'.repeat(78));

  console.log(`  Progression CV : v1(0.625) → v2(0.702) → v3(${cvMed.toFixed(3)})`);
  console.log(`  Progression Drift : v1(-14.4) → v2(-47.4) → v3(${driftMed > 0 ? '+' : ''}${driftMed.toFixed(1)})`);

  // ═══════════════════════════════════════════════════════════════════════
  // DÉCISION
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(80));
  console.log('  DÉCISION EXPÉRIMENTALE');
  console.log('═'.repeat(80));

  if (passV3) {
    console.log('  → ✅ MOTEUR CANDIDAT VALIDÉ : PF+Duras_correcteur_K2 v3');
    console.log('     Prochaine étape : P3 (régime cible) + P4 (continuité inter-chapitres)');

  } else if (cvMed >= 0.80 && Math.abs(driftMed) > 10) {
    console.log('  → FAIL PARTIEL : CV ok mais drift hors ±10');
    console.log(`     Drift=${driftMed.toFixed(1)} — ancre insuffisante en chunks 3-4`);
    console.log('     v4 : ancre drift explicite renforcée');

  } else if (Math.abs(driftMed) <= 10 && cvMed < 0.80) {
    console.log('  → FAIL PARTIEL : drift ok mais CV insuffisant');
    console.log(`     CV=${cvMed.toFixed(3)} — mini-correc chunks 1-2 insuffisant`);
    console.log('     v4 : renforcer mini-correc chunks 1-2 ("régulièrement" au lieu de "rare")');

  } else if (cvMed >= 0.80 && cvMed <= 1.30 && Math.abs(driftMed) <= 10) {
    console.log('  → ✅ MOTEUR VALIDÉ — tous critères remplis');

  } else {
    const failReasons: string[] = [];
    if (cvMed < 0.702) failReasons.push(`RÉGRESSION CV: ${cvMed.toFixed(3)} < v2(0.702)`);
    if (Math.abs(driftMed) > 47) failReasons.push(`RÉGRESSION Drift: ${driftMed.toFixed(1)} pire que v2(-47.4)`);
    if (f26bMed <= 0.50) failReasons.push(`f26b effondré: ${f26bMed.toFixed(3)}`);
    if (v2Med < 90) failReasons.push(`V2=${v2Med.toFixed(1)} < 90`);
    if (minChunkFinalMean <= 10) failReasons.push(`Chunk4 takeover: min=${minChunkFinalMean.toFixed(1)}w`);
    console.log(`  → FAIL : ${failReasons.join(' | ')}`);
    console.log('     Escalader à Architecte — analyse top5 contributions V2 requise.');
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
    join(outDir, 'P1_REDESIGN_V3_RESULTS.json'),
    JSON.stringify({
      metadata: { test: 'P1_REDESIGN_V3', timestamp, model: MODEL },
      results: allResults.map(r => ({ ...r, top5_contributions: r.top5_contributions })),
      summary: {
        v2_median: v2Med, gb_v1_median: gbMed,
        cv_median: cvMed, f26b_median: f26bMed,
        drift_median: driftMed,
        chunk1_mean_median: chunk1MedMean,
        chunk4_mean_median: chunk4MedMean,
        min_chunk_final_mean: minChunkFinalMean,
        pass: passV3,
      },
      progression: {
        cv: { v1: 0.625, v2: 0.702, v3: cvMed },
        drift: { v1: -14.4, v2: -47.4, v3: driftMed },
      },
      verdict: passV3 ? 'VALIDATED' : 'FAIL',
    }, null, 2)
  );

  const prosesDir = join('sessions', `P1_REDESIGN_V3_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const p of allProses) {
    writeFileSync(join(prosesDir, `${configName}_r${p.run}.txt`), p.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'P1_REDESIGN_V3_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
