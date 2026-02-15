/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — EMOTION TO IMAGERY SEED
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: symbol/emotion-to-imagery.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * 100% CALC — 0 token — Fully deterministic
 * Calcule un SEED déterministe à partir du vecteur 14D
 * Mapping valence/arousal → imagery modes + syntax profile + interiority ratio
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionQuartile } from '../types.js';
import type { ImageryMode, SyntaxProfile } from './symbol-map-types.js';

export interface ImagerySeed {
  readonly imagery_modes: readonly [ImageryMode, ImageryMode];
  readonly syntax_profile: SyntaxProfile;
  readonly interiority_ratio: number;
}

/**
 * FONCTION PRINCIPALE — appelée pour chaque quartile
 * 100% CALC, 100% déterministe
 */
export function computeImagerySeed(quartile: EmotionQuartile): ImagerySeed {
  const valence = quartile.valence;
  const arousal = quartile.arousal;
  const dominant = quartile.dominant;

  const imagery_modes = mapValenceArousalToImagery(valence, arousal);
  const syntax_profile = mapArousalToSyntax(arousal);
  const interiority_ratio = mapDominantToInteriority(dominant);

  return { imagery_modes, syntax_profile, interiority_ratio };
}

/**
 * MAPPING DÉTERMINISTE: valence/arousal → imagery modes
 */
function mapValenceArousalToImagery(valence: number, arousal: number): readonly [ImageryMode, ImageryMode] {
  // valence < -0.3 ET arousal > 0.5 → ['obscurité', 'mécanique']
  if (valence < -0.3 && arousal > 0.5) {
    return ['obscurité', 'mécanique'];
  }

  // valence < -0.3 ET arousal ≤ 0.5 → ['souterrain', 'minéral']
  if (valence < -0.3 && arousal <= 0.5) {
    return ['souterrain', 'minéral'];
  }

  // valence > 0.3 ET arousal > 0.5 → ['lumière', 'aérien']
  if (valence > 0.3 && arousal > 0.5) {
    return ['lumière', 'aérien'];
  }

  // valence > 0.3 ET arousal ≤ 0.5 → ['végétal', 'chaleur']
  if (valence > 0.3 && arousal <= 0.5) {
    return ['végétal', 'chaleur'];
  }

  // |valence| ≤ 0.3 ET arousal > 0.6 → ['mécanique', 'liquide']
  if (Math.abs(valence) <= 0.3 && arousal > 0.6) {
    return ['mécanique', 'liquide'];
  }

  // |valence| ≤ 0.3 ET arousal ≤ 0.6 → ['organique', 'minéral']
  return ['organique', 'minéral'];
}

/**
 * MAPPING DÉTERMINISTE: arousal → syntax profile
 */
function mapArousalToSyntax(arousal: number): SyntaxProfile {
  // arousal > 0.7 → fragmenté
  if (arousal > 0.7) {
    return {
      short_ratio: 0.6,
      avg_len_target: 8,
      punctuation_style: 'fragmenté',
    };
  }

  // arousal > 0.4 → standard
  if (arousal > 0.4) {
    return {
      short_ratio: 0.3,
      avg_len_target: 15,
      punctuation_style: 'standard',
    };
  }

  // arousal ≤ 0.4 → dense
  return {
    short_ratio: 0.1,
    avg_len_target: 22,
    punctuation_style: 'dense',
  };
}

/**
 * MAPPING DÉTERMINISTE: dominant emotion → interiority ratio
 */
function mapDominantToInteriority(dominant: string): number {
  // dominant in ['sadness','guilt','shame','nostalgia'] → 0.8
  if (['sadness', 'guilt', 'shame', 'nostalgia'].includes(dominant)) {
    return 0.8;
  }

  // dominant in ['fear','anxiety','disgust'] → 0.5
  if (['fear', 'anxiety', 'disgust'].includes(dominant)) {
    return 0.5;
  }

  // dominant in ['anger','contempt'] → 0.3
  if (['anger', 'contempt'].includes(dominant)) {
    return 0.3;
  }

  // dominant in ['joy','surprise','anticipation'] → 0.4
  if (['joy', 'surprise', 'anticipation'].includes(dominant)) {
    return 0.4;
  }

  // default → 0.5
  return 0.5;
}
