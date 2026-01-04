/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Request Tracker Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for:
 * - INV-IPC-01: Request/Response matching by ID
 * - INV-IPC-02: Timeout deterministic
 * 
 * Total: 8 tests
 * 
 * @module request_tracker.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestTracker, RequestError } from '../request_tracker.js';
import { JSON_RPC_ERRORS } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════

describe('Request Tracker', () => {
  let tracker: RequestTracker;
  
  beforeEach(() => {
    vi.useFakeTimers();
    tracker = new RequestTracker();
    // Prevent unhandled error events
    tracker.on('error', () => {});
    tracker.on('timeout', () => {});
    tracker.on('orphan_response', () => {});
  });
  
  afterEach(() => {
    tracker.reset();
    vi.useRealTimers();
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: ID Generation - INV-IPC-01 (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('ID Generation - INV-IPC-01', () => {
    it('generates monotonic IDs starting at 1', () => {
      expect(tracker.generateId()).toBe(1);
      expect(tracker.generateId()).toBe(2);
      expect(tracker.generateId()).toBe(3);
    });
    
    it('rejects duplicate IDs', () => {
      tracker.track(1, 'test', 'corr1', 1000, () => {}, () => {});
      
      expect(() => {
        tracker.track(1, 'test', 'corr2', 1000, () => {}, () => {});
      }).toThrow(/Duplicate request ID/);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Request/Response Matching - INV-IPC-01 (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Request/Response Matching - INV-IPC-01', () => {
    it('resolves tracked request on success response', async () => {
      const result = new Promise((resolve, reject) => {
        tracker.track(1, 'test', 'corr1', 1000, resolve, reject);
      });
      
      tracker.resolve({ jsonrpc: '2.0', id: 1, result: { ok: true } });
      
      await expect(result).resolves.toEqual({ ok: true });
      expect(tracker.getPendingCount()).toBe(0);
    });
    
    it('rejects tracked request on error response', async () => {
      const result = new Promise((resolve, reject) => {
        tracker.track(1, 'test', 'corr1', 1000, resolve, reject);
      });
      
      tracker.resolve({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32600, message: 'Test error' }
      });
      
      await expect(result).rejects.toThrow(RequestError);
    });
    
    it('returns false for orphan response (no matching request)', () => {
      const matched = tracker.resolve({ jsonrpc: '2.0', id: 999, result: {} });
      expect(matched).toBe(false);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Timeout - INV-IPC-02 (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Timeout - INV-IPC-02', () => {
    it('rejects with timeout error after specified time', async () => {
      const result = new Promise((resolve, reject) => {
        tracker.track(1, 'test', 'corr1', 100, resolve, reject);
      });
      
      // Fast-forward time
      vi.advanceTimersByTime(100);
      
      await expect(result).rejects.toThrow(RequestError);
      await expect(result).rejects.toThrow(/Timeout/);
      
      const metrics = tracker.getMetrics();
      expect(metrics.total_timeouts).toBe(1);
    });
    
    it('does not timeout if response arrives in time', async () => {
      const result = new Promise((resolve, reject) => {
        tracker.track(1, 'test', 'corr1', 100, resolve, reject);
      });
      
      // Response before timeout
      tracker.resolve({ jsonrpc: '2.0', id: 1, result: { ok: true } });
      
      // Advance time past timeout
      vi.advanceTimersByTime(200);
      
      await expect(result).resolves.toEqual({ ok: true });
      expect(tracker.getMetrics().total_timeouts).toBe(0);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Bulk Operations (1 test)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Bulk Operations', () => {
    it('rejectAll rejects all pending requests', async () => {
      const results = [
        new Promise((resolve, reject) => tracker.track(1, 't1', 'c1', 1000, resolve, reject)),
        new Promise((resolve, reject) => tracker.track(2, 't2', 'c2', 1000, resolve, reject)),
        new Promise((resolve, reject) => tracker.track(3, 't3', 'c3', 1000, resolve, reject)),
      ];
      
      expect(tracker.getPendingCount()).toBe(3);
      
      tracker.rejectAll('Bridge stopped');
      
      for (const r of results) {
        await expect(r).rejects.toThrow(/Bridge stopped/);
      }
      
      expect(tracker.getPendingCount()).toBe(0);
      expect(tracker.getMetrics().total_failures).toBe(3);
    });
  });
});
