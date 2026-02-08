/**
 * OMEGA Genesis Planner — Public API
 * Phase C.1 — Deterministic Narrative Structure Engine
 * @module @omega/genesis-planner
 */

// Types
export type {
  GVerdict, GInvariantId,
  Intent, CanonCategory, CanonEntry, Canon,
  POV, Tense, Constraints,
  StyleGenomeInput, EmotionWaypoint, EmotionTarget,
  SeedType, ConflictType, SubtextTensionType,
  Seed, SubtextLayer, Beat, Scene, Arc, GenesisPlan,
  ValidationError, ValidationResult,
  GConfigSymbol, GConfig,
  GEvidenceStep, GEvidenceChain,
  GenesisMetrics, GenesisReport,
} from './types.js';

// Config
export { createDefaultConfig, resolveConfigRef, validateConfig } from './config.js';

// Normalizer
export { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from './normalizer.js';

// Evidence
export { createEvidenceChainBuilder, verifyEvidenceChain } from './evidence.js';
export type { EvidenceChainBuilder } from './evidence.js';

// Validators
export { validateIntent } from './validators/intent-validator.js';
export { validateCanon } from './validators/canon-validator.js';
export { validateConstraints } from './validators/constraints-validator.js';
export { validateGenome } from './validators/genome-validator.js';
export { validateEmotionTarget } from './validators/emotion-validator.js';
export { validatePlan } from './validators/plan-validator.js';

// Generators
export { generateArcs } from './generators/arc-generator.js';
export { generateScenes } from './generators/scene-generator.js';
export { generateBeats } from './generators/beat-generator.js';
export { createSeedBloomTracker, autoGenerateSeeds } from './generators/seed-bloom-tracker.js';
export type { SeedBloomTracker } from './generators/seed-bloom-tracker.js';
export { buildTensionCurve, validateTensionCurve } from './generators/tension-builder.js';
export { mapEmotions, validateEmotionCoverage } from './generators/emotion-mapper.js';
export { modelSubtext, validateSubtext } from './generators/subtext-modeler.js';

// Planner
export { createGenesisPlan } from './planner.js';

// Report
export { generateReport, reportToMarkdown } from './report.js';
