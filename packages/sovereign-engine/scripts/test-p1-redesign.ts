/**
 * OMEGA — P1-REDESIGN : PF Base + Duras Correcteur Externe K2
 *
 * 2 configs × 3 runs × 4 chunks = 24 appels API
 *   - PF_K2_redesign : PF pur chunks 1-2, PF + Duras correcteur chunks 3-4
 *   - PF_K2_control  : PF pur chunks 1-4 (aucune injection Duras)
 *
 * Scoring DUAL : GB V1 + MultiStage V2
 * Critères PASS : V2 ≥ 90, CV ∈ [0.80, 1.30], f26b > 0.50, drift ∈ [-10, +10]
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-p1-redesign.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// SCÈNE (FIXE — identique à P1)
// ═══════════════════════════════════════════════════════════════════════════

const SCENE_BRIEF = `Un homme revient dans la ville où il a vécu vingt ans plus tôt.
Il n'y est pas retourné depuis. Il marche dans les rues qu'il connaissait.
Certains endroits ont changé. D'autres sont exactement pareils.
Il s'arrête devant une maison. Il y a une lumière à l'étage.
Il ne sait pas pourquoi il est venu. Il sait qu'il ne peut pas repartir tout de suite.`;

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAS
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

const RAPPEL_DURAS_EXTERNE = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : au moment où la contemplation devient
trop lourde, où le texte risque de s'enliser dans ses propres profondeurs,
tranche brutalement avec une phrase-couteau — sèche, factuelle, 3 à 5 mots
maximum. Laisse ensuite Flaubert et Proust reprendre le contrôle. Frappe
de nouveau seulement quand la tension retombe. Ce correcteur n'écrit pas —
il coupe, il ponctionne, et disparaît. PF reste dominant.`;

const RAPPEL_PF_PUR = `RAPPEL DUO : Flaubert construit les périodes classiques,
Proust creuse chaque sensation jusqu'à l'épuisement. Continuez avec la même
architecture, la même profondeur, le même souffle.`;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

const CONFIGS = [
  {
    id: 'PF_K2_redesign',
    persona: PF_PERSONA,
    rappel_chunks34: RAPPEL_DURAS_EXTERNE,
    name: 'PF_base_Duras_correcteur_K2',
  },
  {
    id: 'PF_K2_control',
    persona: PF_PERSONA,
    rappel_chunks34: RAPPEL_PF_PUR,
    name: 'PF_pur_control',
  },
];

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
  persona: string,
  last200: string | null,
  brief: string,
  chunk: number,
  isFirst: boolean,
  isLast: boolean,
  rappel: string,
): string {
  const useRappel = chunk >= 3;

  if (isFirst) {
    return `${persona}\n\nTu écris le DÉBUT de ce chapitre :\n\n${brief}\n\nÉcris les 750 premiers mots. Flaubert plante le décor, Proust installe la mémoire.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else if (isLast) {
    return `${persona}\n\nContinue et TERMINE ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${useRappel ? rappel + '\n\n' : ''}Écris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else {
    return `${persona}\n\nContinue ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${useRappel ? rappel + '\n\n' : ''}Écris les 750 mots suivants. La profondeur s'intensifie.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
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

  const allResults: any[] = [];
  const allProses: Array<{ config: string, run: number, prose: string }> = [];

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — P1-REDESIGN : PF BASE + DURAS CORRECTEUR EXTERNE K2');
  console.log(`  ${CONFIGS.length} configs × 3 runs × 4 chunks = ${CONFIGS.length * 3 * 4} API calls`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  for (const config of CONFIGS) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  CONFIG : ${config.name}`);
    console.log('═'.repeat(70));

    const configResults: any[] = [];

    for (let run = 1; run <= 3; run++) {
      console.log(`\n  RUN ${run}/3 — ${config.name}`);

      let fullProse = '';
      const chunkStats: any[] = [];

      for (let chunk = 1; chunk <= 4; chunk++) {
        const isFirst = chunk === 1;
        const isLast = chunk === 4;
        const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

        const chunkPrompt = buildChunkPrompt(
          config.persona,
          isFirst ? null : last200,
          SCENE_BRIEF,
          chunk, isFirst, isLast,
          config.rappel_chunks34,
        );

        const chunkProse = await withRetry(
          () => generate(client, chunkPrompt, 2500),
          `${config.id} run${run} chunk${chunk}`
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

      // Anti-takeover: mean of chunk 4
      const chunkFinalMean = chunkStats[3].mean_len;

      console.log(`    TOTAL run${run}: ${wordCount}w`);
      console.log(`      GB_V1=${gbResult.score.toFixed(3)} V2_final=${v2Result.final.toFixed(1)}`);
      console.log(`      f26b=${(features.f26b_long_sent_rate ?? 0).toFixed(3)} CV=${cv.toFixed(3)} mean=${mean.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)}`);
      console.log(`      Bonuses: rhythm=${bonusRhythm ? '✅' : '❌'} breath=${bonusBreath ? '✅' : '❌'} depth=${bonusDepth ? '✅' : '❌'} | Knife=${penaltyKnife ? '⚠️' : '✅'}`);
      console.log(`      Chunk4 mean=${chunkFinalMean.toFixed(1)}w ${chunkFinalMean > 10 ? '✅ no takeover' : '⚠️ TAKEOVER RISK'}`);

      for (const w of windows) {
        console.log(`        W(${(w.position * 100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} cv=${w.cv.toFixed(3)} ${w.word_count}w`);
      }

      configResults.push({
        config: config.name, run, word_count: wordCount,
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
      });

      allProses.push({ config: config.name, run, prose: fullProse });

      await new Promise(r => setTimeout(r, 3000));
    }

    // Per-config summary
    const v2s = configResults.map(r => r.v2_final);
    const cvs = configResults.map(r => r.cv);
    const f26bs = configResults.map(r => r.f26b);
    const drifts = configResults.map(r => r.drift);
    const gbs = configResults.map(r => r.gb_v1);
    const chunkFinalMeans = configResults.map(r => r.chunk_final_mean);

    console.log(`\n  ── ${config.name} SUMMARY (3 runs) ──`);
    console.log(`  V2    : ${medianFn(v2s).toFixed(1)} (med) ± ${stdFn(v2s).toFixed(1)}`);
    console.log(`  GB_V1 : ${medianFn(gbs).toFixed(3)} ± ${stdFn(gbs).toFixed(3)}`);
    console.log(`  CV    : ${medianFn(cvs).toFixed(3)}`);
    console.log(`  f26b  : ${medianFn(f26bs).toFixed(3)}`);
    console.log(`  Drift : ${medianFn(drifts) > 0 ? '+' : ''}${medianFn(drifts).toFixed(1)}`);
    console.log(`  Chunk4: min mean=${Math.min(...chunkFinalMeans).toFixed(1)}w`);

    allResults.push(...configResults);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(75));
  console.log('  P1-REDESIGN — RÉSULTATS COMPARATIFS');
  console.log('═'.repeat(75));
  console.log('  Config                     GB_V1   V2_final   f26b    CV      Drift   PASS');
  console.log('  ' + '-'.repeat(73));

  const summaries: Record<string, any> = {};

  for (const configName of ['PF_base_Duras_correcteur_K2', 'PF_pur_control']) {
    const runs = allResults.filter(r => r.config === configName);
    const gbMed = medianFn(runs.map(r => r.gb_v1));
    const v2Med = medianFn(runs.map(r => r.v2_final));
    const f26bMed = medianFn(runs.map(r => r.f26b));
    const cvMed = medianFn(runs.map(r => r.cv));
    const driftMed = medianFn(runs.map(r => r.drift));
    const minChunkFinalMean = Math.min(...runs.map(r => r.chunk_final_mean));

    summaries[configName] = { gbMed, v2Med, f26bMed, cvMed, driftMed, minChunkFinalMean };

    const isCtrl = configName === 'PF_pur_control';
    const pass = isCtrl ? '[ctrl]'
      : (v2Med >= 90 && cvMed >= 0.80 && cvMed <= 1.30 && f26bMed > 0.50 && Math.abs(driftMed) <= 10 && minChunkFinalMean > 10 ? '✅' : '❌');

    console.log(`  ${configName.padEnd(28)} ${gbMed.toFixed(3)}   ${v2Med.toFixed(1).padStart(8)}  ${f26bMed.toFixed(3)}  ${cvMed.toFixed(3)}   ${(driftMed > 0 ? '+' : '') + driftMed.toFixed(1).padStart(6)}   ${pass}`);
  }

  // Delta CV
  const redesignCV = summaries['PF_base_Duras_correcteur_K2'].cvMed;
  const controlCV = summaries['PF_pur_control'].cvMed;
  const cvGain = redesignCV - controlCV;
  const gainFromCorrector = cvGain > 0.10;

  console.log(`\n  Delta CV (redesign vs contrôle) : ${cvGain > 0 ? '+' : ''}${cvGain.toFixed(3)}`);
  console.log(`  Gain CV vient du correcteur ? ${gainFromCorrector ? '✅ OUI (Δ > 0.10)' : '❌ NON (Δ ≤ 0.10 → variance pure)'}`);

  // Décision
  console.log('\n' + '═'.repeat(75));
  console.log('  DÉCISION EXPÉRIMENTALE');
  console.log('═'.repeat(75));

  const s = summaries['PF_base_Duras_correcteur_K2'];
  const redesignPass = s.v2Med >= 90 && s.cvMed >= 0.80 && s.cvMed <= 1.30
                       && s.f26bMed > 0.50 && Math.abs(s.driftMed) <= 10
                       && s.minChunkFinalMean > 10;

  if (redesignPass && gainFromCorrector) {
    console.log('  → MOTEUR CANDIDAT VALIDÉ : PF_base + Duras_correcteur_K2');
    console.log('     Prochaine étape : P3 (régime cible) + P4 (continuité inter-chapitres)');
  } else if (redesignPass && !gainFromCorrector) {
    console.log('  → PASS PARTIEL : métriques OK mais CV non attribuable au correcteur');
    console.log('     Signaler à Architecte — variance ou défaut de mesure');
  } else {
    const failReasons: string[] = [];
    if (s.v2Med < 90) failReasons.push(`V2=${s.v2Med.toFixed(1)} < 90`);
    if (s.cvMed < 0.80) failReasons.push(`CV=${s.cvMed.toFixed(3)} < 0.80 (mort rythmique persiste)`);
    if (s.cvMed > 1.30) failReasons.push(`CV=${s.cvMed.toFixed(3)} > 1.30 (correcteur déborde)`);
    if (s.f26bMed <= 0.50) failReasons.push(`f26b=${s.f26bMed.toFixed(3)} ≤ 0.50 (PF effacé)`);
    if (Math.abs(s.driftMed) > 10) failReasons.push(`Drift=${s.driftMed.toFixed(1)} hors ±10`);
    if (s.minChunkFinalMean <= 10) failReasons.push(`Chunk4 mean=${s.minChunkFinalMean.toFixed(1)} ≤ 10 (takeover)`);
    console.log(`  → FAIL : ${failReasons.join(' | ')}`);
    console.log('     Escalader à Architecte avec diagnostic précis.');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDER
  // ═══════════════════════════════════════════════════════════════════════

  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'P1_REDESIGN_RESULTS.json'),
    JSON.stringify({
      metadata: { test: 'P1_REDESIGN', timestamp, model: MODEL },
      results: allResults,
      summary: summaries,
      delta_cv: cvGain,
      gain_from_corrector: gainFromCorrector,
      verdict: redesignPass && gainFromCorrector ? 'VALIDATED' : redesignPass ? 'PARTIAL' : 'FAIL',
    }, null, 2)
  );

  const prosesDir = join('sessions', `P1_REDESIGN_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const p of allProses) {
    writeFileSync(join(prosesDir, `${p.config}_r${p.run}.txt`), p.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'P1_REDESIGN_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
