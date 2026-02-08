/**
 * OMEGA Phase Q — Deterministic Ablation Generator (Q-INV-02)
 *
 * Splits output into segments, generates ablation variants (one segment removed
 * at a time), evaluates which segments are necessary.
 *
 * Segment delimiter: double newline (\n\n) — deterministic, no NLP.
 */

import type { QAblationResult, QSegment } from './types.js';

/**
 * Split output into segments on double-newline boundaries.
 * Each segment is trimmed. Empty segments are excluded.
 */
export function segmentOutput(output: string): readonly QSegment[] {
  const parts = output.split('\n\n');
  const segments: QSegment[] = [];
  let index = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      segments.push({ index, content: trimmed });
      index++;
    }
  }

  return segments;
}

/**
 * Generate all single-segment ablations.
 * For N segments, produces N variants, each with one segment removed.
 */
export function generateAblations(
  segments: readonly QSegment[]
): readonly { readonly ablatedIndex: number; readonly remainingOutput: string }[] {
  const results: { ablatedIndex: number; remainingOutput: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const remaining = segments
      .filter((_, idx) => idx !== i)
      .map(s => s.content)
      .join('\n\n');
    results.push({ ablatedIndex: i, remainingOutput: remaining });
  }

  return results;
}

/**
 * Check which expected properties are present in the output.
 * Uses case-insensitive substring matching.
 */
function findPresentProperties(
  output: string,
  expectedProps: readonly string[]
): readonly string[] {
  const lowerOutput = output.toLowerCase();
  return expectedProps.filter(prop => lowerOutput.includes(prop.toLowerCase()));
}

/**
 * Evaluate necessity of a single ablation.
 * A segment is necessary if removing it causes at least one expected property to be lost.
 */
export function evaluateNecessity(
  originalOutput: string,
  ablation: { readonly ablatedIndex: number; readonly remainingOutput: string },
  expectedProps: readonly string[],
  segments: readonly QSegment[]
): QAblationResult {
  const originalProps = findPresentProperties(originalOutput, expectedProps);
  const remainingProps = findPresentProperties(ablation.remainingOutput, expectedProps);

  const preserved = remainingProps;
  const lost = originalProps.filter(p => !remainingProps.includes(p));
  const isNecessary = lost.length > 0;

  return {
    original_segments: segments,
    ablated_index: ablation.ablatedIndex,
    remaining_output: ablation.remainingOutput,
    properties_preserved: preserved,
    properties_lost: lost,
    is_necessary: isNecessary,
  };
}

/**
 * Check if the necessity ratio meets the configured threshold.
 *
 * @param results - Ablation results for all segments
 * @param minRatio - Minimum ratio of necessary segments (from config)
 * @returns Whether the output passes, the actual ratio, and which segments are unnecessary
 */
export function checkNecessityRatio(
  results: readonly QAblationResult[],
  minRatio: number
): { readonly passed: boolean; readonly ratio: number; readonly unnecessarySegments: readonly number[] } {
  if (results.length === 0) {
    return { passed: true, ratio: 1, unnecessarySegments: [] };
  }

  const necessaryCount = results.filter(r => r.is_necessary).length;
  const ratio = necessaryCount / results.length;
  const unnecessarySegments = results
    .filter(r => !r.is_necessary)
    .map(r => r.ablated_index);

  return {
    passed: ratio >= minRatio,
    ratio,
    unnecessarySegments,
  };
}
