/**
 * Tests for golden-loader.ts — Golden run loading
 */

import { describe, it, expect } from 'vitest';
import { loadGoldenRun } from '../../src/runtime/golden-loader.js';
import * as path from 'node:path';

const GOLDEN_RUN_PATH = path.resolve(
  process.cwd(),
  '../../golden/e2e/run_001/runs/13535cccff86620f',
);

describe('loadGoldenRun', () => {
  it('loads golden run and constructs ForgePacketInput', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-RUN-001');

    expect(result).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.scene).toBeDefined();
    expect(result.style_profile).toBeDefined();
    expect(result.kill_lists).toBeDefined();
    expect(result.canon).toBeDefined();
    expect(result.continuity).toBeDefined();
    expect(result.run_id).toBe('TEST-RUN-001');
  });

  it('extracts correct scene at index 0', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-RUN-002');

    expect(result.scene.scene_id).toBeDefined();
    expect(result.scene.beats).toBeDefined();
    expect(result.scene.beats.length).toBeGreaterThan(0);
  });

  it('throws on invalid runPath', () => {
    expect(() => {
      loadGoldenRun('/nonexistent/path', 0, 'TEST-RUN-003');
    }).toThrow('Golden run path not found');
  });

  it('throws on invalid sceneIndex', () => {
    expect(() => {
      loadGoldenRun(GOLDEN_RUN_PATH, 999, 'TEST-RUN-004');
    }).toThrow('Scene index');
  });

  it('builds StyleProfile from genome', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-RUN-005');

    expect(result.style_profile.version).toBe('1.0.0');
    expect(result.style_profile.universe).toBe('golden-run');
    expect(result.style_profile.lexicon).toBeDefined();
    expect(result.style_profile.rhythm).toBeDefined();
    expect(result.style_profile.tone).toBeDefined();
    expect(result.style_profile.imagery).toBeDefined();
  });

  it('builds KillLists from constraints', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-RUN-006');

    expect(result.kill_lists.banned_words).toBeDefined();
    expect(Array.isArray(result.kill_lists.banned_words)).toBe(true);
    expect(result.kill_lists.banned_cliches).toBeDefined();
    expect(result.kill_lists.banned_ai_patterns).toBeDefined();
    expect(result.kill_lists.banned_filter_words).toBeDefined();
  });

  it('canon entries are loaded from intent.json', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-RUN-007');

    expect(Array.isArray(result.canon)).toBe(true);
    expect(result.canon.length).toBeGreaterThan(0);
    expect(result.canon[0]).toHaveProperty('id');
    expect(result.canon[0]).toHaveProperty('statement');
  });

  it('continuity is empty for first scene', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-RUN-008');

    expect(result.continuity.previous_scene_summary).toBe('');
    expect(result.continuity.character_states).toEqual([]);
    expect(result.continuity.open_threads).toEqual([]);
  });
});
