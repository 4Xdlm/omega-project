// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MYCELIUM BIO v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Module de génération de l'ADN émotionnel des livres
// Carte d'identité unique basée sur l'analyse émotionnelle
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type {
  // Émotions
  EmotionType,
  EmotionState,
  EmotionRecord14,
  IntensityRecord14,
  EmotionField,
  
  // Bio
  OxygenResult,
  BioMarker,
  MarkerType,
  MarkerReason,
  
  // Morpho
  Vector3,
  HSL,
  
  // Nodes
  MyceliumNode,
  MyceliumNodeKind,
  
  // DNA
  MyceliumDNA,
  MyceliumFingerprint,
  
  // Similarité
  SimilarityResult,
  
  // Projection 8D
  PlutchikType
} from "./types.js";

export {
  EMOTION_TYPES,
  EMOTION_COUNT,
  PLUTCHIK_TYPES,
  EMOTION_14_TO_8,
  PHYSICS,
  NEUTRAL_EMOTION_STATE
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL JSON
// ─────────────────────────────────────────────────────────────────────────────

export {
  canonicalStringify,
  canonicalParse,
  canonicalHash,
  canonicalHashSync,
  canonicalEquals,
  canonicalClone
} from "./canonical_json.js";

// ─────────────────────────────────────────────────────────────────────────────
// GÉMATRIE
// ─────────────────────────────────────────────────────────────────────────────

export {
  computeGematria,
  computeGematriaAverage,
  computeGematriaText,
  computeGematriaDensity,
  decomposeGematria,
  computeBranchWeight as computeGematriaBranchWeight,
  computeThickness as computeGematriaThickness
} from "./gematria.js";

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION FIELD
// ─────────────────────────────────────────────────────────────────────────────

export {
  createNeutralRecord,
  createNeutralIntensities,
  normalizeIntensities,
  normalizeIntensityRecord,
  findDominant,
  computeTotalEnergy,
  computeEntropy,
  computeContrast,
  getInertia,
  computeConservationDelta,
  buildEmotionField,
  buildEmotionFieldFromIntensities,
  applyOfficialDecay,
  applyOfficialStimulation,
  applyDecayToRecord
} from "./emotion_field.js";

// ─────────────────────────────────────────────────────────────────────────────
// BIO ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  computeEmotionScore,
  computeDecayFactor,
  computeRelief,
  computeOxygen,
  detectMarkers,
  computeOxygenStats,
  computeOxygenHistogram,
  computeBreathingStats
} from "./bio_engine.js";

export type { OxygenStats, BreathingStats } from "./bio_engine.js";

// ─────────────────────────────────────────────────────────────────────────────
// MORPHO ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  EMOTION_HUE_MAP,
  computeHSL,
  computeWeightedHue,
  computeHueHistogram,
  computeDirection,
  isNormalized,
  L_SYSTEM,
  applyLSystem,
  interpretLSystem,
  computeBranchWeight,
  computeThickness
} from "./morpho_engine.js";

export type { LSystemSegment } from "./morpho_engine.js";

// ─────────────────────────────────────────────────────────────────────────────
// FINGERPRINT
// ─────────────────────────────────────────────────────────────────────────────

export {
  computeEmotionDistribution,
  buildFingerprint,
  cosineSimilarity,
  computeSimilarity,
  getTopEmotions,
  classifyFragrance,
  describeFragrance,
  findSimilarBooks,
  FRAGRANCE_NAMES
} from "./fingerprint.js";

export type { SimilarBook } from "./fingerprint.js";

// ─────────────────────────────────────────────────────────────────────────────
// MERKLE
// ─────────────────────────────────────────────────────────────────────────────

export {
  computeNodeHash,
  updateNodeHash,
  computeMerkleRoot,
  generateMerkleLeaves,
  verifyMerkleProof,
  generateMerkleProof,
  verifyIntegrity,
  recomputeAllHashes
} from "./merkle.js";

export type { MerkleLeaf, MerkleProof } from "./merkle.js";

// ─────────────────────────────────────────────────────────────────────────────
// DNA BUILDER (API PRINCIPALE)
// ─────────────────────────────────────────────────────────────────────────────

