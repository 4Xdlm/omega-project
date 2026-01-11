/**
 * @fileoverview Unit tests for Plan validation and builder.
 */

import { describe, it, expect } from 'vitest';
import {
  validatePlan,
  createPlanBuilder,
  PlanBuilder,
  type OrchestratorPlan,
} from '../../src/core/Plan.js';

describe('validatePlan', () => {
  it('should validate a minimal valid plan', () => {
    const plan: OrchestratorPlan = {
      id: 'test-plan',
      version: '1.0.0',
      steps: [{ id: 'step-1', kind: 'noop', input: {} }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty plan id', () => {
    const plan: OrchestratorPlan = {
      id: '',
      version: '1.0.0',
      steps: [{ id: 'step-1', kind: 'noop', input: {} }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Plan 'id' is required and must be a non-empty string");
  });

  it('should reject empty version', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '',
      steps: [{ id: 'step-1', kind: 'noop', input: {} }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Plan 'version' is required and must be a non-empty string");
  });

  it('should reject empty steps array', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plan must have at least one step');
  });

  it('should reject step with empty id', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [{ id: '', kind: 'noop', input: {} }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("'id' is required"))).toBe(true);
  });

  it('should reject step with empty kind', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [{ id: 'step-1', kind: '', input: {} }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("'kind' is required"))).toBe(true);
  });

  it('should reject duplicate step ids', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [
        { id: 'same-id', kind: 'noop', input: {} },
        { id: 'same-id', kind: 'noop', input: {} },
      ],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duplicate step id'))).toBe(true);
  });

  it('should reject negative timeout_ms', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [{ id: 'step-1', kind: 'noop', input: {}, timeout_ms: -100 }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("'timeout_ms' must be a positive number"))).toBe(true);
  });

  it('should reject zero timeout_ms', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [{ id: 'step-1', kind: 'noop', input: {}, timeout_ms: 0 }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('should validate depends_on references', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [
        { id: 'step-1', kind: 'noop', input: {} },
        { id: 'step-2', kind: 'noop', input: {}, depends_on: ['step-1'] },
      ],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(true);
  });

  it('should reject unknown depends_on reference', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [
        { id: 'step-1', kind: 'noop', input: {}, depends_on: ['unknown-step'] },
      ],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("references unknown step"))).toBe(true);
  });

  it('should reject self-dependency', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [
        { id: 'step-1', kind: 'noop', input: {}, depends_on: ['step-1'] },
      ],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cannot depend on itself'))).toBe(true);
  });

  it('should accept valid expected_outputs', () => {
    const plan: OrchestratorPlan = {
      id: 'test',
      version: '1.0.0',
      steps: [{ id: 'step-1', kind: 'noop', input: {}, expected_outputs: ['result', 'data'] }],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(true);
  });
});

describe('PlanBuilder', () => {
  it('should build a valid plan', () => {
    const plan = createPlanBuilder('my-plan', '1.0.0')
      .addStep({ id: 'step-1', kind: 'noop', input: {} })
      .build();

    expect(plan.id).toBe('my-plan');
    expect(plan.version).toBe('1.0.0');
    expect(plan.steps).toHaveLength(1);
  });

  it('should add multiple steps', () => {
    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 'step-1', kind: 'a', input: {} })
      .addStep({ id: 'step-2', kind: 'b', input: {} })
      .addStep({ id: 'step-3', kind: 'c', input: {} })
      .build();

    expect(plan.steps).toHaveLength(3);
  });

  it('should set pre-step hook', () => {
    const hook = () => {};
    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 'step-1', kind: 'noop', input: {} })
      .onPreStep(hook)
      .build();

    expect(plan.hooks?.pre_step).toBe(hook);
  });

  it('should set post-step hook', () => {
    const hook = () => {};
    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 'step-1', kind: 'noop', input: {} })
      .onPostStep(hook)
      .build();

    expect(plan.hooks?.post_step).toBe(hook);
  });

  it('should set metadata', () => {
    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 'step-1', kind: 'noop', input: {} })
      .withMetadata({ author: 'test', priority: 1 })
      .build();

    expect(plan.metadata).toEqual({ author: 'test', priority: 1 });
  });

  it('should throw on invalid plan in build()', () => {
    const builder = createPlanBuilder('plan', '1.0.0');
    // No steps added
    expect(() => builder.build()).toThrow('Invalid plan');
  });

  it('should allow invalid plan in buildUnsafe()', () => {
    const builder = createPlanBuilder('plan', '1.0.0');
    const plan = builder.buildUnsafe();
    expect(plan.steps).toHaveLength(0);
  });

  it('should support chaining', () => {
    const builder = createPlanBuilder('plan', '1.0.0');
    const result = builder
      .addStep({ id: 's1', kind: 'a', input: {} })
      .addStep({ id: 's2', kind: 'b', input: {} })
      .onPreStep(() => {})
      .onPostStep(() => {})
      .withMetadata({});

    expect(result).toBe(builder);
  });
});
