/**
 * @fileoverview OMEGA Hardening - Type Definitions
 * @module @omega/hardening/types
 *
 * Security types for attack surface reduction.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation result.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly sanitized?: unknown;
}

/**
 * Validation rule.
 */
export interface ValidationRule<T = unknown> {
  readonly name: string;
  readonly validate: (value: T) => boolean;
  readonly message: string;
}

/**
 * Validator options.
 */
export interface ValidatorOptions {
  readonly strict?: boolean;
  readonly allowNull?: boolean;
  readonly maxDepth?: number;
  readonly maxLength?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SANITIZATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitization result.
 */
export interface SanitizationResult<T = unknown> {
  readonly success: boolean;
  readonly value: T;
  readonly modifications: readonly string[];
}

/**
 * String sanitization options.
 */
export interface StringSanitizeOptions {
  readonly trim?: boolean;
  readonly lowercase?: boolean;
  readonly uppercase?: boolean;
  readonly maxLength?: number;
  readonly removeNullBytes?: boolean;
  readonly normalizeNewlines?: boolean;
  readonly removeControlChars?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash verification result.
 */
export interface HashVerificationResult {
  readonly valid: boolean;
  readonly expected: string;
  readonly actual: string;
  readonly algorithm: 'sha256';
}

/**
 * Integrity check result.
 */
export interface IntegrityCheckResult {
  readonly valid: boolean;
  readonly path: string;
  readonly hashResult: HashVerificationResult;
  readonly error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path validation result.
 */
export interface PathValidationResult {
  readonly valid: boolean;
  readonly normalized: string;
  readonly errors: readonly string[];
}

/**
 * Path validation options.
 */
export interface PathValidationOptions {
  readonly allowAbsolute?: boolean;
  readonly allowRelative?: boolean;
  readonly allowTraversal?: boolean;
  readonly basePath?: string;
  readonly maxLength?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safe JSON parse result.
 */
export interface SafeJsonResult<T = unknown> {
  readonly success: boolean;
  readonly value: T | null;
  readonly error?: string;
}

/**
 * Safe JSON parse options.
 */
export interface SafeJsonOptions {
  readonly maxDepth?: number;
  readonly maxLength?: number;
  readonly allowProto?: boolean;
  readonly allowConstructor?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAMPER DETECTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tamper detection result.
 */
export interface TamperCheckResult {
  readonly tampered: boolean;
  readonly checks: readonly TamperCheck[];
}

/**
 * Individual tamper check.
 */
export interface TamperCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly message?: string;
}

/**
 * Protected object marker.
 */
export interface ProtectedObject {
  readonly __protected: true;
  readonly __hash: string;
  readonly __timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Security context for hardened operations.
 */
export interface SecurityContext {
  readonly strict: boolean;
  readonly maxDepth: number;
  readonly maxLength: number;
  readonly allowedProtocols: readonly string[];
  readonly blockedPatterns: readonly RegExp[];
}

/**
 * Default security context.
 */
export const DEFAULT_SECURITY_CONTEXT: SecurityContext = {
  strict: true,
  maxDepth: 10,
  maxLength: 1_000_000,
  allowedProtocols: ['https'],
  blockedPatterns: [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<script/i,
    /on\w+\s*=/i,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if value is a plain object.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Check if value is a safe integer.
 */
export function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/**
 * Check if value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid hash (64 hex chars).
 */
export function isValidHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

/**
 * Check if object has dangerous keys.
 */
export function hasDangerousKeys(obj: Record<string, unknown>): boolean {
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  return Object.keys(obj).some((key) => dangerous.includes(key));
}
