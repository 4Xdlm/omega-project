/**
 * OMEGA Style Emergence Engine -- Configuration
 * Phase C.3 -- 18 symbols, zero magic numbers
 */

import type { EConfig, EConfigSymbol } from './types.js';

const IA_DETECTION_PATTERNS: readonly string[] = [
  'it is worth noting', 'it should be noted', 'in conclusion',
  'furthermore', 'moreover', 'needless to say', 'as previously mentioned',
  'it goes without saying', 'at the end of the day', 'in terms of',
  'with regard to', 'it is important to', 'it is clear that',
  'one might argue', 'delve into', 'tapestry of', 'symphony of',
  'dance of', 'testament to', 'echoed through',
  'a sense of', 'in this context', 'on the other hand',
  'having said that', 'to be sure', 'it bears mentioning',
  'not unlike', 'inasmuch as', 'in the grand scheme',
  'it stands to reason', 'for all intents and purposes',
];

const GENRE_MARKERS: Readonly<Record<string, readonly string[]>> = {
  fantasy: ['chosen one', 'ancient prophecy', 'dark lord', 'magical realm', 'quest'],
  romance: ['heart skipped', 'eyes met', 'love at first', 'tender embrace', 'passion'],
  thriller: ['ticking clock', 'shadowy figure', 'conspiracy', 'double cross', 'deadline'],
  scifi: ['quantum', 'hyperdrive', 'artificial intelligence', 'colony ship', 'terraforming'],
  literary: ['existential', 'ennui', 'melancholy', 'consciousness', 'ephemeral'],
};

export function createDefaultEConfig(): EConfig {
  return {
    TOURNAMENT_VARIANTS_PER_PARAGRAPH: {
      value: 3,
      unit: 'variants',
      rule: 'E-INV-08: generate exactly 3 variants per paragraph for tournament',
      derivation: '3 variants = sufficient diversity without explosion. O(3*paragraphs).',
    },
    TOURNAMENT_MIN_VARIANTS: {
      value: 2,
      unit: 'variants',
      rule: 'E-INV-08: minimum 2 variants for valid tournament (at least 1 alternative)',
      derivation: '1 variant = no tournament. 2 = minimum meaningful choice.',
    },
    STYLE_MAX_DEVIATION: {
      value: 0.25,
      unit: 'ratio (0-1)',
      rule: 'E-INV-02: max deviation on any genome axis',
      derivation: 'Tighter than C.2 (0.3). Style engine must be MORE precise.',
    },
    CADENCE_TOLERANCE: {
      value: 0.15,
      unit: 'ratio',
      rule: 'E-INV-03: burstiness CV must be within +/-0.15 of target',
      derivation: 'Cadence is the most perceptible style feature. Tight tolerance.',
    },
    LEXICAL_MIN_RARITY: {
      value: 0.05,
      unit: 'ratio',
      rule: 'E-INV-04: at least 5% rare words (avoid generic IA text)',
      derivation: 'Human writers naturally use 5-15% uncommon vocabulary.',
    },
    LEXICAL_MAX_RARITY: {
      value: 0.20,
      unit: 'ratio',
      rule: 'E-INV-04: at most 20% rare words (avoid obscurantism)',
      derivation: 'Above 20% = purple prose / pretentious. Reader disengagement.',
    },
    LEXICAL_MAX_CONSECUTIVE_RARE: {
      value: 3,
      unit: 'words',
      rule: 'E-INV-04: no more than 3 consecutive rare words',
      derivation: 'Consecutive rare words = IA pattern (overcompensation)',
    },
    SYNTACTIC_MIN_TYPES: {
      value: 4,
      unit: 'structure_types',
      rule: 'E-INV-05: at least 4 distinct syntactic structures used',
      derivation: 'Monotonous syntax = IA fingerprint. Diversity = human-like.',
    },
    SYNTACTIC_MAX_RATIO: {
      value: 0.5,
      unit: 'ratio',
      rule: 'E-INV-05: no single structure type exceeds 50%',
      derivation: 'Dominance > 50% = predictable rhythm. Reader detects pattern.',
    },
    IA_MAX_DETECTION_SCORE: {
      value: 0.3,
      unit: 'score (0-1)',
      rule: 'E-INV-06: IA detection score must stay below 0.3',
      derivation: 'Below 0.3 = plausibly human. Above = suspicious.',
    },
    IA_DETECTION_PATTERNS: {
      value: IA_DETECTION_PATTERNS,
      unit: 'pattern_list',
      rule: 'E-INV-06: each pattern found adds to IA detection score',
      derivation: 'Extended from C.2 list + additional high-frequency LLM patterns',
    },
    GENRE_MAX_SPECIFICITY: {
      value: 0.6,
      unit: 'score (0-1)',
      rule: 'E-INV-07: text must not strongly match any single genre',
      derivation: 'Above 0.6 = genre-locked. OMEGA text transcends genre.',
    },
    GENRE_MARKERS: {
      value: GENRE_MARKERS,
      unit: 'marker_map',
      rule: 'E-INV-07: genre markers used for classification scoring',
      derivation: 'Common genre-specific vocabulary clusters',
    },
    VOICE_MAX_DRIFT: {
      value: 0.2,
      unit: 'normalized_stddev',
      rule: 'E-INV-09: inter-paragraph style drift must stay below 0.2',
      derivation: 'Above 0.2 = inconsistent voice. Reader notices jarring shifts.',
    },
    SCORE_WEIGHT_GENOME: {
      value: 0.3,
      unit: 'weight',
      rule: 'Tournament scoring: 30% weight on genome compliance',
      derivation: 'Genome compliance is primary constraint.',
    },
    SCORE_WEIGHT_ANTI_IA: {
      value: 0.3,
      unit: 'weight',
      rule: 'Tournament scoring: 30% weight on anti-IA',
      derivation: 'Anti-detection is equally critical to genome compliance.',
    },
    SCORE_WEIGHT_ANTI_GENRE: {
      value: 0.2,
      unit: 'weight',
      rule: 'Tournament scoring: 20% weight on anti-genre',
      derivation: 'Genre transcendence important but secondary to IA/genome.',
    },
    SCORE_WEIGHT_ANTI_BANALITY: {
      value: 0.2,
      unit: 'weight',
      rule: 'Tournament scoring: 20% weight on anti-banality',
      derivation: 'Originality important but secondary to IA/genome.',
    },
  };
}

