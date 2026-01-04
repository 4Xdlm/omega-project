/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Anti-Flap Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for INV-RTR-05 (stable routing, no oscillation).
 * 
 * Total: 6 tests
 * 
 * @module router/tests/anti_flap.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AntiFlipController } from '../anti_flap.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Anti-Flap Controller - INV-RTR-05', () => {
  let controller: AntiFlipController;
  
  beforeEach(() => {
    controller = new AntiFlipController({
      sticky_duration_ms: 60000,
      switch_threshold: 50,
      max_switches: 3,
      switch_window_ms: 300000,
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Sticky Routing (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Sticky Routing', () => {
    it('setStickyProvider and getStickyProvider work correctly', () => {
      controller.setStickyProvider('category1', 'provider-A', 1000);
      
      expect(controller.getStickyProvider('category1', 2000)).toBe('provider-A');
      expect(controller.getStickyProvider('category2', 2000)).toBeUndefined();
    });
    
    it('sticky provider expires after duration', () => {
      controller.setStickyProvider('category1', 'provider-A', 1000);
      
      // Still valid within duration
      expect(controller.getStickyProvider('category1', 50000)).toBe('provider-A');
      
      // Expired after duration (1000 + 60000 = 61000)
      expect(controller.getStickyProvider('category1', 62000)).toBeUndefined();
    });
    
    it('clearStickyForProvider removes all stickies for provider', () => {
      controller.setStickyProvider('cat1', 'provider-A', 1000);
      controller.setStickyProvider('cat2', 'provider-A', 1000);
      controller.setStickyProvider('cat3', 'provider-B', 1000);
      
      const cleared = controller.clearStickyForProvider('provider-A');
      
      expect(cleared).toBe(2);
      expect(controller.getStickyProvider('cat1', 2000)).toBeUndefined();
      expect(controller.getStickyProvider('cat2', 2000)).toBeUndefined();
      expect(controller.getStickyProvider('cat3', 2000)).toBe('provider-B');
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Switch Control (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Switch Control', () => {
    it('allows switch when score difference exceeds threshold', () => {
      const allowed = controller.shouldAllowSwitch({
        current_provider: 'A',
        new_provider: 'B',
        current_score: 100,
        new_score: 160, // Difference = 60 > threshold 50
        now_ms: 1000,
      });
      
      expect(allowed).toBe(true);
    });
    
    it('blocks switch when score difference is below threshold', () => {
      const allowed = controller.shouldAllowSwitch({
        current_provider: 'A',
        new_provider: 'B',
        current_score: 100,
        new_score: 130, // Difference = 30 < threshold 50
        now_ms: 1000,
      });
      
      expect(allowed).toBe(false);
    });
    
    it('blocks switch when max switches reached in window', () => {
      // Record 3 switches (max)
      controller.recordSwitch('A', 'B', 1000);
      controller.recordSwitch('B', 'C', 2000);
      controller.recordSwitch('C', 'D', 3000);
      
      expect(controller.getRecentSwitchCount(4000)).toBe(3);
      
      // Should block even with high score difference
      const allowed = controller.shouldAllowSwitch({
        current_provider: 'D',
        new_provider: 'E',
        current_score: 100,
        new_score: 200,
        now_ms: 4000,
      });
      
      expect(allowed).toBe(false);
    });
  });
});
