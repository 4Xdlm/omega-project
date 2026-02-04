// ═══════════════════════════════════════════════════════════════════════════
// OMEGA PIPELINE — Type Definitions
// Version: 1.0.0
// Date: 04 février 2026
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Segment structure from segmentation engine
 */
export interface Segment {
  id: string;
  index: number;
  start: number;
  end: number;
  text: string;
  word_count: number;
  char_count: number;
  line_count: number;
}

/**
 * Segmentation result from text segmentation
 */
export interface SegmentationResult {
  segments: Segment[];
  segmentation_hash: string;
  coverage_ratio: number;
}

/**
 * DNA structure from mycelium-bio
 */
export interface MyceliumDNA {
  rootHash: string;
  version: string;
  profile: string;
  fingerprint: string;
  nodes: unknown[];
}

/**
 * DNA build inputs for single segment
 */
export interface DNABuildInputs {
  segments: unknown[];
}

/**
 * Segment analysis with DNA inputs
 */
export interface SegmentAnalysis {
  segment_id: string;
  segment_index: number;
  segment_text: string;
  word_count: number;
  char_count: number;
  line_count: number;
  start: number;
  end: number;
  dnaInputs: DNABuildInputs;
}

/**
 * Segment with DNA built
 */
export interface SegmentWithDNA {
  segment_id: string;
  segment_index: number;
  word_count: number;
  dna: MyceliumDNA;
}

/**
 * Aggregation result from omega-aggregate-dna
 */
export interface AggregateResult {
  dna: MyceliumDNA;
  aggregation: {
    merkle_root: string;
    segment_root_hashes: string[];
  };
}

/**
 * MyceliumDNAAdapter type (imported from omega-aggregate-dna)
 */
export type MyceliumDNAAdapter = unknown;
