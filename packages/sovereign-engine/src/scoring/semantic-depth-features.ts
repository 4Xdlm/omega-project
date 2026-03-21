/**
 * OMEGA Semantic Depth Features — Phase R-6b
 * Features sémantiques et contextuelles pour détection de contrefaçon.
 *
 * 8 familles de features ciblant la distinction maîtrise authentique vs imitation LLM :
 *   1. Cohérence référentielle (chaînes de référence)
 *   2. Progression intra-passage (avancée vs circularité)
 *   3. Précision contextuelle (mot juste vs variété de surface)
 *   4. Originalité lexicale contextuelle (rareté pertinente)
 *   5. Tension implicite / subtexte
 *   6. Contamination du point de vue
 *   7. Cohérence causale locale
 *   8. Densité relationnelle (échos, reprises)
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

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

function getLowerWords(text: string): string[] {
  return getWords(text).map(w => w.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿçœæñ'-]/g, '')).filter(w => w.length > 1);
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
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

// French stop words (function words to exclude from content analysis)
const STOP_FR = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
  'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'en', 'y',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'entre',
  'vers', 'chez', 'contre', 'après', 'avant', 'pendant', 'depuis',
  'que', 'qui', 'dont', 'où', 'quand', 'comme', 'si',
  'ne', 'pas', 'plus', 'jamais', 'rien',
  'est', 'sont', 'était', 'étaient', 'être', 'avoir', 'avait', 'avaient',
  'fait', 'faire', 'dit', 'dire', 'peut', 'pouvoir', 'doit', 'devoir',
  'tout', 'tous', 'toute', 'toutes', 'autre', 'autres',
  'même', 'aussi', 'très', 'bien', 'peu', 'trop', 'assez',
  'alors', 'encore', 'déjà', 'là', 'ici', 'puis',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'from', 'by', 'is', 'was', 'were', 'are', 'been', 'be',
  'has', 'had', 'have', 'do', 'did', 'does', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'must',
  'it', 'its', 'he', 'she', 'they', 'them', 'their', 'his', 'her',
  'this', 'that', 'these', 'those', 'not', 'no', 'so', 'if', 'as',
]);

// ═══════════════════════════════════════════════════════════════════════
// 1. COHÉRENCE RÉFÉRENTIELLE
// Mesure la continuité des chaînes de référence (pronoms, entités).
// Un texte maîtrisé maintient des chaînes stables.
// Un LLM introduit des référents orphelins ou les abandonne.
// ═══════════════════════════════════════════════════════════════════════

function computeReferentialCoherence(sents: string[]): Record<string, number> {
  if (sents.length < 3) {
    return {
      f_referent_continuity: 0,
      f_referent_orphan_rate: 0,
      f_entity_persistence: 0,
    };
  }

  // Extract capitalized words (entity candidates) per sentence
  const entitiesPerSent: Set<string>[] = sents.map(s => {
    const ents = new Set<string>();
    const matches = s.match(/\b[A-ZÀÂÉÈÊËÎÏÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿçœæ]{2,}/g);
    if (matches) {
      for (const m of matches) {
        ents.add(m.toLowerCase());
      }
    }
    return ents;
  });

  // Pronoun class per sentence (tracks which person dominates)
  const pronounClassPerSent: string[] = sents.map(s => {
    const lower = s.toLowerCase();
    const p1 = (lower.match(/\b(?:je|j'|me|m'|moi|i\b|my\b|me\b)/g) || []).length;
    const p3 = (lower.match(/\b(?:il|elle|lui|son|sa|ses|he\b|she\b|his\b|her\b)/g) || []).length;
    const pN = (lower.match(/\b(?:on|nous|they\b|we\b)/g) || []).length;
    if (p1 > p3 && p1 > pN) return '1';
    if (p3 > p1 && p3 > pN) return '3';
    if (pN > 0) return 'N';
    return '0';
  });

  // Referent continuity: how often entities from sentence N appear in N+1 or N+2
  let continuityHits = 0;
  let continuityTotal = 0;
  for (let i = 0; i < sents.length - 1; i++) {
    const current = entitiesPerSent[i];
    if (current.size === 0) continue;
    const next1 = entitiesPerSent[i + 1] || new Set();
    const next2 = i + 2 < sents.length ? entitiesPerSent[i + 2] : new Set();
    for (const ent of current) {
      continuityTotal++;
      if (next1.has(ent) || next2.has(ent)) {
        continuityHits++;
      }
    }
  }
  const referentContinuity = continuityTotal > 0 ? continuityHits / continuityTotal : 0;

  // Orphan rate: entities that appear exactly once in the passage
  const entityCounts = new Map<string, number>();
  for (const ents of entitiesPerSent) {
    for (const e of ents) {
      entityCounts.set(e, (entityCounts.get(e) || 0) + 1);
    }
  }
  const totalEntities = entityCounts.size;
  const orphans = [...entityCounts.values()].filter(c => c === 1).length;
  const orphanRate = totalEntities > 0 ? orphans / totalEntities : 0;

  // Entity persistence: average number of sentences an entity spans
  const entitySpan = new Map<string, { first: number; last: number }>();
  for (let i = 0; i < entitiesPerSent.length; i++) {
    for (const e of entitiesPerSent[i]) {
      const span = entitySpan.get(e);
      if (!span) {
        entitySpan.set(e, { first: i, last: i });
      } else {
        span.last = i;
      }
    }
  }
  const spans = [...entitySpan.values()].map(s => s.last - s.first + 1);
  const entityPersistence = spans.length > 0 ? mean(spans) / sents.length : 0;

  return {
    f_referent_continuity: r4(referentContinuity),
    f_referent_orphan_rate: r4(orphanRate),
    f_entity_persistence: r4(entityPersistence),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 2. PROGRESSION INTRA-PASSAGE
// Le passage avance-t-il réellement ou tourne en rond ?
// Mesure le taux de vocabulaire nouveau par fenêtre glissante.
// Un maître progresse ; un LLM recycle.
// ═══════════════════════════════════════════════════════════════════════

function computeProgression(sents: string[]): Record<string, number> {
  if (sents.length < 5) {
    return {
      f_lexical_progression: 0,
      f_semantic_stagnation: 0,
      f_novelty_curve_slope: 0,
    };
  }

  const windowSize = 3; // sentences per window
  const windowVocabs: Set<string>[] = [];

  for (let i = 0; i <= sents.length - windowSize; i++) {
    const windowText = sents.slice(i, i + windowSize).join(' ');
    const words = getLowerWords(windowText).filter(w => !STOP_FR.has(w) && w.length > 2);
    windowVocabs.push(new Set(words));
  }

  if (windowVocabs.length < 2) {
    return {
      f_lexical_progression: 0,
      f_semantic_stagnation: 0,
      f_novelty_curve_slope: 0,
    };
  }

  // Progression: ratio of new words in each window compared to previous
  const noveltyRates: number[] = [];
  const cumulativeVocab = new Set<string>();

  for (let i = 0; i < windowVocabs.length; i++) {
    const current = windowVocabs[i];
    if (i === 0) {
      for (const w of current) cumulativeVocab.add(w);
      noveltyRates.push(1.0);
      continue;
    }
    let newWords = 0;
    for (const w of current) {
      if (!cumulativeVocab.has(w)) {
        newWords++;
        cumulativeVocab.add(w);
      }
    }
    noveltyRates.push(current.size > 0 ? newWords / current.size : 0);
  }

  const lexicalProgression = mean(noveltyRates.slice(1)); // skip first (always 1.0)

  // Stagnation: proportion of windows where novelty < 10%
  const stagnantWindows = noveltyRates.slice(1).filter(r => r < 0.10).length;
  const stagnation = noveltyRates.length > 1 ? stagnantWindows / (noveltyRates.length - 1) : 0;

  // Novelty curve slope: does novelty decrease (natural) or stay flat (LLM)?
  // Linear regression of novelty vs window index
  const n = noveltyRates.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(noveltyRates);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (noveltyRates[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den > 0 ? num / den : 0;

  return {
    f_lexical_progression: r4(lexicalProgression),
    f_semantic_stagnation: r4(stagnation),
    f_novelty_curve_slope: r4(slope),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 3. PRÉCISION CONTEXTUELLE
// Mot juste contextuel vs simple variété lexicale.
// Mesure la co-occurrence locale : un mot rare est-il soutenu par son
// voisinage sémantique ou simplement "posé" pour faire style ?
// ═══════════════════════════════════════════════════════════════════════

function computeContextualPrecision(sents: string[]): Record<string, number> {
  if (sents.length < 3) {
    return {
      f_contextual_precision: 0,
      f_rare_word_isolation: 0,
    };
  }

  // Build corpus-local frequency table
  const allWords = sents.flatMap(s => getLowerWords(s).filter(w => !STOP_FR.has(w) && w.length > 2));
  const freqMap = new Map<string, number>();
  for (const w of allWords) {
    freqMap.set(w, (freqMap.get(w) || 0) + 1);
  }
  const totalWords = allWords.length;
  if (totalWords < 10) {
    return { f_contextual_precision: 0, f_rare_word_isolation: 0 };
  }

  // Rare words: frequency <= 2 in passage (bottom quartile in a 500-word window)
  const rareThreshold = 2;
  const rareWords = new Set([...freqMap.entries()].filter(([, c]) => c <= rareThreshold).map(([w]) => w));

  // For each rare word, check if it shares a 3-character stem prefix with neighbors
  // in the same sentence (contextual support)
  let supportedRare = 0;
  let totalRare = 0;
  let isolatedRare = 0;

  for (const sent of sents) {
    const words = getLowerWords(sent).filter(w => !STOP_FR.has(w) && w.length > 2);
    for (let i = 0; i < words.length; i++) {
      if (!rareWords.has(words[i])) continue;
      totalRare++;

      const rareWord = words[i];
      const stem = rareWord.slice(0, Math.min(4, rareWord.length));
      // Check neighbors (window of 5 words)
      let supported = false;
      for (let j = Math.max(0, i - 5); j < Math.min(words.length, i + 6); j++) {
        if (j === i) continue;
        const neighbor = words[j];
        // Support = shares semantic field (stem prefix) or is in same frequency band
        if (neighbor.slice(0, Math.min(4, neighbor.length)) === stem) {
          supported = true;
          break;
        }
        // Or both are rare (mutual contextual density)
        if (rareWords.has(neighbor)) {
          supported = true;
          break;
        }
      }
      if (supported) {
        supportedRare++;
      } else {
        isolatedRare++;
      }
    }
  }

  const contextualPrecision = totalRare > 0 ? supportedRare / totalRare : 0;
  const rareWordIsolation = totalRare > 0 ? isolatedRare / totalRare : 0;

  return {
    f_contextual_precision: r4(contextualPrecision),
    f_rare_word_isolation: r4(rareWordIsolation),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 4. ORIGINALITÉ LEXICALE EN CONTEXTE
// Non pas TTR brut mais : combien de mots sont à la fois rares et
// pertinents (non-isolés) ? Ratio hapax_pertinents / total_content_words.
// ═══════════════════════════════════════════════════════════════════════

function computeContextualOriginality(text: string): Record<string, number> {
  const words = getLowerWords(text).filter(w => !STOP_FR.has(w) && w.length > 2);
  if (words.length < 10) {
    return {
      f_hapax_contextual_rate: 0,
      f_vocabulary_depth: 0,
    };
  }

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  // Hapax: words appearing exactly once
  const hapax = [...freq.entries()].filter(([, c]) => c === 1);
  const hapaxRate = hapax.length / words.length;

  // Vocabulary depth: ratio of words appearing 2-3 times (not hapax, not super-frequent)
  // These are "working vocabulary" — chosen deliberately, reused with purpose
  const midFreq = [...freq.entries()].filter(([, c]) => c >= 2 && c <= 3);
  const vocabDepth = midFreq.length / Math.max(freq.size, 1);

  return {
    f_hapax_contextual_rate: r4(hapaxRate),
    f_vocabulary_depth: r4(vocabDepth),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 5. TENSION IMPLICITE / SUBTEXTE
// Coprésence de champs sémantiques contradictoires :
// perception + négation, désir + refus, ironie + affirmation.
// Un maître tisse des tensions ; un LLM juxtapose.
// ═══════════════════════════════════════════════════════════════════════

function computeImplicitTension(sents: string[]): Record<string, number> {
  if (sents.length < 3) {
    return {
      f_tension_density: 0,
      f_desire_negation_rate: 0,
      f_perception_conflict_rate: 0,
    };
  }

  const PERCEPTION = /\b(?:voyait|sentait|entendait|regardait|écoutait|touchait|percevait|aperçut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b/gi;
  const DESIRE = /\b(?:voulait|désirait|espérait|souhaitait|rêvait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b/gi;
  const NEGATION = /\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guère|point|not|n't|never|nothing|neither|nor|without|no\b)\b/gi;
  const CONCESSION = /\b(?:mais|pourtant|cependant|toutefois|néanmoins|malgré|quoique|bien que|même si|although|though|however|yet|despite|nevertheless|but\b)\b/gi;
  const IRONY_MARKERS = /\b(?:sans doute|bien sûr|évidemment|naturellement|certes|apparently|of course|surely|indeed|certainly)\b/gi;

  let tensionSentences = 0;
  let desireNegation = 0;
  let perceptionConflict = 0;

  for (const sent of sents) {
    const lower = sent.toLowerCase();

    const hasPerception = PERCEPTION.test(lower); PERCEPTION.lastIndex = 0;
    const hasDesire = DESIRE.test(lower); DESIRE.lastIndex = 0;
    const hasNegation = NEGATION.test(lower); NEGATION.lastIndex = 0;
    const hasConcession = CONCESSION.test(lower); CONCESSION.lastIndex = 0;
    const hasIrony = IRONY_MARKERS.test(lower); IRONY_MARKERS.lastIndex = 0;

    // Tension: at least 2 opposing forces in same sentence
    const forces = [hasPerception, hasDesire, hasNegation, hasConcession, hasIrony];
    const forceCount = forces.filter(Boolean).length;

    if (forceCount >= 2) {
      tensionSentences++;
    }
    if (hasDesire && hasNegation) {
      desireNegation++;
    }
    if (hasPerception && (hasNegation || hasConcession)) {
      perceptionConflict++;
    }
  }

  return {
    f_tension_density: r4(tensionSentences / sents.length),
    f_desire_negation_rate: r4(desireNegation / sents.length),
    f_perception_conflict_rate: r4(perceptionConflict / sents.length),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 6. CONTAMINATION DU POINT DE VUE
// Extension de f_pov_shift : mesure les glissements progressifs vs
// ruptures brusques. Un maître glisse ; un LLM saute.
// ═══════════════════════════════════════════════════════════════════════

function computePovContamination(sents: string[]): Record<string, number> {
  if (sents.length < 5) {
    return {
      f_pov_drift_rate: 0,
      f_pov_rupture_rate: 0,
      f_pov_stability: 0,
    };
  }

  // Classify each sentence by dominant POV
  type PovClass = '1' | '3' | 'N' | '0';
  const povPerSent: PovClass[] = sents.map(s => {
    const lower = s.toLowerCase();
    const p1 = (lower.match(/\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|my\b|mine\b|myself\b)/g) || []).length;
    const p3 = (lower.match(/\b(?:il|elle|lui|son|sa|ses|he\b|she\b|his\b|her\b|him\b|himself\b|herself\b)/g) || []).length;
    const pN = (lower.match(/\b(?:on|nous|we\b|our\b|us\b|ourselves\b)/g) || []).length;
    const max = Math.max(p1, p3, pN);
    if (max === 0) return '0';
    if (p1 === max) return '1';
    if (p3 === max) return '3';
    return 'N';
  });

  // Drift: POV changes between consecutive non-zero sentences
  let drifts = 0;
  let ruptures = 0;
  let transitions = 0;
  let lastPov: PovClass = '0';

  for (const pov of povPerSent) {
    if (pov === '0') continue;
    if (lastPov !== '0' && lastPov !== pov) {
      transitions++;
      // Drift = gradual (passing through neutral '0' or 'N')
      // Rupture = direct jump between 1st and 3rd person
      if ((lastPov === '1' && pov === '3') || (lastPov === '3' && pov === '1')) {
        ruptures++;
      } else {
        drifts++;
      }
    }
    lastPov = pov;
  }

  const nonZeroCount = povPerSent.filter(p => p !== '0').length;
  const driftRate = nonZeroCount > 1 ? drifts / (nonZeroCount - 1) : 0;
  const ruptureRate = nonZeroCount > 1 ? ruptures / (nonZeroCount - 1) : 0;

  // Stability: proportion of the dominant POV
  const povCounts = new Map<string, number>();
  for (const p of povPerSent) {
    if (p === '0') continue;
    povCounts.set(p, (povCounts.get(p) || 0) + 1);
  }
  const maxCount = Math.max(...povCounts.values(), 0);
  const stability = nonZeroCount > 0 ? maxCount / nonZeroCount : 0;

  return {
    f_pov_drift_rate: r4(driftRate),
    f_pov_rupture_rate: r4(ruptureRate),
    f_pov_stability: r4(stability),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 7. COHÉRENCE CAUSALE LOCALE
// Chaînes événement → perception → réaction → conséquence.
// Un maître lie ; un LLM enchaîne sans causalité.
// ═══════════════════════════════════════════════════════════════════════

function computeCausalCoherence(sents: string[]): Record<string, number> {
  if (sents.length < 3) {
    return {
      f_causal_density: 0,
      f_causal_chain_length: 0,
      f_temporal_anchor_rate: 0,
    };
  }

  const CAUSAL_MARKERS = /\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|dès que|à cause|grâce à|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|owing to|caused|led to|resulted)\b/gi;
  const TEMPORAL_MARKERS = /\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitôt|tout à coup|après|avant|pendant|dès|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b/gi;
  const REACTION_MARKERS = /\b(?:sentit|comprit|réalisa|sursauta|frémit|recula|bondit|cria|murmura|soupira|trembla|felt|understood|realized|jumped|flinched|gasped|whispered|sighed|trembled|cried|screamed|froze)\b/gi;

  let causalSentences = 0;
  let temporalAnchors = 0;
  let currentChain = 0;
  const chainLengths: number[] = [];

  for (const sent of sents) {
    const lower = sent.toLowerCase();

    const hasCausal = CAUSAL_MARKERS.test(lower); CAUSAL_MARKERS.lastIndex = 0;
    const hasTemporal = TEMPORAL_MARKERS.test(lower); TEMPORAL_MARKERS.lastIndex = 0;
    const hasReaction = REACTION_MARKERS.test(lower); REACTION_MARKERS.lastIndex = 0;

    if (hasCausal || hasReaction) {
      causalSentences++;
      currentChain++;
    } else {
      if (currentChain > 0) {
        chainLengths.push(currentChain);
        currentChain = 0;
      }
    }

    if (hasTemporal) {
      temporalAnchors++;
    }
  }
  if (currentChain > 0) chainLengths.push(currentChain);

  const causalDensity = causalSentences / sents.length;
  const avgChainLength = chainLengths.length > 0 ? mean(chainLengths) : 0;
  const temporalAnchorRate = temporalAnchors / sents.length;

  return {
    f_causal_density: r4(causalDensity),
    f_causal_chain_length: r4(avgChainLength),
    f_temporal_anchor_rate: r4(temporalAnchorRate),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 8. DENSITÉ RELATIONNELLE
// Combien d'éléments du passage se répondent réellement ?
// Motifs, reprises, échos, rappels courts.
// ═══════════════════════════════════════════════════════════════════════

function computeRelationalDensity(sents: string[]): Record<string, number> {
  if (sents.length < 3) {
    return {
      f_echo_density: 0,
      f_lexical_callback_rate: 0,
      f_motif_concentration: 0,
    };
  }

  // Build per-sentence content word sets
  const sentWords: Set<string>[] = sents.map(s => {
    const words = getLowerWords(s).filter(w => !STOP_FR.has(w) && w.length > 3);
    return new Set(words);
  });

  // Echo density: words that appear in non-adjacent sentences (gap >= 2)
  const wordPositions = new Map<string, number[]>();
  for (let i = 0; i < sentWords.length; i++) {
    for (const w of sentWords[i]) {
      if (!wordPositions.has(w)) wordPositions.set(w, []);
      wordPositions.get(w)!.push(i);
    }
  }

  let echoCount = 0;
  let callbackCount = 0;
  const allContentWords = new Set<string>();
  for (const sw of sentWords) {
    for (const w of sw) allContentWords.add(w);
  }

  for (const [word, positions] of wordPositions) {
    if (positions.length < 2) continue;
    // Echo: reappears with at least 2 sentences gap
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] - positions[i - 1] >= 3) {
        echoCount++;
        break; // count word once as echo
      }
    }
    // Callback: reappears in last third after appearing in first third
    const firstThird = Math.floor(sents.length / 3);
    const lastThird = sents.length - firstThird;
    const inFirst = positions.some(p => p < firstThird);
    const inLast = positions.some(p => p >= lastThird);
    if (inFirst && inLast) {
      callbackCount++;
    }
  }

  const echoDensity = allContentWords.size > 0 ? echoCount / allContentWords.size : 0;
  const callbackRate = allContentWords.size > 0 ? callbackCount / allContentWords.size : 0;

  // Motif concentration: are repeated words clustered or spread?
  // High concentration = words repeat in clusters (motif patterns)
  const repeatedWords = [...wordPositions.entries()].filter(([, pos]) => pos.length >= 2);
  let concentrationScore = 0;
  if (repeatedWords.length > 0) {
    const gapVariances: number[] = [];
    for (const [, positions] of repeatedWords) {
      if (positions.length < 2) continue;
      const gaps: number[] = [];
      for (let i = 1; i < positions.length; i++) {
        gaps.push(positions[i] - positions[i - 1]);
      }
      if (gaps.length > 0) {
        gapVariances.push(variance(gaps));
      }
    }
    // High variance in gaps = concentrated (clustered repeats), low = even spread (LLM)
    concentrationScore = gapVariances.length > 0 ? mean(gapVariances) : 0;
    // Normalize to ~0-1 range
    concentrationScore = Math.min(1, concentrationScore / 20);
  }

  return {
    f_echo_density: r4(echoDensity),
    f_lexical_callback_rate: r4(callbackRate),
    f_motif_concentration: r4(concentrationScore),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Computes all semantic depth features from raw text.
 *
 * @param text - The raw text to analyze (typically a 500-word passage)
 * @returns Record of semantic feature name to numeric value
 */
