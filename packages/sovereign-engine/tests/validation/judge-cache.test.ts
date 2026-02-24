/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — JudgeCache Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase VALIDATION — LLM Judge Cache
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { JudgeCache } from '../../src/validation/judge-cache.js';
import { sha256 } from '@omega/canon-kernel';

describe('JudgeCache — Phase VALIDATION', () => {
  let tmpDir: string;
  let cachePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-cache-test-'));
    cachePath = path.join(tmpDir, 'judge-cache.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // T01: set/get deterministic
  it('T01: set/get — same key returns same value', () => {
    const cache = new JudgeCache(cachePath);
    const key = sha256('interiorite' + 'some prose text' + 'seed_001');

    cache.set(key, { score: 0.85, reason: 'deep interiority' });
    const result = cache.get(key);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(0.85);
    expect(result!.reason).toBe('deep interiority');
  });

  // T02: persist to disk + reload
  it('T02: persist to disk + reload from new instance', () => {
    const cache1 = new JudgeCache(cachePath);
    const key = sha256('impact' + 'prose text' + 'seed_002');

    cache1.set(key, { score: 0.72, reason: 'strong emotional impact' });
    cache1.persist();

    // Verify file exists
    expect(fs.existsSync(cachePath)).toBe(true);

    // Create new instance, load from disk
    const cache2 = new JudgeCache(cachePath);
    const result = cache2.get(key);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(0.72);
    expect(result!.reason).toBe('strong emotional impact');
  });

  // T03: hit rate calculable
  it('T03: hit rate tracking — hits / (hits + misses)', () => {
    const cache = new JudgeCache(cachePath);
    const key1 = sha256('axis1');
    const key2 = sha256('axis2');
    const key3 = sha256('axis3');

    cache.set(key1, { score: 0.5, reason: 'ok' });

    cache.get(key1); // HIT
    cache.get(key2); // MISS
    cache.get(key3); // MISS

    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(1 / 3, 4);
    expect(stats.entries).toBe(1);
  });
});
