/**
 * @fileoverview OMEGA Hardening - Public API
 * @module @omega/hardening
 *
 * Security utilities and attack surface reduction.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ValidationResult,
  ValidationRule,
  ValidatorOptions,
  SanitizationResult,
  StringSanitizeOptions,
  HashVerificationResult,
  IntegrityCheckResult,
  PathValidationResult,
  PathValidationOptions,
  SafeJsonResult,
  SafeJsonOptions,
  TamperCheckResult,
  TamperCheck,
  ProtectedObject,
  SecurityContext,
} from './types.js';

export {
  DEFAULT_SECURITY_CONTEXT,
  isPlainObject,
  isSafeInteger,
  isNonEmptyString,
  isValidHash,
  hasDangerousKeys,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  sanitizeString,
  sanitizeObject,
  sanitizePath,
  sanitizeUrl,
  escapeHtml,
  stripHtml,
} from './sanitize.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  validateString,
  validateNonEmptyString,
  validateNumber,
  validateSafeInteger,
  validateObject,
  validateHash,
  validatePath,
  validateArray,
  createValidator,
  commonRules,
} from './validate.js';

// ═══════════════════════════════════════════════════════════════════════════════
// JSON SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

export {
  safeJsonParse,
  safeJsonStringify,
  getJsonType,
  isJsonType,
  parseFrozenJson,
  deepFreeze,
} from './json.js';

export type { JsonType } from './json.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TAMPER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  verifyHash,
  computeHash,
  verifyObjectHash,
  computeObjectHash,
  verifyManifest,
  generateManifest,
  checkTamper,
  protectObject,
  verifyProtectedObject,
  seal,
  unseal,
} from './tamper.js';

export type { SealedData } from './tamper.js';
