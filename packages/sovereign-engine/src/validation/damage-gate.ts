/**
 * validation/damage-gate.ts — Sprint P3 : Cross-Axis Damage Gate
 * V-PARTITION v3.0.0
 *
 * Prevents polish transformations from degrading axes beyond thresholds.
 * Compares MacroAxesScores before/after and flags regressions.
 *
 * INV-DG-01 : evaluateDamage() detects drop > threshold on any axis
 * INV-DG-02 : REJECT mode blocks, WARN mode flags
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { MacroAxesScores } from '../oracle/macro-axes.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DamageGateConfig {
  /** Max drop tolerated per axis before flagging */
  readonly thresholds: {
    readonly ecc: number;  // default 2
    readonly rci: number;  // default 2
    readonly sii: number;  // default 2
    readonly ifi: number;  // default 2
    readonly aai: number;  // default 1.5
  };
  /** WARN = log + continue, REJECT = throw */
  readonly mode: 'WARN' | 'REJECT';
}

export interface AxisDamage {
  readonly axis: string;
  readonly before: number;
  readonly after: number;
  readonly drop: number;
  readonly threshold: number;
  readonly exceeded: boolean;
}

export interface DamageGateResult {
  readonly damages: readonly AxisDamage[];
  readonly any_exceeded: boolean;
  readonly max_drop: number;
  readonly verdict: 'PASS' | 'WARN' | 'REJECT';
  readonly warnings: readonly string[];
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_DAMAGE_THRESHOLDS: DamageGateConfig['thresholds'] = {
  ecc: 2,
  rci: 2,
  sii: 2,
  ifi: 2,
  aai: 1.5,
};

export function getDamageGateMode(): 'WARN' | 'REJECT' {
  return process.env.OMEGA_DAMAGE_GATE_MODE === 'REJECT' ? 'REJECT' : 'WARN';
}

export function getDefaultDamageGateConfig(): DamageGateConfig {
  return {
    thresholds: DEFAULT_DAMAGE_THRESHOLDS,
    mode: getDamageGateMode(),
  };
}

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Evaluates damage between pre-polish and post-polish MacroAxesScores.
 *
 * INV-DG-01: detects any axis drop exceeding its threshold
 * INV-DG-02: returns REJECT verdict in REJECT mode, WARN in WARN mode
 */
export function evaluateDamage(
  before: MacroAxesScores,
  after: MacroAxesScores,
  config?: Partial<DamageGateConfig>,
): DamageGateResult {
  const thresholds = config?.thresholds ?? DEFAULT_DAMAGE_THRESHOLDS;
  const mode = config?.mode ?? getDamageGateMode();

  const axes: Array<{ key: keyof MacroAxesScores; threshold: number }> = [
    { key: 'ecc', threshold: thresholds.ecc },
    { key: 'rci', threshold: thresholds.rci },
    { key: 'sii', threshold: thresholds.sii },
    { key: 'ifi', threshold: thresholds.ifi },
    { key: 'aai', threshold: thresholds.aai },
  ];

  const damages: AxisDamage[] = [];
  const warnings: string[] = [];

  for (const { key, threshold } of axes) {
    const scoreBefore = before[key].score;
    const scoreAfter = after[key].score;
    const drop = scoreBefore - scoreAfter;
    const exceeded = drop > threshold;

    damages.push({
      axis: key.toUpperCase(),
      before: scoreBefore,
      after: scoreAfter,
      drop,
      threshold,
      exceeded,
    });

    if (exceeded) {
      warnings.push(
        `${key.toUpperCase()} dropped ${drop.toFixed(1)} (${scoreBefore}→${scoreAfter}), threshold=${threshold}`,
      );
    }
  }

  const anyExceeded = damages.some(d => d.exceeded);
  const maxDrop = Math.max(0, ...damages.map(d => d.drop));

  let verdict: 'PASS' | 'WARN' | 'REJECT';
  if (!anyExceeded) {
    verdict = 'PASS';
  } else if (mode === 'REJECT') {
    verdict = 'REJECT';
  } else {
    verdict = 'WARN';
  }

  return {
    damages,
    any_exceeded: anyExceeded,
    max_drop: Math.round(maxDrop * 10) / 10,
    verdict,
    warnings,
  };
}

/**
 * DamageGateError — thrown in REJECT mode when damage exceeds thresholds.
 */
export class DamageGateError extends Error {
  constructor(
    public readonly result: DamageGateResult,
  ) {
    super(`DAMAGE_GATE_REJECT: ${result.warnings.join('; ')}`);
    this.name = 'DamageGateError';
  }
}

/**
 * Convenience: evaluate + throw if REJECT mode and damage detected.
 */
export function enforceDamageGate(
  before: MacroAxesScores,
  after: MacroAxesScores,
  config?: Partial<DamageGateConfig>,
): DamageGateResult {
  const result = evaluateDamage(before, after, config);
  if (result.verdict === 'REJECT') {
    throw new DamageGateError(result);
  }
  return result;
}
