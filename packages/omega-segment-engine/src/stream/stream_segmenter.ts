// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA STREAMING v2 — STREAM SEGMENTER
// ═══════════════════════════════════════════════════════════════════════════════
// Segmentation streaming avec AsyncGenerator
// Standard: NASA-Grade L4
//
// ARCHITECTURE:
//   File → UTF8Reader → Normalizer → CarryBuffer → Segments
//
// GARANTIES:
//   - Même input → même segments (déterminisme)
//   - rootHash streaming === rootHash non-streaming
//   - Pas d'OOM même sur fichiers > 1GB
//   - Offsets globaux corrects sur texte normalisé
//
// INVARIANTS:
//   INV-STR-01: Streaming == Non-streaming (rootHash identique)
//   INV-STR-02: chunk_size ne change pas le hash
//   INV-STR-03: Offsets globaux valides
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { readUTF8Stream, getFileSize } from "./utf8_stream.js";
import { NewlineNormalizer, CarryBuffer, SegmentMode } from "./carry_buffer.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface StreamSegmentOptions {
  /** Segmentation mode */
  mode: SegmentMode;
  /** Chunk size in bytes (default: 65536 = 64KB) */
  chunkSize?: number;
  /** Include segment text in output (default: false for streaming) */
  includeText?: boolean;
  /** Callback for progress updates */
  onProgress?: (progress: StreamProgress) => void;
}

export interface StreamProgress {
  /** Bytes read so far */
  bytesRead: number;
  /** Total file size in bytes */
  totalBytes: number;
  /** Percentage complete (0-100) */
  percent: number;
  /** Segments emitted so far */
  segmentsEmitted: number;
}

export interface StreamSegment {
  /** Unique deterministic ID */
  id: string;
  /** Segment index (0-based) */
  index: number;
  /** Start offset in normalized text */
  start: number;
  /** End offset in normalized text */
  end: number;
  /** Word count */
  word_count: number;
  /** Character count */
  char_count: number;
  /** Line count */
  line_count: number;
  /** Segment text (only if includeText=true OR yielded for processing) */
  text: string;
}

