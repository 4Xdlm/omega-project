/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Bridge Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Integration tests for PythonBridge.
 * These tests require Python to be installed.
 * 
 * Total: 10 tests
 * 
 * @module bridge.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { PythonBridge, BridgeError, createBridge } from '../bridge.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const WORKER_PATH = path.resolve(__dirname, '../../py_worker/llm_worker_stub.py');

const TEST_CONFIG = {
  scriptPath: WORKER_PATH,
  pythonPath: 'python',
  default_timeout_ms: 2000,
  spawn_timeout_ms: 5000,
  max_inflight: 8,
  max_queue_size: 16,
  heartbeat_interval_ms: 60000, // Disable heartbeat during tests
  heartbeat_timeout_ms: 1000,
  circuit_failure_threshold: 5,
  circuit_reset_timeout_ms: 10000,
  max_retries: 0,
  retry_delay_ms: 100,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PythonBridge Integration', () => {
  let bridge: PythonBridge;
  
  beforeEach(() => {
    bridge = new PythonBridge(TEST_CONFIG);
  });
  
  afterEach(async () => {
    if (bridge.isReady()) {
      await bridge.stop();
    }
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Lifecycle (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Lifecycle', () => {
    it('starts and becomes ready', async () => {
      expect(bridge.isReady()).toBe(false);
      
      await bridge.start();
      
      expect(bridge.isReady()).toBe(true);
      expect(bridge.getWorkerState()).toBe('RUNNING');
      expect(bridge.getWorkerId()).toBeTruthy();
    });
    
    it('stops gracefully', async () => {
      await bridge.start();
      expect(bridge.isReady()).toBe(true);
      
      await bridge.stop();
      
      expect(bridge.isReady()).toBe(false);
      expect(bridge.getWorkerState()).toBe('STOPPED');
    });
    
    it('cannot start twice', async () => {
      await bridge.start();
      await expect(bridge.start()).rejects.toThrow(/already started/);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: RPC Calls - INV-IPC-01 (4 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('RPC Calls - INV-IPC-01', () => {
    it('ping returns pong', async () => {
      await bridge.start();
      
      const result = await bridge.call<{ pong: boolean }>('ping');
      
      expect(result.pong).toBe(true);
    });
    
    it('echo returns params', async () => {
      await bridge.start();
      
      const params = { message: 'hello', count: 42 };
      const result = await bridge.call('echo', params);
      
      expect(result).toEqual(params);
    });
    
    it('multiple concurrent calls resolve correctly', async () => {
      await bridge.start();
      
      const results = await Promise.all([
        bridge.call('echo', { id: 1 }),
        bridge.call('echo', { id: 2 }),
        bridge.call('echo', { id: 3 }),
      ]);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toEqual({ id: 2 });
      expect(results[2]).toEqual({ id: 3 });
    });
    
    it('compute method works', async () => {
      await bridge.start();
      
      const add = await bridge.call<{ result: number }>('compute', { op: 'add', a: 5, b: 3 });
      expect(add.result).toBe(8);
      
      const mul = await bridge.call<{ result: number }>('compute', { op: 'multiply', a: 4, b: 7 });
      expect(mul.result).toBe(28);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Error Handling (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Error Handling', () => {
    it('method not found returns error', async () => {
      await bridge.start();
      
      await expect(bridge.call('nonexistent_method')).rejects.toThrow(/Method not found/);
    });
    
    it('error_test returns custom error', async () => {
      await bridge.start();
      
      await expect(bridge.call('error_test', { code: -32000, message: 'Custom error' }))
        .rejects.toThrow(/Custom error/);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Timeout - INV-IPC-02 (1 test)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Timeout - INV-IPC-02', () => {
    it('times out on slow response', async () => {
      await bridge.start();
      
      // Sleep for 500ms but timeout after 100ms
      await expect(bridge.call('sleep', { ms: 500 }, 100))
        .rejects.toThrow(/Timeout/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY TEST
// ═══════════════════════════════════════════════════════════════════════════════

describe('createBridge factory', () => {
  it('creates configured bridge', () => {
    const bridge = createBridge(WORKER_PATH, { default_timeout_ms: 5000 });
    expect(bridge).toBeInstanceOf(PythonBridge);
    expect(bridge.getConfig().default_timeout_ms).toBe(5000);
  });
});
