/**
 * OMEGA Runner CLI Parser v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Parses CLI arguments for runner commands.
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

import type { CliCommand, ParsedArgs } from './types';
import { isCliCommand, DEFAULT_PROFILE, isSafePath } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELP TEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main help text.
 */
export const MAIN_HELP = `
OMEGA Runner v1.0 - NASA-Grade L4 Execution Engine

USAGE:
  omega <command> [options]

COMMANDS:
  run       Execute a single intent file
  batch     Execute all intents in a directory
  verify    Verify a completed run
  capsule   Create hermetic capsule from a run
  help      Show this help message

OPTIONS:
  --help    Show help for a specific command

EXAMPLES:
  omega run --intent my-intent.json
  omega batch --dir intents/
  omega verify --run artefacts/runs/run_test_1/
  omega capsule --run artefacts/runs/run_test_1/ --output output.zip
`.trim();

/**
 * Run command help text.
 */
export const RUN_HELP = `
OMEGA run - Execute a single intent

USAGE:
  omega run --intent <file.json> [--profile OMEGA_STD]

OPTIONS:
  --intent    Path to intent JSON file (required)
  --profile   Delivery profile ID (default: OMEGA_STD)

EXAMPLE:
  omega run --intent my-intent.json --profile OMEGA_STD
`.trim();

/**
 * Batch command help text.
 */
export const BATCH_HELP = `
OMEGA batch - Execute all intents in a directory

USAGE:
  omega batch --dir <directory> [--profile OMEGA_STD]

OPTIONS:
  --dir       Directory containing intent JSON files (required)
  --profile   Delivery profile ID (default: OMEGA_STD)

NOTES:
  - Files are processed in alphabetical order (sorted by filename)
  - Only *.json files are processed

EXAMPLE:
  omega batch --dir intents/ --profile OMEGA_STD
`.trim();

/**
 * Verify command help text.
 */
export const VERIFY_HELP = `
OMEGA verify - Verify a completed run

USAGE:
  omega verify --run <run_directory>

OPTIONS:
  --run       Path to run directory (required)

NOTES:
  - Verify mode is read-only (no writes)
  - All hashes are recomputed and compared
  - Exit code 60 on any mismatch

EXAMPLE:
  omega verify --run artefacts/runs/run_test_1/
`.trim();

/**
 * Capsule command help text.
 */
export const CAPSULE_HELP = `
OMEGA capsule - Create hermetic capsule from a run

USAGE:
  omega capsule --run <run_directory> --output <output.zip>

OPTIONS:
  --run       Path to run directory (required)
  --output    Output ZIP file path (required)

NOTES:
  - Capsule is deterministic (same input = same bytes)
  - Fixed timestamps (epoch 0)
  - Sorted file order

EXAMPLE:
  omega capsule --run artefacts/runs/run_test_1/ --output capsule.zip
`.trim();

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CLI parsing error.
 */
export class CliParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliParseError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts value for a flag from args.
 *
 * @param args - Argument array
 * @param flag - Flag to find (e.g., '--intent')
 * @returns Value or undefined
 */
export function extractFlag(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }
  return args[index + 1];
}

/**
 * Checks if flag is present in args.
 *
 * @param args - Argument array
 * @param flag - Flag to check
 * @returns true if present
 */
export function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
}

/**
 * Validates path argument for safety.
 *
 * @param path - Path to validate
 * @param argName - Argument name for error message
 * @throws CliParseError if path is unsafe
 */
