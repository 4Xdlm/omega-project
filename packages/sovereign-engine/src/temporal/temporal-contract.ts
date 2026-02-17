/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — TEMPORAL CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: temporal/temporal-contract.ts
 * Sprint: 16.1
 * Invariant: ART-TEMP-01
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Defines temporal pacing contract: key moments get more words,
 * transitions get compressed. Enables dilatation/compression scoring.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A key moment in the narrative that should receive temporal dilatation.
 * More words, more detail, slower pacing.
 */
export interface KeyMoment {
  readonly moment_id: string;
  readonly label: string;                    // "première rencontre", "révélation"
  readonly position_pct: number;             // 0-100, position in narrative
  readonly word_budget_pct: number;          // target % of total word count
  readonly emotion_peak: boolean;            // if true, expect emotion climax here
  readonly pacing: 'dilated' | 'normal';     // explicit pacing instruction
}

/**
 * A compression zone: transitions, time skips, mundane actions.
 * Fewer words, rapid pacing.
 */
export interface CompressionZone {
  readonly zone_id: string;
  readonly label: string;                    // "transition temporelle", "ellipse"
  readonly start_pct: number;                // 0-100, start position
  readonly end_pct: number;                  // 0-100, end position
  readonly max_word_pct: number;             // max % of total word count for this zone
  readonly pacing: 'compressed' | 'ellipsis'; // compressed = brief, ellipsis = skip
}

/**
 * Temporal contract: describes how narrative time maps to text space.
 * Integrated as optional field in ForgePacket.
 */
export interface TemporalContract {
  readonly version: '1.0';
  readonly key_moments: readonly KeyMoment[];
  readonly compression_zones: readonly CompressionZone[];
  readonly total_word_target: number;        // reference word count
  readonly foreshadowing_hooks: readonly ForeshadowingHook[];
}

/**
 * A foreshadowing hook: emotional setup planted early, resolved later.
 */
export interface ForeshadowingHook {
  readonly hook_id: string;
  readonly plant_position_pct: number;       // where to plant (0-100)
  readonly resolve_position_pct: number;     // where to resolve (0-100)
  readonly emotion_planted: string;          // emotion seeded ("inquiétude", "espoir")
  readonly emotion_resolved: string;         // emotion at resolution ("terreur", "soulagement")
  readonly motif: string;                    // recurring image/word linking both
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemporalValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a temporal contract for consistency.
 *
 * Rules:
 * 1. All position_pct ∈ [0, 100]
 * 2. Key moments word_budget_pct sum ≤ 80% (leave room for transitions)
 * 3. Compression zones don't overlap
 * 4. Foreshadowing: plant_position < resolve_position
 * 5. At least 1 key moment
 */
export function validateTemporalContract(contract: TemporalContract): TemporalValidationResult {
  const errors: string[] = [];

  // Rule 1: positions in range
  for (const km of contract.key_moments) {
    if (km.position_pct < 0 || km.position_pct > 100) {
      errors.push(`KeyMoment "${km.moment_id}" position_pct out of range: ${km.position_pct}`);
    }
    if (km.word_budget_pct < 0 || km.word_budget_pct > 100) {
      errors.push(`KeyMoment "${km.moment_id}" word_budget_pct out of range: ${km.word_budget_pct}`);
    }
  }

  for (const cz of contract.compression_zones) {
    if (cz.start_pct < 0 || cz.start_pct > 100 || cz.end_pct < 0 || cz.end_pct > 100) {
      errors.push(`CompressionZone "${cz.zone_id}" position out of range`);
    }
    if (cz.start_pct >= cz.end_pct) {
      errors.push(`CompressionZone "${cz.zone_id}" start >= end`);
    }
  }

  // Rule 2: word budget sum ≤ 80%
  const totalBudget = contract.key_moments.reduce((sum, km) => sum + km.word_budget_pct, 0);
  if (totalBudget > 80) {
    errors.push(`Key moments total word_budget_pct = ${totalBudget}% > 80%`);
  }

  // Rule 3: compression zones don't overlap
  const sorted = [...contract.compression_zones].sort((a, b) => a.start_pct - b.start_pct);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_pct < sorted[i - 1].end_pct) {
      errors.push(`CompressionZones "${sorted[i - 1].zone_id}" and "${sorted[i].zone_id}" overlap`);
    }
  }

  // Rule 4: foreshadowing plant < resolve
  for (const fh of contract.foreshadowing_hooks) {
    if (fh.plant_position_pct >= fh.resolve_position_pct) {
      errors.push(`ForeshadowingHook "${fh.hook_id}" plant >= resolve`);
    }
  }

  // Rule 5: at least 1 key moment
  if (contract.key_moments.length === 0) {
    errors.push('At least 1 key moment required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONTRACT FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a default temporal contract for a single scene.
 * 3 key moments at 25%, 50%, 75%.
 * 2 compression zones: 0-10% (opening transition) and 85-95% (closing transition).
 */
export function createDefaultTemporalContract(totalWordTarget: number): TemporalContract {
  return {
    version: '1.0',
    total_word_target: totalWordTarget,
    key_moments: [
      {
        moment_id: 'km-inciting',
        label: 'incident déclencheur',
        position_pct: 25,
        word_budget_pct: 20,
        emotion_peak: false,
        pacing: 'dilated',
      },
      {
        moment_id: 'km-climax',
        label: 'climax émotionnel',
        position_pct: 60,
        word_budget_pct: 25,
        emotion_peak: true,
        pacing: 'dilated',
      },
      {
        moment_id: 'km-resolution',
        label: 'résolution',
        position_pct: 85,
        word_budget_pct: 15,
        emotion_peak: false,
        pacing: 'dilated',
      },
    ],
    compression_zones: [
      {
        zone_id: 'cz-opening',
        label: 'transition ouverture',
        start_pct: 0,
        end_pct: 10,
        max_word_pct: 8,
        pacing: 'compressed',
      },
      {
        zone_id: 'cz-mid-transition',
        label: 'transition milieu',
        start_pct: 40,
        end_pct: 50,
        max_word_pct: 8,
        pacing: 'compressed',
      },
    ],
    foreshadowing_hooks: [],
  };
}
