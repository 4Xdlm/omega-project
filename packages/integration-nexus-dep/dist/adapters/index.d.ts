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
export { GenomeAdapter } from "./genome.adapter.js";
export type { NarrativeGenomeData, GenomeAxisData, EmotionTransition } from "./genome.adapter.js";
export { MyceliumAdapter, REJECTION_CODES } from "./mycelium.adapter.js";
export type { DNAInput, GenomeInput, ValidationResult } from "./mycelium.adapter.js";
export { MyceliumBioAdapter } from "./mycelium-bio.adapter.js";
export type { MyceliumDNA, MyceliumNode, MyceliumFingerprint, EmotionField, EmotionType } from "./mycelium-bio.adapter.js";
export { OrchestratorAdapter, createOrchestratorAdapter } from "./orchestrator.adapter.js";
export type { OrchestratorStep, OrchestratorPlan, OrchestratorStepResult, OrchestratorRunResult, OrchestratorOptions } from "./orchestrator.adapter.js";
import { GenomeAdapter } from "./genome.adapter.js";
import { MyceliumAdapter } from "./mycelium.adapter.js";
import { MyceliumBioAdapter } from "./mycelium-bio.adapter.js";
import type { NexusAdapter } from "../contracts/types.js";
export type AdapterType = "genome" | "mycelium" | "mycelium-bio" | "orchestrator";
/**
 * Create an adapter instance by type
 * All adapters are READ-ONLY by design
 */
export declare function createAdapter(type: AdapterType): NexusAdapter;
/**
 * Get all available adapters
 */
export declare function getAllAdapters(): readonly NexusAdapter[];
/**
 * Create a Genome adapter
 */
export declare function createGenomeAdapter(sanctuaryPath?: string): GenomeAdapter;
/**
 * Create a Mycelium adapter
 */
export declare function createMyceliumAdapter(sanctuaryPath?: string): MyceliumAdapter;
/**
 * Create a Mycelium-Bio adapter
 */
export declare function createMyceliumBioAdapter(sanctuaryPath?: string): MyceliumBioAdapter;
//# sourceMappingURL=index.d.ts.map