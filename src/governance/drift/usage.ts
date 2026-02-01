/**
 * USAGE DRIFT DETECTOR
 * Phase E.2 — Sequence pattern detector
 *
 * INV-DRIFT-001: Read-only (observation only)
 * INV-DRIFT-002: Policy-driven thresholds (no hardcoded values)
 * INV-DRIFT-007: Detect repetition exceeding τ_max_repetitions
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type RunSequence = string[];

export type DriftObservation = {
  kind: 'schema' | 'pattern' | 'semantic_label' | 'usage_signature' | 'other';
  summary: string;
  details?: Record<string, unknown>;
};

export interface UsagePolicy {
  maxRepetitions: number;
  knownMisusePatterns: string[];
}

export interface AnalyzeUsageDriftArgs {
  sequences: RunSequence[];
  policy: { usage: UsagePolicy };
}

// ─────────────────────────────────────────────────────────────
// IMPLEMENTATION
// ─────────────────────────────────────────────────────────────

/**
 * Analyze usage drift in run sequences
 * INV-DRIFT-001: Read-only - does not modify any state
 * INV-DRIFT-002: Uses policy thresholds only
 */
export function analyzeUsageDrift(args: AnalyzeUsageDriftArgs): DriftObservation[] {
  const { sequences, policy } = args;
  const observations: DriftObservation[] = [];

  for (const seq of sequences) {
    // Skip empty sequences
    if (seq.length === 0) continue;

    // INV-DRIFT-007: Detect excessive repetitions
    const repetitionObservation = detectExcessiveRepetitions(seq, policy.usage.maxRepetitions);
    if (repetitionObservation) {
      observations.push(repetitionObservation);
    }

    // Detect known misuse patterns
    const misuseObservations = detectKnownMisusePatterns(seq, policy.usage.knownMisusePatterns);
    observations.push(...misuseObservations);
  }

  return observations;
}

/**
 * Detect excessive consecutive repetitions in sequence
 * Uses policy threshold (no hardcoded values)
 */
function detectExcessiveRepetitions(
  seq: RunSequence,
  maxRepetitions: number
): DriftObservation | null {
  let maxRep = 1;
  let currentRep = 1;

  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) {
      currentRep++;
      maxRep = Math.max(maxRep, currentRep);
    } else {
      currentRep = 1;
    }
  }

  if (maxRep > maxRepetitions) {
    return {
      kind: 'usage_signature',
      summary: `Usage drift: excessive repetition (${maxRep} > ${maxRepetitions})`,
      details: {
        max_repetitions: maxRep,
        threshold: maxRepetitions
      }
    };
  }

  return null;
}

/**
 * Detect known misuse patterns in sequence
 * Pattern format: "VERDICT:N+" means N or more occurrences of VERDICT
 */
function detectKnownMisusePatterns(
  seq: RunSequence,
  patterns: string[]
): DriftObservation[] {
  const observations: DriftObservation[] = [];

  for (const pattern of patterns) {
    const [verdict, countStr] = pattern.split(':');
    if (!verdict || !countStr) continue;

    const minCount = parseInt(countStr.replace('+', ''), 10);
    if (isNaN(minCount)) continue;

    const count = seq.filter((v) => v === verdict).length;

    if (count >= minCount) {
      observations.push({
        kind: 'usage_signature',
        summary: `Usage drift: known misuse pattern detected (${pattern})`,
        details: {
          pattern,
          count,
          threshold: minCount
        }
      });
    }
  }

  return observations;
}
