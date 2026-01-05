/**
 * OMEGA CLI_RUNNER — Main Entry Point
 * Phase 16.0 — NASA-Grade
 * 
 * Unified CLI export for OMEGA emotional analysis engine.
 */

// Core exports
export * from './constants.js';
export * from './types.js';
export * from './contract.js';
export * from './parser.js';
export * from './runner.js';

// Command exports
export {
  analyzeCommand,
  compareCommand,
  exportCommand,
  batchCommand,
  healthCommand,
  versionCommand,
  infoCommand,
} from './commands/index.js';

// Default export for convenience
export { run as default } from './runner.js';
