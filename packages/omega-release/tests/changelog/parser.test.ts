/**
 * OMEGA Release — Changelog Parser Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { parseChangelog, findVersion } from '../../src/changelog/parser.js';

const SAMPLE_CHANGELOG = `# Changelog

All notable changes to OMEGA will be documented in this file.

## [Unreleased]

### Added
- Upcoming feature

## [1.1.0] - 2026-03-01

### Added
- New dashboard (#42)
- Performance improvements

### Fixed
- Memory leak in parser (#38)

## [1.0.0] - 2026-02-10

### Added
- Initial release
- Core engine
`;

describe('parseChangelog', () => {
  it('parses versions', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    expect(cl.versions).toHaveLength(2);
  });

  it('parses version numbers', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    expect(cl.versions[0].version).toBe('1.1.0');
    expect(cl.versions[1].version).toBe('1.0.0');
  });

  it('parses dates', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    expect(cl.versions[0].date).toBe('2026-03-01');
  });

  it('parses entries', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    expect(cl.versions[0].entries.length).toBeGreaterThan(0);
  });

  it('parses change types', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    const types = cl.versions[0].entries.map(e => e.type);
    expect(types).toContain('Added');
    expect(types).toContain('Fixed');
  });

  it('parses unreleased entries', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    expect(cl.unreleased).toHaveLength(1);
    expect(cl.unreleased[0].type).toBe('Added');
  });

  it('parses issue references', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    const withIssue = cl.versions[0].entries.find(e => e.issue);
    expect(withIssue).toBeDefined();
    expect(withIssue!.issue).toBe('#42');
  });

  it('handles empty changelog', () => {
    const cl = parseChangelog('# Changelog\n');
    expect(cl.versions).toHaveLength(0);
    expect(cl.unreleased).toHaveLength(0);
  });
});

describe('findVersion', () => {
  it('finds existing version', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    const v = findVersion(cl, '1.0.0');
    expect(v).not.toBeNull();
    expect(v!.version).toBe('1.0.0');
  });

  it('returns null for missing version', () => {
    const cl = parseChangelog(SAMPLE_CHANGELOG);
    expect(findVersion(cl, '9.9.9')).toBeNull();
  });
});
