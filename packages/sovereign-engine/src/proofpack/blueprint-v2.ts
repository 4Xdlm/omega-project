/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — BLUEPRINT V2 (SSOT Architecture Documentation)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: proofpack/blueprint-v2.ts
 * Sprint: 19.2
 * Invariant: ART-PROOF-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Single Source of Truth for the complete ART architecture.
 * Machine-readable blueprint of all modules, axes, and data flow.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AxisDefinition {
  readonly name: string;
  readonly label_fr: string;
  readonly method: 'CALC' | 'LLM' | 'HYBRID';
  readonly weight: number;
  readonly macro_axe: string;
  readonly sprint_introduced: number;
  readonly description: string;
}

export interface MacroAxisDefinition {
  readonly name: string;
  readonly label_fr: string;
  readonly sub_axes: readonly string[];
  readonly weight_in_composite: number;
  readonly description: string;
}

export interface DataFlowStep {
  readonly step: number;
  readonly module: string;
  readonly input: string;
  readonly output: string;
  readonly method: 'CALC' | 'LLM' | 'HYBRID';
}

export interface BlueprintV2 {
  readonly version: '2.0';
  readonly generated_at: string;
  readonly axes: readonly AxisDefinition[];
  readonly macro_axes: readonly MacroAxisDefinition[];
  readonly pipeline: readonly DataFlowStep[];
  readonly scoring: ScoringConfig;
}

