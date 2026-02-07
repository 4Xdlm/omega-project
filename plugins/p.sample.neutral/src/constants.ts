/**
 * p.sample.neutral — Constants v1.0. All thresholds justified.
 */

/** 1 char minimum — smallest meaningful input. */
export const MIN_CONTENT_LENGTH = 1;

/** 20 tags max — aligned with output schema maxItems. */
export const MAX_TAGS = 20;

/** >60% unique words = rich vocabulary (empirically tested). */
export const HIGH_VOCAB_RATIO = 0.6;

/** Words >6 chars = higher complexity (Flesch reading ease). */
export const LONG_WORD_THRESHOLD = 6;

export const OUTPUT_SCHEMA_REF = 'omega:p.sample.neutral:output:analysis-output:v1.0.0';
