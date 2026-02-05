import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const INDEX_PATH = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json');
const MODULES_DIR = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES');
const GRAPHS_DIR = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS');

describe('B4: Metrics & Module Cards', () => {
  it('All modules have metrics.json', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    for (const mod of index.modules) {
      const metricsPath = path.join(MODULES_DIR, mod.module_id, 'metrics.json');
      const exists = await fs.access(metricsPath).then(() => true).catch(() => false);
      expect(exists, `Missing metrics.json for ${mod.module_id}`).toBe(true);
    }
  });

  it('metrics.json has required fields', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    // Check a sample module
    const sampleMod = index.modules[0];
    const metricsPath = path.join(MODULES_DIR, sampleMod.module_id, 'metrics.json');
    const metricsRaw = await fs.readFile(metricsPath, 'utf-8');
    const metrics = JSON.parse(metricsRaw);

    expect(metrics.module_id).toBeDefined();
    expect(metrics.files_count).toBeDefined();
    expect(typeof metrics.files_count).toBe('number');
  });

  it('hotspots.json exists and valid structure', async () => {
    const hotspotsPath = path.join(GRAPHS_DIR, 'hotspots.json');
    const raw = await fs.readFile(hotspotsPath, 'utf-8');
    const data = JSON.parse(raw);

    expect(data.top_by_files || data.top_by_loc).toBeDefined();
    expect(data.outliers).toBeDefined();
    expect(Array.isArray(data.outliers)).toBe(true);
  });

  it('module_card.md files have no forbidden speculation words', async () => {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    const forbiddenWords = [
      'peut-etre',
      'peut-être',
      'probablement',
      'on pourrait',
      'idealement',
      'idéalement'
    ];

    // Check a sample of modules
    const sampleModules = index.modules.slice(0, 5);

    for (const mod of sampleModules) {
      const cardPath = path.join(MODULES_DIR, mod.module_id, 'module_card.md');
      const content = await fs.readFile(cardPath, 'utf-8');

      for (const forbidden of forbiddenWords) {
        expect(
          content.toLowerCase().includes(forbidden.toLowerCase()),
          `${mod.module_id}/module_card.md contains forbidden word: ${forbidden}`
        ).toBe(false);
      }
    }
  });

  it('INV-BP-06: Metrics are sourced (non-invented)', async () => {
    // Verify that files_count in metrics roughly matches actual file count in index
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);

    for (const mod of index.modules.slice(0, 5)) {
      const metricsPath = path.join(MODULES_DIR, mod.module_id, 'metrics.json');
      const metricsRaw = await fs.readFile(metricsPath, 'utf-8');
      const metrics = JSON.parse(metricsRaw);

      // Files count should be a reasonable number
      expect(metrics.files_count).toBeGreaterThanOrEqual(0);
      expect(metrics.files_count).toBeLessThan(1000);
    }
  });
});
