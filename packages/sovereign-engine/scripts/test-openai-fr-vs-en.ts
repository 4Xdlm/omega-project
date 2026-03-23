/**
 * OMEGA — Test OpenAI GPT FR vs EN — Language Bottleneck
 * 4 scenes × 2 languages = 8 API calls (OpenAI only)
 * Third data point after Claude (bottleneck) and Mistral (no bottleneck).
 *
 * Usage: OPENAI_API_KEY=sk-... npx tsx scripts/test-openai-fr-vs-en.ts
 */

import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GPT_MODEL = 'gpt-4o';
const TEMPERATURE = 0.75;
const MAX_TOKENS = 8000;

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdevFn(v: number[]): number { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}

const SCENES = [
  { id: 'confrontation',
    fr: `Tu es un romancier français de premier plan. Écris une longue scène de confrontation. Un homme entre dans un bar de bord de route. Il cherche celui qui a trahi sa sœur il y a dix ans. La scène se déploie lentement : le lieu, les corps, les odeurs. Le dialogue s'engage. Les masques tombent. Écris 3000 mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, dialogue, introspection et narration. Contraintes : vocabulaire très varié, alterner phrases courtes (3-8 mots) et longues (25-40+ mots), au moins 10% > 40 mots, associations originales, zéro redondance.`,
    en: `You are a top-tier novelist. Write a long confrontation scene. A man enters a roadside bar. He is looking for the one who betrayed his sister ten years ago. The scene unfolds slowly: the place, the bodies, the smells. Dialogue begins. Masks fall. Write 3000 words of literary prose in English. No preamble. The scene must BLEND description, dialogue, introspection and narration. Constraints: highly varied vocabulary, alternate short (3-8 words) and long (25-40+ words) sentences, at least 10% > 40 words, original associations, zero redundancy.` },
  { id: 'contemplation',
    fr: `Tu es un romancier français de premier plan. Écris une longue scène de contemplation. Une femme seule sur un quai de gare vide, la nuit. Le dernier train est parti. Elle ne l'a pas pris. Ses pensées se mêlent aux sensations. Elle se souvient d'une conversation. Écris 3000 mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, dialogue rapporté, introspection et narration. Contraintes : vocabulaire très varié, alterner phrases courtes et longues (>30 mots), au moins 10% > 40 mots, associations originales, zéro redondance.`,
    en: `You are a top-tier novelist. Write a long contemplation scene. A woman alone on an empty train platform at night. The last train has left. She didn't take it. Her thoughts blend with sensations. She remembers a conversation. Write 3000 words of literary prose in English. No preamble. The scene must BLEND description, reported dialogue, introspection and narration. Constraints: highly varied vocabulary, alternate short and long (>30 words) sentences, at least 10% > 40 words, original associations, zero redundancy.` },
  { id: 'action_pure',
    fr: `Tu es un romancier français de premier plan. Écris une longue scène d'action. Une poursuite à travers une ville méditerranéenne la nuit. Deux silhouettes : l'une fuit, l'autre chasse. Ce n'est pas que de la course — celui qui fuit pense. La ville est un personnage. Écris 3000 mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, introspection, narration et micro-dialogues. Contraintes : vocabulaire très varié, alterner phrases courtes et longues, au moins 10% > 40 mots, associations originales, zéro redondance.`,
    en: `You are a top-tier novelist. Write a long action scene. A chase through a Mediterranean city at night. Two silhouettes: one flees, the other hunts. It's not just running — the one who flees thinks. The city is a character. Write 3000 words of literary prose in English. No preamble. The scene must BLEND description, introspection, narration and micro-dialogue. Constraints: highly varied vocabulary, alternate short and long sentences, at least 10% > 40 words, original associations, zero redundancy.` },
  { id: 'elegie',
    fr: `Tu es un romancier français de premier plan. Écris une longue scène d'élégie. Un vieil homme dans la chambre de son fils mort depuis six mois. Il n'a rien touché. Aujourd'hui il a décidé de ranger. Mais chaque objet arrête le geste. Écris 3000 mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, dialogue rapporté, introspection et narration. Contraintes : vocabulaire très varié, alterner phrases courtes et longues (>30 mots), au moins 10% > 40 mots, associations originales, zéro redondance.`,
    en: `You are a top-tier novelist. Write a long elegy scene. An old man in the bedroom of his son, dead six months now. He hasn't touched anything. Today he decided to pack things up. But each object stops his hand. Write 3000 words of literary prose in English. No preamble. The scene must BLEND description, reported dialogue, introspection and narration. Constraints: highly varied vocabulary, alternate short and long (>30 words) sentences, at least 10% > 40 words, original associations, zero redundancy.` },
];

