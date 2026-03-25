/**
 * OMEGA — P3 : Régime Cible — 3 scènes × 3 runs × 4 chunks = 36 API
 *
 * Vérifie que le moteur PF+Duras_K2_v3 tient sur 3 types de scènes
 * radicalement différents : confrontation, contemplation, dialogue.
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-p3-regime-cible.ts
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
// 3 SCÈNES
// ═══════════════════════════════════════════════════════════════════════════

const SCENES = [
  {
    id: 'confrontation',
    brief: `Deux hommes dans un bureau. L'un d'eux vient d'apprendre que l'autre
l'a trahi. Pas de violence physique — une guerre de mots et de silences.
L'un parle trop. L'autre dit à peine. La trahison est vieille de dix ans
mais ne vient d'être découverte que maintenant. La pièce est petite.
Aucun des deux ne peut partir.`
  },
  {
    id: 'contemplation',
    brief: `Une femme seule dans un appartement vide, la nuit. Elle attend
une nouvelle médicale depuis trois jours. Elle ne fait rien — elle
regarde les objets, les meubles, la lumière. Chaque détail lui rappelle
quelque chose. Le temps s'étire. Elle ne sait pas encore ce qu'elle va
apprendre. Elle sait que demain sera différent.`
  },
  {
    id: 'dialogue',
    brief: `Un père et sa fille adulte. Ils ne se sont pas parlé depuis deux ans.
Ce n'est pas une réconciliation — c'est une négociation. Elle veut quelque
chose de concret. Lui aussi. Aucun ne dit vraiment ce qu'il veut.
La conversation tourne autour du vrai sujet sans jamais le nommer.
Dehors, il pleut.`
  }
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

function buildChunkPrompt(sceneBrief: string, last200: string | null, chunk: number, isFirst: boolean, isLast: boolean): string {
  const rappel = chunk <= 2 ? RAPPEL_CHUNKS12 : RAPPEL_CHUNKS34;

  if (isFirst) {
    return `${PF_PERSONA}\n\n${rappel}\n\nTu écris le DÉBUT de cette scène :\n\n${sceneBrief}\n\nÉcris les 750 premiers mots. Installe l'atmosphère, les personnages, la tension.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else if (isLast) {
    return `${PF_PERSONA}\n\n${rappel}\n\nContinue et TERMINE cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else {
    return `${PF_PERSONA}\n\n${rappel}\n\nContinue cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
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
  const allProses: Array<{ scene: string, run: number, prose: string }> = [];

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — P3 : RÉGIME CIBLE — 3 scènes × 3 runs × 4 chunks');
  console.log('  Moteur : PF+Duras_correcteur_K2_v3 | 36 API calls');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  for (const scene of SCENES) {
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`  SCÈNE : ${scene.id.toUpperCase()}`);
    console.log('═'.repeat(65));

    for (let run = 1; run <= 3; run++) {
      console.log(`\n  Run ${run}/3 — ${scene.id}`);
      let fullProse = '';
      const chunkStats: any[] = [];

      for (let chunk = 1; chunk <= 4; chunk++) {
        const isFirst = chunk === 1;
        const isLast = chunk === 4;
        const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

        const prompt = buildChunkPrompt(scene.brief, isFirst ? null : last200, chunk, isFirst, isLast);
        const chunkProse = await withRetry(() => generate(client, prompt, 2500), `${scene.id} r${run} c${chunk}`);
        fullProse += (fullProse ? '\n\n' : '') + chunkProse;

        const cw = measureWindows(chunkProse, 1);
        const chunkMean = cw.length > 0 ? cw[0].mean_len : 0;
        const chunkCV = cw.length > 0 ? cw[0].cv : 0;
        console.log(`    Chunk ${chunk}: ${chunkProse.split(/\s+/).length}w mean=${chunkMean.toFixed(1)} cv=${chunkCV.toFixed(3)}`);
        chunkStats.push({ chunk, mean_len: chunkMean, cv: chunkCV, word_count: chunkProse.split(/\s+/).length });

        await new Promise(r => setTimeout(r, 2000));
      }

      // Dual scoring
      const gbResult = scoreText(fullProse);
      const features = computeAllGBFeatures(fullProse);
      const wordCount = fullProse.split(/\s+/).length;
      const v2Result = v2Scorer.score(features, { wordCount });

      // CV from sentence lengths
      const sentences = fullProse.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
      const lens = sentences.map(s => s.trim().split(/\s+/).length);
      const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
      const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
      const cv = mean > 0 ? std / mean : 0;

      const windows = measureWindows(fullProse, 4);
      const drift = calcDrift(windows);
      const chunkFinalMean = chunkStats[3].mean_len;

      console.log(`    TOTAL: ${wordCount}w GB=${gbResult.score.toFixed(3)} V2=${v2Result.final.toFixed(1)} f26b=${(features.f26b_long_sent_rate ?? 0).toFixed(3)} CV=${cv.toFixed(3)} mean=${mean.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)}`);
      console.log(`    Chunk4 mean=${chunkFinalMean.toFixed(1)}w ${chunkFinalMean > 10 ? '✅' : '⚠️ TAKEOVER'}`);

      allResults.push({
        scene: scene.id, run, word_count: wordCount,
        gb_v1: gbResult.score, v2_final: v2Result.final,
        f26b: features.f26b_long_sent_rate ?? 0,
        cv, mean_sentence_length: mean, drift,
        chunk_final_mean: chunkFinalMean,
        chunks: chunkStats,
        bonuses: v2Result.bonuses.map(b => ({ name: b.name, triggered: b.triggered })),
        penalties: v2Result.penalties.map(p => ({ name: p.name, triggered: p.triggered })),
      });

      allProses.push({ scene: scene.id, run, prose: fullProse });

      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE P3
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(75));
  console.log('  P3 — RÉGIME CIBLE : RÉSULTATS PAR SCÈNE');
  console.log('═'.repeat(75));
  console.log('  Scène           GB_V1   V2_final   f26b    CV    Drift   chunk4  PASS');
  console.log('  ' + '-'.repeat(73));

  let allPass = true;
  for (const sceneId of ['confrontation', 'contemplation', 'dialogue']) {
    const runs = allResults.filter(r => r.scene === sceneId);
    const gbMed = medianFn(runs.map(r => r.gb_v1));
    const v2Med = medianFn(runs.map(r => r.v2_final));
    const f26bMed = medianFn(runs.map(r => r.f26b));
    const cvMed = medianFn(runs.map(r => r.cv));
    const driftMed = medianFn(runs.map(r => r.drift));
    const ch4Med = medianFn(runs.map(r => r.chunk_final_mean));
    const pass = v2Med >= 90 && cvMed >= 0.80 && cvMed <= 1.30 && f26bMed > 0.40 && Math.abs(driftMed) <= 15 && ch4Med > 10;
    if (!pass) allPass = false;
    console.log(`  ${sceneId.padEnd(16)} ${gbMed.toFixed(3)}   ${v2Med.toFixed(1).padStart(8)}  ${f26bMed.toFixed(3)}  ${cvMed.toFixed(3)}  ${(driftMed > 0 ? '+' : '') + driftMed.toFixed(1).padStart(6)}   ${ch4Med.toFixed(0).padStart(4)}w   ${pass ? '✅' : '❌'}`);
  }

  console.log('\n  ' + '-'.repeat(73));
  const v2All = medianFn(allResults.map(r => r.v2_final));
  const cvAll = medianFn(allResults.map(r => r.cv));
  const gbAll = medianFn(allResults.map(r => r.gb_v1));
  console.log(`  GLOBAL (9 runs)  V2_med=${v2All.toFixed(1)}  CV_med=${cvAll.toFixed(3)}  GB_med=${gbAll.toFixed(3)}  Robustesse: ${allPass ? '✅ TOUTES SCÈNES PASS' : '❌ ÉCHEC(S)'}`);

  // Décision P3
  console.log('\n' + '═'.repeat(75));
  if (allPass) {
    console.log('  → ✅ MOTEUR ROBUSTE : PF+Duras_K2_v3 tient sur les 3 types de scènes');
    console.log('     Prochaine étape : P4 (continuité inter-chapitres)');
    console.log('     Loi L25 CONFIRMÉE sur 3 terrains différents');
  } else {
    const failScenes = ['confrontation', 'contemplation', 'dialogue'].filter(s => {
      const runs = allResults.filter(r => r.scene === s);
      const v2Med = medianFn(runs.map(r => r.v2_final));
      const cvMed = medianFn(runs.map(r => r.cv));
      const driftMed = medianFn(runs.map(r => r.drift));
      const f26bMed = medianFn(runs.map(r => r.f26b));
      return !(v2Med >= 90 && cvMed >= 0.80 && cvMed <= 1.30 && f26bMed > 0.40 && Math.abs(driftMed) <= 15);
    });
    console.log(`  → ⚠️  FAIL sur : ${failScenes.join(', ')}`);
    console.log('     Analyser les features top5 V2 pour identifier la cause.');
  }

  // Save
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'P3_REGIME_CIBLE_RESULTS.json'),
    JSON.stringify({
      metadata: { test: 'P3_REGIME_CIBLE', timestamp, model: MODEL },
      results: allResults,
      global: { v2_median: v2All, cv_median: cvAll, gb_median: gbAll, all_pass: allPass },
    }, null, 2));

  const prosesDir = join('sessions', `P3_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const p of allProses) {
    writeFileSync(join(prosesDir, `${p.scene}_r${p.run}.txt`), p.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'P3_REGIME_CIBLE_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
