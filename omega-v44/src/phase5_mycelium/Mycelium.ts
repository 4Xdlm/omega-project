/**
 * OMEGA V4.4 — Phase 5: Mycelium
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * ADN Narratif - Deterministic narrative fingerprint
 * Same text → Same ADN (always)
 *
 * Components:
 * - Boussole: 4 directions (N/S/E/O)
 * - O2: Narrative oxygen
 * - Geometry: Text structure
 * - Windows: Temporal levels
 */

import { randomUUID } from 'node:crypto';
import type { CompassDirection, WindowType } from '../phase1_contract/index.js';
import { hashObject } from '../phase2_core/hash.js';
import type { Snapshot } from '../phase3_snapshot/index.js';

import type {
  MyceliumDNA,
  MyceliumNode,
  MyceliumConfig,
  ADNComparison,
  Pattern,
} from './types.js';

import { DEFAULT_O2_CONFIG, DEFAULT_WINDOW_CONFIG } from './types.js';
import { BoussoleEmotionnelle } from './BoussoleEmotionnelle.js';
import { O2Calculator } from './O2Calculator.js';
import { GeometryCalculator } from './GeometryCalculator.js';
import { WindowManager } from './WindowManager.js';

// ═══════════════════════════════════════════════════════════════════════════
// MYCELIUM CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mycelium - ADN Generator
 */
export class Mycelium {
  private readonly boussole: BoussoleEmotionnelle;
  private readonly o2Calculator: O2Calculator;
  private readonly geometryCalculator: GeometryCalculator;
  private readonly windowManager: WindowManager;
  private readonly config: MyceliumConfig;

  constructor(config: Partial<MyceliumConfig> = {}) {
    this.config = {
      o2: { ...DEFAULT_O2_CONFIG, ...config.o2 },
      windows: { ...DEFAULT_WINDOW_CONFIG, ...config.windows },
    };

    this.boussole = new BoussoleEmotionnelle();
    this.o2Calculator = new O2Calculator(this.config.o2);
    this.geometryCalculator = new GeometryCalculator();
    this.windowManager = new WindowManager(this.config.windows);
  }

  /**
   * Compute DNA from snapshots
   * DETERMINISTIC: Same snapshots = Same DNA hash
   */
  compute(snapshots: readonly Snapshot[], sourceText?: string): MyceliumDNA {
    if (snapshots.length === 0) {
      return this.createEmptyDNA();
    }

    const dnaId = randomUUID();
    const timestamp = Date.now();

    // Calculate O2 timeline
    const o2Timeline = this.o2Calculator.calculate(snapshots);

    // Tag windows
    const windowTags = this.windowManager.tagWithWindows(snapshots, timestamp);

    // Build tree
    const tree = this.buildTree(snapshots, o2Timeline, windowTags, sourceText);

    // Detect patterns
    const patterns = this.detectPatterns(snapshots, o2Timeline, windowTags);

    // Calculate metadata
    const metadata = this.calculateMetadata(tree, o2Timeline);

    // Build DNA structure
    const dnaWithoutHash: Omit<MyceliumDNA, 'dnaHash'> = {
      dnaId,
      timestamp,
      tree,
      patterns,
      o2Timeline,
      metadata,
    };

    // Calculate deterministic hash
    const dnaHash = this.calculateDNAHash(tree, o2Timeline);

    return {
      ...dnaWithoutHash,
      dnaHash,
    };
  }

  /**
   * Build tree of Mycelium nodes
   */
  private buildTree(
    snapshots: readonly Snapshot[],
    o2Timeline: ReturnType<O2Calculator['calculate']>,
    windowTags: ReadonlyMap<string, WindowType>,
    sourceText?: string
  ): readonly MyceliumNode[] {
    const nodes: MyceliumNode[] = [];

    // Calculate geometry from source text if provided
    const geometry = sourceText
      ? this.geometryCalculator.calculateBranches(sourceText)
      : { branchSize: 0, branchDensity: 0, geometryHash: '' };

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      if (!snapshot) continue;

      const o2Point = o2Timeline.points[i];
      const o2 = o2Point?.o2 ?? this.config.o2.O2_INITIAL;

      // Get direction from boussole
      const classification = this.boussole.classify(
        snapshot.dominantEmotion,
        snapshot.totalIntensity
      );

      // Get window type
      const window = windowTags.get(snapshot.snapshotId) ?? 'LONG';

      // Calculate color from intensity
      const color = this.intensityToColor(snapshot.totalIntensity);

      // Calculate thickness from O2
      const thickness = this.o2ToThickness(o2);

      nodes.push({
        direction: classification.direction,
        dominantEmotion: snapshot.dominantEmotion,
        intensity: snapshot.totalIntensity,
        color,
        o2,
        thickness,
        branchSize: geometry.branchSize,
        branchDensity: geometry.branchDensity,
        geometryHash: geometry.geometryHash,
        timestamp: snapshot.timestamp,
        window,
        snapshotId: snapshot.snapshotId,
      });
    }

