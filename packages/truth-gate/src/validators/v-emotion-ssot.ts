/**
 * OMEGA Truth Gate — V-EMOTION-SSOT Validator
 *
 * Validates Emotion Single Source of Truth (SSOT) principle.
 *
 * Checks:
 * - Emotion data comes from approved sources
 * - No conflicting emotion states
 * - Emotion updates follow versioning rules
 */

import type { CanonTx } from '@omega/canon-kernel';
import type { ValidatorId, ValidationContext, VerdictType, VerdictEvidence } from '../gate/types.js';
import { BaseValidator } from './base-validator.js';

export class VEmotionSSOTValidator extends BaseValidator {
  readonly id: ValidatorId = 'V-EMOTION-SSOT';
  readonly name = 'Emotion SSOT Validator';
  readonly description = 'Validates emotion data follows Single Source of Truth principle';
  readonly version = '1.0.0';

  private readonly EMOTION_FIELDS = [
    'emotion',
    'emotion_primary',
    'emotion_secondary',
    'emotion_intensity',
    'emotion_valence',
    'emotion_arousal',
    'emotional_state',
    'plutchik_wheel',
  ];

  protected doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType {
    let isValid = true;

    // Collect all emotion-related operations
    const emotionOps = tx.ops.filter(op =>
      op.field_path && this.isEmotionField(op.field_path)
    );

    if (emotionOps.length === 0) {
      // No emotion operations - valid
      return this.allow();
    }

    // Check for conflicting emotion updates to same entity
    const entityEmotionOps = new Map<string, typeof emotionOps>();
    for (const op of emotionOps) {
      const fieldPathStr = op.field_path?.join('.') ?? '';
      const key = `${op.target}:${fieldPathStr}`;
      const existing = entityEmotionOps.get(key) || [];
      entityEmotionOps.set(key, [...existing, op]);
    }

    // Detect conflicts - multiple updates to same emotion field
    for (const [key, ops] of entityEmotionOps) {
      if (ops.length > 1) {
        // Multiple updates to same emotion field in single tx
        const values = ops.map(op => JSON.stringify(op.value));
        const uniqueValues = new Set(values);

        if (uniqueValues.size > 1) {
          this.addEvidence(evidence, 'emotion_ssot_violation', `Conflicting emotion updates for ${key}`, {
            location: key,
            details: `Found ${ops.length} different values`,
          });
          isValid = false;
        }
      }
    }

    // Validate emotion values are within expected ranges
    for (const op of emotionOps) {
      const fieldPathStr = op.field_path?.join('.') ?? '';
      if (!this.validateEmotionValue(fieldPathStr, op.value, evidence)) {
        isValid = false;
      }
    }

    // S11.Z DEAD CODE REMOVAL (audit S11.Y-TRUTH-GATE-DESIGN-AUDIT 2026-05-25) :
    // Block "Check emotion source evidence" SUPPRIME entierement
    // 3 valeurs fantomes ('oracle_analysis'/'author_annotation'/'computed_emotion') jamais produites runtime
    // EvidenceType canon = 'file'|'url'|'hash'|'signature'|'timestamp'|'oracle'|'human'|'gate_approval'
    // Sans le check fantome, le block devient redondant (outer length check inutile sans semantique distincte)

    // If we have store snapshot, check for SSOT violations
    if (context.store_snapshot) {
      for (const op of emotionOps) {
        const fieldPathStr = op.field_path?.join('.') ?? '';
        if (op.target && op.field_path) {
          const currentFacts = context.store_snapshot.getEntityFacts(op.target);
          const currentValue = currentFacts.get(fieldPathStr);

          // Check if emotion is being changed without proper evidence
          // S11.Z Q2-style refactor : check generique evidence_refs.length > 0
          // (au lieu des 3 valeurs fantomes 'emotion_correction'/'oracle_reanalysis'/'author_override')
          // Preserve l'intent semantique "emotion change requires evidence" sans dependance string fantome
          if (currentValue !== undefined && currentValue !== op.value) {
            const hasChangeEvidence = (op.evidence_refs?.length ?? 0) > 0;

            if (!hasChangeEvidence) {
              this.addEvidence(evidence, 'emotion_ssot_violation', `Emotion change without supporting evidence`, {
                location: `${op.target}.${fieldPathStr}`,
                expected: String(currentValue),
                actual: String(op.value),
              });
              isValid = false;
            }
          }
        }
      }
    }

    return isValid ? this.allow() : this.deny();
  }

  private isEmotionField(fieldPath: readonly string[]): boolean {
    const lowerPath = fieldPath.join('.').toLowerCase();
    return this.EMOTION_FIELDS.some(f => lowerPath.includes(f));
  }

  private validateEmotionValue(
    fieldPath: string,
    value: unknown,
    evidence: VerdictEvidence[]
  ): boolean {
    // Validate intensity/valence/arousal are in range [0, 1]
    if (fieldPath.includes('intensity') || fieldPath.includes('valence') || fieldPath.includes('arousal')) {
      if (typeof value === 'number') {
        if (value < 0 || value > 1) {
          this.addEvidence(evidence, 'emotion_ssot_violation', `Emotion value out of range [0, 1]`, {
            location: fieldPath,
            actual: String(value),
            expected: '[0, 1]',
          });
          return false;
        }
      }
    }

    // Validate primary emotion is a valid Plutchik emotion
    if (fieldPath.includes('primary') || fieldPath === 'emotion') {
      if (typeof value === 'string') {
        const validEmotions = [
          'joy', 'trust', 'fear', 'surprise',
          'sadness', 'disgust', 'anger', 'anticipation',
          // Compound emotions
          'love', 'submission', 'awe', 'disapproval',
          'remorse', 'contempt', 'aggressiveness', 'optimism',
        ];

        if (!validEmotions.includes(value.toLowerCase())) {
          this.addEvidence(evidence, 'emotion_ssot_violation', `Unknown emotion type`, {
            location: fieldPath,
            actual: value,
          });
          // This is a warning, not a failure for extensibility
        }
      }
    }

    return true;
  }
}

export function createEmotionSSOTValidator(): VEmotionSSOTValidator {
  return new VEmotionSSOTValidator();
}
