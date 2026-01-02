// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MORPHO ENGINE v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Moteur morphologique: Direction, Couleur, Forme des branches
// Utilise L-System officiel: F → F[+F]F[-F]F
// ═══════════════════════════════════════════════════════════════════════════════

import {
  EmotionType,
  EmotionField,
  Vector3,
  HSL,
  IntensityRecord14,
  EMOTION_TYPES,
  PHYSICS
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

/**
 * Générateur pseudo-aléatoire déterministe (Mulberry32)
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash simple pour générer un seed déterministe depuis une string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ─────────────────────────────────────────────────────────────────────────────
// HSL — COULEUR ÉMOTIONNELLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapping émotion → Hue (14D)
 * Basé sur la roue chromatique émotionnelle étendue
 */
export const EMOTION_HUE_MAP: Record<EmotionType, number> = {
  // Émotions chaudes
  anger: 0,             // Rouge pur
  anticipation: 30,     // Orange
  joy: 50,              // Or/Jaune doré
  pride: 45,            // Ambre
  hope: 60,             // Jaune

  // Émotions vertes
  trust: 120,           // Vert confiance
  disgust: 90,          // Vert malade

  // Émotions froides
  surprise: 180,        // Cyan
  fear: 260,            // Violet
  sadness: 210,         // Bleu mélancolie
  despair: 220,         // Bleu sombre
  guilt: 240,           // Indigo
  shame: 280,           // Pourpre

  // Émotions roses
  love: 330             // Rose/Magenta
};

/**
 * Calcule la couleur HSL basée sur le champ émotionnel
 * 
 * H = Hue de l'émotion dominante
 * S = Intensité émotionnelle (0.25 + 0.75 × peak)
 * L = Oxygène narratif (0.10 + 0.80 × O₂)
 */
export function computeHSL(
  field: EmotionField,
  oxygen: number
): HSL {
  // Hue: basé sur émotion dominante
  const h = EMOTION_HUE_MAP[field.dominant] ?? 0;

  // Saturation: intensité (plus intense = plus saturé)
  // Range: 0.25 - 1.0
  const s = clamp(0.25 + 0.75 * field.peak, 0, 1);

  // Lightness: oxygène (plus d'O₂ = plus clair/vivant)
  // Range: 0.10 - 0.90
  const l = clamp(0.10 + 0.80 * oxygen, 0, 1);

  return { h, s, l };
}

/**
 * Calcule le Hue moyen pondéré (pour mélanges émotionnels)
 */
export function computeWeightedHue(intensities: IntensityRecord14): number {
  // Conversion en coordonnées circulaires pour moyenne angulaire
  let sinSum = 0;
  let cosSum = 0;

  for (const type of EMOTION_TYPES) {
    const weight = intensities[type] ?? 0;
    const hue = EMOTION_HUE_MAP[type] ?? 0;
    const rad = (hue * Math.PI) / 180;
    sinSum += weight * Math.sin(rad);
    cosSum += weight * Math.cos(rad);
  }

  // Moyenne angulaire
  let avgRad = Math.atan2(sinSum, cosSum);
  if (avgRad < 0) avgRad += 2 * Math.PI;

  return (avgRad * 180) / Math.PI;
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTOGRAMME HUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère un histogramme Hue (24 bins: 0-15°, 15-30°, ..., 345-360°)
 */
export function computeHueHistogram(hues: number[]): readonly number[] {
  const bins = PHYSICS.HUE_HISTOGRAM_BINS;
  const histogram = new Array(bins).fill(0);

  if (hues.length === 0) {
    const uniform = 1 / bins;
    return histogram.map(() => uniform);
  }

  const binSize = 360 / bins; // 15° par bin

  for (const hue of hues) {
    const normalized = ((hue % 360) + 360) % 360;
    const binIndex = Math.floor(normalized / binSize);
    histogram[Math.min(binIndex, bins - 1)]++;
  }

  // Normalisation
  const total = hues.length;
  return histogram.map(count => count / total);
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTION 3D (Boussole Narrative)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapping émotion → contribution directionnelle
 * 
 * Y (vertical): Joie ↑ / Tristesse ↓
 * X (latéral): Colère → expansion / Peur ← contraction
 * Z (profondeur): Surprise → élan / Dégoût ← recul
 */
const EMOTION_DIRECTION_MAP: Record<EmotionType, Vector3> = {
  // Axe Y (vertical)
  joy: { x: 0, y: 1, z: 0 },
  hope: { x: 0, y: 0.8, z: 0.2 },
  pride: { x: 0.2, y: 0.7, z: 0 },
  sadness: { x: 0, y: -1, z: 0 },
  despair: { x: 0, y: -0.9, z: -0.3 },
  shame: { x: -0.2, y: -0.8, z: 0 },
  guilt: { x: 0, y: -0.7, z: -0.2 },

  // Axe X (latéral)
  anger: { x: 1, y: 0.2, z: 0 },
  fear: { x: -1, y: 0, z: 0 },

  // Axe Z (profondeur)
  surprise: { x: 0, y: 0.3, z: 1 },
  anticipation: { x: 0.3, y: 0.2, z: 0.8 },
  disgust: { x: 0, y: -0.2, z: -1 },

  // Émotions mixtes
  trust: { x: 0.5, y: 0.5, z: 0.3 },
  love: { x: 0, y: 0.6, z: 0.4 }
};

/**
 * Calcule la direction 3D normalisée basée sur les émotions
 * 
 * @param field - Champ émotionnel
 * @param nodeId - ID du nœud (pour bruit déterministe)
 * @param seed - Seed global
 */
export function computeDirection(
  field: EmotionField,
  nodeId: string,
  seed: number
): Vector3 {
  // Direction de base: somme pondérée
  let x = 0, y = 0, z = 0;

  for (const type of EMOTION_TYPES) {
    const weight = field.normalizedIntensities[type] ?? 0;
    const dir = EMOTION_DIRECTION_MAP[type];
    x += weight * dir.x;
    y += weight * dir.y;
    z += weight * dir.z;
  }

  // Bruit organique déterministe (±4%)
  const noiseSeed = hashString(nodeId) ^ seed;
  const rng = mulberry32(noiseSeed);
  const noiseScale = 0.04;

  x += (rng() - 0.5) * 2 * noiseScale;
  y += (rng() - 0.5) * 2 * noiseScale;
  z += (rng() - 0.5) * 2 * noiseScale;

  // Normalisation
  const length = Math.sqrt(x * x + y * y + z * z);
  if (length < 1e-9) {
    return { x: 0, y: 1, z: 0 }; // Défaut: vers le haut
  }

  return {
    x: x / length,
    y: y / length,
    z: z / length
  };
}

/**
 * Vérifie qu'un vecteur est normalisé
 */
export function isNormalized(v: Vector3, tolerance: number = 0.01): boolean {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return Math.abs(length - 1) < tolerance;
}

// ─────────────────────────────────────────────────────────────────────────────
// L-SYSTEM (Génération branches)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * L-System officiel OMEGA
 * Axiom: "F"
 * Rule: F → F[+F]F[-F]F
 */
export const L_SYSTEM = {
  axiom: "F",
  rules: { F: "F[+F]F[-F]F" },
  angle: 25.7, // Angle de branchement en degrés
};

/**
 * Applique n itérations du L-System
 */
export function applyLSystem(axiom: string, iterations: number): string {
  let current = axiom;

  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const char of current) {
      if (char === "F") {
        next += L_SYSTEM.rules.F;
      } else {
        next += char;
      }
    }
    current = next;
  }

  return current;
}

/**
 * Interprète une string L-System en segments 2D
 * 
 * F = avancer
 * + = tourner à gauche
 * - = tourner à droite
 * [ = push position
 * ] = pop position
 */
export interface LSystemSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
}

