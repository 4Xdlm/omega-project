/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — LINKER (AGENT CIMENT)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: assembly/linker.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * DEC-20260325-001 Fractal Assembly:
 *   Briques = unités SCELLÉES (SHA-256, prose immutable)
 *   Ciment = transitions 50-150w entre briques
 *   Le Linker génère des transitions invisibles style Flaubert.
 *
 * Contraintes:
 *   - Ne JAMAIS réécrire les briques
 *   - Ne JAMAIS ouvrir/fermer un arc narratif
 *   - 50-150 mots, pas de transition mécanique
 *   - Budget: 1-3 API calls par transition
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { SovereignProvider } from '../types.js';

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface LinkRequest {
  readonly brick_A_ending: string;
  readonly brick_B_opening: string;
  readonly brick_A_emotion: string;
  readonly brick_B_emotion: string;
  readonly scene_context: string;
  readonly language: 'fr' | 'en';
}

export interface LinkResult {
  readonly cement: string;
  readonly words: number;
  readonly hash: string;
  readonly api_calls: number;
}

// ── Prompt ───────────────────────────────────────────────────────────────────

const LINKER_SYSTEM = `Tu es un artisan de la couture narrative.
Ta mission : écrire une TRANSITION entre deux passages de prose littéraire française.

RÈGLES ABSOLUES :
- Entre 50 et 150 mots
- Tu NE RÉPÈTES rien des deux passages fournis
- Tu NE RÉSUMES PAS ce qui précède ou ce qui suit
- Tu fais SENTIR le passage d'une émotion à une autre
- Ton style est celui de Flaubert : périodes amples, respiration maîtrisée
- Pas de phrases télégraphiques — chaque phrase est complète
- Pas de transitions mécaniques ("Puis...", "Ensuite...", "Alors...")
- La couture doit être INVISIBLE — le lecteur ne doit jamais sentir qu'il change de brique

RÉFÉRENCES DE CALIBRATION :
- Un chapitre de Madame Bovary où Flaubert passe de la description du paysage
  à l'intériorité d'Emma = transition invisible de 2-3 phrases
- Le rythme de transition doit RESPIRER, pas précipiter`;

// ── Mechanical transition patterns ───────────────────────────────────────────

const MECHANICAL_STARTS = [
  /^puis\b/i,
  /^ensuite\b/i,
  /^alors\b/i,
  /^après\b/i,
  /^soudain\b/i,
  /^tout à coup\b/i,
  /^c'est alors\b/i,
  /^un moment plus tard\b/i,
];

// ── Validation ───────────────────────────────────────────────────────────────

export interface CementValidation {
  readonly valid: boolean;
  readonly words: number;
  readonly errors: readonly string[];
}

export function validateCement(
  cement: string,
  brickAEnding: string,
  brickBOpening: string,
): CementValidation {
  const errors: string[] = [];
  const words = cement.split(/\s+/).filter(w => w.length > 0).length;

  if (words < 50) errors.push(`Too short: ${words}w (min 50)`);
  if (words > 150) errors.push(`Too long: ${words}w (max 150)`);

  // Check overlap with brick A
  const aSentences = brickAEnding.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  for (const s of aSentences) {
    if (cement.includes(s)) {
      errors.push(`Repeats content from brick A: "${s.slice(0, 40)}..."`);
    }
  }

  // Check overlap with brick B
  const bSentences = brickBOpening.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  for (const s of bSentences) {
    if (cement.includes(s)) {
      errors.push(`Repeats content from brick B: "${s.slice(0, 40)}..."`);
    }
  }

  // Check mechanical transitions
  const cementSentences = cement.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  for (const s of cementSentences) {
    for (const pattern of MECHANICAL_STARTS) {
      if (pattern.test(s)) {
        errors.push(`Mechanical transition: "${s.slice(0, 30)}..."`);
      }
    }
  }

  return { valid: errors.length === 0, words, errors };
}

// ── Linker ───────────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;

export async function link(
  request: LinkRequest,
  provider: SovereignProvider,
): Promise<LinkResult> {
  const userPrompt = `CONTEXTE : ${request.scene_context}

FIN DU PASSAGE A (émotion : ${request.brick_A_emotion}) :
${request.brick_A_ending}

DÉBUT DU PASSAGE B (émotion : ${request.brick_B_emotion}) :
${request.brick_B_opening}

Écris UNIQUEMENT la transition (50-150 mots). Rien d'autre.`;

  let bestCement: string | null = null;
  let bestWords = 0;
  let apiCalls = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const seed = attempt === 0 ? 'linker_v1' : `linker_v1_retry${attempt}`;
    const cement = await provider.generateDraft(LINKER_SYSTEM + '\n\n' + userPrompt, 'linker', seed);
    apiCalls++;

    const validation = validateCement(cement, request.brick_A_ending, request.brick_B_opening);

    if (validation.valid) {
      return {
        cement,
        words: validation.words,
        hash: sha256(canonicalize({ cement, version: 'linker_v1' })),
        api_calls: apiCalls,
      };
    }

    console.log(`[LINKER] Attempt ${attempt + 1}: ${validation.errors.join(', ')}`);

    // Keep the best attempt for fail-open
    if (!bestCement || Math.abs(validation.words - 100) < Math.abs(bestWords - 100)) {
      bestCement = cement;
      bestWords = validation.words;
    }
  }

  // Fail-open: use best attempt
  console.log(`[LINKER] FAIL-OPEN: using best attempt (${bestWords}w)`);
  return {
    cement: bestCement!,
    words: bestWords,
    hash: sha256(canonicalize({ cement: bestCement!, version: 'linker_v1' })),
    api_calls: apiCalls,
  };
}

// ── Chapter assembly ─────────────────────────────────────────────────────────

export interface ChapterAssemblyResult {
  readonly chapter: string;
  readonly total_words: number;
  readonly brick_count: number;
  readonly cement_count: number;
  readonly cements: readonly LinkResult[];
}

export function assembleChapter(
  bricks: readonly string[],
  cements: readonly LinkResult[],
): ChapterAssemblyResult {
  if (bricks.length === 0) throw new Error('No bricks to assemble');
  if (cements.length !== bricks.length - 1) {
    throw new Error(`Expected ${bricks.length - 1} cements, got ${cements.length}`);
  }

  const parts: string[] = [];
  for (let i = 0; i < bricks.length; i++) {
    parts.push(bricks[i]);
    if (i < cements.length) {
      parts.push(cements[i].cement);
    }
  }

  const chapter = parts.join('\n\n');
  const total_words = chapter.split(/\s+/).filter(w => w.length > 0).length;

  return {
    chapter,
    total_words,
    brick_count: bricks.length,
    cement_count: cements.length,
    cements,
  };
}
