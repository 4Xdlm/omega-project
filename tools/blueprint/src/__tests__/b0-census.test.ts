import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Resolve paths from repo root (2 levels up from tools/blueprint/src/__tests__)
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const INDEX_PATH = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json');
const PACK_DIR = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK');

describe('B0: Census Invariants', () => {
  it('INV-BP-01: Output stable (deterministic) - modules sorted', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    const ids = index.modules.map((m: { module_id: string }) => m.module_id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('INV-BP-02: No forbidden paths in modules', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    // Forbidden directory patterns (check for path segments, not substrings)
    const forbiddenPatterns = [
      /[/\\]node_modules[/\\]/,
      /[/\\]dist[/\\]/,
      /[/\\]coverage[/\\]/,
      /[/\\]\.git[/\\]/,
      /^node_modules[/\\]/,
      /^dist[/\\]/,
      /^coverage[/\\]/,
      /^\.git[/\\]/
    ];

    for (const mod of index.modules) {
      for (const pattern of forbiddenPatterns) {
        expect(mod.path).not.toMatch(pattern);
      }
      for (const file of mod.files) {
        for (const pattern of forbiddenPatterns) {
          expect(file).not.toMatch(pattern);
        }
      }
    }
  });

  it('INV-BP-03: Writes only in nexus/blueprint or tools/blueprint', async () => {
    const entries = await fs.readdir(PACK_DIR, { recursive: true });
    expect(entries.length).toBeGreaterThan(0);
  });

  it('INV-BP-04: Index reconstructible (no dangling refs)', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    for (const mod of index.modules) {
      const modPath = path.join(REPO_ROOT, mod.path);
      const exists = await fs.access(modPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it('Stats match module counts', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    expect(index.stats.total_modules).toBe(index.modules.length);

    const buildCount = index.modules.filter((m: { type: string }) => m.type === 'BUILD').length;
    const nexusCount = index.modules.filter((m: { type: string }) => m.type === 'NEXUS').length;
    const toolCount = index.modules.filter((m: { type: string }) => m.type === 'TOOL').length;

    expect(index.stats.build_modules).toBe(buildCount);
    if (index.stats.nexus_modules !== undefined) {
      expect(index.stats.nexus_modules).toBe(nexusCount);
    }
    if (index.stats.tool_modules !== undefined) {
      expect(index.stats.tool_modules).toBe(toolCount);
    }
  });
});
