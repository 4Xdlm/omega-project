/**
 * OMEGA Mycelium - Public API
 * Phase 29.2 - NASA-Grade L4
 *
 * Entry point for @omega/mycelium package
 */

// Main validation function
export { validate, MYCELIUM_VERSION, isAccepted, isRejected } from './mycelium.js';

// Types
export type {
  DNAInput,
  InputMetadata,
  GenomeInput,
  ProcessedMetadata,
  Rejection,
  RejectionDetails,
  AcceptResult,
  RejectResult,
  ValidationResult,
} from './types.js';

// Constants
export {
  MIN_LENGTH,
  MAX_LENGTH,
  MAX_LINE_LENGTH,
  MAX_SEGMENTS,
  DEFAULT_SEED,
  DEFAULT_MODE,
  VALID_MODES,
  REJECTION_CODES,
  REJECTION_MESSAGES,
  REJECTION_CATEGORIES,
  type SegmentMode,
  type RejectionCode,
  type RejectionCategory,
} from './constants.js';

// Individual validators (for testing)
export {
  validateUTF8,
  validateSize,
  validateBinary,
  validateNotEmpty,
  validateControlChars,
  validateNotHTML,
  validateNotJSON,
  validateNotXML,
  validateSeed,
  validateMode,
  runHardValidations,
} from './validator.js';

// Normalizers (for testing)
export {
  normalizeLineEndings,
  runSoftNormalizations,
} from './normalizer.js';
