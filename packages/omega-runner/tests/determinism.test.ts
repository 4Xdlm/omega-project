/**
 * OMEGA Runner — Determinism Tests
 * Phase D.1 — 15 tests proving deterministic behavior
 */

import { describe, it, expect } from 'vitest';
import { orchestrateCreate } from '../src/orchestrator/runCreate.js';
import { orchestrateFull } from '../src/orchestrator/runFull.js';
import { orchestrateForge } from '../src/orchestrator/runForge.js';
import { generateRunId } from '../src/proofpack/hash.js';
import { canonicalJSON } from '../src/proofpack/canonical.js';
import { createLogger } from '../src/logger/index.js';
import { getVersionMap } from '../src/version.js';
import { SAMPLE_INTENT, TEST_SEED, TIMESTAMP } from './fixtures.js';

const versions = getVersionMap() as unknown as Record<string, string>;

describe('INV-RUN-01: generateRunId determinism', () => {
  const intentCanonical = canonicalJSON(SAMPLE_INTENT);

  it('same intent+seed → same RUN_ID', () => {
    const id1 = generateRunId(intentCanonical, TEST_SEED, versions);
    const id2 = generateRunId(intentCanonical, TEST_SEED, versions);
    expect(id1).toBe(id2);
    expect(id1.length).toBe(16);
  });

  it('different seed → different RUN_ID', () => {
    const id1 = generateRunId(intentCanonical, TEST_SEED, versions);
    const id2 = generateRunId(intentCanonical, 'different-seed', versions);
    expect(id1).not.toBe(id2);
  });

  it('different intent → different RUN_ID', () => {
    const altIntent = { ...SAMPLE_INTENT, metadata: { ...SAMPLE_INTENT.metadata, pack_id: 'ALT-PACK' } };
    const altCanonical = canonicalJSON(altIntent);
    const id1 = generateRunId(intentCanonical, TEST_SEED, versions);
    const id2 = generateRunId(altCanonical, TEST_SEED, versions);
    expect(id1).not.toBe(id2);
  });
});

describe('orchestrateCreate determinism', () => {
  it('twice → same run_id', () => {
    const loggerA = createLogger();
    const loggerB = createLogger();
    const a = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerA);
    const b = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerB);
    expect(a.run_id).toBe(b.run_id);
  });

  it('twice → same creation.output_hash', () => {
    const loggerA = createLogger();
    const loggerB = createLogger();
    const a = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerA);
    const b = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerB);
    expect(a.creation.output_hash).toBe(b.creation.output_hash);
  });

  it('twice → same stages_completed', () => {
    const loggerA = createLogger();
    const loggerB = createLogger();
    const a = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerA);
    const b = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerB);
    expect(a.stages_completed).toEqual(b.stages_completed);
  });
});

describe('orchestrateFull determinism', () => {
  it('twice → same run_id', () => {
    const loggerA = createLogger();
    const loggerB = createLogger();
    const a = orchestrateFull(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerA);
    const b = orchestrateFull(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerB);
    expect(a.run_id).toBe(b.run_id);
  });

  it('twice → same forge.output_hash', () => {
    const loggerA = createLogger();
    const loggerB = createLogger();
    const a = orchestrateFull(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerA);
    const b = orchestrateFull(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, loggerB);
    expect(a.forge.output_hash).toBe(b.forge.output_hash);
  });
});

describe('orchestrateForge determinism', () => {
  it('twice → same run_id', () => {
    const logger0 = createLogger();
    const createResult = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, logger0);

    const loggerA = createLogger();
    const loggerB = createLogger();
    const a = orchestrateForge(createResult.creation, TEST_SEED, TIMESTAMP, loggerA);
    const b = orchestrateForge(createResult.creation, TEST_SEED, TIMESTAMP, loggerB);
    expect(a.run_id).toBe(b.run_id);
  });

  it('twice → same forge.output_hash', () => {
    const logger0 = createLogger();
    const createResult = orchestrateCreate(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, logger0);

    const loggerA = createLogger();
    const loggerB = createLogger();
    const a = orchestrateForge(createResult.creation, TEST_SEED, TIMESTAMP, loggerA);
    const b = orchestrateForge(createResult.creation, TEST_SEED, TIMESTAMP, loggerB);
    expect(a.forge.output_hash).toBe(b.forge.output_hash);
  });
});

describe('canonicalJSON determinism', () => {
  it('same object twice → same string', () => {
    const obj = { b: 2, a: 1, c: [3, 4] };
    const s1 = canonicalJSON(obj);
    const s2 = canonicalJSON(obj);
    expect(s1).toBe(s2);
  });

  it('key order independent', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(canonicalJSON(obj1)).toBe(canonicalJSON(obj2));
  });
});

describe('INV-RUN-08: seed normalization', () => {
  it('empty seed normalized', () => {
    const intentCanonical = canonicalJSON(SAMPLE_INTENT);
    const id1 = generateRunId(intentCanonical, '', versions);
    const id2 = generateRunId(intentCanonical, '', versions);
    expect(id1).toBe(id2);
    expect(id1.length).toBe(16);
  });

  it('undefined seed → empty string', () => {
    const intentCanonical = canonicalJSON(SAMPLE_INTENT);
    const id1 = generateRunId(intentCanonical, undefined as unknown as string, versions);
    const id2 = generateRunId(intentCanonical, undefined as unknown as string, versions);
    expect(id1).toBe(id2);
  });
});

describe('getVersionMap stability', () => {
  it('is stable across calls', () => {
    const v1 = getVersionMap();
    const v2 = getVersionMap();
    expect(v1).toEqual(v2);
    expect(canonicalJSON(v1)).toBe(canonicalJSON(v2));
  });
});
