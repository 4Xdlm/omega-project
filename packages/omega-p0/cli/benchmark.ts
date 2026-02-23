#!/usr/bin/env npx tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — GENIUS BENCHMARK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Scores all texts in corpus/human/ and corpus/ai/, then outputs:
 *   1. Per-text score table
 *   2. Per-axis averages (human vs AI)
 *   3. Separation analysis (do axes discriminate?)
 *   4. Recommended weight adjustments
 *
 * Usage:
 *   npx tsx cli/benchmark.ts
 *   npx tsx cli/benchmark.ts --json --out benchmark-report.json
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { scoreGenius, VERSION, SCORER_SCHEMA_VERSION } from '../src/index.js';
import type { GeniusAnalysis } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TextResult {
  file: string;
  category: 'human' | 'ai';
  chars: number;
  genius: number;
  density: number;
  surprise: number;
  inevitability: number;
  resonance: number;
  voice: number;
  floor: number;
  ceiling: number;
  spread: number;
}

interface AxisStats {
  humanMean: number;
  aiMean: number;
  delta: number;
  discriminates: boolean; // human > ai by at least 5 points
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function scoreFile(filePath: string, category: 'human' | 'ai'): TextResult {
  const text = readFileSync(filePath, 'utf-8');
  const r = scoreGenius(text);
  return {
    file: basename(filePath),
    category,
    chars: text.length,
    genius: r.geniusScore,
    density: r.axes.density.score,
    surprise: r.axes.surprise.score,
    inevitability: r.axes.inevitability.score,
    resonance: r.axes.resonance.score,
    voice: r.axes.voice.score,
    floor: r.floorScore,
    ceiling: r.ceilingScore,
    spread: r.spread,
  };
}

function loadCorpus(dir: string, category: 'human' | 'ai'): TextResult[] {
  const files = readdirSync(dir).filter(f => f.endsWith('.txt')).sort();
  return files.map(f => scoreFile(join(dir, f), category));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

function computeAxisStats(
  human: TextResult[],
  ai: TextResult[],
  axis: keyof Pick<TextResult, 'genius' | 'density' | 'surprise' | 'inevitability' | 'resonance' | 'voice'>,
): AxisStats {
  const hMean = mean(human.map(r => r[axis]));
  const aMean = mean(ai.map(r => r[axis]));
  const delta = Math.round((hMean - aMean) * 10) / 10;
  return {
    humanMean: hMean,
    aiMean: aMean,
    delta,
    discriminates: delta >= 5,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatMarkdown(human: TextResult[], ai: TextResult[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push('# OMEGA GENIUS — Benchmark Report');
  lines.push('');
  lines.push(`**Schema**: ${SCORER_SCHEMA_VERSION}`);
  lines.push(`**Version**: ${VERSION}`);
  lines.push(`**Date**: ${now}`);
  lines.push(`**Human texts**: ${human.length}`);
  lines.push(`**AI texts**: ${ai.length}`);
  lines.push('');

  // ─── Per-text scores ───
  lines.push('## Individual Scores');
  lines.push('');
  lines.push('### Human (literary)');
  lines.push('');
  lines.push('| File | GENIUS | Density | Surprise | Inevit. | Resonance | Voice | Floor | Spread |');
  lines.push('|------|--------|---------|----------|---------|-----------|-------|-------|--------|');
  for (const r of human) {
    lines.push(
      `| ${r.file.replace('.txt', '')} | **${r.genius}** | ${r.density} | ${r.surprise} | ${r.inevitability} | ${r.resonance} | ${r.voice} | ${r.floor} | ${r.spread} |`
    );
  }
  lines.push('');

  lines.push('### AI (generic)');
  lines.push('');
  lines.push('| File | GENIUS | Density | Surprise | Inevit. | Resonance | Voice | Floor | Spread |');
  lines.push('|------|--------|---------|----------|---------|-----------|-------|-------|--------|');
  for (const r of ai) {
    lines.push(
      `| ${r.file.replace('.txt', '')} | **${r.genius}** | ${r.density} | ${r.surprise} | ${r.inevitability} | ${r.resonance} | ${r.voice} | ${r.floor} | ${r.spread} |`
    );
  }
  lines.push('');

  // ─── Axis comparison ───
  const axes = ['genius', 'density', 'surprise', 'inevitability', 'resonance', 'voice'] as const;
  const stats: Record<string, AxisStats> = {};
  for (const axis of axes) {
    stats[axis] = computeAxisStats(human, ai, axis);
  }

  lines.push('## Axis Comparison (Human vs AI)');
  lines.push('');
  lines.push('| Axis | Human μ | AI μ | Δ (H-A) | Discriminates? |');
  lines.push('|------|---------|------|---------|----------------|');
  for (const axis of axes) {
    const s = stats[axis];
    const disc = s.discriminates ? '✅ YES' : '❌ NO';
    lines.push(`| ${axis} | ${s.humanMean} | ${s.aiMean} | ${s.delta >= 0 ? '+' : ''}${s.delta} | ${disc} |`);
  }
  lines.push('');

  // ─── Standard deviations ───
  lines.push('## Standard Deviations');
  lines.push('');
  lines.push('| Axis | Human σ | AI σ |');
  lines.push('|------|---------|------|');
  for (const axis of axes) {
    const hStd = std(human.map(r => r[axis]));
    const aStd = std(ai.map(r => r[axis]));
    lines.push(`| ${axis} | ${hStd} | ${aStd} |`);
  }
  lines.push('');

  // ─── Separation analysis ───
  const hMin = Math.min(...human.map(r => r.genius));
  const aMax = Math.max(...ai.map(r => r.genius));
  const separation = hMin - aMax;

  lines.push('## Separation Analysis');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Human GENIUS min | ${hMin} |`);
  lines.push(`| AI GENIUS max | ${aMax} |`);
  lines.push(`| Gap (min_H - max_AI) | ${separation} |`);
  lines.push(`| Clean separation? | ${separation > 0 ? '✅ YES' : '❌ NO — overlap detected'} |`);
  lines.push('');

  // ─── Discriminating axes ranking ───
  const ranked = [...axes].sort((a, b) => stats[b].delta - stats[a].delta);
  lines.push('## Axes Ranked by Discrimination Power');
  lines.push('');
  for (let i = 0; i < ranked.length; i++) {
    const axis = ranked[i];
    const s = stats[axis];
    lines.push(`${i + 1}. **${axis}**: Δ = ${s.delta >= 0 ? '+' : ''}${s.delta} ${s.discriminates ? '✅' : '⚠️'}`);
  }
  lines.push('');

  // ─── Calibration recommendations ───
  lines.push('## Calibration Recommendations');
  lines.push('');
  lines.push('Based on discrimination power, suggested weight adjustments:');
  lines.push('');

  const discriminating = ranked.filter(a => a !== 'genius' && stats[a].discriminates);
  const nonDiscriminating = ranked.filter(a => a !== 'genius' && !stats[a].discriminates);

  if (discriminating.length > 0) {
    lines.push(`**Strong discriminators** (increase weight): ${discriminating.join(', ')}`);
  }
  if (nonDiscriminating.length > 0) {
    lines.push(`**Weak discriminators** (decrease weight or investigate): ${nonDiscriminating.join(', ')}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**⚠️ DIAGNOSTIC** — Weights remain SYMBOLS until human panel validation.');
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main(): void {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  console.log('OMEGA GENIUS Benchmark — scoring corpus...');
  console.log('');

  const humanDir = join(process.cwd(), 'corpus', 'human');
  const aiDir = join(process.cwd(), 'corpus', 'ai');

  const human = loadCorpus(humanDir, 'human');
  const ai = loadCorpus(aiDir, 'ai');

  console.log(`Human texts: ${human.length}`);
  console.log(`AI texts: ${ai.length}`);
  console.log('');

  if (jsonMode) {
    const report = {
      schema: SCORER_SCHEMA_VERSION,
      version: VERSION,
      timestamp: new Date().toISOString(),
      human,
      ai,
      axes: Object.fromEntries(
        (['genius', 'density', 'surprise', 'inevitability', 'resonance', 'voice'] as const).map(axis => [
          axis,
          computeAxisStats(human, ai, axis),
        ])
      ),
    };
    const output = JSON.stringify(report, null, 2);
    if (outPath) writeFileSync(outPath, output, 'utf-8');
    console.log(output);
  } else {
    const report = formatMarkdown(human, ai);
    if (outPath) writeFileSync(outPath, report, 'utf-8');
    console.log(report);
  }
}

main();
