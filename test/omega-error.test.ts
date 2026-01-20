/**
 * OmegaError Tests
 * Standard: NASA-Grade L4
 *
 * Tests for shared error base class and utilities.
 */

import { describe, test, expect } from 'vitest';
import {
  OmegaError,
  OmegaConfigError,
  OmegaValidationError,
  OmegaTimeoutError,
  OmegaNotImplementedError,
  OmegaInvariantError,
  isOmegaError,
  ClockFn,
} from '../nexus/shared/errors/OmegaError.js';

// ============================================================
// Test Implementation
// ============================================================

class TestModuleError extends OmegaError {
  readonly module = 'testmodule' as const;

  constructor(
    code: string,
    message: string,
    context?: Record<string, unknown>,
    clock?: ClockFn
  ) {
    super(code, message, context, clock);
    this.name = 'TestModuleError';
  }
}

// ============================================================
// Tests
// ============================================================

describe('OmegaError', () => {
  describe('base class', () => {
    test('creates error with all properties', () => {
      const fixedTime = 1705750800000;
      const clock: ClockFn = () => fixedTime;

      const error = new TestModuleError(
        'TEST_E001_EXAMPLE',
        'Test error message',
        { key: 'value' },
        clock
      );

      expect(error.code).toBe('TEST_E001_EXAMPLE');
      expect(error.message).toBe('Test error message');
      expect(error.module).toBe('testmodule');
      expect(error.context).toEqual({ key: 'value' });
      expect(error.timestamp).toBe(fixedTime);
      expect(error.name).toBe('TestModuleError');
    });

    test('context is frozen', () => {
      const error = new TestModuleError('TEST_E001', 'msg', { mutable: true });

      expect(() => {
        (error.context as Record<string, unknown>).mutable = false;
      }).toThrow();
    });

    test('defaults context to empty object', () => {
      const error = new TestModuleError('TEST_E001', 'msg');

      expect(error.context).toEqual({});
    });

    test('uses Date.now() by default', () => {
      const before = Date.now();
      const error = new TestModuleError('TEST_E001', 'msg');
      const after = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    test('extends Error', () => {
      const error = new TestModuleError('TEST_E001', 'msg');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OmegaError);
    });

    test('has stack trace', () => {
      const error = new TestModuleError('TEST_E001', 'msg');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestModuleError');
    });
  });

  describe('toJSON', () => {
    test('serializes error to JSON', () => {
      const fixedTime = 1705750800000;
      const error = new TestModuleError(
        'TEST_E001',
        'Test message',
        { foo: 'bar' },
        () => fixedTime
      );

      const json = error.toJSON();

      expect(json.name).toBe('TestModuleError');
      expect(json.code).toBe('TEST_E001');
      expect(json.module).toBe('testmodule');
      expect(json.message).toBe('Test message');
      expect(json.context).toEqual({ foo: 'bar' });
      expect(json.timestamp).toBe(fixedTime);
      expect(json.stack).toBeDefined();
    });

    test('JSON.stringify works', () => {
      const error = new TestModuleError('TEST_E001', 'msg');
      const str = JSON.stringify(error.toJSON());

      expect(() => JSON.parse(str)).not.toThrow();
    });
  });

  describe('toString', () => {
    test('formats error as string', () => {
      const error = new TestModuleError('TEST_E001', 'Something went wrong');

      expect(error.toString()).toBe('[TEST_E001] Something went wrong');
    });
  });

  describe('isOmegaError type guard', () => {
    test('returns true for OmegaError instances', () => {
      const error = new TestModuleError('TEST_E001', 'msg');

      expect(isOmegaError(error)).toBe(true);
    });

    test('returns true for subclass instances', () => {
      const error = new OmegaConfigError('config error');

      expect(isOmegaError(error)).toBe(true);
    });

    test('returns false for plain Error', () => {
      const error = new Error('plain error');

      expect(isOmegaError(error)).toBe(false);
    });

    test('returns false for non-errors', () => {
      expect(isOmegaError(null)).toBe(false);
      expect(isOmegaError(undefined)).toBe(false);
      expect(isOmegaError('string')).toBe(false);
      expect(isOmegaError({ code: 'FAKE' })).toBe(false);
    });
  });
});

describe('Common Error Classes', () => {
  describe('OmegaConfigError', () => {
    test('has correct code and module', () => {
      const error = new OmegaConfigError('Invalid configuration');

      expect(error.code).toBe('OMEGA_E001_CONFIG_ERROR');
      expect(error.module).toBe('omega');
      expect(error.name).toBe('OmegaConfigError');
      expect(error.message).toBe('Invalid configuration');
    });

    test('accepts context and clock', () => {
      const fixedTime = 1705750800000;
      const error = new OmegaConfigError(
        'Bad config',
        { field: 'timeout' },
        () => fixedTime
      );

      expect(error.context).toEqual({ field: 'timeout' });
      expect(error.timestamp).toBe(fixedTime);
    });
  });

  describe('OmegaValidationError', () => {
    test('has correct code', () => {
      const error = new OmegaValidationError('Invalid input');

      expect(error.code).toBe('OMEGA_E002_VALIDATION_ERROR');
      expect(error.module).toBe('omega');
      expect(error.name).toBe('OmegaValidationError');
    });
  });

  describe('OmegaTimeoutError', () => {
    test('has correct code', () => {
      const error = new OmegaTimeoutError('Operation timed out');

      expect(error.code).toBe('OMEGA_E003_TIMEOUT');
      expect(error.module).toBe('omega');
      expect(error.name).toBe('OmegaTimeoutError');
    });
  });

  describe('OmegaNotImplementedError', () => {
    test('has correct code and includes feature in context', () => {
      const error = new OmegaNotImplementedError('streaming');

      expect(error.code).toBe('OMEGA_E004_NOT_IMPLEMENTED');
      expect(error.module).toBe('omega');
      expect(error.name).toBe('OmegaNotImplementedError');
      expect(error.message).toBe('Feature not implemented: streaming');
      expect(error.context.feature).toBe('streaming');
    });
  });

  describe('OmegaInvariantError', () => {
    test('has correct code and includes invariant in context', () => {
      const error = new OmegaInvariantError('count >= 0');

      expect(error.code).toBe('OMEGA_E005_INVARIANT_VIOLATION');
      expect(error.module).toBe('omega');
      expect(error.name).toBe('OmegaInvariantError');
      expect(error.message).toBe('Invariant violated: count >= 0');
      expect(error.context.invariant).toBe('count >= 0');
    });
  });
});

describe('Error Inheritance', () => {
  test('all error classes extend OmegaError', () => {
    expect(new OmegaConfigError('msg')).toBeInstanceOf(OmegaError);
    expect(new OmegaValidationError('msg')).toBeInstanceOf(OmegaError);
    expect(new OmegaTimeoutError('msg')).toBeInstanceOf(OmegaError);
    expect(new OmegaNotImplementedError('feature')).toBeInstanceOf(OmegaError);
    expect(new OmegaInvariantError('inv')).toBeInstanceOf(OmegaError);
  });

  test('all error classes extend Error', () => {
    expect(new OmegaConfigError('msg')).toBeInstanceOf(Error);
    expect(new OmegaValidationError('msg')).toBeInstanceOf(Error);
    expect(new OmegaTimeoutError('msg')).toBeInstanceOf(Error);
    expect(new OmegaNotImplementedError('feature')).toBeInstanceOf(Error);
    expect(new OmegaInvariantError('inv')).toBeInstanceOf(Error);
  });
});
