/**
 * PHASE I — PIPELINE TESTS
 * Tests for version validation pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  runVersionPipeline,
  validateSingleVersionEvent,
  validateVersionTransition,
  GENERATOR,
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
// PIPELINE TESTS
// ─────────────────────────────────────────────────────────────

describe('runVersionPipeline', () => {
  it('generates report for single valid event', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.report_type).toBe('version_report');
    expect(report.schema_version).toBe('1.0.0');
    expect(report.version_events).toHaveLength(1);
  });

  it('validates all events in batch', () => {
    const event1 = createValidVersionEvent({
      event_id: 'VER_1',
      timestamp: '2026-02-04T10:00:00.000Z'
    });
    const event2 = createValidVersionEvent({
      event_id: 'VER_2',
      timestamp: '2026-02-04T11:00:00.000Z',
      version: { current: '1.2.0', previous: '1.1.0', bump_type: 'minor' }
    });

    const args: VersionPipelineArgs = {
      events: [event1, event2],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.version_events).toHaveLength(2);
    expect(report.validations).toHaveLength(2);
  });

  it('computes correct window', () => {
    const event1 = createValidVersionEvent({
      event_id: 'VER_1',
      timestamp: '2026-02-04T10:00:00.000Z'
    });
    const event2 = createValidVersionEvent({
      event_id: 'VER_2',
      timestamp: '2026-02-04T14:00:00.000Z'
    });

    const args: VersionPipelineArgs = {
      events: [event1, event2],
      generatedAt: '2026-02-04T15:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.window.from).toBe('2026-02-04T10:00:00.000Z');
    expect(report.window.to).toBe('2026-02-04T14:00:00.000Z');
    expect(report.window.events_count).toBe(2);
  });

  it('computes summary by bump type', () => {
    const minor = createValidVersionEvent({
      event_id: 'VER_1',
      version: { current: '1.1.0', previous: '1.0.0', bump_type: 'minor' }
    });
    const patch = createValidVersionEvent({
      event_id: 'VER_2',
      version: { current: '1.1.1', previous: '1.1.0', bump_type: 'patch' }
    });

    const args: VersionPipelineArgs = {
      events: [minor, patch],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.summary.by_bump_type.major).toBe(0);
    expect(report.summary.by_bump_type.minor).toBe(1);
    expect(report.summary.by_bump_type.patch).toBe(1);
    expect(report.summary.total_events).toBe(2);
  });

  it('detects rule violations', () => {
    const event = createValidVersionEvent({
      changelog_ref: null // VER-005 violation
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.rule_violations.length).toBeGreaterThan(0);
    expect(report.rule_violations.some(v => v.rule === 'VER-005')).toBe(true);
  });

  it('builds compatibility matrix', () => {
    const event = createValidVersionEvent();

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.compatibility_matrix).toBeDefined();
    expect(report.compatibility_matrix.versions.length).toBeGreaterThan(0);
    expect(report.compatibility_matrix.entries.length).toBeGreaterThan(0);
  });

  it('includes generator info', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.generator).toBe(GENERATOR);
    expect(report.generated_at).toBe('2026-02-04T12:00:00.000Z');
  });

  it('maintains hash chain', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z',
      prevEventHash: 'prev_hash_123'
    };

    const report = runVersionPipeline(args);

    expect(report.log_chain_prev_hash).toBe('prev_hash_123');
  });

  it('generates unique report_id', () => {
    const event = createValidVersionEvent();
    const args1: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };
    const args2: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:01:00.000Z'
    };

    const report1 = runVersionPipeline(args1);
    const report2 = runVersionPipeline(args2);

    expect(report1.report_id).not.toBe(report2.report_id);
  });

  it('handles empty events array', () => {
    const args: VersionPipelineArgs = {
      events: [],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.version_events).toHaveLength(0);
    expect(report.summary.total_events).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// SINGLE EVENT VALIDATION
// ─────────────────────────────────────────────────────────────

describe('validateSingleVersionEvent', () => {
  it('validates single event', () => {
    const event = createValidVersionEvent();

    const report = validateSingleVersionEvent(event);

    expect(report.version_events).toHaveLength(1);
    expect(report.validations).toHaveLength(1);
  });

  it('returns valid for valid event', () => {
    const event = createValidVersionEvent();

    const report = validateSingleVersionEvent(event);

    expect(report.validations[0].validation.valid).toBe(true);
  });

  it('returns invalid for invalid event', () => {
    const event = createValidVersionEvent({
      version: { current: 'invalid', previous: '1.0.0', bump_type: 'minor' }
    });

    const report = validateSingleVersionEvent(event);

    expect(report.validations[0].validation.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// VERSION TRANSITION VALIDATION
// ─────────────────────────────────────────────────────────────

describe('validateVersionTransition', () => {
  it('validates valid minor transition', () => {
    const result = validateVersionTransition('1.0.0', '1.1.0', 'minor', false);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates valid major transition with breaking changes', () => {
    const result = validateVersionTransition('1.0.0', '2.0.0', 'major', true);

    expect(result.valid).toBe(true);
  });

  it('rejects invalid semver format', () => {
    const result = validateVersionTransition('invalid', '1.0.0', 'minor', false);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid'))).toBe(true);
  });

  it('rejects downgrade', () => {
    const result = validateVersionTransition('2.0.0', '1.0.0', 'major', false);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('INV-I-09'))).toBe(true);
  });

  it('rejects breaking changes without major bump', () => {
    const result = validateVersionTransition('1.0.0', '1.1.0', 'minor', true);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('INV-I-02'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// ESCALATION
// ─────────────────────────────────────────────────────────────

describe('pipeline/escalation', () => {
  it('requires escalation for invalid event', () => {
    const event = createValidVersionEvent({
      version: { current: 'invalid', previous: '1.0.0', bump_type: 'minor' }
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.escalation_required).toBe(true);
    expect(report.escalation_target).toBe('ARCHITECTE');
  });

  it('requires escalation for rule violation', () => {
    const event = createValidVersionEvent({
      changelog_ref: null
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.escalation_required).toBe(true);
  });

  it('no escalation for all valid events', () => {
    const event = createValidVersionEvent();

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.escalation_required).toBe(false);
    expect(report.escalation_target).toBe('NONE');
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM
// ─────────────────────────────────────────────────────────────

describe('pipeline/determinism', () => {
  it('same inputs produce same output', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report1 = runVersionPipeline(args);
    const report2 = runVersionPipeline(args);

    expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
  });

  it('10 consecutive runs identical', () => {
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
