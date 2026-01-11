/**
 * @fileoverview Unit tests for loader module.
 */

import { describe, it, expect } from 'vitest';
import {
  validatePlanFile,
  parsePlanJson,
  planFileToPlan,
  planToPlanFile,
  PlanLoadError,
} from '../../src/loader.js';
import type { PlanFile } from '../../src/types.js';

describe('loader', () => {
  describe('validatePlanFile', () => {
    it('should validate a minimal valid plan', () => {
      const data = {
        version: '1.0.0',
        steps: [],
      };

      const result = validatePlanFile(data, 'test.json');

      expect(result.version).toBe('1.0.0');
      expect(result.steps).toEqual([]);
    });

    it('should validate a plan with steps', () => {
      const data = {
        version: '1.0.0',
        steps: [
          { id: 'step1', kind: 'test', input: { value: 1 } },
          { id: 'step2', kind: 'test', input: { value: 2 }, depends_on: ['step1'] },
        ],
      };

      const result = validatePlanFile(data, 'test.json');

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].id).toBe('step1');
      expect(result.steps[1].depends_on).toEqual(['step1']);
    });

    it('should validate a plan with hooks', () => {
      const data = {
        version: '1.0.0',
        steps: [],
        hooks: {
          before_run: ['hook1'],
          after_run: ['hook2'],
        },
      };

      const result = validatePlanFile(data, 'test.json');

      expect(result.hooks?.before_run).toEqual(['hook1']);
      expect(result.hooks?.after_run).toEqual(['hook2']);
    });

    it('should validate a plan with metadata', () => {
      const data = {
        version: '1.0.0',
        metadata: { author: 'test', description: 'A test plan' },
        steps: [],
      };

      const result = validatePlanFile(data, 'test.json');

      expect(result.metadata).toEqual({ author: 'test', description: 'A test plan' });
    });

    it('should throw for non-object', () => {
      expect(() => validatePlanFile('string', 'test.json')).toThrow(PlanLoadError);
      expect(() => validatePlanFile(null, 'test.json')).toThrow(PlanLoadError);
      expect(() => validatePlanFile(123, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for missing version', () => {
      const data = { steps: [] };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for missing steps', () => {
      const data = { version: '1.0.0' };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for non-array steps', () => {
      const data = { version: '1.0.0', steps: 'not-an-array' };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for step without id', () => {
      const data = {
        version: '1.0.0',
        steps: [{ kind: 'test', input: {} }],
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for step with empty id', () => {
      const data = {
        version: '1.0.0',
        steps: [{ id: '', kind: 'test', input: {} }],
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for step without kind', () => {
      const data = {
        version: '1.0.0',
        steps: [{ id: 'step1', input: {} }],
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for invalid timeout_ms type', () => {
      const data = {
        version: '1.0.0',
        steps: [{ id: 'step1', kind: 'test', input: {}, timeout_ms: 'not-a-number' }],
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for invalid depends_on type', () => {
      const data = {
        version: '1.0.0',
        steps: [{ id: 'step1', kind: 'test', input: {}, depends_on: 'not-an-array' }],
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for depends_on with non-string elements', () => {
      const data = {
        version: '1.0.0',
        steps: [{ id: 'step1', kind: 'test', input: {}, depends_on: [123] }],
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for invalid hooks type', () => {
      const data = {
        version: '1.0.0',
        steps: [],
        hooks: 'not-an-object',
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for hook with non-array value', () => {
      const data = {
        version: '1.0.0',
        steps: [],
        hooks: { before_run: 'not-an-array' },
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for hook with non-string elements', () => {
      const data = {
        version: '1.0.0',
        steps: [],
        hooks: { before_run: [123] },
      };
      expect(() => validatePlanFile(data, 'test.json')).toThrow(PlanLoadError);
    });
  });

  describe('parsePlanJson', () => {
    it('should parse valid JSON', () => {
      const json = '{"version":"1.0.0","steps":[]}';
      const result = parsePlanJson(json, 'test.json');

      expect(result.version).toBe('1.0.0');
    });

    it('should throw for invalid JSON', () => {
      expect(() => parsePlanJson('not-json', 'test.json')).toThrow(PlanLoadError);
    });

    it('should throw for invalid plan structure', () => {
      expect(() => parsePlanJson('{"invalid":true}', 'test.json')).toThrow(PlanLoadError);
    });
  });

  describe('planFileToPlan', () => {
    it('should convert plan file to orchestrator plan', () => {
      const planFile: PlanFile = {
        version: '1.0.0',
        steps: [
          { id: 'step1', kind: 'test', input: { x: 1 } },
          { id: 'step2', kind: 'test', input: { x: 2 }, depends_on: ['step1'], timeout_ms: 5000 },
        ],
      };

      const plan = planFileToPlan(planFile);

      expect(plan.id).toBe('plan-1.0.0');
      expect(plan.version).toBe('1.0.0');
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].id).toBe('step1');
      expect(plan.steps[0].kind).toBe('test');
      expect(plan.steps[0].input).toEqual({ x: 1 });
      expect(plan.steps[1].depends_on).toEqual(['step1']);
      expect(plan.steps[1].timeout_ms).toBe(5000);
    });

    it('should use custom plan ID when provided', () => {
      const planFile: PlanFile = {
        version: '2.0.0',
        steps: [{ id: 's1', kind: 'k', input: null }],
      };

      const plan = planFileToPlan(planFile, 'custom-plan-id');

      expect(plan.id).toBe('custom-plan-id');
      expect(plan.version).toBe('2.0.0');
    });

    it('should include metadata from plan file', () => {
      const planFile: PlanFile = {
        version: '1.0.0',
        metadata: { author: 'test', environment: 'dev' },
        steps: [{ id: 's1', kind: 'k', input: null }],
      };

      const plan = planFileToPlan(planFile);

      expect(plan.metadata).toEqual({ author: 'test', environment: 'dev' });
    });

    it('should handle plan file without metadata', () => {
      const planFile: PlanFile = {
        version: '1.0.0',
        steps: [{ id: 's1', kind: 'k', input: null }],
      };

      const plan = planFileToPlan(planFile);

      expect(plan.metadata).toBeUndefined();
    });
  });

  describe('planToPlanFile', () => {
    it('should convert orchestrator plan to plan file', () => {
      const plan = {
        id: 'test-plan',
        version: '1.5.0',
        steps: [
          { id: 'step1', kind: 'test', input: { y: 2 } },
        ],
      };

      const planFile = planToPlanFile(plan);

      expect(planFile.version).toBe('1.5.0');
      expect(planFile.steps).toHaveLength(1);
      expect(planFile.steps[0].id).toBe('step1');
    });

    it('should use custom version override', () => {
      const plan = { id: 'plan1', version: '1.0.0', steps: [] };

      const planFile = planToPlanFile(plan, '2.0.0');

      expect(planFile.version).toBe('2.0.0');
    });

    it('should include metadata', () => {
      const plan = {
        id: 'plan1',
        version: '1.0.0',
        steps: [],
        metadata: { author: 'test' },
      };

      const planFile = planToPlanFile(plan);

      expect(planFile.metadata).toEqual({ author: 'test' });
    });

    it('should not include hooks (functions are not serializable)', () => {
      const plan = {
        id: 'plan1',
        version: '1.0.0',
        steps: [],
        hooks: {
          pre_step: () => {},
          post_step: () => {},
        },
      };

      const planFile = planToPlanFile(plan);

      expect(planFile.hooks).toBeUndefined();
    });
  });

  describe('PlanLoadError', () => {
    it('should store path and cause', () => {
      const cause = new Error('Original error');
      const error = new PlanLoadError('Test error', '/path/to/file.json', cause);

      expect(error.message).toBe('Test error');
      expect(error.path).toBe('/path/to/file.json');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('PlanLoadError');
    });
  });
});
