/**
 * OMEGA — CHAOS PROVIDER TESTS
 * Phase: PR-3 | Invariant: INV-FAILCLOSED-01
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createChaosProvider,
  CHAOS_PROFILES,
  type ScribeProvider,
  type ChaosConfig,
} from '../../src/pr/chaos-provider.js';

const TEST_DIR = join(process.cwd(), '.test-chaos-pr3');
const TEST_LOG = join(TEST_DIR, 'chaos-log.json');

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

const mockProvider: ScribeProvider = {
  mode: 'mock',
  generateSceneProse: () => ({ prose: 'normal prose', mode: 'mock' }),
};

describe('Chaos Provider — Deterministic Injection', () => {
  it('is deterministic with same seed', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 0.5,
      failure_types: ['rate_limit_429'],
      seed: 42,
    };

    const chaos1 = createChaosProvider(mockProvider, config);
    const chaos2 = createChaosProvider(mockProvider, config);

    const results1: boolean[] = [];
    const results2: boolean[] = [];

    for (let i = 0; i < 10; i++) {
      try {
        chaos1.generateSceneProse('test', { sceneId: `SCN-${i}` });
        results1.push(false); // no error
      } catch {
        results1.push(true); // error injected
      }

      try {
        chaos2.generateSceneProse('test', { sceneId: `SCN-${i}` });
        results2.push(false);
      } catch {
        results2.push(true);
      }
    }

    expect(results1).toEqual(results2);
  });

  it('injects failures at specified rate', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 0.5,
      failure_types: ['rate_limit_429'],
      seed: 42,
    };

    const chaos = createChaosProvider(mockProvider, config);
    let injected = 0;
    const trials = 100;

    for (let i = 0; i < trials; i++) {
      try {
        chaos.generateSceneProse('test', { sceneId: `SCN-${i}` });
      } catch {
        injected++;
      }
    }

    // Should be roughly 50% ± tolerance
    expect(injected).toBeGreaterThan(30);
    expect(injected).toBeLessThan(70);
  });
});

describe('Chaos Provider — Failure Modes', () => {
  it('injects rate_limit_429', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 1.0,
      failure_types: ['rate_limit_429'],
      seed: 42,
    };

    const chaos = createChaosProvider(mockProvider, config);

    expect(() => {
      chaos.generateSceneProse('test', { sceneId: 'SCN-01' });
    }).toThrow(/429/);
  });

  it('injects timeout', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 1.0,
      failure_types: ['timeout'],
      seed: 43,
    };

    const chaos = createChaosProvider(mockProvider, config);

    expect(() => {
      chaos.generateSceneProse('test', { sceneId: 'SCN-01' });
    }).toThrow(/timeout/);
  });

  it('injects invalid_json', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 1.0,
      failure_types: ['invalid_json'],
      seed: 44,
    };

    const chaos = createChaosProvider(mockProvider, config);

    expect(() => {
      chaos.generateSceneProse('test', { sceneId: 'SCN-01' });
    }).toThrow(/invalid JSON/);
  });

  it('injects api_error_500', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 1.0,
      failure_types: ['api_error_500'],
      seed: 45,
    };

    const chaos = createChaosProvider(mockProvider, config);

    expect(() => {
      chaos.generateSceneProse('test', { sceneId: 'SCN-01' });
    }).toThrow(/500/);
  });

  it('injects network_error', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 1.0,
      failure_types: ['network_error'],
      seed: 46,
    };

    const chaos = createChaosProvider(mockProvider, config);

    expect(() => {
      chaos.generateSceneProse('test', { sceneId: 'SCN-01' });
    }).toThrow(/network error/);
  });

  it('injects empty_response (GAP-3A)', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 1.0,
      failure_types: ['empty_response'],
      seed: 47,
    };

    const chaos = createChaosProvider(mockProvider, config);

    const result = chaos.generateSceneProse('test', { sceneId: 'SCN-01' });

    expect(result.prose).toBe('');
    expect(result.mode).toBe('chaos-empty');
  });
});

describe('Chaos Provider — Chaos Log (GAP-3B)', () => {
  it('writes chaos log when logPath specified', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 0.5,
      failure_types: ['rate_limit_429'],
      seed: 42,
      logPath: TEST_LOG,
    };

    const chaos = createChaosProvider(mockProvider, config);

    for (let i = 0; i < 5; i++) {
      try {
        chaos.generateSceneProse('test', { sceneId: `SCN-${i}` });
      } catch {
        // Expected
      }
    }

    expect(existsSync(TEST_LOG)).toBe(true);

    const log = JSON.parse(readFileSync(TEST_LOG, 'utf8'));
    expect(log.entries).toHaveLength(5);
    expect(log.entries[0]).toHaveProperty('call_index');
    expect(log.entries[0]).toHaveProperty('scene_id');
    expect(log.entries[0]).toHaveProperty('injected');
  });

  it('log contains failure_type when injected', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 1.0,
      failure_types: ['timeout'],
      seed: 42,
      logPath: TEST_LOG,
    };

    const chaos = createChaosProvider(mockProvider, config);

    try {
      chaos.generateSceneProse('test', { sceneId: 'SCN-01' });
    } catch {
      // Expected
    }

    const log = JSON.parse(readFileSync(TEST_LOG, 'utf8'));
    expect(log.entries[0].injected).toBe(true);
    expect(log.entries[0].failure_type).toBe('timeout');
  });

  it('log contains no failure_type when not injected', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 0.0,
      failure_types: ['timeout'],
      seed: 42,
      logPath: TEST_LOG,
    };

    const chaos = createChaosProvider(mockProvider, config);

    chaos.generateSceneProse('test', { sceneId: 'SCN-01' });

    const log = JSON.parse(readFileSync(TEST_LOG, 'utf8'));
    expect(log.entries[0].injected).toBe(false);
    expect(log.entries[0].failure_type).toBeUndefined();
  });
});

describe('Chaos Provider — Profiles', () => {
  it('has light profile', () => {
    expect(CHAOS_PROFILES.light.CHAOS_RATE).toBe(0.05);
    expect(CHAOS_PROFILES.light.failure_types).toContain('rate_limit_429');
  });

  it('has medium profile', () => {
    expect(CHAOS_PROFILES.medium.CHAOS_RATE).toBe(0.15);
    expect(CHAOS_PROFILES.medium.failure_types).toContain('timeout');
  });

  it('has heavy profile', () => {
    expect(CHAOS_PROFILES.heavy.CHAOS_RATE).toBe(0.30);
    expect(CHAOS_PROFILES.heavy.failure_types).toContain('empty_response');
  });

  it('has hellfire profile', () => {
    expect(CHAOS_PROFILES.hellfire.CHAOS_RATE).toBe(0.50);
    expect(CHAOS_PROFILES.hellfire.failure_types.length).toBe(6);
  });
});

describe('Chaos Provider — Mode Wrapping', () => {
  it('wraps inner provider mode', () => {
    const config: ChaosConfig = {
      CHAOS_RATE: 0.0,
      failure_types: [],
      seed: 42,
    };

    const chaos = createChaosProvider(mockProvider, config);

    expect(chaos.mode).toBe('chaos(mock)');
  });
});
