/**
 * OMEGA — P3-v4 : Confirmation Ancre Renforcée — 3 scènes × 1 run × 4 chunks = 12 API
 *
 * Delta vs v3 : RAPPEL_CHUNKS34_V4 avec ancre nappe phrastique renforcée.
 * Seuil drift ±15 inchangé. On corrige le moteur, pas le contrat.
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-p3-v4-confirmation.ts
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

// ═══════════════════════════════════════════════════════════════════════════
// RAPPEL_CHUNKS34 — VERSION v4 (SEUL CHANGEMENT)
// ═══════════════════════════════════════════════════════════════════════════

const RAPPEL_CHUNKS34_V4 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

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
// 3 SCÈNES — IDENTIQUES À P3
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

function buildChunkPrompt(sceneBrief: string, last200: string | null, chunk: number, isFirst: boolean, isLast: boolean): string {
  const rappel = chunk <= 2 ? RAPPEL_CHUNKS12 : RAPPEL_CHUNKS34_V4;

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
  const allProses: Array<{ scene: string, prose: string }> = [];

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — P3-v4 : CONFIRMATION ANCRE RENFORCÉE');
  console.log('  3 scènes × 1 run × 4 chunks = 12 API calls');
  console.log('  Delta vs v3 : RAPPEL_CHUNKS34_V4 (ancre nappe phrastique)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  for (const scene of SCENES) {
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`  SCÈNE : ${scene.id.toUpperCase()}`);
    console.log('═'.repeat(65));

    let fullProse = '';
    const chunkStats: any[] = [];

    for (let chunk = 1; chunk <= 4; chunk++) {
      const isFirst = chunk === 1;
      const isLast = chunk === 4;
      const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

      const prompt = buildChunkPrompt(scene.brief, isFirst ? null : last200, chunk, isFirst, isLast);
      const chunkProse = await withRetry(() => generate(client, prompt, 2500), `${scene.id} c${chunk}`);
      fullProse += (fullProse ? '\n\n' : '') + chunkProse;

      const cw = measureWindows(chunkProse, 1);
      const chunkMean = cw.length > 0 ? cw[0].mean_len : 0;
      const chunkCV = cw.length > 0 ? cw[0].cv : 0;
      console.log(`  Chunk ${chunk}: ${chunkProse.split(/\s+/).length}w mean=${chunkMean.toFixed(1)} cv=${chunkCV.toFixed(3)}`);
      chunkStats.push({ chunk, mean_len: chunkMean, cv: chunkCV, word_count: chunkProse.split(/\s+/).length });

      await new Promise(r => setTimeout(r, 2000));
    }

    // Dual scoring
    const gbResult = scoreText(fullProse);
    const features = computeAllGBFeatures(fullProse);
    const wordCount = fullProse.split(/\s+/).length;
    const v2Result = v2Scorer.score(features, { wordCount });

    const sentences = fullProse.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
    const lens = sentences.map(s => s.trim().split(/\s+/).length);
    const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
    const cv = mean > 0 ? std / mean : 0;

    const windows = measureWindows(fullProse, 4);
    const drift = calcDrift(windows);
    const chunkFinalMean = chunkStats[3].mean_len;

    const pass = v2Result.final >= 90 && cv >= 0.80 && cv <= 1.30 && (features.f26b_long_sent_rate ?? 0) > 0.40 && Math.abs(drift) <= 15 && chunkFinalMean > 10;

    console.log(`\n  TOTAL: ${wordCount}w GB=${gbResult.score.toFixed(3)} V2=${v2Result.final.toFixed(1)} f26b=${(features.f26b_long_sent_rate ?? 0).toFixed(3)} CV=${cv.toFixed(3)} mean=${mean.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)} ${pass ? '✅' : '❌'}`);
    console.log(`  Chunk4 mean=${chunkFinalMean.toFixed(1)}w ${chunkFinalMean > 10 ? '✅' : '⚠️ TAKEOVER'}`);

    for (const w of windows) {
      console.log(`    W(${(w.position * 100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} cv=${w.cv.toFixed(3)} ${w.word_count}w`);
    }

    allResults.push({
      scene: scene.id, word_count: wordCount,
      gb_v1: gbResult.score, v2_final: v2Result.final,
      f26b: features.f26b_long_sent_rate ?? 0,
      cv, mean_sentence_length: mean, drift,
      chunk_final_mean: chunkFinalMean,
      chunks: chunkStats, pass,
      bonuses: v2Result.bonuses.map(b => ({ name: b.name, triggered: b.triggered })),
      penalties: v2Result.penalties.map(p => ({ name: p.name, triggered: p.triggered })),
    });

    allProses.push({ scene: scene.id, prose: fullProse });

    await new Promise(r => setTimeout(r, 3000));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(70));
  console.log('  P3-v4 — CONFIRMATION ANCRE RENFORCÉE');
  console.log('═'.repeat(70));
  console.log('  Scène           GB_V1   V2    f26b    CV    Drift   PASS');
  console.log('  ' + '-'.repeat(62));

  // v3 reference drifts for comparison
  const v3Drifts: Record<string, number> = {
    confrontation: -15.3,
    contemplation: -11.3,
    dialogue: -17.6,
  };

  for (const r of allResults) {
    console.log(`  ${r.scene.padEnd(16)} ${r.gb_v1.toFixed(3)}  ${r.v2_final.toFixed(1).padStart(5)}  ${r.f26b.toFixed(3)}  ${r.cv.toFixed(3)}  ${(r.drift > 0 ? '+' : '') + r.drift.toFixed(1).padStart(6)}   ${r.pass ? '✅' : '❌'}`);
  }

  console.log('\n  ' + '-'.repeat(62));
  const passCount = allResults.filter(r => r.pass).length;
  console.log(`  Verdict v4 : ${passCount}/3 PASS`);

  // Delta drift vs v3
  console.log('\n  Delta drift vs v3 :');
  for (const r of allResults) {
    const v3d = v3Drifts[r.scene] ?? 0;
    const delta = r.drift - v3d;
    console.log(`    ${r.scene.padEnd(16)} v3=${v3d.toFixed(1).padStart(6)} → v4=${(r.drift > 0 ? '+' : '') + r.drift.toFixed(1).padStart(6)}  Δ=${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${Math.abs(r.drift) < Math.abs(v3d) ? '✅ amélioration' : '❌ régression'}`);
  }

  // Décision
  console.log('\n' + '═'.repeat(70));

  const allPass = allResults.every(r => r.pass);

  if (allPass) {
    console.log('  → ✅ 3/3 SCÈNES PASS — MOTEUR SCELLÉ CANDIDAT');
    console.log('     Prochaine étape : P4 (continuité inter-chapitres)');
    console.log('     Loi L25 + L26 confirmées sur 3 terrains');
  } else {
    const failScenes = allResults.filter(r => !r.pass);
    const driftFails = failScenes.filter(r => Math.abs(r.drift) > 15);

    if (driftFails.length > 0 && driftFails.every(r => r.v2_final >= 90 && r.cv >= 0.80)) {
      console.log('  → ⚠️  FAIL drift uniquement — V2+CV intacts');
      console.log('     Évaluer Lecture A : seuil contextuel ±20 pour dialogue/confrontation');
      console.log('     Preuve requise : corpus humain sur ces types de scènes');
      for (const f of driftFails) {
        console.log(`     ${f.scene}: drift=${f.drift.toFixed(1)} (seuil ±15)`);
      }
    } else {
      console.log('  → ❌ FAIL multi-critères — analyser régression v4 vs v3');
      for (const f of failScenes) {
        const reasons: string[] = [];
        if (f.v2_final < 90) reasons.push(`V2=${f.v2_final.toFixed(1)}`);
        if (f.cv < 0.80) reasons.push(`CV=${f.cv.toFixed(3)}`);
        if (f.cv > 1.30) reasons.push(`CV=${f.cv.toFixed(3)} overflow`);
        if (f.f26b <= 0.40) reasons.push(`f26b=${f.f26b.toFixed(3)}`);
        if (Math.abs(f.drift) > 15) reasons.push(`drift=${f.drift.toFixed(1)}`);
        if (f.chunk_final_mean <= 10) reasons.push(`takeover ch4=${f.chunk_final_mean.toFixed(1)}`);
        console.log(`     ${f.scene}: ${reasons.join(' | ')}`);
      }
    }
  }

  // Save
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'P3_V4_CONFIRMATION_RESULTS.json'),
    JSON.stringify({
      metadata: { test: 'P3_V4_CONFIRMATION', timestamp, model: MODEL },
      results: allResults,
      pass_count: passCount,
      all_pass: allPass,
      v3_reference_drifts: v3Drifts,
      verdict: allPass ? '3/3_PASS' : `${passCount}/3_PASS`,
    }, null, 2));

  const prosesDir = join('sessions', `P3_V4_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const p of allProses) {
    writeFileSync(join(prosesDir, `${p.scene}.txt`), p.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'P3_V4_CONFIRMATION_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
