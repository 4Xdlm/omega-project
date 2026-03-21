/**
 * OMEGA Depth Features — Phase R-5bis
 * Features de profondeur syntaxique et stylistique.
 *
 * Ces features mesurent ce que les 72 features actuelles ne captent pas :
 * la complexité propositionnelle, la subordination, la densité
 * informationnelle, le style indirect libre, et la variance locale du rythme.
 *
 * Pure TypeScript — aucune dépendance externe.
 */

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[.!?…»])\s+/);
  return raw.map(s => s.trim()).filter(s => s.length > 5);
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function variance(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return vals.reduce((sum, v) => sum + (v - m) ** 2, 0) / (vals.length - 1);
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ═══════════════════════════════════════════════════════════════════════
// CONJUGATED VERB DETECTION (French-centric, covers common patterns)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Approximate count of conjugated verbs in a sentence.
 * Uses pronoun+verb patterns and common French verb endings.
 * Not perfect, but consistent across texts (same bias everywhere).
 */
function countConjugatedVerbs(sentence: string): number {
  const lower = sentence.toLowerCase();

  // Pattern 1: Subject pronoun followed by a word (high precision)
  const pronounVerb = lower.match(
    /\b(?:j[e']|tu|il|elle|on|nous|vous|ils|elles|ce|c'|qui)\s+\w+/g
  );
  let count = pronounVerb ? pronounVerb.length : 0;

  // Pattern 2: Common finite verb endings not preceded by "de/à/pour/sans"
  // -ait, -aient, -ais, -ât, -èrent, -erait, -ions, -iez
  const finiteEndings = lower.match(
    /\b\w{3,}(?:ait|aient|ais|ions|iez|ûmes|ûtes|urent|îmes|înrent|èrent|erait|eraient|eront)\b/g
  );
  if (finiteEndings) {
    // Only count those not already captured by pronoun pattern
    count += Math.floor(finiteEndings.length * 0.5);
  }

  // Pattern 3: est/était/fut/sera/sont/étaient (être)
  const etre = lower.match(/\b(?:est|était|fut|sera|sont|étaient|serait|fût|soient)\b/g);
  if (etre) count += etre.length;

  // Pattern 4: a/avait/eut/aura/ont/avaient (avoir)
  const avoir = lower.match(/\b(?:avait|eut|aura|avaient|auraient|aurait|eût)\b/g);
  if (avoir) count += avoir.length;

  // Minimum 1 verb per sentence (every sentence has at least one)
  return Math.max(1, count);
}

// ═══════════════════════════════════════════════════════════════════════
// F_CLAUSE: Clause count & density
// ═══════════════════════════════════════════════════════════════════════

function computeClauseFeatures(sents: string[]): Record<string, number> {
  if (sents.length === 0) {
    return {
      f_clause_count: 0,
      f_clause_per_sentence: 0,
    };
  }

  const clauseCounts = sents.map(s => countConjugatedVerbs(s));
  const totalClauses = clauseCounts.reduce((a, b) => a + b, 0);

  return {
    f_clause_count: r4(totalClauses),
    f_clause_per_sentence: r4(totalClauses / sents.length),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F_SUBORDINATION: Subordination depth
// ═══════════════════════════════════════════════════════════════════════

const SUBORDINATION_MARKERS = [
  // Relative pronouns
  /\bqui\b/g, /\bque\b/g, /\bdont\b/g, /\boù\b/g,
  // Temporal
  /\blorsqu[e']\b/gi, /\bquand\b/g, /\btandis qu[e']\b/gi,
  /\baprès qu[e']\b/gi, /\bavant qu[e']\b/gi, /\bdepuis qu[e']\b/gi,
  // Causal
  /\bpuisqu[e']\b/gi, /\bparce qu[e']\b/gi, /\bcar\b/g,
  // Concessive
  /\bbien qu[e']\b/gi, /\bquoiqu[e']\b/gi, /\bmême si\b/gi,
  // Purpose
  /\bafin qu[e']\b/gi, /\bpour qu[e']\b/gi,
  // Conditional
  /\bsi\b/g, /\bcomme\b/g,
  // English equivalents
  /\bwhich\b/g, /\bwho\b/g, /\bwhom\b/g, /\bwhose\b/g,
  /\bthat\b/g, /\bwhere\b/g, /\bwhen\b/g, /\bwhile\b/g,
  /\bbecause\b/g, /\balthough\b/g, /\bthough\b/g,
  /\bsince\b/g, /\bunless\b/g, /\bwhereas\b/g,
  /\bif\b/g, /\bas\b/g,
];

function countSubordinationMarkers(sentence: string): number {
  const lower = sentence.toLowerCase();
  let total = 0;
  for (const pattern of SUBORDINATION_MARKERS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    const matches = lower.match(pattern);
    if (matches) total += matches.length;
  }
  return total;
}

function computeSubordinationFeatures(sents: string[]): Record<string, number> {
  if (sents.length === 0) {
    return {
      f_subordination_depth: 0,
      f_subordination_max: 0,
    };
  }

  const subCounts = sents.map(s => countSubordinationMarkers(s));
  const totalSub = subCounts.reduce((a, b) => a + b, 0);
  const maxSub = Math.max(...subCounts);

  return {
    f_subordination_depth: r4(totalSub / sents.length),
    f_subordination_max: maxSub,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F_INFO_DENSITY: Information density
// ═══════════════════════════════════════════════════════════════════════

function computeInfoDensity(text: string): Record<string, number> {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) {
    return { f_info_density: 0 };
  }

  let contentWords = 0;

  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿçœæ]/g, '');
    if (lower.length < 2) continue;

    // Proper nouns (capitalized, not at sentence start — approximate)
    if (/^[A-ZÀÂÉÈÊËÎÏÔÙÛÜŸÇ]/.test(word) && lower.length > 2) {
      contentWords++;
      continue;
    }

    // Action verbs (common French/English verb endings, not auxiliaries)
    if (/(?:er|ir|re|oir|ant|ait|aient|ed|ing|ize|ise)$/i.test(lower) &&
        !/^(?:est|être|avoir|a|était|sont|ont|étaient|avait|avaient|the|and|or|is|was|were|has|had|have|be|been|being)$/i.test(lower)) {
      contentWords++;
      continue;
    }

    // Qualitative adjectives (common endings)
    if (/(?:eux|euse|ique|able|ible|ent|ente|ous|ive|al|elle|ful|less|ous)$/i.test(lower) &&
        lower.length > 4) {
      contentWords++;
      continue;
    }

    // Concrete nouns are hard to detect without a dictionary,
    // but long words (>6 chars) that aren't function words are likely content words
    if (lower.length > 6 &&
        !/^(?:de|du|des|le|la|les|un|une|ce|cette|ces|mon|ton|son|ma|ta|sa|mes|tes|ses|notre|votre|leur|dans|pour|avec|sans|sur|sous|par|entre|the|and|but|or|not|this|that|these|those|from|with|about|into|through|during|before|after)$/i.test(lower)) {
      contentWords++;
    }
  }

  return {
    f_info_density: r4(contentWords / words.length),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F_POV_SHIFT: Point of view shifts
// ═══════════════════════════════════════════════════════════════════════

function computePovShift(sents: string[]): Record<string, number> {
  if (sents.length === 0) {
    return {
      f_pov_shift_rate: 0,
      f_indirect_libre_score: 0,
    };
  }

  let shiftsCount = 0;
  let indirectLibreCount = 0;

  // POV pronouns grouped
  const firstPerson = /\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|me\b|my\b|mine\b)/gi;
  const thirdPerson = /\b(?:il|elle|ils|elles|lui|leur|son|sa|ses|he\b|she\b|his\b|her\b|they\b|their\b)/gi;
  const collectivePerson = /\b(?:on|nous|we\b|our\b|us\b)/gi;

  // Perception verbs (style indirect libre markers)
  const perceptionVerbs = /\b(?:voyait|sentait|entendait|croyait|pensait|trouvait|savait|comprenait|imaginait|semblait|paraissait|saw|felt|heard|thought|knew|believed|seemed|wondered)\b/gi;

  for (const sent of sents) {
    const lower = sent.toLowerCase();

    const has1st = firstPerson.test(lower);
    firstPerson.lastIndex = 0;
    const has3rd = thirdPerson.test(lower);
    thirdPerson.lastIndex = 0;
    const hasCollective = collectivePerson.test(lower);
    collectivePerson.lastIndex = 0;

    // POV shift: multiple person markers in same sentence
    const personCount = (has1st ? 1 : 0) + (has3rd ? 1 : 0) + (hasCollective ? 1 : 0);
    if (personCount >= 2) {
      shiftsCount++;
    }

    // Indirect libre: perception verb + no quotation marks + exclamation/question
    const hasPerception = perceptionVerbs.test(lower);
    perceptionVerbs.lastIndex = 0;
    const hasQuotes = /[«»"""']/.test(sent);
    const hasExclOrQuestion = /[!?]/.test(sent);

    if (hasPerception && !hasQuotes && (hasExclOrQuestion || has3rd)) {
      indirectLibreCount++;
    }
  }

  return {
    f_pov_shift_rate: r4(shiftsCount / sents.length),
    f_indirect_libre_score: r4(indirectLibreCount / sents.length),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F_NEGATION_DENSITY: Extended negation detection
// ═══════════════════════════════════════════════════════════════════════

function computeNegationDensity(text: string): Record<string, number> {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) {
    return {
      f_negation_density: 0,
      f_negation_variety: 0,
    };
  }

  const lower = text.toLowerCase();

  const negationPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bne\b/g, label: 'ne' },
    { pattern: /\bn'(?=\w)/g, label: 'ne_elided' },
    { pattern: /\bpas\b/g, label: 'pas' },
    { pattern: /\bjamais\b/g, label: 'jamais' },
    { pattern: /\brien\b/g, label: 'rien' },
    { pattern: /\baucun[e]?\b/g, label: 'aucun' },
    { pattern: /\bnul(?:le)?\b/g, label: 'nul' },
    { pattern: /\bsans\b/g, label: 'sans' },
    { pattern: /\bni\b/g, label: 'ni' },
    { pattern: /\bguère\b/g, label: 'guere' },
    { pattern: /\bpoint\b/g, label: 'point' },
    { pattern: /\bplus\b(?=\s+(?:de|d'|rien|jamais|aucun))/g, label: 'plus_neg' },
    // English
    { pattern: /\bnot\b/g, label: 'not' },
    { pattern: /\bn't\b/g, label: 'nt' },
    { pattern: /\bnever\b/g, label: 'never' },
    { pattern: /\bnothing\b/g, label: 'nothing' },
    { pattern: /\bnobody\b/g, label: 'nobody' },
    { pattern: /\bnowhere\b/g, label: 'nowhere' },
    { pattern: /\bneither\b/g, label: 'neither' },
    { pattern: /\bnor\b/g, label: 'nor' },
    { pattern: /\bwithout\b/g, label: 'without' },
  ];

  let totalNegations = 0;
  const foundTypes = new Set<string>();

  for (const { pattern, label } of negationPatterns) {
    pattern.lastIndex = 0;
    const matches = lower.match(pattern);
    if (matches && matches.length > 0) {
      totalNegations += matches.length;
      foundTypes.add(label);
    }
  }

  return {
    f_negation_density: r4(totalNegations / words.length * 100),
    f_negation_variety: foundTypes.size,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F_SENTENCE_VARIANCE_LOCAL: Local rhythm variance (meta-variance)
// ═══════════════════════════════════════════════════════════════════════

function computeLocalVariance(sents: string[]): Record<string, number> {
  if (sents.length < 10) {
    return {
      f_sentence_variance_local: 0,
      f_variance_of_variance: 0,
      f_rhythm_stability: 0,
    };
  }

  const sentLengths = sents.map(s => s.split(/\s+/).filter(w => w.length > 0).length);

  // Sliding window of 5 sentences
  const windowSize = 5;
  const localVariances: number[] = [];

  for (let i = 0; i <= sentLengths.length - windowSize; i++) {
    const window = sentLengths.slice(i, i + windowSize);
    localVariances.push(variance(window));
  }

  if (localVariances.length === 0) {
    return {
      f_sentence_variance_local: 0,
      f_variance_of_variance: 0,
      f_rhythm_stability: 0,
    };
  }

  const meanLocalVar = mean(localVariances);
  const varOfVar = variance(localVariances);

  // Rhythm stability: coefficient of variation of local variances
  // Low = LLM (constant rhythm), High = classical (changing rhythm)
  const stability = meanLocalVar > 0
    ? Math.sqrt(varOfVar) / meanLocalVar
    : 0;

  return {
    f_sentence_variance_local: r4(meanLocalVar),
    f_variance_of_variance: r4(varOfVar),
    f_rhythm_stability: r4(stability),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Computes all depth features from raw text.
 *
 * @param text - The raw text to analyze
 * @returns Record of depth feature name to numeric value
 */
export function computeDepthFeatures(text: string): Record<string, number> {
  const sents = splitSentences(text);
  const features: Record<string, number> = {};

  Object.assign(features, computeClauseFeatures(sents));
  Object.assign(features, computeSubordinationFeatures(sents));
  Object.assign(features, computeInfoDensity(text));
  Object.assign(features, computePovShift(sents));
  Object.assign(features, computeNegationDensity(text));
  Object.assign(features, computeLocalVariance(sents));

  return features;
}

export { splitSentences };
