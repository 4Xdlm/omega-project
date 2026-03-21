/**
 * OMEGA — Phase R-3 — Mesure massive du corpus classé
 *
 * Pour chaque œuvre classée (tier S/A/B/C/D) :
 *   1. Extraire 5 passages de 500 mots aux positions 10%, 25%, 50%, 75%, 90%
 *   2. Calculer computeTextFeatures() sur chaque passage
 *   3. Calculer la moyenne des 5 passages
 *   4. Sauver dans omega-autopsie/corpus_r/features/NOM_OEUVRE.json
 *   5. Consolider dans omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json
 *
 * Usage: cd C:\Users\elric\omega-project\packages\sovereign-engine
 *        npx tsx scripts/r3-measure-corpus.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTextFeatures } from '../src/scoring/text-features.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const TIERS_PATH = path.resolve(ROOT, 'omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');
const TXT_DIR = path.resolve(ROOT, 'omega-autopsie/corpus_r/txt');
const FEATURES_DIR = path.resolve(ROOT, 'omega-autopsie/corpus_r/features');
const MASTER_PATH = path.resolve(ROOT, 'omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json');

const WINDOW_SIZE = 500; // mots
const POSITIONS = [0.10, 0.25, 0.50, 0.75, 0.90];

fs.mkdirSync(FEATURES_DIR, { recursive: true });

// Load tier classification
const tiers: Array<{
  filename: string;
  tier_suggestion: string;
  tier_reason: string;
  language: string;
  words: number;
  author_guess: string;
}> = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8'));

// Filter: only classified works (not "?")
const classified = tiers.filter(e => e.tier_suggestion !== '?');

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  OMEGA R-3 — MESURE MASSIVE (${classified.length} œuvres classées)`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

function extractPassages(words: string[], positions: number[], windowSize: number): string[] {
  const total = words.length;
  const passages: string[] = [];

  for (const pos of positions) {
    const center = Math.floor(total * pos);
    const start = Math.max(0, center - Math.floor(windowSize / 2));
    const end = Math.min(total, start + windowSize);
    const passage = words.slice(start, end).join(' ');
    passages.push(passage);
  }

  return passages;
}

function averageFeatures(featureSets: Record<string, number>[]): Record<string, number> {
  if (featureSets.length === 0) return {};

  const keys = Object.keys(featureSets[0]);
  const avg: Record<string, number> = {};

  for (const key of keys) {
    const values = featureSets.map(f => f[key] ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);
    avg[key] = Math.round((sum / values.length) * 10000) / 10000;
  }

  return avg;
}

const masterResults: Array<Record<string, unknown>> = [];
let okCount = 0;
let skipCount = 0;
let failCount = 0;
const startTime = Date.now();

for (let i = 0; i < classified.length; i++) {
  const entry = classified[i];
  const txtPath = path.join(TXT_DIR, entry.filename);
  const progress = `[${i + 1}/${classified.length}]`;

  if (!fs.existsSync(txtPath)) {
    console.log(`${progress} [SKIP] ${entry.filename} — fichier manquant`);
    skipCount++;
    continue;
  }

  try {
    const text = fs.readFileSync(txtPath, 'utf-8');
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    let passages: string[];
    let passagePositions: number[];

    if (wordCount < 1000) {
      // Texte entier comme 1 passage
      passages = [text];
      passagePositions = [0.5];
    } else if (wordCount < 2500) {
      // 3 passages
      passagePositions = [0.25, 0.50, 0.75];
      passages = extractPassages(words, passagePositions, WINDOW_SIZE);
    } else {
      // 5 passages standard
      passagePositions = POSITIONS;
      passages = extractPassages(words, passagePositions, WINDOW_SIZE);
    }

    // Compute features for each passage
    const passageFeatures: Array<{ position: number; features: Record<string, number> }> = [];
    for (let p = 0; p < passages.length; p++) {
      const features = computeTextFeatures(passages[p]);
      passageFeatures.push({
        position: passagePositions[p],
        features,
      });
    }

    // Average features
    const avgFeatures = averageFeatures(passageFeatures.map(pf => pf.features));

    // Build result
    const result = {
      filename: entry.filename,
      tier: entry.tier_suggestion,
      tier_reason: entry.tier_reason,
      language: entry.language,
      author_guess: entry.author_guess,
      word_count: wordCount,
      passages_count: passages.length,
      passage_positions: passagePositions,
      passage_window: WINDOW_SIZE,
      features_avg: avgFeatures,
      features_per_passage: passageFeatures,
      measured_at: new Date().toISOString(),
    };

    // Save individual file
    const outName = entry.filename.replace('.txt', '.json');
    const outPath = path.join(FEATURES_DIR, outName);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');

    // Add to master
    masterResults.push({
      filename: entry.filename,
      tier: entry.tier_suggestion,
      language: entry.language,
      word_count: wordCount,
      passages_count: passages.length,
      features: avgFeatures,
    });

    okCount++;

    // Log every 10 or at milestones
    if (i % 25 === 0 || i === classified.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`${progress} [OK] ${entry.filename.substring(0, 55)} — ${wordCount.toLocaleString()} mots, ${passages.length} passages (${elapsed}s)`);
    }
  } catch (err) {
    console.log(`${progress} [FAIL] ${entry.filename} — ${(err as Error).message}`);
    failCount++;
  }
}

// Save master
fs.writeFileSync(MASTER_PATH, JSON.stringify(masterResults, null, 2), 'utf-8');

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  R-3 COMPLETE — ${okCount} OK / ${skipCount} SKIP / ${failCount} FAIL`);
console.log(`  Durée: ${totalTime}s`);
console.log(`  Features dir: ${FEATURES_DIR}`);
console.log(`  Master file:  ${MASTER_PATH}`);
console.log('═══════════════════════════════════════════════════════════════');

// Tier summary
const tierSummary: Record<string, number> = {};
for (const r of masterResults) {
  const t = r.tier as string;
  tierSummary[t] = (tierSummary[t] ?? 0) + 1;
}
console.log('\n  Par tier mesuré:');
for (const t of ['S', 'A', 'B', 'C', 'D']) {
  console.log(`    ${t}: ${tierSummary[t] ?? 0}`);
}
console.log('');
