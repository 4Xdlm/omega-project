/**
 * OMEGA R-COMP — Module C: Stress Test on 7 Killer Authors
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassageDetailed } from '../src/scoring/passage-classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT_DIR = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');

function skipGutenberg(text: string): string {
  const markers = ['*** START OF', '***START OF', 'START OF THE PROJECT'];
  for (const m of markers) {
    const idx = text.indexOf(m);
    if (idx !== -1) { const nl = text.indexOf('\n', idx); if (nl !== -1) return text.slice(nl + 1); }
  }
  // Skip first 500 words as safety for non-Gutenberg PDFs
  const words = text.split(/\s+/);
  if (words.length > 2000 && !/^[A-Z]{2,}/.test(words[0])) return text;
  return words.slice(Math.min(500, Math.floor(words.length * 0.02))).join(' ');
}

const STRESS = [
  { name: 'Kafka — Le Proces', file: 'kafka_proces_69327.txt',
    targets: [{ type: 'introspection', op: '>', val: 5 }] }, // German text — FR/EN markers limited
  { name: 'Hugo — Les Miserables', file: 'hugo_miserables_17489.txt',
    targets: [{ type: 'dialogue', op: '>', val: 12 }] },
  { name: 'Dumas — Monte-Cristo', file: 'dumas_monte_cristo_17989.txt',
    targets: [{ type: 'dialogue', op: '>', val: 20 }] },
  { name: 'Dostoievski — Crime', file: 'dostoievski_crime_36034.txt',
    targets: [{ type: 'introspection', op: '>', val: 12 }] },
  { name: 'Woolf — Mrs Dalloway', file: 'pdf_mrs_dalloway_virginia_woolf.txt',
    targets: [{ type: 'introspection', op: '>', val: 18 }] }, // EN text, introspection competes with narration
  { name: 'Proust — Swann', file: 'proust_swann_2650.txt',
    targets: [{ type: 'introspection', op: '>', val: 10 }, { type: 'description', op: '>', val: 10 }] },
  { name: 'McCarthy — Blood Meridian', file: 'pdf_blood_meridian_cormac_mccarthy.txt',
    targets: [{ type: 'action', op: '>', val: 15 }] },
];

type SentenceType = 'dialogue' | 'action' | 'description' | 'introspection' | 'narration';

console.log('=' .repeat(70));
console.log('  STRESS TEST — 7 KILLER AUTHORS');
console.log('=' .repeat(70));

let totalPass = 0; let totalFail = 0;

for (const author of STRESS) {
  const filePath = path.join(TXT_DIR, author.file);
  if (!fs.existsSync(filePath)) { console.log(`  SKIP: ${author.name} (not found)`); continue; }

  let text = fs.readFileSync(filePath, 'utf-8');
  text = skipGutenberg(text);

  const analysis = classifyPassageDetailed(text);
  const cls = analysis.classification;

  // Distribution
  const dist: Record<string, number> = {};
  for (const type of ['dialogue', 'action', 'description', 'introspection', 'narration'] as const) {
    dist[type] = Math.round(cls[type] * 100);
  }

  console.log(`\n  ${author.name}`);
  console.log(`    Sentences: ${analysis.sentence_count}  Residual: ${(analysis.residual_pct * 100).toFixed(1)}%`);
  console.log(`    DIA=${dist.dialogue}%  ACT=${dist.action}%  DESC=${dist.description}%  INTRO=${dist.introspection}%  NAR=${dist.narration}%`);

  for (const target of author.targets) {
    const actual = dist[target.type] || 0;
    const passed = target.op === '>' ? actual > target.val : actual < target.val;
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`    [${status}] ${target.type} ${actual}% ${target.op} ${target.val}%`);
    if (passed) totalPass++; else totalFail++;
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`  RESULT: ${totalPass} PASS, ${totalFail} FAIL`);
console.log(`${'='.repeat(70)}`);

if (totalFail > 0) process.exit(1);
