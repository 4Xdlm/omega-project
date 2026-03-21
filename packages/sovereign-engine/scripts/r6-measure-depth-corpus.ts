/**
 * OMEGA Phase R-6 — Measure depth features on full corpus (571 works)
 * Produces CORPUS_DEPTH_FEATURES.json
 *
 * Usage: cd packages/sovereign-engine && npx tsx scripts/r6-measure-depth-corpus.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDepthFeatures } from '../src/scoring/depth-features.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const TIERS_PATH = path.resolve(ROOT, 'omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');
const TXT_DIR = path.resolve(ROOT, 'omega-autopsie/corpus_r/txt');
const OUT_PATH = path.resolve(ROOT, 'omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json');

const WINDOW = 500;
const POSITIONS = [0.10, 0.25, 0.50, 0.75, 0.90];

const tiers: Array<{ filename: string; tier_suggestion: string }> =
  JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8'));

console.log(`\n  R-6 Depth Features — ${tiers.length} works\n`);

function extractPassages(words: string[]): string[] {
  if (words.length < 1000) return [words.join(' ')];
  const positions = words.length < 2500 ? [0.25, 0.50, 0.75] : POSITIONS;
  return positions.map(pos => {
    const center = Math.floor(words.length * pos);
    const start = Math.max(0, center - Math.floor(WINDOW / 2));
    return words.slice(start, start + WINDOW).join(' ');
  });
}

function avgFeatures(sets: Record<string, number>[]): Record<string, number> {
  if (sets.length === 0) return {};
  const keys = Object.keys(sets[0]);
  const avg: Record<string, number> = {};
  for (const k of keys) {
    const vals = sets.map(s => s[k] ?? 0);
    avg[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10000) / 10000;
  }
  return avg;
}

const results: Array<{ filename: string; tier: string; depth_features: Record<string, number> }> = [];
let ok = 0;
const t0 = Date.now();

for (let i = 0; i < tiers.length; i++) {
  const entry = tiers[i];
  const txtPath = path.join(TXT_DIR, entry.filename);
  if (!fs.existsSync(txtPath)) continue;

  const text = fs.readFileSync(txtPath, 'utf-8');
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const passages = extractPassages(words);
  const featureSets = passages.map(p => computeDepthFeatures(p));
  const avg = avgFeatures(featureSets);

  results.push({ filename: entry.filename, tier: entry.tier_suggestion, depth_features: avg });
  ok++;

  if (i % 100 === 0 || i === tiers.length - 1) {
    console.log(`  [${i + 1}/${tiers.length}] ${ok} OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
console.log(`\n  Done: ${ok} works, saved ${OUT_PATH}`);
