/**
 * GOVERNANCE SCHEMA TESTS
 * ROADMAP B - Plan B-0
 *
 * Tests JSON Schema validation for governance events
 */

import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

describe('Governance Event Schema', () => {
  const schemaPath = path.join(process.cwd(), 'schemas', 'GOVERNANCE_EVENT_SCHEMA.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  describe('Valid events', () => {
    it('validates correct runtime_event', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01T12:00:00Z'
      };
      expect(validate(event)).toBe(true);
    });

    it('validates drift_report with all fields', () => {
      const event = {
        event_type: 'drift_report',
        schema_version: '1.0.0',
        event_id: 'drift-001',
        timestamp: '2026-02-01T12:00:00Z',
        run_id: 'run-123',
        run_ref: {
          phase_tag: 'phase-c-sealed',
          manifest_sha256: 'A'.repeat(64)
        },
        log_chain_prev_hash: 'B'.repeat(64),
        requires_human_decision: true
      };
      expect(validate(event)).toBe(true);
    });

    it('validates incident_event', () => {
      const event = {
        event_type: 'incident_event',
        schema_version: '2.1.0',
        event_id: 'inc-001',
        timestamp: '2026-02-01T15:30:00Z',
        requires_human_decision: true
      };
      expect(validate(event)).toBe(true);
    });

    it('validates override_event', () => {
      const event = {
        event_type: 'override_event',
        schema_version: '1.0.0',
        event_id: 'ovr-001',
        timestamp: '2026-02-01T16:00:00Z'
      };
      expect(validate(event)).toBe(true);
    });

    it('validates with null log_chain_prev_hash (first event)', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'first-evt',
        timestamp: '2026-02-01T10:00:00Z',
        log_chain_prev_hash: null
      };
      expect(validate(event)).toBe(true);
    });
  });

  describe('Invalid events', () => {
    it('rejects missing required fields', () => {
      const event = {
        event_type: 'runtime_event'
      };
      expect(validate(event)).toBe(false);
      expect(validate.errors).toBeDefined();
    });

    it('rejects invalid event_type', () => {
      const event = {
        event_type: 'invalid_type',
        schema_version: '1.0.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01T12:00:00Z'
      };
      expect(validate(event)).toBe(false);
    });

    it('rejects invalid schema_version format', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: 'v1.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01T12:00:00Z'
      };
      expect(validate(event)).toBe(false);
    });

    it('rejects invalid timestamp format', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01'
      };
      expect(validate(event)).toBe(false);
    });

    it('rejects empty event_id', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: '',
        timestamp: '2026-02-01T12:00:00Z'
      };
      expect(validate(event)).toBe(false);
    });

    it('rejects invalid manifest_sha256 format', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01T12:00:00Z',
        run_ref: {
          phase_tag: 'test',
          manifest_sha256: 'not-a-hash'
        }
      };
      expect(validate(event)).toBe(false);
    });

    it('rejects additional properties (strict mode)', () => {
      const event = {
        event_type: 'runtime_event',
        schema_version: '1.0.0',
        event_id: 'evt-001',
        timestamp: '2026-02-01T12:00:00Z',
        unexpected_field: 'value'
      };
      expect(validate(event)).toBe(false);
    });
  });

  describe('All event types', () => {
    const eventTypes = [
      'runtime_event',
      'drift_report',
      'regression_result',
      'misuse_event',
      'override_event',
      'incident_event',
      'rollback_event',
      'version_contract_event'
    ];

    eventTypes.forEach(eventType => {
      it(`validates ${eventType}`, () => {
        const event = {
          event_type: eventType,
          schema_version: '1.0.0',
          event_id: `${eventType}-001`,
          timestamp: '2026-02-01T12:00:00Z'
        };
        expect(validate(event)).toBe(true);
      });
    });
  });
});
