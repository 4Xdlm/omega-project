/**
 * OMEGA Governance — Baseline Registry Tests
 * Phase F — INV-F-08: Baselines are immutable once registered
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir } from '../../fixtures/helpers.js';
import {
  readRegistry, writeRegistry, findBaseline,
  listBaselines, baselineExists, validateBaselinePath,
} from '../../../src/ci/baseline/registry.js';
import type { BaselineRegistry, BaselineEntry } from '../../../src/ci/baseline/types.js';

describe('Baseline Registry', () => {
  let baselinesDir: string;

  beforeEach(() => {
    baselinesDir = createTempDir('baselines');
  });

  describe('readRegistry', () => {
    it('returns empty registry when no file exists', () => {
      const registry = readRegistry(baselinesDir);
      expect(registry.baselines).toHaveLength(0);
      expect(registry.version).toBe('1.0.0');
    });

    it('reads existing registry file', () => {
      const data: BaselineRegistry = {
        version: '1.0.0',
        baselines: [{ version: 'v1.0.0', path: 'baselines/v1.0.0', created_at: '2026-01-01T00:00:00Z', manifest_hash: 'abc', certified: true, intents: [] }],
        updated_at: '2026-01-01T00:00:00Z',
      };
      writeFileSync(join(baselinesDir, 'registry.json'), JSON.stringify(data), 'utf-8');
      const registry = readRegistry(baselinesDir);
      expect(registry.baselines).toHaveLength(1);
      expect(registry.baselines[0].version).toBe('v1.0.0');
    });
  });

  describe('writeRegistry', () => {
    it('writes registry to disk', () => {
      const registry: BaselineRegistry = {
        version: '1.0.0',
        baselines: [],
        updated_at: '2026-01-01T00:00:00Z',
      };
      writeRegistry(baselinesDir, registry);
      expect(existsSync(join(baselinesDir, 'registry.json'))).toBe(true);
    });
  });

  describe('findBaseline', () => {
    it('finds existing baseline by version', () => {
      const entry: BaselineEntry = { version: 'v1.0.0', path: 'baselines/v1.0.0', created_at: '2026-01-01', manifest_hash: 'abc', certified: true, intents: [] };
      const registry: BaselineRegistry = { version: '1.0.0', baselines: [entry], updated_at: '' };
      expect(findBaseline(registry, 'v1.0.0')).toEqual(entry);
    });

    it('returns null for missing version', () => {
      const registry: BaselineRegistry = { version: '1.0.0', baselines: [], updated_at: '' };
      expect(findBaseline(registry, 'v99.0.0')).toBeNull();
    });
  });

  describe('listBaselines', () => {
    it('returns all baselines', () => {
      const entries: BaselineEntry[] = [
        { version: 'v1.0.0', path: 'b/v1', created_at: '', manifest_hash: 'a', certified: true, intents: [] },
        { version: 'v2.0.0', path: 'b/v2', created_at: '', manifest_hash: 'b', certified: true, intents: [] },
      ];
      const registry: BaselineRegistry = { version: '1.0.0', baselines: entries, updated_at: '' };
      expect(listBaselines(registry)).toHaveLength(2);
    });
  });

  describe('baselineExists', () => {
    it('returns true for existing version', () => {
      const entry: BaselineEntry = { version: 'v1.0.0', path: '', created_at: '', manifest_hash: '', certified: true, intents: [] };
      const registry: BaselineRegistry = { version: '1.0.0', baselines: [entry], updated_at: '' };
      expect(baselineExists(registry, 'v1.0.0')).toBe(true);
    });

    it('returns false for missing version', () => {
      const registry: BaselineRegistry = { version: '1.0.0', baselines: [], updated_at: '' };
      expect(baselineExists(registry, 'v99')).toBe(false);
    });
  });

  describe('validateBaselinePath', () => {
    it('returns true when directory exists', () => {
      const entry: BaselineEntry = { version: 'v1.0.0', path: '', created_at: '', manifest_hash: '', certified: true, intents: [] };
      mkdirSync(join(baselinesDir, 'v1.0.0'), { recursive: true });
      expect(validateBaselinePath(baselinesDir, entry)).toBe(true);
    });

    it('returns false when directory missing', () => {
      const entry: BaselineEntry = { version: 'v99.0.0', path: '', created_at: '', manifest_hash: '', certified: true, intents: [] };
      expect(validateBaselinePath(baselinesDir, entry)).toBe(false);
    });
  });
});
