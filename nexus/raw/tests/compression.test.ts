/**
 * Compression Utilities Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import {
  compress,
  decompress,
  isGzipCompressed,
  compressionRatio,
} from '../src/utils/compression.js';
import { RawDecompressionError } from '../src/errors.js';

describe('Compression Utilities', () => {
  describe('compress', () => {
    it('compresses data', async () => {
      const data = Buffer.from('Hello, World!'.repeat(100));
      const result = await compress(data);

      expect(result.data.length).toBeLessThan(data.length);
      expect(result.algorithm).toBe('gzip');
      expect(result.originalSize).toBe(data.length);
      expect(result.compressedSize).toBe(result.data.length);
    });

    it('handles empty buffer', async () => {
      const data = Buffer.alloc(0);
      const result = await compress(data);

      expect(result.originalSize).toBe(0);
    });

    it('compresses small data', async () => {
      const data = Buffer.from('Hi');
      const result = await compress(data);

      // Small data may not compress well but should still work
      expect(result.data).toBeDefined();
      expect(result.originalSize).toBe(2);
    });
  });

  describe('decompress', () => {
    it('decompresses compressed data', async () => {
      const original = Buffer.from('Hello, World!'.repeat(100));
      const compressed = await compress(original);
      const decompressed = await decompress(compressed.data);

      expect(decompressed.equals(original)).toBe(true);
    });

    it('throws on invalid compressed data', async () => {
      const invalidData = Buffer.from('not compressed');

      await expect(decompress(invalidData)).rejects.toThrow(
        RawDecompressionError
      );
    });
  });

  describe('isGzipCompressed', () => {
    it('returns true for gzip data', async () => {
      const original = Buffer.from('Hello');
      const compressed = await compress(original);

      expect(isGzipCompressed(compressed.data)).toBe(true);
    });

    it('returns false for uncompressed data', () => {
      const data = Buffer.from('Hello');

      expect(isGzipCompressed(data)).toBe(false);
    });

    it('returns false for short data', () => {
      const data = Buffer.from([0x1f]); // Only one magic byte

      expect(isGzipCompressed(data)).toBe(false);
    });
  });

  describe('compressionRatio', () => {
    it('calculates ratio correctly', async () => {
      const data = Buffer.from('Hello, World!'.repeat(100));
      const result = await compress(data);
      const ratio = compressionRatio(result);

      expect(ratio).toBeLessThan(1); // Should compress
      expect(ratio).toBeGreaterThan(0);
    });

    it('returns 1 for empty data', () => {
      const result = {
        data: Buffer.alloc(0),
        algorithm: 'gzip' as const,
        originalSize: 0,
        compressedSize: 0,
      };

      expect(compressionRatio(result)).toBe(1);
    });
  });
});
