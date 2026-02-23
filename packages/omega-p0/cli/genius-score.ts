#!/usr/bin/env npx tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — GENIUS CLI SCORER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   npx tsx cli/genius-score.ts <file.txt> [options]
 *
 * Options:
 *   --json          Output JSON report
 *   --md            Output Markdown report (default)
 *   --out <path>    Write report to file
 *   --hash          Include SHA-256 hashes
 *   --segments      Include segmentation dump
 *   --strict        Fail on NaN or empty input
 *   --quiet         Suppress console output (use with --out)
 *
 * Exit codes:
 *   0  Success
 *   1  File not found / read error
 *   2  Empty input (with --strict)
 *   3  NaN detected (with --strict)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { scoreGenius, VERSION, SCORER_SCHEMA_VERSION } from '../src/index.js';
import { segmentProse } from '../src/index.js';
import type { GeniusAnalysis } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════

interface CliArgs {
  filePath: string;
  json: boolean;
  md: boolean;
  outPath: string | null;
  hash: boolean;
  segments: boolean;
  strict: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2); // skip node + script
  let filePath = '';
  let json = false;
  let md = false;
  let outPath: string | null = null;
  let hash = false;
  let segments = false;
  let strict = false;
  let quiet = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') json = true;
    else if (arg === '--md') md = true;
    else if (arg === '--out' && i + 1 < args.length) outPath = args[++i];
    else if (arg === '--hash') hash = true;
    else if (arg === '--segments') segments = true;
    else if (arg === '--strict') strict = true;
    else if (arg === '--quiet') quiet = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`
OMEGA GENIUS Scorer v${VERSION}

Usage: npx tsx cli/genius-score.ts <file.txt> [options]

Options:
  --json       Output JSON report
  --md         Output Markdown report (default)
  --out <path> Write report to file
  --hash       Include SHA-256 hashes
  --segments   Include segmentation dump
  --strict     Fail on NaN or empty input
  --quiet      Suppress console output
`);
      process.exit(0);
    } else if (!arg.startsWith('--')) {
      filePath = arg;
    }
  }

  // Default to markdown if neither specified
  if (!json && !md) md = true;

  return { filePath, json, md, outPath, hash, segments, strict, quiet };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHA-256
