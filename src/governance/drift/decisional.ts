/**
 * DECISIONAL DRIFT DETECTOR
 * Phase E.2 — Verdict distribution analyzer
 *
 * INV-DRIFT-001: Read-only (observation only)
 * INV-DRIFT-002: Policy-driven thresholds (no hardcoded values)
 * INV-DRIFT-006: Detect new verdict categories when policy forbids
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type VerdictDistribution = Record<string, number>;

export type DriftObservation = {
  kind: 'schema' | 'pattern' | 'semantic_label' | 'usage_signature' | 'other';
  summary: string;
  details?: Record<string, unknown>;
};

export interface DecisionalPolicy {
  allowNewCategories: boolean;
  maxRatioShift?: number;
}

export interface AnalyzeDecisionalDriftArgs {
  baselineDistribution: VerdictDistribution;
  currentDistribution: VerdictDistribution;
  policy: { decisional: DecisionalPolicy };
}

// ─────────────────────────────────────────────────────────────
// IMPLEMENTATION
// ─────────────────────────────────────────────────────────────

/**
 * Analyze decisional drift between baseline and current verdict distributions
 * INV-DRIFT-001: Read-only - does not modify any state
 * INV-DRIFT-002: Uses policy thresholds only
 */
export function analyzeDecisionalDrift(args: AnalyzeDecisionalDriftArgs): DriftObservation[] {
  const { baselineDistribution, currentDistribution, policy } = args;
  const observations: DriftObservation[] = [];

  // INV-DRIFT-006: Detect new verdict categories
  // A category is "new" if it has count > 0 in current but was absent or had count 0 in baseline
  if (!policy.decisional.allowNewCategories) {
    const baselineNonZero = new Set(
      Object.keys(baselineDistribution).filter((k) => baselineDistribution[k] > 0)
    );
    const currentKeys = Object.keys(currentDistribution);
    const newCategories = currentKeys.filter(
      (k) => !baselineNonZero.has(k) && currentDistribution[k] > 0
    );

    if (newCategories.length > 0) {
      observations.push({
        kind: 'pattern',
        summary: 'Decisional drift: new verdict category detected',
        details: { new_categories: newCategories.sort() }
      });
    }
  }

  // Detect significant ratio shifts (if threshold provided in policy)
  if (policy.decisional.maxRatioShift !== undefined) {
    const ratioShifts = detectRatioShifts(
      baselineDistribution,
      currentDistribution,
      policy.decisional.maxRatioShift
    );

    if (ratioShifts.length > 0) {
      observations.push({
        kind: 'pattern',
        summary: 'Decisional drift: significant ratio shift detected',
        details: { shifts: ratioShifts }
      });
    }
  }

  return observations;
}

/**
 * Detect significant ratio shifts between distributions
 * Uses policy threshold (no hardcoded values)
 */
function detectRatioShifts(
  baseline: VerdictDistribution,
  current: VerdictDistribution,
  maxShift: number
): Array<{ category: string; baselineRatio: number; currentRatio: number; shift: number }> {
  const shifts: Array<{
    category: string;
    baselineRatio: number;
    currentRatio: number;
    shift: number;
  }> = [];

  const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
  const currentTotal = Object.values(current).reduce((a, b) => a + b, 0);

  if (baselineTotal === 0 || currentTotal === 0) {
    return shifts;
  }

  // Get all categories from both distributions
  const allCategories = new Set([...Object.keys(baseline), ...Object.keys(current)]);

  for (const category of allCategories) {
    const baselineCount = baseline[category] || 0;
    const currentCount = current[category] || 0;

    const baselineRatio = baselineCount / baselineTotal;
    const currentRatio = currentCount / currentTotal;
    const shift = Math.abs(currentRatio - baselineRatio);

    if (shift > maxShift) {
      shifts.push({
        category,
        baselineRatio: Math.round(baselineRatio * 1000) / 1000,
        currentRatio: Math.round(currentRatio * 1000) / 1000,
        shift: Math.round(shift * 1000) / 1000
      });
    }
  }

  return shifts;
}
