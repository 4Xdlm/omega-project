/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENSOR CONFIG — All tunable parameters in one place
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ZERO magic numbers in the extractor. Everything here is:
 *   - Named
 *   - Documented with rationale
 *   - Overridable for sensitivity benchmarks
 *
 * Theoretical bounds for each sensor:
 *   coverage_5s:          [0, 1.0]  — fraction of 5 modalities active
 *   sensor_density:       [0, ∞)    — events per 1000 tokens (weighted)
 *   body_binding:         [0, 1.0]  — fraction of events with body/reaction anchor
 *   concreteness_anchor:  [0, 1.6]  — mean anchor weight (max = c1_micro_detail = 1.6)
 *
 * Version: 2.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface SensorConfig {
  // ── Detection ──
  /** Max token distance for anchor co-occurrence. */
  readonly ANCHOR_WINDOW: number;
  /** Max token distance for exclusion context check. */
  readonly EXCLUSION_WINDOW: number;

  // ── Anchor scoring ──
  /** Distance decay factor for anchor scoring: score = weight / (1 + λ * distance). */
  readonly ANCHOR_DISTANCE_LAMBDA: number;
  /** Penalty for forward anchors (anchor appears after marker). */
  readonly ANCHOR_FORWARD_PENALTY: number;
  /** Penalty for backward anchors (anchor appears before marker). */
  readonly ANCHOR_BACKWARD_PENALTY: number;

  // ── Window analysis ──
  /** Tokens per analysis window. */
  readonly WINDOW_SIZE: number;
  /** Step between windows (overlap = WINDOW_SIZE - WINDOW_STEP). */
  readonly WINDOW_STEP: number;

  // ── Coverage threshold ──
  /** Min events per modality to count it as "active" in coverage_5s. */
  readonly MIN_EVENTS_PER_MODALITY: number;

  // ── Safety ──
  /** Min tokens to produce non-empty results. Below this → emptyResults. */
  readonly MIN_TOKENS: number;

  // ── Scaling ──
  /** Multiplier for density (events per N tokens). 1000 = per kilo-token. */
  readonly DENSITY_SCALE: number;
}

/**
 * Default config — used in production.
 * Override for sensitivity benchmarks by passing a custom config.
 */
export const DEFAULT_SENSOR_CONFIG: SensorConfig = {
  ANCHOR_WINDOW: 8,
  EXCLUSION_WINDOW: 3,

  ANCHOR_DISTANCE_LAMBDA: 0.22,
  ANCHOR_FORWARD_PENALTY: 0.95,
  ANCHOR_BACKWARD_PENALTY: 1.00,

  WINDOW_SIZE: 200,
  WINDOW_STEP: 100,

  MIN_EVENTS_PER_MODALITY: 2,

  MIN_TOKENS: 20,

  DENSITY_SCALE: 1000,
};

/**
 * Concreteness weights per anchor layer.
 * Used by the concreteness_anchor sensor.
 * Max theoretical value = max(values) = 1.6.
 */
export const CONCRETENESS_WEIGHTS: Readonly<Record<string, number>> = {
  c1_material: 1.0,
  c1_object: 1.3,
  c1_micro_detail: 1.6,
  c2_body: 1.2,
  c2_organ: 1.4,
  c3_reaction: 1.5,
  c3_interaction: 1.3,
};

/**
 * Body layers for body_binding sensor.
 */
export const BODY_LAYERS: ReadonlyArray<string> = [
  'c2_body', 'c2_organ', 'c3_reaction', 'c3_interaction',
];
