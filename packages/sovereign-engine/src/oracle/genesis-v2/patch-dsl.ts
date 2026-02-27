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
  | 'KEEP_CANON'
  | 'PARADOX_CLEANUP';  // Supprime les mots du forbidden_lexicon — déclenché par paradox gate, non lié à un axe

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

// ── PATCH INSTRUCTIONS ──────────────────────────────────────────────────────

const PATCH_INSTRUCTIONS: Record<PatchKind, string> = {
  TENSION_RATCHET: 'Renforce la tension narrative en dilatant le temps face à l\'irréversible. Ajoute des détails physiques précis qui incarnent l\'imminence sans nommer l\'émotion.',
  SIGNATURE_ANCHOR: 'Ancre la voix signature de l\'auteur: lexique spécifique, rythme caractéristique, tics syntaxiques identifiables.',
  NECESSITY_COMPRESS: 'Comprime la prose: supprime adverbes superflus, redondances, remplissage. Chaque mot doit porter du poids narratif.',
  SENSORY_DENSITY: 'Augmente la densité sensorielle: ajoute des détails concrets (vue, ouïe, toucher, odorat) intégrés organiquement dans l\'action.',
  RHYTHM_BREAK: 'Casse le rythme monotone: alterne phrases courtes et longues, introduis des ruptures syntaxiques surprenantes.',
  ANTICLICHE_SUBVERT: 'Remplace les images usées par des formulations inattendues. Évite les métaphores mortes et les associations automatiques.',
  INTERIOR_SURFACE: 'Renforce l\'intériorité du personnage: pensées non-dites, perceptions subjectives, écart entre le dit et le ressenti.',
  SCENE_CONSTRAINT_LOCK: 'Verrouille la cohérence émotionnelle de la scène: transitions douces entre états, pas de sauts affectifs brutaux.',
  SUBTEXT_INVERSION: 'Inverse le sous-texte: fais dire le contraire de ce que le personnage pense, ou montre l\'opposé de ce qu\'il ressent.',
  KEEP_CANON: 'Aucune modification — la prose est canonique sur cet axe.',
  PARADOX_CLEANUP: 'Identifie et remplace UNIQUEMENT les mots ou lemmes interdits dans la prose. Réécris les phrases contenant ces mots avec un vocabulaire alternatif non-trivial. Ne modifie aucune autre partie du texte. Conserve le rythme, la structure, l\'originalité du reste.',
};

export function getPatchInstruction(kind: PatchKind): string {
  return PATCH_INSTRUCTIONS[kind];
}
