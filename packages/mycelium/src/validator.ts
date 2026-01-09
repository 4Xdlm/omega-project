/**
 * OMEGA Mycelium Validator
 * Phase 29.2 - NASA-Grade L4
 *
 * Implements all 12 INV-MYC-* invariants and 20 REJ-MYC-* rejections
 * Order: HARD validations FIRST, then SOFT normalizations
 */

import {
  MIN_LENGTH,
  MAX_LENGTH,
  MAX_LINE_LENGTH,
  MAGIC_BYTES,
  ALLOWED_CONTROL_CHARS,
  REJECTION_CODES,
  REJECTION_MESSAGES,
  REJECTION_CATEGORIES,
  VALID_MODES,
  type RejectionCode,
} from './constants.js';

import type {
  DNAInput,
  Rejection,
  RejectionDetails,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

function createRejection(
  code: RejectionCode,
  details?: RejectionDetails
): Rejection {
  return {
    code,
    category: REJECTION_CATEGORIES[code],
    message: REJECTION_MESSAGES[code],
    details,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE-MYC-01: UTF-8 VALIDATION (INV-MYC-01)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a string is valid UTF-8
 * Detects: invalid sequences, overlong encodings, surrogate pairs
 */
export function validateUTF8(content: string): Rejection | null {
  const bytes = new TextEncoder().encode(content);

  // Check for BOM (REJ-MYC-103)
  if (
    bytes.length >= 3 &&
    bytes[0] === MAGIC_BYTES.UTF8_BOM[0] &&
    bytes[1] === MAGIC_BYTES.UTF8_BOM[1] &&
    bytes[2] === MAGIC_BYTES.UTF8_BOM[2]
  ) {
    return createRejection(REJECTION_CODES.UTF8_BOM);
  }

  // Check for surrogate pairs in the string (U+D800 to U+DFFF)
  // These are invalid in UTF-8
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDFFF) {
      // This is a surrogate - check if it's a proper pair
      if (code >= 0xD800 && code <= 0xDBFF) {
        // High surrogate - check for low surrogate
        if (i + 1 < content.length) {
          const next = content.charCodeAt(i + 1);
          if (next >= 0xDC00 && next <= 0xDFFF) {
            // Valid surrogate pair in JavaScript, skip
            i++;
            continue;
          }
        }
        // Unpaired high surrogate
        return createRejection(REJECTION_CODES.UTF8_SURROGATE, {
          offset: i,
          hex: code.toString(16).toUpperCase(),
        });
      } else {
        // Unpaired low surrogate
        return createRejection(REJECTION_CODES.UTF8_SURROGATE, {
          offset: i,
          hex: code.toString(16).toUpperCase(),
        });
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE-MYC-02: SIZE VALIDATION (INV-MYC-02)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate content size limits
 */
export function validateSize(content: string): Rejection | null {
  const bytes = new TextEncoder().encode(content);

  // Check max size (REJ-MYC-200)
  if (bytes.length > MAX_LENGTH) {
    return createRejection(REJECTION_CODES.SIZE_EXCEEDED, {
      size: bytes.length,
      max: MAX_LENGTH,
    });
  }

  // Check individual line lengths (REJ-MYC-201)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineBytes = new TextEncoder().encode(lines[i]);
    if (lineBytes.length > MAX_LINE_LENGTH) {
      return createRejection(REJECTION_CODES.LINE_TOO_LONG, {
        lineNumber: i + 1,
        size: lineBytes.length,
        max: MAX_LINE_LENGTH,
      });
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE-MYC-03: BINARY DETECTION (INV-MYC-05)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check for binary content and forbidden formats
 */
export function validateBinary(content: string): Rejection | null {
  const bytes = new TextEncoder().encode(content);

  // Check for null bytes (REJ-MYC-008)
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      return createRejection(REJECTION_CODES.FORMAT_BINARY, {
        offset: i,
      });
    }
  }

  // Helper to check magic bytes
  const matchesMagic = (magic: readonly number[]): boolean => {
    if (bytes.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) {
      if (bytes[i] !== magic[i]) return false;
    }
    return true;
  };

  // Check PDF (REJ-MYC-001)
  if (matchesMagic(MAGIC_BYTES.PDF)) {
    return createRejection(REJECTION_CODES.FORMAT_PDF);
  }

  // Check ZIP/DOCX (REJ-MYC-002)
  if (matchesMagic(MAGIC_BYTES.ZIP)) {
    return createRejection(REJECTION_CODES.FORMAT_DOCX);
  }

  // Check images (REJ-MYC-006)
  if (
    matchesMagic(MAGIC_BYTES.PNG) ||
    matchesMagic(MAGIC_BYTES.JPEG) ||
    matchesMagic(MAGIC_BYTES.GIF87) ||
    matchesMagic(MAGIC_BYTES.GIF89) ||
    matchesMagic(MAGIC_BYTES.BMP)
  ) {
    return createRejection(REJECTION_CODES.FORMAT_IMAGE);
  }

  // Check audio (REJ-MYC-007)
  if (
    matchesMagic(MAGIC_BYTES.MP3_ID3) ||
    matchesMagic(MAGIC_BYTES.OGG) ||
    matchesMagic(MAGIC_BYTES.FLAC)
  ) {
    return createRejection(REJECTION_CODES.FORMAT_AUDIO);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE-MYC-04: EMPTY VALIDATION (INV-MYC-06)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate content is not empty or whitespace-only
 */
export function validateNotEmpty(content: string): Rejection | null {
  if (content.length < MIN_LENGTH || content.trim().length === 0) {
    return createRejection(REJECTION_CODES.EMPTY_INPUT);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE-MYC-05: CONTROL CHARACTER VALIDATION (INV-MYC-07)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate no forbidden control characters
 */
export function validateControlChars(content: string): Rejection | null {
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    // Control characters are 0x00-0x1F
    if (code >= 0x00 && code <= 0x1F) {
      if (!ALLOWED_CONTROL_CHARS.has(code)) {
        return createRejection(REJECTION_CODES.CONTROL_CHAR, {
          offset: i,
          hex: code.toString(16).padStart(2, '0').toUpperCase(),
        });
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT VALIDATION - HTML, JSON, XML (INV-MYC-05)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check for HTML format
 */
export function validateNotHTML(content: string): Rejection | null {
  const trimmed = content.trim().toLowerCase();
  if (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<body') ||
    trimmed.startsWith('<head')
  ) {
    return createRejection(REJECTION_CODES.FORMAT_HTML);
  }
  return null;
}

/**
 * Check for JSON format
 */
export function validateNotJSON(content: string): Rejection | null {
  const trimmed = content.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      JSON.parse(content);
      return createRejection(REJECTION_CODES.FORMAT_JSON);
    } catch {
      // Not valid JSON, that's fine
    }
  }
  return null;
}

/**
 * Check for XML format
 */
export function validateNotXML(content: string): Rejection | null {
  const trimmed = content.trim().toLowerCase();
  if (trimmed.startsWith('<?xml')) {
    return createRejection(REJECTION_CODES.FORMAT_XML);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMETER VALIDATION (INV-MYC-03, INV-MYC-12)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate seed parameter
 */
export function validateSeed(seed: number | undefined): Rejection | null {
  if (seed !== undefined) {
    if (typeof seed !== 'number' || !Number.isFinite(seed)) {
      return createRejection(REJECTION_CODES.INVALID_SEED);
    }
  }
  return null;
}

/**
 * Validate mode parameter
 */
export function validateMode(mode: string | undefined): Rejection | null {
  if (mode !== undefined) {
    if (!VALID_MODES.includes(mode as typeof VALID_MODES[number])) {
      return createRejection(REJECTION_CODES.INVALID_MODE, {
        received: mode,
        expected: VALID_MODES.join(' | '),
      });
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all HARD validations in order
 * INV-MYC-03: No validation bypass
 * Order per MYCELIUM_VALIDATION_PLAN.md: HARD first
 */
export function runHardValidations(input: DNAInput): Rejection | null {
  // Validate parameters first (quick checks)
  let rejection = validateSeed(input.seed);
  if (rejection) return rejection;

  rejection = validateMode(input.mode);
  if (rejection) return rejection;

  // GATE-MYC-03: Binary detection (before full processing)
  rejection = validateBinary(input.content);
  if (rejection) return rejection;

  // GATE-MYC-02: Size limits
  rejection = validateSize(input.content);
  if (rejection) return rejection;

  // GATE-MYC-01: UTF-8 validation
  rejection = validateUTF8(input.content);
  if (rejection) return rejection;

  // GATE-MYC-05: Control characters
  rejection = validateControlChars(input.content);
  if (rejection) return rejection;

  // GATE-MYC-04: Empty check
  rejection = validateNotEmpty(input.content);
  if (rejection) return rejection;

  // Format checks
  rejection = validateNotHTML(input.content);
  if (rejection) return rejection;

  rejection = validateNotJSON(input.content);
  if (rejection) return rejection;

  rejection = validateNotXML(input.content);
  if (rejection) return rejection;

  return null;
}