export function validatePathArg(path: string, argName: string): void {
  if (!isSafePath(path)) {
    throw new CliParseError(`Invalid ${argName}: path traversal or absolute path not allowed`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND PARSERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses 'run' command arguments.
 */
function parseRunCommand(args: readonly string[]): ParsedArgs {
  if (hasFlag(args, '--help')) {
    return { command: 'help', profile: DEFAULT_PROFILE };
  }

  const intentPath = extractFlag(args, '--intent');
  if (!intentPath) {
    throw new CliParseError('Missing required argument: --intent <file.json>');
  }

  validatePathArg(intentPath, '--intent');

  const profile = extractFlag(args, '--profile') ?? DEFAULT_PROFILE;

  return Object.freeze({
    command: 'run' as const,
    intentPath,
    profile,
  });
}

/**
 * Parses 'batch' command arguments.
 */
function parseBatchCommand(args: readonly string[]): ParsedArgs {
  if (hasFlag(args, '--help')) {
    return { command: 'help', profile: DEFAULT_PROFILE };
  }

  const dirPath = extractFlag(args, '--dir');
  if (!dirPath) {
    throw new CliParseError('Missing required argument: --dir <directory>');
  }

  validatePathArg(dirPath, '--dir');

  const profile = extractFlag(args, '--profile') ?? DEFAULT_PROFILE;

  return Object.freeze({
    command: 'batch' as const,
    dirPath,
    profile,
  });
}

/**
 * Parses 'verify' command arguments.
 */
function parseVerifyCommand(args: readonly string[]): ParsedArgs {
  if (hasFlag(args, '--help')) {
    return { command: 'help', profile: DEFAULT_PROFILE };
  }

  const runPath = extractFlag(args, '--run');
  if (!runPath) {
    throw new CliParseError('Missing required argument: --run <run_directory>');
  }

  validatePathArg(runPath, '--run');

  return Object.freeze({
    command: 'verify' as const,
    runPath,
    profile: DEFAULT_PROFILE,
  });
}

/**
 * Parses 'capsule' command arguments.
 */
function parseCapsuleCommand(args: readonly string[]): ParsedArgs {
  if (hasFlag(args, '--help')) {
    return { command: 'help', profile: DEFAULT_PROFILE };
  }

  const runPath = extractFlag(args, '--run');
  if (!runPath) {
    throw new CliParseError('Missing required argument: --run <run_directory>');
  }

  validatePathArg(runPath, '--run');

  const outputPath = extractFlag(args, '--output');
  if (!outputPath) {
    throw new CliParseError('Missing required argument: --output <output.zip>');
  }

  validatePathArg(outputPath, '--output');

  return Object.freeze({
    command: 'capsule' as const,
    runPath,
    outputPath,
    profile: DEFAULT_PROFILE,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses CLI arguments.
 *
 * @param argv - Process argv (typically process.argv.slice(2))
 * @returns Parsed arguments
 * @throws CliParseError on invalid arguments
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  // No args or --help flag
  if (argv.length === 0 || hasFlag(argv, '--help') && argv.length === 1) {
    return { command: 'help', profile: DEFAULT_PROFILE };
  }

  // First argument is the command
  const command = argv[0];

  // Handle explicit help command
  if (command === 'help' || command === '--help') {
    return { command: 'help', profile: DEFAULT_PROFILE };
  }

  // Validate command
  if (!isCliCommand(command)) {
    throw new CliParseError(`Unknown command: ${command}. Use 'omega help' for usage.`);
  }

  // Remaining args (after command)
  const restArgs = argv.slice(1);

  switch (command) {
    case 'run':
      return parseRunCommand(restArgs);

    case 'batch':
      return parseBatchCommand(restArgs);

    case 'verify':
      return parseVerifyCommand(restArgs);

    case 'capsule':
      return parseCapsuleCommand(restArgs);

    case 'help':
      return { command: 'help', profile: DEFAULT_PROFILE };

    default: {
      const _exhaustive: never = command;
      throw new CliParseError(`Unknown command: ${_exhaustive}`);
    }
  }
}

/**
 * Gets help text for a specific command.
 *
 * @param command - Command to get help for
 * @returns Help text
 */
export function getHelpText(command?: CliCommand): string {
  switch (command) {
    case 'run':
      return RUN_HELP;
    case 'batch':
      return BATCH_HELP;
    case 'verify':
      return VERIFY_HELP;
    case 'capsule':
      return CAPSULE_HELP;
    default:
      return MAIN_HELP;
  }
}

/**
 * Formats error message with help hint.
 *
 * @param error - Error message
 * @param command - Current command (if any)
 * @returns Formatted error
 */
export function formatError(error: string, command?: CliCommand): string {
  const hint = command
    ? `Run 'omega ${command} --help' for usage.`
    : `Run 'omega help' for usage.`;
  return `Error: ${error}\n${hint}`;
}
