/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — SHA256 UTILITY
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "crypto";

/**
 * Calcule le SHA-256 d'une chaîne UTF-8
 * @returns Hash en hex lowercase (64 caractères)
 */
export function sha256(input: string): string {
  const hash = createHash("sha256");
  hash.update(input, "utf8");
  return hash.digest("hex").toLowerCase();
}
