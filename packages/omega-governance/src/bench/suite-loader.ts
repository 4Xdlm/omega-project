/**
 * OMEGA Governance — Suite Loader
 * Phase D.2 — Load benchmark suite from disk
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BenchSuite, BenchIntent, BenchThresholds } from './types.js';

/** Load a benchmark suite from a directory */
export function loadSuite(suiteDir: string): BenchSuite {
  if (!existsSync(suiteDir)) {
    throw new Error(`Benchmark suite directory not found: ${suiteDir}`);
  }

  const thresholdsPath = join(suiteDir, 'thresholds.json');
  if (!existsSync(thresholdsPath)) {
    throw new Error(`Thresholds file not found: ${thresholdsPath}`);
  }

  const thresholds = JSON.parse(readFileSync(thresholdsPath, 'utf-8')) as BenchThresholds;
  const suiteName = suiteDir.split(/[\\/]/).pop() ?? 'unknown';

  const intentFiles = readdirSync(suiteDir)
    .filter((f) => f.startsWith('intent_') && f.endsWith('.json'))
    .sort();

  const intents: BenchIntent[] = intentFiles.map((f) => {
    const name = f.replace('.json', '');
    return {
      name,
      path: join(suiteDir, f),
      description: `Benchmark intent: ${name}`,
    };
  });

  if (intents.length === 0) {
    throw new Error(`No intent files found in suite: ${suiteDir}`);
  }

  return { name: suiteName, intents, thresholds };
}

/** Load intent JSON from path */
export function loadIntent(intentPath: string): unknown {
  const raw = readFileSync(intentPath, 'utf-8');
  return JSON.parse(raw);
}
