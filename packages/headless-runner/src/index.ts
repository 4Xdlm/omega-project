/**
 * @fileoverview OMEGA Headless Runner - Public API exports.
 * @module @omega/headless-runner
 */

// Types
export type {
  RunnerConfig,
  HeadlessRunResult,
  OutputFiles,
  ParsedArgs,
  LogEntry,
  PlanFile,
  PlanFileStep,
  PlanFileHooks,
} from './types.js';

export { ExitCode } from './types.js';

// Loader
export {
  validatePlanFile,
  parsePlanJson,
  planFileToPlan,
  planToPlanFile,
  PlanLoadError,
} from './loader.js';

// Output
export {
  createLogger,
  formatLogEntries,
  formatResult,
  generateOutputPaths,
  writeOutputFiles,
  formatDuration,
  InMemoryOutputWriter,
  createCollectingConsole,
  type Logger,
  type OutputWriter,
  type ConsoleOutput,
} from './output.js';

// Runner
export {
  runHeadless,
  createDefaultAdapters,
  type RunnerOptions,
} from './runner.js';

// CLI
export {
  parseArgs,
  createCliExecutor,
  CLI_VERSION,
  HELP_TEXT,
  type CliExecutor,
  type CliResult,
} from './cli.js';
