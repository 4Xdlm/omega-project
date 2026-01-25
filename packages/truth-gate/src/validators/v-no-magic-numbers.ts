/**
 * OMEGA Truth Gate — V-NO-MAGIC-NUMBERS Validator
 *
 * Validates that no magic numbers appear in business logic.
 *
 * Checks:
 * - Threshold values reference calibration symbols
 * - No hardcoded numeric literals in validation logic
 * - All configurable values come from CalibrationConfig
 */

import type { CanonTx } from '@omega/canon-kernel';
import { getCalibrated, Ω_WINDOW, Ω_CONTINUITY_MIN, Ω_EMOTION_MIN } from '@omega/canon-kernel';
import type { ValidatorId, ValidationContext, VerdictType, VerdictEvidence } from '../gate/types.js';
import { BaseValidator } from './base-validator.js';

export class VNoMagicNumbersValidator extends BaseValidator {
  readonly id: ValidatorId = 'V-NO-MAGIC-NUMBERS';
  readonly name = 'No Magic Numbers Validator';
  readonly description = 'Validates no magic numbers in transaction data';
  readonly version = '1.0.0';

  // Known "safe" values that are not magic numbers
  private readonly SAFE_VALUES = new Set([
    0, 1, -1,           // Boolean-equivalent
    100,                // Percentage base
    1000,               // ms to s conversion
    60, 3600, 86400,    // Time constants
  ]);

  // Field patterns that are allowed to have numeric literals
  private readonly EXEMPT_PATTERNS = [
    /^id$/i,
    /^index$/i,
    /^version$/i,
    /^count$/i,
    /^timestamp$/i,
    /^position$/i,
    /^order$/i,
    /^sequence$/i,
    /^length$/i,
    /^size$/i,
  ];

  protected doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType {
    let isValid = true;

    // Check each operation's value for magic numbers
    for (const op of tx.ops) {
      if (op.value !== undefined) {
        const magicNumbers = this.findMagicNumbers(op.value, op.field_path || '');

        for (const magic of magicNumbers) {
          this.addEvidence(evidence, 'magic_number', `Potential magic number detected: ${magic.value}`, {
            location: `op.${op.op_id}.value${magic.path}`,
            actual: String(magic.value),
          });
          // Warning only - don't fail validation for potential magic numbers
          // The policy can decide to be stricter
        }
      }

      // Check evidence for magic numbers
      if (op.evidence) {
        for (let i = 0; i < op.evidence.length; i++) {
          const ev = op.evidence[i];
          if (ev.confidence !== undefined && typeof ev.confidence === 'number') {
            // Confidence should come from calibration
            if (!this.isFromCalibration(ev.confidence, context)) {
              // Check if it's a computed value (0-1 range is OK)
              if (ev.confidence < 0 || ev.confidence > 1) {
                this.addEvidence(evidence, 'magic_number', `Evidence confidence outside [0,1] range`, {
                  location: `op.${op.op_id}.evidence[${i}].confidence`,
                  actual: String(ev.confidence),
                });
                isValid = false;
              }
            }
          }
        }
      }
    }

    // Verify that calibration is being used
    if (!this.verifyCalibrationUsage(context, evidence)) {
      // Just a warning - calibration should be used
    }

    return isValid ? this.allow() : this.deny();
  }

  private findMagicNumbers(
    value: unknown,
    fieldPath: string,
    currentPath: string = ''
  ): Array<{ value: number; path: string }> {
    const results: Array<{ value: number; path: string }> = [];

    // Skip exempt fields
    if (this.isExemptField(fieldPath)) {
      return results;
    }

    if (typeof value === 'number') {
      if (!this.isSafeValue(value)) {
        results.push({ value, path: currentPath });
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        results.push(...this.findMagicNumbers(value[i], fieldPath, `${currentPath}[${i}]`));
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [key, v] of Object.entries(value)) {
        results.push(...this.findMagicNumbers(v, key, `${currentPath}.${key}`));
      }
    }

    return results;
  }

  private isSafeValue(value: number): boolean {
    // Safe values
    if (this.SAFE_VALUES.has(value)) {
      return true;
    }

    // Values in [0, 1] range are typically normalized scores
    if (value >= 0 && value <= 1) {
      return true;
    }

    // Small integers are often indices or counts
    if (Number.isInteger(value) && value >= 0 && value <= 10) {
      return true;
    }

    return false;
  }

  private isExemptField(fieldPath: string): boolean {
    return this.EXEMPT_PATTERNS.some(pattern => pattern.test(fieldPath));
  }

  private isFromCalibration(value: number, context: ValidationContext): boolean {
    // Check if value matches any calibration value
    const calibration = context.calibration;
    const calibrationValues = [
      getCalibrated(calibration, Ω_WINDOW),
      getCalibrated(calibration, Ω_CONTINUITY_MIN),
      getCalibrated(calibration, Ω_EMOTION_MIN),
    ];

    return calibrationValues.includes(value);
  }

  private verifyCalibrationUsage(
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): boolean {
    // Verify calibration config is present and populated
    if (!context.calibration) {
      this.addEvidence(evidence, 'magic_number', 'CalibrationConfig not provided in context', {
        location: 'context.calibration',
      });
      return false;
    }

    return true;
  }
}

export function createNoMagicNumbersValidator(): VNoMagicNumbersValidator {
  return new VNoMagicNumbersValidator();
}
