// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS ERRORS
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-WIRE-04: Erreurs = NexusError (error_code, pas de stack leak)
// @invariant INV-ADP-05: Jamais de path local, stack, secrets
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  err,
  envelopeError,
  wiringError,
  adapterError,
  EnvelopeErrors,
  WiringErrors,
  safeError,
  safeExecute,
  EnvelopeErrorCodes,
  WiringErrorCodes,
  AdapterErrorCodes,
} from '../src/errors.js';
import type { NexusError } from '../src/types.js';

describe('Error Factory', () => {
  describe('err()', () => {
    it('creates NexusError with all fields', () => {
      const error = err('test-module', 'TEST_CODE', 'Test message', true);
      expect(error).toEqual({
        module: 'test-module',
        error_code: 'TEST_CODE',
        message: 'Test message',
        retryable: true,
      });
    });

    it('defaults retryable to false', () => {
      const error = err('mod', 'CODE', 'msg');
      expect(error.retryable).toBe(false);
    });
  });

  describe('envelopeError()', () => {
    it('creates error with module "envelope"', () => {
      const error = envelopeError('ENV_TEST', 'Test');
      expect(error.module).toBe('envelope');
      expect(error.error_code).toBe('ENV_TEST');
      expect(error.retryable).toBe(false);
    });
  });

  describe('wiringError()', () => {
    it('creates error with module "wiring"', () => {
      const error = wiringError('WIRE_TEST', 'Test', true);
      expect(error.module).toBe('wiring');
      expect(error.error_code).toBe('WIRE_TEST');
      expect(error.retryable).toBe(true);
    });
  });

  describe('adapterError()', () => {
    it('creates error with custom module', () => {
      const error = adapterError('memory_adapter', 'MEM_ERR', 'Memory error', false);
      expect(error.module).toBe('memory_adapter');
      expect(error.error_code).toBe('MEM_ERR');
      expect(error.retryable).toBe(false);
    });
  });
});

describe('Pre-defined Errors', () => {
  describe('EnvelopeErrors', () => {
    it('invalidEnvelope returns stable error', () => {
      const e1 = EnvelopeErrors.invalidEnvelope();
      const e2 = EnvelopeErrors.invalidEnvelope();
      expect(e1).toEqual(e2);
      expect(e1.error_code).toBe(EnvelopeErrorCodes.INVALID_ENVELOPE);
    });

    it('unknownField includes field name', () => {
      const error = EnvelopeErrors.unknownField('extra_field');
      expect(error.message).toContain('extra_field');
      expect(error.error_code).toBe(EnvelopeErrorCodes.UNKNOWN_FIELD);
    });

    it('missingField includes field name', () => {
      const error = EnvelopeErrors.missingField('message_id');
      expect(error.message).toContain('message_id');
    });

    it('badKind includes the invalid kind', () => {
      const error = EnvelopeErrors.badKind('invalid');
      expect(error.message).toContain('invalid');
    });
  });

  describe('WiringErrors', () => {
    it('noHandler includes target and schema', () => {
      const error = WiringErrors.noHandler('memory', 'write');
      expect(error.message).toContain('memory');
      expect(error.message).toContain('write');
      expect(error.error_code).toBe(WiringErrorCodes.NO_HANDLER);
    });

    it('versionMismatch includes versions', () => {
      const error = WiringErrors.versionMismatch('v1.0.0', 'v2.0.0');
      expect(error.message).toContain('v1.0.0');
      expect(error.message).toContain('v2.0.0');
    });

    it('replayBlocked is not retryable', () => {
      const error = WiringErrors.replayBlocked();
      expect(error.retryable).toBe(false);
    });

    it('dispatchFailed is retryable', () => {
      const error = WiringErrors.dispatchFailed();
      expect(error.retryable).toBe(true);
    });
  });
});

