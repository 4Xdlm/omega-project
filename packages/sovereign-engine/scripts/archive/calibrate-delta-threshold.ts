/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — DELTA_THRESHOLD Calibration Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Computes DELTA_THRESHOLD from golden e2e runs.
 * Algorithm: percentile_75 of global_distance values across N goldens.
 *
 * Usage: npx tsx scripts/calibrate-delta-threshold.ts
 * Output: calibration/delta-threshold.json (sealed artifact)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadGoldenRun } from '../src/runtime/golden-loader.js';
import { assembleForgePacket } from '../src/input/forge-packet-assembler.js';
import { generateDeltaReport } from '../src/delta/delta-report.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScribeOutput {
  final_prose: {
    paragraphs: readonly { text: string }[];
  };
}

const GOLDEN_RUNS = [
  {
    path: path.resolve(__dirname, '../../../golden/e2e/run_001/runs/13535cccff86620f'),
    id: 'run_001',
  },
  {
    path: path.resolve(__dirname, '../../../golden/e2e/run_002/runs/be9cd5f45a2af9ce'),
    id: 'run_002',
  },
  {
    path: path.resolve(__dirname, '../../../golden/e2e/run_003/runs/da351db79cc308b6'),
    id: 'run_003',
  },
];

function extractProse(runPath: string): string {
  const scribePath = path.join(runPath, '20-scribe', 'scribe-output.json');
  const scribe: ScribeOutput = JSON.parse(fs.readFileSync(scribePath, 'utf8'));
  return scribe.final_prose.paragraphs.map(p => p.text).join('\n\n');
}

function percentile75(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const idx = 0.75 * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function main(): void {
  console.log('[calibrate] Computing DELTA_THRESHOLD from', GOLDEN_RUNS.length, 'golden runs...');

  const distances: number[] = [];

  for (const run of GOLDEN_RUNS) {
    console.log(`[calibrate] Processing ${run.id}...`);

    const input = loadGoldenRun(run.path, 0, `CAL-${run.id}`);
    const packet = assembleForgePacket(input);
    const prose = extractProse(run.path);

    const report = generateDeltaReport(packet, prose);
    console.log(`  global_distance = ${report.global_distance}`);
    distances.push(report.global_distance);
  }

  const value = Math.round(percentile75(distances) * 10000) / 10000;
  const hashable = { value, computed_from: distances.length, distances, percentile: 75 };
  const hash = sha256(canonicalize(hashable));

  const artifact = {
    value,
    computed_from: distances.length,
    distances,
    percentile: 75,
    sha256: hash,
    date: new Date().toISOString().split('T')[0],
  };

  const outDir = path.resolve(__dirname, '../calibration');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'delta-threshold.json');
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
  console.log(`[calibrate] Written: ${outPath}`);
  console.log(`[calibrate] DELTA_THRESHOLD = ${value} (P75 of [${distances.join(', ')}])`);
  console.log(`[calibrate] SHA256 = ${hash}`);
}

main();
