/**
 * OMEGA Truth Gate — Narrative Analyzer
 *
 * Combines drift and toxicity detection for comprehensive analysis.
 */

import type { CanonTx } from '@omega/canon-kernel';
import type { NarrativeAnalysis, DriftDetectorConfig } from './types.js';
import { NarrativeDriftDetector, DEFAULT_DRIFT_CONFIG } from './drift-detector.js';
import { ToxicityDetector } from './toxicity-detector.js';

/**
 * NarrativeAnalyzer - Comprehensive narrative analysis.
 */
export class NarrativeAnalyzer {
  private readonly config: DriftDetectorConfig;
  private readonly driftDetector: NarrativeDriftDetector;
  private readonly toxicityDetector: ToxicityDetector;

  constructor(config: Partial<DriftDetectorConfig> = {}) {
    this.config = { ...DEFAULT_DRIFT_CONFIG, ...config };
    this.driftDetector = new NarrativeDriftDetector(this.config);
    this.toxicityDetector = new ToxicityDetector(this.config);
  }

  /**
   * Perform full narrative analysis.
   */
  analyze(tx: CanonTx, previousTx?: CanonTx): NarrativeAnalysis {
    const drift = this.driftDetector.analyzeDrift(tx, previousTx);
    const toxicity = this.toxicityDetector.analyzeToxicity(tx);

    // Compute overall score (weighted average)
    const driftWeight = 0.4;
    const toxicityWeight = 0.6;
    const overall_score = (drift.drift_score * driftWeight) + (toxicity.toxicity_score * toxicityWeight);

    // Determine pass/fail
    const pass = drift.drift_score <= this.config.max_drift_score &&
                 toxicity.toxicity_score <= this.config.max_toxicity_score;

    // Generate recommendations
    const recommendations = this.generateRecommendations(drift, toxicity);

    return {
      drift,
      toxicity,
      overall_score,
      pass,
      recommendations,
    };
  }

  /**
   * Quick check if transaction would pass.
   */
  wouldPass(tx: CanonTx, previousTx?: CanonTx): boolean {
    const analysis = this.analyze(tx, previousTx);
    return analysis.pass;
  }

  /**
   * Get drift score only.
   */
  getDriftScore(tx: CanonTx, previousTx?: CanonTx): number {
    return this.driftDetector.analyzeDrift(tx, previousTx).drift_score;
  }

  /**
   * Get toxicity score only.
   */
  getToxicityScore(tx: CanonTx): number {
    return this.toxicityDetector.analyzeToxicity(tx).toxicity_score;
  }

  /**
   * Generate recommendations based on analysis.
   */
  private generateRecommendations(
    drift: { drift_score: number; drift_type: string },
    toxicity: { toxicity_score: number; toxicity_type: string }
  ): readonly string[] {
    const recommendations: string[] = [];

    if (drift.drift_score > this.config.max_drift_score) {
      recommendations.push(`Reduce narrative drift (current: ${(drift.drift_score * 100).toFixed(1)}%, max: ${(this.config.max_drift_score * 100).toFixed(1)}%)`);

      switch (drift.drift_type) {
        case 'character_inconsistency':
          recommendations.push('Review character traits and ensure consistency with established facts');
          break;
        case 'plot_contradiction':
          recommendations.push('Check for plot contradictions with previous events');
          break;
        case 'timeline_violation':
          recommendations.push('Verify timeline consistency across events');
          break;
        case 'factual_contradiction':
          recommendations.push('Ensure new facts do not contradict established truth');
          break;
      }
    }

    if (toxicity.toxicity_score > this.config.max_toxicity_score) {
      recommendations.push(`Reduce toxicity (current: ${(toxicity.toxicity_score * 100).toFixed(1)}%, max: ${(this.config.max_toxicity_score * 100).toFixed(1)}%)`);

      switch (toxicity.toxicity_type) {
        case 'hate_speech':
          recommendations.push('Remove hate speech or discriminatory content');
          break;
        case 'violence_glorification':
          recommendations.push('Avoid glorifying violence; reframe violent content');
          break;
        case 'harassment':
          recommendations.push('Remove harassing or bullying content');
          break;
        case 'self_harm':
          recommendations.push('Remove self-harm related content');
          break;
        case 'dangerous_content':
          recommendations.push('Remove dangerous or harmful instructions');
          break;
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Content passes all checks');
    }

    return recommendations;
  }
}

/**
 * Create a narrative analyzer.
 */
export function createNarrativeAnalyzer(config?: Partial<DriftDetectorConfig>): NarrativeAnalyzer {
  return new NarrativeAnalyzer(config);
}
