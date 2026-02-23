/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — GENIUS PHONETIC STACK — PUBLIC API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single entry point for the entire GENIUS analysis stack.
 * All public types and functions are exported from here.
 * Internal implementation details are NOT exposed.
 *
 * Usage:
 *   import { scoreGenius, analyzeDensity, ... } from './src/index.js';
 *
 * Version: 1.0.0
 * Schema: GENIUS_SCHEMA_V1
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/** Stack version — follows semver */
export const VERSION = '1.0.0' as const;

/** Schema version for report format — bump on breaking changes */
export const SCORER_SCHEMA_VERSION = 'GENIUS_SCHEMA_V1' as const;

/** Module count in this stack */
export const MODULE_COUNT = 10 as const;

// ═══════════════════════════════════════════════════════════════════════════════
// P8 — GENIUS COMPOSITE SCORER (primary API)
// ═══════════════════════════════════════════════════════════════════════════════

export { scoreGenius } from './phonetic/genius-scorer.js';
export type { GeniusAnalysis, AxisScore } from './phonetic/genius-scorer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P0 — SYLLABLE COUNTER
// ═══════════════════════════════════════════════════════════════════════════════

export { countWordSyllables, countTextSyllables } from './phonetic/syllable-counter-fr.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P1 — PROSODIC SEGMENTER
// ═══════════════════════════════════════════════════════════════════════════════

export { segmentProse } from './phonetic/prosodic-segmenter.js';
export type { SegmentationResult, ProsodicSegment } from './phonetic/prosodic-segmenter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P2 — RHYTHM / nPVI CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export { analyzeRhythm, analyzeRhythmFromSegments } from './phonetic/npvi-calculator.js';
export type { RhythmV2Analysis } from './phonetic/npvi-calculator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P3 — EUPHONY DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export { analyzeEuphony } from './phonetic/euphony-detector.js';
export type { EuphonyAnalysis } from './phonetic/euphony-detector.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P4 — CALQUE DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export { analyzeCalques } from './phonetic/calque-detector.js';
export type { CalqueAnalysis, CalqueMatch } from './phonetic/calque-detector.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P5 — SEMANTIC DENSITY
// ═══════════════════════════════════════════════════════════════════════════════

export { analyzeDensity } from './phonetic/semantic-density.js';
export type { DensityAnalysis } from './phonetic/semantic-density.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P6 — SURPRISE ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

export { analyzeSurprise } from './phonetic/surprise-analyzer.js';
export type { SurpriseAnalysis } from './phonetic/surprise-analyzer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// P7 — INEVITABILITY ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

export { analyzeInevitability } from './phonetic/inevitability-analyzer.js';
export type { InevitabilityAnalysis } from './phonetic/inevitability-analyzer.js';
