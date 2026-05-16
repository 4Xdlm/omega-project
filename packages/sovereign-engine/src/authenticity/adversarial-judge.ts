/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ADVERSARIAL JUDGE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: authenticity/adversarial-judge.ts
 * Version: 1.0.0 (Sprint 11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-AUTH-02
 *
 * LLM adversarial judge : détection humain vs IA via prompt stable.
 * FAIL-CLOSED : si provider indispo → fraud_score = null, fallback CALC.
 * Cache obligatoire (réutilise cache Sprint 9).
 *
 * BUG-01 FIX: provider.llm_generate() n'existait pas dans SovereignProvider.
 * Remplacé par provider.generateStructuredJSON() (v1.1.0).
 * Avant ce fix, fraud_score était TOUJOURS null → fallback CALC → AAI=95.6 invariant.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { SovereignProvider } from '../types.js';
import type { SemanticCache } from '../semantic/semantic-cache.js';

/**
 * P3.1.5 (2026-05-16): cache entry shape for fraud judgement (subset of FraudResult, without cached+method runtime flags).
 */
export interface FraudCacheEntry {
  readonly fraud_score: number | null;
  readonly rationale: string;
}

export interface FraudResult {
  readonly fraud_score: number | null; // 0-100, 100 = certainement humain, null si provider indispo
  readonly rationale: string;
  readonly cached: boolean;
  readonly method: 'llm' | 'calc_fallback';
}

/**
 * Version du prompt adversarial (à incrémenter si le prompt change)
 */
const ADVERSARIAL_PROMPT_VERSION = 'v1.1.0';

/**
 * Prompt LLM stable pour détection humain vs IA
 */
function buildAdversarialPrompt(prose: string): string {
  return `Tu es un expert linguistique spécialisé en détection d'écriture IA vs humaine.

Analyse ce texte et détermine s'il a été écrit par une IA ou un humain.

Critères :
- IA : transitions parfaites, symétrie excessive, absence d'aspérités, sagesse générique
- Humain : ruptures naturelles, asymétries, aspérités stylistiques, ancrage sensoriel

Score 0-100 :
- 0 = certainement écrit par IA
- 100 = certainement écrit par humain

Réponds au format JSON :
{
  "score": <number 0-100>,
  "rationale": "<explique les 3 indices les plus révélateurs>",
  "worst_sentences": ["<phrase 1>", "<phrase 2>", "<phrase 3>"]
}

Texte à analyser :
"""
${prose}
"""`;
}

/**
 * Juge adversarial : détecte si prose est humaine ou IA via LLM.
 * ART-AUTH-02: Cached et reproductible.
 *
 * @param prose - Texte à analyser
 * @param provider - SovereignProvider LLM
 * @param cache - SemanticCache (réutilisé du Sprint 9)
 * @returns FraudResult avec score, rationale, cached flag, method
 */
export async function judgeFraudScore(
  prose: string,
  provider: SovereignProvider,
  // P3.1.5 (2026-05-16): cache uses default <SemanticEmotionResult> for back-compat;
  // fraud entries are casted at get/set sites (cf. FraudCacheEntry type).
  cache: SemanticCache,
): Promise<FraudResult> {
  const prompt = buildAdversarialPrompt(prose);

  // Cache key = sha256(prose + prompt_version + model_id)
  const cacheKey = sha256(`${prose}|${ADVERSARIAL_PROMPT_VERSION}|${provider.model_id || 'unknown'}`);

  // Vérifier cache (P3.1.5: cast cache → FraudCacheEntry — see FraudCacheEntry type def above)
  const cached = cache.get(cacheKey) as unknown as FraudCacheEntry | null;
  if (cached !== null) {
    // Cache hit
    return {
      fraud_score: cached.fraud_score,
      rationale: cached.rationale,
      cached: true,
      method: 'llm',
    };
  }

  // Appel LLM (FAIL-CLOSED)
  try {
    const response = await provider.generateStructuredJSON(prompt);

    // generateStructuredJSON retourne le texte brut ou un objet
    const responseText = typeof response === 'string' ? response : JSON.stringify(response);
    const parsed = parseAdversarialResponse(responseText);

    const result: FraudResult = {
      fraud_score: parsed.score,
      rationale: parsed.rationale,
      cached: false,
      method: 'llm',
    };

    // Store in cache (P3.1.5: shape-incompatible with SemanticEmotionResult default; cast bypass via unknown)
    const entry: FraudCacheEntry = {
      fraud_score: parsed.score,
      rationale: parsed.rationale,
    };
    cache.set(cacheKey, entry as unknown as import('../semantic/types.js').SemanticEmotionResult, 86400); // TTL 24h

    return result;
  } catch (err: unknown) {
    // FAIL-CLOSED : provider indisponible ou erreur parsing
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      fraud_score: null,
      rationale: `LLM indisponible ou erreur: ${errorMsg}. Utiliser CALC fallback uniquement.`,
      cached: false,
      method: 'calc_fallback',
    };
  }
}

/**
 * Parse la réponse JSON du LLM.
 * Format attendu : { "score": number, "rationale": string, "worst_sentences": string[] }
 */
function parseAdversarialResponse(text: string): { score: number; rationale: string } {
  try {
    // Extraire JSON s'il est enrobé dans du texte
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100) {
      throw new Error(`Invalid score: ${parsed.score}`);
    }

    if (typeof parsed.rationale !== 'string') {
      throw new Error('Missing rationale');
    }

    return {
      score: Math.round(parsed.score),
      rationale: parsed.rationale,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse adversarial response: ${msg}`);
  }
}
