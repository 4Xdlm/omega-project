/**
 * OMEGA Release — Changelog Writer Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { renderChangelog, addVersionToChangelog } from '../../src/changelog/writer.js';
import type { Changelog, ChangelogVersion } from '../../src/changelog/types.js';

describe('renderChangelog', () => {
  it('renders header', () => {
    const cl: Changelog = { versions: [], unreleased: [] };
    const output = renderChangelog(cl);
    expect(output).toContain('# Changelog');
    expect(output).toContain('Keep a Changelog');
    expect(output).toContain('Semantic Versioning');
  });

  it('renders version section', () => {
    const cl: Changelog = {
      versions: [{
        version: '1.0.0',
        date: '2026-02-10',
        entries: [{ type: 'Added', message: 'Initial release' }],
      }],
      unreleased: [],
    };
    const output = renderChangelog(cl);
    expect(output).toContain('## [1.0.0] - 2026-02-10');
    expect(output).toContain('### Added');
    expect(output).toContain('- Initial release');
  });

  it('groups entries by type', () => {
    const cl: Changelog = {
      versions: [{
        version: '1.0.0',
        date: '2026-02-10',
        entries: [
          { type: 'Added', message: 'Feature A' },
          { type: 'Fixed', message: 'Bug B' },
          { type: 'Added', message: 'Feature C' },
        ],
      }],
      unreleased: [],
    };
    const output = renderChangelog(cl);
    expect(output).toContain('### Added');
    expect(output).toContain('### Fixed');
  });

  it('renders issue references', () => {
    const cl: Changelog = {
      versions: [{
        version: '1.0.0',
        date: '2026-02-10',
        entries: [{ type: 'Fixed', message: 'Fix bug', issue: '#42' }],
      }],
      unreleased: [],
    };
    const output = renderChangelog(cl);
    expect(output).toContain('#42');
  });
});

describe('addVersionToChangelog', () => {
  it('adds version at beginning', () => {
    const cl: Changelog = {
      versions: [{ version: '1.0.0', date: '2026-02-10', entries: [] }],
      unreleased: [{ type: 'Added', message: 'New thing' }],
    };
    const newVer: ChangelogVersion = {
      version: '1.1.0',
      date: '2026-03-01',
      entries: [{ type: 'Added', message: 'New thing' }],
    };
    const updated = addVersionToChangelog(cl, newVer);
    expect(updated.versions[0].version).toBe('1.1.0');
    expect(updated.unreleased).toHaveLength(0);
  });
});