export function resolveEConfigRef(config: EConfig, ref: string): EConfigSymbol['value'] {
  const prefix = 'CONFIG:';
  const key = ref.startsWith(prefix) ? ref.slice(prefix.length) : ref;
  if (!(key in config)) {
    throw new Error(`Unknown config key: ${key}`);
  }
  return config[key as keyof EConfig].value;
}

export function validateEConfig(config: EConfig): readonly string[] {
  const errors: string[] = [];
  const requiredKeys: readonly (keyof EConfig)[] = [
    'TOURNAMENT_VARIANTS_PER_PARAGRAPH', 'TOURNAMENT_MIN_VARIANTS',
    'STYLE_MAX_DEVIATION', 'CADENCE_TOLERANCE',
    'LEXICAL_MIN_RARITY', 'LEXICAL_MAX_RARITY', 'LEXICAL_MAX_CONSECUTIVE_RARE',
    'SYNTACTIC_MIN_TYPES', 'SYNTACTIC_MAX_RATIO',
    'IA_MAX_DETECTION_SCORE', 'IA_DETECTION_PATTERNS',
    'GENRE_MAX_SPECIFICITY', 'GENRE_MARKERS',
    'VOICE_MAX_DRIFT',
    'SCORE_WEIGHT_GENOME', 'SCORE_WEIGHT_ANTI_IA',
    'SCORE_WEIGHT_ANTI_GENRE', 'SCORE_WEIGHT_ANTI_BANALITY',
  ];

  for (const key of requiredKeys) {
    if (!(key in config)) {
      errors.push(`Missing config key: ${key}`);
      continue;
    }
    const sym: EConfigSymbol = config[key];
    if (sym.value === undefined || sym.value === null) {
      errors.push(`Config ${key}: value is null/undefined`);
    }
    if (!sym.unit || sym.unit.length === 0) {
      errors.push(`Config ${key}: missing unit`);
    }
    if (!sym.rule || sym.rule.length === 0) {
      errors.push(`Config ${key}: missing rule`);
    }
    if (!sym.derivation || sym.derivation.length === 0) {
      errors.push(`Config ${key}: missing derivation`);
    }
  }

  return errors;
}
