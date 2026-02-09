#!/usr/bin/env node
/**
 * OMEGA Governance — CLI Entry Point
 * Phase D.2 — omega-govern binary
 */

import { parseGovArgs, getGovHelpText } from './parser.js';
import { executeCompare } from './commands/compare.js';
import { executeDrift } from './commands/drift.js';
import { executeBench } from './commands/bench.js';
import { executeCertify } from './commands/certify.js';
import { executeHistory } from './commands/history.js';
import { executeBaseline } from './commands/baseline.js';
import { executeReplay } from './commands/replay.js';
import { executeCI } from './commands/ci.js';
import { executeBadge } from './commands/badge.js';

const GOVERNANCE_VERSION = '0.1.0';

function main(): void {
  const args = parseGovArgs(process.argv);

  let exitCode: number;

  switch (args.command) {
    case 'help':
      console.log(getGovHelpText());
      exitCode = 0;
      break;
    case 'version':
      console.log(`@omega/governance v${GOVERNANCE_VERSION}`);
      exitCode = 0;
      break;
    case 'compare':
      exitCode = executeCompare(args);
      break;
    case 'drift':
      exitCode = executeDrift(args);
      break;
    case 'bench':
      exitCode = executeBench(args);
      break;
    case 'certify':
      exitCode = executeCertify(args);
      break;
    case 'history':
      exitCode = executeHistory(args);
      break;
    case 'baseline':
      exitCode = executeBaseline({
        action: (args.action ?? 'list') as 'register' | 'list' | 'check' | 'certify',
        baselinesDir: args.baselinesDir ?? './baselines',
        version: args.baselineVersion,
        runDir: args.run,
        format: args.format,
      });
      break;
    case 'replay':
      exitCode = executeReplay({
        baselineDir: args.baseline ?? '',
        candidateDir: args.candidate ?? '',
        seed: args.seed,
        format: args.format,
      });
      break;
    case 'ci':
      exitCode = executeCI({
        baselinesDir: args.baselinesDir ?? './baselines',
        baselineVersion: args.baselineVersion ?? '',
        candidateDir: args.candidate ?? '',
        baselineDir: args.baselineDir ?? args.baseline ?? '',
        seed: args.seed,
        format: args.format,
        out: args.out,
        badgeOut: args.badgeOut,
      });
      break;
    case 'badge':
      exitCode = executeBadge({
        resultFile: args.resultFile,
        out: args.out,
      });
      break;
  }

  process.exit(exitCode);
}

main();
