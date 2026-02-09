/**
 * OMEGA Release — Builder Tests
 * Phase G.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildRelease } from '../../src/release/builder.js';
import type { ReleaseConfig } from '../../src/release/types.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('buildRelease', () => {
  const testDir = join(tmpdir(), 'omega-release-builder-test');
  const sourceDir = join(testDir, 'source');
  const outputDir = join(testDir, 'output');

  beforeEach(() => {
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, 'index.js'), 'module.exports = {}');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('builds for all platforms', () => {
    const config: ReleaseConfig = {
      version: '1.0.0',
      platforms: ['win-x64', 'linux-x64', 'macos-arm64'],
      outputDir,
      includeSource: false,
      generateSbom: true,
    };
    const result = buildRelease(config, sourceDir, 'abc123');
    expect(result.version).toBe('1.0.0');
    expect(result.artifacts).toHaveLength(3);
  });

  it('generates checksums file', () => {
    const config: ReleaseConfig = {
      version: '1.0.0',
      platforms: ['win-x64'],
      outputDir,
      includeSource: false,
      generateSbom: false,
    };
    const result = buildRelease(config, sourceDir, 'abc');
    expect(result.checksumFile).toContain('checksums.sha256');
  });

  it('generates manifest with hash', () => {
    const config: ReleaseConfig = {
      version: '1.0.0',
      platforms: ['win-x64'],
      outputDir,
      includeSource: false,
      generateSbom: false,
    };
    const result = buildRelease(config, sourceDir, 'abc');
    expect(result.manifest.hash).toHaveLength(64);
    expect(result.manifest.version).toBe('1.0.0');
  });

  it('deterministic: same inputs = same hashes', () => {
    const config: ReleaseConfig = {
      version: '1.0.0',
      platforms: ['win-x64'],
      outputDir,
      includeSource: false,
      generateSbom: false,
    };
    const r1 = buildRelease(config, sourceDir, 'abc');
    const r2 = buildRelease(config, sourceDir, 'abc');
    expect(r1.artifacts[0].sha256).toBe(r2.artifacts[0].sha256);
  });
});
