#!/usr/bin/env node
/**
 * OMEGA Runner — CLI Entry Point
 * Phase D.1 — Binary entry point for `omega` command
 */

import { parseArgs, validateArgs, getHelpText } from './parser.js';
import { RUNNER_VERSION } from '../version.js';
import { EXIT_USAGE_ERROR } from '../types.js';
import { executeRunCreate } from './commands/run-create.js';
import { executeRunForge } from './commands/run-forge.js';
import { executeRunFull } from './commands/run-full.js';
import { executeRunReport } from './commands/run-report.js';
import { executeVerify } from './commands/verify.js';

const parsed = parseArgs(process.argv);

if (parsed.command === 'help') {
  process.stdout.write(getHelpText() + '\n');
  process.exit(0);
}

if (parsed.command === 'version') {
  process.stdout.write(`omega v${RUNNER_VERSION}\n`);
  process.exit(0);
}

const validationError = validateArgs(parsed);
if (validationError) {
  process.stderr.write(`Error: ${validationError}\n`);
  process.exit(EXIT_USAGE_ERROR);
}

let exitCode: number;

switch (parsed.command) {
  case 'run-create':
    exitCode = executeRunCreate(parsed);
    break;
  case 'run-forge':
    exitCode = executeRunForge(parsed);
    break;
  case 'run-full':
    exitCode = executeRunFull(parsed);
    break;
  case 'run-report':
    exitCode = executeRunReport(parsed);
    break;
  case 'verify':
    exitCode = executeVerify(parsed);
    break;
  default:
    process.stderr.write(`Unknown command: ${parsed.command}\n`);
    exitCode = EXIT_USAGE_ERROR;
}

process.exit(exitCode);
