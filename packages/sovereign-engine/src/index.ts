/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PUBLIC API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: index.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Public surface. Exports types, main engine, and key functions.
 * Internal implementation remains private.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export { runSovereignForge, type SovereignForgeResult } from './engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Forge Packet
  ForgePacket,
  EmotionContract,
  EmotionQuartile,
  TensionTargets,
  EmotionTerminal,
  EmotionRupture,
  ValenceArc,
  StyleProfile,
  KillLists,
  ForgeBeat,
  ForgeSubtext,
  ForgeSensory,
  ForgeContinuity,
  ForgeIntent,

  // Delta Report
  DeltaReport,
  EmotionDelta,
  TensionDelta,
  StyleDelta,
  ClicheDelta,

  // S-Score
  SScore,
  AxesScores,
  AxisScore,

  // Pitch
  CorrectionOp,
  CorrectionPitch,
  PitchItem,
  PitchOracleResult,

  // Provider
  SovereignProvider,

  // Loop
  SovereignLoopResult,

  // Validation
  ValidationResult,
  ValidationError,

  // Battle Plan
  SceneBattlePlan,
  PredictedObstacle,
  MitigationStrategy,

  // Duel
  DuelResult,
  Draft,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export { SOVEREIGN_CONFIG } from './config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export { assembleForgePacket, type ForgePacketInput } from './input/forge-packet-assembler.js';
export { validateForgePacket, autoFillPacket } from './input/pre-write-validator.js';
export { simulateSceneBattle } from './input/pre-write-simulator.js';
export { buildSovereignPrompt } from './input/prompt-assembler-v2.js';
export { buildEmotionBriefFromPacket } from './input/emotion-brief-bridge.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DELTA
// ═══════════════════════════════════════════════════════════════════════════════

export { generateDeltaReport } from './delta/delta-report.js';
export { computeEmotionDelta } from './delta/delta-emotion.js';
export { computeTensionDelta } from './delta/delta-tension.js';
export { computeStyleDelta } from './delta/delta-style.js';
export { computeClicheDelta } from './delta/delta-cliche.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ORACLE
// ═══════════════════════════════════════════════════════════════════════════════

export { judgeAesthetic } from './oracle/aesthetic-oracle.js';
export { computeSScore } from './oracle/s-score.js';

export { scoreTension14D } from './oracle/axes/tension-14d.js';
export { scoreAntiCliche } from './oracle/axes/anti-cliche.js';
export { scoreRhythm } from './oracle/axes/rhythm.js';
export { scoreSignature } from './oracle/axes/signature.js';
export { scoreEmotionCoherence } from './oracle/axes/emotion-coherence.js';
export { scoreInteriority } from './oracle/axes/interiority.js';
export { scoreSensoryDensity } from './oracle/axes/sensory-density.js';
export { scoreNecessity } from './oracle/axes/necessity.js';
export { scoreImpact } from './oracle/axes/impact.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PITCH
// ═══════════════════════════════════════════════════════════════════════════════

export { runSovereignLoop } from './pitch/sovereign-loop.js';
export { generateTriplePitch } from './pitch/triple-pitch.js';
export { selectBestPitch } from './pitch/pitch-oracle.js';
export { applyPatch } from './pitch/patch-engine.js';
export { CORRECTION_CATALOG, getOperationDescriptor, getOperationsByPrimaryAxis } from './pitch/correction-catalog.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DUEL
// ═══════════════════════════════════════════════════════════════════════════════

export { runDuel } from './duel/duel-engine.js';
export { getDraftModeInstruction } from './duel/draft-modes.js';

// ═══════════════════════════════════════════════════════════════════════════════
// POLISH
// ═══════════════════════════════════════════════════════════════════════════════

export { polishRhythm } from './polish/musical-engine.js';
export { sweepCliches } from './polish/anti-cliche-sweep.js';
export { enforceSignature } from './polish/signature-enforcement.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  genomeToForge14D,
  forgeToGenome14D,
  mapGenomeEmotionToForge,
  mapForgeEmotionToGenome,
  isGenomeEmotion,
  isForgeEmotion,
  validateGenomeDistribution,
  validateForge14D,
  type GenomeEmotion14,
  type ForgeEmotion14,
} from './input/emotion-adapter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL MAPPER v3
// ═══════════════════════════════════════════════════════════════════════════════

export { generateSymbolMap } from './symbol/symbol-mapper.js';
export { validateSymbolMap } from './symbol/symbol-map-oracle.js';
export { computeImagerySeed } from './symbol/emotion-to-imagery.js';
export { VALID_IMAGERY_MODES } from './symbol/symbol-map-types.js';

export type {
  SymbolMap,
  SymbolQuartile,
  SymbolGlobal,
  SensoryQuota,
  SyntaxProfile,
  AntiClicheReplacement,
  ImageryMode,
} from './symbol/symbol-map-types.js';

export type { ImagerySeed } from './symbol/emotion-to-imagery.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MACRO AXES v3
// ═══════════════════════════════════════════════════════════════════════════════

export { computeECC, computeRCI, computeSII, computeIFI } from './oracle/macro-axes.js';
export { computeMacroSScore } from './oracle/s-score.js';
export { judgeAestheticV3 } from './oracle/aesthetic-oracle.js';

export type {
  MacroAxisScore,
  MacroAxesScores,
  BonusMalus,
  ScoreReasons,
} from './oracle/macro-axes.js';

export type { MacroSScore } from './oracle/s-score.js';

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY M1-M12 (Sprint 6.1 / Roadmap 4.1)
// ═══════════════════════════════════════════════════════════════════════════════

export { buildQualityReport } from './quality/quality-bridge.js';
export type {
  QualityM12Report,
  QualityM12Metrics,
  MetricResult,
} from './quality/quality-bridge.js';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPAT GUARD (Sprint 6.3 / Roadmap 4.4)
// ═══════════════════════════════════════════════════════════════════════════════

export { assertVersion2 } from './compat/version-guard.js';
