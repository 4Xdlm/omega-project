/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENSOR SYSTEM — Types & Interfaces V2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Shadow-only experimental module.
 * ZERO import from dispatcher, coefficients, or pipeline.
 *
 * V2 additions:
 *   - CollisionInfo: multi-category marker/anchor tracking
 *   - DeadMetaphorHit: audit trail for excluded dead metaphors
 *   - RawDetectionV2: enriched detection with anchor candidates + distance scoring
 *   - WindowMetricsV2: adds p90 percentile
 *   - SensorAudit: complete extraction audit trail
 *   - assertSensorResults: invariant checker
 *
 * Version: 2.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────────────────────────────────────
// BASE TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type SensoryModality = 'visual' | 'auditory' | 'kinesthetic' | 'olfactory' | 'gustatory';

export type AnchorLayer =
  | 'c1_material' | 'c1_object' | 'c1_micro_detail'
  | 'c2_body' | 'c2_organ'
  | 'c3_reaction' | 'c3_interaction';

export type RarityTier = 'common' | 'rich' | 'rare';

// ──────────────────────────────────────────────────────────────────────────────
// MARKER / ANCHOR INFO (for index building)
// ──────────────────────────────────────────────────────────────────────────────

/** Info for a marker word in the index. */
export interface MarkerInfo {
  readonly modality: SensoryModality;
  readonly tier: RarityTier;
  readonly weight: number;
}

/** Info for an anchor word in the index. */
export interface AnchorInfo {
  readonly layer: AnchorLayer;
  readonly weight: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// COLLISION TRACKING (P1)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Collision = a word that appears in multiple categories.
 * The extractor resolves to the first entry (deterministic),
 * but logs all collisions for audit.
 */
export interface CollisionEntry {
  readonly word: string;
  readonly categories: ReadonlyArray<{
    readonly source: 'marker' | 'anchor';
    readonly category: string;    // e.g. "visual/common" or "c1_material"
    readonly weight: number;
  }>;
  readonly resolvedTo: string;    // the category used (first occurrence)
}

export interface CollisionAudit {
  readonly markerCollisions: readonly CollisionEntry[];
  readonly anchorCollisions: readonly CollisionEntry[];
  readonly totalCollisions: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// DEAD METAPHOR AUDIT (P4)
// ──────────────────────────────────────────────────────────────────────────────

/** A dead metaphor match found and excluded from analysis. */
export interface DeadMetaphorHit {
  readonly phrase: string;
  readonly position: number;       // character offset in cleaned text
  readonly tokensRemoved: number;  // approximate tokens this replaced
}

// ──────────────────────────────────────────────────────────────────────────────
// ANCHOR CANDIDATE (P2 — distance-weighted scoring)
// ──────────────────────────────────────────────────────────────────────────────

/** A candidate anchor for a given marker, with distance-weighted score. */
export interface AnchorCandidate {
  readonly word: string;
  readonly layer: AnchorLayer;
  readonly weight: number;
  readonly distance: number;           // token distance from marker (absolute)
  readonly direction: 'backward' | 'forward';  // backward = anchor before marker
  readonly score: number;              // weight / (1 + λ * distance) * directionPenalty
}

// ──────────────────────────────────────────────────────────────────────────────
// RAW DETECTION V2 (enriched)
// ──────────────────────────────────────────────────────────────────────────────

/** Enriched raw detection with full audit data. */
export interface RawDetectionV2 {
  readonly position: number;
  readonly marker: string;
  readonly markerInfo: MarkerInfo;
  readonly excluded: boolean;
  readonly exclusionReason: string | null;   // the context word that caused exclusion
  readonly anchorCandidates: readonly AnchorCandidate[];  // all candidates, sorted by score desc
  readonly bestAnchor: AnchorCandidate | null;            // winner after distance-weighted scoring
}

// ──────────────────────────────────────────────────────────────────────────────
// SENSORY EVENT (validated, final)
// ──────────────────────────────────────────────────────────────────────────────

/** A validated sensory event: marker + anchor co-occurrence. */
export interface SensoryEvent {
  readonly position: number;          // token index of the marker
  readonly marker: string;            // the sensory word detected
  readonly modality: SensoryModality;
  readonly rarity: RarityTier;
  readonly rarity_weight: number;     // 1.0, 1.3, or 1.6
  readonly anchor: string;            // the anchor word found
  readonly anchor_layer: AnchorLayer;
  readonly anchor_weight: number;     // 1.0 to 1.6
  readonly anchor_distance: number;   // token distance between marker and anchor
  readonly anchor_score: number;      // distance-weighted anchor score
  readonly event_score: number;       // rarity_weight × anchor_score
}

// ──────────────────────────────────────────────────────────────────────────────
// WINDOW METRICS V2 (adds p90)
// ──────────────────────────────────────────────────────────────────────────────

/** Per-window analysis result with p90 percentile. */
export interface WindowMetricsV2 {
  readonly values: readonly number[];
  readonly mean: number;
  readonly stdev: number;
  readonly max: number;
  readonly p90: number;
  readonly burst_ratio: number;    // max / mean (1.0 = perfectly uniform)
}

// ──────────────────────────────────────────────────────────────────────────────
// SENSOR TRIPLET
// ──────────────────────────────────────────────────────────────────────────────

/** Triplet for any sensor: density + variance + burst_ratio */
export interface SensorTriplet {
  readonly density: number;        // normalized per 1000 tokens (or [0,1] for ratio sensors)
  readonly variance: number;       // stdev across windows
  readonly burst_ratio: number;    // max_window / mean_windows (1.0 = perfectly uniform)
}

// ──────────────────────────────────────────────────────────────────────────────
// SENSOR RESULTS (complete output)
// ──────────────────────────────────────────────────────────────────────────────

/** Complete output of the 4 P1 sensors. */
export interface SensorResults {
  readonly token_count: number;
  readonly valid_events: number;
  readonly raw_events: number;       // before exclusion/anchor filtering

