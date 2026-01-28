/**
 * OMEGA Delivery Types v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Branded types and interfaces for the Delivery Engine.
 *
 * INVARIANTS:
 * - H-INV-01: Body bytes preserved (validatedText exact)
 * - H-INV-08: UTF-8 BOM-less strict
 * - H-INV-09: LF only (no CRLF)
 * - H-INV-10: No path traversal in artifact names
 *
 * SPEC: DELIVERY_SPEC v1.0 §H1
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Brand helper type
 */
type Brand<K, T> = K & { readonly __brand: T };

/**
 * Profile identifier
 * Format: PROF-name or OMEGA_STD
 */
export type ProfileId = Brand<string, 'ProfileId'>;

/**
 * SHA256 hash (64 hex characters)
 */
export type Sha256 = Brand<string, 'Sha256'>;

/**
 * ISO8601 timestamp
 */
export type ISO8601 = Brand<string, 'ISO8601'>;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates ProfileId format
 */
export function isProfileId(value: unknown): value is ProfileId {
  if (typeof value !== 'string') return false;
  return /^(PROF-[A-Za-z0-9_-]+|OMEGA_STD)$/.test(value);
}

/**
 * Validates SHA256 format (64 hex characters)
 */
export function isSha256(value: unknown): value is Sha256 {
  if (typeof value !== 'string') return false;
  return /^[a-f0-9]{64}$/.test(value);
}

/**
 * Validates ISO8601 format
 */
