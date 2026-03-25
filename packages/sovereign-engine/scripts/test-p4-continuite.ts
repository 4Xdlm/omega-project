/**
 * OMEGA — P4 : Continuité Inter-Chapitres — 2 × 3000w = 12 API
 *
 * Deux chapitres consécutifs du même roman. Le chapitre 2 reçoit les 200
 * derniers mots du chapitre 1 comme contexte. On mesure l'écart de profil.
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-p4-continuite.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// PERSONA v3 — INCHANGÉ
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

const RAPPEL_CHUNKS12 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

SOUFFLE DE FLAUBERT : chaque période se déploie jusqu'à épuiser la sensation
ou l'idée — elle prend le temps d'une respiration complète, ni écourtée
ni interminable. Le rythme naturel d'une phrase lue à voix haute
dans le gueuloir.

MURMURE DE DURAS : de loin en loin, une phrase brève et nue coupe le flux
— un verdict, pas un résumé. Elle apparaît comme un silence entre deux
mouvements d'orchestre.`;

const RAPPEL_CHUNKS34 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

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
// ROMAN — UNIVERS + 2 CHAPITRES
// ═══════════════════════════════════════════════════════════════════════════

const ROMAN_UNIVERS = `Roman : une ville portuaire en hiver. Un inspecteur revient sur
les lieux d'une affaire close depuis dix ans. Il ne cherche rien de précis.
Quelque chose l'a ramené là. Le port est différent. Les gens qu'il connaissait
ont changé ou disparu.`;

const CHAPITRE_1_BRIEF = `Chapitre 1 : L'arrivée. L'inspecteur descend du train.
Il reconnaît la ville sans la reconnaître. Une première rencontre
avec un visage du passé — bref, inattendu. La nuit tombe.
Il trouve une chambre. Il ne dort pas.`;

const CHAPITRE_2_BRIEF = `Chapitre 2 : Le lendemain matin. L'inspecteur marche vers le port.
Il cherche une adresse. Les rues changent mais les odeurs non.
Une deuxième rencontre — quelqu'un qui l'attendait sans le savoir.
Une information qui complique tout.`;

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

function scoreFull(prose: string, v2Scorer: MultiStageScorerV2): any {
  const gbResult = scoreText(prose);
  const features = computeAllGBFeatures(prose);
  const wordCount = prose.split(/\s+/).length;
  const v2Result = v2Scorer.score(features, { wordCount });

  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  const lens = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
  const cv = mean > 0 ? std / mean : 0;

  const windows = measureWindows(prose, 4);
  const drift = calcDrift(windows);

  return {
    word_count: wordCount,
    gb_v1: gbResult.score,
    v2_final: v2Result.final,
    f26b: features.f26b_long_sent_rate ?? 0,
    cv, mean_sentence_length: mean, drift,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE CHAPTER (4 chunks)
// ═══════════════════════════════════════════════════════════════════════════

async function generateChapter(
  client: Anthropic,
  chapterBrief: string,
  universBrief: string,
  label: string,
  contextLast200: string | null,  // null for chapter 1, last200 of chap1 for chap2
): Promise<string> {
  let fullProse = '';

  for (let chunk = 1; chunk <= 4; chunk++) {
    const isFirst = chunk === 1;
    const isLast = chunk === 4;
    const rappel = chunk <= 2 ? RAPPEL_CHUNKS12 : RAPPEL_CHUNKS34;
    const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

    let prompt: string;

    if (isFirst && !contextLast200) {
      // Chapter 1, chunk 1 — no prior context
      prompt = `${PF_PERSONA}\n\n${rappel}\n\nUnivers : ${universBrief}\n\nTu écris le DÉBUT de ce chapitre :\n\n${chapterBrief}\n\nÉcris les 750 premiers mots. Installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    } else if (isFirst && contextLast200) {
      // Chapter 2, chunk 1 — with context from chapter 1
      prompt = `${PF_PERSONA}\n\n${rappel}\n\nCONTEXTE DU CHAPITRE PRÉCÉDENT (200 derniers mots) :\n"${contextLast200}"\n\nTu continues maintenant le CHAPITRE 2 de ce roman :\n\nUnivers : ${universBrief}\n\nBrief chapitre 2 : ${chapterBrief}\n\nÉcris les 750 premiers mots du chapitre 2. Maintiens la voix établie dans le chapitre précédent — même registre, même respiration.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    } else if (isLast) {
      prompt = `${PF_PERSONA}\n\n${rappel}\n\nContinue et TERMINE ce chapitre.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    } else {
      prompt = `${PF_PERSONA}\n\n${rappel}\n\nContinue ce chapitre.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    }

    const chunkProse = await withRetry(() => generate(client, prompt, 2500), `${label} c${chunk}`);
    fullProse += (fullProse ? '\n\n' : '') + chunkProse;

    const cw = measureWindows(chunkProse, 1);
    const chunkMean = cw.length > 0 ? cw[0].mean_len : 0;
    console.log(`    Chunk ${chunk}: ${chunkProse.split(/\s+/).length}w mean=${chunkMean.toFixed(1)}`);

    await new Promise(r => setTimeout(r, 2000));
  }

  return fullProse;
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

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — P4 : CONTINUITÉ INTER-CHAPITRES');
  console.log('  2 chapitres × 4 chunks = 8 API calls (+ 4 chunks chap2 = 12 total... wait');
  console.log('  Actually: 2 × 4 = 8 API calls');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // ─── CHAPITRE 1 ────────────────────────────────────────────────────
  console.log('═══ CHAPITRE 1 ═══\n');
  const chap1Prose = await generateChapter(client, CHAPITRE_1_BRIEF, ROMAN_UNIVERS, 'chap1', null);
  const chap1Score = scoreFull(chap1Prose, v2Scorer);
  console.log(`\n  CHAP 1 TOTAL: ${chap1Score.word_count}w GB=${chap1Score.gb_v1.toFixed(3)} V2=${chap1Score.v2_final.toFixed(1)} f26b=${chap1Score.f26b.toFixed(3)} CV=${chap1Score.cv.toFixed(3)} mean=${chap1Score.mean_sentence_length.toFixed(1)} drift=${chap1Score.drift > 0 ? '+' : ''}${chap1Score.drift.toFixed(1)}`);

  await new Promise(r => setTimeout(r, 3000));

  // ─── CHAPITRE 2 (avec contexte chap 1) ─────────────────────────────
  console.log('\n═══ CHAPITRE 2 ═══\n');
  const last200OfChap1 = chap1Prose.split(/\s+/).slice(-200).join(' ');
  const chap2Prose = await generateChapter(client, CHAPITRE_2_BRIEF, ROMAN_UNIVERS, 'chap2', last200OfChap1);
  const chap2Score = scoreFull(chap2Prose, v2Scorer);
  console.log(`\n  CHAP 2 TOTAL: ${chap2Score.word_count}w GB=${chap2Score.gb_v1.toFixed(3)} V2=${chap2Score.v2_final.toFixed(1)} f26b=${chap2Score.f26b.toFixed(3)} CV=${chap2Score.cv.toFixed(3)} mean=${chap2Score.mean_sentence_length.toFixed(1)} drift=${chap2Score.drift > 0 ? '+' : ''}${chap2Score.drift.toFixed(1)}`);

  // ═══════════════════════════════════════════════════════════════════════
  // COMPARAISON
  // ═══════════════════════════════════════════════════════════════════════

  const deltaGB = Math.abs(chap1Score.gb_v1 - chap2Score.gb_v1);
  const deltaCV = Math.abs(chap1Score.cv - chap2Score.cv);
  const deltaF26b = Math.abs(chap1Score.f26b - chap2Score.f26b);
  const deltaMean = Math.abs(chap1Score.mean_sentence_length - chap2Score.mean_sentence_length);
  const deltaV2 = Math.abs(chap1Score.v2_final - chap2Score.v2_final);

  const passGB = deltaGB < 0.20;
  const passCV = deltaCV < 0.25;
  const passF26b = deltaF26b < 0.15;
  const passMean = deltaMean < 15;
  const passV2 = deltaV2 < 15;
  const allPass = passGB && passCV && passF26b && passMean && passV2;

  console.log('\n\n' + '═'.repeat(70));
  console.log('  P4 — CONTINUITÉ INTER-CHAPITRES');
  console.log('═'.repeat(70));
  console.log('  Chapitre    GB_V1   V2_final   f26b    CV     Mean    Drift');
  console.log('  ' + '-'.repeat(65));
  console.log(`  Chap 1      ${chap1Score.gb_v1.toFixed(3)}   ${chap1Score.v2_final.toFixed(1).padStart(8)}  ${chap1Score.f26b.toFixed(3)}  ${chap1Score.cv.toFixed(3)}  ${chap1Score.mean_sentence_length.toFixed(1).padStart(6)}w  ${chap1Score.drift > 0 ? '+' : ''}${chap1Score.drift.toFixed(1)}`);
  console.log(`  Chap 2      ${chap2Score.gb_v1.toFixed(3)}   ${chap2Score.v2_final.toFixed(1).padStart(8)}  ${chap2Score.f26b.toFixed(3)}  ${chap2Score.cv.toFixed(3)}  ${chap2Score.mean_sentence_length.toFixed(1).padStart(6)}w  ${chap2Score.drift > 0 ? '+' : ''}${chap2Score.drift.toFixed(1)}`);
  console.log('  ' + '-'.repeat(65));
  console.log(`  Δ absolu    ${deltaGB.toFixed(3)}   ${deltaV2.toFixed(1).padStart(8)}  ${deltaF26b.toFixed(3)}  ${deltaCV.toFixed(3)}  ${deltaMean.toFixed(1).padStart(6)}w`);
  console.log(`  Seuil       <0.200   ${('<15.0').padStart(8)}  <0.150  <0.250  ${('<15.0').padStart(6)}w`);
  console.log(`  VERDICT     ${passGB ? '✅' : '❌'}       ${passV2 ? '✅' : '❌'}       ${passF26b ? '✅' : '❌'}     ${passCV ? '✅' : '❌'}     ${passMean ? '✅' : '❌'}`);

  console.log('\n' + '═'.repeat(70));
  console.log(`  VOIX INTER-CHAPITRES : ${allPass ? '✅ COHÉRENTE' : '❌ DISCONTINUITÉ'}`);
  console.log('═'.repeat(70));

  if (allPass) {
    console.log('\n  → ✅ MOTEUR PF+Duras_K2_v3 PRÊT POUR SCELLEMENT PRODUCTION');
    console.log('     Voix stable entre chapitres. Profil métrique cohérent.');
    console.log('     Prochaine étape : intégration pipeline sovereign-engine');
  } else {
    const failDims: string[] = [];
    if (!passGB) failDims.push(`ΔGB=${deltaGB.toFixed(3)}`);
    if (!passCV) failDims.push(`ΔCV=${deltaCV.toFixed(3)}`);
    if (!passF26b) failDims.push(`Δf26b=${deltaF26b.toFixed(3)}`);
    if (!passMean) failDims.push(`ΔMean=${deltaMean.toFixed(1)}`);
    if (!passV2) failDims.push(`ΔV2=${deltaV2.toFixed(1)}`);
    console.log(`\n  → ❌ DISCONTINUITÉ : ${failDims.join(' | ')}`);
    console.log('     Renforcer injection contexte chapitre précédent');
  }

  // Save
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'P4_CONTINUITE_RESULTS.json'),
    JSON.stringify({
      metadata: { test: 'P4_CONTINUITE', timestamp, model: MODEL },
      chapitre_1: chap1Score,
      chapitre_2: chap2Score,
      deltas: { gb: deltaGB, cv: deltaCV, f26b: deltaF26b, mean: deltaMean, v2: deltaV2 },
      pass: { gb: passGB, cv: passCV, f26b: passF26b, mean: passMean, v2: passV2, all: allPass },
      verdict: allPass ? 'COHERENT' : 'DISCONTINUITY',
    }, null, 2));

  const prosesDir = join('sessions', `P4_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  writeFileSync(join(prosesDir, 'chapitre_1.txt'), chap1Prose);
  writeFileSync(join(prosesDir, 'chapitre_2.txt'), chap2Prose);

  console.log(`\nSaved: ${join(outDir, 'P4_CONTINUITE_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
