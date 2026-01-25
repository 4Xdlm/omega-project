/**
 * OMEGA Truth Gate — Narrative Drift Detector
 *
 * Detects narrative drift between transactions.
 * Drift = deviation from established narrative truth.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { CanonTx, CanonOp } from '@omega/canon-kernel';
import type { DriftResult, DriftType, DriftSeverity, DriftDetectorConfig } from './types.js';

/**
 * Default drift detector configuration.
 */
export const DEFAULT_DRIFT_CONFIG: DriftDetectorConfig = {
  max_drift_score: 0.3,
  max_toxicity_score: 0.1,
  enable_content_analysis: true,
  blocked_terms: [],
  sensitive_topics: [],
};

/**
 * NarrativeDriftDetector - Detects narrative inconsistencies.
 */
export class NarrativeDriftDetector {
  private readonly config: DriftDetectorConfig;

  constructor(config: Partial<DriftDetectorConfig> = {}) {
    this.config = { ...DEFAULT_DRIFT_CONFIG, ...config };
  }

  /**
   * Analyze transaction for narrative drift.
   */
  analyzeDrift(tx: CanonTx, previousTx?: CanonTx): DriftResult {
    if (!previousTx) {
      // No previous tx to compare - no drift
      return this.createNoDriftResult();
    }

    let maxDriftScore = 0;
    let primaryDriftType: DriftType = 'none';
    const details: string[] = [];

    // Analyze each operation for drift
    for (const op of tx.ops) {
      const opDrift = this.analyzeOperationDrift(op, previousTx);
      if (opDrift.drift_score > maxDriftScore) {
        maxDriftScore = opDrift.drift_score;
        primaryDriftType = opDrift.drift_type;
      }
      if (opDrift.drift_score > 0) {
        details.push(opDrift.details);
      }
    }

    // Check for timeline violations
    const timelineDrift = this.checkTimelineConsistency(tx, previousTx);
    if (timelineDrift.drift_score > maxDriftScore) {
      maxDriftScore = timelineDrift.drift_score;
      primaryDriftType = timelineDrift.drift_type;
      details.push(timelineDrift.details);
    }

    // Check for character consistency
    const characterDrift = this.checkCharacterConsistency(tx, previousTx);
    if (characterDrift.drift_score > maxDriftScore) {
      maxDriftScore = characterDrift.drift_score;
      primaryDriftType = characterDrift.drift_type;
      details.push(characterDrift.details);
    }

    const severity = this.scoreToDriftSeverity(maxDriftScore);

    return {
      drift_score: maxDriftScore,
      drift_type: primaryDriftType,
      severity,
      details: details.join('; ') || 'No drift detected',
      source_hash: sha256(canonicalize(previousTx.tx_id)),
      target_hash: sha256(canonicalize(tx.tx_id)),
    };
  }

  /**
   * Analyze a single operation for drift.
   */
  private analyzeOperationDrift(op: CanonOp, previousTx: CanonTx): DriftResult {
    // Check if operation contradicts previous transaction
    const contradiction = this.findContradiction(op, previousTx);
    if (contradiction) {
      return {
        drift_score: contradiction.score,
        drift_type: contradiction.type,
        severity: this.scoreToDriftSeverity(contradiction.score),
        details: contradiction.details,
      };
    }

    return this.createNoDriftResult();
  }

