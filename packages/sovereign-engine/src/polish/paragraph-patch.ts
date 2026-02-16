/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PARAGRAPH-LEVEL PATCH (QUANTUM SUTURE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: polish/paragraph-patch.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.4)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-POL-01
 *
 * Purpose: Surgical paragraph-level correction with re-score guard.
 *
 * Concept (ex-Quantum Suture):
 * - Freeze all paragraphs except the target
 * - Rewrite ONLY the problematic paragraph
 * - Re-score entire prose
 * - Accept only if improvement without degradation (via reScoreGuard)
 *
 * Algorithm:
 * 1. Split prose into paragraphs (separator: \n\n)
 * 2. Validate paragraph_index is in bounds
 * 3. Freeze all paragraphs except target
 * 4. Build surgical prompt for target paragraph
 * 5. Call provider.rewriteSentence() to rewrite target paragraph
 * 6. Reconstruct prose with rewritten paragraph
 * 7. Call reScoreGuard() to verify improvement
 * 8. If accepted → return patched prose
 * 9. If rejected → return original prose
 *
 * Invariant ART-POL-01: Correction accepted ONLY if improvement without degradation.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import { reScoreGuard } from './re-score-guard.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of paragraph patch operation.
 *
 * @param patched_prose Prose after patch (original if rejected)
 * @param accepted True if patch was accepted (passed reScoreGuard)
 */
export interface ParagraphPatchResult {
  readonly patched_prose: string;
  readonly accepted: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Split prose into paragraphs.
 *
 * Uses \n\n as separator (standard paragraph delimiter).
 * Filters out empty paragraphs.
 *
 * @param prose Prose to split
 * @returns Array of paragraphs
 */
function splitParagraphs(prose: string): string[] {
  return prose
    .split('\n\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Join paragraphs back into prose.
 *
 * Uses \n\n as separator (standard paragraph delimiter).
 *
 * @param paragraphs Array of paragraphs
 * @returns Reconstructed prose
 */
function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join('\n\n');
}

/**
 * Apply surgical patch to a specific paragraph.
 *
 * Freezes all paragraphs except the target, rewrites only the target,
 * then validates with reScoreGuard. If validation fails, reverts to original.
 *
 * Algorithm:
 * 1. Split prose into paragraphs
 * 2. Validate paragraph_index
 * 3. Build context (prev, next paragraphs)
 * 4. Call provider to rewrite target paragraph
 * 5. Reconstruct prose
 * 6. Validate with reScoreGuard
 * 7. Accept or revert based on validation
 *
 * Physics prescription integration: If a prescription targets a segment_index,
 * use it as diagnosis. If not available, use provided diagnosis parameter.
 *
 * Invariant ART-POL-01: Correction accepted ONLY if reScoreGuard approves.
 *
 * @param prose Original prose
 * @param paragraph_index Index of paragraph to patch (0-indexed)
 * @param diagnosis Problem description (e.g., "weak emotion", "cliché")
 * @param action Correction action (e.g., "add sensory details")
 * @param packet ForgePacket containing constraints and context
 * @param provider SovereignProvider for LLM rewriting
 * @returns ParagraphPatchResult with patched prose and acceptance status
 */
export async function patchParagraph(
  prose: string,
  paragraph_index: number,
  diagnosis: string,
  action: string,
  packet: ForgePacket,
  provider: SovereignProvider,
): Promise<ParagraphPatchResult> {
  const paragraphs = splitParagraphs(prose);

  // Validate paragraph_index is in bounds
  if (paragraph_index < 0 || paragraph_index >= paragraphs.length) {
    return {
      patched_prose: prose,
      accepted: false,
    };
  }

  // Get target paragraph and context
  const target_paragraph = paragraphs[paragraph_index];
  const prev_paragraph =
    paragraph_index > 0 ? paragraphs[paragraph_index - 1] : '';
  const next_paragraph =
    paragraph_index < paragraphs.length - 1
      ? paragraphs[paragraph_index + 1]
      : '';

  // Build surgical prompt (embedded in reason for now, could be improved)
  const reason = `${diagnosis} | ACTION: ${action}`;

  // Call provider to rewrite target paragraph
  const rewritten_paragraph = await provider.rewriteSentence(
    target_paragraph,
    reason,
    { prev_sentence: prev_paragraph, next_sentence: next_paragraph },
  );

  // Reconstruct prose with rewritten paragraph
  const patched_paragraphs = [...paragraphs];
  patched_paragraphs[paragraph_index] = rewritten_paragraph;
  const patched_prose = joinParagraphs(patched_paragraphs);

  // Validate with reScoreGuard
  const guard_result = await reScoreGuard(
    prose,
    patched_prose,
    packet,
    provider,
  );

  // Accept or revert based on guard result
  if (guard_result.accepted) {
    return {
      patched_prose,
      accepted: true,
    };
  } else {
    // Rejected: return original prose
    return {
      patched_prose: prose,
      accepted: false,
    };
  }
}
