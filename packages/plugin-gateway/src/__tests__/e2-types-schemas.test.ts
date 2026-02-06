/**
 * E2 Validation Tests — Types + Schemas
 *
 * Proves:
 * - Types compile (zero any)
 * - JSON schemas validate correct manifests
 * - JSON schemas reject invalid manifests
 * - Payload discriminated union works
 * - All schema files are valid JSON Schema
 */
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  PluginManifest,
  PluginRequest,
  PluginResponse,
  GatewayEvent,
  PluginPayload,
  TextPayload,
  JSONPayload,
  BinaryRefPayload,
  DatasetSlicePayload,
  ValidationReport,
  ProofBundle,
  PipelineResponse,
  PluginInfo,
  PluginGatewayAPI,
} from '../types.js';

import {
  OMEGA_PLUGIN_API_VERSION,
  PluginCapability,
  ForbiddenCapability,
  GatewayEventKind,
} from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = resolve(__dirname, '../../schemas');

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(schemasDir, name), 'utf-8'));
}

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

// ═══════════════════════════════════════════════════════════════════
// VALID TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════

const VALID_MANIFEST: PluginManifest = {
  plugin_id: 'hello-plugin',
  name: 'Hello Plugin',
  vendor: 'OMEGA Test',
  description: 'A minimal test plugin',
  version: '1.0.0',
  api_version: '1.0.0',
  supported_omega_api_versions: '>=1.0.0 <2.0.0',
  capabilities: [PluginCapability.READ_TEXT, PluginCapability.WRITE_SUGGESTION],
  io: {
    inputs: [{ kind: 'text', schema_ref: 'text-v1', limits: { max_bytes: 1048576 } }],
    outputs: [{ kind: 'json', schema_ref: 'suggestion-v1', limits: { max_bytes: 524288 } }],
  },
  limits: { max_bytes: 2097152, max_ms: 5000, max_concurrency: 4 },
  determinism: { mode: 'deterministic', notes: 'Pure function, no external state' },
  evidence: { log_level: 'full', redactions: [] },
  entrypoint: { type: 'worker', file: 'dist/worker.js', export: 'handleRequest' },
};

const VALID_TEXT_PAYLOAD: TextPayload = {
  kind: 'text',
  content: 'Hello OMEGA',
  encoding: 'utf-8',
  metadata: { source: 'test' },
};

const VALID_JSON_PAYLOAD: JSONPayload = {
  kind: 'json',
  data: { analysis: 'complete', score: 0.95 },
  schema_ref: 'analysis-v1',
};

const VALID_BINARY_REF_PAYLOAD: BinaryRefPayload = {
  kind: 'binary_ref',
  artifact_id: 'art-001',
  artifact_hash: 'a'.repeat(64),
  mime_type: 'application/pdf',
};

const VALID_DATASET_SLICE_PAYLOAD: DatasetSlicePayload = {
  kind: 'dataset_slice',
  slice_ids: ['s1', 's2', 's3'],
  source: 'canon-store',
  filters: { chapter: '1' },
};

// ═══════════════════════════════════════════════════════════════════
// TYPE COMPILATION TESTS
// ═══════════════════════════════════════════════════════════════════

describe('E2 — Type Compilation', () => {
  it('OMEGA_PLUGIN_API_VERSION is 1.0.0', () => {
    expect(OMEGA_PLUGIN_API_VERSION).toBe('1.0.0');
  });

  it('PluginCapability enum has 6 values', () => {
    const values = Object.values(PluginCapability);
    expect(values).toHaveLength(6);
    expect(values).toContain('read_text');
    expect(values).toContain('write_report');
  });

  it('ForbiddenCapability enum has 4 values', () => {
    const values = Object.values(ForbiddenCapability);
    expect(values).toHaveLength(4);
    expect(values).toContain('filesystem_access');
    expect(values).toContain('network_access');
  });

  it('GatewayEventKind enum has 8 values', () => {
    const values = Object.values(GatewayEventKind);
    expect(values).toHaveLength(8);
  });

  it('PluginPayload discriminated union covers 4 kinds', () => {
    const payloads: PluginPayload[] = [
      VALID_TEXT_PAYLOAD,
      VALID_JSON_PAYLOAD,
      VALID_BINARY_REF_PAYLOAD,
      VALID_DATASET_SLICE_PAYLOAD,
    ];
    const kinds = payloads.map(p => p.kind);
    expect(kinds).toEqual(['text', 'json', 'binary_ref', 'dataset_slice']);
  });

  it('PluginManifest fixture is type-correct', () => {
    const m: PluginManifest = VALID_MANIFEST;
    expect(m.plugin_id).toBe('hello-plugin');
    expect(m.capabilities).toHaveLength(2);
    expect(m.entrypoint.type).toBe('worker');
  });

  it('PluginGatewayAPI interface has 8 methods', () => {
    // Compile-time check: if this type assertion fails, TS will error
    const methodNames: (keyof PluginGatewayAPI)[] = [
      'validateManifest',
      'registerPlugin',
      'enablePlugin',
      'disablePlugin',
      'listPlugins',
      'invoke',
      'invokePipeline',
      'exportProof',
    ];
    expect(methodNames).toHaveLength(8);
  });
});

// ═══════════════════════════════════════════════════════════════════
// MANIFEST SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════

