/**
 * OMEGA — Classifier Crash Test
 * Usage: npx tsx scripts/classify-test.ts <path-to-txt> [window_start] [window_size]
 * 
 * Tests the passage-classifier on a text file.
 * Optional: extract a window starting at word position [window_start] of size [window_size].
 */
import * as fs from 'node:fs';
import { classifyPassage } from '../src/scoring/passage-classifier.js';

const filePath = process.argv[2];
const windowStart = parseInt(process.argv[3] || '0');
const windowSize = parseInt(process.argv[4] || '0');

if (!filePath) {
  console.error('Usage: npx tsx scripts/classify-test.ts <path> [start] [size]');
  process.exit(1);
}

let text = fs.readFileSync(filePath, 'utf-8');
const totalWords = text.split(/\s+/).length;

if (windowSize > 0) {
  const words = text.split(/\s+/);
  text = words.slice(windowStart, windowStart + windowSize).join(' ');
}

const words = text.split(/\s+/).length;
const result = classifyPassage(text);

console.log(`File: ${filePath.split(/[/\\]/).pop()}`);
console.log(`Total words: ${totalWords}  |  Window: ${words} words (start=${windowStart})`);
console.log('');
console.log(`  narration:     ${(result.narration * 100).toFixed(1)}%`);
console.log(`  description:   ${(result.description * 100).toFixed(1)}%`);
console.log(`  dialogue:      ${(result.dialogue * 100).toFixed(1)}%`);
console.log(`  introspection: ${(result.introspection * 100).toFixed(1)}%`);
console.log(`  action:        ${(result.action * 100).toFixed(1)}%`);
console.log(`  ─────────────────────────`);
console.log(`  DOMINANT:      ${result.dominant_type.toUpperCase()}`);
