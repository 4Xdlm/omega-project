/**
 * OMEGA Governance — CLI Command: CI
 * Phase F — Run CI gates
 */

import { executeGates } from '../../ci/gates/orchestrator.js';
import { createCIConfig } from '../../ci/config.js';
import { generateJSONReport } from '../../ci/reporter/json-reporter.js';
import { generateMarkdownReport } from '../../ci/reporter/markdown-reporter.js';
import { generateBadge } from '../../ci/badge/generator.js';
import { CI_EXIT_PASS, CI_EXIT_FAIL, CI_EXIT_USAGE } from '../../ci/types.js';
import type { CIResult } from '../../ci/types.js';
import type { GateContext } from '../../ci/gates/types.js';
import { writeFileSync } from 'node:fs';

export interface CIArgs {
  readonly baselinesDir: string;
  readonly baselineVersion: string;
  readonly candidateDir: string;
  readonly baselineDir: string;
  readonly seed?: string;
  readonly format?: 'json' | 'md';
  readonly out?: string;
  readonly badgeOut?: string;
}

export function executeCI(args: CIArgs): number {
  if (!args.baselinesDir || !args.baselineVersion || !args.candidateDir || !args.baselineDir) {
    console.error('ci requires --baselines-dir, --baseline-version, --candidate, --baseline-dir');
    return CI_EXIT_USAGE;
  }

  const config = createCIConfig({ DEFAULT_SEED: args.seed });

  const ctx: GateContext = {
    baselineDir: args.baselineDir,
    candidateDir: args.candidateDir,
    baselinesDir: args.baselinesDir,
    baselineVersion: args.baselineVersion,
    seed: args.seed ?? config.DEFAULT_SEED,
  };

  const startedAt = new Date().toISOString();
  const orchestratorResult = executeGates(ctx, config);
  const completedAt = new Date().toISOString();

  const ciResult: CIResult = {
    run_id: `ci-${Date.now().toString(16)}`,
    baseline_version: args.baselineVersion,
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: orchestratorResult.duration_ms,
    verdict: orchestratorResult.verdict,
    gates: orchestratorResult.gates,
    failed_gate: orchestratorResult.failed_gate,
    config,
  };

  // Generate report
  const report = args.format === 'md'
    ? generateMarkdownReport(ciResult)
    : generateJSONReport(ciResult);

  if (args.out) {
    writeFileSync(args.out, report.content, 'utf-8');
    console.log(`Report written to ${args.out}`);
  } else {
    console.log(report.content);
  }

  // Generate badge
  if (args.badgeOut) {
    const badge = generateBadge(ciResult);
    writeFileSync(args.badgeOut, badge.svg, 'utf-8');
    console.log(`Badge written to ${args.badgeOut}`);
  }

  return ciResult.verdict === 'PASS' ? CI_EXIT_PASS : CI_EXIT_FAIL;
}
