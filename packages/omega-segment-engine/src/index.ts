// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════
// Exports publics du module omega-segment-engine
// ═══════════════════════════════════════════════════════════════════════════════

// Types
export type {
  SegmentMode,
  NewlinePolicy,
  Segment,
  SegmentationOptions,
  SegmentationResult,
  NormalizationResult,
  RawSpan,
} from "./types.js";

// Segmenter (API principale)
export { segmentText } from "./segmenter.js";

// Canonical (utilitaires hash)
export {
  stableStringify,
  sha256Hex,
  shortHash,
  hashObject,
} from "./canonical.js";

// Normalizer
export {
  normalizeText,
  countWords,
  countLines,
  isWhitespace,
  trimSpan,
  skipWhitespace,
} from "./normalizer.js";

// Exceptions (abréviations)
export {
  ABBREVIATIONS_FR,
  ABBREVIATIONS_EN,
  ABBREVIATIONS_DEFAULT,
  PROTECTED_PATTERNS,
  isProtectedAbbreviation,
  isAfterAbbreviation,
  isDecimalNumber,
} from "./exceptions.js";

// Invariants
export {
  InvariantError,
  assertOffsetsValid,
  assertSliceExact,
  assertNonEmpty,
  assertIndexMonotone,
  assertHashValid,
  assertCharCountCoherent,
  assertWordCountPositive,
  assertNoCarriageReturn,
  assertAllInvariants,
} from "./invariants.js";

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const VERSION = "1.0.0";
export const MODULE_NAME = "omega-segment-engine";
export const STANDARD = "NASA-Grade L4 / AS9100D / DO-178C Level A";

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  VERSION,
  MODULE_NAME,
  STANDARD,
};
