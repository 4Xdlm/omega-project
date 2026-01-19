/**
 * Path Utilities Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeKey,
  createSafePath,
  extractKey,
  getMetadataPath,
  isMetadataPath,
  getDataPathFromMetadata,
} from '../src/utils/paths.js';
import { RawPathTraversalError, RawPathInvalidError } from '../src/errors.js';

describe('Path Utilities', () => {
  describe('sanitizeKey', () => {
    it('accepts simple key', () => {
      expect(sanitizeKey('file.txt')).toBe('file.txt');
    });

    it('accepts nested path', () => {
      expect(sanitizeKey('a/b/c.txt')).toBe('a/b/c.txt');
    });

    it('normalizes backslashes to forward slashes', () => {
      expect(sanitizeKey('a\\b\\c.txt')).toBe('a/b/c.txt');
    });

    it('removes redundant slashes', () => {
      expect(sanitizeKey('a//b///c.txt')).toBe('a/b/c.txt');
    });

    it('removes current directory markers', () => {
      expect(sanitizeKey('./a/./b/./c.txt')).toBe('a/b/c.txt');
    });

    it('blocks path traversal with ..', () => {
      expect(() => sanitizeKey('../etc/passwd')).toThrow(RawPathTraversalError);
      expect(() => sanitizeKey('a/../b')).toThrow(RawPathTraversalError);
      expect(() => sanitizeKey('a/b/..')).toThrow(RawPathTraversalError);
    });

    it('blocks hidden files', () => {
      expect(() => sanitizeKey('.hidden')).toThrow(RawPathInvalidError);
      expect(() => sanitizeKey('a/.hidden/b')).toThrow(RawPathInvalidError);
    });

    it('blocks invalid characters', () => {
      expect(() => sanitizeKey('file name.txt')).toThrow(RawPathInvalidError);
      expect(() => sanitizeKey('file<name>.txt')).toThrow(RawPathInvalidError);
      expect(() => sanitizeKey('file:name.txt')).toThrow(RawPathInvalidError);
    });

    it('rejects empty key', () => {
      expect(() => sanitizeKey('')).toThrow(RawPathInvalidError);
    });

    it('rejects key that becomes empty after sanitization', () => {
      expect(() => sanitizeKey('./.')).toThrow(RawPathInvalidError);
    });

    it('accepts alphanumeric with dash, underscore, dot', () => {
      expect(sanitizeKey('my-file_name.2024.txt')).toBe('my-file_name.2024.txt');
    });

    it('handles URL encoded path traversal', () => {
      expect(() => sanitizeKey('%2e%2e/etc/passwd')).toThrow(RawPathTraversalError);
    });
  });

  describe('createSafePath', () => {
    it('creates path within root', () => {
      expect(createSafePath('/data', 'file.txt')).toBe('/data/file.txt');
    });

    it('handles nested key', () => {
      expect(createSafePath('/data', 'a/b/c.txt')).toBe('/data/a/b/c.txt');
    });

    it('normalizes root backslashes', () => {
      expect(createSafePath('C:\\data', 'file.txt')).toBe('C:/data/file.txt');
    });
  });

  describe('extractKey', () => {
    it('extracts key from full path', () => {
      expect(extractKey('/data', '/data/file.txt')).toBe('file.txt');
    });

    it('handles nested paths', () => {
      expect(extractKey('/data', '/data/a/b/c.txt')).toBe('a/b/c.txt');
    });

    it('throws when path not within root', () => {
      expect(() => extractKey('/data', '/other/file.txt')).toThrow(
        RawPathInvalidError
      );
    });
  });

  describe('getMetadataPath', () => {
    it('appends .meta.json suffix', () => {
      expect(getMetadataPath('/data/file.txt')).toBe('/data/file.txt.meta.json');
    });
  });

  describe('isMetadataPath', () => {
    it('returns true for metadata paths', () => {
      expect(isMetadataPath('file.txt.meta.json')).toBe(true);
    });

    it('returns false for data paths', () => {
      expect(isMetadataPath('file.txt')).toBe(false);
      expect(isMetadataPath('file.meta.txt')).toBe(false);
    });
  });

  describe('getDataPathFromMetadata', () => {
    it('removes .meta.json suffix', () => {
      expect(getDataPathFromMetadata('/data/file.txt.meta.json')).toBe(
        '/data/file.txt'
      );
    });

    it('throws for non-metadata path', () => {
      expect(() => getDataPathFromMetadata('/data/file.txt')).toThrow(
        RawPathInvalidError
      );
    });
  });
});
