/**
 * OMEGA V4.4 — Phase 2: Core Engine
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Exports the mechanical emotional computation engine.
 */

// Types
export type {
  TextInput,
  ComputedEmotion,
  CoreComputeOutput,
  CoreConfig,
  LawVerificationResult,
  AllLawsVerificationResult,
} from './types.js';

export { DEFAULT_RUNTIME_CONFIG, DEFAULT_BOUNDS } from './types.js';

// Laws
export {
  applyL1CyclicPhase,
  applyL2BoundedIntensity,
  applyL3BoundedPersistence,
  applyL4DecayLaw,
  applyL5HystereticDamping,
  applyL6Conservation,
  calculateTotalIntensity,
  verifyL1,
  verifyL2,
  verifyL3,
  verifyL4,
  verifyL5,
  verifyL6,
  verifyAllLaws,
} from './laws.js';

export type { LawVerificationConfig } from './laws.js';

// Hash utilities
export {
  sha256,
  hashObject,
  deterministicStringify,
  computeConfigHash,
  verifyHash,
} from './hash.js';

// Core Engine
export { CoreEngine } from './CoreEngine.js';
