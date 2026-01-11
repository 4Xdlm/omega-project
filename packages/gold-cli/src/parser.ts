/**
 * @fileoverview OMEGA Gold CLI - Argument Parser
 * @module @omega/gold-cli/parser
 *
 * CLI argument parsing utilities.
 */

import type { ParsedArgs, CliOptions } from './types.js';
import { DEFAULT_CLI_OPTIONS } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse CLI arguments.
 */
export function parseArgs(args: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const options: Partial<CliOptions> = {};

  let command: ParsedArgs['command'] = 'help';
  let i = 0;

  // Skip node and script path if present
  while (i < args.length && (args[i].includes('node') || args[i].endsWith('.js'))) {
    i++;
  }

  // Parse command
  if (i < args.length && !args[i].startsWith('-')) {
    const cmd = args[i];
    if (isValidCommand(cmd)) {
      command = cmd;
    }
    i++;
  }

  // Parse options and positional args
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--format' || arg === '-f') {
      i++;
      const format = args[i];
      if (format === 'json' || format === 'markdown' || format === 'text') {
        options.format = format;
      }
    } else if (arg === '--output' || arg === '-o') {
      i++;
      options.output = args[i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--no-proof-pack') {
      options.proofPack = false;
    } else if (arg === '--proof-pack' || arg === '-p') {
      options.proofPack = true;
    } else if (arg === '--cwd' || arg === '-C') {
      i++;
      options.cwd = args[i];
    } else if (arg === '--version' || arg === '-V') {
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        i++;
        options.version = args[i];
      } else if (command !== 'version') {
        command = 'version';
      }
    } else if (arg === '--help' || arg === '-h') {
      command = 'help';
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }

    i++;
  }

  return {
    command,
    options: { ...DEFAULT_CLI_OPTIONS, ...options },
    positional: Object.freeze(positional),
  };
}

/**
 * Check if command is valid.
 */
function isValidCommand(cmd: string): cmd is ParsedArgs['command'] {
  return ['certify', 'validate', 'report', 'help', 'version'].includes(cmd);
}

/**
 * Generate help text.
 */
export function generateHelp(): string {
  return `
OMEGA Gold CLI - Certification Runner

USAGE:
  omega-gold <command> [options]

COMMANDS:
  certify     Run full gold certification process
  validate    Validate packages and integrations
  report      Generate certification report
  help        Show this help message
  version     Show version information

OPTIONS:
  -f, --format <format>   Output format: json, markdown, text (default: text)
  -o, --output <file>     Write output to file
  -v, --verbose           Verbose output
  -p, --proof-pack        Generate proof pack (default: true)
      --no-proof-pack     Skip proof pack generation
  -C, --cwd <dir>         Working directory
  -V, --version <ver>     Version to certify
  -h, --help              Show this help message

EXAMPLES:
  omega-gold certify
  omega-gold certify --format json -o report.json
  omega-gold validate --verbose
  omega-gold report --format markdown

STANDARD: NASA-Grade L4 / DO-178C Level A
`.trim();
}

/**
 * Generate version info.
 */
export function generateVersion(): string {
  return `OMEGA Gold CLI v0.1.0`;
}
