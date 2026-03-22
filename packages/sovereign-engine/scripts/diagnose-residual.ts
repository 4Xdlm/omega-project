/**
 * R-FIX-3 — FIX 1: Diagnose residual sentences (37% unclassified)
 * Samples 1000 high-residual sentences and categorizes causes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassageDetailed, type SentenceProfile } from '../src/scoring/passage-classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT_DIR = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const DATA_DIR = path.resolve(__dirname, '../src/scoring/data');

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5);
}
function skipGutenberg(text: string): string {
  for (const m of ['*** START OF', '***START OF']) {
    const idx = text.indexOf(m);
    if (idx !== -1) { const nl = text.indexOf('\n', idx); if (nl !== -1) return text.slice(nl + 1); }
  }
  return text;
}

interface ResidualSample {
  text: string;
  file: string;
  scores: Record<string, number>;
  wordCount: number;
  cause: string;
}

const samples: ResidualSample[] = [];
const causes: Record<string, number> = {
  TOO_SHORT: 0, NON_LITERARY: 0, FOREIGN_LANG: 0, TRANSITION: 0,
  EXPOSITION: 0, MIXED_WEAK: 0, SEUIL_TROP_STRICT: 0, UNKNOWN: 0,
};

// Non-literary markers
const NON_LITERARY_RE = /\b(?:copyright|table des matieres|table of contents|chapitre|chapter|notes|gutenberg|license|ebook|isbn|printed|edition|published|page|vol\.|tome)\b/i;
// Transition/exposition markers (should be narration)
const TRANSITION_RE = /\b(?:il y avait|c'etait|on voyait|there was|it was|one could see|there were|c'est|ce fut|voici|voila|here is|there is)\b/i;
// Foreign language detection (simple: >50% non-FR/EN words)
const FR_EN_COMMON = new Set(['le','la','les','de','des','du','un','une','et','en','il','elle','que','qui','est','a','dans','pour','pas','sur','the','a','an','and','or','but','in','on','at','to','for','of','with','is','was','it','he','she','they','not','his','her']);

function detectCause(sentence: string, scores: Record<string, number>, file: string): string {
  const words = sentence.split(/\s+/);
  const wc = words.length;

  if (wc < 5) return 'TOO_SHORT';
  if (NON_LITERARY_RE.test(sentence.toLowerCase())) return 'NON_LITERARY';
  if (TRANSITION_RE.test(sentence.toLowerCase())) return 'TRANSITION';

  // Foreign language: check if >60% of words are NOT in FR/EN common words
  const cleaned = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length > 1);
  const knownCount = cleaned.filter(w => FR_EN_COMMON.has(w)).length;
  if (cleaned.length > 5 && knownCount / cleaned.length < 0.15) return 'FOREIGN_LANG';

  // Check if any score is close to threshold
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore >= 0.10 && maxScore < 0.15) return 'SEUIL_TROP_STRICT';
  if (maxScore >= 0.05 && maxScore < 0.10) return 'MIXED_WEAK';

  // Check for exposition (factual information)
  if (/\b(?:en l'an|dans la ville|le pays|in the year|in the city|the country of|situated|located|founded)\b/i.test(sentence.toLowerCase())) return 'EXPOSITION';

  return 'UNKNOWN';
}

console.log('Diagnosing residual sentences...');

const allFiles = fs.readdirSync(TXT_DIR).filter(f => f.endsWith('.txt')).sort();
let totalSents = 0;
let residualSents = 0;

for (const file of allFiles) {
  if (samples.length >= 1000) break;
  let text = fs.readFileSync(path.join(TXT_DIR, file), 'utf-8');
  text = skipGutenberg(text);
  if (text.split(/\s+/).length < 2000) continue;

  const sents = splitSentences(text);
  const analysis = classifyPassageDetailed(text);

  for (let i = 0; i < analysis.sentences.length && samples.length < 1000; i++) {
    const tag = analysis.sentences[i];
    totalSents++;
    const maxScore = Math.max(...Object.values(tag.scores));
    if (maxScore < 0.15 || tag.residual > 0.5) {
      residualSents++;
      if (samples.length < 1000 && Math.random() < 0.05) { // Sample ~5% of residuals
        const cause = detectCause(sents[i] || '', tag.scores, file);
        causes[cause]++;
        samples.push({
          text: (sents[i] || '').slice(0, 150),
          file,
          scores: Object.fromEntries(Object.entries(tag.scores).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
          wordCount: (sents[i] || '').split(/\s+/).length,
          cause,
        });
      }
    }
  }
}

console.log(`\nSampled ${samples.length} residual sentences`);
console.log(`\nCAUSE DISTRIBUTION:`);
const sortedCauses = Object.entries(causes).sort((a, b) => b[1] - a[1]);
for (const [cause, count] of sortedCauses) {
  console.log(`  ${cause.padEnd(20)} ${count} (${(count / Math.max(samples.length, 1) * 100).toFixed(1)}%)`);
}

// Save
fs.writeFileSync(path.join(DATA_DIR, 'RESIDUAL_DIAGNOSIS.json'), JSON.stringify({
  date: '2026-03-22',
  total_sampled: samples.length,
  causes,
  samples: samples.slice(0, 50), // First 50 for inspection
}, null, 2));
console.log(`\nSaved: ${path.join(DATA_DIR, 'RESIDUAL_DIAGNOSIS.json')}`);
