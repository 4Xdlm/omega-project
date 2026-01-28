/**
 * OMEGA Delivery Normalizer v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Envelope-only utilities for headers/footers.
 * CRITICAL: This module NEVER touches validatedText body bytes.
 *
 * INVARIANTS:
 * - H-INV-01: Body bytes preserved EXACTLY (this module only handles envelope)
 * - H-INV-06: UTF-8 BOM-less output
 * - H-INV-07: LF line endings only
 *
 * SPEC: DELIVERY_SPEC v1.0 §H2
 */

import type { DeliveryProfile } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Line feed character (Unix line ending)
 */
export const LF = '\n';

/**
 * Carriage return + line feed (Windows line ending) - FOR DETECTION ONLY
 */
export const CRLF = '\r\n';

/**
 * UTF-8 BOM bytes - FOR DETECTION ONLY
 */
export const UTF8_BOM = '\uFEFF';

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE NORMALIZATION (NOT FOR BODY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes line endings in envelope text (headers/footers only).
 * NEVER use this on validatedText body.
 *
 * @param text - Envelope text to normalize
 * @returns Text with LF line endings
 */
export function normalizeEnvelopeLineEndings(text: string): string {
  // Replace all CRLF with LF, then any stray CR with LF
  return text.replace(/\r\n/g, LF).replace(/\r/g, LF);
}

/**
 * Removes BOM from envelope text if present.
 * NEVER use this on validatedText body.
 *
 * @param text - Envelope text
 * @returns Text without BOM
 */
export function removeEnvelopeBOM(text: string): string {
  if (text.startsWith(UTF8_BOM)) {
    return text.slice(1);
  }
  return text;
}

/**
 * Normalizes envelope text (headers/footers).
 * Combines BOM removal and line ending normalization.
 * NEVER use this on validatedText body.
 *
 * @param text - Envelope text
 * @returns Normalized envelope text
 */
export function normalizeEnvelopeText(text: string): string {
  return normalizeEnvelopeLineEndings(removeEnvelopeBOM(text));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER/FOOTER PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds header block from profile headers.
 *
 * @param profile - Delivery profile with optional headers
 * @returns Header string with trailing newline, or empty string
 */
export function buildHeaderBlock(profile: DeliveryProfile): string {
  if (!profile.headers || profile.headers.length === 0) {
    return '';
  }

  const normalized = profile.headers.map(h => normalizeEnvelopeText(h));
  return normalized.join(LF) + LF;
}

/**
 * Builds footer block from profile footers.
 *
 * @param profile - Delivery profile with optional footers
 * @returns Footer string with leading newline, or empty string
 */
export function buildFooterBlock(profile: DeliveryProfile): string {
  if (!profile.footers || profile.footers.length === 0) {
    return '';
  }

  const normalized = profile.footers.map(f => normalizeEnvelopeText(f));
  return normalized.join(LF);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BODY VALIDATION (READ-ONLY CHECKS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates that body text has no BOM.
 * This is a READ-ONLY check - does not modify body.
 *
 * @param body - Body text to validate
 * @returns true if body has no BOM
 */
export function validateBodyNoBOM(body: string): boolean {
  return !body.startsWith(UTF8_BOM);
}

/**
 * Validates that body text uses LF line endings only.
 * This is a READ-ONLY check - does not modify body.
 *
 * @param body - Body text to validate
 * @returns true if body uses only LF line endings
 */
export function validateBodyLFOnly(body: string): boolean {
  return !body.includes('\r');
}

/**
 * Validates body text meets delivery requirements.
 * H-INV-06: UTF-8 BOM-less
 * H-INV-07: LF only
 *
 * @param body - Body text to validate
 * @returns Validation result with any violations
 */
export function validateBody(body: string): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (!validateBodyNoBOM(body)) {
    violations.push('H-INV-06 VIOLATION: Body contains UTF-8 BOM');
  }

  if (!validateBodyLFOnly(body)) {
    violations.push('H-INV-07 VIOLATION: Body contains CRLF or CR line endings');
  }

  return Object.freeze({
    valid: violations.length === 0,
    violations: Object.freeze(violations) as unknown as string[],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assembles complete artifact from header, body, and footer.
 * H-INV-01: Body bytes preserved EXACTLY.
 *
 * @param header - Header block (already normalized)
 * @param body - Body text (NEVER modified)
 * @param footer - Footer block (already normalized)
 * @returns Complete artifact text
 */
export function assembleArtifact(
  header: string,
  body: string,
  footer: string
): string {
  // Body is inserted EXACTLY as-is between header and footer
  // No modifications to body bytes whatsoever
  return header + body + footer;
}

/**
 * Assembles artifact using profile envelope.
 * Builds header/footer from profile and wraps body.
 *
 * @param body - Body text (NEVER modified)
 * @param profile - Delivery profile
 * @returns Complete artifact text
 */
export function assembleWithProfile(
  body: string,
  profile: DeliveryProfile
): string {
  const header = buildHeaderBlock(profile);
  const footer = buildFooterBlock(profile);
  return assembleArtifact(header, body, footer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ensures consistent string representation for hashing.
 * Does NOT modify content - only ensures string type.
 *
 * @param input - Input to stringify
 * @returns String representation
 */
export function ensureString(input: string | Buffer): string {
  if (Buffer.isBuffer(input)) {
    return input.toString('utf-8');
  }
  return input;
}

/**
 * Computes byte length of UTF-8 string.
 *
 * @param text - Text to measure
 * @returns Byte length
 */
export function getByteLength(text: string): number {
  return Buffer.byteLength(text, 'utf-8');
}

/**
 * Extracts body from artifact given known header and footer lengths.
 * Used for verification - ensures body wasn't modified.
 *
 * @param artifact - Complete artifact
 * @param headerLength - Length of header in characters
 * @param footerLength - Length of footer in characters
 * @returns Extracted body
 */
export function extractBody(
  artifact: string,
  headerLength: number,
  footerLength: number
): string {
  const endIndex = footerLength > 0 ? artifact.length - footerLength : artifact.length;
  return artifact.slice(headerLength, endIndex);
}

/**
 * Verifies body was preserved exactly in artifact.
 * H-INV-01: Body bytes preserved EXACTLY.
 *
 * @param originalBody - Original body text
 * @param artifact - Complete artifact
 * @param headerLength - Length of header
 * @param footerLength - Length of footer
 * @returns true if body matches exactly
 */
export function verifyBodyPreserved(
  originalBody: string,
  artifact: string,
  headerLength: number,
  footerLength: number
): boolean {
  const extracted = extractBody(artifact, headerLength, footerLength);
  return extracted === originalBody;
}
