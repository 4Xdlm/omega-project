/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — FORENSIC ROLLBACK TYPES + LOGGER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: core/forensic-types.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * INV-FORENSIC-01: Chaque run_report contient:
 *   rollback_trigger_axes[], delta_by_axis{axis: before/after/delta},
 *   judge_latency_ms, cache_hit.
 *   FAIL si champs manquants.
 *
 * Source: OMEGA_CONVERGENCE_W0_LOCKED — Gemini v2 (doc 6) — convergence 5/5 IA
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INV-FORENSIC-01 — TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForensicAxisDelta {
  readonly axis: string;
  readonly score_before: number;
  readonly score_after: number;
  readonly delta: number;
}

export interface ForensicRollbackEntry {
  readonly pass_index: number;
  readonly delta_composite: number;
  readonly trigger_axes: readonly ForensicAxisDelta[];
  readonly judge_latency_ms: number;
  readonly cache_hit: boolean;
}

export interface ForensicData {
  readonly rollback_count: number;
  readonly rollbacks: readonly ForensicRollbackEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-FORENSIC-01 — LOGGER / BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un ForensicData vide — état initial avant tout run.
 */
export function createEmptyForensicData(): { rollback_count: number; rollbacks: ForensicRollbackEntry[] } {
  return {
    rollback_count: 0,
    rollbacks: [],
  };
}

/**
 * Enregistre un rollback dans forensic_data.
 *
 * INV-FORENSIC-01: trigger_axes est peuplé avec les axes dont delta < 0.
 * Isole les axes coupables du rollback.
 */
export function recordForensicRollback(
  forensicData: { rollback_count: number; rollbacks: ForensicRollbackEntry[] },
  params: {
    pass_index: number;
    scores_before: Record<string, number>;
    scores_after: Record<string, number>;
    composite_before: number;
    composite_after: number;
    judge_latency_ms: number;
    cache_hit: boolean;
  },
): void {
  const { pass_index, scores_before, scores_after, composite_before, composite_after, judge_latency_ms, cache_hit } = params;

  // Isoler les axes coupables: delta < 0
  const triggerAxes: ForensicAxisDelta[] = (Object.keys(scores_after) as string[])
    .map((axis) => ({
      axis,
      score_before: scores_before[axis] ?? 0,
      score_after: scores_after[axis] ?? 0,
      delta: (scores_after[axis] ?? 0) - (scores_before[axis] ?? 0),
    }))
    .filter((a) => a.delta < 0);

  const entry: ForensicRollbackEntry = {
    pass_index,
    delta_composite: composite_after - composite_before,
    trigger_axes: triggerAxes,
    judge_latency_ms,
    cache_hit,
  };

  forensicData.rollbacks = [...forensicData.rollbacks, entry];
  forensicData.rollback_count = forensicData.rollbacks.length;
}

/**
 * INV-FORENSIC-01 guard: valide qu'un ForensicData est complet.
 * FAIL si champs manquants ou structure invalide.
 */
export function validateForensicData(data: unknown): asserts data is ForensicData {
  if (!data || typeof data !== 'object') {
    throw new Error('[INV-FORENSIC-01] forensic_data manquant ou invalide');
  }
  const d = data as Record<string, unknown>;

  if (typeof d['rollback_count'] !== 'number') {
    throw new Error('[INV-FORENSIC-01] forensic_data.rollback_count manquant');
  }
  if (!Array.isArray(d['rollbacks'])) {
    throw new Error('[INV-FORENSIC-01] forensic_data.rollbacks manquant');
  }

  for (const entry of d['rollbacks'] as unknown[]) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('[INV-FORENSIC-01] rollback entry invalide');
    }
    const e = entry as Record<string, unknown>;
    if (typeof e['pass_index'] !== 'number') {
      throw new Error('[INV-FORENSIC-01] rollback entry.pass_index manquant');
    }
    if (typeof e['delta_composite'] !== 'number') {
      throw new Error('[INV-FORENSIC-01] rollback entry.delta_composite manquant');
    }
    if (!Array.isArray(e['trigger_axes'])) {
      throw new Error('[INV-FORENSIC-01] rollback entry.trigger_axes manquant');
    }
    if (typeof e['judge_latency_ms'] !== 'number') {
      throw new Error('[INV-FORENSIC-01] rollback entry.judge_latency_ms manquant');
    }
    if (typeof e['cache_hit'] !== 'boolean') {
      throw new Error('[INV-FORENSIC-01] rollback entry.cache_hit manquant');
    }
  }
}

/**
 * Détecte si un candidat score représente un rollback (régression composite).
 * Retourne true si candidateComposite < currentComposite.
 */
export function isRollback(currentComposite: number, candidateComposite: number): boolean {
  return candidateComposite < currentComposite;
}