export function computeSemanticDepthFeatures(text: string): Record<string, number> {
  const sents = splitSentences(text);
  const features: Record<string, number> = {};

  Object.assign(features, computeReferentialCoherence(sents));
  Object.assign(features, computeProgression(sents));
  Object.assign(features, computeContextualPrecision(sents));
  Object.assign(features, computeContextualOriginality(text));
  Object.assign(features, computeImplicitTension(sents));
  Object.assign(features, computePovContamination(sents));
  Object.assign(features, computeCausalCoherence(sents));
  Object.assign(features, computeRelationalDensity(sents));

  return features;
}

/**
 * List of all semantic feature names produced by this module.
 */
export const SEMANTIC_FEATURE_NAMES = [
  // 1. Referential coherence
  'f_referent_continuity',
  'f_referent_orphan_rate',
  'f_entity_persistence',
  // 2. Progression
  'f_lexical_progression',
  'f_semantic_stagnation',
  'f_novelty_curve_slope',
  // 3. Contextual precision
  'f_contextual_precision',
  'f_rare_word_isolation',
  // 4. Contextual originality
  'f_hapax_contextual_rate',
  'f_vocabulary_depth',
  // 5. Implicit tension
  'f_tension_density',
  'f_desire_negation_rate',
  'f_perception_conflict_rate',
  // 6. POV contamination
  'f_pov_drift_rate',
  'f_pov_rupture_rate',
  'f_pov_stability',
  // 7. Causal coherence
  'f_causal_density',
  'f_causal_chain_length',
  'f_temporal_anchor_rate',
  // 8. Relational density
  'f_echo_density',
  'f_lexical_callback_rate',
  'f_motif_concentration',
];

export { splitSentences };
