/**
 * OMEGA Phase C — SENTINEL_JUDGE
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * C.1.1 — Types, Schemas, Canonical JSON, Digest
 */

// Types
export * from './types.js';
export {
  PATTERNS,
  ERROR_CODES,
  DECISION_REQUEST_VOLATILE_FIELDS,
  JUDGEMENT_VOLATILE_FIELDS,
  SentinelJudgeError,
} from './types.js';

// Canonical JSON
export {
  canonicalStringify,
  canonicalParse,
  canonicalEquals,
} from './canonical_json.js';

// Digest
export {
  stripVolatileFields,
  stripDecisionRequestVolatile,
  stripJudgementVolatile,
  computeSha256,
  computeSha256Buffer,
  computeDigest,
  computeDecisionRequestDigest,
  computeJudgementDigest,
  verifyDigest,
  computePayloadHash,
} from './digest.js';

// Schema
export {
  loadSchema,
  loadAllSchemas,
  clearSchemaCache,
  getLoadedSchemaIds,
  isSchemaLoaded,
  type SchemaId,
} from './schema/index.js';

export {
  validate,
  validateOrThrow,
  isValidDecisionRequest,
  isValidEvidencePack,
  isValidJudgement,
  isValidPolicyRef,
  isValidTraceId,
  isValidJudgementId,
  isValidSha256,
  isValidInvariantId,
  isValidReasonCode,
  type ValidationResult,
  type ValidationError,
} from './schema/validate.js';
