/**
 * OMEGA V4.4 — Phase 5: O2 Calculator
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * O2 = Narrative Oxygen = Interest/Breath of story
 *
 * Formula:
 * ΔΩ = √[(Xt - Xt-1)² + (Yt - Yt-1)² + (Zt - Zt-1)²]
 * E = COST_time × Δt
 * O2(t) = O2(t-1) - E + (ΔΩ × GAIN_factor)
 * O2(t) = clamp(0, O2(t), MAX_O2)
 */

import type { Snapshot } from '../phase3_snapshot/index.js';
import type { O2Point, O2Timeline, O2Config, O2Status } from './types.js';
import { DEFAULT_O2_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// O2 CALCULATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * O2 Calculator - Calculates narrative oxygen
 */
export class O2Calculator {
  private readonly config: O2Config;

  constructor(config: Partial<O2Config> = {}) {
    this.config = { ...DEFAULT_O2_CONFIG, ...config };
  }

  /**
   * Calculate O2 timeline from snapshots
   */
  calculate(snapshots: readonly Snapshot[]): O2Timeline {
    if (snapshots.length === 0) {
      return this.emptyTimeline();
    }

    const points: O2Point[] = [];
    let o2 = this.config.O2_INITIAL;

    for (let i = 0; i < snapshots.length; i++) {
      const current = snapshots[i];
      if (!current) continue;

      const previous = i > 0 ? snapshots[i - 1] : undefined;

      if (!previous) {
        // First snapshot
        points.push({
          timestamp: current.timestamp,
          o2,
          deltaOmega: 0,
          erosion: 0,
          regeneration: 0,
          status: this.getO2Status(o2),
        });
        continue;
      }

      // Calculate movement ΔΩ
      const deltaOmega = this.calculateDeltaOmega(current, previous);

      // Calculate erosion
      const deltaT = (current.timestamp - previous.timestamp) / 1000; // Convert to seconds
      const erosion = this.config.COST_TIME * deltaT;

      // Calculate regeneration from movement
      const regeneration = deltaOmega * this.config.GAIN_FACTOR;

      // Update O2
      o2 = o2 - erosion + regeneration;

      // Clamp to bounds
      o2 = Math.max(0, Math.min(this.config.O2_MAX, o2));

      points.push({
        timestamp: current.timestamp,
        o2,
        deltaOmega,
        erosion,
        regeneration,
        status: this.getO2Status(o2),
      });
    }

    return this.buildTimeline(points);
  }

  /**
   * Calculate ΔΩ (movement in 3D emotional space)
   */
  private calculateDeltaOmega(current: Snapshot, previous: Snapshot): number {
    const dx = current.axes.X - previous.axes.X;
    const dy = current.axes.Y - previous.axes.Y;
    const dz = current.axes.Z - previous.axes.Z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Determine O2 status
   */
  private getO2Status(o2: number): O2Status {
    if (o2 === 0) return 'O2_DEPLETED';
    if (o2 < this.config.O2_MIN) return 'O2_CRITICAL';
    if (o2 >= this.config.O2_MAX) return 'O2_SATURATED';
    return 'O2_STABLE';
  }

  /**
   * Build timeline with statistics
   */
  private buildTimeline(points: readonly O2Point[]): O2Timeline {
    if (points.length === 0) {
      return this.emptyTimeline();
    }

    const o2Values = points.map(p => p.o2);
    const minO2 = Math.min(...o2Values);
    const maxO2 = Math.max(...o2Values);
    const avgO2 = o2Values.reduce((a, b) => a + b, 0) / o2Values.length;

    return {
      points,
      minO2,
      maxO2,
      avgO2,
    };
  }

  /**
   * Create empty timeline
   */
  private emptyTimeline(): O2Timeline {
    return {
      points: [],
      minO2: this.config.O2_INITIAL,
      maxO2: this.config.O2_INITIAL,
      avgO2: this.config.O2_INITIAL,
    };
  }

  /**
   * Check if O2 is depleted in any point
   */
  hasDepletion(timeline: O2Timeline): boolean {
    return timeline.points.some(p => p.status === 'O2_DEPLETED');
  }

  /**
   * Check if O2 is in critical zone
   */
  hasCritical(timeline: O2Timeline): boolean {
    return timeline.points.some(p => p.status === 'O2_CRITICAL');
  }

  /**
   * Get current config
   */
  getConfig(): O2Config {
    return { ...this.config };
  }
}
