// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J3 STERILITY (Cliche Detection)
// ═══════════════════════════════════════════════════════════════════════════════
// Zero cliches lexicaux ou conceptuels — Aho-Corasick pour performance
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  GenesisConfig,
  JudgeScore,
  ClicheDb,
  ConceptDb,
} from '../core/types';

/**
 * Base de donnees de cliches integree (version minimale)
 * TODO: Charger depuis artifacts/cliche_db_v1.json.gz
 */
const BUILTIN_CLICHES: ClicheDb = {
  version: '1.0',
  cliches: [
    // High severity
    { pattern: 'it was a dark and stormy night', type: 'lexical', severity: 'high' },
    { pattern: 'once upon a time', type: 'lexical', severity: 'high' },
    { pattern: 'happily ever after', type: 'lexical', severity: 'high' },
    { pattern: 'at the end of the day', type: 'lexical', severity: 'high' },
    { pattern: 'in the nick of time', type: 'lexical', severity: 'high' },
    { pattern: 'the calm before the storm', type: 'lexical', severity: 'high' },
    { pattern: 'a fate worse than death', type: 'lexical', severity: 'high' },

    // Medium severity
    { pattern: 'suddenly', type: 'lexical', severity: 'medium' },
    { pattern: 'all of a sudden', type: 'lexical', severity: 'medium' },
    { pattern: 'without warning', type: 'lexical', severity: 'medium' },
    { pattern: 'little did he know', type: 'lexical', severity: 'medium' },
    { pattern: 'little did she know', type: 'lexical', severity: 'medium' },
    { pattern: 'needless to say', type: 'lexical', severity: 'medium' },
    { pattern: 'for what seemed like an eternity', type: 'lexical', severity: 'medium' },

    // Low severity (still flagged but less critical)
    { pattern: 'very', type: 'lexical', severity: 'low' },
    { pattern: 'really', type: 'lexical', severity: 'low' },
    { pattern: 'actually', type: 'lexical', severity: 'low' },
    { pattern: 'basically', type: 'lexical', severity: 'low' },
  ],
};

/**
 * Base de donnees de concepts cliches integree
 */
const BUILTIN_CONCEPTS: ConceptDb = {
  version: '1.0',
  concepts: [
    // Metaphors cliches
    { template: 'heart of gold', slots: ['*'], type: 'metaphor', severity: 'high' },
    { template: 'white as snow', slots: ['*'], type: 'comparison', severity: 'medium' },
    { template: 'black as night', slots: ['*'], type: 'comparison', severity: 'medium' },
    { template: 'cold as ice', slots: ['*'], type: 'comparison', severity: 'medium' },
    { template: 'quiet as a mouse', slots: ['*'], type: 'comparison', severity: 'medium' },
    { template: 'strong as an ox', slots: ['*'], type: 'comparison', severity: 'medium' },
    { template: 'light at the end of the tunnel', slots: ['*'], type: 'metaphor', severity: 'high' },
    { template: 'tip of the iceberg', slots: ['*'], type: 'metaphor', severity: 'high' },
    { template: 'needle in a haystack', slots: ['*'], type: 'metaphor', severity: 'high' },

    // Idioms cliches
    { template: 'raining cats and dogs', slots: ['*'], type: 'idiom', severity: 'high' },
    { template: 'break the ice', slots: ['*'], type: 'idiom', severity: 'medium' },
    { template: 'bite the bullet', slots: ['*'], type: 'idiom', severity: 'medium' },
    { template: 'beat around the bush', slots: ['*'], type: 'idiom', severity: 'medium' },
  ],
};

/**
 * Evalue la sterilite d'un draft (absence de cliches)
 */
export function evaluateSterility(
  draft: Draft,
  config: GenesisConfig
): JudgeScore {
  const text = draft.text.toLowerCase();
  const metrics: Record<string, number> = {};
  const thresholds = config.judges.sterility;

  // 1. Detection des cliches lexicaux
  const lexicalCliches = matchLexicalCliches(text, BUILTIN_CLICHES);
  metrics['lexical_cliches'] = lexicalCliches.count;
  metrics['lexical_cliches_high'] = lexicalCliches.highSeverity;
  metrics['lexical_cliches_medium'] = lexicalCliches.mediumSeverity;

  // 2. Detection des cliches conceptuels
  const conceptCliches = matchConceptCliches(text, BUILTIN_CONCEPTS);
  metrics['concept_cliches'] = conceptCliches.count;
  metrics['concept_cliches_high'] = conceptCliches.highSeverity;

  // Pour le verdict, on ne compte que high et medium severity
  const significantLexical = lexicalCliches.highSeverity + lexicalCliches.mediumSeverity;
  const significantConcept = conceptCliches.highSeverity + conceptCliches.mediumSeverity;

  // 3. Evaluer le verdict
  const pass =
    significantLexical <= thresholds.MAX_LEXICAL_CLICHES &&
    significantConcept <= thresholds.MAX_CONCEPT_CLICHES;

  return {
    verdict: pass ? 'PASS' : 'FAIL',
    metrics,
    threshold: {
      MAX_LEXICAL_CLICHES: thresholds.MAX_LEXICAL_CLICHES,
      MAX_CONCEPT_CLICHES: thresholds.MAX_CONCEPT_CLICHES,
    },
    details: pass
      ? undefined
      : `Failed: lexical=${significantLexical} (max ${thresholds.MAX_LEXICAL_CLICHES}), ` +
        `concept=${significantConcept} (max ${thresholds.MAX_CONCEPT_CLICHES})`,
  };
}

/**
 * Resultat de matching cliches
 */
interface ClicheMatchResult {
  count: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  matches: string[];
}

/**
 * Match les cliches lexicaux (version simple, TODO: Aho-Corasick)
 */
function matchLexicalCliches(text: string, db: ClicheDb): ClicheMatchResult {
  const result: ClicheMatchResult = {
    count: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    matches: [],
  };

  for (const cliche of db.cliches) {
    if (cliche.type !== 'lexical') continue;

    // Count occurrences
    const pattern = cliche.pattern.toLowerCase();
    let idx = 0;
    let occurrences = 0;

    while ((idx = text.indexOf(pattern, idx)) !== -1) {
      occurrences++;
      idx += pattern.length;
    }

    if (occurrences > 0) {
      result.count += occurrences;
      result.matches.push(cliche.pattern);

      switch (cliche.severity) {
        case 'high':
          result.highSeverity += occurrences;
          break;
        case 'medium':
          result.mediumSeverity += occurrences;
          break;
        case 'low':
          result.lowSeverity += occurrences;
          break;
      }
    }
  }

  return result;
}

/**
 * Match les cliches conceptuels (pattern + slots)
 */
function matchConceptCliches(text: string, db: ConceptDb): ClicheMatchResult {
  const result: ClicheMatchResult = {
    count: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    matches: [],
  };

  for (const concept of db.concepts) {
    const pattern = concept.template.toLowerCase();

    // Simple substring match for now
    // TODO: Implement slot matching for more flexible patterns
    if (text.includes(pattern)) {
      result.count++;
      result.matches.push(concept.template);

      switch (concept.severity) {
        case 'high':
          result.highSeverity++;
          break;
        case 'medium':
          result.mediumSeverity++;
          break;
        case 'low':
          result.lowSeverity++;
          break;
      }
    }
  }

  return result;
}

export default evaluateSterility;
