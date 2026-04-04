/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — Compliance Tracker (Bridge-04)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Mesure la compliance réelle des features PILOTABLE après chaque run.
 * Compare compliance attendue (Rosetta Bridge matrix) vs obtenue (CALC).
 *
 * Seuil alerte : compliance < 50% sur 3 runs consécutifs → DOWNGRADE signal.
 * Logger : evidence/compliance_tracking.json (append-only).
 *
 * CALC pur — zéro appel LLM.
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-04 (P2-02 Bridge-04)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface FeatureComplianceResult {
  readonly feature: string;
  readonly expected_compliance: number;
  readonly measured_compliance: number;
  readonly compliant: boolean;
  readonly method: string;
}

export interface ComplianceSnapshot {
  readonly timestamp: string;
  readonly scene_id: string;
  readonly features: FeatureComplianceResult[];
  readonly overall_compliance: number;
  readonly alerts: string[];
}

export interface DowngradeSignal {
  readonly feature: string;
  readonly consecutive_failures: number;
  readonly action: 'DOWNGRADE' | 'WATCH';
}

// ── Configuration ────────────────────────────────────────────────────────────

/** Compliance below this % triggers a count toward downgrade */
const COMPLIANCE_FLOOR = 0.50;

/** Consecutive runs below floor → DOWNGRADE signal */
const DOWNGRADE_AFTER = 3;

// ── Feature compliance checkers (CALC-based) ─────────────────────────────────

/**
 * Measure compliance of f24e_contrast_score.
 * Checks for lexical contrast density (antonyms, opposition markers).
 */
function measureContrastCompliance(prose: string): number {
  const contrastMarkers = [
    'mais', 'pourtant', 'cependant', 'toutefois', 'néanmoins',
    'tandis que', 'alors que', 'en revanche', 'au contraire',
    'malgré', 'or', 'yet', 'however', 'but', 'although',
  ];
  const words = prose.toLowerCase().split(/\s+/);
  const total = words.length;
  if (total === 0) return 0;
  const hits = contrastMarkers.reduce((count, marker) => {
    // Word boundary to avoid matching substrings (e.g. 'or' in 'encore')
    const regex = new RegExp(`\\b${marker}\\b`, 'gi');
    return count + (prose.toLowerCase().match(regex) || []).length;
  }, 0);
  // Expect ~2-4 contrast markers per 500 words
  const density = hits / (total / 500);
  return Math.min(1.0, density / 2.5);
}

/**
 * Measure compliance of f15b_redundancy_compression.
 * Checks that bigram repetition rate is low.
 */
