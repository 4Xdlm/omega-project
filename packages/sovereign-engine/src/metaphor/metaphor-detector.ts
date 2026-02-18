/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — METAPHOR DETECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: metaphor/metaphor-detector.ts
 * Version: 1.0.0 (Sprint 12)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-META-03
 *
 * Détecte les métaphores, comparaisons, et analogies dans une prose.
 * Méthode: LLM avec cache obligatoire.
 * FAIL-CLOSED: si provider down → retourner [] (pas d'erreur).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { SovereignProvider } from '../types.js';
import type { SemanticCache } from '../semantic/semantic-cache.js';
import { isDeadMetaphor } from './dead-metaphor-blacklist.js';

export interface MetaphorHit {
  readonly text: string;
  readonly position: number;
  readonly type: 'metaphor' | 'comparison' | 'analogy';
  readonly is_dead: boolean; // dans blacklist
  readonly novelty_score: number; // 0-100, LLM-judged ou CALC fallback
}

/**
 * Prompt version for cache key stability.
 */
const PROMPT_VERSION = 'v1.0.0';

/**
 * Détecte les métaphores dans une prose via LLM.
 * ART-META-03: Cache obligatoire (sha256 key).
 * FAIL-CLOSED: si provider down → retourner [].
 *
 * @param prose - Texte à analyser
 * @param provider - SovereignProvider LLM
 * @param cache - SemanticCache
 * @returns Array de MetaphorHit
 */
export async function detectMetaphors(
  prose: string,
  provider: SovereignProvider,
  cache: SemanticCache,
): Promise<MetaphorHit[]> {
  // LLM call via generateStructuredJSON (no cache — one evaluation per prose per run)
  try {
    const prompt = buildDetectionPrompt(prose);
    const result = await provider.generateStructuredJSON(prompt);

    // Parse structured response
    const parsed = result as { metaphors?: Array<{ text: string; type: string; novelty_score: number }> };
    return parseMetaphorHits(parsed.metaphors || [], prose);
  } catch {
    // FAIL-CLOSED: provider down or parsing error → return []
    return [];
  }
}

/**
 * Build LLM prompt for metaphor detection.
 */
function buildDetectionPrompt(prose: string): string {
  return `Tu es un expert en analyse stylistique française. Identifie toutes les métaphores, comparaisons et analogies dans ce texte.

Pour chaque figure de style détectée, fournis :
- text: la phrase exacte contenant la figure
- type: "metaphor", "comparison", ou "analogy"
- novelty_score: score 0-100 (100 = très original, 0 = cliché évident)

Retourne un JSON:
{
  "metaphors": [
    { "text": "...", "type": "metaphor", "novelty_score": 85 },
    ...
  ]
}

Texte: ${prose}`;
}

/**
 * Parse LLM metaphor hits and check against blacklist.
 */
function parseMetaphorHits(
  llmHits: Array<{ text: string; type: string; novelty_score: number }>,
  prose: string,
): MetaphorHit[] {
  return llmHits.map((hit) => {
    const position = prose.indexOf(hit.text);
    const deadCheck = isDeadMetaphor(hit.text);

    return {
      text: hit.text,
      position: position >= 0 ? position : 0,
      type: (hit.type as 'metaphor' | 'comparison' | 'analogy') || 'metaphor',
      is_dead: deadCheck.found,
      novelty_score: deadCheck.found ? 0 : hit.novelty_score, // Dead metaphor → score 0
    };
  });
}
