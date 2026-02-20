/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Diversity
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ANTI-REDUNDANCE "CHIRURGICALE"
 * 
 * If distance < DIVERSITY_MIN_DISTANCE → keep best scored, reject other
 * 
 * Distance calculated via:
 * - Strategy type
 * - Target character
 * - Expected emotion shift
 * - Mechanism
 * - Structured keywords (not NLP flou)
 * 
 * INV-MUSE-09: No pair of suggestions with distance < threshold
 * INV-MUSE-10: At least 2 different types in final output
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import {
  DIVERSITY_MIN_DISTANCE,
  MIN_DISTINCT_TYPES,
  MAX_SUGGESTIONS,
} from './constants';
import type { Suggestion, HarmonicAnalysis } from './types';
import type { StrategyId } from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// DISTANCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate distance between two suggestions (0 = identical, 1 = completely different)
 */
export function calculateDistance(a: Suggestion, b: Suggestion): number {
  // Weight factors
  const weights = {
    strategy: 0.25,
    target: 0.15,
    emotionShift: 0.25,
    mechanism: 0.20,
    keywords: 0.15,
  };
  
  let distance = 0;
  
  // 1. Strategy type distance
  const strategyDist = a.strategy === b.strategy ? 0 : 1;
  distance += weights.strategy * strategyDist;
  
  // 2. Target character distance
  const targetDist = calculateTargetDistance(a.target_character, b.target_character);
  distance += weights.target * targetDist;
  
  // 3. Emotion shift distance
  const shiftDist = calculateShiftDistance(a.expected_shift, b.expected_shift);
  distance += weights.emotionShift * shiftDist;
  
  // 4. Mechanism distance
  const mechanismDist = a.rationale.mechanism === b.rationale.mechanism ? 0 : 1;
  distance += weights.mechanism * mechanismDist;
  
  // 5. Keyword distance (structured, not NLP)
  const keywordDist = calculateKeywordDistance(a.content, b.content);
  distance += weights.keywords * keywordDist;
  
  return Math.min(1, distance);
}

/**
 * Calculate target character distance
 */
function calculateTargetDistance(
  targetA: string | undefined,
  targetB: string | undefined
): number {
  if (!targetA && !targetB) return 0; // Both undefined = same
  if (!targetA || !targetB) return 0.5; // One undefined = partial difference
  if (targetA.toLowerCase() === targetB.toLowerCase()) return 0;
  return 1;
}

/**
 * Calculate emotion shift distance
 */
function calculateShiftDistance(
  shiftA: { from: string; to: string; intensity_delta: number },
  shiftB: { from: string; to: string; intensity_delta: number }
): number {
  let distance = 0;
  
  // From emotion
  if (shiftA.from !== shiftB.from) distance += 0.3;
  
  // To emotion
  if (shiftA.to !== shiftB.to) distance += 0.4;
  
  // Intensity delta difference
  const intensityDiff = Math.abs(shiftA.intensity_delta - shiftB.intensity_delta);
  distance += 0.3 * Math.min(1, intensityDiff / 0.5);
  
  return Math.min(1, distance);
}

/**
 * Calculate keyword distance (structured, deterministic)
 * Extracts meaningful words and compares sets
 */
function calculateKeywordDistance(contentA: string, contentB: string): number {
  const keywordsA = extractKeywords(contentA);
  const keywordsB = extractKeywords(contentB);
  
  if (keywordsA.size === 0 && keywordsB.size === 0) return 0;
  if (keywordsA.size === 0 || keywordsB.size === 0) return 1;
  
  // Jaccard distance: 1 - (intersection / union)
  const intersection = new Set([...keywordsA].filter(k => keywordsB.has(k)));
  const union = new Set([...keywordsA, ...keywordsB]);
  
  const jaccard = intersection.size / union.size;
  return 1 - jaccard;
}

/**
 * Extract meaningful keywords from content
 * Filters stop words and short words
 */
function extractKeywords(content: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'and', 'but', 'or', 'if', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'them', 'their', 'he', 'she',
    'his', 'her', 'we', 'us', 'our', 'you', 'your', 'i', 'me', 'my',
    // French stop words
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
    'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
    'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
    'qui', 'que', 'quoi', 'dont', 'où', 'et', 'ou', 'mais', 'donc',
    'car', 'ni', 'ne', 'pas', 'plus', 'moins', 'très', 'peu', 'trop',
    'pour', 'par', 'sur', 'sous', 'avec', 'sans', 'dans', 'en', 'vers',
  ]);
  
  const words = content
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôùûüç\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  return new Set(words);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERSIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply diversity filter to suggestions
 * Removes suggestions that are too similar to higher-scored ones
 * 
 * INV-MUSE-09: No pair with distance < DIVERSITY_MIN_DISTANCE
 */