export {
  buildMyceliumDNA,
  verifyDeterminism
} from "./dna_builder.js";

export type { TextSegment, BuildOptions } from "./dna_builder.js";

// ─────────────────────────────────────────────────────────────────────────────
// SELF TEST (ALL MODULES)
// ─────────────────────────────────────────────────────────────────────────────

import canonicalJson from "./canonical_json.js";
import gematria from "./gematria.js";
import emotionField from "./emotion_field.js";
import bioEngine from "./bio_engine.js";
import morphoEngine from "./morpho_engine.js";
import fingerprint from "./fingerprint.js";
import merkle from "./merkle.js";
import dnaBuilder from "./dna_builder.js";

/**
 * Exécute tous les tests internes des modules
 * @returns true si tous les tests passent
 */
export function runAllTests(): boolean {
  const results: Array<{ module: string; passed: boolean }> = [];

  // Test canonical_json
  try {
    results.push({ module: "canonical_json", passed: canonicalJson.selfTest() });
  } catch (error) {
    console.error("CRASH: canonical_json", error);
    results.push({ module: "canonical_json", passed: false });
  }

  // Test gematria
  try {
    results.push({ module: "gematria", passed: gematria.selfTest() });
  } catch (error) {
    console.error("CRASH: gematria", error);
    results.push({ module: "gematria", passed: false });
  }

  // Test emotion_field
  try {
    results.push({ module: "emotion_field", passed: emotionField.selfTest() });
  } catch (error) {
    console.error("CRASH: emotion_field", error);
    results.push({ module: "emotion_field", passed: false });
  }

  // Test bio_engine
  try {
    results.push({ module: "bio_engine", passed: bioEngine.selfTest() });
  } catch (error) {
    console.error("CRASH: bio_engine", error);
    results.push({ module: "bio_engine", passed: false });
  }

  // Test morpho_engine
  try {
    results.push({ module: "morpho_engine", passed: morphoEngine.selfTest() });
  } catch (error) {
    console.error("CRASH: morpho_engine", error);
    results.push({ module: "morpho_engine", passed: false });
  }

  // Test fingerprint
  try {
    results.push({ module: "fingerprint", passed: fingerprint.selfTest() });
  } catch (error) {
    console.error("CRASH: fingerprint", error);
    results.push({ module: "fingerprint", passed: false });
  }

  // Test merkle
  try {
    results.push({ module: "merkle", passed: merkle.selfTest() });
  } catch (error) {
    console.error("CRASH: merkle", error);
    results.push({ module: "merkle", passed: false });
  }

  // Test dna_builder
  try {
    results.push({ module: "dna_builder", passed: dnaBuilder.selfTest() });
  } catch (error) {
    console.error("CRASH: dna_builder", error);
    results.push({ module: "dna_builder", passed: false });
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  return passed === total;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const VERSION = "1.0.0";
export const PROFILE = "L4";

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT (re-import pour usage direct)
// ─────────────────────────────────────────────────────────────────────────────

import { buildMyceliumDNA as _buildDNA, verifyDeterminism as _verifyDet } from "./dna_builder.js";
import { computeGematria as _gematria } from "./gematria.js";
import { buildEmotionField as _buildField } from "./emotion_field.js";
import { computeOxygen as _oxygen } from "./bio_engine.js";
import { computeHSL as _hsl, computeDirection as _dir } from "./morpho_engine.js";
import { buildFingerprint as _fp, computeSimilarity as _sim, classifyFragrance as _frag } from "./fingerprint.js";
import { computeMerkleRoot as _merkle } from "./merkle.js";

export default {
  // API principale
  buildMyceliumDNA: _buildDNA,
  verifyDeterminism: _verifyDet,
  
  // Utilitaires
  computeGematria: _gematria,
  buildEmotionField: _buildField,
  computeOxygen: _oxygen,
  computeHSL: _hsl,
  computeDirection: _dir,
  buildFingerprint: _fp,
  computeSimilarity: _sim,
  classifyFragrance: _frag,
  computeMerkleRoot: _merkle,
  
  // Tests
  runAllTests,
  
  // Métadonnées
  VERSION,
  PROFILE
};
