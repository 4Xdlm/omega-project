/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PARAGRAPH GUARD
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: guards/paragraph-guard.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * V4.2 runtime guard: ensures prose has >= 4 paragraphs.
 * The tension_14d scorer splits prose by /\n\s*\n/ into paragraphs,
 * then maps to 4 quartiles via floor/ceil. With < 4 paragraphs,
 * quartiles overlap → monotony penalty -20 → ECC collapses.
 *
 * Strategy:
 *   1. Count paragraphs using SAME regex as tension_14d scorer
 *   2. If < 4, request LLM to reformat (max 1 retry)
 *   3. If retry also fails, log warning and return original prose
 *   4. Never modify prose content — only structure (line breaks)
 *
 * Convergence 3/3: Claude (diagnostic) + ChatGPT (proposed guard) + Gemini (validated).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../types.js';

/** Same regex used by tension_14d scorer — MUST stay in sync */
const PARAGRAPH_SPLIT_REGEX = /\n\s*\n/;

/** Minimum paragraph count required for correct quartile mapping */
const MIN_PARAGRAPHS = 4;

/** Max retry attempts (1 = one reformatting call) */
const MAX_RETRIES = 1;

/**
 * Count paragraphs using the same split as the tension_14d scorer.
 */
export function countParagraphs(prose: string): number {
  return prose.split(PARAGRAPH_SPLIT_REGEX).filter((p) => p.trim().length > 0).length;
}

/**
 * Guard result for traceability.
 */
export interface ParagraphGuardResult {
  readonly original_count: number;
  readonly final_count: number;
  readonly retried: boolean;
  readonly retry_success: boolean;
  readonly prose: string;
}

/**
 * Ensures prose has >= 4 paragraphs for correct tension_14d quartile mapping.
 *
 * If prose has < 4 paragraphs, calls provider to reformat.
 * Max 1 retry. If retry fails, returns original prose with warning.
 *
 * @param prose - Generated prose to guard
 * @param provider - LLM provider for reformatting call
 * @param language - 'fr' | 'en'
 * @returns Guarded prose + traceability metadata
 */
export async function ensureParagraphCompliance(
  prose: string,
  provider: SovereignProvider,
  language: 'fr' | 'en' = 'fr',
): Promise<ParagraphGuardResult> {
  const originalCount = countParagraphs(prose);

  if (originalCount >= MIN_PARAGRAPHS) {
    return {
      original_count: originalCount,
      final_count: originalCount,
      retried: false,
      retry_success: false,
      prose,
    };
  }

  // Prose has < 4 paragraphs — attempt reformatting
  console.warn(`[PARAGRAPH-GUARD] Prose has ${originalCount} paragraphs (need ${MIN_PARAGRAPHS}). Attempting reformat...`);

  const reformatPrompt = language === 'fr'
    ? `Reformate ce texte en EXACTEMENT 4 paragraphes séparés par une ligne vide, sans modifier le contenu ni le style. Chaque paragraphe correspond à un quartile émotionnel (Q1, Q2, Q3, Q4). Conserve chaque mot, chaque image, chaque émotion — change UNIQUEMENT la structure en paragraphes.\n\nTexte à reformater :\n\n${prose}`
    : `Reformat this text into EXACTLY 4 paragraphs separated by blank lines, without modifying content or style. Each paragraph corresponds to an emotional quartile (Q1, Q2, Q3, Q4). Keep every word, every image, every emotion — change ONLY the paragraph structure.\n\nText to reformat:\n\n${prose}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const reformatted = await provider.generateDraft(
        reformatPrompt,
        'reformat_paragraphs',
        `guard_reformat_${attempt}`,
      );

      const newCount = countParagraphs(reformatted);

      if (newCount >= MIN_PARAGRAPHS) {
        console.log(`[PARAGRAPH-GUARD] Reformat SUCCESS: ${originalCount} → ${newCount} paragraphs`);
        return {
          original_count: originalCount,
          final_count: newCount,
          retried: true,
          retry_success: true,
          prose: reformatted,
        };
      }

      console.warn(`[PARAGRAPH-GUARD] Reformat attempt ${attempt + 1} still has ${newCount} paragraphs`);
    } catch (err) {
      console.error(`[PARAGRAPH-GUARD] Reformat attempt ${attempt + 1} FAILED:`, err);
    }
  }

  // All retries exhausted — return original prose
  console.warn(`[PARAGRAPH-GUARD] All retries exhausted. Continuing with ${originalCount} paragraphs.`);
  return {
    original_count: originalCount,
    final_count: originalCount,
    retried: true,
    retry_success: false,
    prose,
  };
}
