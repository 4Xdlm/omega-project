/**
 * OMEGA Governance — CI Invariants Tests
 * Phase F — INV-F-01 through INV-F-10
 */

import { describe, it, expect } from 'vitest';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  checkBaselineImmutable,
  checkReplaySameSeed,
  checkReplayByteIdentical,
  checkGatesSequential,
  checkThresholdsFromConfig,
  checkCertificateIncludesGates,
  checkReportPureFunction,
  checkBaselineRegisteredImmutable,
  checkBadgeReflectsVerdict,
  checkCIDeterministic,
  checkAvailableCIInvariants,
} from '../../src/invariants/ci-invariants.js';
import { DEFAULT_CI_CONFIG } from '../../src/ci/config.js';
import type { BaselineRegistry } from '../../src/ci/baseline/types.js';
import type { ReplayResult } from '../../src/ci/replay/types.js';
import type { GateResult } from '../../src/ci/gates/types.js';
import type { CIResult } from '../../src/ci/types.js';
import type { BadgeResult } from '../../src/ci/badge/types.js';

describe('INV-F-01: BASELINE_IMMUTABLE', () => {
  it('passes when baselines unchanged', () => {
    const registry: BaselineRegistry = {
      version: '1.0.0',
      baselines: [{ version: 'v1.0.0', path: '', created_at: '', manifest_hash: 'abc', certified: true, intents: [] }],
      updated_at: '',
    };
    const result = checkBaselineImmutable(registry, registry);
    expect(result.status).toBe('PASS');
  });

  it('fails when baseline deleted', () => {
    const before: BaselineRegistry = {
      version: '1.0.0',
      baselines: [{ version: 'v1.0.0', path: '', created_at: '', manifest_hash: 'abc', certified: true, intents: [] }],
      updated_at: '',
    };
    const after: BaselineRegistry = { version: '1.0.0', baselines: [], updated_at: '' };
    const result = checkBaselineImmutable(before, after);
    expect(result.status).toBe('FAIL');
  });

  it('fails when manifest_hash changed', () => {
    const before: BaselineRegistry = {
      version: '1.0.0',
      baselines: [{ version: 'v1.0.0', path: '', created_at: '', manifest_hash: 'abc', certified: true, intents: [] }],
      updated_at: '',
    };
    const after: BaselineRegistry = {
      version: '1.0.0',
      baselines: [{ version: 'v1.0.0', path: '', created_at: '', manifest_hash: 'xyz', certified: true, intents: [] }],
      updated_at: '',
    };
    const result = checkBaselineImmutable(before, after);
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-02: REPLAY_SAME_SEED', () => {
  it('passes when seeds match', () => {
    const result = checkReplaySameSeed('omega-ci', 'omega-ci');
    expect(result.status).toBe('PASS');
  });

  it('fails when seeds differ', () => {
    const result = checkReplaySameSeed('omega-ci', 'other-seed');
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-03: REPLAY_BYTE_IDENTICAL', () => {
  it('passes for identical replay', () => {
    const replay: ReplayResult = {
      baseline_run_id: 'a', replay_run_id: 'b', seed: 's',
      identical: true, differences: [], manifest_match: true, merkle_match: true, duration_ms: 10,
    };
    const result = checkReplayByteIdentical(replay);
    expect(result.status).toBe('PASS');
  });

  it('fails for non-identical replay', () => {
    const replay: ReplayResult = {
      baseline_run_id: 'a', replay_run_id: 'b', seed: 's',
      identical: false, differences: [{ path: 'x', type: 'HASH_MISMATCH', message: 'diff' }],
      manifest_match: false, merkle_match: false, duration_ms: 10,
    };
    const result = checkReplayByteIdentical(replay);
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-04: GATES_SEQUENTIAL', () => {
  it('passes for correct order', () => {
    const gates: GateResult[] = [
      { gate: 'G0', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
      { gate: 'G1', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
      { gate: 'G2', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
      { gate: 'G3', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
      { gate: 'G4', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
      { gate: 'G5', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
    ];
    const result = checkGatesSequential(gates);
    expect(result.status).toBe('PASS');
  });

  it('passes for fail-fast pattern', () => {
    const gates: GateResult[] = [
      { gate: 'G0', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
      { gate: 'G1', name: '', verdict: 'FAIL', duration_ms: 0, details: [], checks: [] },
      { gate: 'G2', name: '', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
      { gate: 'G3', name: '', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
      { gate: 'G4', name: '', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
      { gate: 'G5', name: '', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
    ];
    const result = checkGatesSequential(gates);
    expect(result.status).toBe('PASS');
  });

  it('fails when gate not SKIPPED after failure', () => {
    const gates: GateResult[] = [
      { gate: 'G0', name: '', verdict: 'FAIL', duration_ms: 0, details: [], checks: [] },
      { gate: 'G1', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] }, // Should be SKIPPED
    ];
    const result = checkGatesSequential(gates);
    expect(result.status).toBe('FAIL');
  });

  it('fails for wrong order', () => {
    const gates: GateResult[] = [
      { gate: 'G1', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] }, // Should be G0
      { gate: 'G0', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
    ];
    const result = checkGatesSequential(gates);
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-05: THRESHOLDS_FROM_CONFIG', () => {
  it('passes for valid config', () => {
    const result = checkThresholdsFromConfig(DEFAULT_CI_CONFIG);
    expect(result.status).toBe('PASS');
  });
});

describe('INV-F-06: CERTIFICATE_INCLUDES_GATES', () => {
  it('passes when all gates present for PASS verdict', () => {
    const ciResult: CIResult = {
      run_id: '', baseline_version: '', started_at: '', completed_at: '',
      duration_ms: 0, verdict: 'PASS', config: DEFAULT_CI_CONFIG,
      gates: [
        { gate: 'G0', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
        { gate: 'G1', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
        { gate: 'G2', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
        { gate: 'G3', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
        { gate: 'G4', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
        { gate: 'G5', name: '', verdict: 'PASS', duration_ms: 0, details: [], checks: [] },
      ],
    };
    const result = checkCertificateIncludesGates(ciResult);
    expect(result.status).toBe('PASS');
  });

  it('fails when G0 missing', () => {
    const ciResult: CIResult = {
      run_id: '', baseline_version: '', started_at: '', completed_at: '',
      duration_ms: 0, verdict: 'FAIL', config: DEFAULT_CI_CONFIG, gates: [],
    };
    const result = checkCertificateIncludesGates(ciResult);
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-07: REPORT_PURE_FUNCTION', () => {
  it('passes for identical outputs', () => {
    const result = checkReportPureFunction('abc', 'abc');
    expect(result.status).toBe('PASS');
  });

  it('fails for different outputs', () => {
    const result = checkReportPureFunction('abc', 'def');
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-08: BASELINE_REGISTERED_IMMUTABLE', () => {
  it('passes when re-registration throws', () => {
    const registry: BaselineRegistry = {
      version: '1.0.0',
      baselines: [{ version: 'v1.0.0', path: '', created_at: '', manifest_hash: '', certified: true, intents: [] }],
      updated_at: '',
    };
    const result = checkBaselineRegisteredImmutable('v1.0.0', registry, true, true);
    expect(result.status).toBe('PASS');
  });

  it('fails when re-registration allowed', () => {
    const registry: BaselineRegistry = {
      version: '1.0.0',
      baselines: [{ version: 'v1.0.0', path: '', created_at: '', manifest_hash: '', certified: true, intents: [] }],
      updated_at: '',
    };
    const result = checkBaselineRegisteredImmutable('v1.0.0', registry, true, false);
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-09: BADGE_REFLECTS_VERDICT', () => {
  it('passes when badge matches PASS verdict', () => {
    const ciResult: CIResult = {
      run_id: '', baseline_version: '', started_at: '', completed_at: '',
      duration_ms: 0, verdict: 'PASS', config: DEFAULT_CI_CONFIG, gates: [],
    };
    const badge: BadgeResult = { svg: '', shield_url: '', alt_text: '', status: 'passing' };
    const result = checkBadgeReflectsVerdict(ciResult, badge);
    expect(result.status).toBe('PASS');
  });

  it('fails when badge does not match verdict', () => {
    const ciResult: CIResult = {
      run_id: '', baseline_version: '', started_at: '', completed_at: '',
      duration_ms: 0, verdict: 'PASS', config: DEFAULT_CI_CONFIG, gates: [],
    };
    const badge: BadgeResult = { svg: '', shield_url: '', alt_text: '', status: 'failing' };
    const result = checkBadgeReflectsVerdict(ciResult, badge);
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-F-10: CI_DETERMINISTIC', () => {
  it('passes for identical hashes', () => {
    const result = checkCIDeterministic('abc123', 'abc123');
    expect(result.status).toBe('PASS');
  });

  it('fails for different hashes', () => {
    const result = checkCIDeterministic('abc123', 'def456');
    expect(result.status).toBe('FAIL');
  });
});

describe('checkAvailableCIInvariants', () => {
  it('returns all 10 invariant IDs', () => {
    const ids = checkAvailableCIInvariants();
    expect(ids).toHaveLength(10);
    expect(ids).toContain('INV-F-01');
    expect(ids).toContain('INV-F-10');
  });
});
