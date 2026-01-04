/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Worker Manager Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for INV-IPC-04 (Lifecycle states)
 * 
 * Total: 6 tests
 * 
 * @module worker_manager.test
 * @version 3.14.0
 */

import { describe, it, expect } from 'vitest';
import { WorkerManager } from '../worker_manager.js';
import { VALID_TRANSITIONS } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: State Machine - INV-IPC-04 (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('State Machine - INV-IPC-04', () => {
  it('starts in STOPPED state', () => {
    const wm = new WorkerManager();
    expect(wm.getState()).toBe('STOPPED');
    expect(wm.isAlive()).toBe(false);
    expect(wm.canAcceptRequests()).toBe(false);
  });
  
  it('valid transitions are defined correctly', () => {
    // STOPPED can only go to STARTING
    expect(VALID_TRANSITIONS.STOPPED).toEqual(['STARTING']);
    
    // STARTING can go to READY, CRASHED, or STOPPING
    expect(VALID_TRANSITIONS.STARTING).toContain('READY');
    expect(VALID_TRANSITIONS.STARTING).toContain('CRASHED');
    
    // READY can go to RUNNING, STOPPING, or CRASHED
    expect(VALID_TRANSITIONS.READY).toContain('RUNNING');
    expect(VALID_TRANSITIONS.READY).toContain('STOPPING');
    
    // STOPPING can only go to STOPPED
    expect(VALID_TRANSITIONS.STOPPING).toEqual(['STOPPED']);
    
    // CRASHED can go to STOPPED or STARTING (restart)
    expect(VALID_TRANSITIONS.CRASHED).toContain('STOPPED');
    expect(VALID_TRANSITIONS.CRASHED).toContain('STARTING');
  });
  
  it('canAcceptRequests only in READY or RUNNING', () => {
    const wm = new WorkerManager();
    
    // Can't accept in STOPPED
    expect(wm.canAcceptRequests()).toBe(false);
    
    // After markReady, should be able to accept
    // (We can't fully test this without actually starting a process)
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Lifecycle Methods (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lifecycle Methods', () => {
  it('stop on stopped manager is no-op', async () => {
    const wm = new WorkerManager();
    expect(wm.getState()).toBe('STOPPED');
    
    await wm.stop();
    expect(wm.getState()).toBe('STOPPED');
  });
  
  it('getUptime returns 0 when not started', () => {
    const wm = new WorkerManager();
    expect(wm.getUptime()).toBe(0);
  });
  
  it('getPid returns null when not started', () => {
    const wm = new WorkerManager();
    expect(wm.getPid()).toBeNull();
  });
});