export function isISO8601(value: unknown): value is ISO8601 {
  if (typeof value !== 'string') return false;
  const date = Date.parse(value);
  return !isNaN(date) && value.includes('T');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY FORMAT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported delivery formats
 */
export type DeliveryFormat = 'TEXT' | 'MARKDOWN' | 'JSON_PACK' | 'PROOF_PACK' | 'HASH_CHAIN';

/**
 * All valid delivery formats
 */
export const DELIVERY_FORMATS: readonly DeliveryFormat[] = Object.freeze([
  'TEXT',
  'MARKDOWN',
  'JSON_PACK',
  'PROOF_PACK',
  'HASH_CHAIN',
]);

/**
 * Validates DeliveryFormat
 */
export function isDeliveryFormat(value: unknown): value is DeliveryFormat {
  return typeof value === 'string' && DELIVERY_FORMATS.includes(value as DeliveryFormat);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delivery profile configuration
 */
export interface DeliveryProfile {
  readonly profileId: ProfileId;
  readonly format: DeliveryFormat;
  readonly extension: string;
  readonly encoding: 'UTF-8';
  readonly lineEnding: 'LF';
  readonly wrapWidth?: number;
  readonly headers?: readonly string[];
  readonly footers?: readonly string[];
}

/**
 * Validates DeliveryProfile structure
 */
export function isDeliveryProfile(value: unknown): value is DeliveryProfile {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    isProfileId(obj.profileId) &&
    isDeliveryFormat(obj.format) &&
    typeof obj.extension === 'string' &&
    obj.encoding === 'UTF-8' &&
    obj.lineEnding === 'LF' &&
    (obj.wrapWidth === undefined || typeof obj.wrapWidth === 'number') &&
    (obj.headers === undefined || Array.isArray(obj.headers)) &&
    (obj.footers === undefined || Array.isArray(obj.footers))
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A single delivery artifact
 */
export interface DeliveryArtifact {
  readonly format: DeliveryFormat;
  readonly filename: string;
  readonly content: Uint8Array;
  readonly bodyHash: Sha256;       // Hash of BODY only (validatedText bytes)
  readonly contentHash: Sha256;    // Hash of complete artifact
  readonly size: number;
}

/**
 * Validates DeliveryArtifact structure
 */
export function isDeliveryArtifact(value: unknown): value is DeliveryArtifact {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    isDeliveryFormat(obj.format) &&
    typeof obj.filename === 'string' &&
    obj.content instanceof Uint8Array &&
    isSha256(obj.bodyHash) &&
    isSha256(obj.contentHash) &&
    typeof obj.size === 'number' &&
    obj.size >= 0
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Artifact entry in manifest
 */
export interface ManifestArtifactEntry {
  readonly filename: string;
  readonly bodyHash: Sha256;
  readonly contentHash: Sha256;
  readonly size: number;
}

/**
 * Delivery manifest with all hashes
 */
export interface DeliveryManifest {
  readonly intentId: string;
  readonly intentHash: Sha256;
  readonly profileId: ProfileId;
  readonly profileHash: Sha256;
  readonly proofHash: Sha256;
  readonly artifacts: readonly ManifestArtifactEntry[];
  readonly bundleHash: Sha256;
  readonly createdAt: ISO8601;  // Excluded from bundleHash
}

/**
 * Validates DeliveryManifest structure
 */
export function isDeliveryManifest(value: unknown): value is DeliveryManifest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.intentId === 'string' &&
    isSha256(obj.intentHash) &&
    isProfileId(obj.profileId) &&
    isSha256(obj.profileHash) &&
    isSha256(obj.proofHash) &&
    Array.isArray(obj.artifacts) &&
    isSha256(obj.bundleHash) &&
    isISO8601(obj.createdAt)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY BUNDLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete delivery bundle
 */
export interface DeliveryBundle {
  readonly artifacts: readonly DeliveryArtifact[];
  readonly manifest: DeliveryManifest;
  readonly bundleHash: Sha256;
}

/**
 * Validates DeliveryBundle structure
 */
export function isDeliveryBundle(value: unknown): value is DeliveryBundle {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    Array.isArray(obj.artifacts) &&
    obj.artifacts.every(a => isDeliveryArtifact(a)) &&
    isDeliveryManifest(obj.manifest) &&
    isSha256(obj.bundleHash)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input to the delivery engine
 */
export interface DeliveryInput {
  readonly validatedText: string;
  readonly truthGateVerdict: unknown;
  readonly proofManifest: unknown;
  readonly intent: unknown;
  readonly generationContract: unknown;
  readonly profile?: ProfileId;
}

/**
 * Validates DeliveryInput structure
 */
export function isDeliveryInput(value: unknown): value is DeliveryInput {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.validatedText === 'string' &&
    obj.truthGateVerdict !== undefined &&
    obj.proofManifest !== undefined &&
    obj.intent !== undefined &&
    obj.generationContract !== undefined &&
    (obj.profile === undefined || isProfileId(obj.profile))
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates filename for path traversal (H-INV-10)
 */
export function isValidFilename(filename: string): boolean {
  // No empty names
  if (!filename || filename.length === 0) return false;

  // No path traversal
  if (filename.includes('..')) return false;
  if (filename.includes('/') || filename.includes('\\')) return false;

  // No special characters
  if (/[<>:"|?*]/.test(filename)) return false;

  // No null bytes
  if (filename.includes('\0')) return false;

  // Must have valid characters
  return /^[a-zA-Z0-9._-]+$/.test(filename);
}

/**
 * Checks for BOM in bytes (H-INV-08)
 */
export function hasBOM(bytes: Uint8Array): boolean {
  // UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 &&
      bytes[0] === 0xEF &&
      bytes[1] === 0xBB &&
      bytes[2] === 0xBF) {
    return true;
  }

  // UTF-16 LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return true;
  }

  // UTF-16 BE BOM: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return true;
  }

  return false;
}

/**
 * Checks for CRLF in string (H-INV-09)
 */
export function hasCRLF(text: string): boolean {
  return text.includes('\r\n') || text.includes('\r');
}

/**
 * Checks for CRLF in bytes
 */
export function hasCRLFBytes(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0x0D) {
      return true; // Found CR
    }
  }
  if (bytes.length > 0 && bytes[bytes.length - 1] === 0x0D) {
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default profile ID
 */
export const DEFAULT_PROFILE_ID = 'OMEGA_STD' as ProfileId;

/**
 * Default encoding
 */
export const DEFAULT_ENCODING = 'UTF-8' as const;

/**
 * Default line ending
 */
export const DEFAULT_LINE_ENDING = 'LF' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of delivery operation
 */
export type DeliveryResult =
  | { readonly success: true; readonly bundle: DeliveryBundle }
  | { readonly success: false; readonly error: DeliveryError };

/**
 * Delivery error
 */
export interface DeliveryError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Creates a delivery error
 */
export function createDeliveryError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): DeliveryError {
  return Object.freeze({
    code,
    message,
    details: details ? Object.freeze(details) : undefined,
  });
}
