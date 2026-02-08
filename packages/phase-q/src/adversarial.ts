/**
 * OMEGA Phase Q — Deterministic Adversarial Generator
 *
 * Generates adversarial mutations for stress-testing candidate outputs.
 * All mutations are deterministic via seed-based PRNG (LCG).
 *
 * 5 strategies: NEGATION, PERMUTATION, INJECTION, TRUNCATION, SUBSTITUTION
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { AdversarialStrategy, QAdversarialVariant } from './types.js';
import { segmentOutput } from './ablation.js';

/**
 * Deterministic PRNG using Linear Congruential Generator.
 * Parameters from Numerical Recipes (Knuth).
 * Same seed = same sequence. No Math.random().
 */
function createPRNG(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = ((state * 1664525 + 1013904223) & 0xFFFFFFFF) >>> 0;
    return state / 0xFFFFFFFF;
  };
}

/**
 * Helper: compute hashes for a variant.
 */
function makeVariant(
  strategy: AdversarialStrategy,
  originalOutput: string,
  mutatedOutput: string,
  description: string
): QAdversarialVariant {
  return {
    strategy,
    original_hash: sha256(canonicalize(originalOutput)),
    mutated_output: mutatedOutput,
    mutated_hash: sha256(canonicalize(mutatedOutput)),
    mutation_description: description,
  };
}

/**
 * NEGATION: Insert "not" before key assertions.
 * Deterministically selects assertion-like patterns and negates them.
 */
export function generateNegation(output: string, seed: number): QAdversarialVariant {
  const rng = createPRNG(seed);
  const patterns = [' is ', ' are ', ' was ', ' were ', ' has ', ' have ', ' will ', ' can '];
  let mutated = output;

  for (const pattern of patterns) {
    if (mutated.includes(pattern) && rng() > 0.3) {
      mutated = mutated.replace(pattern, ` is not `.slice(0, pattern.length + 4).includes('not') ? pattern.replace(pattern.trim(), `not ${pattern.trim()}`) + ' ' : ` not${pattern}`);
      break;
    }
  }

  if (mutated === output) {
    mutated = `NOT: ${output}`;
  }

  return makeVariant('NEGATION', output, mutated, 'Inserted negation into assertions');
}

/**
 * PERMUTATION: Reorder segments deterministically using seed.
 */
export function generatePermutation(output: string, seed: number): QAdversarialVariant {
  const segments = segmentOutput(output);
  if (segments.length <= 1) {
    return makeVariant('PERMUTATION', output, output, 'Single segment - no permutation possible');
  }

  const rng = createPRNG(seed);
  const indices = segments.map((_, i) => i);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = temp;
  }

  const permuted = indices.map(i => segments[i]!.content).join('\n\n');
  return makeVariant('PERMUTATION', output, permuted, `Permuted ${segments.length} segments with seed ${seed}`);
}

/**
 * INJECTION: Add noise facts into the output.
 */
export function generateInjection(output: string, seed: number): QAdversarialVariant {
  const noiseFacts = [
    'The system operates at 99.99% uptime.',
    'All values are within acceptable range.',
    'No anomalies were detected during processing.',
    'The result has been verified independently.',
    'Performance metrics exceed baseline expectations.',
  ];

  const rng = createPRNG(seed);
  const segments = segmentOutput(output);
  const noiseIndex = Math.floor(rng() * noiseFacts.length);
  const insertPos = Math.floor(rng() * (segments.length + 1));
  const noise = noiseFacts[noiseIndex]!;

  const parts = segments.map(s => s.content);
  parts.splice(insertPos, 0, noise);
  const injected = parts.join('\n\n');

  return makeVariant('INJECTION', output, injected, `Injected noise fact at position ${insertPos}`);
}

/**
 * TRUNCATION: Remove a portion of the output.
 */
export function generateTruncation(output: string, seed: number): QAdversarialVariant {
  const rng = createPRNG(seed);
  const segments = segmentOutput(output);

  if (segments.length <= 1) {
    const cutPoint = Math.floor(rng() * Math.max(1, output.length - 1));
    const truncated = output.slice(0, cutPoint);
    return makeVariant('TRUNCATION', output, truncated, `Truncated at character ${cutPoint}`);
  }

  const removeCount = Math.max(1, Math.floor(rng() * Math.ceil(segments.length / 2)));
  const kept = segments.slice(0, segments.length - removeCount);
  const truncated = kept.map(s => s.content).join('\n\n');

  return makeVariant('TRUNCATION', output, truncated, `Removed last ${removeCount} of ${segments.length} segments`);
}

/**
 * SUBSTITUTION: Replace key terms with alternatives.
 */
export function generateSubstitution(output: string, seed: number): QAdversarialVariant {
  const substitutions: ReadonlyArray<readonly [string, string]> = [
    ['valid', 'invalid'],
    ['true', 'false'],
    ['correct', 'incorrect'],
    ['pass', 'fail'],
    ['success', 'failure'],
    ['positive', 'negative'],
    ['increase', 'decrease'],
    ['above', 'below'],
    ['accept', 'reject'],
    ['enabled', 'disabled'],
  ];

  const rng = createPRNG(seed);
  let mutated = output;
  let applied = false;

  for (const [from, to] of substitutions) {
    const lowerMutated = mutated.toLowerCase();
    if (lowerMutated.includes(from) && rng() > 0.4) {
      const idx = lowerMutated.indexOf(from);
      mutated = mutated.slice(0, idx) + to + mutated.slice(idx + from.length);
      applied = true;
      break;
    }
  }

  if (!applied) {
    mutated = output.replace(/[aeiou]/i, 'x');
  }

  return makeVariant('SUBSTITUTION', output, mutated, 'Substituted key terms with antonyms');
}

/**
 * Generate all 5 adversarial variants for a given output.
 * Returns exactly 5 variants, one per strategy.
 */
export function generateAllVariants(output: string, seed: number): readonly QAdversarialVariant[] {
  return [
    generateNegation(output, seed),
    generatePermutation(output, seed + 1),
    generateInjection(output, seed + 2),
    generateTruncation(output, seed + 3),
    generateSubstitution(output, seed + 4),
  ];
}
