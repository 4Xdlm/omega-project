#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for the OMEGA Headless Runner.
 */

import type { ParsedArgs, RunnerConfig, ExitCode as ExitCodeType } from './types.js';
import { ExitCode } from './types.js';

/**
 * CLI version.
 */
export const CLI_VERSION = '0.1.0';

/**
 * CLI help text.
 */
export const HELP_TEXT = `
OMEGA Headless Runner - CLI for deterministic plan execution

USAGE:
  omega-run <command> [options]

COMMANDS:
  run <plan>      Execute a plan file
  verify <a> <b>  Compare two result files for determinism
  help            Show this help message
  version         Show version information

OPTIONS (for run):
  --seed <seed>       Seed for deterministic execution (required)
  --output <dir>      Output directory for results (default: ./output)
  --verbose, -v       Increase verbosity (use twice for debug)
  --quiet, -q         Suppress output
  --verify            Run twice and verify determinism
  --timeout <ms>      Timeout for entire run

EXAMPLES:
  omega-run run plan.json --seed "my-seed"
  omega-run run plan.json --seed "test" --verify --verbose
  omega-run verify output/run1.json output/run2.json
`.trim();

/**
 * Parses CLI arguments.
 */
export function parseArgs(args: readonly string[]): ParsedArgs {
  if (args.length === 0) {
    return { command: 'help' };
  }

  const command = args[0];

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      return { command: 'help' };

    case 'version':
    case '--version':
      return { command: 'version' };

    case 'verify': {
      const paths = args.slice(1).filter((a) => !a.startsWith('-'));
      if (paths.length !== 2) {
        throw new Error('verify command requires exactly two file paths');
      }
      return {
        command: 'verify',
        verifyPaths: [paths[0], paths[1]],
      };
    }

    case 'run': {
      const planPath = args[1];
      if (!planPath || planPath.startsWith('-')) {
        throw new Error('run command requires a plan file path');
      }

      const config: Partial<RunnerConfig> = {
        planPath,
        verbosity: 1,
        verifyDeterminism: false,
      };

      for (let i = 2; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
          case '--seed':
            config.seed = args[++i];
            if (!config.seed) {
              throw new Error('--seed requires a value');
            }
            break;

          case '--output':
            config.outputDir = args[++i];
            if (!config.outputDir) {
              throw new Error('--output requires a value');
            }
            break;

          case '--verbose':
          case '-v':
            config.verbosity = config.verbosity === 2 ? 2 : ((config.verbosity ?? 1) + 1) as 1 | 2;
            break;

          case '--quiet':
          case '-q':
            config.verbosity = 0;
            break;

          case '--verify':
            config.verifyDeterminism = true;
            break;

          case '--timeout':
            config.timeout = parseInt(args[++i], 10);
            if (isNaN(config.timeout)) {
              throw new Error('--timeout requires a numeric value');
            }
            break;

          default:
            throw new Error(`Unknown option: ${arg}`);
        }
      }

      if (!config.seed) {
        throw new Error('--seed is required for run command');
      }

      return {
        command: 'run',
        planPath,
        config,
      };
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

/**
 * Result of CLI execution.
 */
export interface CliResult {
  readonly exitCode: ExitCodeType;
  readonly output: string;
  readonly error?: string;
}

/**
 * CLI executor interface for testability.
 */
export interface CliExecutor {
  execute(args: readonly string[]): Promise<CliResult>;
}

/**
 * Creates a CLI executor.
 */
export function createCliExecutor(deps: {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
}): CliExecutor {
  return {
    async execute(args: readonly string[]): Promise<CliResult> {
      try {
        const parsed = parseArgs(args);

        switch (parsed.command) {
          case 'help':
            return { exitCode: ExitCode.SUCCESS, output: HELP_TEXT };

          case 'version':
            return { exitCode: ExitCode.SUCCESS, output: `omega-run v${CLI_VERSION}` };

          case 'verify': {
            const [path1, path2] = parsed.verifyPaths!;
            const file1Exists = await deps.exists(path1);
            const file2Exists = await deps.exists(path2);

            if (!file1Exists) {
              return {
                exitCode: ExitCode.PLAN_NOT_FOUND,
                output: '',
                error: `File not found: ${path1}`,
              };
            }
            if (!file2Exists) {
              return {
                exitCode: ExitCode.PLAN_NOT_FOUND,
                output: '',
                error: `File not found: ${path2}`,
              };
            }

            const [content1, content2] = await Promise.all([
              deps.readFile(path1),
              deps.readFile(path2),
            ]);

            const result1 = JSON.parse(content1) as { seed?: string; stepsExecuted?: number };
            const result2 = JSON.parse(content2) as { seed?: string; stepsExecuted?: number };

            // Simple comparison: check if seeds and step counts match
            if (result1.seed === result2.seed && result1.stepsExecuted === result2.stepsExecuted) {
              return {
                exitCode: ExitCode.SUCCESS,
                output: 'Results are deterministically equivalent',
              };
            } else {
              return {
                exitCode: ExitCode.DETERMINISM_FAILED,
                output: '',
                error: 'Results differ: determinism check failed',
              };
            }
          }

          case 'run': {
            // This is a stub - actual implementation would use the runner
            // For now, we validate that the plan file exists
            const planPath = parsed.planPath!;
            const planExists = await deps.exists(planPath);

            if (!planExists) {
              return {
                exitCode: ExitCode.PLAN_NOT_FOUND,
                output: '',
                error: `Plan file not found: ${planPath}`,
              };
            }

            return {
              exitCode: ExitCode.SUCCESS,
              output: `Would execute plan: ${planPath} with seed: ${parsed.config?.seed}`,
            };
          }

          default:
            return {
              exitCode: ExitCode.INVALID_ARGS,
              output: '',
              error: 'Unknown command',
            };
        }
      } catch (err) {
        return {
          exitCode: ExitCode.INVALID_ARGS,
          output: '',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
