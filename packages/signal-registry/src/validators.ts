/**
 * OMEGA Signal Registry — Validators
 * Fail-closed: unknown signal = FAIL. Missing required = FAIL.
 */

import { OMEGA_SIGNAL_REGISTRY, SIGNAL_ID_SET } from './registry.js';
import { VALID_PRODUCERS, type ValidationResult } from './types.js';

/**
 * Validate that a producer's declared capabilities match the registry.
 * FAIL-CLOSED: unknown signal_id = error.
 */
export function validateProducerOutputs(
  producer: string,
  capabilities: readonly string[],
  params: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Producer must be known
  if (!VALID_PRODUCERS.includes(producer as any)) {
    errors.push(`Unknown producer: '${producer}'. Valid: ${VALID_PRODUCERS.join(', ')}`);
  }

  for (const cap of capabilities) {
    // Signal must exist in registry
    if (!SIGNAL_ID_SET.has(cap)) {
      errors.push(`Signal '${cap}' not found in OMEGA_SIGNAL_REGISTRY`);
      continue;
    }

    const descriptor = OMEGA_SIGNAL_REGISTRY.find((s) => s.signal_id === cap)!;

    // Producer must match
    if (descriptor.producer !== producer) {
      errors.push(
        `Signal '${cap}' belongs to producer '${descriptor.producer}', not '${producer}'`,
      );
    }

    // Required params must be present
    for (const param of descriptor.required_params) {
      if (params[param] === undefined || params[param] === null) {
        errors.push(`Signal '${cap}' requires param '${param}' but it is missing`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    degraded_signals: [],
  };
}

/**
 * Validate that a consumer's required signals are present in capabilities.
 * FAIL-CLOSED for required. DEGRADE-EXPLICIT for optional.
 */
export function validateConsumerRequirements(
  required: readonly string[],
  optional: readonly string[],
  capabilities: readonly string[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const degraded_signals: string[] = [];

  const capSet = new Set(capabilities);

  // All required MUST be present
  for (const req of required) {
    if (!SIGNAL_ID_SET.has(req)) {
      errors.push(`Required signal '${req}' not found in OMEGA_SIGNAL_REGISTRY`);
      continue;
    }
    if (!capSet.has(req)) {
      errors.push(`Required signal '${req}' missing from capabilities`);
    }
  }

  // Optional: degrade-explicit if missing
  for (const opt of optional) {
    if (!SIGNAL_ID_SET.has(opt)) {
      warnings.push(`Optional signal '${opt}' not found in OMEGA_SIGNAL_REGISTRY`);
      continue;
    }
    if (!capSet.has(opt)) {
      warnings.push(`Optional signal '${opt}' missing — degraded mode`);
      degraded_signals.push(opt);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    degraded_signals,
  };
}
