/**
 * OMEGA Release — Release Notes Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { generateReleaseNotes } from '../../src/release/notes.js';
import { generateManifest } from '../../src/release/manifest.js';

describe('generateReleaseNotes', () => {
  const version = {
    version: '1.0.0',
    date: '2026-02-10',
    entries: [
      { type: 'Added' as const, message: 'Core engine' },
      { type: 'Fixed' as const, message: 'Memory leak', issue: '#42' },
    ],
  };

  const manifest = generateManifest({
    version: '1.0.0',
    commit: 'abc123',
    platforms: ['win-x64'],
    artifacts: [{
      filename: 'omega-1.0.0-win-x64.zip',
      platform: 'win-x64',
      format: 'zip',
      path: '/releases/omega-1.0.0-win-x64.zip',
      size: 1024,
      sha256: 'a'.repeat(64),
      sha512: 'b'.repeat(128),
    }],
    testTotal: 120,
    testPassed: 120,
    invariantTotal: 10,
    invariantVerified: 10,
  });

  it('includes version header', () => {
    const notes = generateReleaseNotes(version, manifest);
    expect(notes).toContain('OMEGA 1.0.0');
  });

  it('includes release date', () => {
    const notes = generateReleaseNotes(version, manifest);
    expect(notes).toContain('2026-02-10');
  });

  it('includes change entries', () => {
    const notes = generateReleaseNotes(version, manifest);
    expect(notes).toContain('Core engine');
    expect(notes).toContain('Memory leak');
  });

  it('includes artifacts section', () => {
    const notes = generateReleaseNotes(version, manifest);
    expect(notes).toContain('Artifacts');
    expect(notes).toContain('omega-1.0.0-win-x64.zip');
  });

  it('includes verification section', () => {
    const notes = generateReleaseNotes(version, manifest);
    expect(notes).toContain('120/120');
    expect(notes).toContain('10/10');
  });
});
