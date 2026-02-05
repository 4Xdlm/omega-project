import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const GRAPHS_DIR = path.join(REPO_ROOT, 'nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS');

describe('B3: Dependency Graph', () => {
  it('repo_deps.mmd exists and is Mermaid format', async () => {
    const mmdPath = path.join(GRAPHS_DIR, 'repo_deps.mmd');
    const content = await fs.readFile(mmdPath, 'utf-8');
    expect(content).toContain('graph');
    expect(content.length).toBeGreaterThan(100);
  });

  it('INV-BP-05: Text-only graphs (no binaries in GRAPHS/)', async () => {
    const entries = await fs.readdir(GRAPHS_DIR, { recursive: true });
    const binaries = entries.filter((f: string) =>
      /\.(png|svg|jpg|jpeg|gif|pdf|webp)$/i.test(f.toString())
    );
    expect(binaries, 'No binary files allowed in GRAPHS').toHaveLength(0);
  });

  it('module_deps directory exists with .mmd files', async () => {
    const modDepsDir = path.join(GRAPHS_DIR, 'module_deps');
    const exists = await fs.access(modDepsDir).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const files = await fs.readdir(modDepsDir);
    const mmdFiles = files.filter((f: string) => f.endsWith('.mmd'));
    expect(mmdFiles.length).toBeGreaterThan(0);
  });

  it('layering_report.json exists and has required structure', async () => {
    const reportPath = path.join(GRAPHS_DIR, 'layering_report.json');
    const raw = await fs.readFile(reportPath, 'utf-8');
    const data = JSON.parse(raw);

    expect(data.rules).toBeDefined();
    expect(Array.isArray(data.rules)).toBe(true);
    expect(data.violations).toBeDefined();
    expect(Array.isArray(data.violations)).toBe(true);
    expect(data.metrics).toBeDefined();
    expect(data.metrics.total_nodes).toBeGreaterThan(0);
  });

  it('INV-BP-08: No boundary violations in layering report', async () => {
    const reportPath = path.join(GRAPHS_DIR, 'layering_report.json');
    const raw = await fs.readFile(reportPath, 'utf-8');
    const data = JSON.parse(raw);

    // Filter for critical violations (not warnings)
    const criticalViolations = data.violations.filter(
      (v: { severity: string }) => v.severity === 'CRITICAL'
    );
    expect(criticalViolations, 'No critical boundary violations allowed').toHaveLength(0);
  });
});
