/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — ADAPTERS INDEX
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * READ-ONLY adapters for sanctuarized modules.
 * INV-NEXUS-01: All adapters enforce read-only access.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Genome Adapter
export { GenomeAdapter } from "./genome.adapter.js";
export type {
  NarrativeGenomeData,
  GenomeAxisData,
  EmotionTransition
} from "./genome.adapter.js";

// Mycelium Adapter
export { MyceliumAdapter, REJECTION_CODES } from "./mycelium.adapter.js";
export type {
  DNAInput,
  GenomeInput,
  ValidationResult
} from "./mycelium.adapter.js";

// Mycelium-Bio Adapter
export { MyceliumBioAdapter } from "./mycelium-bio.adapter.js";
export type {
  MyceliumDNA,
  MyceliumNode,
  MyceliumFingerprint,
  EmotionField,
  EmotionType
} from "./mycelium-bio.adapter.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

import { GenomeAdapter } from "./genome.adapter.js";
import { MyceliumAdapter } from "./mycelium.adapter.js";
import { MyceliumBioAdapter } from "./mycelium-bio.adapter.js";
import type { NexusAdapter } from "../contracts/types.js";

export type AdapterType = "genome" | "mycelium" | "mycelium-bio";

/**
 * Create an adapter instance by type
 * All adapters are READ-ONLY by design
 */
export function createAdapter(type: AdapterType): NexusAdapter {
  switch (type) {
    case "genome":
      return new GenomeAdapter();
    case "mycelium":
      return new MyceliumAdapter();
    case "mycelium-bio":
      return new MyceliumBioAdapter();
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): readonly NexusAdapter[] {
  return [
    new GenomeAdapter(),
    new MyceliumAdapter(),
    new MyceliumBioAdapter()
  ];
}
