#!/usr/bin/env node
/**
 * OMEGA — E2E Verdict Contract (EVC) Generator
 * Produces metrics/e2e/E2E_VERDICT.json from ProsePack + SHA256 replay proof
 * 
 * Usage: npx tsx scripts/evc-generate.ts
 * 
 * Exit codes:
 *   0 = verdict generated
 *   1 = missing files (fail-closed)
 *   2 = usage error
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

const PROJECT = resolve(import.meta.dirname, '..');
const METRICS_E2E = join(PROJECT, 'metrics', 'e2e');

interface ProsePackScore {
  schema_ok: boolean;
  constraint_satisfaction: number;
  hard_pass: boolean;
  soft_pass: boolean;
  total_violations: number;
  hard_violations: number;
  soft_violations: number;
}

interface RunVerdict {
  run_id: string;
  hard_pass: boolean;
  soft_pass: boolean;
  constraint_satisfaction: number;
  total_violations: number;
  hard_violations: number;
  soft_violations: number;
  sha256_original: string;
  sha256_replay: string;
  sha256_match: boolean;
}

interface EVCDocument {
  schema_version: string;
  created_at: string;
  head: string;
  runs: RunVerdict[];
  global: {
    pass_hard: boolean;
    pass_soft: boolean;
    pass_replay: boolean;
    pass_strict: boolean;
  };
  allowed_tags: string[];
}

function sha256File(path: string): string {
  const content = readFileSync(path);
  return createHash('sha256').update(content).digest('hex').toUpperCase();
}

function getGitHead(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: PROJECT, encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

// Discover runs: directories matching e2e_NNN (not _replay)
const RUN_PATTERN = /^e2e_(\d{3})$/;
const runDirs: string[] = [];

if (!existsSync(METRICS_E2E)) {
  console.error(`[EVC] FATAL: ${METRICS_E2E} does not exist`);
  process.exit(1);
}

const entries = readdirSync(METRICS_E2E, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory() && RUN_PATTERN.test(entry.name)) {
    runDirs.push(entry.name);
  }
}
runDirs.sort();

if (runDirs.length === 0) {
  console.error('[EVC] FATAL: no e2e run directories found');
  process.exit(1);
}

console.log(`[EVC] Found ${runDirs.length} runs: ${runDirs.join(', ')}`);

const runs: RunVerdict[] = [];
let allFilesPresent = true;

for (const dir of runDirs) {
  const ppPath = join(METRICS_E2E, dir, 'ProsePack.json');
  const origPath = join(METRICS_E2E, dir, 'scribe-prose.json');
  const replayPath = join(METRICS_E2E, `${dir}_replay`, 'scribe-prose.json');

  // Check all files exist
  for (const [label, path] of [['ProsePack', ppPath], ['original', origPath], ['replay', replayPath]]) {
    if (!existsSync(path)) {
      console.error(`[EVC] MISSING: ${label} at ${path}`);
      allFilesPresent = false;
    }
  }

  if (!allFilesPresent) continue;

  const pp = JSON.parse(readFileSync(ppPath, 'utf8'));
  const score: ProsePackScore = pp.score;

  const hashOrig = sha256File(origPath);
  const hashReplay = sha256File(replayPath);

  const verdict: RunVerdict = {
    run_id: dir,
    hard_pass: score.hard_pass,
    soft_pass: score.soft_pass,
    constraint_satisfaction: score.constraint_satisfaction,
    total_violations: score.total_violations,
    hard_violations: score.hard_violations,
    soft_violations: score.soft_violations,
    sha256_original: hashOrig,
    sha256_replay: hashReplay,
    sha256_match: hashOrig === hashReplay,
  };

  console.log(`[EVC] ${dir}: hard=${verdict.hard_pass} soft=${verdict.soft_pass} replay=${verdict.sha256_match}`);
  runs.push(verdict);
}

if (!allFilesPresent) {
  console.error('[EVC] FATAL: missing files — cannot produce verdict');
  process.exit(1);
}

const globalHard = runs.every(r => r.hard_pass);
const globalSoft = runs.every(r => r.soft_pass);
const globalReplay = runs.every(r => r.sha256_match);
const globalStrict = globalHard && globalSoft && globalReplay;

// Derive allowed tags
const allowedTags: string[] = [];
if (globalHard && globalReplay) allowedTags.push('validation-e2e-hard-pass');
if (globalReplay) allowedTags.push('validation-e2e-replay-pass');
if (globalStrict) allowedTags.push('validation-e2e-strict-pass');

const evc: EVCDocument = {
  schema_version: 'EVC-1.0',
  created_at: new Date().toISOString(),
  head: getGitHead(),
  runs,
  global: {
    pass_hard: globalHard,
    pass_soft: globalSoft,
    pass_replay: globalReplay,
    pass_strict: globalStrict,
  },
  allowed_tags: allowedTags,
};

const outPath = join(METRICS_E2E, 'E2E_VERDICT.json');
writeFileSync(outPath, JSON.stringify(evc, null, 2) + '\n', 'utf8');

console.log('');
console.log(`[EVC] VERDICT:`);
console.log(`  hard:   ${globalHard ? 'PASS' : 'FAIL'}`);
console.log(`  soft:   ${globalSoft ? 'PASS' : 'FAIL'}`);
console.log(`  replay: ${globalReplay ? 'PASS' : 'FAIL'}`);
console.log(`  strict: ${globalStrict ? 'PASS' : 'FAIL'}`);
console.log(`  allowed tags: ${allowedTags.length > 0 ? allowedTags.join(', ') : 'NONE'}`);
console.log(`[EVC] Written: ${outPath}`);
process.exit(0);
