/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Anti-Flap Controller
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Prevents rapid switching between providers.
 * INV-RTR-05: Stable routing, no constant oscillation.
 * 
 * @module router/anti_flap
 * @version 3.14.0
 */

import type { ProviderId, AntiFlipConfig } from './types.js';
import { DEFAULT_ANTI_FLAP_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SWITCH RECORD
// ═══════════════════════════════════════════════════════════════════════════════

interface SwitchRecord {
  readonly from_provider: ProviderId;
  readonly to_provider: ProviderId;
  readonly timestamp_ms: number;
}

interface StickyState {
  readonly provider_id: ProviderId;
  readonly category: string;
  readonly assigned_at_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FLAP CONTROLLER - INV-RTR-05
// ═══════════════════════════════════════════════════════════════════════════════

export class AntiFlipController {
  private config: AntiFlipConfig;
  private switchHistory: SwitchRecord[] = [];
  private stickyAssignments = new Map<string, StickyState>();
  
  constructor(config?: Partial<AntiFlipConfig>) {
    this.config = Object.freeze({ ...DEFAULT_ANTI_FLAP_CONFIG, ...config });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get current configuration
   */
  getConfig(): AntiFlipConfig {
    return this.config;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STICKY ROUTING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get sticky provider for a category
   * Returns undefined if no sticky assignment or expired
   */
  getStickyProvider(category: string, now_ms: number): ProviderId | undefined {
    const sticky = this.stickyAssignments.get(category);
    if (!sticky) return undefined;
    
    const elapsed = now_ms - sticky.assigned_at_ms;
    if (elapsed > this.config.sticky_duration_ms) {
      // Expired
      this.stickyAssignments.delete(category);
      return undefined;
    }
    
    return sticky.provider_id;
  }
  
  /**
   * Set sticky provider for a category
   */
  setStickyProvider(category: string, provider_id: ProviderId, now_ms: number): void {
    this.stickyAssignments.set(category, Object.freeze({
      provider_id,
      category,
      assigned_at_ms: now_ms,
    }));
  }
  
  /**
   * Clear sticky assignment for a category
   */
  clearStickyProvider(category: string): void {
    this.stickyAssignments.delete(category);
  }
  
  /**
   * Check if sticky assignment is still valid
   */
  isStickyValid(category: string, now_ms: number): boolean {
    return this.getStickyProvider(category, now_ms) !== undefined;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SWITCH DECISION - INV-RTR-05
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Should we allow switching to a new provider?
   * Returns true if switch is allowed, false if should stay with current.
   */
  shouldAllowSwitch(params: {
    current_provider: ProviderId;
    new_provider: ProviderId;
    current_score: number;
    new_score: number;
    now_ms: number;
  }): boolean {
    const { current_provider, new_provider, current_score, new_score, now_ms } = params;
    
    // Same provider = no switch needed
    if (current_provider === new_provider) {
      return true; // Not really a switch
    }
    
    // Check score threshold
    const score_diff = new_score - current_score;
    if (score_diff < this.config.switch_threshold) {
      // Score difference not significant enough to justify switch
      return false;
    }
    
    // Check switch rate limit
    this.cleanOldSwitches(now_ms);
    if (this.switchHistory.length >= this.config.max_switches) {
      // Too many switches in the window
      return false;
    }
    
    return true;
  }
  
  /**
   * Record a switch (call after actually switching)
   */
  recordSwitch(from_provider: ProviderId, to_provider: ProviderId, now_ms: number): void {
    this.switchHistory.push(Object.freeze({
      from_provider,
      to_provider,
      timestamp_ms: now_ms,
    }));
    
    // Clean old entries
    this.cleanOldSwitches(now_ms);
  }
  
  /**
   * Get recent switch count
   */
  getRecentSwitchCount(now_ms: number): number {
    this.cleanOldSwitches(now_ms);
    return this.switchHistory.length;
  }
  
  /**
   * Clean switches outside the window
   */
  private cleanOldSwitches(now_ms: number): void {
    const cutoff = now_ms - this.config.switch_window_ms;
    this.switchHistory = this.switchHistory.filter(s => s.timestamp_ms > cutoff);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER DOWN HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Force clear sticky for a downed provider
   * (Bypass normal switch rules when provider fails)
   */
  clearStickyForProvider(provider_id: ProviderId): number {
    let cleared = 0;
    for (const [category, sticky] of this.stickyAssignments.entries()) {
      if (sticky.provider_id === provider_id) {
        this.stickyAssignments.delete(category);
        cleared++;
      }
    }
    return cleared;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATS & RESET
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get controller statistics
   */
  getStats(): {
    sticky_count: number;
    recent_switches: number;
    config: AntiFlipConfig;
  } {
    return {
      sticky_count: this.stickyAssignments.size,
      recent_switches: this.switchHistory.length,
      config: this.config,
    };
  }
  
  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.switchHistory = [];
    this.stickyAssignments.clear();
  }
}
