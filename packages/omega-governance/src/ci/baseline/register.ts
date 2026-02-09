/**
 * OMEGA Governance — Baseline Registration
 * Phase F — Register new baselines from certified runs
 *
 * INV-F-08: Once registered, a baseline is immutable.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { BaselineEntry, BaselineManifest, BaselineIntentEntry, BaselineThresholds } from './types.js';
import { readRegistry, writeRegistry, baselineExists } from './registry.js';

/** Register a new baseline from a certified run directory */
export function registerBaseline(
  baselinesDir: string,
  version: string,
  runDir: string,
  thresholds: BaselineThresholds,
  timestamp: string,
): BaselineEntry {
  const registry = readRegistry(baselinesDir);

  if (baselineExists(registry, version)) {
    throw new Error(`Baseline ${version} already exists — baselines are immutable`);
  }

  const versionDir = join(baselinesDir, version);
  mkdirSync(versionDir, { recursive: true });

  const intentEntries = collectIntents(runDir);

  for (const intent of intentEntries) {
    const destDir = join(versionDir, intent.name);
    mkdirSync(destDir, { recursive: true });
    const srcFile = join(runDir, intent.name, 'intent.json');
    if (existsSync(srcFile)) {
      copyFileSync(srcFile, join(destDir, 'intent.json'));
    }
  }

  writeFileSync(join(versionDir, 'thresholds.json'), JSON.stringify(thresholds, null, 2), 'utf-8');

  const manifest = buildBaselineManifest(version, timestamp, intentEntries, thresholds);
  const manifestStr = JSON.stringify(manifest, null, 2);
  writeFileSync(join(versionDir, 'baseline.manifest.json'), manifestStr, 'utf-8');

  const manifestHash = createHash('sha256').update(manifestStr, 'utf-8').digest('hex');
  writeFileSync(join(versionDir, 'baseline.manifest.sha256'), manifestHash, 'utf-8');

  const entry: BaselineEntry = {
    version,
    path: `baselines/${version}`,
    created_at: timestamp,
    manifest_hash: manifestHash,
    certified: true,
    intents: intentEntries.map((i) => i.name),
  };

  const updatedRegistry = {
    ...registry,
    baselines: [...registry.baselines, entry],
    updated_at: timestamp,
  };

  writeRegistry(baselinesDir, updatedRegistry);

  return entry;
}

function collectIntents(runDir: string): BaselineIntentEntry[] {
  const entries: BaselineIntentEntry[] = [];
  if (!existsSync(runDir)) return entries;

  const items = readdirSync(runDir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && item.name.startsWith('intent_')) {
      const intentPath = join(runDir, item.name, 'intent.json');
      if (existsSync(intentPath)) {
        const content = readFileSync(intentPath, 'utf-8');
        const hash = createHash('sha256').update(content, 'utf-8').digest('hex');
        entries.push({ name: item.name, intent_hash: hash });
      }
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

function buildBaselineManifest(
  version: string,
  timestamp: string,
  intents: BaselineIntentEntry[],
  thresholds: BaselineThresholds,
): BaselineManifest {
  const manifestData = { version, created_at: timestamp, intents, thresholds };
  const hash = createHash('sha256').update(JSON.stringify(manifestData), 'utf-8').digest('hex');
  return { ...manifestData, hash };
}