export function diversify(
  suggestions: Suggestion[],
  threshold: number = DIVERSITY_MIN_DISTANCE
): { survivors: Suggestion[]; rejected: Array<{ suggestion: Suggestion; similarTo: string }> } {
  // Assume already sorted by score (descending)
  const survivors: Suggestion[] = [];
  const rejected: Array<{ suggestion: Suggestion; similarTo: string }> = [];
  
  for (const candidate of suggestions) {
    let tooSimilar = false;
    let similarTo = '';
    
    for (const existing of survivors) {
      const distance = calculateDistance(candidate, existing);
      if (distance < threshold) {
        tooSimilar = true;
        similarTo = existing.id;
        break;
      }
    }
    
    if (tooSimilar) {
      rejected.push({ suggestion: candidate, similarTo });
    } else {
      survivors.push(candidate);
    }
  }
  
  return { survivors, rejected };
}

/**
 * Ensure minimum distinct strategy types
 * INV-MUSE-10: At least MIN_DISTINCT_TYPES different types
 */
export function ensureTypeVariety(
  suggestions: Suggestion[],
  allCandidates: Suggestion[],
  minTypes: number = MIN_DISTINCT_TYPES
): Suggestion[] {
  const currentTypes = new Set(suggestions.map(s => s.strategy));
  
  if (currentTypes.size >= minTypes) {
    return suggestions;
  }
  
  // Find candidates with different types
  const missingTypes: StrategyId[] = [];
  const allTypes = new Set<StrategyId>();
  for (const c of allCandidates) {
    if (!currentTypes.has(c.strategy)) {
      allTypes.add(c.strategy);
    }
  }
  
  // Try to add one suggestion of each missing type
  const result = [...suggestions];
  
  for (const type of allTypes) {
    if (currentTypes.size >= minTypes) break;
    if (result.length >= MAX_SUGGESTIONS) break;
    
    // Find best candidate of this type
    const candidate = allCandidates
      .filter(c => c.strategy === type)
      .sort((a, b) => b.score - a.score)[0];
    
    if (candidate) {
      // Check diversity against existing
      let canAdd = true;
      for (const existing of result) {
        if (calculateDistance(candidate, existing) < DIVERSITY_MIN_DISTANCE) {
          canAdd = false;
          break;
        }
      }
      
      if (canAdd) {
        result.push(candidate);
        currentTypes.add(type);
      }
    }
  }
  
  return result;
}

/**
 * Calculate overall diversity score
 */
export function calculateDiversityScore(suggestions: Suggestion[]): number {
  if (suggestions.length <= 1) return 1;
  
  let totalDistance = 0;
  let pairs = 0;
  
  for (let i = 0; i < suggestions.length; i++) {
    for (let j = i + 1; j < suggestions.length; j++) {
      totalDistance += calculateDistance(suggestions[i], suggestions[j]);
      pairs++;
    }
  }
  
  return pairs > 0 ? totalDistance / pairs : 1;
}

/**
 * Count distinct strategy types
 */
export function countDistinctTypes(suggestions: Suggestion[]): number {
  return new Set(suggestions.map(s => s.strategy)).size;
}

/**
 * Generate harmonic analysis for suggestion set
 */
export function analyzeHarmony(
  suggestions: Suggestion[],
  wildCardThreshold: number = 0.7
): HarmonicAnalysis {
  const diversityScore = calculateDiversityScore(suggestions);
  const distinctTypes = countDistinctTypes(suggestions);
  
  // Check for wild card (suggestion that's most different from others)
  let wildCardId: string | null = null;
  let maxAvgDistance = 0;
  
  for (const s of suggestions) {
    const distances = suggestions
      .filter(other => other.id !== s.id)
      .map(other => calculateDistance(s, other));
    
    if (distances.length > 0) {
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      if (avgDistance > maxAvgDistance && avgDistance > wildCardThreshold) {
        maxAvgDistance = avgDistance;
        wildCardId = s.id;
      }
    }
  }
  
  // Consonance: inverse of average shift magnitude variance
  const shifts = suggestions.map(s => s.expected_shift.intensity_delta);
  const avgShift = shifts.reduce((a, b) => a + b, 0) / shifts.length;
  const shiftVariance = shifts.reduce((sum, s) => sum + Math.pow(s - avgShift, 2), 0) / shifts.length;
  const consonance = 1 / (1 + shiftVariance * 4);
  
  // Progression coherence: do suggestions form a logical sequence?
  // Check if mechanisms are complementary
  const mechanisms = suggestions.map(s => s.rationale.mechanism);
  const hasVariety = new Set(mechanisms).size >= 2;
  const hasContrast = mechanisms.includes('contrast') || mechanisms.includes('tension');
  const hasResolution = mechanisms.includes('resolution') || mechanisms.includes('agency');
  const progressionCoherent = hasVariety && (hasContrast || hasResolution);
  
  return {
    consonance,
    progression_coherent: progressionCoherent,
    wild_card_id: wildCardId,
    diversity_score: diversityScore,
    distinct_types: distinctTypes,
  };
}