  /**
   * Find contradiction between operation and previous transaction.
   */
  private findContradiction(
    op: CanonOp,
    previousTx: CanonTx
  ): { score: number; type: DriftType; details: string } | null {
    const opFieldPath = op.field_path?.join('.') ?? '';

    // Look for same entity being modified with conflicting values
    for (const prevOp of previousTx.ops) {
      const prevFieldPath = prevOp.field_path?.join('.') ?? '';

      if (prevOp.target === op.target && prevFieldPath === opFieldPath) {
        // Same field being modified
        if (prevOp.value !== undefined && op.value !== undefined) {
          const prevValue = JSON.stringify(prevOp.value);
          const newValue = JSON.stringify(op.value);

          if (prevValue !== newValue) {
            // Values differ - check if this is a valid update or contradiction
            if (this.isContradiction(prevOp.value, op.value, opFieldPath)) {
              return {
                score: 0.7,
                type: 'factual_contradiction',
                details: `Contradicting value for ${op.target}.${opFieldPath}`,
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Determine if value change is a contradiction.
   */
  private isContradiction(oldValue: unknown, newValue: unknown, fieldPath: string): boolean {
    // Immutable fields that should not change
    const immutableFields = ['birth_date', 'death_date', 'creation_time', 'id', 'type'];

    if (immutableFields.some(f => fieldPath.includes(f))) {
      return true;
    }

    // Boolean flip is often a contradiction
    if (typeof oldValue === 'boolean' && typeof newValue === 'boolean' && oldValue !== newValue) {
      // Check if field suggests state (alive/dead, active/inactive)
      const stateFields = ['alive', 'dead', 'active', 'exists', 'destroyed'];
      if (stateFields.some(f => fieldPath.includes(f))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check timeline consistency.
   */
  private checkTimelineConsistency(tx: CanonTx, previousTx: CanonTx): DriftResult {
    // Check if timestamps are in order
    if (tx.timestamp < previousTx.timestamp) {
      return {
        drift_score: 0.5,
        drift_type: 'timeline_violation',
        severity: 'moderate',
        details: 'Transaction timestamp precedes previous transaction',
      };
    }

    // Check for timeline fields in operations
    for (const op of tx.ops) {
      const fieldPathStr = op.field_path?.join('.') ?? '';
      if (fieldPathStr.includes('timestamp') || fieldPathStr.includes('time')) {
        if (typeof op.value === 'number') {
          // Check if time value is reasonable
          const now = Date.now();
          if (op.value > now + 86400000) { // More than 1 day in future
            return {
              drift_score: 0.3,
              drift_type: 'timeline_violation',
              severity: 'minor',
              details: 'Time value is in the future',
            };
          }
        }
      }
    }

    return this.createNoDriftResult();
  }

  /**
   * Check character consistency.
   */
  private checkCharacterConsistency(tx: CanonTx, previousTx: CanonTx): DriftResult {
    // Look for character-related entities
    const characterOps = tx.ops.filter(op =>
      op.target?.includes('character:') ||
      op.target?.includes('person:') ||
      op.target?.includes('actor:')
    );

    for (const op of characterOps) {
      const fieldPathStr = op.field_path?.join('.') ?? '';

      // Check for personality/trait modifications
      if (fieldPathStr.includes('personality') || fieldPathStr.includes('trait')) {
        // Find corresponding previous value
        const prevOp = previousTx.ops.find(p => {
          const prevFieldPath = p.field_path?.join('.') ?? '';
          return p.target === op.target && prevFieldPath === fieldPathStr;
        });

        if (prevOp && prevOp.value !== op.value) {
          return {
            drift_score: 0.4,
            drift_type: 'character_inconsistency',
            severity: 'minor',
            details: `Character trait modification for ${op.target}`,
          };
        }
      }
    }

    return this.createNoDriftResult();
  }

  /**
   * Convert drift score to severity.
   */
  private scoreToDriftSeverity(score: number): DriftSeverity {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'major';
    if (score >= 0.4) return 'moderate';
    if (score >= 0.2) return 'minor';
    return 'none';
  }

  /**
   * Create a no-drift result.
   */
  private createNoDriftResult(): DriftResult {
    return {
      drift_score: 0,
      drift_type: 'none',
      severity: 'none',
      details: 'No drift detected',
    };
  }
}

/**
 * Create a drift detector.
 */
export function createDriftDetector(config?: Partial<DriftDetectorConfig>): NarrativeDriftDetector {
  return new NarrativeDriftDetector(config);
}
