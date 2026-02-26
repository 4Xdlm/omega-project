// src/oracle/genesis-v2/patch-dsl.ts
// 10 kinds de patch couvrant les 14 axes — Diffusion Runner (W3b)
// PatchDSL: types + constants + scheduler config

export type PatchKind =
  | 'TENSION_RATCHET'
  | 'SIGNATURE_ANCHOR'
  | 'NECESSITY_COMPRESS'
  | 'SENSORY_DENSITY'
  | 'RHYTHM_BREAK'
  | 'ANTICLICHE_SUBVERT'
  | 'INTERIOR_SURFACE'
  | 'SCENE_CONSTRAINT_LOCK'
  | 'SUBTEXT_INVERSION'
  | 'KEEP_CANON';

export interface PatchConfig {
  readonly kind: PatchKind;
  readonly target_quartile: 1 | 2 | 3 | 4 | 'all';
  readonly max_tokens_modified: number;
  readonly no_regress_axes: readonly string[];
  readonly epsilon: number;
}

// Mapping axis → patch kind (pour worst-2 scheduler W3b)
export const AXIS_TO_PATCH: Readonly<Record<string, PatchKind>> = {
  'tension_14d':           'TENSION_RATCHET',
  'signature':             'SIGNATURE_ANCHOR',
  'necessite_m8':          'NECESSITY_COMPRESS',
  'densite_sensorielle':   'SENSORY_DENSITY',
  'rythme_musical':        'RHYTHM_BREAK',
  'anti_cliche':           'ANTICLICHE_SUBVERT',
  'interiorite':           'INTERIOR_SURFACE',
  'coherence_emotionnelle': 'SCENE_CONSTRAINT_LOCK',
} as const;

// Pareto gate: Δ(worst1) + Δ(worst2) >= seuil configurable
export const PARETO_MIN_GAIN = parseFloat(process.env.PARETO_MIN_GAIN ?? '0.05');
export const REGRESS_EPSILON = parseFloat(process.env.REGRESS_EPSILON ?? '0.02');
export const MAX_DIFFUSION_STEPS = parseInt(process.env.MAX_DIFFUSION_STEPS ?? '4', 10);
