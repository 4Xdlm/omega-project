// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Main Export
// ═══════════════════════════════════════════════════════════════════════════════
// Moteur d'ecriture NASA-grade aligne sur OMEGA EMOTION 14D
// ═══════════════════════════════════════════════════════════════════════════════

// Core types
export type {
  // Emotion types (from OMEGA 14D)
  EmotionType,
  EmotionState,
  EmotionRecord14,
  IntensityRecord14,
  EmotionField,
  OxygenResult,

  // Genesis types
  TruthBundle,
  TimelineFrame,
  TruthConstraints,
  EmotionTrajectoryContract,
  TrajectoryWindow,
  BreathingMarker,
  EvolutionConstraint,
  PrismConstraints,
  Draft,
  JudgeVerdict,
  JudgeScore,
  SentinelResult,
  GenesisConfig,
  ForgeResult,
  ProofPack,
  IterationLogEntry,
  TimingLogEntry,
  KillLogEntry,
  ParetoCandidate,
  ValidationResult,

  // Artifact types
  ClicheDb,
  ConceptDb,
  CorpusRef,
  SensoryLexicon,
  FillerList,
  StopwordsList,
  ValenceLexicon,
  IntensityMarkers,
  PersistencePatterns,
  DomainLexicon,
  ArtifactsManifest,
  VoiceProfile,
} from './core/types';

// Constants
export { EMOTION_TYPES, EMOTION_COUNT, PHYSICS } from './core/types';

// Config
export { DEFAULT_GENESIS_CONFIG, loadConfigFromEnv, mergeConfig } from './config/defaults';

// Core modules
export { validateTruthBundle, validateEmotionField, validateOxygenResult } from './core/validator';
export { generateTrajectoryContract, generatePrismConstraints } from './core/translator';
export { applyPrismWithConstraints, measureEmotionDistribution, cosineDistance } from './core/prism';
export { evaluateSentinel, evaluateFastGate, filterParetoFrontier, paretoDominates } from './core/sentinel';
export { createDefaultConstraints, mutateDraftConstraints, exploreConstraintVariation } from './core/mutator';
export { runForge } from './core/forge';

// Judges
export { default as evaluateEmotionBinding } from './judges/j1_emotion_binding';
export { default as evaluateCoherence } from './judges/j2_coherence';
export { default as evaluateSterility } from './judges/j3_sterility';
export { default as evaluateUniqueness } from './judges/j4_uniqueness';
export { default as evaluateDensity } from './judges/j5_density';
export { default as evaluateResonance } from './judges/j6_resonance';
export { default as evaluateAntiGaming } from './judges/j7_anti_gaming';
export { default as evaluateImpactDensity } from './judges/p1_impact_density';
export { default as evaluateStyleSignature } from './judges/p2_style_signature';

// Engines
export { generateDrafts } from './engines/drafter';

// Proofs
export { sha256, hashObject, combineHashes, generateId, hashTruthBundle } from './proofs/hash_utils';
export {
  createProofContext,
  buildProofPack,
  verifyProofPack,
  serializeProofPack,
  deserializeProofPack,
} from './proofs/proof_builder';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION INFO
// ═══════════════════════════════════════════════════════════════════════════════

export const VERSION = '1.1.2';
export const SCHEMA_ID = 'OMEGA_EMOTION_14D_v1.0.0';
export const STANDARD = 'NASA-Grade L4 / DO-178C Level A';
