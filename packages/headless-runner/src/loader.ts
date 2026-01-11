/**
 * @fileoverview Plan file loader for the OMEGA Headless Runner.
 */

import type { OrchestratorPlan, PlanStep } from '@omega/orchestrator-core';
import type { PlanFile, PlanFileStep, PlanFileHooks } from './types.js';

/**
 * Error thrown when plan loading fails.
 */
export class PlanLoadError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'PlanLoadError';
  }
}

/**
 * Validates a plan file structure.
 */
export function validatePlanFile(data: unknown, path: string): PlanFile {
  if (typeof data !== 'object' || data === null) {
    throw new PlanLoadError('Plan file must be a JSON object', path);
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'string') {
    throw new PlanLoadError('Plan file must have a "version" string', path);
  }

  if (!Array.isArray(obj.steps)) {
    throw new PlanLoadError('Plan file must have a "steps" array', path);
  }

  for (let i = 0; i < obj.steps.length; i++) {
    validatePlanFileStep(obj.steps[i], path, i);
  }

  if (obj.hooks !== undefined) {
    validatePlanFileHooks(obj.hooks, path);
  }

  return {
    version: obj.version,
    metadata: obj.metadata as Record<string, unknown> | undefined,
    steps: obj.steps as PlanFileStep[],
    hooks: obj.hooks as PlanFileHooks | undefined,
  };
}

function validatePlanFileStep(step: unknown, path: string, index: number): void {
  if (typeof step !== 'object' || step === null) {
    throw new PlanLoadError(`Step ${index} must be an object`, path);
  }

  const obj = step as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    throw new PlanLoadError(`Step ${index} must have a non-empty "id" string`, path);
  }

  if (typeof obj.kind !== 'string' || obj.kind.length === 0) {
    throw new PlanLoadError(`Step ${index} must have a non-empty "kind" string`, path);
  }

  if (obj.timeout_ms !== undefined && typeof obj.timeout_ms !== 'number') {
    throw new PlanLoadError(`Step ${index} "timeout_ms" must be a number`, path);
  }

  if (obj.depends_on !== undefined) {
    if (!Array.isArray(obj.depends_on)) {
      throw new PlanLoadError(`Step ${index} "depends_on" must be an array`, path);
    }
    for (const dep of obj.depends_on) {
      if (typeof dep !== 'string') {
        throw new PlanLoadError(`Step ${index} "depends_on" must contain only strings`, path);
      }
    }
  }
}

function validatePlanFileHooks(hooks: unknown, path: string): void {
  if (typeof hooks !== 'object' || hooks === null) {
    throw new PlanLoadError('Hooks must be an object', path);
  }

  const obj = hooks as Record<string, unknown>;
  const hookNames = ['before_run', 'after_run', 'before_step', 'after_step', 'on_error'];

  for (const name of hookNames) {
    if (obj[name] !== undefined) {
      if (!Array.isArray(obj[name])) {
        throw new PlanLoadError(`Hook "${name}" must be an array`, path);
      }
      for (const item of obj[name] as unknown[]) {
        if (typeof item !== 'string') {
          throw new PlanLoadError(`Hook "${name}" must contain only strings`, path);
        }
      }
    }
  }
}

/**
 * Converts a plan file to an orchestrator plan.
 * @param file - Plan file to convert
 * @param planId - Optional plan ID (defaults to generated from version)
 */
export function planFileToPlan(file: PlanFile, planId?: string): OrchestratorPlan {
  const steps: PlanStep[] = file.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    input: step.input,
    timeout_ms: step.timeout_ms,
    depends_on: step.depends_on,
  }));

  return {
    id: planId ?? `plan-${file.version}`,
    version: file.version,
    steps,
    metadata: file.metadata,
  };
}

/**
 * Parses a JSON string as a plan file.
 */
export function parsePlanJson(json: string, path: string): PlanFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new PlanLoadError('Invalid JSON', path, err);
  }

  return validatePlanFile(data, path);
}

/**
 * Creates a plan file from an orchestrator plan (for serialization).
 * @param plan - Plan to convert
 * @param version - Optional version override (defaults to plan.version or '1.0.0')
 */
export function planToPlanFile(plan: OrchestratorPlan, version?: string): PlanFile {
  // Note: OrchestratorPlan.hooks contains functions which cannot be serialized
  // Only data fields are included in PlanFile
  return {
    version: version ?? plan.version ?? '1.0.0',
    metadata: plan.metadata,
    steps: plan.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      input: step.input,
      timeout_ms: step.timeout_ms,
      depends_on: step.depends_on,
    })),
  };
}
