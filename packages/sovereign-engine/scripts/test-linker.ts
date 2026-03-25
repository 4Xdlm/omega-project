/**
 * test-linker.ts — Test de l'Agent Ciment (Linker)
 * Assemble 2 briques SAGA_READY + génère transition + score chapitre
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Budget: 2-3 API calls pour la transition + 5 API pour scoring chapitre
 *
 * Usage: npx tsx scripts/test-linker.ts
 * Requires: ANTHROPIC_API_KEY in environment
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { link, assembleChapter, validateCement } from '../src/assembly/linker.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Paths ────────────────────────────────────────────────────────────────────

const SESSION_DIR = resolve(__dirname, '..', 'sessions', 'VATOMIC_2026-03-25T21-13-08');

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in environment.');
    process.exit(1);
  }

  const provider = createAnthropicProvider({
    apiKey,
    model: 'claude-sonnet-4-20250514',
    judgeStable: true,
    draftTemperature: 0.75,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  });

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — TEST LINKER (Agent Ciment)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Load brick texts
  const brickAPath = resolve(SESSION_DIR, 'brick_contemplation.txt');
  const brickBPath = resolve(SESSION_DIR, 'brick_souvenir.txt');

  if (!existsSync(brickAPath) || !existsSync(brickBPath)) {
    console.error('ERROR: Brick files not found in', SESSION_DIR);
    process.exit(1);
  }

  const brickA = readFileSync(brickAPath, 'utf-8').trim();
  const brickB = readFileSync(brickBPath, 'utf-8').trim();

  console.log(`  Brick A (contemplation): ${brickA.split(/\s+/).length} words`);
  console.log(`  Brick B (souvenir):      ${brickB.split(/\s+/).length} words\n`);

  // Extract endings/openings (200 words)
  const wordsA = brickA.split(/\s+/);
  const wordsB = brickB.split(/\s+/);
  const ending = wordsA.slice(-200).join(' ');
  const opening = wordsB.slice(0, 200).join(' ');

  // Generate transition
  console.log('  [1/3] Generating transition...');
  const linkResult = await link({
    brick_A_ending: ending,
    brick_B_opening: opening,
    brick_A_emotion: 'sadness',
    brick_B_emotion: 'nostalgia',
    scene_context: 'Une femme seule revit ses souvenirs dans une maison au bord de la mer.',
    language: 'fr',
  }, provider);

  console.log(`  → Cement: ${linkResult.words} words, ${linkResult.api_calls} API calls`);
  console.log(`  → Hash: ${linkResult.hash.slice(0, 16)}...`);
  console.log(`  → Preview: "${linkResult.cement.slice(0, 100)}..."\n`);

  // Validate
  const validation = validateCement(linkResult.cement, ending, opening);
  console.log(`  [2/3] Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);
  if (!validation.valid) {
    for (const err of validation.errors) {
      console.log(`    ❌ ${err}`);
    }
  }

  // Assemble chapter
  console.log('\n  [3/3] Assembling chapter...');
  const chapter = assembleChapter([brickA, brickB], [linkResult]);

  console.log(`  → Chapter: ${chapter.total_words} words (${chapter.brick_count} bricks + ${chapter.cement_count} cement)`);

  // P4 continuity check (basic)
  const aMean = wordsA.length / brickA.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const bMean = wordsB.length / brickB.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const deltaMean = Math.abs(aMean - bMean);

  console.log(`\n  P4 Continuity (basic):`);
  console.log(`    Mean A: ${aMean.toFixed(1)}w/sent, Mean B: ${bMean.toFixed(1)}w/sent`);
  console.log(`    ΔMean: ${deltaMean.toFixed(1)}w ${deltaMean < 15 ? '✓' : '✗'} (limit: 15w)`);

  // Save result
  const outPath = resolve(__dirname, '..', 'sessions', 'LINKER_TEST_RESULT.json');
  writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    brick_a: 'contemplation',
    brick_b: 'souvenir',
    cement: linkResult.cement,
    cement_words: linkResult.words,
    cement_hash: linkResult.hash,
    api_calls: linkResult.api_calls,
    validation: { valid: validation.valid, errors: validation.errors },
    chapter_words: chapter.total_words,
    delta_mean: deltaMean,
  }, null, 2), 'utf-8');

  console.log(`\n  Result saved: ${outPath}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`  VERDICT: ${validation.valid ? 'PASS' : 'FAIL'} — ${linkResult.words}w cement, ${chapter.total_words}w chapter`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log(`  API calls: ${linkResult.api_calls}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
