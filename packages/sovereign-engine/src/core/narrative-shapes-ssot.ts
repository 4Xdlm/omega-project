/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — NARRATIVE SHAPES SSOT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: core/narrative-shapes-ssot.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * INV-SHAPE-01: SSOT complet — 5 NarrativeShapes avec tous les champs requis
 * INV-SHAPE-02: Résolution automatique des conflits axe/shape
 * INV-SHAPE-03: GATE anti-contradiction pré-run (FAIL-CLOSED)
 *
 * Source: OMEGA_CONVERGENCE_W0_LOCKED — convergence 5/5 IA
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SHAPE-01: SSOT — 5 NarrativeShapes
// ═══════════════════════════════════════════════════════════════════════════════

export const NARRATIVE_SHAPES_SSOT = {
  ThreatReveal: {
    dominant_rule: 'DENSITY_OVER_ELLIPSIS',
    active_axes: ['densite_sensorielle', 'tension_14d', 'proprioception', 'ouie'],
    muted_axes: ['espace_negatif'],
    conflit_resolution_order: ['tension_14d', 'densite_sensorielle', 'espace_negatif'],
    target_curve: [0.30, 0.55, 0.85, 0.65] as [number, number, number, number],
  },
  Contemplative: {
    dominant_rule: 'ELLIPSIS_OVER_DENSITY',
    active_axes: ['espace_negatif', 'interiorite', 'vue'],
    muted_axes: ['densite_sensorielle'],
    conflit_resolution_order: ['espace_negatif', 'interiorite', 'densite_sensorielle'],
    target_curve: [0.50, 0.60, 0.70, 0.60] as [number, number, number, number],
  },
  SlowBurn: {
    dominant_rule: 'BALANCED',
    active_axes: ['espace_negatif', 'tension_14d', 'densite_sensorielle'],
    muted_axes: [],
    conflit_resolution_order: ['tension_14d', 'densite_sensorielle', 'espace_negatif'],
    target_curve: [0.40, 0.55, 0.70, 0.80] as [number, number, number, number],
  },
  Spiral: {
    dominant_rule: 'TENSION_DOMINANT',
    active_axes: ['tension_14d', 'densite_sensorielle'],
    muted_axes: ['espace_negatif'],
    conflit_resolution_order: ['tension_14d', 'densite_sensorielle', 'interiorite'],
    target_curve: [0.45, 0.70, 0.50, 0.80] as [number, number, number, number],
  },
  ColdOpening: {
    dominant_rule: 'DENSITY_OVER_ELLIPSIS',
    active_axes: ['densite_sensorielle', 'tension_14d', 'ouie'],
    muted_axes: ['espace_negatif', 'interiorite'],
    conflit_resolution_order: ['tension_14d', 'densite_sensorielle', 'interiorite'],
    target_curve: [0.60, 0.50, 0.75, 0.40] as [number, number, number, number],
  },
} as const;

export type NarrativeShapeKey = keyof typeof NARRATIVE_SHAPES_SSOT;

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SHAPE-02: Résolution automatique des conflits dans le PDB
// ═══════════════════════════════════════════════════════════════════════════════

export type AxisStatus = 'ACTIVE' | 'MUTED' | 'NEUTRAL';

/**
 * INV-SHAPE-02: Résoudre le statut d'un axe pour une shape donnée.
 * ACTIVE  → axe prioritaire, instructions autorisées
 * MUTED   → axe en conflit, résolution via conflit_resolution_order requis
 * NEUTRAL → axe non déclaré, instructions neutres permises
 */
export function resolveAxisConflict(
  axis: string,
  shape: NarrativeShapeKey,
): AxisStatus {
  const { active_axes, muted_axes } = NARRATIVE_SHAPES_SSOT[shape];

  if ((active_axes as readonly string[]).includes(axis)) return 'ACTIVE';
  if ((muted_axes as readonly string[]).includes(axis)) return 'MUTED';

  return 'NEUTRAL';
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-SHAPE-03: GATE anti-contradiction pré-run (ChatGPT v3)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContradictionValidationResult {
  readonly valid: boolean;
  readonly conflicts: readonly string[];
}

/**
 * INV-SHAPE-03: Scanner les instructions avant envoi LLM.
 * Si une instruction cible un axe MUTED et que cet axe est en dernière position
 * dans conflit_resolution_order → conflit résiduel → FAIL-CLOSED.
 *
 * Gate: validatePromptContradictions('ThreatReveal', ['densité', 'espace_negatif'])
 * → { valid: false, conflicts: ['[INV-SHAPE-03] ...'] }
 */
export function validatePromptContradictions(
  shape: NarrativeShapeKey,
  instructions: readonly string[],
): ContradictionValidationResult {
  const { muted_axes, conflit_resolution_order } = NARRATIVE_SHAPES_SSOT[shape];
  const conflicts: string[] = [];

  for (const inst of instructions) {
    const instNorm = inst.toLowerCase().replace(/_/g, ' ');

    for (const muted of muted_axes) {
      const mutedNorm = muted.toLowerCase().replace(/_/g, ' ');

      if (instNorm.includes(mutedNorm)) {
        const rank = (conflit_resolution_order as readonly string[]).indexOf(muted);
        const isLast = rank === conflit_resolution_order.length - 1;

        // Conflit résiduel: axe muted en dernière position = non résolvable automatiquement
        if (isLast || rank === -1) {
          conflicts.push(
            `[INV-SHAPE-03] Instruction cible axe muted '${muted}' pour shape '${shape}' (rank=${rank}, conflit non résolvable)`,
          );
        }
      }
    }
  }

  return { valid: conflicts.length === 0, conflicts };
}

/**
 * Overload strict: throw si conflit résiduel détecté (FAIL-CLOSED).
 * Utiliser pour gate pré-run obligatoire.
 */
export function assertNoPromptContradictions(
  shape: NarrativeShapeKey,
  instructions: readonly string[],
): void {
  const result = validatePromptContradictions(shape, instructions);
  if (!result.valid) {
    throw new Error(
      `[INV-SHAPE-03 VIOLATION] Contradictions résiduelles détectées:\n${result.conflicts.join('\n')}`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARDS — Shape validation
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_SHAPE_KEYS = new Set<string>(Object.keys(NARRATIVE_SHAPES_SSOT));

export function isValidShapeKey(key: string): key is NarrativeShapeKey {
  return VALID_SHAPE_KEYS.has(key);
}

/**
 * Throw si shape inconnue — fail-closed.
 */
export function assertValidShape(key: string): NarrativeShapeKey {
  if (!isValidShapeKey(key)) {
    throw new Error(
      `[INV-SHAPE-01 VIOLATION] NarrativeShape inconnue: '${key}'. Valides: ${[...VALID_SHAPE_KEYS].join(', ')}`,
    );
  }
  return key;
}
