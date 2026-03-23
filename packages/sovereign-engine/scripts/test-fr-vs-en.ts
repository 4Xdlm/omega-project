/**
 * OMEGA — Test Translation Bottleneck FR vs EN
 * 4 scenes × 2 languages = 8 API calls
 * Measures 42 GB features + GB V1 score on each prose.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-fr-vs-en.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;
const MAX_TOKENS = 2000;

const SCENES = [
  {
    id: 'confrontation', archetype: 'BRUTAL',
    brief_fr: `Tu es un romancier français. Écris une scène de confrontation violente.
Un homme entre dans un bar. Il cherche celui qui a trahi sa sœur.
La tension monte. Les regards se croisent. Quelqu'un va tomber.
Écris 500 mots de prose littéraire française. Pas de préambule.
Contraintes : vocabulaire varié, alternance phrases courtes et longues,
associations de mots originales, zéro redondance.`,
    brief_en: `You are a novelist. Write a scene of violent confrontation.
A man enters a bar. He is looking for the one who betrayed his sister.
Tension rises. Their eyes meet. Someone is going to fall.
Write 500 words of literary prose in English. No preamble.
Constraints: varied vocabulary, alternating short and long sentences,
original word associations, zero redundancy.`
  },
  {
    id: 'contemplation', archetype: 'SENSORY',
    brief_fr: `Tu es un romancier français. Écris une scène de contemplation.
Une femme seule sur un quai de gare vide au crépuscule.
Elle regarde les rails qui s'enfoncent dans la brume.
Elle pense à tout ce qu'elle laisse derrière elle.
Écris 500 mots de prose littéraire française. Pas de préambule.
Contraintes : vocabulaire varié, alternance phrases courtes et longues,
associations de mots originales, zéro redondance.`,
    brief_en: `You are a novelist. Write a scene of contemplation.
A woman alone on an empty train platform at dusk.
She watches the rails disappearing into the mist.
She thinks about everything she is leaving behind.
Write 500 words of literary prose in English. No preamble.
Constraints: varied vocabulary, alternating short and long sentences,
original word associations, zero redundancy.`
  },
  {
    id: 'action_pure', archetype: 'BRUTAL',
    brief_fr: `Tu es un romancier français. Écris une scène d'action pure.
Une poursuite à travers les ruelles d'une ville méditerranéenne la nuit.
Deux silhouettes. L'une fuit. L'autre chasse.
Les toits, les escaliers, les passages étroits.
Écris 500 mots de prose littéraire française. Pas de préambule.
Contraintes : vocabulaire varié, alternance phrases courtes et longues,
associations de mots originales, zéro redondance.`,
    brief_en: `You are a novelist. Write a scene of pure action.
A chase through the narrow streets of a Mediterranean city at night.
Two silhouettes. One flees. The other hunts.
Rooftops, staircases, narrow passages.
Write 500 words of literary prose in English. No preamble.
Constraints: varied vocabulary, alternating short and long sentences,
original word associations, zero redundancy.`
  },
  {
    id: 'elegie', archetype: 'INTERIOR',
    brief_fr: `Tu es un romancier français. Écris une scène d'élégie intérieure.
Un vieil homme assis dans la chambre de son fils mort.
Les objets parlent. La lumière décline.
Le souvenir et le présent se confondent.
Écris 500 mots de prose littéraire française. Pas de préambule.
Contraintes : vocabulaire varié, alternance phrases courtes et longues,
associations de mots originales, zéro redondance.`,
    brief_en: `You are a novelist. Write a scene of interior elegy.
An old man sitting in the bedroom of his dead son.
Objects speak. The light fades.
Memory and present blur together.
Write 500 words of literary prose in English. No preamble.
Constraints: varied vocabulary, alternating short and long sentences,
original word associations, zero redundancy.`
  }
];

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdev(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}

async function generateProse(client: Anthropic, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL, max_tokens: MAX_TOKENS, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text block');
  return textBlock.text;
}

interface MeasureResult {
  scene_id: string; language: 'FR' | 'EN'; prose: string;
  word_count: number; sentence_count: number;
  mean_sentence_length: number; cv_sentence_length: number;
  gb_score: number; gb_tier: string;
  dominant_type: string;
  f26b: number; f1a: number; f29d: number; f9a: number; f17: number;
  f24c: number; f1_mean: number;
}

function measureProse(prose: string, sceneId: string, language: 'FR' | 'EN'): MeasureResult {
  const features = computeAllGBFeatures(prose);
  const gb = scoreGB(features);
  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const cls = classifyPassage(prose);
  const sents = splitSentences(prose);
  const sentLens = sents.map(s => s.split(/\s+/).length);
  const avgLen = mean(sentLens);
  const cv = avgLen > 0 ? stdev(sentLens) / avgLen : 0;

  return {
    scene_id: sceneId, language, prose,
    word_count: prose.split(/\s+/).length,
    sentence_count: sents.length,
    mean_sentence_length: r4(avgLen),
    cv_sentence_length: r4(cv),
    gb_score: r4(gb), gb_tier: tier,
    dominant_type: cls.dominant_type,
    f26b: r4(features.f26b_long_sent_rate ?? 0),
    f1a: r4(features.f1a_rhythm_variance ?? 0),
    f29d: r4(features.f29d_ttr_score ?? 0),
    f9a: r4(features.f9a_contradiction_rate ?? 0),
    f17: features.f17_knife_count ?? 0,
    f24c: r4(features.f24c_contrast_delta ?? 0),
    f1_mean: r4(features.f1_mean ?? 0),
  };
}

async function main() {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const client = new Anthropic({ apiKey });
  const results: MeasureResult[] = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('=' .repeat(65));
  console.log('  OMEGA — TEST TRANSLATION BOTTLENECK FR vs EN');
  console.log(`  Model: ${MODEL} | Temp: ${TEMPERATURE} | Scenes: ${SCENES.length}`);
  console.log('=' .repeat(65));

  for (const scene of SCENES) {
    console.log(`\n[${scene.id}] Generating FR...`);
    const proseFR = await generateProse(client, scene.brief_fr);
    const mFR = measureProse(proseFR, scene.id, 'FR');
    results.push(mFR);
    console.log(`  FR: ${mFR.word_count}w GB=${mFR.gb_score} CV=${mFR.cv_sentence_length} f26b=${mFR.f26b} type=${mFR.dominant_type}`);

    console.log(`[${scene.id}] Generating EN...`);
    const proseEN = await generateProse(client, scene.brief_en);
    const mEN = measureProse(proseEN, scene.id, 'EN');
    results.push(mEN);
    console.log(`  EN: ${mEN.word_count}w GB=${mEN.gb_score} CV=${mEN.cv_sentence_length} f26b=${mEN.f26b} type=${mEN.dominant_type}`);

    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPARISON
  // ═══════════════════════════════════════════════════════════════

  console.log(`\n${'='.repeat(65)}`);
  console.log('  COMPARISON TABLE');
  console.log(`${'='.repeat(65)}`);
  console.log(`  ${'Scene'.padEnd(18)} ${'GB FR'.padStart(7)} ${'GB EN'.padStart(7)} ${'ΔGB'.padStart(7)} ${'CV FR'.padStart(7)} ${'CV EN'.padStart(7)} ${'f26b FR'.padStart(8)} ${'f26b EN'.padStart(8)}`);
  console.log('  ' + '-'.repeat(60));

  const comparison: Array<{ scene: string; delta_gb: number; delta_cv: number; delta_f26b: number; delta_f1_mean: number }> = [];

  for (const scene of SCENES) {
    const fr = results.find(r => r.scene_id === scene.id && r.language === 'FR')!;
    const en = results.find(r => r.scene_id === scene.id && r.language === 'EN')!;
    const dg = en.gb_score - fr.gb_score;
    const dc = en.cv_sentence_length - fr.cv_sentence_length;
    const df = en.f26b - fr.f26b;
    comparison.push({ scene: scene.id, delta_gb: dg, delta_cv: dc, delta_f26b: df, delta_f1_mean: en.f1_mean - fr.f1_mean });
    const win = dg > 0.05 ? 'EN' : dg < -0.05 ? 'FR' : '=';
    console.log(`  ${scene.id.padEnd(18)} ${fr.gb_score.toFixed(2).padStart(7)} ${en.gb_score.toFixed(2).padStart(7)} ${(dg > 0 ? '+' : '') + dg.toFixed(2).padStart(6)} ${fr.cv_sentence_length.toFixed(3).padStart(7)} ${en.cv_sentence_length.toFixed(3).padStart(7)} ${fr.f26b.toFixed(3).padStart(8)} ${en.f26b.toFixed(3).padStart(8)}  ${win}`);
  }

  const mgb = mean(comparison.map(c => c.delta_gb));
  const mcv = mean(comparison.map(c => c.delta_cv));
  const mf26 = mean(comparison.map(c => c.delta_f26b));
  const mlen = mean(comparison.map(c => c.delta_f1_mean));

  console.log('  ' + '-'.repeat(60));
  console.log(`  ${'MEAN DELTA'.padEnd(18)} ${' '.repeat(14)} ${(mgb > 0 ? '+' : '') + mgb.toFixed(3).padStart(6)} ${' '.repeat(7)} ${(mcv > 0 ? '+' : '') + mcv.toFixed(3).padStart(7)} ${' '.repeat(8)} ${(mf26 > 0 ? '+' : '') + mf26.toFixed(3).padStart(8)}`);

  console.log(`\n  Mean Δ GB: ${mgb > 0 ? '+' : ''}${mgb.toFixed(3)}`);
  console.log(`  Mean Δ CV: ${mcv > 0 ? '+' : ''}${mcv.toFixed(3)}`);
  console.log(`  Mean Δ f26b: ${mf26 > 0 ? '+' : ''}${mf26.toFixed(4)}`);
  console.log(`  Mean Δ mean_len: ${mlen > 0 ? '+' : ''}${mlen.toFixed(1)} words`);

  // Verdict
  let verdict: string;
  if (mgb > 0.1 && mcv > 0.03) verdict = 'BOTTLENECK_CONFIRMED';
  else if (mgb > 0.05 || mcv > 0.02) verdict = 'BOTTLENECK_PROBABLE';
  else if (Math.abs(mgb) <= 0.05) verdict = 'NO_BOTTLENECK';
  else verdict = 'FR_WINS_UNEXPECTED';

  console.log(`\n  VERDICT: ${verdict}`);

  // Types
  const frTypes = results.filter(r => r.language === 'FR').map(r => r.dominant_type);
  const enTypes = results.filter(r => r.language === 'EN').map(r => r.dominant_type);
  console.log(`  Types FR: ${frTypes.join(', ')}`);
  console.log(`  Types EN: ${enTypes.join(', ')}`);

  // Save
  const dataDir = resolve(__dirname, '../src/scoring/data');
  writeFileSync(join(dataDir, 'FR_VS_EN_BOTTLENECK_TEST.json'), JSON.stringify({
    date: new Date().toISOString(), model: MODEL, temperature: TEMPERATURE,
    scenes: SCENES.length, api_calls: SCENES.length * 2,
    aggregates: { mean_delta_gb: r4(mgb), mean_delta_cv: r4(mcv), mean_delta_f26b: r4(mf26), mean_delta_f1_mean: r4(mlen) },
    verdict,
    comparison: comparison.map((c, i) => ({
      ...c,
      fr_gb: results[i * 2].gb_score, en_gb: results[i * 2 + 1].gb_score,
      fr_cv: results[i * 2].cv_sentence_length, en_cv: results[i * 2 + 1].cv_sentence_length,
      fr_type: results[i * 2].dominant_type, en_type: results[i * 2 + 1].dominant_type,
    })),
    raw: results.map(r => ({ scene: r.scene_id, lang: r.language, words: r.word_count, sents: r.sentence_count, gb: r.gb_score, tier: r.gb_tier, cv: r.cv_sentence_length, f26b: r.f26b, f1a: r.f1a, f29d: r.f29d, f9a: r.f9a, f17: r.f17, type: r.dominant_type, f1_mean: r.f1_mean })),
  }, null, 2));

  // Save prose files
  const proseDir = resolve(__dirname, `../sessions/FR_VS_EN_${ts}`);
  mkdirSync(proseDir, { recursive: true });
  for (const r of results) writeFileSync(join(proseDir, `${r.scene_id}_${r.language}.txt`), r.prose);

  console.log(`\n  Saved: data/FR_VS_EN_BOTTLENECK_TEST.json + ${proseDir}`);
  console.log('=' .repeat(65));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
