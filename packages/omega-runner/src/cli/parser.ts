/**
 * OMEGA Runner — CLI Argument Parser
 * Phase D.1 — Deterministic argument parsing (no external deps)
 */

import type { ParsedArgs, CliCommand } from '../types.js';

/** Parse CLI arguments into structured form */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  // Skip node and script path
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { command: 'help' };
  }

  if (args[0] === '--version' || args[0] === '-v') {
    return { command: 'version' };
  }

  const command = resolveCommand(args);
  if (!command) {
    return { command: 'help' };
  }

  const flags = parseFlags(args.slice(command === 'verify' ? 1 : 2));

  return {
    command,
    intent: flags['--intent'],
    input: flags['--input'],
    out: flags['--out'],
    dir: flags['--dir'],
    seed: flags['--seed'],
    strict: flags['--strict'] === 'true',
    format: flags['--format'] as 'md' | 'json' | undefined,
  };
}

/** Resolve command from args */
function resolveCommand(args: readonly string[]): CliCommand | null {
  if (args[0] === 'run' && args.length >= 2) {
    const sub = args[1];
    if (sub === 'create') return 'run-create';
    if (sub === 'forge') return 'run-forge';
    if (sub === 'full') return 'run-full';
    if (sub === 'report') return 'run-report';
    return null;
  }
  if (args[0] === 'verify') return 'verify';
  return null;
}

/** Parse flag-value pairs */
function parseFlags(args: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (arg === '--strict') {
        flags[arg] = 'true';
      } else if (i + 1 < args.length) {
        flags[arg] = args[i + 1];
        i++;
      }
    }
  }
  return flags;
}

/** Validate required arguments for a command */
export function validateArgs(parsed: ParsedArgs): string | null {
  switch (parsed.command) {
    case 'run-create':
      if (!parsed.intent) return 'Missing --intent <path.json>';
      if (!parsed.out) return 'Missing --out <dir>';
      return null;
    case 'run-forge':
      if (!parsed.input) return 'Missing --input <path.json>';
      if (!parsed.out) return 'Missing --out <dir>';
      return null;
    case 'run-full':
      if (!parsed.intent) return 'Missing --intent <path.json>';
      if (!parsed.out) return 'Missing --out <dir>';
      return null;
    case 'run-report':
      if (!parsed.dir) return 'Missing --dir <runDir>';
      if (!parsed.out) return 'Missing --out <file>';
      return null;
    case 'verify':
      if (!parsed.dir) return 'Missing --dir <runDir>';
      return null;
    case 'help':
    case 'version':
      return null;
    default:
      return 'Unknown command';
  }
}

/** Get help text */
export function getHelpText(): string {
  return [
    'OMEGA Runner v0.1.0 — NASA-Grade CLI',
    '',
    'Usage:',
    '  omega run create  --intent <path.json> --out <dir> [--seed <string>]',
    '  omega run forge   --input <path.json> --out <dir> [--seed <string>]',
    '  omega run full    --intent <path.json> --out <dir> [--seed <string>]',
    '  omega run report  --dir <runDir> --out <file.{md|json}>',
    '  omega verify      --dir <runDir> [--strict]',
    '',
    'Options:',
    '  --intent  Path to IntentPack JSON file',
    '  --input   Path to CreationResult JSON file',
    '  --out     Output directory or file',
    '  --dir     Existing run directory',
    '  --seed    Deterministic seed (default: "")',
    '  --strict  Strict verification mode',
    '',
    'Exit Codes:',
    '  0  SUCCESS',
    '  1  GENERIC ERROR',
    '  2  USAGE ERROR',
    '  3  DETERMINISM VIOLATION',
    '  4  IO ERROR',
    '  5  INVARIANT BREACH',
    '  6  VERIFY FAIL',
  ].join('\n');
}