export function interpretLSystem(
  lsystem: string,
  stepLength: number = 10,
  initialAngle: number = 90
): LSystemSegment[] {
  const segments: LSystemSegment[] = [];
  const stack: Array<{ x: number; y: number; angle: number; depth: number }> = [];

  let x = 0;
  let y = 0;
  let angle = initialAngle;
  let depth = 0;

  for (const char of lsystem) {
    switch (char) {
      case "F": {
        const rad = (angle * Math.PI) / 180;
        const x2 = x + stepLength * Math.cos(rad);
        const y2 = y + stepLength * Math.sin(rad);
        segments.push({ x1: x, y1: y, x2, y2, depth });
        x = x2;
        y = y2;
        break;
      }
      case "+":
        angle += L_SYSTEM.angle;
        break;
      case "-":
        angle -= L_SYSTEM.angle;
        break;
      case "[":
        stack.push({ x, y, angle, depth });
        depth++;
        break;
      case "]":
        const state = stack.pop();
        if (state) {
          x = state.x;
          y = state.y;
          angle = state.angle;
          depth = state.depth;
        }
        break;
    }
  }

  return segments;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH WEIGHT (Épaisseur visuelle)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le poids de branche avec amplificateur émotionnel
 * 
 * Formule: branchWeight = log1p(gematria) × emotionAmplifier
 * Où emotionAmplifier = 0.8 + 0.6 × intensity (range [0.8, 1.4])
 */
export function computeBranchWeight(
  gematria: number,
  emotionIntensity: number,
  punctDensity: number = 0
): number {
  const textMass = Math.log1p(gematria) * (1 + 0.15 * punctDensity);
  const emotionAmplifier = 0.8 + 0.6 * clamp(emotionIntensity, 0, 1);
  return textMass * emotionAmplifier;
}

/**
 * Calcule l'épaisseur visuelle (0.1 - 1.0)
 */
export function computeThickness(branchWeight: number, maxWeight: number = 10): number {
  return clamp(0.1 + 0.9 * (branchWeight / maxWeight), 0.1, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE
// ─────────────────────────────────────────────────────────────────────────────

export function selfTest(): boolean {
  // Test HSL bounds
  const mockField: EmotionField = {
    states: {} as any,
    normalizedIntensities: {} as any,
    dominant: "anger",
    peak: 0.9,
    totalEnergy: 5,
    entropy: 0.3,
    contrast: 0.5,
    inertia: 0.4,
    conservationDelta: 0.01
  };

  const hsl = computeHSL(mockField, 0.7);
  if (hsl.h < 0 || hsl.h > 360) {
    console.error("FAIL: HSL Hue out of bounds:", hsl.h);
    return false;
  }
  if (hsl.s < 0 || hsl.s > 1) {
    console.error("FAIL: HSL Saturation out of bounds:", hsl.s);
    return false;
  }
  if (hsl.l < 0 || hsl.l > 1) {
    console.error("FAIL: HSL Lightness out of bounds:", hsl.l);
    return false;
  }

  // Test direction normalization
  const intensities: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  for (const t of EMOTION_TYPES) intensities[t] = 0.07;
  intensities.joy = 0.5;

  const fieldWithIntensities = {
    ...mockField,
    normalizedIntensities: intensities as IntensityRecord14
  };

  const dir = computeDirection(fieldWithIntensities, "test-node-1", 42);
  if (!isNormalized(dir)) {
    console.error("FAIL: Direction not normalized:", dir);
    return false;
  }

  // Test direction déterminisme
  const dir2 = computeDirection(fieldWithIntensities, "test-node-1", 42);
  if (dir.x !== dir2.x || dir.y !== dir2.y || dir.z !== dir2.z) {
    console.error("FAIL: Direction not deterministic");
    return false;
  }

  // Test L-System
  const ls1 = applyLSystem("F", 1);
  if (ls1 !== "F[+F]F[-F]F") {
    console.error("FAIL: L-System iteration 1:", ls1);
    return false;
  }

  // Test Hue histogram
  const hist = computeHueHistogram([0, 90, 180, 270]);
  const histSum = hist.reduce((a, b) => a + b, 0);
  if (Math.abs(histSum - 1) > 0.01) {
    console.error("FAIL: Hue histogram sum != 1:", histSum);
    return false;
  }

  console.log("✅ morpho_engine.ts: All tests passed");
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  EMOTION_HUE_MAP,
  EMOTION_DIRECTION_MAP,
  L_SYSTEM,
  computeHSL,
  computeWeightedHue,
  computeHueHistogram,
  computeDirection,
  isNormalized,
  applyLSystem,
  interpretLSystem,
  computeBranchWeight,
  computeThickness,
  selfTest
};
