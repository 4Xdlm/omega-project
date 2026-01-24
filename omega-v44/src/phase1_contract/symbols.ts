/**
 * OMEGA V4.4 — Phase 1: Symbol Dictionary
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * SYMBOLIC DEFINITIONS ONLY - NO NUMERIC VALUES
 * Values are injected at runtime via InjectedConfig
 */

// ═══════════════════════════════════════════════════════════════════════════
// SYMBOLIC CONSTANTS
// All relationships defined symbolically without numeric values
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Symbol dictionary for V4.4 contract
 * These symbols represent relationships, not values
 */
export const SYMBOLS = {
  // Phase cycle - symbolic representation
  PHASE_CYCLE: Symbol('PHASE_CYCLE'),

  // Intensity bounds - symbolic
  MU_MIN: Symbol('MU_MIN'),
  MU_MAX: Symbol('MU_MAX'),

  // Axis bounds - symbolic
  X_MIN: Symbol('X_MIN'),
  X_MAX: Symbol('X_MAX'),
  Y_MIN: Symbol('Y_MIN'),
  Y_MAX: Symbol('Y_MAX'),
  Z_MIN: Symbol('Z_MIN'),
  Z_MAX: Symbol('Z_MAX'),

  // Mass bounds - symbolic
  M_MIN_EXCLUSIVE: Symbol('M_MIN_EXCLUSIVE'),
  M_MAX: Symbol('M_MAX'),

  // Kappa bounds - symbolic
  KAPPA_MIN: Symbol('KAPPA_MIN'),
  KAPPA_MAX: Symbol('KAPPA_MAX'),

  // O2 thresholds - symbolic
  O2_INITIAL: Symbol('O2_INITIAL'),
  O2_MIN: Symbol('O2_MIN'),
  O2_MAX: Symbol('O2_MAX'),
  O2_COST_TIME: Symbol('O2_COST_TIME'),
  O2_GAIN_FACTOR: Symbol('O2_GAIN_FACTOR'),

  // Window parameters - symbolic
  WINDOW_SHORT_N: Symbol('WINDOW_SHORT_N'),
  WINDOW_SHORT_T: Symbol('WINDOW_SHORT_T'),
  WINDOW_MEDIUM_N: Symbol('WINDOW_MEDIUM_N'),
  WINDOW_MEDIUM_T: Symbol('WINDOW_MEDIUM_T'),
  WINDOW_LONG_N: Symbol('WINDOW_LONG_N'),
  WINDOW_LONG_T: Symbol('WINDOW_LONG_T'),
} as const;

/**
 * Symbol names for documentation
 */
export const SYMBOL_DOCS: Record<keyof typeof SYMBOLS, string> = {
  PHASE_CYCLE: 'Period of phase cycle for cyclic emotions',
  MU_MIN: 'Minimum bound for intensity parameter mu',
  MU_MAX: 'Maximum bound for intensity parameter mu',
  X_MIN: 'Minimum bound for X axis (valence)',
  X_MAX: 'Maximum bound for X axis (valence)',
  Y_MIN: 'Minimum bound for Y axis (intensity)',
  Y_MAX: 'Maximum bound for Y axis (intensity)',
  Z_MIN: 'Minimum bound for Z axis (persistence)',
  Z_MAX: 'Maximum bound for Z axis (persistence)',
  M_MIN_EXCLUSIVE: 'Exclusive minimum bound for mass M',
  M_MAX: 'Maximum bound for mass M',
  KAPPA_MIN: 'Minimum bound for kappa speed factor',
  KAPPA_MAX: 'Maximum bound for kappa speed factor',
  O2_INITIAL: 'Initial O2 level at start',
  O2_MIN: 'Minimum O2 threshold (critical zone)',
  O2_MAX: 'Maximum O2 level (saturation)',
  O2_COST_TIME: 'O2 erosion cost per time unit',
  O2_GAIN_FACTOR: 'O2 regeneration gain factor',
  WINDOW_SHORT_N: 'Short window max snapshot count',
  WINDOW_SHORT_T: 'Short window max duration',
  WINDOW_MEDIUM_N: 'Medium window max snapshot count',
  WINDOW_MEDIUM_T: 'Medium window max duration',
  WINDOW_LONG_N: 'Long window max snapshot count',
  WINDOW_LONG_T: 'Long window max duration',
};

/**
 * Type for symbol keys
 */
export type SymbolKey = keyof typeof SYMBOLS;

/**
 * Get symbol by key
 */
export function getSymbol(key: SymbolKey): symbol {
  return SYMBOLS[key];
}

/**
 * Get documentation for symbol
 */
export function getSymbolDoc(key: SymbolKey): string {
  return SYMBOL_DOCS[key];
}

/**
 * Check if all symbols are defined
 */
export function verifySymbolsComplete(): boolean {
  const symbolKeys = Object.keys(SYMBOLS) as SymbolKey[];
  const docKeys = Object.keys(SYMBOL_DOCS) as SymbolKey[];
  return symbolKeys.every(k => docKeys.includes(k)) &&
         docKeys.every(k => symbolKeys.includes(k));
}
