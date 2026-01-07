/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — FINGERPRINT API
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * INVARIANTS:
 * - INV-GEN-02: fingerprint = SHA256(canonical payload)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { GenomeFingerprint, EmotionAxis, StyleAxis, StructureAxis, TempoAxis } from "./types.js";
import { GENOME_VERSION, FINGERPRINT_LENGTH } from "../core/version.js";
import { quantizeObject, canonicalSerialize } from "../core/canonical.js";
import { sha256 } from "../utils/sha256.js";

/**
 * Payload pour le fingerprint
 * Seuls ces éléments entrent dans le hash (INV-GEN-11)
 */
interface FingerprintPayload {
  version: string;
  sourceHash: string;
  axes: {
    emotion: EmotionAxis;
    style: StyleAxis;
    structure: StructureAxis;
    tempo: TempoAxis;
  };
}

/**
 * Calcule le fingerprint SHA-256 d'un genome
 * 
 * INV-GEN-02: fingerprint = SHA256(canonical(version + sourceHash + axes))
 * INV-GEN-13: Sérialisation canonique
 * INV-GEN-14: Floats quantifiés
 */
export function computeFingerprint(
  sourceHash: string,
  axes: {
    emotion: EmotionAxis;
    style: StyleAxis;
    structure: StructureAxis;
    tempo: TempoAxis;
  }
): GenomeFingerprint {
  const payload: FingerprintPayload = {
    version: GENOME_VERSION,
    sourceHash,
    axes,
  };
  
  const quantized = quantizeObject(payload);
  const serialized = canonicalSerialize(quantized);
  
  return sha256(serialized);
}

/**
 * Vérifie qu'un fingerprint est valide (format)
 */
export function isValidFingerprint(fingerprint: string): fingerprint is GenomeFingerprint {
  return /^[a-f0-9]{64}$/.test(fingerprint) && fingerprint.length === FINGERPRINT_LENGTH;
}