async function generateGPT(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: GPT_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: MAX_TOKENS, temperature: TEMPERATURE }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e: any) {
      console.warn(`  [RETRY ${i + 1}] ${label}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

interface Result {
  scene: string; lang: string; words: number; sents: number;
  mean_len: number; cv: number; gb: number; tier: string; type: string;
  f26b: number; f1a: number; f29d: number; f9a: number; f17: number; f1_mean: number;
  prose: string;
}

function measure(prose: string, scene: string, lang: string): Result {
  const feats = computeAllGBFeatures(prose);
  const gb = scoreGB(feats);
  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const cls = classifyPassage(prose);
  const sents = splitSentences(prose);
  const lens = sents.map(s => s.split(/\s+/).length);
  const avg = mean(lens); const cv = avg > 0 ? stdevFn(lens) / avg : 0;
  return {
    scene, lang, words: prose.split(/\s+/).length, sents: sents.length,
    mean_len: r4(avg), cv: r4(cv), gb: r4(gb), tier, type: cls.dominant_type,
    f26b: r4(feats.f26b_long_sent_rate ?? 0), f1a: r4(feats.f1a_rhythm_variance ?? 0),
    f29d: r4(feats.f29d_ttr_score ?? 0), f9a: r4(feats.f9a_contradiction_rate ?? 0),
    f17: feats.f17_knife_count ?? 0, f1_mean: r4(feats.f1_mean ?? 0), prose,
  };
}

async function main() {
  const openaiKey = process.env['OPENAI_API_KEY'];
  if (!openaiKey) { console.error('ERROR: OPENAI_API_KEY not set'); process.exit(1); }

  const results: Result[] = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('=' .repeat(65));
  console.log('  OMEGA — GPT FR vs EN — LANGUAGE BOTTLENECK');
  console.log(`  Model: ${GPT_MODEL} | Temp: ${TEMPERATURE} | Scenes: ${SCENES.length}`);
  console.log('=' .repeat(65));

  for (const scene of SCENES) {
    console.log(`\n[${scene.id}] GPT FR...`);
    const pFR = await withRetry(() => generateGPT(openaiKey, scene.fr), `FR ${scene.id}`);
    const mFR = measure(pFR, scene.id, 'FR');
    results.push(mFR);
    console.log(`  FR: ${mFR.words}w GB=${mFR.gb} CV=${mFR.cv} f26b=${mFR.f26b} type=${mFR.type}`);

    await new Promise(r => setTimeout(r, 3000));

    console.log(`[${scene.id}] GPT EN...`);
    const pEN = await withRetry(() => generateGPT(openaiKey, scene.en), `EN ${scene.id}`);
    const mEN = measure(pEN, scene.id, 'EN');
    results.push(mEN);
    console.log(`  EN: ${mEN.words}w GB=${mEN.gb} CV=${mEN.cv} f26b=${mEN.f26b} type=${mEN.type}`);

    const dg = mEN.gb - mFR.gb;
    console.log(`  Delta: GB=${dg > 0 ? '+' : ''}${dg.toFixed(3)} ${dg > 0.05 ? '→ EN' : dg < -0.05 ? '→ FR' : '→ TIE'}`);
    await new Promise(r => setTimeout(r, 3000));
  }

  // Summary
  const frR = results.filter(r => r.lang === 'FR');
  const enR = results.filter(r => r.lang === 'EN');
  const mgb = mean(enR.map(r => r.gb)) - mean(frR.map(r => r.gb));
  const mcv = mean(enR.map(r => r.cv)) - mean(frR.map(r => r.cv));
  const mf26 = mean(enR.map(r => r.f26b)) - mean(frR.map(r => r.f26b));

  console.log(`\n${'='.repeat(65)}`);
  console.log('  CROSS-MODEL COMPARISON — 3 MODELS');
  console.log(`${'='.repeat(65)}`);
  console.log('  Model          ΔGB (EN-FR)   ΔCV (EN-FR)   Bottleneck?');
  console.log('  ' + '-'.repeat(55));
  console.log('  Claude          +0.099        +0.052        PROBABLE');
  console.log('  Mistral         +0.041        -0.100        NO');
  console.log(`  GPT-4o          ${mgb > 0 ? '+' : ''}${mgb.toFixed(3)}        ${mcv > 0 ? '+' : ''}${mcv.toFixed(3)}        ${Math.abs(mgb) <= 0.05 ? 'NO' : mgb > 0.08 ? 'YES' : 'SLIGHT'}`);

  console.log(`\n  FR PERFORMANCE (mean GB FR):`);
  console.log(`  Claude:  3.740 | Mistral: 4.060 | GPT: ${mean(frR.map(r => r.gb)).toFixed(3)}`);

  const verdict = Math.abs(mgb) <= 0.05 ? 'NO_BOTTLENECK' : mgb > 0.08 ? 'BOTTLENECK_ANGLOPHONE' : mgb > 0.05 ? 'BOTTLENECK_SLIGHT' : 'FR_ADVANTAGE';
  console.log(`\n  VERDICT: ${verdict}`);

  // Save
  const dataDir = resolve(__dirname, '../src/scoring/data');
  writeFileSync(join(dataDir, 'GPT_FR_VS_EN_BOTTLENECK.json'), JSON.stringify({
    date: new Date().toISOString(), model: GPT_MODEL, temperature: TEMPERATURE,
    verdict, mean_delta_gb: r4(mgb), mean_delta_cv: r4(mcv), mean_delta_f26b: r4(mf26),
    mean_fr_gb: r4(mean(frR.map(r => r.gb))), mean_en_gb: r4(mean(enR.map(r => r.gb))),
    cross_reference: { claude: { deltaGB: 0.099 }, mistral: { deltaGB: 0.041 } },
    results: results.map(({ prose: _, ...rest }) => rest),
  }, null, 2));

  const proseDir = resolve(__dirname, `../sessions/GPT_FR_VS_EN_${ts}`);
  mkdirSync(proseDir, { recursive: true });
  for (const r of results) writeFileSync(join(proseDir, `${r.scene}_${r.lang}.txt`), r.prose);

  console.log(`\n  Saved: data/GPT_FR_VS_EN_BOTTLENECK.json + ${proseDir}`);
  console.log('=' .repeat(65));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
