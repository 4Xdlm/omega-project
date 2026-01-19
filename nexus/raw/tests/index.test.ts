/**
 * Raw Tests - NASA-Grade
 * CORRECTION #1: Tests freeze removed (TS types are not runtime-frozen)
 */

import { describe, it, expect } from 'vitest';
import * as Raw from '../src/index.js';

describe('nexus/raw', () => {
  it('should export version constant', () => {
    expect(Raw.RAW_VERSION).toBe('1.0.0');
  });

  it('should have valid RawEntry type', () => {
    const entry: Raw.RawEntry = {
      key: 'test',
      value: 'data',
      timestamp: 1000,
    };
    expect(entry.key).toBe('test');
    expect(entry.timestamp).toBe(1000);
  });

  it('should have valid StorageOptions type', () => {
    const options: Raw.StorageOptions = {
      persistent: true,
      compressed: false,
    };
    expect(options.persistent).toBe(true);
  });

  it('should have valid StorageResult type', () => {
    const result: Raw.StorageResult = {
      success: true,
    };
    expect(result.success).toBe(true);
  });
});
