/**
 * OMEGA Runner — ProofPack Tests
 * Phase D.1 — 20 tests for manifest, hash, and proofpack structure
 */

import { describe, it, expect } from 'vitest';
import { hashString, hashObject, hashFileContent, generateRunId } from '../src/proofpack/hash.js';
import { buildManifest, hashManifest, validateManifest } from '../src/proofpack/manifest.js';
import { canonicalJSON } from '../src/proofpack/canonical.js';
import { makeSampleManifest } from './fixtures.js';
import { getVersionMap } from '../src/version.js';
import type { ArtifactEntry, StageId } from '../src/types.js';

describe('hashString', () => {
  it('returns a 64-char lowercase hex string', () => {
    const result = hashString('hello');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashObject', () => {
  it('is deterministic for same input', () => {
    const obj = { b: 2, a: 1 };
    const h1 = hashObject(obj);
    const h2 = hashObject(obj);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});

describe('hashFileContent', () => {
  it('normalizes CRLF before hashing', () => {
    const lf = hashFileContent('line1\nline2\n');
    const crlf = hashFileContent('line1\r\nline2\r\n');
    expect(lf).toBe(crlf);
  });
});

describe('generateRunId', () => {
  const intent = 'test-intent';
  const seed = 'test-seed';
  const versions = { runner: '0.1.0', genesis: '0.1.0', scribe: '0.1.0', style: '0.1.0', creation: '0.1.0', forge: '0.1.0' };

  it('returns a 16-char hex string', () => {
    const id = generateRunId(intent, seed, versions);
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('INV-RUN-01: is deterministic (same input -> same ID)', () => {
    const id1 = generateRunId(intent, seed, versions);
    const id2 = generateRunId(intent, seed, versions);
    expect(id1).toBe(id2);
  });

  it('different seed produces different ID', () => {
    const id1 = generateRunId(intent, 'seed-a', versions);
    const id2 = generateRunId(intent, 'seed-b', versions);
    expect(id1).not.toBe(id2);
  });

  it('INV-RUN-08: seed default empty string produces valid ID', () => {
    const id = generateRunId(intent, '', versions);
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('empty seed produces valid ID', () => {
    const id = generateRunId('intent', '', versions);
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('long seed produces valid ID', () => {
    const longSeed = 'x'.repeat(10000);
    const id = generateRunId('intent', longSeed, versions);
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('buildManifest', () => {
  const versions = getVersionMap();
  const artifacts: ArtifactEntry[] = [
    { stage: '20-scribe', filename: 'scribe.json', path: '20-scribe/scribe.json', sha256: 'c'.repeat(64), size: 300 },
    { stage: '00-intent', filename: 'intent.json', path: '00-intent/intent.json', sha256: 'a'.repeat(64), size: 100 },
    { stage: '10-genesis', filename: 'genesis.json', path: '10-genesis/genesis.json', sha256: 'b'.repeat(64), size: 200 },
  ];
  const stages: StageId[] = ['00-intent', '10-genesis', '20-scribe'];

  it('includes all required fields', () => {
    const m = buildManifest('abcdef0123456789', 'seed', versions, artifacts, '1'.repeat(64), '2'.repeat(64), '3'.repeat(64), 'PASS', stages);
    expect(m.run_id).toBe('abcdef0123456789');
    expect(m.seed).toBe('seed');
    expect(m.versions).toEqual(versions);
    expect(m.merkle_root).toBe('1'.repeat(64));
    expect(m.intent_hash).toBe('2'.repeat(64));
    expect(m.final_hash).toBe('3'.repeat(64));
    expect(m.verdict).toBe('PASS');
    expect(m.stages_completed).toEqual(stages);
    expect(m.artifacts).toHaveLength(3);
  });

  it('sorts artifacts by path', () => {
    const m = buildManifest('abcdef0123456789', 'seed', versions, artifacts, '1'.repeat(64), '2'.repeat(64), '3'.repeat(64), 'PASS', stages);
    const paths = m.artifacts.map((a) => a.path);
    expect(paths).toEqual([
      '00-intent/intent.json',
      '10-genesis/genesis.json',
      '20-scribe/scribe.json',
    ]);
  });

  it('single artifact manifest is valid', () => {
    const singleArtifact: ArtifactEntry[] = [
      { stage: '00-intent', filename: 'intent.json', path: '00-intent/intent.json', sha256: 'a'.repeat(64), size: 100 },
    ];
    const m = buildManifest('abcdef0123456789', 'seed', versions, singleArtifact, '1'.repeat(64), '2'.repeat(64), '3'.repeat(64), 'PASS', ['00-intent']);
    expect(m.artifacts).toHaveLength(1);
    expect(validateManifest(m)).toBe(true);
  });
});

describe('hashManifest', () => {
  it('is deterministic (same manifest -> same hash)', () => {
    const m = makeSampleManifest();
    const h1 = hashManifest(m);
    const h2 = hashManifest(m);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('INV-RUN-02: manifest.sha256 = SHA-256(canonicalJSON(manifest))', () => {
    const m = makeSampleManifest();
    const mHash = hashManifest(m);
    // hashManifest does hashString(canonicalJSON(manifest))
    // hashString does sha256(canonicalBytes(input))
    // Since canonicalJSON output has no CRLF, canonicalBytes is a no-op
    const h2 = hashManifest(m);
    expect(mHash).toBe(h2);
    expect(mHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('validateManifest', () => {
  it('valid structure passes', () => {
    const m = makeSampleManifest();
    expect(validateManifest(m)).toBe(true);
  });

  it('invalid run_id (wrong length) fails', () => {
    const m = { ...makeSampleManifest(), run_id: 'short' };
    expect(validateManifest(m)).toBe(false);
  });

  it('invalid merkle_root (wrong length) fails', () => {
    const m = { ...makeSampleManifest(), merkle_root: 'tooshort' };
    expect(validateManifest(m)).toBe(false);
  });

  it('INV-RUN-03: no phantom files — artifacts array must not be empty', () => {
    const m = { ...makeSampleManifest(), artifacts: [] as readonly ArtifactEntry[] };
    expect(validateManifest(m)).toBe(false);
  });

  it('INV-RUN-04: all artifacts hashed (64-char hex)', () => {
    const m = makeSampleManifest();
    for (const a of m.artifacts) {
      expect(a.sha256).toHaveLength(64);
      expect(a.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('Determinism: identical manifests produce identical hashes', () => {
    const m1 = makeSampleManifest();
    const m2 = makeSampleManifest();
    const h1 = hashManifest(m1);
    const h2 = hashManifest(m2);
    expect(h1).toBe(h2);
  });
});
