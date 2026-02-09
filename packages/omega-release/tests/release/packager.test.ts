/**
 * OMEGA Release — Packager Tests
 * Phase G.0 — INV-G0-09: RELEASE_REPRODUCIBLE
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateArtifactFilename, createArtifact } from '../../src/release/packager.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('generateArtifactFilename', () => {
  it('generates win-x64 zip', () => {
    expect(generateArtifactFilename('1.0.0', 'win-x64')).toBe('omega-1.0.0-win-x64.zip');
  });

  it('generates linux-x64 tar.gz', () => {
    expect(generateArtifactFilename('1.0.0', 'linux-x64')).toBe('omega-1.0.0-linux-x64.tar.gz');
  });

  it('generates macos-arm64 tar.gz', () => {
    expect(generateArtifactFilename('2.0.0', 'macos-arm64')).toBe('omega-2.0.0-macos-arm64.tar.gz');
  });
});

describe('createArtifact', () => {
  const testDir = join(tmpdir(), 'omega-release-pkg-test');
  const sourceDir = join(testDir, 'source');
  const outputDir = join(testDir, 'output');

  beforeEach(() => {
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(sourceDir, 'index.js'), 'console.log("omega")');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates artifact with SHA-256', () => {
    const artifact = createArtifact('1.0.0', 'win-x64', sourceDir, outputDir);
    expect(artifact.sha256).toHaveLength(64);
    expect(artifact.sha512).toHaveLength(128);
    expect(artifact.platform).toBe('win-x64');
    expect(artifact.filename).toBe('omega-1.0.0-win-x64.zip');
  });

  it('deterministic: same input = same hash', () => {
    const a1 = createArtifact('1.0.0', 'linux-x64', sourceDir, outputDir);
    const a2 = createArtifact('1.0.0', 'linux-x64', sourceDir, outputDir);
    expect(a1.sha256).toBe(a2.sha256);
  });

  it('different platforms produce different content', () => {
    const win = createArtifact('1.0.0', 'win-x64', sourceDir, outputDir);
    const linux = createArtifact('1.0.0', 'linux-x64', sourceDir, outputDir);
    expect(win.sha256).not.toBe(linux.sha256);
  });
});
