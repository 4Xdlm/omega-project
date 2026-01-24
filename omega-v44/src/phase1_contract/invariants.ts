/**
 * OMEGA V4.4 — Phase 1: Invariants Registry
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * The 6 fundamental laws (L1-L6) that govern the emotional system.
 * These are RELATIONAL invariants - they describe constraints,
 * not specific numeric values.
 */

// ═══════════════════════════════════════════════════════════════════════════
// INVARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Invariant identifier type
 */
export type InvariantId =
  | 'L1_CYCLIC_PHASE'
  | 'L2_BOUNDED_INTENSITY'
  | 'L3_BOUNDED_PERSISTENCE'
  | 'L4_DECAY_LAW'
  | 'L5_HYSTERIC_DAMPING'
  | 'L6_CONSERVATION';

/**
 * Invariant definition
 */
export interface InvariantDefinition {
  readonly id: InvariantId;
  readonly name: string;
  readonly description: string;
  readonly formula: string;
  readonly constraint: string;
}

/**
 * The 6 fundamental laws of OMEGA V4.4
 */
export const INVARIANTS: Record<InvariantId, InvariantDefinition> = {
  L1_CYCLIC_PHASE: {
    id: 'L1_CYCLIC_PHASE',
    name: 'Cyclic Phase Law',
    description: 'Phase angle phi remains within cyclic bounds',
    formula: 'phi = phi mod PHASE_CYCLE',
    constraint: 'phi is in [0, PHASE_CYCLE)'
  },

  L2_BOUNDED_INTENSITY: {
    id: 'L2_BOUNDED_INTENSITY',
    name: 'Bounded Intensity Law',
    description: 'Intensity mu stays within defined bounds',
    formula: 'mu_bounded = clamp(mu, MU_MIN, MU_MAX)',
    constraint: 'mu is in [MU_MIN, MU_MAX]'
  },

  L3_BOUNDED_PERSISTENCE: {
    id: 'L3_BOUNDED_PERSISTENCE',
    name: 'Bounded Persistence Law',
    description: 'Persistence Z stays within normalized bounds',
    formula: 'Z_bounded = clamp(Z, Z_MIN, Z_MAX)',
    constraint: 'Z is in [Z_MIN, Z_MAX]'
  },

  L4_DECAY_LAW: {
    id: 'L4_DECAY_LAW',
    name: 'Exponential Decay Law',
    description: 'Intensity decays exponentially toward equilibrium',
    formula: 'I(t) = E0 + (I0 - E0) * exp(-lambda_eff * t) * cos(omega * t + phi)',
    constraint: 'I(t) converges to E0 as t approaches infinity'
  },

  L5_HYSTERIC_DAMPING: {
    id: 'L5_HYSTERIC_DAMPING',
    name: 'Hysteretic Damping Law',
    description: 'Effective lambda depends on accumulated fatigue',
    formula: 'lambda_eff = lambda * (1 - mu * Z / C)',
    constraint: 'lambda_eff is in (0, lambda] when Z is in [0, C]'
  },

  L6_CONSERVATION: {
    id: 'L6_CONSERVATION',
    name: 'Total Intensity Conservation',
    description: 'Sum of emotion vectors is bounded',
    formula: 'sum(|E_i|) <= TOTAL_MAX',
    constraint: 'System cannot have unbounded total emotional energy'
  }
} as const;

/**
 * Array of all invariant IDs for iteration
 */
export const INVARIANT_IDS: readonly InvariantId[] = [
  'L1_CYCLIC_PHASE',
  'L2_BOUNDED_INTENSITY',
  'L3_BOUNDED_PERSISTENCE',
  'L4_DECAY_LAW',
  'L5_HYSTERIC_DAMPING',
  'L6_CONSERVATION'
] as const;

/**
 * Get invariant by ID
 */
export function getInvariant(id: InvariantId): InvariantDefinition {
  return INVARIANTS[id];
}

/**
 * Verify all 6 invariants are defined
 */
export function verifyInvariantsComplete(): boolean {
  return INVARIANT_IDS.length === Object.keys(INVARIANTS).length &&
         INVARIANT_IDS.every(id => INVARIANTS[id] !== undefined);
}

/**
 * Get count of invariants
 */
export function getInvariantCount(): number {
  return INVARIANT_IDS.length;
}
