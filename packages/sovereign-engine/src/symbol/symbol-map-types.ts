/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SYMBOL MAPPER TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: symbol/symbol-map-types.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * SYMBOL MAP — Cartographie symbolique déterministe par quartile
 * Génère des champs lexicaux, imagery modes, sensory quotas
 * Avec validation oracle 9 checks
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface SymbolMap {
  readonly map_id: string;
  readonly map_hash: string;
  readonly scene_id: string;
  readonly generation_seed: string;
  readonly generation_temperature: number;
  readonly validation_status: 'VALID' | 'INVALID';
  readonly generation_pass: number; // 1, 2, ou 3
  readonly quartiles: readonly [SymbolQuartile, SymbolQuartile, SymbolQuartile, SymbolQuartile];
  readonly global: SymbolGlobal;
}

export interface SymbolQuartile {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly lexical_fields: readonly [string, string, string];
  readonly imagery_modes: readonly [string, string];
  readonly sensory_quota: SensoryQuota;
  readonly syntax_profile: SyntaxProfile;
  readonly interiority_ratio: number; // 0.0–1.0
  readonly signature_hooks: readonly string[];
  readonly taboos: readonly string[];
}

export interface SensoryQuota {
  readonly vue: number;
  readonly son: number;
  readonly toucher: number;
  readonly odeur: number;
  readonly temperature: number;
  // Σ DOIT = 1.0 (±0.01)
}

export interface SyntaxProfile {
  readonly short_ratio: number; // 0.0–1.0
  readonly avg_len_target: number; // mots par phrase
  readonly punctuation_style: 'minimal' | 'standard' | 'dense' | 'fragmenté';
}

export interface SymbolGlobal {
  readonly one_line_commandment: string; // ≤150 chars
  readonly forbidden_moves: readonly string[]; // min 3
  readonly anti_cliche_replacements: readonly AntiClicheReplacement[];
}

export interface AntiClicheReplacement {
  readonly cliche: string;
  readonly replacement: string;
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly severity: 'FATAL' | 'ERROR';
}

// Catégories d'imagery valides (pour validation oracle)
export const VALID_IMAGERY_MODES = [
  'organique',
  'mécanique',
  'minéral',
  'liquide',
  'chaleur',
  'obscurité',
  'lumière',
  'végétal',
  'aérien',
  'souterrain',
] as const;

export type ImageryMode = (typeof VALID_IMAGERY_MODES)[number];
