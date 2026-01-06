// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS TYPES
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  ok,
  fail,
  isOk,
  isErr,
  ENVELOPE_ALLOWED_FIELDS,
  ENVELOPE_REQUIRED_STRING_FIELDS,
} from '../src/types.js';
import type { NexusError, NexusResult } from '../src/types.js';

describe('Types Core', () => {
  describe('ok() helper', () => {
    it('creates NexusOk with value', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('works with complex objects', () => {
      const data = { foo: 'bar', nested: { a: 1 } };
      const result = ok(data);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual(data);
    });

    it('works with null', () => {
      const result = ok(null);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(null);
    });

    it('works with undefined', () => {
      const result = ok(undefined);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(undefined);
    });
  });

  describe('fail() helper', () => {
    it('creates NexusErr with error', () => {
      const error: NexusError = {
        module: 'test',
        error_code: 'TEST_ERROR',
        message: 'Test error message',
        retryable: false,
      };
      const result = fail(error);
      expect(result.ok).toBe(false);
      expect(result.error).toEqual(error);
    });

    it('preserves all error fields', () => {
      const error: NexusError = {
        module: 'memory',
        error_code: 'MEM_WRITE_FAILED',
        message: 'Write operation failed',
        retryable: true,
      };
      const result = fail(error);
      expect(result.ok).toBe(false);
      expect(result.error.module).toBe('memory');
      expect(result.error.error_code).toBe('MEM_WRITE_FAILED');
      expect(result.error.message).toBe('Write operation failed');
      expect(result.error.retryable).toBe(true);
    });
  });

  describe('isOk() type guard', () => {
    it('returns true for ok results', () => {
      const result: NexusResult<number> = ok(42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('returns false for fail results', () => {
      const error: NexusError = {
        module: 'test',
        error_code: 'E',
        message: 'm',
        retryable: false,
      };
      const result: NexusResult<number> = fail(error);
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr() type guard', () => {
    it('returns true for fail results', () => {
      const error: NexusError = {
        module: 'test',
        error_code: 'E',
        message: 'm',
        retryable: false,
      };
      const result: NexusResult<number> = fail(error);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('E');
      }
    });

    it('returns false for ok results', () => {
      const result: NexusResult<number> = ok(42);
      expect(isErr(result)).toBe(false);
    });
  });

  describe('ENVELOPE_ALLOWED_FIELDS', () => {
    it('contains all required fields', () => {
      const required = [
        'message_id', 'trace_id', 'timestamp', 'source_module',
        'target_module', 'kind', 'payload_schema', 'payload_version',
        'module_version', 'replay_protection_key', 'payload',
      ];
      for (const field of required) {
        expect(ENVELOPE_ALLOWED_FIELDS.has(field)).toBe(true);
      }
    });

    it('contains optional fields', () => {
      const optional = ['parent_span_id', 'auth_context', 'expected_previous_hash'];
      for (const field of optional) {
        expect(ENVELOPE_ALLOWED_FIELDS.has(field)).toBe(true);
      }
    });

    it('has exactly 14 fields', () => {
      expect(ENVELOPE_ALLOWED_FIELDS.size).toBe(14);
    });
  });

  describe('ENVELOPE_REQUIRED_STRING_FIELDS', () => {
    it('contains 9 required string fields', () => {
      expect(ENVELOPE_REQUIRED_STRING_FIELDS.length).toBe(9);
    });

    it('includes message_id and trace_id', () => {
      expect(ENVELOPE_REQUIRED_STRING_FIELDS).toContain('message_id');
      expect(ENVELOPE_REQUIRED_STRING_FIELDS).toContain('trace_id');
    });

    it('does NOT include timestamp (it is number)', () => {
      expect(ENVELOPE_REQUIRED_STRING_FIELDS).not.toContain('timestamp');
    });

    it('does NOT include optional fields', () => {
      expect(ENVELOPE_REQUIRED_STRING_FIELDS).not.toContain('parent_span_id');
      expect(ENVELOPE_REQUIRED_STRING_FIELDS).not.toContain('auth_context');
      expect(ENVELOPE_REQUIRED_STRING_FIELDS).not.toContain('expected_previous_hash');
    });
  });
});
