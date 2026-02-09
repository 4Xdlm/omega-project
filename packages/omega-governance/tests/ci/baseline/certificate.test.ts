/**
 * OMEGA Governance — Baseline Certificate Tests
 * Phase F
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir } from '../../fixtures/helpers.js';
import { generateBaselineCertificate, baselineCertificateToMarkdown } from '../../../src/ci/baseline/certificate.js';
import { registerBaseline } from '../../../src/ci/baseline/register.js';
import { readRegistry, findBaseline } from '../../../src/ci/baseline/registry.js';
import { readBaselineManifest } from '../../../src/ci/baseline/checker.js';
import { writeFileSync } from 'node:fs';
import type { BaselineThresholds } from '../../../src/ci/baseline/types.js';

function createRunDir(baseDir: string): string {
  const runDir = join(baseDir, 'run');
  mkdirSync(runDir, { recursive: true });
  const intent = join(runDir, 'intent_minimal');
  mkdirSync(intent, { recursive: true });
  writeFileSync(join(intent, 'intent.json'), JSON.stringify({ title: 'Minimal' }), 'utf-8');
  return runDir;
}

describe('Baseline Certificate', () => {
  let baselinesDir: string;
  const thresholds: BaselineThresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };

  beforeEach(() => {
    const tmp = createTempDir('cert');
    baselinesDir = join(tmp, 'baselines');
    mkdirSync(baselinesDir, { recursive: true });
    const runDir = createRunDir(tmp);
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, '2026-01-15T10:00:00.000Z');
  });

  it('generates certificate with valid signature', () => {
    const registry = readRegistry(baselinesDir);
    const entry = findBaseline(registry, 'v1.0.0')!;
    const manifest = readBaselineManifest(baselinesDir, 'v1.0.0');
    const cert = generateBaselineCertificate(entry, manifest);
    expect(cert.signature).toHaveLength(64);
    expect(cert.version).toBe('v1.0.0');
    expect(cert.certified).toBe(true);
  });

  it('certificate is deterministic (INV-F-10)', () => {
    const registry = readRegistry(baselinesDir);
    const entry = findBaseline(registry, 'v1.0.0')!;
    const manifest = readBaselineManifest(baselinesDir, 'v1.0.0');
    const cert1 = generateBaselineCertificate(entry, manifest);
    const cert2 = generateBaselineCertificate(entry, manifest);
    expect(cert1.signature).toBe(cert2.signature);
  });

  it('generates Markdown format', () => {
    const registry = readRegistry(baselinesDir);
    const entry = findBaseline(registry, 'v1.0.0')!;
    const manifest = readBaselineManifest(baselinesDir, 'v1.0.0');
    const cert = generateBaselineCertificate(entry, manifest);
    const md = baselineCertificateToMarkdown(cert);
    expect(md).toContain('OMEGA Baseline Certificate');
    expect(md).toContain('v1.0.0');
    expect(md).toContain(cert.signature);
  });

  it('includes intent count', () => {
    const registry = readRegistry(baselinesDir);
    const entry = findBaseline(registry, 'v1.0.0')!;
    const manifest = readBaselineManifest(baselinesDir, 'v1.0.0');
    const cert = generateBaselineCertificate(entry, manifest);
    expect(cert.intent_count).toBe(entry.intents.length);
  });
});
