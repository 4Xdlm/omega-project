/**
 * OMEGA Feature Dump — Parity Debug Tool
 * Usage: npx tsx scripts/feature-dump-ts.ts <path-to-txt>
 */
import * as fs from 'node:fs';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { getFeatureNames, scoreGB } from '../src/scoring/gb-inference.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx tsx scripts/feature-dump-ts.ts <path-to-txt>');
  process.exit(1);
}

const text = fs.readFileSync(filePath, 'utf-8');
const words = text.split(/\s+/).filter(w => w.length > 0);
console.log(`File: ${filePath}`);
console.log(`Words: ${words.length}`);

const features = computeAllGBFeatures(text);
const gbScore = scoreGB(features);
const featureNames = getFeatureNames();

console.log(`GB Score: ${gbScore.toFixed(4)}`);
console.log('');
console.log(`${'Feature'.padEnd(35)} ${'Value'.padStart(12)}`);
console.log(`${'-'.repeat(35)} ${'-'.repeat(12)}`);

for (const fname of featureNames) {
  const val = features[fname] ?? 'MISSING';
  if (typeof val === 'number') {
    console.log(`${fname.padEnd(35)} ${val.toFixed(6).padStart(12)}`);
  } else {
    console.log(`${fname.padEnd(35)} ${String(val).padStart(12)}`);
  }
}

// Save JSON for comparison
const outPath = filePath.replace('.txt', '_features_ts.json');
fs.writeFileSync(outPath, JSON.stringify({
  source: 'typescript',
  file: filePath.split(/[/\\]/).pop(),
  words: words.length,
  gb_score: gbScore,
  features: Object.fromEntries(featureNames.map(f => [f, features[f] ?? 0])),
}, null, 2));
console.log(`\nSaved: ${outPath}`);