  // The 4 P1 sensors
  readonly coverage_5s: SensorTriplet;
  readonly sensor_density: SensorTriplet;
  readonly body_binding: SensorTriplet;
  readonly concreteness_anchor: SensorTriplet;

  // Diagnostic sub-metrics (not for scoring, for audit)
  readonly diag: {
    readonly anchor_ratio: number;           // valid / raw events
    readonly modality_counts: Readonly<Record<SensoryModality, number>>;
    readonly density_raw: number;            // unanchored density per 1000
    readonly binding_passive: number;        // C2 body ratio
    readonly binding_reactive: number;       // C3 reaction ratio
    readonly binding_interactive: number;    // C3 interaction ratio
    readonly concreteness_by_level: {
      readonly material: number;
      readonly object: number;
      readonly micro_detail: number;
    };
  };

  // V2: audit trail (optional, present only when audit=true)
  readonly audit?: SensorAudit;
}

// ──────────────────────────────────────────────────────────────────────────────
// SENSOR AUDIT (P4 — complete trace)
// ──────────────────────────────────────────────────────────────────────────────

/** Complete extraction audit trail. */
export interface SensorAudit {
  readonly deadMetaphorHits: readonly DeadMetaphorHit[];
  readonly deadMetaphorCount: number;
  readonly rawDetections: readonly RawDetectionV2[];
  readonly collisions: CollisionAudit;
  readonly excludedCount: number;
  readonly noAnchorCount: number;
  readonly validEvents: readonly SensoryEvent[];
}

// ──────────────────────────────────────────────────────────────────────────────
// EXTRACTION OPTIONS
// ──────────────────────────────────────────────────────────────────────────────

/** Options for extractSensoryFeatures V2. */
export interface SensorExtractionOptions {
  /** Enable full audit trail (default: false). Increases memory usage. */
  readonly audit?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// INVARIANT ASSERTION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Assert invariants on SensorResults before returning.
 * Throws if any invariant is violated.
 *
 * Invariants:
 *   1. token_count ≥ 0
 *   2. valid_events ≤ raw_events
 *   3. valid_events ≥ 0, raw_events ≥ 0
 *   4. coverage_5s.density ∈ [0, 1.0]
 *   5. body_binding.density ∈ [0, 1.0]
 *   6. concreteness_anchor.density ∈ [0, 1.6]
 *   7. sensor_density.density ≥ 0
 *   8. All burst_ratio ≥ 1.0 (or exactly 1.0 for single-window)
 *   9. All variance ≥ 0
 *  10. diag.anchor_ratio ∈ [0, 1.0]
 *  11. Sum of modality_counts = valid_events
 */
export function assertSensorResults(r: SensorResults): void {
  const errors: string[] = [];

  // 1. token_count ≥ 0
  if (r.token_count < 0) {
    errors.push(`token_count negative: ${r.token_count}`);
  }

  // 2. valid_events ≤ raw_events
  if (r.valid_events > r.raw_events) {
    errors.push(`valid_events (${r.valid_events}) > raw_events (${r.raw_events})`);
  }

  // 3. Non-negative counts
  if (r.valid_events < 0) errors.push(`valid_events negative: ${r.valid_events}`);
  if (r.raw_events < 0) errors.push(`raw_events negative: ${r.raw_events}`);

  // 4. coverage_5s ∈ [0, 1.0]
  if (r.coverage_5s.density < 0 || r.coverage_5s.density > 1.0001) {
    errors.push(`coverage_5s.density out of [0,1]: ${r.coverage_5s.density}`);
  }

  // 5. body_binding ∈ [0, 1.0]
  if (r.body_binding.density < 0 || r.body_binding.density > 1.0001) {
    errors.push(`body_binding.density out of [0,1]: ${r.body_binding.density}`);
  }

  // 6. concreteness_anchor ∈ [0, 1.6]
  if (r.concreteness_anchor.density < 0 || r.concreteness_anchor.density > 1.6001) {
    errors.push(`concreteness_anchor.density out of [0,1.6]: ${r.concreteness_anchor.density}`);
  }

  // 7. sensor_density ≥ 0
  if (r.sensor_density.density < 0) {
    errors.push(`sensor_density.density negative: ${r.sensor_density.density}`);
  }

  // 8-9. All triplets: burst_ratio ≥ 1.0 (with float tolerance), variance ≥ 0
  const triplets = [
    { name: 'coverage_5s', t: r.coverage_5s },
    { name: 'sensor_density', t: r.sensor_density },
    { name: 'body_binding', t: r.body_binding },
    { name: 'concreteness_anchor', t: r.concreteness_anchor },
  ];
  for (const { name, t } of triplets) {
    if (t.burst_ratio < 0.9999) {
      errors.push(`${name}.burst_ratio < 1.0: ${t.burst_ratio}`);
    }
    if (t.variance < -0.0001) {
      errors.push(`${name}.variance negative: ${t.variance}`);
    }
  }

  // 10. anchor_ratio ∈ [0, 1.0]
  if (r.diag.anchor_ratio < -0.0001 || r.diag.anchor_ratio > 1.0001) {
    errors.push(`diag.anchor_ratio out of [0,1]: ${r.diag.anchor_ratio}`);
  }

  // 11. Sum of modality_counts = valid_events
  const modSum = Object.values(r.diag.modality_counts).reduce((a, b) => a + b, 0);
  if (modSum !== r.valid_events) {
    errors.push(`modality_counts sum (${modSum}) ≠ valid_events (${r.valid_events})`);
  }

  if (errors.length > 0) {
    throw new Error(
      `[OMEGA] SensorResults invariant violation (${errors.length} errors):\n  - ${errors.join('\n  - ')}`,
    );
  }
}
