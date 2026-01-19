/**
 * Registry Tests - NASA-Grade brutal
 * CORRECTION #3: Uses __clearForTests()
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as Registry from '../src/registry/registry.js';
import type { SourceMetadata } from '../src/types.js';

describe('Registry', () => {
  beforeEach(() => {
    Registry.__clearForTests();
  });

  describe('register', () => {
    it('should register valid source', () => {
      // Arrange
      const meta: SourceMetadata = {
        sourceId: 'src-1',
        name: 'Test Source',
        version: '1.0.0',
      };

      // Act
      Registry.register(meta);

      // Assert
      expect(Registry.has('src-1')).toBe(true);
      expect(Registry.get('src-1')).toEqual(meta);
    });

    it('should reject duplicate sourceId', () => {
      // Arrange
      const meta: SourceMetadata = {
        sourceId: 'src-1',
        name: 'Test',
        version: '1.0.0',
      };

      // Act
      Registry.register(meta);

      // Assert
      expect(() => Registry.register(meta)).toThrow(
        'Source already registered: src-1'
      );
    });

    it('should freeze metadata', () => {
      const meta: SourceMetadata = {
        sourceId: 'src-1',
        name: 'Test',
        version: '1.0.0',
      };

      Registry.register(meta);
      const retrieved = Registry.get('src-1')!;

      expect(() => {
        (retrieved as { name: string }).name = 'Changed';
      }).toThrow();
    });
  });

  describe('get', () => {
    it('should return undefined for unknown sourceId', () => {
      expect(Registry.get('unknown')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return false for unknown sourceId', () => {
      expect(Registry.has('unknown')).toBe(false);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle empty sourceId', () => {
      const meta: SourceMetadata = {
        sourceId: '',
        name: 'Empty',
        version: '1.0.0',
      };

      Registry.register(meta);
      expect(Registry.has('')).toBe(true);
    });

    it('should handle 100 sources', () => {
      for (let i = 0; i < 100; i++) {
        Registry.register({
          sourceId: `src-${i}`,
          name: `Source ${i}`,
          version: '1.0.0',
        });
      }
      expect(Registry.has('src-99')).toBe(true);
    });
  });
});
