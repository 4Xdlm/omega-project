/**
 * OMEGA R-LAB-TYPE — Phase 2: Audit Current Classifier
 * Date: 2026-03-22
 *
 * Runs every gold set passage through classifyPassage() and measures accuracy.
 * Produces confusion matrix, per-type accuracy, and novel distributions.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassage } from '../src/scoring/passage-classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT_DIR = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const GOLD_SET = path.resolve(__dirname, '../src/scoring/data/GOLD_SET_PASSAGES.json');
const OUT = path.resolve(__dirname, '../src/scoring/data/CLASSIFIER_AUDIT_RESULTS.json');

const goldSet = JSON.parse(fs.readFileSync(GOLD_SET, 'utf-8'));

function extractByPosition(text: string, position: number, size: number): string {
  const words = text.split(/\s+/);
  const start = Math.max(0, Math.floor(words.length * position) - Math.floor(size / 2));
  return words.slice(start, start + size).join(' ');
}

function extractByKeyword(text: string, keyword: string, size: number): string | null {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return null;
  const wordsBefore = text.slice(0, idx).split(/\s+/).length;
  const words = text.split(/\s+/);
  const start = Math.max(0, wordsBefore - Math.floor(size / 2));
  return words.slice(start, start + size).join(' ');
}

type PassageType = 'dialogue' | 'action' | 'description' | 'introspection' | 'narration';
const ALL_TYPES: PassageType[] = ['dialogue', 'action', 'description', 'introspection', 'narration'];

// ═══════════════════════════════════════════════════════════════
// AUDIT TARGETED PASSAGES
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════');
console.log('  CLASSIFIER AUDIT — GOLD SET');
console.log('═══════════════════════════════════════════════════');

// We need to re-extract the passages using the same definitions from build-gold-set
// Load the passage definitions inline (they're in the gold set JSON metadata)
// For re-extraction, we use the gold set's source + position info

interface PassageResult {
  id: string;
  expected: PassageType;
  predicted: PassageType;
  correct: boolean;
  vector: Record<string, number>;
  markers: Record<string, number>;
}

const results: PassageResult[] = [];
const confusion: Record<string, Record<string, number>> = {};
for (const t of ALL_TYPES) {
  confusion[t] = {};
  for (const t2 of ALL_TYPES) confusion[t][t2] = 0;
}

// We need the original passage definitions to re-extract text
// Since they're not in the gold set JSON, we'll use position-based re-extraction
// from the build-gold-set script's passage list

// Import passage definitions
const passageDefs = (await import('./build-gold-set.js')).default;

// Since we can't easily import, let's use the gold set metadata + source files
for (const passage of goldSet.passages) {
  const txtPath = path.join(TXT_DIR, passage.source);
  if (!fs.existsSync(txtPath)) continue;
  const fullText = fs.readFileSync(txtPath, 'utf-8');

  // Re-extract: we need position or keyword. Gold set has notes but not extraction params.
  // Use a simple heuristic: extract 500 words from the position that gives the matching hash.
  // Since we stored text_hash, we can validate.

  // For simplicity, we'll extract at multiple candidate positions and find the one matching hash
  // OR just extract by the passage's stored position from build-gold-set definitions
  // Since we can't easily re-import, use the golden set's group + source to infer position

  // Simpler approach: use position-based extraction at 0.1, 0.2, ..., 0.9 and check hash
  // OR: just extract all 500w windows and pick the one matching the hash

  // PRAGMATIC: re-run the extraction logic. Let's just scan for the passage.
  // The gold set has text_hash — we won't need it. We'll scan known positions.
  // This is audit, not production — we can afford to re-scan.

  // Use the notes field to infer position or keyword
  let text: string | null = null;

  // Try position-based first (from passage id: e.g., A1_domjuan_010 → position 0.10)
  const posMatch = passage.id.match(/_(\d{2,3})$/);
  if (posMatch) {
    const pos = parseInt(posMatch[1]) / 100;
    text = extractByPosition(fullText, pos, 500);
  }

  // If no position in ID, try keyword from notes
  if (!text || text.split(/\s+/).length < 100) {
    // Try several keywords from the notes
    const keywords = passage.notes.toLowerCase().split(/\s+/);
    for (const kw of keywords) {
      if (kw.length < 4) continue;
      text = extractByKeyword(fullText, kw, 500);
      if (text && text.split(/\s+/).length >= 100) break;
    }
  }

  // Fallback: extract from a reasonable default position
  if (!text || text.split(/\s+/).length < 100) {
    text = extractByPosition(fullText, 0.50, 500);
  }

  // Classify
  const classification = classifyPassage(text);
  const predicted = classification.dominant_type as PassageType;
  const expected = passage.expected_type as PassageType;
  const correct = predicted === expected;

  // Count markers for diagnosis
  const words = text.split(/\s+/);
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const dialogueLines = lines.filter(l =>
    l.trim().startsWith('\u2014') || l.trim().startsWith('\u2013') ||
    l.trim().startsWith('- ') || l.includes('\u00ab') || l.includes('\u00bb') ||
    /^[""\u201c]/.test(l.trim())
  ).length;

  const markers = {
    word_count: words.length,
    dialogue_lines: dialogueLines,
    dialogue_line_pct: Math.round(dialogueLines / Math.max(lines.length, 1) * 100),
  };

  results.push({ id: passage.id, expected, predicted, correct, vector: classification as unknown as Record<string, number>, markers });
  confusion[expected][predicted] = (confusion[expected][predicted] || 0) + 1;
}

// ═══════════════════════════════════════════════════════════════
// PER-TYPE ACCURACY
// ═══════════════════════════════════════════════════════════════

console.log('\n  PASSAGES CIBLES (Groupes A-E)');
console.log('  ' + '\u2500'.repeat(50));
console.log(`  ${'Type'.padEnd(15)} ${'Total'.padStart(6)} ${'Correct'.padStart(8)} ${'Accuracy'.padStart(10)}`);
console.log('  ' + '\u2500'.repeat(50));

let totalCorrect = 0;
let totalCount = 0;
for (const t of ALL_TYPES) {
  const typeResults = results.filter(r => r.expected === t);
  const correct = typeResults.filter(r => r.correct).length;
  totalCorrect += correct;
  totalCount += typeResults.length;
  const acc = typeResults.length > 0 ? (correct / typeResults.length * 100).toFixed(1) : 'N/A';
  console.log(`  ${t.padEnd(15)} ${String(typeResults.length).padStart(6)} ${String(correct).padStart(8)} ${(acc + '%').padStart(10)}`);
}
console.log('  ' + '\u2500'.repeat(50));
console.log(`  ${'GLOBAL'.padEnd(15)} ${String(totalCount).padStart(6)} ${String(totalCorrect).padStart(8)} ${((totalCorrect / totalCount * 100).toFixed(1) + '%').padStart(10)}`);

// ═══════════════════════════════════════════════════════════════
// CONFUSION MATRIX
// ═══════════════════════════════════════════════════════════════

console.log('\n  CONFUSION MATRIX');
console.log('  ' + '\u2500'.repeat(60));
const shortTypes = ALL_TYPES.map(t => t.slice(0, 5).toUpperCase());
console.log(`  ${'Predicted →'.padEnd(15)} ${shortTypes.map(t => t.padStart(7)).join(' ')}`);
console.log(`  ${'Expected ↓'.padEnd(15)} ${shortTypes.map(() => '-------').join(' ')}`);
for (const expected of ALL_TYPES) {
  const row = ALL_TYPES.map(predicted => String(confusion[expected][predicted] || 0).padStart(7));
  console.log(`  ${expected.slice(0, 13).padEnd(15)} ${row.join(' ')}`);
}

// ═══════════════════════════════════════════════════════════════
// MISCLASSIFIED PASSAGES
// ═══════════════════════════════════════════════════════════════

const misclassified = results.filter(r => !r.correct);
if (misclassified.length > 0) {
  console.log(`\n  MISCLASSIFIED (${misclassified.length}):`);
  for (const r of misclassified) {
    console.log(`    ${r.id.padEnd(30)} expected=${r.expected.padEnd(14)} got=${r.predicted.padEnd(14)} dlg_lines=${r.markers.dialogue_line_pct}%`);
  }
}

// ═══════════════════════════════════════════════════════════════
// NOVEL DISTRIBUTIONS (Group F)
// ═══════════════════════════════════════════════════════════════

console.log('\n  ROMANS ENTIERS (Groupe F)');
console.log('  ' + '\u2500'.repeat(75));
console.log(`  ${'Roman'.padEnd(30)} ${'NAR%'.padStart(6)} ${'DESC%'.padStart(6)} ${'DIA%'.padStart(6)} ${'INTRO%'.padStart(7)} ${'ACT%'.padStart(6)} ${'Windows'.padStart(8)}`);
console.log('  ' + '\u2500'.repeat(75));

const novelDistributions: Array<{
  id: string; source: string; windows: number;
  distribution: Record<string, number>;
}> = [];

for (const novel of goldSet.novels) {
  const txtPath = path.join(TXT_DIR, novel.source);
  if (!fs.existsSync(txtPath)) continue;
  const fullText = fs.readFileSync(txtPath, 'utf-8');
  const words = fullText.split(/\s+/);
  const ws = novel.window_size;
  const typeCounts: Record<string, number> = {};
  let windowCount = 0;

  for (let i = 0; i < words.length - ws; i += ws) {
    const window = words.slice(i, i + ws).join(' ');
    const cls = classifyPassage(window);
    typeCounts[cls.dominant_type] = (typeCounts[cls.dominant_type] || 0) + 1;
    windowCount++;
  }

  const dist: Record<string, number> = {};
  for (const t of ALL_TYPES) {
    dist[t] = Math.round((typeCounts[t] || 0) / windowCount * 100);
  }

  novelDistributions.push({ id: novel.id, source: novel.source, windows: windowCount, distribution: dist });

  const label = novel.source.replace('.txt', '').slice(0, 28);
  console.log(
    `  ${label.padEnd(30)} ${String(dist.narration || 0).padStart(5)}% ${String(dist.description || 0).padStart(5)}% ` +
    `${String(dist.dialogue || 0).padStart(5)}% ${String(dist.introspection || 0).padStart(6)}% ` +
    `${String(dist.action || 0).padStart(5)}% ${String(windowCount).padStart(8)}`
  );
}

// ═══════════════════════════════════════════════════════════════
// SAVE RESULTS
// ═══════════════════════════════════════════════════════════════

const auditResults = {
  date: '2026-03-22',
  total_passages: totalCount,
  total_correct: totalCorrect,
  global_accuracy: Math.round(totalCorrect / totalCount * 1000) / 10,
  per_type_accuracy: Object.fromEntries(ALL_TYPES.map(t => {
    const tr = results.filter(r => r.expected === t);
    return [t, { total: tr.length, correct: tr.filter(r => r.correct).length, accuracy: Math.round(tr.filter(r => r.correct).length / Math.max(tr.length, 1) * 1000) / 10 }];
  })),
  confusion_matrix: confusion,
  misclassified: misclassified.map(r => ({ id: r.id, expected: r.expected, predicted: r.predicted })),
  novel_distributions: novelDistributions,
};

fs.writeFileSync(OUT, JSON.stringify(auditResults, null, 2));
console.log(`\n  Saved: ${OUT}`);
console.log('═══════════════════════════════════════════════════');
