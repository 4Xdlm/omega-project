/**
 * Compression Utilities
 * Standard: NASA-Grade L4
 *
 * Uses gzip compression
 */

import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import type { CompressionResult, CompressionAlgorithm } from '../types.js';
import { RawCompressionError, RawDecompressionError } from '../errors.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ============================================================
// Compression
// ============================================================

/**
 * Compresses data using gzip.
 */
export async function compress(data: Buffer): Promise<CompressionResult> {
  try {
    const compressed = await gzipAsync(data, { level: 6 });

    return Object.freeze({
      data: compressed,
      algorithm: 'gzip' as CompressionAlgorithm,
      originalSize: data.length,
      compressedSize: compressed.length,
    });
  } catch (error) {
    throw new RawCompressionError('Compression failed', {
      originalSize: data.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Decompresses gzip data.
 */
export async function decompress(data: Buffer): Promise<Buffer> {
  try {
    return await gunzipAsync(data);
  } catch (error) {
    throw new RawDecompressionError('Decompression failed', {
      compressedSize: data.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Checks if data is gzip compressed by checking magic bytes.
 */
export function isGzipCompressed(data: Buffer): boolean {
  // Gzip magic bytes: 0x1f 0x8b
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

/**
 * Returns the compression ratio (compressed/original).
 * Lower is better. 0.5 = 50% of original size.
 */
export function compressionRatio(result: CompressionResult): number {
  if (result.originalSize === 0) return 1;
  return result.compressedSize / result.originalSize;
}
