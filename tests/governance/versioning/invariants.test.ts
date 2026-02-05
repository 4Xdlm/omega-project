/**
 * PHASE I — INVARIANTS TEST SUITE
 * Tests for all 10 invariants (INV-I-01 to INV-I-10).
 */

import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  isValidSemver,
  detectBumpType,
  isDowngrade,
  validateVersionEvent,
  runVersionPipeline,
  INVARIANT_NAMES,
  type VersionContractEvent,
  type VersionPipelineArgs
} from '../../../GOVERNANCE/versioning/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function createValidVersionEvent(overrides?: Partial<VersionContractEvent>): VersionContractEvent {
  return {
    event_type: 'version_contract_event',
    schema_version: '1.0.0',
    event_id: 'VER_MIN_20260204_001',
    timestamp: '2026-02-04T10:00:00.000Z',
    version: {
      current: '1.1.0',
      previous: '1.0.0',
      bump_type: 'minor'
    },
    compatibility: {
      type: 'backward',
      backward_compatible: true,
      data_compatible: true,
      api_compatible: true,
      schema_compatible: true
    },
    breaking_changes: [],
    deprecations: [],
    migration_path: null,
    changelog_ref: 'CHANGELOG.md#110',
    log_chain_prev_hash: null,
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// INV-I-01: SEMANTIC VERSION FORMAT VALID
// ─────────────────────────────────────────────────────────────

describe('INV-I-01: Semantic version format valid', () => {
  it('validates standard semver format', () => {
    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('1.2.3')).toBe(true);
    expect(isValidSemver('10.20.30')).toBe(true);
  });

  it('validates semver with prerelease', () => {
    expect(isValidSemver('1.0.0-alpha')).toBe(true);
    expect(isValidSemver('1.0.0-alpha.1')).toBe(true);
    expect(isValidSemver('1.0.0-rc.1')).toBe(true);
  });

  it('validates semver with build metadata', () => {
    expect(isValidSemver('1.0.0+build123')).toBe(true);
    expect(isValidSemver('1.0.0-alpha+build')).toBe(true);
  });

  it('rejects invalid semver formats', () => {
    expect(isValidSemver('1.0')).toBe(false);
    expect(isValidSemver('1')).toBe(false);
    expect(isValidSemver('v1.0.0')).toBe(false);
    expect(isValidSemver('1.0.0.0')).toBe(false);
    expect(isValidSemver('')).toBe(false);
    expect(isValidSemver('invalid')).toBe(false);
  });

  it('parses version components correctly', () => {
    const version = parseSemver('2.3.4-beta.1+build456');

    expect(version).not.toBeNull();
    expect(version?.major).toBe(2);
    expect(version?.minor).toBe(3);
    expect(version?.patch).toBe(4);
    expect(version?.prerelease).toBe('beta.1');
    expect(version?.build).toBe('build456');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-I-02: MAJOR BUMP REQUIRED FOR BREAKING CHANGES
// ─────────────────────────────────────────────────────────────

describe('INV-I-02: MAJOR bump required for breaking changes', () => {
  it('accepts MAJOR bump with breaking changes', () => {
    const event = createValidVersionEvent({
      version: { current: '2.0.0', previous: '1.0.0', bump_type: 'major' },
      compatibility: {
        type: 'breaking',
        backward_compatible: false,
        data_compatible: false,
        api_compatible: false,
        schema_compatible: false
      },
      breaking_changes: [{
        component: 'api',
        change_type: 'api',
        description: 'Signature changed',
        migration_required: true,
        migration_doc_ref: 'docs/migration.md'
      }],
      migration_path: {
        from_version: '1.0.0',
        to_version: '2.0.0',
        script_ref: 'scripts/migrate.js',
        manual_steps: [],
        estimated_effort: 'medium',
        data_migration_required: true
      }
    });

    const result = validateVersionEvent(event);

    expect(result.errors.some(e => e.includes('INV-I-02'))).toBe(false);
  });

  it('rejects MINOR bump with breaking changes', () => {
    const event = createValidVersionEvent({
      version: { current: '1.1.0', previous: '1.0.0', bump_type: 'minor' },
      compatibility: { type: 'breaking', backward_compatible: false, data_compatible: true, api_compatible: false, schema_compatible: true },
      breaking_changes: [{
        component: 'api',
        change_type: 'api',
        description: 'Breaking API change',
        migration_required: false,
        migration_doc_ref: null
      }]
    });

    const result = validateVersionEvent(event);

    expect(result.errors.some(e => e.includes('INV-I-02'))).toBe(true);
  });

  it('rejects PATCH bump with breaking changes', () => {
    const event = createValidVersionEvent({
      version: { current: '1.0.1', previous: '1.0.0', bump_type: 'patch' },
      breaking_changes: [{
        component: 'schema',
        change_type: 'schema',
        description: 'Breaking schema change',
        migration_required: false,
        migration_doc_ref: null
      }]
    });

    const result = validateVersionEvent(event);

    expect(result.errors.some(e => e.includes('INV-I-02'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-I-03: BACKWARD COMPATIBLE BY DEFAULT
// ─────────────────────────────────────────────────────────────

describe('INV-I-03: Backward compatible by default', () => {
  it('MINOR bump must be backward compatible', () => {
    const event = createValidVersionEvent({
      version: { current: '1.1.0', previous: '1.0.0', bump_type: 'minor' },
      compatibility: { type: 'backward', backward_compatible: true, data_compatible: true, api_compatible: true, schema_compatible: true }
    });

    const result = validateVersionEvent(event);

    expect(result.errors.some(e => e.includes('INV-I-03'))).toBe(false);
  });

  it('rejects non-backward-compatible MINOR bump', () => {
    const event = createValidVersionEvent({
      version: { current: '1.1.0', previous: '1.0.0', bump_type: 'minor' },
      compatibility: { type: 'backward', backward_compatible: false, data_compatible: true, api_compatible: true, schema_compatible: true }
    });

    const result = validateVersionEvent(event);

    expect(result.errors.some(e => e.includes('INV-I-03'))).toBe(true);
  });

  it('PATCH bump must be backward compatible', () => {
    const event = createValidVersionEvent({
      version: { current: '1.0.1', previous: '1.0.0', bump_type: 'patch' },
      compatibility: { type: 'backward', backward_compatible: false, data_compatible: true, api_compatible: true, schema_compatible: true }
    });

    const result = validateVersionEvent(event);

    expect(result.errors.some(e => e.includes('INV-I-03'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-I-04 to INV-I-08: VERSION RULES (VER-001 to VER-005)
// ─────────────────────────────────────────────────────────────

describe('INV-I-04: Schema stability (VER-001)', () => {
  it('schema breaking change requires MAJOR bump', () => {
    const event = createValidVersionEvent({
      version: { current: '1.1.0', previous: '1.0.0', bump_type: 'minor' },
      breaking_changes: [{
        component: 'schema.json',
        change_type: 'schema',
        description: 'Schema field removed',
        migration_required: true,
        migration_doc_ref: 'docs/schema-migration.md'
      }]
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.rule_violations.some(v => v.rule === 'VER-001')).toBe(true);
  });
});

describe('INV-I-05: API stability (VER-002)', () => {
  it('API breaking change requires MAJOR bump', () => {
    const event = createValidVersionEvent({
      version: { current: '1.1.0', previous: '1.0.0', bump_type: 'minor' },
      breaking_changes: [{
        component: 'src/api/handler.ts',
        change_type: 'api',
        description: 'Function signature changed',
        migration_required: false,
        migration_doc_ref: null
      }]
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.rule_violations.some(v => v.rule === 'VER-002')).toBe(true);
  });
});

describe('INV-I-06: Migration path required (VER-003)', () => {
  it('data format change requires migration path', () => {
    const event = createValidVersionEvent({
      version: { current: '2.0.0', previous: '1.0.0', bump_type: 'major' },
      compatibility: { type: 'breaking', backward_compatible: false, data_compatible: false, api_compatible: true, schema_compatible: true },
      breaking_changes: [{
        component: 'data/format.json',
        change_type: 'schema',
        description: 'Data format changed',
        migration_required: true,
        migration_doc_ref: null // Missing migration doc
      }],
      migration_path: null // Missing migration path
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.rule_violations.some(v => v.rule === 'VER-003')).toBe(true);
  });
});

describe('INV-I-07: Deprecation cycle enforced (VER-004)', () => {
  it('deprecation must specify deprecated_in version', () => {
    const event = createValidVersionEvent({
      deprecations: [{
        component: 'src/legacy.ts',
        deprecated_in: '',
        removal_planned: '3.0.0',
        replacement: 'src/new.ts',
        warning_count: 0
      }]
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.rule_violations.some(v => v.rule === 'VER-004')).toBe(true);
  });
});

describe('INV-I-08: Changelog mandatory (VER-005)', () => {
  it('changelog_ref is required', () => {
    const event = createValidVersionEvent({
      changelog_ref: null
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.rule_violations.some(v => v.rule === 'VER-005')).toBe(true);
  });

  it('empty changelog_ref is rejected', () => {
    const event = createValidVersionEvent({
      changelog_ref: ''
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.rule_violations.some(v => v.rule === 'VER-005')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-I-09: DOWNGRADE PREVENTION
// ─────────────────────────────────────────────────────────────

describe('INV-I-09: Downgrade prevention', () => {
  it('detects version downgrade', () => {
    expect(isDowngrade('1.0.0', '0.9.0')).toBe(true);
    expect(isDowngrade('2.0.0', '1.9.9')).toBe(true);
    expect(isDowngrade('1.1.0', '1.0.9')).toBe(true);
  });

  it('upgrade is not downgrade', () => {
    expect(isDowngrade('1.0.0', '1.0.1')).toBe(false);
    expect(isDowngrade('1.0.0', '1.1.0')).toBe(false);
    expect(isDowngrade('1.0.0', '2.0.0')).toBe(false);
  });

  it('same version is not downgrade', () => {
    expect(isDowngrade('1.0.0', '1.0.0')).toBe(false);
  });

  it('validation fails for downgrade', () => {
    const event = createValidVersionEvent({
      version: { current: '0.9.0', previous: '1.0.0', bump_type: 'patch' }
    });

    const result = validateVersionEvent(event);

    expect(result.errors.some(e => e.includes('INV-I-09'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-I-10: NON-ACTUATING
// ─────────────────────────────────────────────────────────────

describe('INV-I-10: NON-ACTUATING (report only)', () => {
  it('report_type is version_report', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.report_type).toBe('version_report');
  });

  it('report notes contain non-enforcement statement', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.notes.toLowerCase()).toContain('no automatic');
  });

  it('pipeline is pure function (no side effects)', () => {
    const event = createValidVersionEvent();
    const eventCopy = JSON.stringify(event);
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    runVersionPipeline(args);

    expect(JSON.stringify(event)).toBe(eventCopy);
  });

  it('10 consecutive runs produce identical reports', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const firstJson = JSON.stringify(runVersionPipeline(args));

    for (let i = 0; i < 10; i++) {
      expect(JSON.stringify(runVersionPipeline(args))).toBe(firstJson);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// INVARIANT NAMES VERIFICATION
// ─────────────────────────────────────────────────────────────

describe('Invariant names defined', () => {
  it('all 10 invariants are named', () => {
    expect(INVARIANT_NAMES['INV-I-01']).toBe('Semantic version format valid');
    expect(INVARIANT_NAMES['INV-I-02']).toBe('MAJOR bump required for breaking changes');
    expect(INVARIANT_NAMES['INV-I-03']).toBe('Backward compatible by default');
    expect(INVARIANT_NAMES['INV-I-04']).toBe('Schema stability (VER-001)');
    expect(INVARIANT_NAMES['INV-I-05']).toBe('API stability (VER-002)');
    expect(INVARIANT_NAMES['INV-I-06']).toBe('Migration path required (VER-003)');
    expect(INVARIANT_NAMES['INV-I-07']).toBe('Deprecation cycle enforced (VER-004)');
    expect(INVARIANT_NAMES['INV-I-08']).toBe('Changelog mandatory (VER-005)');
    expect(INVARIANT_NAMES['INV-I-09']).toBe('Downgrade prevention');
    expect(INVARIANT_NAMES['INV-I-10']).toBe('NON-ACTUATING (report only)');
  });
});
