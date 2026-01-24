/**
 * OMEGA V4.4 — Phase 5: Window Manager
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Multi-window management:
 * - Short: Recent activity
 * - Medium: Session-level patterns
 * - Long: Historical trends
 *
 * Window = min(N snapshots, T duration)
 */

import type { Snapshot } from '../phase3_snapshot/index.js';
import type { WindowConfig, WindowedSnapshots, WindowType } from './types.js';
import { DEFAULT_WINDOW_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// WINDOW MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Window Manager - Multi-level temporal windowing
 */
export class WindowManager {
  private readonly config: WindowConfig;

  constructor(config: Partial<WindowConfig> = {}) {
    this.config = { ...DEFAULT_WINDOW_CONFIG, ...config };
  }

  /**
   * Get windowed snapshots
   */
  getWindows(snapshots: readonly Snapshot[], referenceTime?: number): WindowedSnapshots {
    const now = referenceTime ?? Date.now();

    return {
      short: this.getWindow(snapshots, this.config.SHORT_N, this.config.SHORT_T, now),
      medium: this.getWindow(snapshots, this.config.MEDIUM_N, this.config.MEDIUM_T, now),
      long: this.getWindow(snapshots, this.config.LONG_N, this.config.LONG_T, now),
    };
  }

  /**
   * Get a single window
   * Window = min(N snapshots, T duration)
   */
  private getWindow(
    snapshots: readonly Snapshot[],
    maxN: number,
    maxT: number,
    now: number
  ): readonly Snapshot[] {
    // Filter by time
    const timeFiltered = snapshots.filter(s => (now - s.timestamp) <= maxT);

    // Take last N
    return timeFiltered.slice(-maxN);
  }

  /**
   * Determine window type for a snapshot
   */
  getWindowType(snapshot: Snapshot, allSnapshots: readonly Snapshot[]): WindowType {
    const now = Date.now();
    const age = now - snapshot.timestamp;
    const index = allSnapshots.indexOf(snapshot);
    const fromEnd = allSnapshots.length - 1 - index;

    // Check short window
    if (age <= this.config.SHORT_T && fromEnd < this.config.SHORT_N) {
      return 'SHORT';
    }

    // Check medium window
    if (age <= this.config.MEDIUM_T && fromEnd < this.config.MEDIUM_N) {
      return 'MEDIUM';
    }

    // Otherwise long
    return 'LONG';
  }

  /**
   * Tag each snapshot with its window type
   */
  tagWithWindows(
    snapshots: readonly Snapshot[],
    referenceTime?: number
  ): ReadonlyMap<string, WindowType> {
    const now = referenceTime ?? Date.now();
    const result = new Map<string, WindowType>();

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      if (!snapshot) continue;

      const age = now - snapshot.timestamp;
      const fromEnd = snapshots.length - 1 - i;

      let windowType: WindowType;

      if (age <= this.config.SHORT_T && fromEnd < this.config.SHORT_N) {
        windowType = 'SHORT';
      } else if (age <= this.config.MEDIUM_T && fromEnd < this.config.MEDIUM_N) {
        windowType = 'MEDIUM';
      } else {
        windowType = 'LONG';
      }

      result.set(snapshot.snapshotId, windowType);
    }

    return result;
  }

  /**
   * Get current config
   */
  getConfig(): WindowConfig {
    return { ...this.config };
  }
}
