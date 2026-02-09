/**
 * OMEGA Release — Changelog Generator Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { createEntry, createVersionSection, generateReleaseDate } from '../../src/changelog/generator.js';

describe('createEntry', () => {
  it('creates entry with type and message', () => {
    const entry = createEntry('Added', 'New feature');
    expect(entry.type).toBe('Added');
    expect(entry.message).toBe('New feature');
    expect(entry.issue).toBeUndefined();
  });

  it('creates entry with issue', () => {
    const entry = createEntry('Fixed', 'Bug fix', '#123');
    expect(entry.issue).toBe('#123');
  });
});

describe('createVersionSection', () => {
  it('creates version section', () => {
    const entries = [createEntry('Added', 'Feature')];
    const section = createVersionSection('1.0.0', '2026-02-10', entries);
    expect(section.version).toBe('1.0.0');
    expect(section.date).toBe('2026-02-10');
    expect(section.entries).toHaveLength(1);
  });
});

describe('generateReleaseDate', () => {
  it('generates YYYY-MM-DD format', () => {
    const date = generateReleaseDate(new Date(2026, 1, 10)); // Feb 10, 2026
    expect(date).toBe('2026-02-10');
  });

  it('pads single digits', () => {
    const date = generateReleaseDate(new Date(2026, 0, 5)); // Jan 5, 2026
    expect(date).toBe('2026-01-05');
  });
});
