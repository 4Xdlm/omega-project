/**
 * E3 Tests — Registry + Validator
 *
 * T3: Compatibility (semver gate rejects incompatible)
 * T4: Schema validation (reject invalid I/O)
 * T5: Capability enforcement (forbidden caps → rejected)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../registry.js';
import { ManifestValidator } from '../validator.js';
import type { PluginManifest, PluginRequest } from '../types.js';
import { PluginCapability } from '../types.js';

// ═══════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════

const NOW = '2026-02-07T00:00:00.000Z';

const VALID_MANIFEST: PluginManifest = {
  plugin_id: 'test-plugin',
  name: 'Test Plugin',
  vendor: 'OMEGA Test',
  description: 'A test plugin',
  version: '1.0.0',
  api_version: '1.0.0',
  supported_omega_api_versions: '>=1.0.0 <2.0.0',
  capabilities: [PluginCapability.READ_TEXT, PluginCapability.WRITE_SUGGESTION],
  io: {
    inputs: [{ kind: 'text', schema_ref: 'text-v1', limits: { max_bytes: 1048576 } }],
    outputs: [{ kind: 'json', schema_ref: 'suggestion-v1', limits: { max_bytes: 524288 } }],
  },
  limits: { max_bytes: 2097152, max_ms: 5000, max_concurrency: 4 },
  determinism: { mode: 'deterministic', notes: 'Pure function' },
  evidence: { log_level: 'full', redactions: [] },
  entrypoint: { type: 'worker', file: 'dist/worker.js', export: 'handleRequest' },
};

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return { ...VALID_MANIFEST, ...overrides };
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRY TESTS
// ═══════════════════════════════════════════════════════════════════

describe('E3 — Registry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('registers a plugin with valid signature', () => {
    const info = registry.register(VALID_MANIFEST, 'sig-valid', true, NOW);
    expect(info.plugin_id).toBe('test-plugin');
    expect(info.status).toBe('registered');
    expect(info.signature_valid).toBe(true);
  });

  it('registers plugin as rejected when signature is invalid', () => {
    const info = registry.register(VALID_MANIFEST, 'sig-bad', false, NOW);
    expect(info.status).toBe('rejected');
    expect(info.signature_valid).toBe(false);
  });

  it('throws on duplicate registration', () => {
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    expect(() => registry.register(VALID_MANIFEST, 'sig', true, NOW))
      .toThrow('Plugin already registered');
  });

  it('enables a registered plugin', () => {
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    registry.enable('test-plugin');
    expect(registry.isEnabled('test-plugin')).toBe(true);
  });

  it('enable is idempotent', () => {
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    registry.enable('test-plugin');
    registry.enable('test-plugin');
    expect(registry.isEnabled('test-plugin')).toBe(true);
  });

  it('disables an enabled plugin', () => {
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    registry.enable('test-plugin');
    registry.disable('test-plugin');
    expect(registry.isEnabled('test-plugin')).toBe(false);
  });

  it('cannot enable rejected plugin', () => {
    registry.register(VALID_MANIFEST, 'sig', false, NOW);
    expect(() => registry.enable('test-plugin'))
      .toThrow('Cannot enable rejected plugin');
  });

  it('cannot disable rejected plugin', () => {
    registry.register(VALID_MANIFEST, 'sig', false, NOW);
    expect(() => registry.disable('test-plugin'))
      .toThrow('Cannot disable rejected plugin');
  });

  it('throws on unknown plugin', () => {
    expect(() => registry.enable('ghost')).toThrow('Plugin not found');
  });

  it('lists all plugins', () => {
    const m1 = makeManifest({ plugin_id: 'plug-a', name: 'A' });
    const m2 = makeManifest({ plugin_id: 'plug-b', name: 'B' });
    registry.register(m1, 'sig', true, NOW);
    registry.register(m2, 'sig', true, NOW);
    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list.map(p => p.plugin_id).sort()).toEqual(['plug-a', 'plug-b']);
  });

  it('count returns correct number', () => {
    expect(registry.count()).toBe(0);
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    expect(registry.count()).toBe(1);
  });

  it('get returns entry with manifest', () => {
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    const entry = registry.get('test-plugin');
    expect(entry.manifest.plugin_id).toBe('test-plugin');
    expect(entry.signature).toBe('sig');
  });

  it('has returns true for registered, false for unknown', () => {
    expect(registry.has('test-plugin')).toBe(false);
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    expect(registry.has('test-plugin')).toBe(true);
  });

  it('preserves capabilities in listing', () => {
    registry.register(VALID_MANIFEST, 'sig', true, NOW);
    const list = registry.list();
    expect(list[0]?.capabilities).toEqual([PluginCapability.READ_TEXT, PluginCapability.WRITE_SUGGESTION]);
  });

  it('preserves registered_at timestamp', () => {
    const ts = '2026-12-25T00:00:00.000Z';
    registry.register(VALID_MANIFEST, 'sig', true, ts);
    const list = registry.list();
    expect(list[0]?.registered_at).toBe(ts);
  });
});

// ═══════════════════════════════════════════════════════════════════
// VALIDATOR — MANIFEST
// ═══════════════════════════════════════════════════════════════════

describe('E3 — Validator (Manifest)', () => {
  let validator: ManifestValidator;

  beforeEach(() => {
    validator = new ManifestValidator();
  });

  it('validates a correct manifest', () => {
    const report = validator.validateManifest(VALID_MANIFEST, NOW);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.manifest_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  // T3: Compatibility — semver gate
  it('T3: rejects incompatible API version (major mismatch)', () => {
    const m = makeManifest({ api_version: '2.0.0' });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
    expect(report.issues.some(i => i.field === 'api_version')).toBe(true);
  });

  it('T3: rejects API version 0.x (pre-release)', () => {
    const m = makeManifest({ api_version: '0.9.0' });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
  });

  it('T3: accepts compatible minor version', () => {
    const m = makeManifest({ api_version: '1.2.0' });
    const report = validator.validateManifest(m, NOW);
    // Should pass — same major
    expect(report.issues.filter(i => i.field === 'api_version')).toHaveLength(0);
  });

  // T4: Schema validation
  it('T4: rejects manifest with missing required field', () => {
    const bad = { ...VALID_MANIFEST } as Record<string, unknown>;
    delete bad['plugin_id'];
    const report = validator.validateManifest(bad as PluginManifest, NOW);
    expect(report.valid).toBe(false);
  });

  it('T4: rejects manifest with invalid version format', () => {
    const m = makeManifest({ version: 'not-semver' });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
  });

  it('T4: rejects manifest with extra fields', () => {
    const m = { ...VALID_MANIFEST, backdoor: true } as unknown as PluginManifest;
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
  });

  // T5: Capability enforcement
  it('T5: rejects manifest with filesystem_access capability', () => {
    const m = makeManifest({
      capabilities: ['filesystem_access'] as unknown as PluginManifest['capabilities'],
    });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
    expect(report.issues.some(i => i.message.includes('Forbidden capability'))).toBe(true);
  });

  it('T5: rejects manifest with network_access capability', () => {
    const m = makeManifest({
      capabilities: ['network_access'] as unknown as PluginManifest['capabilities'],
    });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
  });

  it('T5: rejects manifest with process_spawn capability', () => {
    const m = makeManifest({
      capabilities: ['process_spawn'] as unknown as PluginManifest['capabilities'],
    });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
  });

  it('T5: rejects manifest with env_access capability', () => {
    const m = makeManifest({
      capabilities: ['env_access'] as unknown as PluginManifest['capabilities'],
    });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
  });

  // IO consistency
  it('rejects manifest where input kind lacks matching capability', () => {
    const m = makeManifest({
      capabilities: [PluginCapability.WRITE_SUGGESTION],
      io: {
        inputs: [{ kind: 'text', schema_ref: 'x', limits: { max_bytes: 1024 } }],
        outputs: [],
      },
    });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
    expect(report.issues.some(i => i.message.includes('requires capability'))).toBe(true);
  });

  // Non-worker entrypoint
  it('rejects non-worker entrypoint', () => {
    const m = makeManifest({
      entrypoint: { type: 'process' as 'worker', file: 'x', export: 'y' },
    });
    const report = validator.validateManifest(m, NOW);
    expect(report.valid).toBe(false);
    expect(report.issues.some(i => i.message.includes('worker'))).toBe(true);
  });

  // Excessive timeout warning
  it('warns on excessive timeout', () => {
    const m = makeManifest({
      limits: { max_bytes: 1024, max_ms: 120000, max_concurrency: 1 },
    });
    const report = validator.validateManifest(m, NOW);
    expect(report.issues.some(i => i.severity === 'warning' && i.message.includes('exceeds'))).toBe(true);
  });

  // Manifest hash determinism
  it('produces deterministic manifest hash', () => {
    const r1 = validator.validateManifest(VALID_MANIFEST, NOW);
    const r2 = validator.validateManifest(VALID_MANIFEST, NOW);
    expect(r1.manifest_hash).toBe(r2.manifest_hash);
    expect(r1.manifest_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// VALIDATOR — REQUEST
// ═══════════════════════════════════════════════════════════════════

describe('E3 — Validator (Request)', () => {
  let validator: ManifestValidator;

  beforeEach(() => {
    validator = new ManifestValidator();
  });

  const VALID_REQUEST: PluginRequest = {
    request_id: 'req-001',
    run_id: 'run-001',
    timestamp: '2026-02-07T00:00:00.000Z',
    payload: { kind: 'text', content: 'hello', encoding: 'utf-8', metadata: {} },
    context: {},
    policy: { deterministic_only: true, timeout_ms: 5000, max_retries: 0 },
  };

  it('accepts valid request', () => {
    const issues = validator.validateRequest(VALID_REQUEST);
    expect(issues).toHaveLength(0);
  });

  it('rejects request with unknown payload kind', () => {
    const bad = {
      ...VALID_REQUEST,
      payload: { kind: 'executable', code: 'bad' },
    } as unknown as PluginRequest;
    const issues = validator.validateRequest(bad);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('rejects request missing required fields', () => {
    const { policy, ...rest } = VALID_REQUEST;
    const issues = validator.validateRequest(rest as unknown as PluginRequest);
    expect(issues.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// REGISTRY + VALIDATOR INTEGRATION
// ═══════════════════════════════════════════════════════════════════

describe('E3 — Registry + Validator Integration', () => {
  it('validates then registers a plugin end-to-end', () => {
    const validator = new ManifestValidator();
    const registry = new PluginRegistry();

    const report = validator.validateManifest(VALID_MANIFEST, NOW);
    expect(report.valid).toBe(true);

    const info = registry.register(VALID_MANIFEST, 'sig-ok', true, NOW);
    expect(info.status).toBe('registered');

    registry.enable('test-plugin');
    expect(registry.isEnabled('test-plugin')).toBe(true);
  });

  it('rejects invalid manifest before registration', () => {
    const validator = new ManifestValidator();
    const registry = new PluginRegistry();

    const badManifest = makeManifest({ api_version: '9.0.0' });
    const report = validator.validateManifest(badManifest, NOW);
    expect(report.valid).toBe(false);

    // Should NOT register if validation failed (fail-closed)
    // In real gateway, registration is gated by validation
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it('handles 100 plugins registration (stress baseline)', () => {
    const registry = new PluginRegistry();
    for (let i = 0; i < 100; i++) {
      const m = makeManifest({ plugin_id: `plugin-${String(i).padStart(3, '0')}`, name: `Plugin ${i}` });
      registry.register(m, `sig-${i}`, true, NOW);
    }
    expect(registry.count()).toBe(100);
    expect(registry.list()).toHaveLength(100);
  });
});
