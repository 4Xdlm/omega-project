/**
 * OMEGA — RETRY PROVIDER TESTS
 * Phase: PR-3 | Invariant: INV-RETRY-BOUND-01
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyError,
  loadRetryConfigFromCalibration,
  createRetryProvider,
  type ScribeProvider,
  type ScribeContext,
} from '../../src/pr/retry-provider.js';

const TEST_DIR = join(process.cwd(), '.test-retry-pr3');
const TEST_CALIBRATION = join(TEST_DIR, 'calibration.json');

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('Retry Provider — Error Classification', () => {
  it('classifies rate limit as transient', () => {
    expect(classifyError(new Error('Rate limit exceeded 429'))).toBe('transient');
    expect(classifyError(new Error('rate limit'))).toBe('transient');
  });

  it('classifies timeout as transient', () => {
    expect(classifyError(new Error('Request timeout'))).toBe('transient');
    expect(classifyError(new Error('ETIMEDOUT'))).toBe('transient');
  });

  it('classifies network errors as transient', () => {
    expect(classifyError(new Error('ECONNRESET'))).toBe('transient');
    expect(classifyError(new Error('503 Service Unavailable'))).toBe('transient');
  });

  it('classifies auth errors as permanent', () => {
    expect(classifyError(new Error('401 Unauthorized'))).toBe('permanent');
    expect(classifyError(new Error('Invalid API key'))).toBe('permanent');
  });

  it('classifies bad request as permanent', () => {
    expect(classifyError(new Error('400 Bad Request'))).toBe('permanent');
    expect(classifyError(new Error('404 Not Found'))).toBe('permanent');
  });

  it('classifies unknown errors', () => {
    expect(classifyError(new Error('Something weird'))).toBe('unknown');
    expect(classifyError('not an error object')).toBe('unknown');
  });
});

describe('Retry Provider — Config Loading (GAP-3D)', () => {
  it('loads config from calibration.json', () => {
    const calibration = {
      BACKOFF_BASE_MS: 500,
      BACKOFF_MAX_MS: 15000,
      MAX_RETRIES: 5,
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(calibration));

    const config = loadRetryConfigFromCalibration(TEST_CALIBRATION);

    expect(config.baseBackoffMs).toBe(500);
    expect(config.maxBackoffMs).toBe(15000);
    expect(config.maxRetries).toBe(5);
  });

  it('uses defaults if calibration not found', () => {
    const config = loadRetryConfigFromCalibration('/nonexistent/calibration.json');

    expect(config.baseBackoffMs).toBe(1000);
    expect(config.maxBackoffMs).toBe(30000);
    expect(config.maxRetries).toBe(3);
  });

  it('handles partial calibration', () => {
    const calibration = {
      BACKOFF_BASE_MS: 2000,
      // Missing BACKOFF_MAX_MS and MAX_RETRIES
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(calibration));

    const config = loadRetryConfigFromCalibration(TEST_CALIBRATION);

    expect(config.baseBackoffMs).toBe(2000);
    expect(config.maxBackoffMs).toBe(30000); // default
    expect(config.maxRetries).toBe(3); // default
  });
});

describe('Retry Provider — Retry Logic', () => {
  it('succeeds immediately if no error', () => {
    const mockProvider: ScribeProvider = {
      mode: 'mock',
      generateSceneProse: () => ({ prose: 'success', mode: 'mock' }),
    };

    const retryProvider = createRetryProvider(mockProvider, {
      baseBackoffMs: 10,
      maxBackoffMs: 100,
      maxRetries: 2,
    });

    const result = retryProvider.generateSceneProse('test prompt', { sceneId: 'SCN-01' });
    expect(result.prose).toBe('success');
  });

  it('throws immediately on permanent error', () => {
    let callCount = 0;
    const mockProvider: ScribeProvider = {
      mode: 'mock',
      generateSceneProse: () => {
        callCount++;
        throw new Error('401 Unauthorized');
      },
    };

    const retryProvider = createRetryProvider(mockProvider, {
      baseBackoffMs: 10,
      maxBackoffMs: 100,
      maxRetries: 3,
    });

    expect(() => {
      retryProvider.generateSceneProse('test prompt', { sceneId: 'SCN-01' });
    }).toThrow(/401 Unauthorized/);

    // Should not retry permanent errors
    expect(callCount).toBe(1);
  });

  it('retries on transient error and eventually succeeds', () => {
    let callCount = 0;
    const mockProvider: ScribeProvider = {
      mode: 'mock',
      generateSceneProse: () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Rate limit 429');
        }
        return { prose: 'success after retries', mode: 'mock' };
      },
    };

    const retryProvider = createRetryProvider(mockProvider, {
      baseBackoffMs: 10,
      maxBackoffMs: 100,
      maxRetries: 3,
    });

    const result = retryProvider.generateSceneProse('test prompt', { sceneId: 'SCN-01' });
    expect(result.prose).toBe('success after retries');
    expect(callCount).toBe(3);
  });

  it('exhausts retries on persistent transient error', () => {
    let callCount = 0;
    const mockProvider: ScribeProvider = {
      mode: 'mock',
      generateSceneProse: () => {
        callCount++;
        throw new Error('Timeout');
      },
    };

    const retryProvider = createRetryProvider(mockProvider, {
      baseBackoffMs: 10,
      maxBackoffMs: 100,
      maxRetries: 2,
    });

    expect(() => {
      retryProvider.generateSceneProse('test prompt', { sceneId: 'SCN-01' });
    }).toThrow(/Timeout/);

    // 1 initial + 2 retries = 3 calls
    expect(callCount).toBe(3);
  });
});

describe('Retry Provider — Mode Wrapping', () => {
  it('wraps inner provider mode', () => {
    const mockProvider: ScribeProvider = {
      mode: 'llm',
      generateSceneProse: () => ({ prose: 'test', mode: 'llm' }),
    };

    const retryProvider = createRetryProvider(mockProvider);

    expect(retryProvider.mode).toBe('retry(llm)');
  });
});

describe('Retry Provider — Determinism', () => {
  it('is deterministic with same input', () => {
    const mockProvider: ScribeProvider = {
      mode: 'mock',
      generateSceneProse: () => ({ prose: 'deterministic', mode: 'mock' }),
    };

    const retryProvider = createRetryProvider(mockProvider);

    const result1 = retryProvider.generateSceneProse('test', { sceneId: 'SCN-01' });
    const result2 = retryProvider.generateSceneProse('test', { sceneId: 'SCN-01' });

    expect(result1.prose).toBe(result2.prose);
  });
});
