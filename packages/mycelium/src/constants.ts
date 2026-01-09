/**
 * OMEGA Mycelium Constants
 * Phase 29.2 - NASA-Grade L4
 *
 * All limits and magic bytes defined per DNA_INPUT_CONTRACT.md
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SIZE LIMITS (INV-MYC-02)
// ═══════════════════════════════════════════════════════════════════════════════

export const MIN_LENGTH = 1;                    // 1 byte minimum
export const MAX_LENGTH = 10 * 1024 * 1024;     // 10 MB
export const MAX_LINE_LENGTH = 1 * 1024 * 1024; // 1 MB per line
export const MAX_SEGMENTS = 100_000;            // Maximum segments

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_SEED = 42;
export const DEFAULT_MODE: SegmentMode = 'paragraph';

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT MODES
// ═══════════════════════════════════════════════════════════════════════════════

export type SegmentMode = 'paragraph' | 'sentence';

export const VALID_MODES: readonly SegmentMode[] = ['paragraph', 'sentence'] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAGIC BYTES - Binary Detection (INV-MYC-05)
// ═══════════════════════════════════════════════════════════════════════════════

export const MAGIC_BYTES = {
  // PDF
  PDF: [0x25, 0x50, 0x44, 0x46],  // %PDF

  // ZIP/DOCX/XLSX/PPTX (Office Open XML)
  ZIP: [0x50, 0x4B, 0x03, 0x04],  // PK..

  // Images
  PNG: [0x89, 0x50, 0x4E, 0x47],  // .PNG
  JPEG: [0xFF, 0xD8, 0xFF],       // JPEG SOI
  GIF87: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],  // GIF87a
  GIF89: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],  // GIF89a
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF (need to check WEBP after)
  BMP: [0x42, 0x4D],              // BM

  // Audio
  MP3_ID3: [0x49, 0x44, 0x33],    // ID3
  MP3_SYNC: [0xFF, 0xFB],         // MP3 frame sync
  WAV: [0x52, 0x49, 0x46, 0x46],  // RIFF (need to check WAVE after)
  OGG: [0x4F, 0x67, 0x67, 0x53],  // OggS
  FLAC: [0x66, 0x4C, 0x61, 0x43], // fLaC

  // UTF-8 BOM (REJ-MYC-103)
  UTF8_BOM: [0xEF, 0xBB, 0xBF],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL CHARACTERS - Forbidden (INV-MYC-07)
// ═══════════════════════════════════════════════════════════════════════════════

// Allowed control characters: TAB (0x09), LF (0x0A), CR (0x0D)
export const ALLOWED_CONTROL_CHARS = new Set([0x09, 0x0A, 0x0D]);

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION CODES (20 codes as per MYCELIUM_REJECTION_CATALOG.md)
// ═══════════════════════════════════════════════════════════════════════════════

export const REJECTION_CODES = {
  // Format interdit (001-008)
  FORMAT_PDF: 'REJ-MYC-001',
  FORMAT_DOCX: 'REJ-MYC-002',
  FORMAT_HTML: 'REJ-MYC-003',
  FORMAT_JSON: 'REJ-MYC-004',
  FORMAT_XML: 'REJ-MYC-005',
  FORMAT_IMAGE: 'REJ-MYC-006',
  FORMAT_AUDIO: 'REJ-MYC-007',
  FORMAT_BINARY: 'REJ-MYC-008',

  // Encodage invalide (100-103)
  UTF8_INVALID: 'REJ-MYC-100',
  UTF8_OVERLONG: 'REJ-MYC-101',
  UTF8_SURROGATE: 'REJ-MYC-102',
  UTF8_BOM: 'REJ-MYC-103',

  // Taille/Limite (200-202)
  SIZE_EXCEEDED: 'REJ-MYC-200',
  LINE_TOO_LONG: 'REJ-MYC-201',
  TOO_MANY_SEGMENTS: 'REJ-MYC-202',

  // Contenu invalide (300-301)
  EMPTY_INPUT: 'REJ-MYC-300',
  CONTROL_CHAR: 'REJ-MYC-301',

  // Paramètres invalides (400-401)
  INVALID_SEED: 'REJ-MYC-400',
  INVALID_MODE: 'REJ-MYC-401',

  // Erreurs système (900)
  SYSTEM_ERROR: 'REJ-MYC-900',
} as const;

export type RejectionCode = typeof REJECTION_CODES[keyof typeof REJECTION_CODES];

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

export const REJECTION_MESSAGES: Record<RejectionCode, string> = {
  'REJ-MYC-001': 'Rejected: PDF format not supported. Only plain text (UTF-8) accepted.',
  'REJ-MYC-002': 'Rejected: DOCX format not supported. Only plain text (UTF-8) accepted.',
  'REJ-MYC-003': 'Rejected: HTML format not supported. Strip markup before submission.',
  'REJ-MYC-004': 'Rejected: JSON format not supported. Extract narrative text first.',
  'REJ-MYC-005': 'Rejected: XML format not supported. Extract text content first.',
  'REJ-MYC-006': 'Rejected: Image format not supported. Text only.',
  'REJ-MYC-007': 'Rejected: Audio format not supported. Text only.',
  'REJ-MYC-008': 'Rejected: Binary content detected. Text only.',
  'REJ-MYC-100': 'Rejected: Invalid UTF-8 sequence.',
  'REJ-MYC-101': 'Rejected: Overlong UTF-8 encoding detected.',
  'REJ-MYC-102': 'Rejected: UTF-8 surrogate pair not allowed.',
  'REJ-MYC-103': 'Rejected: UTF-8 BOM not allowed. Remove BOM and resubmit.',
  'REJ-MYC-200': 'Rejected: Input size exceeds maximum.',
  'REJ-MYC-201': 'Rejected: Line exceeds maximum length.',
  'REJ-MYC-202': 'Rejected: Segment count exceeds maximum.',
  'REJ-MYC-300': 'Rejected: Empty or whitespace-only input.',
  'REJ-MYC-301': 'Rejected: Invalid control character detected.',
  'REJ-MYC-400': 'Rejected: Invalid seed value. Must be finite number.',
  'REJ-MYC-401': 'Rejected: Invalid mode. Use \'paragraph\' or \'sentence\'.',
  'REJ-MYC-900': 'Rejected: System error during validation. Contact support.',
};

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export type RejectionCategory =
  | 'Format'
  | 'Encoding'
  | 'Size'
  | 'Content'
  | 'Params'
  | 'System';

export const REJECTION_CATEGORIES: Record<RejectionCode, RejectionCategory> = {
  'REJ-MYC-001': 'Format',
  'REJ-MYC-002': 'Format',
  'REJ-MYC-003': 'Format',
  'REJ-MYC-004': 'Format',
  'REJ-MYC-005': 'Format',
  'REJ-MYC-006': 'Format',
  'REJ-MYC-007': 'Format',
  'REJ-MYC-008': 'Format',
  'REJ-MYC-100': 'Encoding',
  'REJ-MYC-101': 'Encoding',
  'REJ-MYC-102': 'Encoding',
  'REJ-MYC-103': 'Encoding',
  'REJ-MYC-200': 'Size',
  'REJ-MYC-201': 'Size',
  'REJ-MYC-202': 'Size',
  'REJ-MYC-300': 'Content',
  'REJ-MYC-301': 'Content',
  'REJ-MYC-400': 'Params',
  'REJ-MYC-401': 'Params',
  'REJ-MYC-900': 'System',
};
