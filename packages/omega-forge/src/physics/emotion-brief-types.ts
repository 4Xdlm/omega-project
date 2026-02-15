/**
 * OMEGA Forge — ForgeEmotionBrief Types
 * Le payload riche transportant TOUTES les données émotion.
 */

import type {
  Emotion14, EmotionState14D, OmegaState,
  CanonicalEmotionTable, PrescribedState,
} from '../types.js';

export interface BriefParams {
  readonly waypoints: readonly { readonly position: number; readonly emotion: string; readonly intensity: number }[];
  readonly sceneStartPct: number;
  readonly sceneEndPct: number;
  readonly totalParagraphs: number;
  readonly canonicalTable: CanonicalEmotionTable;
  readonly persistenceCeiling: number;
  readonly language: 'fr' | 'en';
  readonly producerBuildHash: string;
}

export interface ForgeEmotionBrief {
  readonly schema_version: 'forge.emotion.v1';
  readonly producer: 'omega-forge';
  readonly producer_build_hash: string;
  readonly canonical_table_hash: string;
  readonly persistence_ceiling: number;
  readonly language: 'fr' | 'en';
  readonly brief_hash: string;
  readonly capabilities: readonly string[];
  readonly trajectory: readonly PrescribedState[];
  readonly quartile_targets: readonly QuartileTarget[];
  readonly physics_profiles: readonly EmotionPhysicsProfile[];
  readonly transition_map: readonly TransitionConstraint[];
  readonly forbidden_transitions: readonly ForbiddenTransition[];
  readonly decay_expectations: readonly DecayExpectation[];
  readonly blend_zones: readonly BlendZone[];
  readonly energy_budget: EnergyBudget;
}

export interface QuartileTarget {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly target_14d: EmotionState14D;
  readonly target_omega: OmegaState;
  readonly dominant: Emotion14;
}

export interface EmotionPhysicsProfile {
  readonly emotion: Emotion14;
  readonly mass: number;
  readonly lambda: number;
  readonly kappa: number;
  readonly decay_half_life_paragraphs: number;
  readonly behavior_fr: string;
}

export interface TransitionConstraint {
  readonly from_quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly to_quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly from_dominant: Emotion14;
  readonly to_dominant: Emotion14;
  readonly required_force: number;
  readonly feasible: boolean;
  readonly narrative_hint_fr: string;
}

export interface ForbiddenTransition {
  readonly from: Emotion14;
  readonly to: Emotion14;
  readonly reason_fr: string;
}

export interface DecayExpectation {
  readonly peak_quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly emotion: Emotion14;
  readonly peak_intensity: number;
  readonly lambda: number;
  readonly expected_drop_pct_at_next_quartile: number;
  readonly instruction_fr: string;
}

export interface BlendZone {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly blend: Readonly<Partial<Record<Emotion14, number>>>;
  readonly instruction_fr: string;
}

export interface EnergyBudget {
  readonly total_in: number;
  readonly total_out: number;
  readonly balance_error: number;
  readonly constraint_fr: string;
}