describe('Error Codes', () => {
  describe('EnvelopeErrorCodes', () => {
    it('has all expected codes', () => {
      expect(EnvelopeErrorCodes.INVALID_ENVELOPE).toBe('ENV_INVALID');
      expect(EnvelopeErrorCodes.UNKNOWN_FIELD).toBe('ENV_UNKNOWN_FIELD');
      expect(EnvelopeErrorCodes.MISSING_FIELD).toBe('ENV_MISSING_FIELD');
      expect(EnvelopeErrorCodes.BAD_TIMESTAMP).toBe('ENV_BAD_TIMESTAMP');
      expect(EnvelopeErrorCodes.BAD_SCHEMA).toBe('ENV_BAD_SCHEMA');
      expect(EnvelopeErrorCodes.NO_REPLAY_KEY).toBe('ENV_NO_REPLAY_KEY');
    });
  });

  describe('WiringErrorCodes', () => {
    it('has all expected codes', () => {
      expect(WiringErrorCodes.NO_HANDLER).toBe('WIRE_NO_HANDLER');
      expect(WiringErrorCodes.POLICY_REJECT).toBe('WIRE_POLICY_REJECT');
      expect(WiringErrorCodes.VERSION_MISMATCH).toBe('WIRE_VERSION_MISMATCH');
      expect(WiringErrorCodes.REPLAY_BLOCKED).toBe('WIRE_REPLAY_BLOCKED');
    });
  });

  describe('AdapterErrorCodes', () => {
    it('has memory error codes', () => {
      expect(AdapterErrorCodes.MEMORY_WRITE_FAILED).toBe('ADP_MEM_WRITE_FAILED');
      expect(AdapterErrorCodes.MEMORY_READ_FAILED).toBe('ADP_MEM_READ_FAILED');
    });

    it('has query error codes', () => {
      expect(AdapterErrorCodes.QUERY_FAILED).toBe('ADP_QRY_FAILED');
      expect(AdapterErrorCodes.QUERY_TIMEOUT).toBe('ADP_QRY_TIMEOUT');
    });

    it('has generic error codes', () => {
      expect(AdapterErrorCodes.INTERNAL_ERROR).toBe('ADP_INTERNAL_ERROR');
      expect(AdapterErrorCodes.UNSUPPORTED_SCHEMA).toBe('ADP_UNSUPPORTED_SCHEMA');
    });
  });
});

describe('INV-ADP-05: No information leak', () => {
  describe('safeError()', () => {
    it('never exposes native error message', () => {
      const nativeError = new Error('SECRET PATH: C:\\Users\\admin\\secrets.txt');
      const safe = safeError(nativeError, 'test', 'TEST_ERROR');
      
      expect(safe.message).not.toContain('SECRET');
      expect(safe.message).not.toContain('C:\\');
      expect(safe.message).not.toContain('Users');
      expect(safe.message).toBe('An internal error occurred');
    });

    it('never exposes stack trace', () => {
      const nativeError = new Error('test');
      nativeError.stack = 'at secret_function (secret_file.ts:42)';
      const safe = safeError(nativeError, 'test', 'TEST_ERROR');
      
      expect(JSON.stringify(safe)).not.toContain('stack');
      expect(JSON.stringify(safe)).not.toContain('secret_function');
    });

    it('handles non-Error objects', () => {
      const safe = safeError('string error', 'test', 'TEST_ERROR');
      expect(safe.message).toBe('An internal error occurred');
    });

    it('handles undefined', () => {
      const safe = safeError(undefined, 'test', 'TEST_ERROR');
      expect(safe.message).toBe('An internal error occurred');
    });

    it('handles null', () => {
      const safe = safeError(null, 'test', 'TEST_ERROR');
      expect(safe.message).toBe('An internal error occurred');
    });

    it('preserves module name', () => {
      const safe = safeError(new Error('x'), 'my_module', 'CODE');
      expect(safe.module).toBe('my_module');
    });

    it('preserves error code', () => {
      const safe = safeError(new Error('x'), 'mod', 'SPECIFIC_CODE');
      expect(safe.error_code).toBe('SPECIFIC_CODE');
    });

    it('defaults to retryable = true', () => {
      const safe = safeError(new Error('x'), 'mod', 'CODE');
      expect(safe.retryable).toBe(true);
    });

    it('allows setting retryable = false', () => {
      const safe = safeError(new Error('x'), 'mod', 'CODE', false);
      expect(safe.retryable).toBe(false);
    });
  });

  describe('safeExecute()', () => {
    it('returns ok on success', async () => {
      const result = await safeExecute(
        async () => 42,
        'test'
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('returns safe error on throw', async () => {
      const result = await safeExecute(
        async () => { throw new Error('SECRET_DATA'); },
        'test',
        'EXEC_FAILED'
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).not.toContain('SECRET');
        expect(result.error.error_code).toBe('EXEC_FAILED');
        expect(result.error.module).toBe('test');
      }
    });

    it('handles rejected promises', async () => {
      const result = await safeExecute(
        () => Promise.reject(new Error('REJECTED')),
        'test'
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).not.toContain('REJECTED');
      }
    });

    it('handles non-Error throws', async () => {
      const result = await safeExecute(
        async () => { throw 'string throw'; },
        'test'
      );
      expect(result.ok).toBe(false);
    });
  });
});

describe('Error determinism', () => {
  it('same error factory call produces identical error', () => {
    const errors: NexusError[] = [];
    for (let i = 0; i < 100; i++) {
      errors.push(EnvelopeErrors.invalidEnvelope());
    }
    const first = errors[0];
    for (const e of errors) {
      expect(e).toEqual(first);
    }
  });

  it('error with parameters is deterministic given same input', () => {
    const errors: NexusError[] = [];
    for (let i = 0; i < 100; i++) {
      errors.push(EnvelopeErrors.unknownField('test_field'));
    }
    const first = errors[0];
    for (const e of errors) {
      expect(e).toEqual(first);
    }
  });
});
