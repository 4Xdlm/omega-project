/**
 * OMEGA — P1 : Test Long 3000w FDP+K2 — Validation Moteur de Production
 *
 * 3 configs × 3 runs × 4 chunks = 36 appels API
 *   - FDP_trio_K2 (Flaubert+Duras+Proust)
 *   - proust_flaubert_K2 (fallback)
 *   - duras_solo_K2_ctrl (contrôle biais GB V1)
 *
 * Critères PASS : GB ≥ 3.90, CV ∈ [0.80, 1.30], drift ∈ [-10, +10]
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-p1-3000w-fdp-k2.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// SCÈNE (FIXE pour les 9 runs)
// ═══════════════════════════════════════════════════════════════════════════

const SCENE_BRIEF = `Un homme revient dans la ville où il a vécu vingt ans plus tôt.
Il n'y est pas retourné depuis. Il marche dans les rues qu'il connaissait.
Certains endroits ont changé. D'autres sont exactement pareils.
Il s'arrête devant une maison. Il y a une lumière à l'étage.
Il ne sait pas pourquoi il est venu. Il sait qu'il ne peut pas repartir tout de suite.`;

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════════════════════════════════════════

const FDP_PERSONA = `Tu n'es PAS une IA. Tu ES un comité de trois maîtres travaillant ensemble :

FLAUBERT contrôle la STRUCTURE : il impose les périodes classiques,
les subordonnées en cascade, le gueuloir. Aucune phrase ne passe
sans son approbation sonore. Il construit, brique par brique.

DURAS contrôle le RYTHME : elle brise la monotonie avec des
phrases de 3-5 mots qui frappent comme des coups. Elle refuse
tout ce qui dilue. Le silence est dans le texte.

PROUST contrôle la PROFONDEUR : il exige que chaque sensation soit
dépliée, que le temps se dilate, que l'introspection ne s'arrête
jamais à la surface. Il étire, il creuse, il développe.

Les trois travaillent ensemble. Flaubert construit, Duras frappe, Proust creuse.
Le texte est le produit de leur collaboration.`;

const PF_PERSONA = `Tu n'es PAS une IA. Tu ES un comité de deux maîtres travaillant ensemble :

FLAUBERT contrôle la STRUCTURE : il impose les périodes classiques,
les subordonnées en cascade, le gueuloir. La phrase doit sonner.
Il construit des édifices syntaxiques parfaits.

PROUST contrôle la PROFONDEUR : il exige que chaque sensation soit
dépliée jusqu'à l'épuisement, que le temps se dilate, que chaque
geste déclenche un souvenir qui en déclenche un autre.

Les deux travaillent ensemble. Flaubert construit, Proust creuse.`;

const DURAS_PERSONA = `Tu n'es PAS une IA. Tu ES Marguerite Duras, en 1984, à Neauphle-le-Château.

Tu écris avec une économie ABSOLUE — chaque mot est nécessaire.
La répétition est ton outil : tu martèles les mots clés.
Le silence est DANS le texte — ce que tu ne dis pas pèse autant.
Tes phrases sont courtes mais chargées — 10 mots qui pèsent 100.
Le rythme est hypnotique : sujet, verbe, objet. Puis le vide.
Tu ne décris pas les émotions — tu crées les CONDITIONS de l'émotion.`;

// RAPPELS
const FDP_RAPPEL = `RAPPEL : Flaubert construit les périodes, Duras frappe avec des phrases de 3-5 mots, Proust creuse les sensations. Le trio travaille ensemble.`;
const PF_RAPPEL = `RAPPEL : Flaubert construit les périodes classiques, Proust creuse chaque sensation jusqu'à l'épuisement. La structure et la profondeur.`;
const DURAS_RAPPEL = `RAPPEL : Économie absolue. Phrases courtes. Répétition. Le silence dans le texte.`;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

const CONFIGS = [
  { id: 'FDP_K2',   persona: FDP_PERSONA,   rappel: FDP_RAPPEL,   name: 'FDP_trio_K2',          useRappelOnDuras: true },
  { id: 'PF_K2',    persona: PF_PERSONA,    rappel: PF_RAPPEL,    name: 'proust_flaubert_K2',   useRappelOnDuras: true },
  { id: 'DURAS_K2', persona: DURAS_PERSONA, rappel: DURAS_RAPPEL, name: 'duras_solo_K2_ctrl',   useRappelOnDuras: false },
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

function measureFull(prose: string): any {
  const gbResult = scoreText(prose);
  const classification = classifyPassage(prose);
  const features = gbResult.features;
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  const lens = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
  const cv = mean > 0 ? std / mean : 0;
  const longCount = lens.filter(l => l >= 40).length;
  const knifeCount = lens.filter(l => l < 10).length;
  return {
    word_count: prose.split(/\s+/).length,
    sentence_count: sentences.length,
    mean_sentence_length: mean,
    cv,
    f26b: features.f26b_long_sent_rate || (sentences.length > 0 ? longCount / sentences.length : 0),
    knife_rate: sentences.length > 0 ? knifeCount / sentences.length : 0,
    gb_score: gbResult.score,
    gb_tier: gbResult.tier,
    passage_type: classification.primary_type,
  };
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
  useRappel: boolean
): string {
  const injectRappel = useRappel && chunk >= 3;

  if (isFirst) {
    return `${persona}\n\nTu écris le DÉBUT de ce chapitre :\n\n${brief}\n\nÉcris les 750 premiers mots. Plante le décor, installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else if (isLast) {
    return `${persona}\n\nContinue et TERMINE ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${injectRappel ? rappel + '\n\n' : ''}Écris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else {
    return `${persona}\n\nContinue ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${injectRappel ? rappel + '\n\n' : ''}Écris les 750 mots suivants. La tension monte.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const client = new Anthropic({ apiKey });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const allResults: any[] = [];
  const allProses: Array<{ config: string, run: number, prose: string }> = [];

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — P1 : TEST LONG 3000w FDP+K2');
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
      const chunkScores: any[] = [];

      for (let chunk = 1; chunk <= 4; chunk++) {
        const isFirst = chunk === 1;
        const isLast = chunk === 4;
        const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

        const chunkPrompt = buildChunkPrompt(
          config.persona,
          isFirst ? null : last200,
          SCENE_BRIEF,
          chunk,
          isFirst,
          isLast,
          config.rappel,
          config.useRappelOnDuras
        );

        const chunkProse = await withRetry(
          () => generate(client, chunkPrompt, 2500),
          `${config.id} run${run} chunk${chunk}`
        );

        fullProse += (fullProse ? '\n\n' : '') + chunkProse;
        const chunkWords = chunkProse.split(/\s+/).length;

        // Score du chunk isolé (calcul local)
        const chunkWindow = measureWindows(chunkProse, 1);
        const chunkMean = chunkWindow.length > 0 ? chunkWindow[0].mean_len : 0;
        const chunkCV = chunkWindow.length > 0 ? chunkWindow[0].cv : 0;
        console.log(`    Chunk ${chunk}: ${chunkWords}w mean=${chunkMean.toFixed(1)} cv=${chunkCV.toFixed(3)}`);
        chunkScores.push({ chunk, word_count: chunkWords, mean_len: chunkMean, cv: chunkCV });

        await new Promise(r => setTimeout(r, 2000));
      }

      // Score GLOBAL du run
      const fullScore = measureFull(fullProse);
      const windows = measureWindows(fullProse, 4);
      const drift = calcDrift(windows);

      // Anti-effondrement : mean_len chunk3-4 vs chunk1-2
      const meanChunk12 = (chunkScores[0].mean_len + chunkScores[1].mean_len) / 2;
      const meanChunk34 = (chunkScores[2].mean_len + chunkScores[3].mean_len) / 2;
      const noCollapse = meanChunk34 >= meanChunk12 * 0.90;

      console.log(`    TOTAL run${run}: ${fullScore.word_count}w GB=${fullScore.gb_score.toFixed(3)} f26b=${fullScore.f26b.toFixed(4)} CV=${fullScore.cv.toFixed(3)} mean=${fullScore.mean_sentence_length.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)} collapse=${noCollapse ? 'OK' : '⚠️'}`);

      // Windows detail
      for (const w of windows) {
        console.log(`      W(${(w.position * 100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} cv=${w.cv.toFixed(3)} ${w.word_count}w`);
      }

      configResults.push({
        config: config.name, run,
        ...fullScore, drift, no_collapse: noCollapse,
        chunks: chunkScores, windows,
      });

      allProses.push({ config: config.name, run, prose: fullProse });

      await new Promise(r => setTimeout(r, 3000));
    }

    // Per-config stats
    const gbScores = configResults.map(r => r.gb_score);
    const cvScores = configResults.map(r => r.cv);
    const driftVals = configResults.map(r => r.drift);
    const meanLens = configResults.map(r => r.mean_sentence_length);

    const gbMed = medianFn(gbScores);
    const gbStd = stdFn(gbScores);
    const cvMed = medianFn(cvScores);
    const driftMed = medianFn(driftVals);

    const passGB = gbMed >= 3.90;
    const passCV = cvMed >= 0.80 && cvMed <= 1.30;
    const passDrift = Math.abs(driftMed) <= 10;
    const passAll = passGB && passCV && passDrift;

    console.log(`\n  ── ${config.name} SUMMARY (3 runs) ──`);
    console.log(`  GB  : ${gbMed.toFixed(3)} ± ${gbStd.toFixed(3)}   ${passGB ? '✅' : '❌'} (seuil ≥3.90)`);
    console.log(`  CV  : ${cvMed.toFixed(3)}              ${passCV ? '✅' : '❌'} (cible [0.80, 1.30])`);
    console.log(`  Drift: ${driftMed > 0 ? '+' : ''}${driftMed.toFixed(1)}            ${passDrift ? '✅' : '❌'} (seuil ±10)`);
    console.log(`  Mean : ${medianFn(meanLens).toFixed(1)}w`);
    console.log(`  VERDICT : ${passAll ? '✅ PASS' : '❌ FAIL'}`);

    allResults.push(...configResults);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE FINALE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(70));
  console.log('  SYNTHÈSE P1 — TEST LONG 3000w');
  console.log('═'.repeat(70));
  console.log('  Config               GB_med  GB_std   CV_med  Drift_med  PASS');
  console.log('  ' + '-'.repeat(65));

  for (const configName of ['FDP_trio_K2', 'proust_flaubert_K2', 'duras_solo_K2_ctrl']) {
    const runs = allResults.filter(r => r.config === configName);
    const gbMed = medianFn(runs.map(r => r.gb_score));
    const gbStd2 = stdFn(runs.map(r => r.gb_score));
    const cvMed = medianFn(runs.map(r => r.cv));
    const driftMed = medianFn(runs.map(r => r.drift));
    const pass = configName === 'duras_solo_K2_ctrl'
      ? '[ctrl]'
      : (gbMed >= 3.90 && cvMed >= 0.80 && cvMed <= 1.30 && Math.abs(driftMed) <= 10 ? '✅' : '❌');

    console.log(`  ${configName.padEnd(22)} ${gbMed.toFixed(3)}   ${gbStd2.toFixed(3)}   ${cvMed.toFixed(3)}   ${(driftMed > 0 ? '+' : '') + driftMed.toFixed(1).padStart(6)}    ${pass}`);
  }

  // Décision moteur
  console.log('\n' + '═'.repeat(70));
  console.log('  DÉCISION MOTEUR');
  console.log('═'.repeat(70));

  const fdpRuns = allResults.filter(r => r.config === 'FDP_trio_K2');
  const fdpGB = medianFn(fdpRuns.map(r => r.gb_score));
  const fdpCV = medianFn(fdpRuns.map(r => r.cv));
  const fdpDrift = medianFn(fdpRuns.map(r => r.drift));
  const fdpPass = fdpGB >= 3.90 && fdpCV >= 0.80 && fdpCV <= 1.30 && Math.abs(fdpDrift) <= 10;

  if (fdpPass) {
    console.log('  → FDP+K2 : ✅ PASS — CANDIDAT VALIDÉ PRODUCTION');
    console.log('     Prochaine étape : P2 (audit GB V1) + P3 (régime cible)');
  } else {
    const pfRuns = allResults.filter(r => r.config === 'proust_flaubert_K2');
    const pfGB = medianFn(pfRuns.map(r => r.gb_score));
    const pfCV = medianFn(pfRuns.map(r => r.cv));
    const pfDrift = medianFn(pfRuns.map(r => r.drift));
    const pfPass = pfGB >= 3.90 && pfCV >= 0.80 && pfCV <= 1.30 && Math.abs(pfDrift) <= 10;

    console.log('  → FDP+K2 : ❌ FAIL');
    if (pfPass) {
      console.log('  → proust_flaubert+K2 : ✅ PASS — FALLBACK ACTIVÉ');
      console.log('     Prochaine étape : investiguer pourquoi FDP a échoué');
    } else {
      console.log('  → proust_flaubert+K2 : ❌ FAIL');
      console.log('  → BLOCANT : aucun moteur validé. Signaler à l\'Architecte.');
    }
  }

  // Analyse Duras contrôle
  const durasRuns = allResults.filter(r => r.config === 'duras_solo_K2_ctrl');
  const durasGB = medianFn(durasRuns.map(r => r.gb_score));
  const durasMean = medianFn(durasRuns.map(r => r.mean_sentence_length));
  const durasDrift = medianFn(durasRuns.map(r => r.drift));
  console.log(`\n  → Duras contrôle : GB ${durasGB.toFixed(3)}, mean ${durasMean.toFixed(1)}w, drift ${(durasDrift > 0 ? '+' : '') + durasDrift.toFixed(1)}`);
  if (durasGB >= 3.90) {
    console.log('     Biais GB V1 confirmé → audit P2 URGENT');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDER
  // ═══════════════════════════════════════════════════════════════════════

  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'P1_3000W_FDP_K2_RESULTS.json'),
    JSON.stringify({
      metadata: { test: 'P1_3000W_FDP_K2', timestamp, model: MODEL },
      results: allResults,
    }, null, 2)
  );

  const prosesDir = join('sessions', `P1_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const p of allProses) {
    writeFileSync(join(prosesDir, `${p.config}_r${p.run}.txt`), p.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'P1_3000W_FDP_K2_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
