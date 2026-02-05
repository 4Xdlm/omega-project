/**
 * PHASE I — COMPATIBILITY MATRIX TESTS
 * Tests for compatibility determination and matrix building.
 */

import { describe, it, expect } from 'vitest';
import {
  determineCompatibility,
  buildCompatibilityMatrix,
  getCompatibilityEntry,
  isUpgradePathAvailable,
  type VersionContractEvent
} from '../../../GOVERNANCE/versioning/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function createVersionEvent(
  previous: string,
  current: string,
  breaking: boolean = false
): VersionContractEvent {
  return {
    event_type: 'version_contract_event',
    schema_version: '1.0.0',
    event_id: `VER_${current.replace(/\./g, '')}`,
    timestamp: '2026-02-04T10:00:00.000Z',
    version: {
      current,
      previous,
      bump_type: breaking ? 'major' : 'minor'
    },
    compatibility: {
      type: breaking ? 'breaking' : 'backward',
      backward_compatible: !breaking,
      data_compatible: !breaking,
      api_compatible: !breaking,
      schema_compatible: !breaking
    },
    breaking_changes: breaking ? [{
      component: 'api',
      change_type: 'api',
      description: 'Breaking change',
      migration_required: true,
      migration_doc_ref: 'docs/migration.md'
    }] : [],
    deprecations: [],
    migration_path: breaking ? {
      from_version: previous,
      to_version: current,
      script_ref: 'scripts/migrate.js',
      manual_steps: [],
      estimated_effort: 'medium',
      data_migration_required: true
    } : null,
    changelog_ref: `CHANGELOG.md#${current.replace(/\./g, '')}`,
    log_chain_prev_hash: null
  };
}

// ─────────────────────────────────────────────────────────────
// DETERMINE COMPATIBILITY
// ─────────────────────────────────────────────────────────────

describe('determineCompatibility', () => {
  it('same version is compatible', () => {
    const result = determineCompatibility('1.0.0', '1.0.0', []);

    expect(result.status).toBe('compatible');
    expect(result.notes).toContain('Same version');
  });

  it('patch upgrade is compatible', () => {
    const result = determineCompatibility('1.0.0', '1.0.1', []);

    expect(result.status).toBe('compatible');
    expect(result.notes).toContain('Patch upgrade');
  });

  it('minor upgrade is compatible', () => {
    const result = determineCompatibility('1.0.0', '1.1.0', []);

    expect(result.status).toBe('compatible');
    expect(result.notes).toContain('Minor upgrade');
  });

  it('major upgrade with breaking changes requires migration', () => {
    const events = [
      createVersionEvent('1.0.0', '2.0.0', true)
    ];

    const result = determineCompatibility('1.0.0', '2.0.0', events);

    expect(result.status).toBe('migration_required');
    expect(result.notes).toContain('migration');
  });

  it('patch downgrade is partial', () => {
    const result = determineCompatibility('1.0.2', '1.0.1', []);

    expect(result.status).toBe('partial');
    expect(result.notes).toContain('downgrade');
  });

  it('minor downgrade is partial', () => {
    const result = determineCompatibility('1.2.0', '1.1.0', []);

    expect(result.status).toBe('partial');
  });

  it('major downgrade is incompatible', () => {
    const result = determineCompatibility('2.0.0', '1.0.0', []);

    expect(result.status).toBe('incompatible');
    expect(result.notes).toContain('downgrade');
  });

  it('invalid version returns incompatible', () => {
    const result = determineCompatibility('invalid', '1.0.0', []);

    expect(result.status).toBe('incompatible');
    expect(result.notes).toContain('Invalid');
  });
});

// ─────────────────────────────────────────────────────────────
// BUILD COMPATIBILITY MATRIX
// ─────────────────────────────────────────────────────────────

