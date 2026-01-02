// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — AGGREGATE DNA v1.0.0 — PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

// Types
export type {
  EmotionType,
  TextStats,
  EmotionField,
  DNACore,
  AggregateAdapter,
  AggregatedDNAArgs,
  AggregationMetadata,
  AggregateInput,
  AggregateResult,
} from "./types.js";

export { EMOTION_TYPES, EMOTION_COUNT } from "./types.js";

// Aggregator
export { aggregateDNA, verifyAggregationDeterminism, AGGREGATOR_VERSION } from "./aggregate.js";

// Merkle
export {
  sha256Hex,
  stableStringify,
  hashObject,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
} from "./merkle.js";
export type { MerkleProof, MerkleProofStep } from "./merkle.js";

// Invariants
export {
  AggregateInvariantError,
  assertDeterminism,
  assertMerkleValid,
  assertOrderSensitive,
  assertSeedAligned,
  assertStatsSummed,
  assertEmptyValid,
  assertAggregationInvariants,
} from "./invariants.js";

// Mycelium Adapter
export {
  MyceliumDNAAdapter,
  createMockMyceliumDNA,
} from "./mycelium_adapter.js";
export type { MyceliumDNA, MyceliumFingerprint, MyceliumNode, EmotionState } from "./mycelium_adapter.js";

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const VERSION = "1.0.0";
export const MODULE_NAME = "omega-aggregate-dna";
export const STANDARD = "NASA-Grade L4 / AS9100D / DO-178C Level A";

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  VERSION,
  MODULE_NAME,
  STANDARD,
};