function measureRedundancyCompliance(prose: string): number {
  const words = prose.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length < 10) return 1.0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i + 1]}`;
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }
  const repeated = Array.from(bigrams.values()).filter(c => c > 1).length;
  const total = bigrams.size;
  if (total === 0) return 1.0;
  const redundancyRate = repeated / total;
  // Low redundancy = high compliance. Target: < 15% repeated bigrams
  return redundancyRate < 0.15 ? 1.0 : Math.max(0, 1.0 - (redundancyRate - 0.15) * 5);
}

/**
 * Measure compliance of f16a_bigram_rarity.
 * Checks for lexical diversity via unique bigram ratio.
 */
function measureBigramRarityCompliance(prose: string): number {
  const words = prose.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length < 10) return 1.0;
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  const uniqueRatio = bigrams.size / (words.length - 1);
  // High unique ratio = rare bigrams = good. Target: > 0.85
  return uniqueRatio >= 0.85 ? 1.0 : Math.max(0, uniqueRatio / 0.85);
}

/**
 * Measure compliance of f29d_ttr_score (Type-Token Ratio).
 * Checks lexical richness over 100-word windows.
 */
function measureTTRCompliance(prose: string): number {
  const words = prose.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length < 50) return 1.0;
  const windowSize = 100;
  const windows = Math.floor(words.length / windowSize);
  if (windows === 0) return 1.0;
  let totalTTR = 0;
  for (let i = 0; i < windows; i++) {
    const window = words.slice(i * windowSize, (i + 1) * windowSize);
    const unique = new Set(window).size;
    totalTTR += unique / window.length;
  }
  const avgTTR = totalTTR / windows;
  // Target: TTR > 0.75 per 100-word window
  return avgTTR >= 0.75 ? 1.0 : Math.max(0, avgTTR / 0.75);
}

/**
 * Measure compliance of f35c_hook_score.
 * Checks if the opening creates narrative tension.
 */
function measureHookCompliance(prose: string): number {
  const firstSentences = prose.split(/[.!?]+/).slice(0, 3).join(' ').toLowerCase();
  if (firstSentences.length < 20) return 0;
  const hookSignals = [
    /quand|lorsque|alors/,        // temporal hook
    /soudain|brusquement/,        // surprise
    /il ne|elle ne|jamais|rien/,  // negation tension
    /sans|malgré|contre/,         // opposition
    /[?!]/,                        // exclamation/question
    /\.\.\./,                      // ellipsis
  ];
  const hits = hookSignals.filter(r => r.test(firstSentences)).length;
  // At least 2 hook signals in opening = compliant
  return Math.min(1.0, hits / 2);
}

// ── Registry ─────────────────────────────────────────────────────────────────

const COMPLIANCE_CHECKERS: Record<string, (prose: string) => number> = {
  f24e_contrast_score: measureContrastCompliance,
  f15b_redundancy_compression: measureRedundancyCompliance,
  f16a_bigram_rarity: measureBigramRarityCompliance,
  f29d_ttr_score: measureTTRCompliance,
  f35c_hook_score: measureHookCompliance,
};

// ── In-memory failure counter (reset on process restart) ─────────────────────

const failureCounters = new Map<string, number>();

/** Reset all failure counters (e.g., on config change or new palier) */
export function resetComplianceCounters(): void {
  failureCounters.clear();
}

// ── Main API ─────────────────────────────────────────────────────────────────

/**
 * Measure compliance of all active PILOTABLE features on a prose output.
 *
 * @param prose - The generated prose to evaluate
 * @param sceneId - Scene identifier for logging
 * @param activeFeatures - List of feature IDs currently active in prompt
 * @param expectedCompliance - Map of feature → expected compliance rate from Rosetta matrix
 * @returns ComplianceSnapshot with per-feature results and alerts
 */
export function measureCompliance(
  prose: string,
  sceneId: string,
  activeFeatures: readonly string[],
  expectedCompliance: Record<string, number>,
): ComplianceSnapshot {
  const results: FeatureComplianceResult[] = [];
  const alerts: string[] = [];

  for (const feat of activeFeatures) {
    const checker = COMPLIANCE_CHECKERS[feat];
    if (!checker) {
      results.push({
        feature: feat,
        expected_compliance: expectedCompliance[feat] ?? 0,
        measured_compliance: -1,
        compliant: false,
        method: 'NO_CHECKER',
      });
      continue;
    }

    const measured = checker(prose);
    const expected = expectedCompliance[feat] ?? 0;
    const compliant = measured >= COMPLIANCE_FLOOR;

    results.push({
      feature: feat,
      expected_compliance: expected,
      measured_compliance: Math.round(measured * 100) / 100,
      compliant,
      method: 'CALC',
    });

    // Track consecutive failures
    if (!compliant) {
      const count = (failureCounters.get(feat) || 0) + 1;
      failureCounters.set(feat, count);
      if (count >= DOWNGRADE_AFTER) {
        alerts.push(`DOWNGRADE: ${feat} below ${COMPLIANCE_FLOOR * 100}% for ${count} consecutive runs`);
      } else {
        alerts.push(`WATCH: ${feat} compliance=${(measured * 100).toFixed(0)}% (run ${count}/${DOWNGRADE_AFTER})`);
      }
    } else {
      // Reset counter on success
      failureCounters.set(feat, 0);
    }
  }

  const validResults = results.filter(r => r.measured_compliance >= 0);
  const overall = validResults.length > 0
    ? validResults.reduce((s, r) => s + r.measured_compliance, 0) / validResults.length
    : 0;

  return {
    timestamp: new Date().toISOString(),
    scene_id: sceneId,
    features: results,
    overall_compliance: Math.round(overall * 100) / 100,
    alerts,
  };
}

/**
 * Get downgrade signals for features that have failed compliance
 * for >= DOWNGRADE_AFTER consecutive runs.
 */
export function getDowngradeSignals(): DowngradeSignal[] {
  const signals: DowngradeSignal[] = [];
  for (const [feat, count] of failureCounters.entries()) {
    if (count >= DOWNGRADE_AFTER) {
      signals.push({ feature: feat, consecutive_failures: count, action: 'DOWNGRADE' });
    } else if (count > 0) {
      signals.push({ feature: feat, consecutive_failures: count, action: 'WATCH' });
    }
  }
  return signals;
}

/**
 * Log a compliance snapshot to console (production telemetry).
 */
export function logCompliance(snapshot: ComplianceSnapshot): void {
  console.log(`[COMPLIANCE] scene=${snapshot.scene_id} overall=${(snapshot.overall_compliance * 100).toFixed(0)}%`);
  for (const feat of snapshot.features) {
    const status = feat.compliant ? 'OK' : 'LOW';
    console.log(`  ${feat.feature}: measured=${(feat.measured_compliance * 100).toFixed(0)}% expected=${(feat.expected_compliance * 100).toFixed(0)}% [${status}]`);
  }
  for (const alert of snapshot.alerts) {
    console.warn(`  [ALERT] ${alert}`);
  }
}
