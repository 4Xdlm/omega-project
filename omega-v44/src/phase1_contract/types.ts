/**
 * OMEGA V4.4 — Phase 1: Base Types
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * NO MAGIC NUMBERS - Values come from canon constants or runtime injection
 */

// ═══════════════════════════════════════════════════════════════════════════
// EMOTION IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════

export type EmotionCategory = 'MAJEURE' | 'INTERMEDIAIRE' | 'MINEURE' | 'BENIGNE';

export type EmotionId =
  | 'AMOUR' | 'HAINE' | 'TERREUR' | 'DEUIL'
  | 'JOIE' | 'TRISTESSE' | 'COLERE' | 'PEUR'
  | 'ESPOIR' | 'NOSTALGIE' | 'ANXIETE' | 'CULPABILITE'
  | 'SURPRISE' | 'DEGOUT' | 'ENNUI' | 'SERENITE';

export const EMOTION_IDS = [
  'AMOUR', 'HAINE', 'TERREUR', 'DEUIL',
  'JOIE', 'TRISTESSE', 'COLERE', 'PEUR',
  'ESPOIR', 'NOSTALGIE', 'ANXIETE', 'CULPABILITE',
  'SURPRISE', 'DEGOUT', 'ENNUI', 'SERENITE'
] as const satisfies readonly EmotionId[];

// ═══════════════════════════════════════════════════════════════════════════
// SYMBOLIC BOUNDS (Relational, not numeric values in contract layer)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Symbolic bounds interface - actual values injected at runtime
 * This maintains Phase 1's symbolic purity
 */
export interface SymbolicBounds {
  readonly X_MIN: symbol;
  readonly X_MAX: symbol;
  readonly Y_MIN: symbol;
  readonly Y_MAX: symbol;
  readonly Z_MIN: symbol;
  readonly Z_MAX: symbol;
  readonly M_MIN_EXCLUSIVE: symbol;
  readonly M_MAX: symbol;
  readonly KAPPA_MIN: symbol;
  readonly KAPPA_MAX: symbol;
}

/**
 * Runtime bounds - actual numeric values injected from configuration
 */
export interface RuntimeBounds {
  readonly X: { readonly min: number; readonly max: number };
  readonly Y: { readonly min: number; readonly max: number };
  readonly Z: { readonly min: number; readonly max: number };
  readonly M: { readonly min: number; readonly max: number; readonly exclusiveMin: boolean };
  readonly kappa: { readonly min: number; readonly max: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// AXIS TYPES (Branded for type safety)
// ═══════════════════════════════════════════════════════════════════════════

declare const AxisXBrand: unique symbol;
declare const AxisYBrand: unique symbol;
declare const AxisZBrand: unique symbol;

export type AxisX = number & { readonly [AxisXBrand]: typeof AxisXBrand };
export type AxisY = number & { readonly [AxisYBrand]: typeof AxisYBrand };
export type AxisZ = number & { readonly [AxisZBrand]: typeof AxisZBrand };

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════

export type ValidationStatus = 'VALID' | 'INVALID';

export interface ValidationResult {
  readonly status: ValidationStatus;
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'READ' | 'WRITE' | 'META';

// ═══════════════════════════════════════════════════════════════════════════
// WINDOW TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type WindowType = 'SHORT' | 'MEDIUM' | 'LONG';

// ═══════════════════════════════════════════════════════════════════════════
// COMPASS DIRECTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type CompassDirection = 'N' | 'S' | 'E' | 'O';

// ═══════════════════════════════════════════════════════════════════════════
// O2 STATUS
// ═══════════════════════════════════════════════════════════════════════════

export type O2Status = 'O2_STABLE' | 'O2_CRITICAL' | 'O2_DEPLETED' | 'O2_SATURATED';
