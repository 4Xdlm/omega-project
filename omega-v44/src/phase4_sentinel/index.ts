/**
 * OMEGA V4.4 — Phase 4: Sentinel
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Binary judge for all system operations.
 */

// Types
export type {
  SentinelRequest,
  ReadonlyState,
  ValidationLevel,
  Level1StructuralResult,
  Level2ContractualResult,
  Level3ContextualResult,
  Level4SemanticResult,
  Verdict,
  AllowProof,
  DenialReason,
  SentinelDecision,
} from './types.js';

// Sentinel class
export { Sentinel } from './Sentinel.js';
