/**
 * OMEGA Rosetta Bridge — Type Definitions
 * Couplage S1 (physique corpus) → S2 (physique modèle LLM)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-02
 */

export type FeatureRoute =
  | 'PROMPT_DIRECT'      // Injecter dans le prompt V4
  | 'POST_PROCESSING'    // Traiter après génération (semicolons, etc.)
  | 'INDIRECT_VIA_L37'   // Piloté indirectement via sub_per_sentence
  | 'IRREDUCTIBLE'       // Attracteur BB — ne pas injecter
  | 'SHADOW';            // Mesurer seulement, pas d'action

export type FeatureCategory =
  | 'PILOTABLE'
  | 'ILLUSION'
  | 'INDIRECT'
  | 'CONTOURNABLE'
  | 'IRREDUCTIBLE';

export interface FeatureDirective {
  readonly feature: string;
  readonly name: string;
  readonly category: FeatureCategory;
  readonly route: FeatureRoute;
  readonly instruction: string;
  readonly compliance_rate: number;
  readonly active: boolean;
}

export interface RosettaBridgeInput {
  readonly target_features: Record<string, number>;
  readonly archetype: string;
  readonly language: 'fr' | 'en';
}

export interface RosettaBridgeOutput {
  readonly prompt_directives: FeatureDirective[];
  readonly post_processing: FeatureDirective[];
  readonly shadow_measures: FeatureDirective[];
  readonly expected_compliance: number;
  readonly total_injectable: number;
  readonly warnings: string[];
}
