/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NARRATIVE GENOME — MAIN API
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * API publique pour extraction et comparaison de genomes narratifs.
 * 
 * INVARIANTS GARANTIS:
 * - INV-GEN-01: Déterminisme (même input + seed → même output)
 * - INV-GEN-02: Fingerprint = SHA256(canonical payload)
 * - INV-GEN-10: Read-only (n'affecte pas la source)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { 
  NarrativeGenome, 
  OmegaDNA, 
  SimilarityResult,
  DetailedComparison,
  SimilarityWeights,
  GenomeFingerprint,
  SimilarMatch,
} from "./types";
import { 
  GENOME_VERSION, 
  EXTRACTOR_VERSION, 
  DEFAULT_SEED,
  DEFAULT_WEIGHTS,
} from "./constants";
import { extractEmotionAxis } from "./extractor/emotion_extractor";
import { extractStyleAxis } from "./extractor/style_extractor";
import { extractStructureAxis } from "./extractor/structure_extractor";
import { extractTempoAxis } from "./extractor/tempo_extractor";
import { computeFingerprint, isValidFingerprint } from "./hasher";
import { compare as compareGenomes, compareDetailed as compareGenomesDetailed } from "./comparator";

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrait le genome narratif d'une œuvre
 * 
 * @param source - Résultat DNA/Mycelium OMEGA existant
 * @param seed - Seed pour déterminisme (default: 42)
 * @returns Genome complet avec fingerprint
 * 
 * INV-GEN-01: Même source + seed → même genome
 * INV-GEN-10: N'affecte pas source.rootHash
 */
export function extract(source: OmegaDNA, seed: number = DEFAULT_SEED): NarrativeGenome {
  // 1. Extraire les 4 axes
  const emotion = extractEmotionAxis(source.emotionData, seed);
  const style = extractStyleAxis(source.styleData, seed);
  const structure = extractStructureAxis(source.structureData, seed);
  const tempo = extractTempoAxis(source.tempoData, seed);
  
  const axes = { emotion, style, structure, tempo };
  
  // 2. Calculer fingerprint (déterministe)
  const fingerprint = computeFingerprint(source.rootHash, axes);
  
  // 3. Assembler le genome
  return {
    version: GENOME_VERSION,
    sourceHash: source.rootHash,
    axes,
    fingerprint,
    metadata: {
      extractedAt: new Date().toISOString(),
      extractorVersion: EXTRACTOR_VERSION,
      seed,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARAISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare deux genomes et retourne un score de similarité
 * 
 * @param a - Premier genome (ou fingerprint)
 * @param b - Second genome (ou fingerprint)
 * @param weights - Poids par axe (optionnel)
 * @returns Résultat avec score, confiance et verdict
 * 
 * INV-GEN-05: compare(a, b) = compare(b, a)
 * INV-GEN-06: 0 ≤ score ≤ 1
 * INV-GEN-07: compare(a, a) = 1.0
 */
export function compare(
  a: NarrativeGenome,
  b: NarrativeGenome,
  weights?: SimilarityWeights
): SimilarityResult {
  return compareGenomes(a, b, weights ?? DEFAULT_WEIGHTS);
}

/**
 * Comparaison détaillée par axe
 */
export function compareDetailed(
  a: NarrativeGenome,
  b: NarrativeGenome,
  weights?: SimilarityWeights
): DetailedComparison {
  return compareGenomesDetailed(a, b, weights ?? DEFAULT_WEIGHTS);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie qu'un fingerprint est valide (format)
 */
export function validateFingerprint(fingerprint: string): fingerprint is GenomeFingerprint {
  return isValidFingerprint(fingerprint);
}

/**
 * Vérifie qu'un genome est valide (structure et invariants)
 */
export function validateGenome(genome: NarrativeGenome): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Version
  if (genome.version !== GENOME_VERSION) {
    errors.push(`Invalid version: expected ${GENOME_VERSION}, got ${genome.version}`);
  }
  
  // Fingerprint format
  if (!isValidFingerprint(genome.fingerprint)) {
    errors.push("Invalid fingerprint format");
  }
  
  // Source hash
  if (!genome.sourceHash || typeof genome.sourceHash !== "string") {
    errors.push("Missing or invalid sourceHash");
  }
  
  // Axes présents
  if (!genome.axes) {
    errors.push("Missing axes");
  } else {
    if (!genome.axes.emotion) errors.push("Missing emotion axis");
    if (!genome.axes.style) errors.push("Missing style axis");
    if (!genome.axes.structure) errors.push("Missing structure axis");
    if (!genome.axes.tempo) errors.push("Missing tempo axis");
  }
  
  // Distribution somme à 1.0 (INV-GEN-04)
  if (genome.axes?.emotion?.distribution) {
    const sum = Object.values(genome.axes.emotion.distribution).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      errors.push(`Emotion distribution sum is ${sum}, expected 1.0`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  NarrativeGenome,
  OmegaDNA,
  SimilarityResult,
  DetailedComparison,
  SimilarityWeights,
  GenomeFingerprint,
  SimilarMatch,
  Emotion14,
  EmotionAxis,
  StyleAxis,
  StructureAxis,
  TempoAxis,
} from "./types";

export {
  GENOME_VERSION,
  EXTRACTOR_VERSION,
  DEFAULT_SEED,
  DEFAULT_WEIGHTS,
  EMOTION14_ORDERED,
} from "./constants";
