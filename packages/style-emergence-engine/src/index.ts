/**
 * OMEGA Style Emergence Engine -- Public API
 * Phase C.3 -- Voice Signature + Anti-Detection + Tournament Self-Play
 * @module @omega/style-emergence-engine
 */

// Types
export type {
  EVerdict, EInvariantId,
  CadenceProfile, LexicalProfile, SyntacticStructure, SyntacticProfile,
  DensityProfile, CoherenceProfile, StyleProfile, GenomeDeviation,
  IADetectionResult, DetectionFinding,
  GenreDetectionResult, BanalityResult,
  StyleVariant, VariantScore, TournamentRound, TournamentResult,
  StyledParagraph, StyledOutput,
  EConfigSymbol, EConfig,
  EEvidenceStep, EEvidenceChain,
  StyleMetrics, StyleReport,
} from './types.js';

// Re-exported types
export type {
  GenesisPlan, Canon, Constraints, StyleGenomeInput, EmotionTarget, GVerdict,
} from './types.js';
export type {
  ScribeOutput, ProseDoc, ProseParagraph, SkeletonDoc,
} from './types.js';

// Config
export { createDefaultEConfig, resolveEConfigRef, validateEConfig } from './config.js';

// Normalizer
export { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from './normalizer.js';

// Metrics
export { analyzeCadence } from './metrics/cadence-analyzer.js';
export { analyzeLexical } from './metrics/lexical-analyzer.js';
export { analyzeSyntactic } from './metrics/syntactic-analyzer.js';
export { analyzeDensity } from './metrics/density-analyzer.js';
export { analyzeCoherence } from './metrics/coherence-analyzer.js';
export { profileStyle, profileStyledParagraph } from './metrics/style-profiler.js';

// Detectors
export { detectIA } from './detectors/ia-detector.js';
export { detectGenre } from './detectors/genre-detector.js';
export { detectBanality } from './detectors/banality-detector.js';

// Tournament
export { generateVariants } from './tournament/variant-generator.js';
export { scoreVariant } from './tournament/variant-scorer.js';
export { selectVariant } from './tournament/variant-selector.js';
export { runTournament } from './tournament/tournament-runner.js';

// Harmonizer
export { harmonize } from './harmonizer.js';

// Evidence
export { createEEvidenceChainBuilder, verifyEEvidenceChain } from './evidence.js';
export type { EEvidenceChainBuilder } from './evidence.js';

// Report
export { generateStyleReport, styleReportToMarkdown } from './report.js';

// Engine
export { runStyleEmergence } from './engine.js';
