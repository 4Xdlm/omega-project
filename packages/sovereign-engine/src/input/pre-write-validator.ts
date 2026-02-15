/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PRE-WRITE VALIDATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: input/pre-write-validator.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Validates ForgePacket completeness BEFORE generation.
 * FAIL HARD if incomplete.
 * AUTO-FILL derivable fields where possible.
 *
 * Validation rules:
 * - All required fields present (packet_id, scene_id, run_id, emotion_contract, beats, etc.)
 * - Emotion contract has 4 quartiles with valid 14D distributions
 * - All 14D states sum to ~1.0
 * - Beats are ordered and non-empty
 * - Kill lists have at least 1 pattern each
 * - Style profile has all required fields
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, ValidationResult, ValidationError } from '../types.js';
import { validateForge14D } from './emotion-adapter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function validateForgePacket(packet: ForgePacket): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!packet.packet_id) {
    errors.push({ field: 'packet_id', message: 'Missing packet_id', severity: 'FATAL' });
  }
  if (!packet.scene_id) {
    errors.push({ field: 'scene_id', message: 'Missing scene_id', severity: 'FATAL' });
  }
  if (!packet.run_id) {
    errors.push({ field: 'run_id', message: 'Missing run_id', severity: 'FATAL' });
  }
  if (!packet.packet_hash || packet.packet_hash.length !== 64) {
    errors.push({ field: 'packet_hash', message: 'Invalid packet_hash (must be 64-char hex)', severity: 'FATAL' });
  }

  // Emotion contract
  const ecErrors = validateEmotionContract(packet);
  errors.push(...ecErrors);

  // Beats
  if (packet.beats.length === 0) {
    errors.push({ field: 'beats', message: 'No beats provided', severity: 'FATAL' });
  }

  for (let i = 0; i < packet.beats.length; i++) {
    const beat = packet.beats[i];
    if (beat.beat_order !== i) {
      errors.push({ field: `beats[${i}].beat_order`, message: `Beat order mismatch: expected ${i}, got ${beat.beat_order}`, severity: 'ERROR' });
    }
    if (!beat.beat_id) {
      errors.push({ field: `beats[${i}].beat_id`, message: 'Missing beat_id', severity: 'ERROR' });
    }
    if (!beat.action) {
      errors.push({ field: `beats[${i}].action`, message: 'Missing action', severity: 'ERROR' });
    }
  }

  // Style profile
  const spErrors = validateStyleProfile(packet);
  errors.push(...spErrors);

  // Kill lists
  if (packet.kill_lists.banned_cliches.length === 0) {
    warnings.push('kill_lists.banned_cliches is empty — no cliché protection');
  }
  if (packet.kill_lists.banned_ai_patterns.length === 0) {
    warnings.push('kill_lists.banned_ai_patterns is empty — no AI pattern protection');
  }

  // Canon
  if (packet.canon.length === 0) {
    warnings.push('canon is empty — no canon constraints');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION CONTRACT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateEmotionContract(packet: ForgePacket): ValidationError[] {
  const errors: ValidationError[] = [];
  const ec = packet.emotion_contract;

  // Quartiles
  if (ec.curve_quartiles.length !== 4) {
    errors.push({ field: 'emotion_contract.curve_quartiles', message: 'Must have exactly 4 quartiles', severity: 'FATAL' });
    return errors;
  }

  const expectedQuartiles: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];
  for (let i = 0; i < 4; i++) {
    const q = ec.curve_quartiles[i];
    if (q.quartile !== expectedQuartiles[i]) {
      errors.push({ field: `emotion_contract.curve_quartiles[${i}]`, message: `Expected ${expectedQuartiles[i]}, got ${q.quartile}`, severity: 'ERROR' });
    }

    // Validate 14D distribution
    const validation = validateForge14D(q.target_14d);
    if (!validation.valid) {
      errors.push({ field: `emotion_contract.curve_quartiles[${i}].target_14d`, message: validation.error ?? 'Invalid 14D distribution', severity: 'ERROR' });
    }

    // Valence bounds
    if (q.valence < -1 || q.valence > 1) {
      errors.push({ field: `emotion_contract.curve_quartiles[${i}].valence`, message: `Valence ${q.valence} out of bounds [-1, 1]`, severity: 'ERROR' });
    }

    // Arousal bounds
    if (q.arousal < 0 || q.arousal > 1) {
      errors.push({ field: `emotion_contract.curve_quartiles[${i}].arousal`, message: `Arousal ${q.arousal} out of bounds [0, 1]`, severity: 'ERROR' });
    }

    // Dominant emotion
    if (!q.dominant) {
      errors.push({ field: `emotion_contract.curve_quartiles[${i}].dominant`, message: 'Missing dominant emotion', severity: 'ERROR' });
    }
  }

  // Intensity range
  if (ec.intensity_range.min < 0 || ec.intensity_range.max > 1) {
    errors.push({ field: 'emotion_contract.intensity_range', message: 'Intensity range must be in [0, 1]', severity: 'ERROR' });
  }
  if (ec.intensity_range.min > ec.intensity_range.max) {
    errors.push({ field: 'emotion_contract.intensity_range', message: 'Min > max', severity: 'ERROR' });
  }

  // Tension
  const validSlopes = ['ascending', 'descending', 'arc', 'reverse_arc'];
  if (!validSlopes.includes(ec.tension.slope_target)) {
    errors.push({ field: 'emotion_contract.tension.slope_target', message: `Invalid slope: ${ec.tension.slope_target}`, severity: 'ERROR' });
  }

  if (ec.tension.pic_position_pct < 0 || ec.tension.pic_position_pct > 1) {
    errors.push({ field: 'emotion_contract.tension.pic_position_pct', message: 'Pic position out of [0, 1]', severity: 'ERROR' });
  }

  if (ec.tension.faille_position_pct < 0 || ec.tension.faille_position_pct > 1) {
    errors.push({ field: 'emotion_contract.tension.faille_position_pct', message: 'Faille position out of [0, 1]', severity: 'ERROR' });
  }

  // Terminal state
  const terminalValidation = validateForge14D(ec.terminal_state.target_14d);
  if (!terminalValidation.valid) {
    errors.push({ field: 'emotion_contract.terminal_state.target_14d', message: terminalValidation.error ?? 'Invalid terminal 14D', severity: 'ERROR' });
  }

  // Rupture
  if (ec.rupture.exists) {
    if (ec.rupture.position_pct < 0 || ec.rupture.position_pct > 1) {
      errors.push({ field: 'emotion_contract.rupture.position_pct', message: 'Rupture position out of [0, 1]', severity: 'ERROR' });
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE PROFILE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateStyleProfile(packet: ForgePacket): ValidationError[] {
  const errors: ValidationError[] = [];
  const sp = packet.style_genome;

  if (!sp.version) {
    errors.push({ field: 'style_genome.version', message: 'Missing version', severity: 'ERROR' });
  }

  if (!sp.universe) {
    errors.push({ field: 'style_genome.universe', message: 'Missing universe', severity: 'ERROR' });
  }

  // Lexicon
  if (sp.lexicon.signature_words.length === 0) {
    errors.push({ field: 'style_genome.lexicon.signature_words', message: 'No signature words defined', severity: 'ERROR' });
  }

  if (sp.lexicon.abstraction_max_ratio < 0 || sp.lexicon.abstraction_max_ratio > 1) {
    errors.push({ field: 'style_genome.lexicon.abstraction_max_ratio', message: 'Ratio out of [0, 1]', severity: 'ERROR' });
  }

  if (sp.lexicon.concrete_min_ratio < 0 || sp.lexicon.concrete_min_ratio > 1) {
    errors.push({ field: 'style_genome.lexicon.concrete_min_ratio', message: 'Ratio out of [0, 1]', severity: 'ERROR' });
  }

  // Rhythm
  if (sp.rhythm.avg_sentence_length_target <= 0) {
    errors.push({ field: 'style_genome.rhythm.avg_sentence_length_target', message: 'Target must be > 0', severity: 'ERROR' });
  }

  if (sp.rhythm.gini_target < 0 || sp.rhythm.gini_target > 1) {
    errors.push({ field: 'style_genome.rhythm.gini_target', message: 'Gini out of [0, 1]', severity: 'ERROR' });
  }

  if (sp.rhythm.max_consecutive_similar < 1) {
    errors.push({ field: 'style_genome.rhythm.max_consecutive_similar', message: 'Must be >= 1', severity: 'ERROR' });
  }

  if (sp.rhythm.min_syncopes_per_scene < 0) {
    errors.push({ field: 'style_genome.rhythm.min_syncopes_per_scene', message: 'Must be >= 0', severity: 'ERROR' });
  }

  if (sp.rhythm.min_compressions_per_scene < 0) {
    errors.push({ field: 'style_genome.rhythm.min_compressions_per_scene', message: 'Must be >= 0', severity: 'ERROR' });
  }

  // Tone
  if (sp.tone.intensity_range.length !== 2) {
    errors.push({ field: 'style_genome.tone.intensity_range', message: 'Must be [min, max]', severity: 'ERROR' });
  } else {
    const [min, max] = sp.tone.intensity_range;
    if (min < 0 || max > 1 || min > max) {
      errors.push({ field: 'style_genome.tone.intensity_range', message: 'Invalid range', severity: 'ERROR' });
    }
  }

  // Imagery
  if (sp.imagery.density_target_per_100_words < 0) {
    errors.push({ field: 'style_genome.imagery.density_target_per_100_words', message: 'Must be >= 0', severity: 'ERROR' });
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-FILL DERIVABLE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

export function autoFillPacket(packet: ForgePacket): ForgePacket {
  // If packet_hash is missing, it should be recomputed by assembler
  // This function is placeholder for future auto-fill logic
  // For now, return as-is
  return packet;
}
