/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SYMBOL MAP ORACLE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: symbol/symbol-map-oracle.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * 100% CALC — 0 token — 9 checks de validation
 * FAIL-CLOSED: si FATAL error, valid = false
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket } from '../types.js';
import type { SymbolMap, ValidationError } from './symbol-map-types.js';
import { computeImagerySeed } from './emotion-to-imagery.js';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly string[];
}

/**
 * Valide un SymbolMap avec 9 checks déterministes
 */
export function validateSymbolMap(map: SymbolMap, packet: ForgePacket): ValidationResult {
  const errors: ValidationError[] = [];

  // CHECK 1: QUOTAS_SUM — Σ(sensory_quota) = 1.0 (±0.01) par quartile
  for (const q of map.quartiles) {
    const sum =
      q.sensory_quota.vue +
      q.sensory_quota.son +
      q.sensory_quota.toucher +
      q.sensory_quota.odeur +
      q.sensory_quota.temperature;

    if (Math.abs(sum - 1.0) > 0.01) {
      errors.push({
        field: `quartile.${q.quartile}.sensory_quota`,
        message: `Sum=${sum.toFixed(3)}, expected 1.0`,
        severity: 'FATAL',
      });
    }
  }

  // CHECK 2: NO_KILL_WORDS — aucun lexical_field dans kill_lists.banned_words
  for (const q of map.quartiles) {
    for (const field of q.lexical_fields) {
      if (packet.kill_lists.banned_words.some((w) => field.toLowerCase().includes(w.toLowerCase()))) {
        errors.push({
          field: `quartile.${q.quartile}.lexical_fields`,
          message: `"${field}" in kill_list`,
          severity: 'FATAL',
        });
      }
    }
  }

  // CHECK 3: NO_CLICHE — aucun replacement dans cliche blacklist
  for (const r of map.global.anti_cliche_replacements) {
    if (
      packet.kill_lists.banned_cliches.some((c) => r.replacement.toLowerCase().includes(c.toLowerCase()))
    ) {
      errors.push({
        field: 'global.anti_cliche_replacements',
        message: `Replacement "${r.replacement}" is itself a cliché`,
        severity: 'FATAL',
      });
    }
  }

  // CHECK 4: IMAGERY_COHERENCE — imagery_modes dans VALID_IMAGERY_MODES
  // ET cohérents avec valence/arousal (tolérance: 1 différence OK, 2 = FAIL)
  const VALID_MODES = [
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
  ];

  for (let i = 0; i < 4; i++) {
    const q = map.quartiles[i];
    for (const mode of q.imagery_modes) {
      if (!VALID_MODES.includes(mode)) {
        errors.push({
          field: `quartile.${q.quartile}.imagery_modes`,
          message: `Invalid mode "${mode}"`,
          severity: 'FATAL',
        });
      }
    }

    // Comparer avec le seed CALC
    const seed = computeImagerySeed(packet.emotion_contract.curve_quartiles[i]);
    const diff = q.imagery_modes.filter((m, idx) => m !== seed.imagery_modes[idx]).length;
    if (diff > 1) {
      errors.push({
        field: `quartile.${q.quartile}.imagery_modes`,
        message: `Too far from CALC seed (${diff} differences)`,
        severity: 'FATAL',
      });
    }
  }

  // CHECK 5: DIVERSITY — au moins 3 lexical_fields distincts sur les 4 quartiles
  const allFields = new Set(map.quartiles.flatMap((q) => [...q.lexical_fields]));
  if (allFields.size < 3) {
    errors.push({
      field: 'quartiles.lexical_fields',
      message: `Only ${allFields.size} distinct fields, need ≥3`,
      severity: 'FATAL',
    });
  }

  // CHECK 6: SYNTAX_RANGE — short_ratio varie d'au moins 0.15 entre Q min et Q max
  const shortRatios = map.quartiles.map((q) => q.syntax_profile.short_ratio);
  const range = Math.max(...shortRatios) - Math.min(...shortRatios);
  if (range < 0.15) {
    errors.push({
      field: 'quartiles.syntax_profile.short_ratio',
      message: `Range=${range.toFixed(2)}, need ≥0.15`,
      severity: 'ERROR',
    });
  }

  // CHECK 7: NO_CONTRADICTION — interiority delta max 0.5 entre quartiles adjacents
  for (let i = 1; i < 4; i++) {
    const delta = Math.abs(map.quartiles[i].interiority_ratio - map.quartiles[i - 1].interiority_ratio);
    if (delta > 0.5) {
      errors.push({
        field: `quartiles.interiority_ratio`,
        message: `Delta ${i}=${delta.toFixed(2)}, max 0.5`,
        severity: 'ERROR',
      });
    }
  }

  // CHECK 8: FORBIDDEN_MOVES — au moins 3
  if (map.global.forbidden_moves.length < 3) {
    errors.push({
      field: 'global.forbidden_moves',
      message: `Only ${map.global.forbidden_moves.length}, need ≥3`,
      severity: 'ERROR',
    });
  }

  // CHECK 9: COMMANDMENT — non vide, ≤150 chars
  if (!map.global.one_line_commandment || map.global.one_line_commandment.length > 150) {
    errors.push({
      field: 'global.one_line_commandment',
      message: `Empty or >150 chars`,
      severity: 'ERROR',
    });
  }

  return {
    valid: errors.filter((e) => e.severity === 'FATAL').length === 0,
    errors,
    warnings: errors.filter((e) => e.severity === 'ERROR').map((e) => e.message),
  };
}
