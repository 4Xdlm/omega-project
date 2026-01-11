/**
 * @fileoverview OMEGA Gold CLI - Public API
 * @module @omega/gold-cli
 *
 * Command-line certification runner.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  CliOptions,
  ParsedArgs,
  PackageInfo,
  PackageTestResult,
  GoldRunResult,
  OutputWriter,
} from './types.js';

export { DEFAULT_CLI_OPTIONS } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  parseArgs,
  generateHelp,
  generateVersion,
} from './parser.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  discoverPackages,
  runPackageTests,
  runAllTests,
  runIntegrations,
  createPackageCertifications,
  runGoldCertification,
  generateCertificationReport,
  generateProofPack,
} from './runner.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ConsoleWriter,
  StringWriter,
  SilentWriter,
  createConsoleWriter,
  createStringWriter,
  createSilentWriter,
} from './output.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

export { executeCli } from './cli.js';
