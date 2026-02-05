import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const INDEX_PATH = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json');
const MODULES_DIR = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES');
const GRAPHS_DIR = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS');

describe('B1: AST Extraction', () => {
  it('All modules have api_surface.json', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    for (const mod of index.modules) {
      const apiPath = path.join(MODULES_DIR, mod.module_id, 'api_surface.json');
      const exists = await fs.access(apiPath).then(() => true).catch(() => false);
      expect(exists, `Missing api_surface.json for ${mod.module_id}`).toBe(true);
    }
  });

  it('INV-BP-05: Text-only graphs (no binaries)', async () => {
    const entries = await fs.readdir(GRAPHS_DIR, { recursive: true });
    const binaries = entries.filter((f: string) => /\.(png|svg|jpg|jpeg|gif|pdf)$/i.test(f.toString()));
    expect(binaries).toHaveLength(0);
  });

  it('types_map.json exists and is valid', async () => {
    const typesPath = path.join(GRAPHS_DIR, 'types_map.json');
    const raw = await fs.readFile(typesPath, 'utf-8');
    const data = JSON.parse(raw);
    expect(typeof data).toBe('object');
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  it('functions_map.json exists and is valid', async () => {
    const fnPath = path.join(GRAPHS_DIR, 'functions_map.json');
    const raw = await fs.readFile(fnPath, 'utf-8');
    const data = JSON.parse(raw);
    expect(typeof data).toBe('object');
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  it('Exports sorted alphabetically in api_surface.json', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    // Check a sample of modules
    const sampleModules = index.modules.slice(0, 5);

    for (const mod of sampleModules) {
      const apiPath = path.join(MODULES_DIR, mod.module_id, 'api_surface.json');
      const apiRaw = await fs.readFile(apiPath, 'utf-8');
      const api = JSON.parse(apiRaw);

      if (api.exports) {
        for (const key of ['classes', 'functions', 'types', 'interfaces']) {
          if (api.exports[key] && Array.isArray(api.exports[key])) {
            const arr = api.exports[key];
            const sorted = [...arr].sort();
            expect(arr, `${mod.module_id} exports.${key} not sorted`).toEqual(sorted);
          }
        }
      }
    }
  });
});
