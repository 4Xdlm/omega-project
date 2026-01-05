/**
 * OMEGA SENTINEL — Payload Size Tests
 * Phase 16.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Sentinel, SentinelStatus, BlockReason, MAX_PAYLOAD_SIZE } from '../src/sentinel/index.js';

describe('SENTINEL checkPayloadSize', () => {
  let sentinel: Sentinel;

  beforeEach(() => {
    sentinel = new Sentinel();
  });

  describe('valid payloads', () => {
    it('passes empty object', () => {
      const result = sentinel.checkPayloadSize({});
      expect(result.status).toBe(SentinelStatus.PASS);
      expect(result.payloadSize).toBeLessThan(MAX_PAYLOAD_SIZE);
    });

    it('passes empty array', () => {
      const result = sentinel.checkPayloadSize([]);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes null', () => {
      const result = sentinel.checkPayloadSize(null);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes small string', () => {
      const result = sentinel.checkPayloadSize('hello world');
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes complex nested object', () => {
      const input = {
        user: { name: 'John', age: 30 },
        items: [1, 2, 3, 4, 5],
        metadata: { created: '2025-01-01' },
      };
      const result = sentinel.checkPayloadSize(input);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('passes 1MB payload', () => {
      const largeString = 'x'.repeat(1024 * 1024); // 1MB
      const result = sentinel.checkPayloadSize(largeString);
      expect(result.status).toBe(SentinelStatus.PASS);
    });
  });

  describe('oversized payloads (INV-SEN-02)', () => {
    it('blocks payload over 2MB', () => {
      const hugeString = 'x'.repeat(2.5 * 1024 * 1024); // 2.5MB
      const result = sentinel.checkPayloadSize(hugeString);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.reason).toBe(BlockReason.PAYLOAD_TOO_LARGE);
    });

    it('blocks exactly at limit + 1 byte', () => {
      // Create string that will be just over limit when JSON serialized
      const sentinel2MB = new Sentinel({ maxPayloadSize: 100 });
      const result = sentinel2MB.checkPayloadSize('x'.repeat(100));
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks large array', () => {
      const sentinel1KB = new Sentinel({ maxPayloadSize: 1000 });
      const largeArray = Array(500).fill('test');
      const result = sentinel1KB.checkPayloadSize(largeArray);
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('custom limits', () => {
    it('uses custom maxPayloadSize', () => {
      const sentinel100B = new Sentinel({ maxPayloadSize: 100 });
      const result = sentinel100B.checkPayloadSize('x'.repeat(200));
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('passes with increased limit', () => {
      const sentinel10MB = new Sentinel({ maxPayloadSize: 10 * 1024 * 1024 });
      const large = 'x'.repeat(5 * 1024 * 1024);
      const result = sentinel10MB.checkPayloadSize(large);
      expect(result.status).toBe(SentinelStatus.PASS);
    });
  });

  describe('timestamp presence (INV-SEN-05)', () => {
    it('always includes timestamp in result', () => {
      const result1 = sentinel.checkPayloadSize({});
      const result2 = sentinel.checkPayloadSize('x'.repeat(3 * 1024 * 1024));
      
      expect(result1.timestamp).toBeDefined();
      expect(result2.timestamp).toBeDefined();
      expect(new Date(result1.timestamp).getTime()).toBeGreaterThan(0);
      expect(new Date(result2.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('duration measurement', () => {
    it('includes durationMs in result', () => {
      const result = sentinel.checkPayloadSize({ data: 'test' });
      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
