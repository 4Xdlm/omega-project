/**
 * OMEGA V4.4 — Phase 5: Mycelium Types
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * ADN = Deterministic narrative fingerprint
 * Boussole + O2 + Geometry + Windows
 */

import type { CompassDirection, WindowType, O2Status } from '../phase1_contract/index.js';
import type { Snapshot } from '../phase3_snapshot/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// BOUSSOLE (4 DIRECTIONS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Emotional direction classification
 */
export interface DirectionClassification {
  readonly direction: CompassDirection;
  readonly dominantEmotion: string;
  readonly confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// O2 (NARRATIVE OXYGEN)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * O2 point in timeline
 */
export interface O2Point {
  readonly timestamp: number;
  readonly o2: number;
  readonly deltaOmega: number;
  readonly erosion: number;
  readonly regeneration: number;
  readonly status: O2Status;
}

/**
 * O2 timeline
 */
export interface O2Timeline {
  readonly points: readonly O2Point[];
  readonly minO2: number;
  readonly maxO2: number;
  readonly avgO2: number;
}

/**
 * O2 configuration
 */
export interface O2Config {
  readonly O2_INITIAL: number;
  readonly O2_MIN: number;
  readonly O2_MAX: number;
  readonly COST_TIME: number;
  readonly GAIN_FACTOR: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// GEOMETRY (TEXT STRUCTURE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Geometric data from text
 */
export interface GeometryData {
  readonly branchSize: number;
  readonly branchDensity: number;
  readonly geometryHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// WINDOWS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Window configuration
 */
export interface WindowConfig {
  readonly SHORT_N: number;
  readonly SHORT_T: number;
  readonly MEDIUM_N: number;
  readonly MEDIUM_T: number;
  readonly LONG_N: number;
  readonly LONG_T: number;
}

/**
 * Windowed snapshots
 */
export interface WindowedSnapshots {
  readonly short: readonly Snapshot[];
  readonly medium: readonly Snapshot[];
  readonly long: readonly Snapshot[];
}

// ═══════════════════════════════════════════════════════════════════════════
// MYCELIUM NODE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Single node in Mycelium tree
 */
export interface MyceliumNode {
  // Direction (Boussole 4D)
  readonly direction: CompassDirection;
  readonly dominantEmotion: string;

  // Color (intensity)
  readonly intensity: number;
  readonly color: string;

  // Thickness (O2)
  readonly o2: number;
  readonly thickness: number;

  // Branches (geometry)
  readonly branchSize: number;
  readonly branchDensity: number;
  readonly geometryHash: string;

  // Position
  readonly timestamp: number;
  readonly window: WindowType;
  readonly snapshotId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detected pattern
 */
export interface Pattern {
  readonly type: string;
  readonly window: WindowType;
  readonly startTimestamp: number;
  readonly endTimestamp: number;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly details: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MYCELIUM DNA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete Mycelium DNA structure
 */
export interface MyceliumDNA {
  readonly dnaId: string;
  readonly timestamp: number;
  readonly tree: readonly MyceliumNode[];
  readonly dnaHash: string;
  readonly patterns: readonly Pattern[];
  readonly o2Timeline: O2Timeline;
  readonly metadata: {
    readonly snapshotCount: number;
    readonly timeSpan: number;
    readonly dominantDirection: CompassDirection;
    readonly avgIntensity: number;
    readonly avgO2: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DNA COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ADN comparison result
 */
export interface ADNComparison {
  readonly distanceTotal: number;
  readonly distanceDirection: number;
  readonly distanceIntensity: number;
  readonly distanceO2: number;
  readonly distanceGeometry: number;
  readonly similarity: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MYCELIUM CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete Mycelium configuration
 */
export interface MyceliumConfig {
  readonly o2: O2Config;
  readonly windows: WindowConfig;
}

/**
 * Default O2 configuration
 */
export const DEFAULT_O2_CONFIG: O2Config = {
  O2_INITIAL: 50,
  O2_MIN: 10,
  O2_MAX: 100,
  COST_TIME: 0.001,
  GAIN_FACTOR: 5,
};

/**
 * Default window configuration
 */
export const DEFAULT_WINDOW_CONFIG: WindowConfig = {
  SHORT_N: 10,
  SHORT_T: 300000, // 5 minutes
  MEDIUM_N: 100,
  MEDIUM_T: 3600000, // 1 hour
  LONG_N: 1000,
  LONG_T: 86400000, // 24 hours
};
