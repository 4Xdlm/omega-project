/**
 * OMEGA Release — CLI Main
 * Phase G.0 — Entry point
 */

import { parseArgs, isValidCommand, COMMANDS } from './parser.js';
import { handleVersion } from './commands/version.js';
import { handleChangelog } from './commands/changelog.js';
import { handleBuild } from './commands/build.js';
import { handleSelftest } from './commands/selftest.js';
import { handleRollback } from './commands/rollback.js';

/** CLI exit codes */
export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_USAGE = 2;

/** Show help text */
function showHelp(): string {
  return [
    'OMEGA Release CLI — Production Hardening & Release',
    '',
    'Usage: omega-release <command> [options]',
    '',
    'Commands:',
    '  version    Show, bump, validate, or set version',
    '  changelog  Show, validate, render, or init changelog',
    '  build      Build release artifacts',
    '  selftest   Run self-test checks',
    '  rollback   Generate rollback plan',
    '  help       Show this help',
    '',
    'Flags:',
    '  --format=json    JSON output (selftest)',
    '  --platform=X     Target single platform (build)',
    '  --output=DIR     Output directory (build)',
    '  --json           JSON output (rollback)',
  ].join('\n');
}

/** Execute CLI command, return { output, exitCode } */
export function executeCLI(argv: readonly string[], projectRoot: string): { output: string; exitCode: number } {
  const parsed = parseArgs(argv);

  if (!isValidCommand(parsed.command)) {
    return {
      output: `Unknown command: ${parsed.command}\nAvailable: ${COMMANDS.join(', ')}`,
      exitCode: EXIT_USAGE,
    };
  }

  try {
    let output: string;
    switch (parsed.command) {
      case 'version':
        output = handleVersion(parsed, projectRoot);
        break;
      case 'changelog':
        output = handleChangelog(parsed, projectRoot);
        break;
      case 'build':
        output = handleBuild(parsed, projectRoot);
        break;
      case 'selftest':
        output = handleSelftest(parsed, projectRoot);
        break;
      case 'rollback':
        output = handleRollback(parsed, projectRoot);
        break;
      case 'help':
        output = showHelp();
        break;
      default:
        output = showHelp();
        break;
    }

    const isError = output.startsWith('ERROR:');
    return { output, exitCode: isError ? EXIT_ERROR : EXIT_OK };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: `FATAL: ${message}`, exitCode: EXIT_ERROR };
  }
}
