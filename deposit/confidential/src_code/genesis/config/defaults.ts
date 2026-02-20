// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Default Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// TOUS LES SEUILS SONT SYMBOLIQUES — Aucun magic number dans le code
// ═══════════════════════════════════════════════════════════════════════════════

import type { GenesisConfig } from '../core/types';

/**
 * Configuration par defaut GENESIS FORGE
 * Tous les seuils sont calibrables via env ou override
 */
export const DEFAULT_GENESIS_CONFIG: GenesisConfig = {
  // ─────────────────────────────────────────────────────────────────────────────
  // LOOP CONTROL
  // ─────────────────────────────────────────────────────────────────────────────
  loop: {
    MAX_ITERATIONS: 100,
    MIN_DRAFTS_PER_ITER: 3,
    MAX_DRAFTS_PER_ITER: 10,
    MUTATION_RATE_BASE: 0.1,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE BUDGETS (ms)
  // ─────────────────────────────────────────────────────────────────────────────
  budgets: {
    BUDGET_MS_GATE_FAST: 100,        // Fast gate max 100ms
    BUDGET_MS_DRAFT_FULL: 5000,      // Draft full processing max 5s
    BUDGET_MS_TOTAL_ITER: 30000,     // Total iteration max 30s
    BUDGET_MS_TOTAL_FORGE: 600000,   // Total forge max 10min
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // JUDGES THRESHOLDS
  // ─────────────────────────────────────────────────────────────────────────────
  judges: {
    // J1 EMOTION-BINDING (14D alignment)
    emotionBinding: {
      MAX_COSINE_DISTANCE: 0.15,      // Max cosine distance on 14D distribution
      MIN_DOMINANT_MATCH: 0.7,        // 70% of windows must have matching dominant
      MAX_ENTROPY_DEVIATION: 0.2,     // Max entropy deviation from target
    },

    // J2 COHERENCE
    coherence: {
      MAX_CONTRADICTIONS: 0,          // Zero contradictions allowed
      MAX_TIMELINE_BREAKS: 0,         // Zero timeline breaks allowed
      MAX_COREF_ERRORS: 0,            // Zero coreference errors allowed
    },

    // J3 STERILITY (cliche detection)
    sterility: {
      MAX_LEXICAL_CLICHES: 0,         // Zero lexical cliches
      MAX_CONCEPT_CLICHES: 0,         // Zero concept cliches
    },

    // J4 UNIQUENESS (originality)
    uniqueness: {
      MAX_NGRAM_OVERLAP_RATIO: 0.3,   // Max 30% n-gram overlap with corpus
      MAX_EXACT_SPAN_LENGTH: 20,      // Max 20 char exact span from corpus
    },

    // J5 DENSITY (content quality)
    density: {
      MIN_CONTENT_RATIO: 0.6,         // Min 60% content words
      MAX_FILLER_RATIO: 0.15,         // Max 15% filler words
      MAX_REDUNDANCY_RATIO: 0.2,      // Max 20% redundancy
    },

    // J6 RESONANCE (O2 alignment)
    resonance: {
      MIN_O2_ALIGNMENT: 0.65,         // Min 65% O2 alignment with target
      RHYTHM_BAND: [0.3, 0.7],        // Rhythm score must be in [0.3, 0.7]
    },

    // J7 ANTI-GAMING (authenticity)
    antiGaming: {
      RARE_TOKEN_BAND: [0.2, 0.8],    // Rare token ratio in [20%, 80%]
      MAX_NEOLOGISMS_RATIO: 0.05,     // Max 5% neologisms
      MIN_READABILITY_SCORE: 60,      // Min Flesch-Kincaid score
      MIN_SYNTAX_DEPTH_AVG: 2.0,      // Min avg syntax tree depth
    },

    // PARETO SCORES (non-blocking, for ranking only)
    pareto: {
      impactDensity: {
        MIN_IMAGERY_SCORE: 0.5,       // Imagery presence score
        MIN_LEXICAL_RARITY: 0.4,      // Lexical rarity score
      },
      styleSignature: {
        TARGET_CADENCE_RANGE: [0.4, 0.6],  // Target cadence range
        TARGET_LEXICAL_TEMP: 0.5,          // Target lexical temperature
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ARTIFACTS HASHES (to be filled after artifact generation)
  // ─────────────────────────────────────────────────────────────────────────────
  artifacts: {
    clicheDbHash: '',
    conceptDbHash: '',
    corpusHash: '',
    sensoryLexiconHash: '',
    fillerListHash: '',
    stopwordsHash: '',
    valenceLexiconHash: '',
    intensityMarkersHash: '',
    persistencePatternsHash: '',
  },
};

/**
 * Load config from environment variables
 * Prefix: GENESIS_
 */
export function loadConfigFromEnv(
  baseConfig: GenesisConfig = DEFAULT_GENESIS_CONFIG
): GenesisConfig {
  const env = process.env;

  return {
    ...baseConfig,
    loop: {
      MAX_ITERATIONS: parseInt(env.GENESIS_MAX_ITERATIONS || '') || baseConfig.loop.MAX_ITERATIONS,
      MIN_DRAFTS_PER_ITER: parseInt(env.GENESIS_MIN_DRAFTS_PER_ITER || '') || baseConfig.loop.MIN_DRAFTS_PER_ITER,
      MAX_DRAFTS_PER_ITER: parseInt(env.GENESIS_MAX_DRAFTS_PER_ITER || '') || baseConfig.loop.MAX_DRAFTS_PER_ITER,
      MUTATION_RATE_BASE: parseFloat(env.GENESIS_MUTATION_RATE_BASE || '') || baseConfig.loop.MUTATION_RATE_BASE,
    },
    budgets: {
      BUDGET_MS_GATE_FAST: parseInt(env.GENESIS_BUDGET_GATE_FAST || '') || baseConfig.budgets.BUDGET_MS_GATE_FAST,
      BUDGET_MS_DRAFT_FULL: parseInt(env.GENESIS_BUDGET_DRAFT_FULL || '') || baseConfig.budgets.BUDGET_MS_DRAFT_FULL,
      BUDGET_MS_TOTAL_ITER: parseInt(env.GENESIS_BUDGET_TOTAL_ITER || '') || baseConfig.budgets.BUDGET_MS_TOTAL_ITER,
      BUDGET_MS_TOTAL_FORGE: parseInt(env.GENESIS_BUDGET_TOTAL_FORGE || '') || baseConfig.budgets.BUDGET_MS_TOTAL_FORGE,
    },
    judges: {
      ...baseConfig.judges,
      emotionBinding: {
        MAX_COSINE_DISTANCE: parseFloat(env.GENESIS_J1_MAX_COSINE_DISTANCE || '') || baseConfig.judges.emotionBinding.MAX_COSINE_DISTANCE,
        MIN_DOMINANT_MATCH: parseFloat(env.GENESIS_J1_MIN_DOMINANT_MATCH || '') || baseConfig.judges.emotionBinding.MIN_DOMINANT_MATCH,
        MAX_ENTROPY_DEVIATION: parseFloat(env.GENESIS_J1_MAX_ENTROPY_DEVIATION || '') || baseConfig.judges.emotionBinding.MAX_ENTROPY_DEVIATION,
      },
      sterility: {
        MAX_LEXICAL_CLICHES: parseInt(env.GENESIS_J3_MAX_LEXICAL_CLICHES || '') ?? baseConfig.judges.sterility.MAX_LEXICAL_CLICHES,
        MAX_CONCEPT_CLICHES: parseInt(env.GENESIS_J3_MAX_CONCEPT_CLICHES || '') ?? baseConfig.judges.sterility.MAX_CONCEPT_CLICHES,
      },
    },
  };
}

/**
 * Merge configs with override
 */
export function mergeConfig(
  base: GenesisConfig,
  override: Partial<GenesisConfig>
): GenesisConfig {
  return {
    ...base,
    ...override,
    loop: { ...base.loop, ...override.loop },
    budgets: { ...base.budgets, ...override.budgets },
    judges: {
      ...base.judges,
      ...override.judges,
      emotionBinding: { ...base.judges.emotionBinding, ...override.judges?.emotionBinding },
      coherence: { ...base.judges.coherence, ...override.judges?.coherence },
      sterility: { ...base.judges.sterility, ...override.judges?.sterility },
      uniqueness: { ...base.judges.uniqueness, ...override.judges?.uniqueness },
      density: { ...base.judges.density, ...override.judges?.density },
      resonance: { ...base.judges.resonance, ...override.judges?.resonance },
      antiGaming: { ...base.judges.antiGaming, ...override.judges?.antiGaming },
      pareto: { ...base.judges.pareto, ...override.judges?.pareto },
    },
    artifacts: { ...base.artifacts, ...override.artifacts },
  };
}

export default DEFAULT_GENESIS_CONFIG;
