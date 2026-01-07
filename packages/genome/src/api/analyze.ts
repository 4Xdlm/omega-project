/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — ANALYZE API
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * INVARIANTS:
 * - INV-GEN-01: Déterminisme (même input + seed → même output)
 * - INV-GEN-10: Read-only (n'affecte pas la source)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { NarrativeGenome, OmegaDNA, AnalyzeOptions } from "./types.js";
import { GENOME_VERSION, EXTRACTOR_VERSION, DEFAULT_SEED } from "../core/version.js";
import { 
  extractEmotionAxis, 
  extractStyleAxis, 
  extractStructureAxis, 
  extractTempoAxis,
} from "../core/genome.js";
import { computeFingerprint, isValidFingerprint } from "./fingerprint.js";

/**
 * Extrait le genome narratif d'une œuvre
 * 
 * @param source - Résultat DNA/Mycelium OMEGA existant
 * @param options - Options d'extraction (seed)
 * @returns Genome complet avec fingerprint
 * 
 * INV-GEN-01: Même source + seed → même genome
 * INV-GEN-10: N'affecte pas source.rootHash
 */
export function analyze(source: OmegaDNA, options?: AnalyzeOptions): NarrativeGenome {
  const seed = options?.seed ?? DEFAULT_SEED;
  
  const emotion = extractEmotionAxis(source.emotionData, seed);
  const style = extractStyleAxis(source.styleData, seed);
  const structure = extractStructureAxis(source.structureData, seed);
  const tempo = extractTempoAxis(source.tempoData, seed);
  
  const axes = { emotion, style, structure, tempo };
  const fingerprint = computeFingerprint(source.rootHash, axes);
  
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

/**
 * Vérifie qu'un genome est valide (structure et invariants)
 */
export function validateGenome(genome: NarrativeGenome): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (genome.version !== GENOME_VERSION) {
    errors.push(`Invalid version: expected ${GENOME_VERSION}, got ${genome.version}`);
  }
  
  if (!isValidFingerprint(genome.fingerprint)) {
    errors.push("Invalid fingerprint format");
  }
  
  if (!genome.sourceHash || typeof genome.sourceHash !== "string") {
    errors.push("Missing or invalid sourceHash");
  }
  
  if (!genome.axes) {
    errors.push("Missing axes");
  } else {
    if (!genome.axes.emotion) errors.push("Missing emotion axis");
    if (!genome.axes.style) errors.push("Missing style axis");
    if (!genome.axes.structure) errors.push("Missing structure axis");
    if (!genome.axes.tempo) errors.push("Missing tempo axis");
  }
  
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
