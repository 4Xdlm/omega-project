// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA STREAMING v2 — UTF8 STREAM READER
// ═══════════════════════════════════════════════════════════════════════════════
// Lecture streaming avec gestion des UTF-8 boundaries
// Standard: NASA-Grade L4
//
// PROBLÈME RÉSOLU:
//   Un caractère UTF-8 peut faire 1-4 bytes. Un chunk de 64KB peut couper
//   un caractère multi-byte au milieu → corruption.
//   
// SOLUTION:
//   TextDecoder avec stream:true accumule les bytes incomplets et les
//   traite au chunk suivant.
//
// INVARIANT:
//   INV-UTF8-01: Aucun caractère corrompu, même avec chunks arbitraires
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import { TextDecoder } from "node:util";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UTF8StreamOptions {
  /** Chunk size in bytes (default: 65536 = 64KB) */
  chunkSize?: number;
  /** Encoding (always utf-8 for OMEGA) */
  encoding?: "utf-8";
}

export interface UTF8Chunk {
  /** Decoded string (UTF-8 safe) */
  text: string;
  /** Byte offset in original file */
  byteOffset: number;
  /** Is this the last chunk? */
  isLast: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 65536; // 64KB

// ─────────────────────────────────────────────────────────────────────────────
// UTF8 STREAM READER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads a file as UTF-8 chunks, handling multi-byte character boundaries safely.
 * 
 * GUARANTEE: No character will ever be corrupted, even if a chunk boundary
 * falls in the middle of a multi-byte UTF-8 sequence.
 * 
 * @param filePath Path to the file
 * @param options Stream options
 * @yields UTF8Chunk with decoded text
 */
export async function* readUTF8Stream(
  filePath: string,
  options: UTF8StreamOptions = {}
): AsyncGenerator<UTF8Chunk> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  
  // TextDecoder with stream:true handles incomplete multi-byte sequences
  const decoder = new TextDecoder("utf-8", { 
    fatal: false,  // Don't throw on invalid sequences
    ignoreBOM: true 
  });
  
  const stream = fs.createReadStream(filePath, {
    highWaterMark: chunkSize,
  });
  
  let byteOffset = 0;

  try {
    for await (const chunk of stream) {
      const buffer = chunk as Buffer;

      // Decode with stream:true to handle UTF-8 boundaries
      const text = decoder.decode(buffer, { stream: true });

      if (text.length > 0) {
        yield {
          text,
          byteOffset,
          isLast: false,
        };
      }

      byteOffset += buffer.length;
    }
    
    // Flush any remaining bytes in the decoder
    const remaining = decoder.decode(new Uint8Array(), { stream: false });
    if (remaining.length > 0) {
      yield {
        text: remaining,
        byteOffset,
        isLast: true,
      };
    } else {
      // Mark the last yielded chunk as final
      // (handled by consumer checking for end of iteration)
    }
  } finally {
    stream.destroy();
  }
}

/**
 * Gets file size in bytes without reading the entire file.
 * 
 * @param filePath Path to the file
 * @returns File size in bytes
 */
export function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Checks if a file should use streaming based on size threshold.
 * 
 * @param filePath Path to the file
 * @param thresholdMB Threshold in megabytes (default: 50MB)
 * @returns true if file should be streamed
 */
export function shouldStream(filePath: string, thresholdMB: number = 50): boolean {
  const size = getFileSize(filePath);
  const thresholdBytes = thresholdMB * 1024 * 1024;
  return size > thresholdBytes;
}