describe('buildCompatibilityMatrix', () => {
  it('builds matrix for multiple versions', () => {
    const versions = ['1.0.0', '1.1.0', '2.0.0'];
    const events: VersionContractEvent[] = [];

    const matrix = buildCompatibilityMatrix(versions, events);

    expect(matrix.versions).toHaveLength(3);
    // 3x3 = 9 entries
    expect(matrix.entries).toHaveLength(9);
  });

  it('sorts versions correctly', () => {
    const versions = ['2.0.0', '1.0.0', '1.1.0'];
    const events: VersionContractEvent[] = [];

    const matrix = buildCompatibilityMatrix(versions, events);

    expect(matrix.versions[0]).toBe('1.0.0');
    expect(matrix.versions[1]).toBe('1.1.0');
    expect(matrix.versions[2]).toBe('2.0.0');
  });

  it('diagonal entries are compatible (same version)', () => {
    const versions = ['1.0.0', '1.1.0'];
    const events: VersionContractEvent[] = [];

    const matrix = buildCompatibilityMatrix(versions, events);

    const diagonal = matrix.entries.filter(e => e.from_version === e.to_version);
    expect(diagonal.every(e => e.status === 'compatible')).toBe(true);
  });

  it('handles empty versions array', () => {
    const matrix = buildCompatibilityMatrix([], []);

    expect(matrix.versions).toHaveLength(0);
    expect(matrix.entries).toHaveLength(0);
  });

  it('includes migration status for breaking changes', () => {
    const events = [
      createVersionEvent('1.0.0', '2.0.0', true)
    ];

    const matrix = buildCompatibilityMatrix(['1.0.0', '2.0.0'], events);

    const entry = matrix.entries.find(
      e => e.from_version === '1.0.0' && e.to_version === '2.0.0'
    );

    expect(entry?.status).toBe('migration_required');
  });
});

// ─────────────────────────────────────────────────────────────
// GET COMPATIBILITY ENTRY
// ─────────────────────────────────────────────────────────────

describe('getCompatibilityEntry', () => {
  it('finds existing entry', () => {
    const matrix = buildCompatibilityMatrix(['1.0.0', '1.1.0'], []);

    const entry = getCompatibilityEntry(matrix, '1.0.0', '1.1.0');

    expect(entry).not.toBeNull();
    expect(entry?.from_version).toBe('1.0.0');
    expect(entry?.to_version).toBe('1.1.0');
  });

  it('returns null for missing entry', () => {
    const matrix = buildCompatibilityMatrix(['1.0.0'], []);

    const entry = getCompatibilityEntry(matrix, '1.0.0', '2.0.0');

    expect(entry).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// IS UPGRADE PATH AVAILABLE
// ─────────────────────────────────────────────────────────────

describe('isUpgradePathAvailable', () => {
  it('returns true for compatible versions', () => {
    const matrix = buildCompatibilityMatrix(['1.0.0', '1.1.0'], []);

    const available = isUpgradePathAvailable(matrix, '1.0.0', '1.1.0');

    expect(available).toBe(true);
  });

  it('returns true for migration_required (path exists)', () => {
    const events = [
      createVersionEvent('1.0.0', '2.0.0', true)
    ];
    const matrix = buildCompatibilityMatrix(['1.0.0', '2.0.0'], events);

    const available = isUpgradePathAvailable(matrix, '1.0.0', '2.0.0');

    expect(available).toBe(true);
  });

  it('returns false for missing version in matrix', () => {
    const matrix = buildCompatibilityMatrix(['1.0.0'], []);

    const available = isUpgradePathAvailable(matrix, '1.0.0', '2.0.0');

    expect(available).toBe(false);
  });

  it('returns false for downgrade', () => {
    const matrix = buildCompatibilityMatrix(['1.0.0', '2.0.0'], []);

    const entry = getCompatibilityEntry(matrix, '2.0.0', '1.0.0');
    // Downgrade should be incompatible
    expect(entry?.status).toBe('incompatible');
  });
});

// ─────────────────────────────────────────────────────────────
// MATRIX SCENARIOS
// ─────────────────────────────────────────────────────────────

describe('compatibility matrix scenarios', () => {
  it('typical version progression', () => {
    const versions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];
    const events = [
      createVersionEvent('1.0.0', '1.0.1', false),
      createVersionEvent('1.0.1', '1.1.0', false),
      createVersionEvent('1.1.0', '2.0.0', true)
    ];

    const matrix = buildCompatibilityMatrix(versions, events);

    // 1.0.0 -> 1.0.1: compatible (patch)
    expect(getCompatibilityEntry(matrix, '1.0.0', '1.0.1')?.status).toBe('compatible');

    // 1.0.0 -> 1.1.0: compatible (minor)
    expect(getCompatibilityEntry(matrix, '1.0.0', '1.1.0')?.status).toBe('compatible');

    // 1.1.0 -> 2.0.0: migration_required (major with breaking)
    expect(getCompatibilityEntry(matrix, '1.1.0', '2.0.0')?.status).toBe('migration_required');

    // 2.0.0 -> 1.0.0: incompatible (downgrade)
    expect(getCompatibilityEntry(matrix, '2.0.0', '1.0.0')?.status).toBe('incompatible');
  });
});
