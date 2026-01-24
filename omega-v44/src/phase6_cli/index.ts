/**
 * OMEGA V4.4 — Phase 6: CLI
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Pipeline runner with deterministic verification
 */

// Types
export type {
  CLIRunInput,
  CLIConfig,
  PipelineResult,
  PipelineRunOutput,
  PipelineMetadata,
  VerificationResult,
  VerificationDifference,
  OutputArtifacts,
  HashManifest,
} from './types.js';

// Classes
export { OmegaCLI } from './OmegaCLI.js';
