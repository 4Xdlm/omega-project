/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — PUBLIC API
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * Surface publique stable. Ne pas modifier sans NCR.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════════

export { analyze, validateGenome } from "./api/analyze.js";
export { computeFingerprint, isValidFingerprint } from "./api/fingerprint.js";
export { 
  compare, 
  compareDetailed, 
  cosineSimilarity,
  getVerdict,
  flattenEmotionAxis,
  flattenStyleAxis,
  flattenStructureAxis,
  flattenTempoAxis,
} from "./api/similarity.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES (re-export)
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  Emotion14,
  EmotionAxis,
  EmotionTransition,
  StyleAxis,
  StructureAxis,
  TempoAxis,
  NarrativeGenome,
  GenomeFingerprint,
  ExtractionMetadata,
  SimilarityResult,
  SimilarityVerdict,
  DetailedComparison,
  SimilarityWeights,
  SimilarMatch,
  OmegaDNA,
  AnalyzeOptions,
} from "./api/types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS (re-export)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  GENOME_VERSION,
  EXTRACTOR_VERSION,
  DEFAULT_SEED,
  DEFAULT_WEIGHTS,
  FLOAT_PRECISION,
  FLOAT_DECIMALS,
  FINGERPRINT_LENGTH,
  DISTRIBUTION_SUM_TOLERANCE,
} from "./core/version.js";

export { EMOTION14_ORDERED } from "./core/emotion14.js";

// ═══════════════════════════════════════════════════════════════════════════════
// MYCELIUM INTEGRATION (Phase 29.3)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  processWithMycelium,
  isMyceliumOk,
  isMyceliumErr,
  MYCELIUM_SEAL_REF,
  INTEGRATION_GATES,
  ADAPTER_VERSION,
} from "./integrations/myceliumAdapter.js";

export type {
  GenomeMyceliumInput,
  GenomeMyceliumResult,
  GenomeMyceliumOk,
  GenomeMyceliumErr,
  MyceliumSealRef,
  IntegrationGate,
} from "./integrations/myceliumTypes.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CORE UTILITIES (re-export pour tests)
// ═══════════════════════════════════════════════════════════════════════════════

export { 
  quantizeFloat, 
  quantizeObject, 
  canonicalSerialize,
  canonicalBytes,
  canonicalString,
  stripMetadata,
  computeFingerprintFromPayload,
  validateNumber,
  CanonicalizeError,
} from "./core/canonical.js";
