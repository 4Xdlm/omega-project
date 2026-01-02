// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — TYPES CONTRACTUELS
// ═══════════════════════════════════════════════════════════════════════════════
// Standard: NASA-Grade L4 / AS9100D / DO-178C Level A
// Garantie: Déterminisme absolu, offsets exacts, hash stable
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mode de segmentation
 * - sentence: Découpe sur ponctuation finale (.!?…) + double newline
 * - paragraph: Découpe sur lignes vides (≥2 newlines)
 * - scene: Découpe sur séparateurs explicites (###, ***, ---, etc.)
 */
export type SegmentMode = "sentence" | "paragraph" | "scene";

/**
 * Politique de normalisation des sauts de ligne
 * - preserve: Garde CRLF/LF tel quel (offsets source)
 * - normalize_lf: Convertit \r\n → \n AVANT segmentation
 */
export type NewlinePolicy = "preserve" | "normalize_lf";

/**
 * Segment = SPAN contractuel sur le texte NORMALISÉ
 * 
 * INVARIANTS:
 * - INV-SEG-01: 0 ≤ start < end ≤ input.length
 * - INV-SEG-02: text === normalizedInput.slice(start, end)
 * - INV-SEG-03: text.trim().length > 0
 * - INV-SEG-04: index monotone croissant
 */
export interface Segment {
  /** ID déterministe: seg_{index}_{hash12} basé sur mode+index+start+end */
  id: string;

  /** Index 0-based, monotone croissant */
  index: number;

  /** Offset char début (0 ≤ start < end) */
  start: number;

  /** Offset char fin (end ≤ input.length) */
  end: number;

  /** Texte exact = input.slice(start, end) — SANS modification */
  text: string;

  /** Nombre de tokens (split whitespace + apostrophe FR) */
  word_count: number;

  /** Longueur caractères = text.length */
  char_count: number;

  /** Nombre de lignes (newlines + 1) */
  line_count: number;
}

/**
 * Options de segmentation
 */
export interface SegmentationOptions {
  /** Mode de découpe */
  mode: SegmentMode;

  /** Politique newlines (défaut: normalize_lf) */
  newline_policy?: NewlinePolicy;

  /** Abréviations à NE PAS couper (défaut: FR+EN standard) */
  abbreviations?: readonly string[];

  /** Mode sentence: double newline force frontière (défaut: true) */
  sentence_break_on_double_newline?: boolean;

  /** Mode scene: séparateurs (défaut: ###, ***, ---) */
  scene_separators?: readonly string[];

  /** Préserver tirets cadratins dialogue (défaut: false) */
  preserve_dialogue_dashes?: boolean;
}

/**
 * Résultat de segmentation
 * 
 * INVARIANTS:
 * - INV-SEG-05: segmentation_hash déterministe
 * - INV-SEG-06: segment_count === segments.length
 * - INV-SEG-07: total_segment_char_count === Σ(segment.char_count)
 * - INV-SEG-08: Aucun \r si normalize_lf
 */
export interface SegmentationResult {
  /** Mode utilisé */
  mode: SegmentMode;

  /** Politique newline utilisée */
  newline_policy: NewlinePolicy;

  /** Longueur input après normalisation */
  input_char_count: number;

  /** Segments ordonnés */
  segments: readonly Segment[];

  /** Nombre de segments */
  segment_count: number;

  /** Somme char_count des segments */
  total_segment_char_count: number;

  /** Hash SHA-256 déterministe de la segmentation */
  segmentation_hash: string;

  /** Ratio couverture: total_segment_char_count / input_char_count */
  coverage_ratio: number;
}

/**
 * Résultat de normalisation (interne)
 */
export interface NormalizationResult {
  /** Texte normalisé */
  text: string;

  /** Map index normalisé → index original (optionnel, v2) */
  indexMap?: readonly number[];
}

/**
 * Span brut (avant création Segment)
 */
export interface RawSpan {
  start: number;
  end: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Types re-exportés pour commodité
};
