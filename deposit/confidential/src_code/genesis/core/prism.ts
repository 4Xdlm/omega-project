// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — PRISM (Creative Injection with Rollback)
// ═══════════════════════════════════════════════════════════════════════════════
// Injection creative MAIS bridee — Si distribution hors bornes -> ROLLBACK
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  PrismConstraints,
  IntensityRecord14,
  EmotionType,
  DomainLexicon,
} from './types';
import { hashObject } from '../proofs/hash_utils';

/**
 * Resultat de l'application PRISM
 */
export interface PrismResult {
  draft: Draft;
  applied: boolean;
  rollbackOccurred: boolean;
  reason?: string;
}

/**
 * Mesure de la distribution emotionnelle d'un texte
 * STUB: Implementation basee sur heuristiques (Phase 1)
 * Integration moteur emotion OMEGA 14D prevu Phase D+
 */
export function measureEmotionDistribution(text: string): IntensityRecord14 {
  // STUB: Retourne une distribution basee sur des heuristiques simples
  // Future: Integration moteur emotion OMEGA 14D

  // Pour l'instant, distribution uniforme avec leger bruit deterministe
  const hash = simpleHash(text);
  const base = 1 / 14;
  const noise = 0.05;

  const emotions: EmotionType[] = [
    'joy', 'fear', 'anger', 'sadness',
    'surprise', 'disgust', 'trust', 'anticipation',
    'love', 'guilt', 'shame', 'pride',
    'hope', 'despair'
  ];

  const result: Record<string, number> = {};
  let sum = 0;

  for (let i = 0; i < emotions.length; i++) {
    const hashByte = (hash >> (i * 2)) & 0x3;
    const variation = (hashByte / 3 - 0.5) * noise * 2;
    result[emotions[i]] = Math.max(0, base + variation);
    sum += result[emotions[i]];
  }

  // Normaliser pour sum = 1
  for (const e of emotions) {
    result[e] /= sum;
  }

  return result as IntensityRecord14;
}

/**
 * Calcule la distance cosinus entre deux distributions 14D
 */
export function cosineDistance(a: IntensityRecord14, b: IntensityRecord14): number {
  const emotions: EmotionType[] = [
    'joy', 'fear', 'anger', 'sadness',
    'surprise', 'disgust', 'trust', 'anticipation',
    'love', 'guilt', 'shame', 'pride',
    'hope', 'despair'
  ];

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const e of emotions) {
    dotProduct += a[e] * b[e];
    normA += a[e] * a[e];
    normB += b[e] * b[e];
  }

  const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1 - cosineSimilarity; // Distance = 1 - similarity
}

/**
 * Verifie si une distribution est dans les bornes protegees
 */
export function isWithinProtectedBounds(
  measured: IntensityRecord14,
  protected_: IntensityRecord14,
  tolerance: number
): boolean {
  const distance = cosineDistance(measured, protected_);
  return distance <= tolerance;
}

/**
 * Applique PRISM avec contraintes et rollback
 */
export function applyPrismWithConstraints(
  draft: Draft,
  constraints: PrismConstraints,
  seed: number
): PrismResult {
  // 1. Si pas d'angle lateral, retourner draft inchange
  if (!constraints.lateralAngle) {
    return {
      draft,
      applied: false,
      rollbackOccurred: false,
      reason: 'No lateral angle specified',
    };
  }

  // 2. Charger le lexique du domaine
  const lexicon = loadDomainLexicon(constraints.lateralAngle.domain);
  if (!lexicon) {
    return {
      draft,
      applied: false,
      rollbackOccurred: false,
      reason: `Domain lexicon not found: ${constraints.lateralAngle.domain}`,
    };
  }

  // 3. Verifier le hash du lexique
  const actualHash = hashObject(lexicon);
  if (actualHash !== constraints.lateralAngle.lexiconHash) {
    return {
      draft,
      applied: false,
      rollbackOccurred: false,
      reason: 'Lexicon hash mismatch',
    };
  }

  // 4. Appliquer l'injection lexicale
  const modifiedText = injectDomainLexicon(
    draft.text,
    lexicon,
    constraints.lateralAngle.intensity,
    seed
  );

  // 5. Mesurer la distribution du texte modifie
  const measuredDistribution = measureEmotionDistribution(modifiedText);

  // 6. Verifier si dans les bornes protegees
  if (!isWithinProtectedBounds(
    measuredDistribution,
    constraints.protectedDistribution,
    constraints.distributionTolerance
  )) {
    // ROLLBACK
    return {
      draft,
      applied: false,
      rollbackOccurred: true,
      reason: 'Distribution out of protected bounds - rollback applied',
    };
  }

  // 7. Retourner le draft modifie
  const modifiedDraft: Draft = {
    ...draft,
    text: modifiedText,
    parentDraftId: draft.id,
    id: `${draft.id}-prism-${seed}`,
  };

  return {
    draft: modifiedDraft,
    applied: true,
    rollbackOccurred: false,
  };
}

/**
 * Charge un lexique de domaine
 * STUB: A remplacer par chargement reel des artifacts
 */
function loadDomainLexicon(domain: string): DomainLexicon | null {
  // STUB: Lexiques integres pour tests
  const lexicons: Record<string, DomainLexicon> = {
    geology: {
      domain: 'geology',
      version: '1.0',
      terms: ['strata', 'sediment', 'erosion', 'metamorphic', 'igneous', 'tectonic', 'magma', 'crystalline'],
    },
    astronomy: {
      domain: 'astronomy',
      version: '1.0',
      terms: ['nebula', 'quasar', 'supernova', 'celestial', 'cosmic', 'orbital', 'stellar', 'pulsar'],
    },
    ocean: {
      domain: 'ocean',
      version: '1.0',
      terms: ['abyssal', 'pelagic', 'tidal', 'bioluminescent', 'current', 'reef', 'plankton', 'salinity'],
    },
  };

  return lexicons[domain] || null;
}

/**
 * Injecte des termes du lexique dans le texte
 */
function injectDomainLexicon(
  text: string,
  lexicon: DomainLexicon,
  intensity: number,
  seed: number
): string {
  if (lexicon.terms.length === 0 || intensity <= 0) {
    return text;
  }

  // Deterministic random based on seed
  let rng = seed;
  const nextRandom = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  // Split text into words
  const words = text.split(/(\s+)/);
  const targetReplacements = Math.floor(words.length * intensity * 0.1);

  // Find positions to inject (every ~10 words based on intensity)
  let replacements = 0;
  for (let i = 0; i < words.length && replacements < targetReplacements; i++) {
    // Skip whitespace
    if (/^\s+$/.test(words[i])) continue;

    // Probability of replacement based on intensity
    if (nextRandom() < intensity * 0.2) {
      // Select a term from lexicon
      const termIndex = Math.floor(nextRandom() * lexicon.terms.length);
      const term = lexicon.terms[termIndex];

      // Preserve case
      if (words[i] && words[i][0] === words[i][0].toUpperCase()) {
        words[i] = term.charAt(0).toUpperCase() + term.slice(1);
      } else {
        words[i] = term;
      }

      replacements++;
    }
  }

  return words.join('');
}

/**
 * Simple hash function for deterministic noise
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default {
  applyPrismWithConstraints,
  measureEmotionDistribution,
  cosineDistance,
  isWithinProtectedBounds,
};