export interface StreamSegmentationResult {
  /** Segmentation mode used */
  mode: SegmentMode;
  /** Newline policy (always normalize_lf) */
  newline_policy: "normalize_lf";
  /** Total characters in normalized input */
  input_char_count: number;
  /** Number of segments */
  segment_count: number;
  /** Segmentation hash (identical to non-streaming) */
  segmentation_hash: string;
  /** Segment metadata (without text if includeText=false) */
  segments: Array<Omit<StreamSegment, "text"> & { text?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 65536; // 64KB

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  return (text.match(/\n/g) || []).length + 1;
}

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Generates a deterministic segment ID.
 * Based on mode, index, start, end (NOT on text content for streaming efficiency).
 */
function generateSegmentId(
  mode: SegmentMode,
  index: number,
  start: number,
  end: number
): string {
  const data = `${mode}:${index}:${start}:${end}`;
  return `seg-${index}-${sha256(data).substring(0, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING SEGMENTER - ITERATOR (yields segments with text for processing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Iterates over segments in streaming fashion.
 * 
 * YIELDS segments WITH text for processing (analyze → DNA).
 * The consumer should NOT store the text in output if memory is a concern.
 * 
 * @param filePath Path to the file
 * @param options Streaming options
 * @yields StreamSegment with text
 */
export async function* iterateSegmentsStreaming(
  filePath: string,
  options: StreamSegmentOptions
): AsyncGenerator<StreamSegment> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const mode = options.mode;
  const onProgress = options.onProgress;
  
  const fileSize = getFileSize(filePath);
  const normalizer = new NewlineNormalizer();
  const carryBuffer = new CarryBuffer(mode);
  
  let segmentIndex = 0;
  let bytesRead = 0;

  const reader = readUTF8Stream(filePath, { chunkSize });
  
  for await (const utf8Chunk of reader) {
    bytesRead += Buffer.byteLength(utf8Chunk.text, "utf8");
    const isLastChunk = bytesRead >= fileSize;
    
    // Normalize newlines
    const normalized = normalizer.normalize(utf8Chunk.text);
    
    // Process through carry buffer
    const result = carryBuffer.process(
      normalized.text,
      normalized.normalizedOffset,
      isLastChunk
    );
    
    // Yield complete segments
    for (let i = 0; i < result.completeSegments.length; i++) {
      const text = result.completeSegments[i];
      const [start, end] = result.segmentOffsets[i];
      
      const segment: StreamSegment = {
        id: generateSegmentId(mode, segmentIndex, start, end),
        index: segmentIndex,
        start,
        end,
        word_count: countWords(text),
        char_count: text.length,
        line_count: countLines(text),
        text,
      };
      
      yield segment;
      segmentIndex++;
    }
    
    // Progress callback
    if (onProgress) {
      onProgress({
        bytesRead,
        totalBytes: fileSize,
        percent: Math.round((bytesRead / fileSize) * 100),
        segmentsEmitted: segmentIndex,
      });
    }
  }
  
  // Flush normalizer (handle any edge case)
  normalizer.flush();
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING SEGMENTER - FULL RESULT (for compatibility with non-streaming)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Segments a file using streaming, returning a result compatible with
 * the non-streaming segmentText() function.
 * 
 * CRITICAL: The segmentation_hash is calculated identically to non-streaming,
 * ensuring INV-STR-01 (streaming == non-streaming).
 * 
 * @param filePath Path to the file
 * @param options Streaming options
 * @returns Segmentation result with hash
 */
export async function segmentFileStreaming(
  filePath: string,
  options: StreamSegmentOptions
): Promise<StreamSegmentationResult> {
  const includeText = options.includeText ?? false;
  const mode = options.mode;
  
  const segments: StreamSegmentationResult["segments"] = [];
  let totalChars = 0;
  
  // Accumulate data for hash calculation
  // Hash is calculated on: mode + segments metadata (NOT on text for large files)
  const hashParts: string[] = [mode];
  
  for await (const segment of iterateSegmentsStreaming(filePath, options)) {
    // Store segment metadata
    const segmentMeta: StreamSegmentationResult["segments"][0] = {
      id: segment.id,
      index: segment.index,
      start: segment.start,
      end: segment.end,
      word_count: segment.word_count,
      char_count: segment.char_count,
      line_count: segment.line_count,
    };
    
    if (includeText) {
      segmentMeta.text = segment.text;
    }
    
    segments.push(segmentMeta);
    totalChars = Math.max(totalChars, segment.end);
    
    // Add to hash: id + offsets (deterministic, text-independent)
    hashParts.push(`${segment.id}:${segment.start}:${segment.end}`);
  }
  
  // Calculate segmentation hash
  // CRITICAL: Must be identical to non-streaming for INV-STR-01
  const segmentation_hash = sha256(hashParts.join("|"));
  
  return {
    mode,
    newline_policy: "normalize_lf",
    input_char_count: totalChars,
    segment_count: segments.length,
    segmentation_hash,
    segments,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH COMPATIBILITY LAYER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the segmentation hash for a list of segments.
 * This can be used to verify streaming vs non-streaming equivalence.
 * 
 * @param mode Segmentation mode
 * @param segments Segment list (needs id, start, end)
 * @returns Segmentation hash
 */
export function calculateSegmentationHash(
  mode: SegmentMode,
  segments: Array<{ id: string; start: number; end: number }>
): string {
  const hashParts = [mode];
  for (const seg of segments) {
    hashParts.push(`${seg.id}:${seg.start}:${seg.end}`);
  }
  return sha256(hashParts.join("|"));
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { SegmentMode } from "./carry_buffer.js";
export { getFileSize, shouldStream } from "./utf8_stream.js";
