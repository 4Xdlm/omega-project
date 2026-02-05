import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const PACK_DIR = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK');
const MANIFEST_DIR = path.join(PACK_DIR, 'MANIFEST');

describe('B5: Manifest & ZIP', () => {
  it('BLUEPRINT_MANIFEST.sha256 exists and has entries', async () => {
    const manifestPath = path.join(MANIFEST_DIR, 'BLUEPRINT_MANIFEST.sha256');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    expect(lines.length).toBeGreaterThan(50);

    // Check format: <sha256>  <path>
    for (const line of lines.slice(0, 5)) {
      expect(line).toMatch(/^[a-f0-9]{64}\s{2}.+$/);
    }
  });

  it('INV-BP-09: Manifest entries are sorted alphabetically', async () => {
    const manifestPath = path.join(MANIFEST_DIR, 'BLUEPRINT_MANIFEST.sha256');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    // Extract paths from each line
    const paths = lines.map(line => line.split(/\s{2}/)[1]);
    const sorted = [...paths].sort();

    expect(paths).toEqual(sorted);
  });

  it('LEGAL_EVIDENCE.md exists with required sections', async () => {
    const legalPath = path.join(MANIFEST_DIR, 'LEGAL_EVIDENCE.md');
    const content = await fs.readFile(legalPath, 'utf-8');

    expect(content).toContain('6595bc99');
    expect(content.toLowerCase()).toContain('commit');
    expect(content.toLowerCase()).toContain('method');
    expect(content.toLowerCase()).toContain('exclusion');
  });

  it('REPRO_NOTES.md has all passes marked complete', async () => {
    const reproPath = path.join(MANIFEST_DIR, 'REPRO_NOTES.md');
    const content = await fs.readFile(reproPath, 'utf-8');

    expect(content).toContain('[x] B0');
    expect(content).toContain('[x] B1');
    expect(content).toContain('[x] B2');
    expect(content).toContain('[x] B3');
    expect(content).toContain('[x] B4');
    expect(content).toContain('[x] B5');
  });

  it('ZIP archive exists', async () => {
    const zipPath = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK_6595bc99.zip');
    const exists = await fs.access(zipPath).then(() => true).catch(() => false);
    expect(exists, 'ZIP archive should exist').toBe(true);

    // Check it has reasonable size
    const stats = await fs.stat(zipPath);
    expect(stats.size).toBeGreaterThan(10000);
  });
});
