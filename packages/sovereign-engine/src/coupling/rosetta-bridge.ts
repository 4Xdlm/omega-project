/**
 * OMEGA Rosetta Bridge — Couplage S1→S2
 * Traduit des cibles métriques (features corpus) en directives LLM réalistes.
 *
 * Le bridge NE pilote PAS le LLM directement.
 * Il produit des DIRECTIVES que le prompt assembler peut utiliser.
 *
 * Source de vérité : ROSETTA_BRIDGE_MATRIX.json (dérivé de Rosetta S0)
 *
 * Standard : NASA-Grade L4 / DO-178C Level A
 * Date : 2026-04-02
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RosettaBridgeInput,
  RosettaBridgeOutput,
  FeatureDirective,
  FeatureRoute,
  FeatureCategory,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MATRIX_PATH = resolve(__dirname, '../scoring/data/ROSETTA_BRIDGE_MATRIX.json');

interface MatrixEntry {
  name: string;
  category: string;
  compliance_rate: number;
  instruction: string;
  route: string;
  llm_vs_classique?: Record<string, number>;
}

interface MatrixData {
  version: string;
  features: Record<string, MatrixEntry>;
}

export class RosettaBridge {
  private matrix: Record<string, MatrixEntry>;

  constructor(matrixPath?: string) {
    const raw = readFileSync(matrixPath ?? MATRIX_PATH, 'utf-8');
    const data: MatrixData = JSON.parse(raw);
    this.matrix = data.features ?? {};
  }

  /**
   * Translate target features into LLM directives.
   *
   * For each target feature:
   *   PILOTABLE → generate prompt directive with calibrated instruction
   *   ILLUSION  → skip (LLM can't control it)
   *   INDIRECT  → generate indirect directive (e.g., "increase subordination" for f26b)
   *   CONTOURNABLE → route to post-processing
   *   IRRÉDUCTIBLE → skip with warning
   */
  translate(input: RosettaBridgeInput): RosettaBridgeOutput {
    const prompt_directives: FeatureDirective[] = [];
    const post_processing: FeatureDirective[] = [];
    const shadow_measures: FeatureDirective[] = [];
    const warnings: string[] = [];

    for (const [feature, targetValue] of Object.entries(input.target_features)) {
      const entry = this.matrix[feature];
      if (!entry) {
        shadow_measures.push({
          feature, name: feature, category: 'IRREDUCTIBLE',
          route: 'SHADOW', instruction: '', compliance_rate: 0, active: false,
        });
        continue;
      }

      const directive: FeatureDirective = {
        feature,
        name: entry.name,
        category: entry.category as FeatureCategory,
        route: entry.route as FeatureRoute,
        instruction: entry.instruction,
        compliance_rate: entry.compliance_rate,
        active: entry.category === 'PILOTABLE' || entry.category === 'INDIRECT',
      };

      switch (entry.route) {
        case 'PROMPT_DIRECT':
        case 'INDIRECT_VIA_L37':
          prompt_directives.push(directive);
          break;
        case 'POST_PROCESSING':
          post_processing.push(directive);
          break;
        case 'IRREDUCTIBLE':
          warnings.push(`${feature}: attracteur BB — cible ${targetValue} ignorée`);
          shadow_measures.push({ ...directive, active: false });
          break;
        default:
          shadow_measures.push({ ...directive, active: false });
      }
    }

    // Sort by compliance rate (most reliable first)
    prompt_directives.sort((a, b) => b.compliance_rate - a.compliance_rate);

    const total_injectable = prompt_directives.length;
    const expected_compliance = total_injectable > 0
      ? prompt_directives.reduce((sum, d) => sum + d.compliance_rate, 0) / total_injectable
      : 0;

    return {
      prompt_directives,
      post_processing,
      shadow_measures,
      expected_compliance,
      total_injectable,
      warnings,
    };
  }

  /** Returns the full matrix for inspection. */
  getMatrix(): Record<string, MatrixEntry> {
    return { ...this.matrix };
  }

  /** Returns features by category. */
  getByCategory(category: string): string[] {
    return Object.entries(this.matrix)
      .filter(([_, e]) => e.category === category)
      .map(([feat]) => feat);
  }
}