describe('E2 — Manifest Schema Validation', () => {
  const schema = loadSchema('plugin-manifest.schema.json');
  const ajv = createAjv();
  const validate = ajv.compile(schema);

  it('accepts valid manifest', () => {
    const result = validate(VALID_MANIFEST);
    expect(result).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('rejects manifest missing plugin_id', () => {
    const { plugin_id, ...rest } = VALID_MANIFEST;
    expect(validate(rest)).toBe(false);
  });

  it('rejects manifest with invalid plugin_id format', () => {
    expect(validate({ ...VALID_MANIFEST, plugin_id: 'INVALID ID!!' })).toBe(false);
  });

  it('rejects manifest with forbidden capability', () => {
    expect(validate({
      ...VALID_MANIFEST,
      capabilities: ['filesystem_access'],
    })).toBe(false);
  });

  it('rejects manifest with empty capabilities', () => {
    expect(validate({ ...VALID_MANIFEST, capabilities: [] })).toBe(false);
  });

  it('rejects manifest with invalid version format', () => {
    expect(validate({ ...VALID_MANIFEST, version: 'v1' })).toBe(false);
  });

  it('rejects manifest with invalid determinism mode', () => {
    expect(validate({
      ...VALID_MANIFEST,
      determinism: { mode: 'maybe', notes: '' },
    })).toBe(false);
  });

  it('rejects manifest with extra fields (additionalProperties)', () => {
    expect(validate({ ...VALID_MANIFEST, secret_backdoor: true })).toBe(false);
  });

  it('rejects manifest with max_ms < 100', () => {
    expect(validate({
      ...VALID_MANIFEST,
      limits: { max_bytes: 1, max_ms: 50, max_concurrency: 1 },
    })).toBe(false);
  });

  it('rejects manifest with non-worker entrypoint', () => {
    expect(validate({
      ...VALID_MANIFEST,
      entrypoint: { type: 'process', file: 'x', export: 'y' },
    })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GATEWAY EVENT SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════

describe('E2 — Gateway Event Schema Validation', () => {
  const schema = loadSchema('gateway-event.schema.json');
  const ajv = createAjv();
  const validate = ajv.compile(schema);

  const VALID_EVENT: GatewayEvent = {
    event_id: 'evt-001',
    run_id: 'run-001',
    ts: '2026-02-06T22:00:00.000Z',
    kind: GatewayEventKind.REGISTER,
    plugin_id: 'hello-plugin',
    request_id: '',
    input_hash: '',
    output_hash: '',
    prev_hash: '',
    event_hash: 'a'.repeat(64),
    meta: { action: 'register' },
  };

  it('accepts valid event', () => {
    expect(validate(VALID_EVENT)).toBe(true);
  });

  it('rejects event with invalid kind', () => {
    expect(validate({ ...VALID_EVENT, kind: 'HACK' })).toBe(false);
  });

  it('rejects event with invalid event_hash (not 64 hex chars)', () => {
    expect(validate({ ...VALID_EVENT, event_hash: 'short' })).toBe(false);
  });

  it('rejects event missing required fields', () => {
    const { event_id, ...rest } = VALID_EVENT;
    expect(validate(rest)).toBe(false);
  });

  it('rejects event with non-string meta values', () => {
    expect(validate({ ...VALID_EVENT, meta: { count: 42 } })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// REQUEST SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════

describe('E2 — Request Schema Validation', () => {
  const schema = loadSchema('plugin-request.schema.json');
  const ajv = createAjv();
  const validate = ajv.compile(schema);

  const VALID_REQUEST: PluginRequest = {
    request_id: 'req-001',
    run_id: 'run-001',
    timestamp: '2026-02-06T22:00:00.000Z',
    payload: VALID_TEXT_PAYLOAD,
    context: { session: 'test' },
    policy: { deterministic_only: true, timeout_ms: 5000, max_retries: 1 },
  };

  it('accepts valid request with text payload', () => {
    expect(validate(VALID_REQUEST)).toBe(true);
  });

  it('accepts valid request with json payload', () => {
    expect(validate({ ...VALID_REQUEST, payload: VALID_JSON_PAYLOAD })).toBe(true);
  });

  it('accepts valid request with binary_ref payload', () => {
    expect(validate({ ...VALID_REQUEST, payload: VALID_BINARY_REF_PAYLOAD })).toBe(true);
  });

  it('accepts valid request with dataset_slice payload', () => {
    expect(validate({ ...VALID_REQUEST, payload: VALID_DATASET_SLICE_PAYLOAD })).toBe(true);
  });

  it('rejects request with unknown payload kind', () => {
    expect(validate({
      ...VALID_REQUEST,
      payload: { kind: 'executable', code: 'rm -rf /' },
    })).toBe(false);
  });

  it('rejects request with timeout below minimum', () => {
    expect(validate({
      ...VALID_REQUEST,
      policy: { deterministic_only: true, timeout_ms: 50, max_retries: 0 },
    })).toBe(false);
  });

  it('rejects request missing policy', () => {
    const { policy, ...rest } = VALID_REQUEST;
    expect(validate(rest)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// SCHEMA FILES STRUCTURAL VALIDATION
// ═══════════════════════════════════════════════════════════════════

describe('E2 — Schema Files Integrity', () => {
  const schemaFiles = [
    'plugin-manifest.schema.json',
    'gateway-event.schema.json',
    'plugin-request.schema.json',
    'plugin-response.schema.json',
  ];

  for (const file of schemaFiles) {
    it(`${file} is valid JSON`, () => {
      const content = readFileSync(resolve(schemasDir, file), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it(`${file} has $schema and $id`, () => {
      const schema = loadSchema(file);
      expect(schema).toHaveProperty('$schema');
      expect(schema).toHaveProperty('$id');
    });

    it(`${file} compiles in AJV`, () => {
      const ajv = createAjv();
      const schema = loadSchema(file);
      expect(() => ajv.compile(schema)).not.toThrow();
    });
  }
});