// ═══════════════════════════════════════════════════════════════════════════════

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatMarkdown(
  result: GeniusAnalysis,
  filePath: string,
  text: string,
  args: CliArgs,
): string {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push('# OMEGA GENIUS — Score Report');
  lines.push('');
  lines.push(`**Schema**: ${SCORER_SCHEMA_VERSION}`);
  lines.push(`**Stack Version**: ${VERSION}`);
  lines.push(`**Date**: ${now}`);
  lines.push(`**File**: ${filePath}`);
  lines.push(`**Characters**: ${text.length}`);
  lines.push('');

  // ─── Composite ───
  lines.push('## Composite Score');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **GENIUS Score** | **${result.geniusScore}/100** |`);
  lines.push(`| Floor | ${result.floorScore} |`);
  lines.push(`| Ceiling | ${result.ceilingScore} |`);
  lines.push(`| Spread | ${result.spread} |`);
  lines.push(`| Anti-correlation penalty | ${result.antiCorrelationPenalty} |`);
  lines.push('');

  // ─── Axes ───
  lines.push('## Axis Breakdown');
  lines.push('');
  lines.push('| Axis | Score | Weight | Contribution | Confidence |');
  lines.push('|------|-------|--------|-------------|------------|');
  for (const axis of Object.values(result.axes)) {
    lines.push(
      `| ${axis.name} | ${axis.score} | ${axis.weight} | ${axis.contribution.toFixed(1)} | ${axis.confidence} |`
    );
  }
  lines.push('');

  // ─── Key Metrics ───
  lines.push('## Key Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Lexical Density | ${result.raw.density.lexicalDensity.toFixed(1)}% |`);
  lines.push(`| HD-D Diversity | ${result.raw.density.hdd.toFixed(3)} |`);
  lines.push(`| Shannon Entropy | ${result.raw.surprise.shannonEntropy.toFixed(3)} bits |`);
  lines.push(`| Hapax Ratio | ${result.raw.surprise.hapaxRatio.toFixed(3)} |`);
  lines.push(`| Mean Cohesion | ${result.raw.inevitability.meanCohesion.toFixed(3)} |`);
  lines.push(`| Convergence | ${result.raw.inevitability.convergence.toFixed(3)} |`);
  lines.push(`| nPVI (weighted) | ${result.raw.rhythm.npvi_weighted.toFixed(1)} |`);
  lines.push(`| Euphony Score | ${result.raw.euphony.euphonyScore} |`);
  lines.push(`| Calque Penalty | ${result.raw.calques.penalty.toFixed(3)} |`);
  lines.push(`| Calque Count | ${result.raw.calques.rawCount} |`);
  lines.push('');

  // ─── Segments (optional) ───
  if (args.segments) {
    const seg = segmentProse(text);
    lines.push('## Segmentation');
    lines.push('');
    lines.push(`Segments: ${seg.segments.length}`);
    lines.push('');
    for (let i = 0; i < seg.segments.length; i++) {
      const s = seg.segments[i];
      lines.push(`${i + 1}. [${s.syllableCount} syl] "${s.text}"`);
    }
    lines.push('');
  }

  // ─── Hashes (optional) ───
  if (args.hash) {
    const textHash = sha256(text);
    const reportContent = lines.join('\n');
    const reportHash = sha256(reportContent);

    lines.push('## Hashes');
    lines.push('');
    lines.push(`| Item | SHA-256 |`);
    lines.push(`|------|---------|`);
    lines.push(`| Input text | \`${textHash}\` |`);
    lines.push(`| Report | \`${reportHash}\` |`);
    lines.push('');
  }

  // ─── Non-Goal ───
  lines.push('---');
  lines.push('');
  lines.push('**⚠️ DIAGNOSTIC ONLY** — This score is NOT calibrated and NOT a certification gate.');
  lines.push(`All weights are SYMBOLS pending corpus calibration.`);
  lines.push('');

  return lines.join('\n');
}

interface JsonReport {
  schema: string;
  version: string;
  timestamp: string;
  file: string;
  characters: number;
  result: GeniusAnalysis;
  hashes?: {
    textSha256: string;
  };
}

function formatJson(
  result: GeniusAnalysis,
  filePath: string,
  text: string,
  args: CliArgs,
): string {
  const report: JsonReport = {
    schema: SCORER_SCHEMA_VERSION,
    version: VERSION,
    timestamp: new Date().toISOString(),
    file: filePath,
    characters: text.length,
    result,
  };

  if (args.hash) {
    report.hashes = {
      textSha256: sha256(text),
    };
  }

  return JSON.stringify(report, null, 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main(): void {
  const args = parseArgs(process.argv);

  if (!args.filePath) {
    console.error('Error: No input file specified.');
    console.error('Usage: npx tsx cli/genius-score.ts <file.txt> [options]');
    process.exit(1);
  }

  // Read file
  let text: string;
  try {
    text = readFileSync(resolve(args.filePath), 'utf-8');
  } catch (err) {
    console.error(`Error: Cannot read file "${args.filePath}"`);
    process.exit(1);
  }

  // Strict checks
  if (args.strict && text.trim().length === 0) {
    console.error('Error: Empty input (--strict mode)');
    process.exit(2);
  }

  // Score
  const result = scoreGenius(text);

  // NaN check
  if (args.strict && isNaN(result.geniusScore)) {
    console.error('Error: NaN detected in GENIUS score (--strict mode)');
    process.exit(3);
  }

  // Format
  let output: string;
  if (args.json) {
    output = formatJson(result, args.filePath, text, args);
  } else {
    output = formatMarkdown(result, args.filePath, text, args);
  }

  // Output
  if (args.outPath) {
    writeFileSync(resolve(args.outPath), output, 'utf-8');
    if (!args.quiet) {
      console.log(`Report written to: ${args.outPath}`);
    }
  }

  if (!args.quiet) {
    console.log(output);
  }
}

main();
