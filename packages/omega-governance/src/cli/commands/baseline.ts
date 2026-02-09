/**
 * OMEGA Governance — CLI Command: Baseline
 * Phase F — Baseline management (register, list, check)
 */

import { readRegistry, findBaseline, listBaselines } from '../../ci/baseline/registry.js';
import { registerBaseline } from '../../ci/baseline/register.js';
import { checkBaselineIntegrity, readBaselineManifest } from '../../ci/baseline/checker.js';
import { generateBaselineCertificate, baselineCertificateToMarkdown } from '../../ci/baseline/certificate.js';
import { CI_EXIT_PASS, CI_EXIT_FAIL, CI_EXIT_USAGE, CI_EXIT_BASELINE_NOT_FOUND } from '../../ci/types.js';

export interface BaselineArgs {
  readonly action: 'register' | 'list' | 'check' | 'certify';
  readonly baselinesDir: string;
  readonly version?: string;
  readonly runDir?: string;
  readonly format?: 'json' | 'md';
}

export function executeBaseline(args: BaselineArgs): number {
  switch (args.action) {
    case 'register':
      return handleRegister(args);
    case 'list':
      return handleList(args);
    case 'check':
      return handleCheck(args);
    case 'certify':
      return handleCertify(args);
    default:
      console.error('Unknown baseline action');
      return CI_EXIT_USAGE;
  }
}

function handleRegister(args: BaselineArgs): number {
  if (!args.version || !args.runDir) {
    console.error('baseline register requires --version and --run-dir');
    return CI_EXIT_USAGE;
  }
  const thresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };
  const timestamp = new Date().toISOString();

  try {
    const entry = registerBaseline(args.baselinesDir, args.version, args.runDir, thresholds, timestamp);
    console.log(JSON.stringify(entry, null, 2));
    return CI_EXIT_PASS;
  } catch (err) {
    console.error(`Registration failed: ${(err as Error).message}`);
    return CI_EXIT_FAIL;
  }
}

function handleList(args: BaselineArgs): number {
  const registry = readRegistry(args.baselinesDir);
  const baselines = listBaselines(registry);
  console.log(JSON.stringify(baselines, null, 2));
  return CI_EXIT_PASS;
}

function handleCheck(args: BaselineArgs): number {
  if (!args.version) {
    console.error('baseline check requires --version');
    return CI_EXIT_USAGE;
  }
  const registry = readRegistry(args.baselinesDir);
  const entry = findBaseline(registry, args.version);
  if (!entry) {
    console.error(`Baseline ${args.version} not found`);
    return CI_EXIT_BASELINE_NOT_FOUND;
  }
  const result = checkBaselineIntegrity(args.baselinesDir, entry);
  console.log(JSON.stringify(result, null, 2));
  return result.valid ? CI_EXIT_PASS : CI_EXIT_FAIL;
}

function handleCertify(args: BaselineArgs): number {
  if (!args.version) {
    console.error('baseline certify requires --version');
    return CI_EXIT_USAGE;
  }
  const registry = readRegistry(args.baselinesDir);
  const entry = findBaseline(registry, args.version);
  if (!entry) {
    console.error(`Baseline ${args.version} not found`);
    return CI_EXIT_BASELINE_NOT_FOUND;
  }

  const manifest = readBaselineManifest(args.baselinesDir, args.version);
  const cert = generateBaselineCertificate(entry, manifest);

  if (args.format === 'md') {
    console.log(baselineCertificateToMarkdown(cert));
  } else {
    console.log(JSON.stringify(cert, null, 2));
  }
  return CI_EXIT_PASS;
}