export interface ScoringConfig {
  readonly sovereign_threshold: number;
  readonly axis_floor: number;
  readonly reject_below: number;
  readonly emotion_weight_pct: number;
  readonly total_axes: number;
  readonly total_macro_axes: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS DEFINITIONS — ALL 16+ AXES
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_AXES: readonly AxisDefinition[] = [
  // ECC sub-axes
  { name: 'tension_14d', label_fr: 'Tension 14D', method: 'CALC', weight: 3.0, macro_axe: 'ECC', sprint_introduced: 0, description: 'Conformité courbe émotionnelle 14 dimensions Plutchik' },
  { name: 'emotion_coherence', label_fr: 'Cohérence émotionnelle', method: 'CALC', weight: 2.5, macro_axe: 'ECC', sprint_introduced: 0, description: 'Transitions émotionnelles cohérentes entre paragraphes' },
  { name: 'interiority', label_fr: 'Intériorité', method: 'LLM', weight: 2.0, macro_axe: 'ECC', sprint_introduced: 0, description: 'Profondeur du monde intérieur des personnages' },
  { name: 'impact', label_fr: 'Impact', method: 'LLM', weight: 2.0, macro_axe: 'ECC', sprint_introduced: 0, description: 'Force ouverture et clôture' },
  { name: 'physics_compliance', label_fr: 'Conformité physique', method: 'CALC', weight: 0, macro_axe: 'ECC', sprint_introduced: 3, description: 'Respect des 6 lois physiques émotionnelles (informatif)' },
  { name: 'temporal_pacing', label_fr: 'Pacing temporel', method: 'CALC', weight: 1.0, macro_axe: 'ECC', sprint_introduced: 16, description: 'Dilatation/compression + foreshadowing' },

  // RCI sub-axes
  { name: 'rhythm', label_fr: 'Rythme', method: 'CALC', weight: 1.0, macro_axe: 'RCI', sprint_introduced: 0, description: 'Variation longueur phrases, Gini, syncopes' },
  { name: 'signature', label_fr: 'Signature', method: 'CALC', weight: 1.0, macro_axe: 'RCI', sprint_introduced: 0, description: 'Conformité style_genome' },
  { name: 'hook_presence', label_fr: 'Accroches', method: 'CALC', weight: 0.20, macro_axe: 'RCI', sprint_introduced: 0, description: 'Présence hooks narratifs (questions, actions, sensoriels)' },
  { name: 'euphony_basic', label_fr: 'Euphonie', method: 'CALC', weight: 1.0, macro_axe: 'RCI', sprint_introduced: 15, description: 'Anti-cacophonie + variation rythme' },
  { name: 'voice_conformity', label_fr: 'Conformité voix', method: 'CALC', weight: 1.0, macro_axe: 'RCI', sprint_introduced: 13, description: 'Conformité genome voix prescrite' },

  // SII sub-axes
  { name: 'anti_cliche', label_fr: 'Anti-cliché', method: 'CALC', weight: 1.0, macro_axe: 'SII', sprint_introduced: 0, description: 'Absence de clichés et patterns IA' },
  { name: 'metaphor_novelty', label_fr: 'Nouveauté métaphores', method: 'HYBRID', weight: 1.5, macro_axe: 'SII', sprint_introduced: 12, description: 'Fraîcheur des images, blacklist 500+' },

  // IFI sub-axes
  { name: 'sensory_density', label_fr: 'Densité sensorielle', method: 'HYBRID', weight: 1.5, macro_axe: 'IFI', sprint_introduced: 0, description: 'Densité 5 sens + proprioception + intéroception' },
  { name: 'necessity', label_fr: 'Nécessité', method: 'LLM', weight: 1.0, macro_axe: 'IFI', sprint_introduced: 0, description: 'Chaque phrase fait avancer le récit' },
  { name: 'attention_sustain', label_fr: 'Maintien attention', method: 'CALC', weight: 1.0, macro_axe: 'IFI', sprint_introduced: 14, description: 'Attention lecteur jamais < 0.3 pendant > 5 phrases' },
  { name: 'fatigue_management', label_fr: 'Gestion fatigue', method: 'CALC', weight: 1.0, macro_axe: 'IFI', sprint_introduced: 14, description: 'Respirations quand fatigue lecteur > 0.7' },

  // AAI sub-axes
  { name: 'show_dont_tell', label_fr: 'Show dont tell', method: 'HYBRID', weight: 1.5, macro_axe: 'AAI', sprint_introduced: 11, description: 'Montrer plutôt que dire' },
  { name: 'authenticity', label_fr: 'Authenticité', method: 'CALC', weight: 1.0, macro_axe: 'AAI', sprint_introduced: 11, description: 'Anti-IA smell (15+ patterns)' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MACRO-AXES DEFINITIONS — 5 MACRO-AXES
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_MACRO_AXES: readonly MacroAxisDefinition[] = [
  {
    name: 'ECC',
    label_fr: 'Emotional Curve Compliance',
    sub_axes: ['tension_14d', 'emotion_coherence', 'interiority', 'impact', 'physics_compliance', 'temporal_pacing'],
    weight_in_composite: 0.30,
    description: 'Conformité courbe émotionnelle prescrite',
  },
  {
    name: 'RCI',
    label_fr: 'Rhythm & Craftsmanship Index',
    sub_axes: ['rhythm', 'signature', 'hook_presence', 'euphony_basic', 'voice_conformity'],
    weight_in_composite: 0.17,
    description: 'Qualité rythmique et artisanale',
  },
  {
    name: 'SII',
    label_fr: 'Style Identity Index',
    sub_axes: ['anti_cliche', 'metaphor_novelty'],
    weight_in_composite: 0.18,
    description: 'Identité stylistique et originalité',
  },
  {
    name: 'IFI',
    label_fr: 'Immersion Fidelity Index',
    sub_axes: ['sensory_density', 'necessity', 'attention_sustain', 'fatigue_management'],
    weight_in_composite: 0.15,
    description: 'Fidélité immersive et engagement lecteur',
  },
  {
    name: 'AAI',
    label_fr: 'Authenticity & Art Index',
    sub_axes: ['show_dont_tell', 'authenticity'],
    weight_in_composite: 0.20,
    description: 'Authenticité et qualité artistique',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE DATA FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export const PIPELINE_FLOW: readonly DataFlowStep[] = [
  { step: 1, module: 'forge-packet-assembler', input: 'StoryContract + Canon', output: 'ForgePacket', method: 'CALC' },
  { step: 2, module: 'symbol-map', input: 'ForgePacket', output: 'SymbolMap', method: 'CALC' },
  { step: 3, module: 'constraint-compiler', input: 'ForgePacket + TemporalContract', output: 'SovereignPrompt', method: 'CALC' },
  { step: 4, module: 'voice-compiler', input: 'VoiceGenome', output: 'VoiceInstructions', method: 'CALC' },
  { step: 5, module: 'foreshadowing-compiler', input: 'TemporalContract', output: 'ForeshadowingPlan', method: 'CALC' },
  { step: 6, module: 'draft-generation', input: 'SovereignPrompt', output: 'DraftProse', method: 'LLM' },
  { step: 7, module: 'physics-audit', input: 'DraftProse + ForgePacket', output: 'PhysicsAuditResult', method: 'CALC' },
  { step: 8, module: 's-oracle', input: 'DraftProse + ForgePacket', output: 'SScore (20 axes)', method: 'HYBRID' },
  { step: 9, module: 'phantom-reader', input: 'DraftProse', output: 'PhantomState[]', method: 'CALC' },
  { step: 10, module: 'triple-pitch', input: 'SScore + DeltaReport', output: 'CorrectionPitch', method: 'LLM' },
  { step: 11, module: 'patch-engine', input: 'DraftProse + CorrectionPitch', output: 'CorrectedProse', method: 'LLM' },
  { step: 12, module: 'polish-v2', input: 'CorrectedProse', output: 'PolishedProse', method: 'LLM' },
  { step: 13, module: 'final-scoring', input: 'PolishedProse', output: 'MacroSScore + Verdict', method: 'HYBRID' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Blueprint V2.
 */
export function generateBlueprintV2(): BlueprintV2 {
  return {
    version: '2.0',
    generated_at: new Date().toISOString(),
    axes: ALL_AXES,
    macro_axes: ALL_MACRO_AXES,
    pipeline: PIPELINE_FLOW,
    scoring: {
      sovereign_threshold: 93,
      axis_floor: 50,
      reject_below: 60,
      emotion_weight_pct: 63.3,
      total_axes: ALL_AXES.length,
      total_macro_axes: ALL_MACRO_AXES.length,
    },
  };
}
