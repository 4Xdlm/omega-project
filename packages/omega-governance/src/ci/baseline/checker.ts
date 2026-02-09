/**
 * OMEGA Governance — Baseline Checker
 * Phase F — Verify candidate against baseline
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { BaselineEntry, BaselineManifest } from './types.js';

export interface BaselineCheckResult {
  readonly version: string;
  readonly valid: boolean;
  readonly checks: readonly BaselineCheck[];
}

export interface BaselineCheck {
  readonly check: string;
  readonly status: 'PASS' | 'FAIL';
  readonly message: string;
}

/** Check baseline integrity */
export function checkBaselineIntegrity(baselinesDir: string, entry: BaselineEntry): BaselineCheckResult {
  const checks: BaselineCheck[] = [];
  const versionDir = join(baselinesDir, entry.version);

  if (!existsSync(versionDir)) {
    checks.push({ check: 'DIR_EXISTS', status: 'FAIL', message: `Directory not found: ${versionDir}` });
    return { version: entry.version, valid: false, checks };
  }
  checks.push({ check: 'DIR_EXISTS', status: 'PASS', message: 'Baseline directory exists' });

  const manifestPath = join(versionDir, 'baseline.manifest.json');
  if (!existsSync(manifestPath)) {
    checks.push({ check: 'MANIFEST_EXISTS', status: 'FAIL', message: 'baseline.manifest.json not found' });
    return { version: entry.version, valid: false, checks };
  }
  checks.push({ check: 'MANIFEST_EXISTS', status: 'PASS', message: 'Manifest exists' });

  const manifestContent = readFileSync(manifestPath, 'utf-8');
  const manifestHash = createHash('sha256').update(manifestContent, 'utf-8').digest('hex');

  if (manifestHash === entry.manifest_hash) {
    checks.push({ check: 'MANIFEST_HASH', status: 'PASS', message: 'Manifest hash matches registry' });
  } else {
    checks.push({ check: 'MANIFEST_HASH', status: 'FAIL', message: `Hash mismatch: computed=${manifestHash}, registry=${entry.manifest_hash}` });
  }

  const hashFilePath = join(versionDir, 'baseline.manifest.sha256');
  if (existsSync(hashFilePath)) {
    const storedHash = readFileSync(hashFilePath, 'utf-8').trim();
    if (storedHash === manifestHash) {
      checks.push({ check: 'HASH_FILE', status: 'PASS', message: 'Hash file matches computed hash' });
    } else {
      checks.push({ check: 'HASH_FILE', status: 'FAIL', message: 'Hash file mismatch' });
    }
  }

  for (const intentName of entry.intents) {
    const intentDir = join(versionDir, intentName);
    if (existsSync(join(intentDir, 'intent.json'))) {
      checks.push({ check: `INTENT:${intentName}`, status: 'PASS', message: `Intent ${intentName} present` });
    } else {
      checks.push({ check: `INTENT:${intentName}`, status: 'FAIL', message: `Intent ${intentName} missing` });
    }
  }

  const thresholdsPath = join(versionDir, 'thresholds.json');
  if (existsSync(thresholdsPath)) {
    checks.push({ check: 'THRESHOLDS', status: 'PASS', message: 'thresholds.json present' });
  } else {
    checks.push({ check: 'THRESHOLDS', status: 'FAIL', message: 'thresholds.json missing' });
  }

  const valid = checks.every((c) => c.status === 'PASS');
  return { version: entry.version, valid, checks };
}

/** Read baseline manifest from disk */
export function readBaselineManifest(baselinesDir: string, version: string): BaselineManifest {
  const manifestPath = join(baselinesDir, version, 'baseline.manifest.json');
  const content = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(content) as BaselineManifest;
}
