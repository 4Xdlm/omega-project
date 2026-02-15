/**
 * Tests for gate:roadmap — Sprint 5 Commit 5.2
 * Invariants: GATE-RD-01 to GATE-RD-03
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const roadmapPath = path.join(repoRoot, 'docs/OMEGA_ROADMAP_OMNIPOTENT_v1.md');
const hashFilePath = path.join(repoRoot, '.roadmap-hash.json');

describe('gate:roadmap', () => {
  it('GATE-RD-01: gate passes when hash matches', () => {
    // Roadmap file should exist
    expect(fs.existsSync(roadmapPath)).toBe(true);

    // Hash file should exist after initialization
    expect(fs.existsSync(hashFilePath)).toBe(true);

    // Gate should pass
    const result = execSync('npm run gate:roadmap', {
      cwd: repoRoot,
      encoding: 'utf-8',
    });

    expect(result).toContain('Gate ROADMAP passed');
  });

  it('GATE-RD-02: hash file structure validation', () => {
    expect(fs.existsSync(hashFilePath)).toBe(true);

    const hashData = JSON.parse(fs.readFileSync(hashFilePath, 'utf-8'));

    // Validate structure
    expect(hashData).toHaveProperty('hash');
    expect(hashData).toHaveProperty('timestamp');
    expect(hashData).toHaveProperty('file');

    // Validate types
    expect(typeof hashData.hash).toBe('string');
    expect(typeof hashData.timestamp).toBe('string');
    expect(typeof hashData.file).toBe('string');

    // Validate hash format (64 hex chars)
    expect(hashData.hash).toMatch(/^[0-9a-f]{64}$/);

    // Validate file path
    expect(hashData.file).toBe('docs/OMEGA_ROADMAP_OMNIPOTENT_v1.md');
  });

  it('GATE-RD-03: gate update command creates/updates hash', () => {
    const beforeUpdate = fs.existsSync(hashFilePath)
      ? JSON.parse(fs.readFileSync(hashFilePath, 'utf-8'))
      : null;

    // Run update
    const result = execSync('npm run gate:roadmap:update', {
      cwd: repoRoot,
      encoding: 'utf-8',
    });

    expect(result).toContain('Roadmap hash updated');

    // Verify file was created/updated
    expect(fs.existsSync(hashFilePath)).toBe(true);

    const afterUpdate = JSON.parse(fs.readFileSync(hashFilePath, 'utf-8'));

    // Hash should be present
    expect(afterUpdate.hash).toBeDefined();
    expect(afterUpdate.hash).toMatch(/^[0-9a-f]{64}$/);

    // If it existed before, timestamp should change or stay the same
    if (beforeUpdate) {
      expect(afterUpdate.timestamp).toBeDefined();
    }
  });
});