    return nodes;
  }

  /**
   * Detect patterns in the narrative
   */
  private detectPatterns(
    snapshots: readonly Snapshot[],
    o2Timeline: ReturnType<O2Calculator['calculate']>,
    windowTags: ReadonlyMap<string, WindowType>
  ): readonly Pattern[] {
    const patterns: Pattern[] = [];

    // Detect O2 depletion
    if (this.o2Calculator.hasDepletion(o2Timeline)) {
      const depletedPoints = o2Timeline.points.filter(p => p.status === 'O2_DEPLETED');
      if (depletedPoints.length > 0) {
        const first = depletedPoints[0];
        const last = depletedPoints[depletedPoints.length - 1];
        if (first && last) {
          patterns.push({
            type: 'O2_DEPLETED',
            window: 'SHORT',
            startTimestamp: first.timestamp,
            endTimestamp: last.timestamp,
            severity: 'HIGH',
            details: `O2 depleted at ${depletedPoints.length} points`,
          });
        }
      }
    }

    // Detect O2 critical
    if (this.o2Calculator.hasCritical(o2Timeline)) {
      patterns.push({
        type: 'O2_CRITICAL',
        window: 'SHORT',
        startTimestamp: o2Timeline.points[0]?.timestamp ?? 0,
        endTimestamp: o2Timeline.points[o2Timeline.points.length - 1]?.timestamp ?? 0,
        severity: 'MEDIUM',
        details: 'O2 in critical zone',
      });
    }

    // Detect stagnation (low delta omega)
    const stagnationThreshold = 0.5;
    const stagnantPoints = o2Timeline.points.filter(p => p.deltaOmega < stagnationThreshold);
    if (stagnantPoints.length > snapshots.length * 0.5) {
      patterns.push({
        type: 'STAGNATION',
        window: 'MEDIUM',
        startTimestamp: stagnantPoints[0]?.timestamp ?? 0,
        endTimestamp: stagnantPoints[stagnantPoints.length - 1]?.timestamp ?? 0,
        severity: 'MEDIUM',
        details: `Stagnation detected: ${stagnantPoints.length} low-movement points`,
      });
    }

    return patterns;
  }

  /**
   * Calculate metadata from tree
   */
  private calculateMetadata(
    tree: readonly MyceliumNode[],
    o2Timeline: ReturnType<O2Calculator['calculate']>
  ): MyceliumDNA['metadata'] {
    if (tree.length === 0) {
      return {
        snapshotCount: 0,
        timeSpan: 0,
        dominantDirection: 'S',
        avgIntensity: 0,
        avgO2: this.config.o2.O2_INITIAL,
      };
    }

    // Count directions
    const directionCounts: Record<CompassDirection, number> = { N: 0, S: 0, E: 0, O: 0 };
    let totalIntensity = 0;

    for (const node of tree) {
      directionCounts[node.direction]++;
      totalIntensity += node.intensity;
    }

    // Find dominant direction
    let maxCount = 0;
    let dominantDirection: CompassDirection = 'S';
    for (const [dir, count] of Object.entries(directionCounts) as Array<[CompassDirection, number]>) {
      if (count > maxCount) {
        maxCount = count;
        dominantDirection = dir;
      }
    }

    // Calculate time span
    const timestamps = tree.map(n => n.timestamp).sort((a, b) => a - b);
    const firstTimestamp = timestamps[0] ?? 0;
    const lastTimestamp = timestamps[timestamps.length - 1] ?? 0;
    const timeSpan = lastTimestamp - firstTimestamp;

    return {
      snapshotCount: tree.length,
      timeSpan,
      dominantDirection,
      avgIntensity: totalIntensity / tree.length,
      avgO2: o2Timeline.avgO2,
    };
  }

  /**
   * Calculate deterministic DNA hash
   */
  private calculateDNAHash(
    tree: readonly MyceliumNode[],
    o2Timeline: ReturnType<O2Calculator['calculate']>
  ): string {
    // Hash based on tree content (excluding random IDs)
    const hashContent = tree.map(node => ({
      direction: node.direction,
      intensity: node.intensity,
      o2: node.o2,
      geometryHash: node.geometryHash,
    }));

    return hashObject({
      tree: hashContent,
      o2Stats: {
        min: o2Timeline.minO2,
        max: o2Timeline.maxO2,
        avg: o2Timeline.avgO2,
      },
    });
  }

  /**
   * Create empty DNA
   */
  private createEmptyDNA(): MyceliumDNA {
    return {
      dnaId: randomUUID(),
      timestamp: Date.now(),
      tree: [],
      dnaHash: hashObject([]),
      patterns: [],
      o2Timeline: {
        points: [],
        minO2: this.config.o2.O2_INITIAL,
        maxO2: this.config.o2.O2_INITIAL,
        avgO2: this.config.o2.O2_INITIAL,
      },
      metadata: {
        snapshotCount: 0,
        timeSpan: 0,
        dominantDirection: 'S',
        avgIntensity: 0,
        avgO2: this.config.o2.O2_INITIAL,
      },
    };
  }

  /**
   * Convert intensity to color
   */
  private intensityToColor(intensity: number): string {
    // Map intensity to color gradient
    const normalized = Math.min(1, intensity / 100);

    if (normalized < 0.2) return '#E0E0E0'; // Gray (low)
    if (normalized < 0.4) return '#90CAF9'; // Light blue
    if (normalized < 0.6) return '#66BB6A'; // Green
    if (normalized < 0.8) return '#FFA726'; // Orange
    return '#EF5350'; // Red (high)
  }

  /**
   * Convert O2 to thickness
   */
  private o2ToThickness(o2: number): number {
    // Map O2 to thickness (1-10 scale)
    const normalized = o2 / this.config.o2.O2_MAX;
    return 1 + normalized * 9;
  }

  /**
   * Compare two DNAs
   */
  compareADN(dna1: MyceliumDNA, dna2: MyceliumDNA): ADNComparison {
    // Direction distance
    const directionDistance = this.calculateDirectionDistance(dna1, dna2);

    // Intensity distance
    const intensityDistance = Math.abs(
      dna1.metadata.avgIntensity - dna2.metadata.avgIntensity
    );

    // O2 distance
    const o2Distance = Math.abs(dna1.metadata.avgO2 - dna2.metadata.avgO2);

    // Geometry distance
    const geometryDistance = this.calculateGeometryDistance(dna1, dna2);

    // Total distance
    const totalDistance =
      directionDistance * 0.3 +
      intensityDistance * 0.3 +
      o2Distance * 0.2 +
      geometryDistance * 0.2;

    // Similarity (0-1)
    const maxPossibleDistance = 100;
    const similarity = Math.max(0, 1 - totalDistance / maxPossibleDistance);

    return {
      distanceTotal: totalDistance,
      distanceDirection: directionDistance,
      distanceIntensity: intensityDistance,
      distanceO2: o2Distance,
      distanceGeometry: geometryDistance,
      similarity,
    };
  }

  /**
   * Calculate direction distance
   */
  private calculateDirectionDistance(dna1: MyceliumDNA, dna2: MyceliumDNA): number {
    return this.boussole.getAngularDistance(
      dna1.metadata.dominantDirection,
      dna2.metadata.dominantDirection
    );
  }

  /**
   * Calculate geometry distance
   */
  private calculateGeometryDistance(dna1: MyceliumDNA, dna2: MyceliumDNA): number {
    if (dna1.tree.length === 0 || dna2.tree.length === 0) return 0;

    const g1 = dna1.tree[0];
    const g2 = dna2.tree[0];

    if (!g1 || !g2) return 0;

    return this.geometryCalculator.calculateDistance(
      { branchSize: g1.branchSize, branchDensity: g1.branchDensity, geometryHash: g1.geometryHash },
      { branchSize: g2.branchSize, branchDensity: g2.branchDensity, geometryHash: g2.geometryHash }
    );
  }

  /**
   * Get current config
   */
  getConfig(): MyceliumConfig {
    return { ...this.config };
  }
}
