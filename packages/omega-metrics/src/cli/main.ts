/**
 * OMEGA Metrics — CLI Entry Point
 * Phase R-METRICS — Run, batch, aggregate commands
 *
 * Usage:
 *   npx tsx packages/omega-metrics/src/cli/main.ts run --input <dir> --out <file> --timestamp <ts>
 *   npx tsx packages/omega-metrics/src/cli/main.ts batch --inputs <dir1> <dir2> --out <dir> --timestamp <ts>
 *   npx tsx packages/omega-metrics/src/cli/main.ts aggregate --inputs <f1> <f2> --replay <f3> --out <file> --timestamp <ts>
 */

import { readRunArtifacts } from '../reader.js';
import { generateReport } from '../report/generator.js';
import { formatReportMarkdown } from '../report/formatter.js';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { MetricsReport } from '../types.js';

const TIMESTAMP_DEFAULT = '2026-02-10T23:00:00.000Z';

function parseArgs(args: string[]): { command: string; flags: Record<string, string | string[]> } {
  const command = args[0] || 'help';
  const flags: Record<string, string | string[]> = {};

  let i = 1;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const values: string[] = [];
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        values.push(args[i]);
        i++;
      }
      flags[key] = values.length === 1 ? values[0] : values;
    } else {
      i++;
    }
  }

  return { command, flags };
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function commandRun(flags: Record<string, string | string[]>): void {
  const input = flags.input as string;
  const out = flags.out as string;
  const timestamp = (flags.timestamp as string) || TIMESTAMP_DEFAULT;

  if (!input || !out) {
    console.error('Usage: run --input <run_dir> --out <file> [--timestamp <ts>]');
    process.exit(2);
  }

  console.log(`[omega-metrics] Reading artifacts from: ${input}`);
  const artifacts = readRunArtifacts(resolve(input));

  console.log(`[omega-metrics] Computing metrics for run: ${artifacts.run_id}`);
  const report = generateReport(artifacts, resolve(input), timestamp);

  ensureDir(resolve(out));
  writeFileSync(resolve(out), JSON.stringify(report, null, 2));
  console.log(`[omega-metrics] Report written to: ${out}`);

  // Also write markdown
  const mdPath = resolve(out).replace('.json', '.md');
  writeFileSync(mdPath, formatReportMarkdown(report));
  console.log(`[omega-metrics] Markdown written to: ${mdPath}`);

  console.log(`[omega-metrics] Status: ${report.score.status} | Global: ${report.score.global}`);

  if (report.score.status === 'FAIL') {
    process.exit(1);
  }
}

function commandBatch(flags: Record<string, string | string[]>): void {
  const inputs = Array.isArray(flags.inputs) ? flags.inputs : [flags.inputs as string];
  const outDir = flags.out as string;
  const timestamp = (flags.timestamp as string) || TIMESTAMP_DEFAULT;

  if (!inputs || inputs.length === 0 || !outDir) {
    console.error('Usage: batch --inputs <dir1> <dir2> ... --out <dir> [--timestamp <ts>]');
    process.exit(2);
  }

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  for (const input of inputs) {
    const artifacts = readRunArtifacts(resolve(input));
    const report = generateReport(artifacts, resolve(input), timestamp);

    const runName = input.split('/').pop() || input.split('\\').pop() || 'unknown';
    const outPath = resolve(outDir, `${runName}.metrics.json`);
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`[omega-metrics] ${runName}: ${report.score.status} (${report.score.global})`);
  }
}

function commandAggregate(flags: Record<string, string | string[]>): void {
  const inputs = Array.isArray(flags.inputs) ? flags.inputs : [flags.inputs as string];
  const replayPath = flags.replay as string | undefined;
  const out = flags.out as string;
  const timestamp = (flags.timestamp as string) || TIMESTAMP_DEFAULT;

  if (!inputs || inputs.length === 0 || !out) {
    console.error('Usage: aggregate --inputs <f1> <f2> ... [--replay <f3>] --out <file> [--timestamp <ts>]');
    process.exit(2);
  }

  const reports: MetricsReport[] = inputs.map(f => {
    const content = readFileSync(resolve(f), 'utf8');
    return JSON.parse(content) as MetricsReport;
  });

  const replayReport = replayPath
    ? JSON.parse(readFileSync(resolve(replayPath), 'utf8')) as MetricsReport
    : null;

  // Compute aggregate
  const aggregate = {
    aggregate_version: '1.0.0',
    timestamp,
    run_count: reports.length,
    runs: reports.map(r => ({
      run_id: r.run_id,
      source_dir: r.source_dir,
      status: r.score.status,
      global: r.score.global,
      structural: r.score.structural,
      semantic: r.score.semantic,
      dynamic: r.score.dynamic,
    })),
    replay: replayReport ? {
      run_id: replayReport.run_id,
      status: replayReport.score.status,
      global: replayReport.score.global,
    } : null,
    average_global: reports.reduce((s, r) => s + r.score.global, 0) / reports.length,
    all_pass: reports.every(r => r.score.status !== 'FAIL'),
    any_hard_fail: reports.some(r => r.score.hard_fails.length > 0),
  };

  ensureDir(resolve(out));
  writeFileSync(resolve(out), JSON.stringify(aggregate, null, 2));
  console.log(`[omega-metrics] Aggregate: avg=${aggregate.average_global.toFixed(4)}, all_pass=${aggregate.all_pass}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const { command, flags } = parseArgs(args);

switch (command) {
  case 'run':
    commandRun(flags);
    break;
  case 'batch':
    commandBatch(flags);
    break;
  case 'aggregate':
    commandAggregate(flags);
    break;
  default:
    console.log('OMEGA Metrics CLI');
    console.log('Commands: run, batch, aggregate');
    console.log('');
    console.log('  run --input <dir> --out <file> [--timestamp <ts>]');
    console.log('  batch --inputs <dir1> <dir2> ... --out <dir> [--timestamp <ts>]');
    console.log('  aggregate --inputs <f1> <f2> ... [--replay <f3>] --out <file> [--timestamp <ts>]');
    process.exit(0);
}
