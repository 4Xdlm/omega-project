/**
 * OMEGA Truth Gate — V-NARRATIVE-DRIFT-TOXICITY Validator
 *
 * The most important validator - detects narrative drift and toxic content.
 *
 * Checks:
 * - Narrative drift from established truth
 * - Toxic content patterns
 * - Character/plot inconsistencies
 * - Timeline violations
 */

import type { CanonTx } from '@omega/canon-kernel';
import type { ValidatorId, ValidationContext, VerdictType, VerdictEvidence } from '../gate/types.js';
import { BaseValidator } from './base-validator.js';
import { NarrativeAnalyzer } from '../drift/narrative-analyzer.js';
import type { DriftDetectorConfig } from '../drift/types.js';

export class VNarrativeDriftToxicityValidator extends BaseValidator {
  readonly id: ValidatorId = 'V-NARRATIVE-DRIFT-TOXICITY';
  readonly name = 'Narrative Drift & Toxicity Validator';
  readonly description = 'Detects narrative drift and toxic content';
  readonly version = '1.0.0';

  private analyzer: NarrativeAnalyzer | null = null;

  protected doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType {
    // Initialize analyzer with policy rules
    const config: Partial<DriftDetectorConfig> = {
      max_drift_score: context.policy.rules.max_drift_score,
      max_toxicity_score: context.policy.rules.max_toxicity_score,
      blocked_terms: [...context.policy.rules.blocked_patterns],
    };

    this.analyzer = new NarrativeAnalyzer(config);

    // Perform analysis
    const analysis = this.analyzer.analyze(tx, context.previous_tx);

    // Record drift evidence
    if (analysis.drift.drift_score > 0) {
      this.addEvidence(evidence, 'drift_detected', analysis.drift.details, {
        expected: `max drift: ${config.max_drift_score}`,
        actual: `drift: ${analysis.drift.drift_score.toFixed(3)}`,
      });
    }

    // Record toxicity evidence
    if (analysis.toxicity.toxicity_score > 0) {
      this.addEvidence(evidence, 'toxicity_detected', analysis.toxicity.details, {
        expected: `max toxicity: ${config.max_toxicity_score}`,
        actual: `toxicity: ${analysis.toxicity.toxicity_score.toFixed(3)}`,
        location: analysis.toxicity.flagged_content.join(', ') || undefined,
      });
    }

    // Check thresholds
    const driftFail = analysis.drift.drift_score > context.policy.rules.max_drift_score;
    const toxicityFail = analysis.toxicity.toxicity_score > context.policy.rules.max_toxicity_score;

    if (toxicityFail) {
      // Toxicity is always a hard fail
      this.addEvidence(evidence, 'toxicity_detected',
        `Toxicity score ${(analysis.toxicity.toxicity_score * 100).toFixed(1)}% exceeds threshold ${(context.policy.rules.max_toxicity_score * 100).toFixed(1)}%`,
        {
          expected: `<= ${context.policy.rules.max_toxicity_score}`,
          actual: String(analysis.toxicity.toxicity_score),
        }
      );
      return this.deny();
    }

    if (driftFail) {
      // Drift can be deferred for review
      this.addEvidence(evidence, 'drift_detected',
        `Drift score ${(analysis.drift.drift_score * 100).toFixed(1)}% exceeds threshold ${(context.policy.rules.max_drift_score * 100).toFixed(1)}%`,
        {
          expected: `<= ${context.policy.rules.max_drift_score}`,
          actual: String(analysis.drift.drift_score),
        }
      );

      // Minor drift can be deferred, major drift is denied
      if (analysis.drift.severity === 'critical' || analysis.drift.severity === 'major') {
        return this.deny();
      }
      return this.defer();
    }

    // All checks pass
    return this.allow();
  }
}

export function createNarrativeDriftToxicityValidator(): VNarrativeDriftToxicityValidator {
  return new VNarrativeDriftToxicityValidator();
}
