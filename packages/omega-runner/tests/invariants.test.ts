/**
 * OMEGA Runner — Invariant Checker Tests
 * Phase D.1 — 20 tests covering INV-RUN-01..12
 */

import { describe, it, expect } from 'vitest';
import {
  checkRunIdStable,
  checkManifestHash,
  checkNoPhantomFiles,
  checkArtifactHashed,
  checkOrderIndependent,
  checkReportDerived,
  checkStageComplete,
  checkSeedDefault,
  checkCrlfImmune,
  checkNoUndeclaredDeps,
  checkMerkleValid,
  checkVerifyIdempotent,
} from '../src/invariants/checker.js';
import { hashString, generateRunId } from '../src/proofpack/hash.js';
import { canonicalJSON } from '../src/proofpack/canonical.js';
import { buildMerkleTree } from '../src/proofpack/merkle.js';
import { makeSampleManifest } from './fixtures.js';

describe('INV-RUN-01: checkRunIdStable', () => {
  it('PASS with correct runId', () => {
    const manifest = makeSampleManifest();
    const intentCanonical = canonicalJSON({ test: 'intent' });
    const versions = manifest.versions as unknown as Record<string, string>;
    // Generate the expected runId the same way the checker does
    const expectedRunId = generateRunId(intentCanonical, manifest.seed, versions);

    const result = checkRunIdStable(intentCanonical, manifest.seed, versions, expectedRunId);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-01');
  });

  it('FAIL with wrong runId', () => {
    const manifest = makeSampleManifest();
    const intentCanonical = canonicalJSON({ test: 'intent' });
    const versions = manifest.versions as unknown as Record<string, string>;

    const result = checkRunIdStable(intentCanonical, manifest.seed, versions, 'wrong-run-id-000');
    expect(result.status).toBe('FAIL');
    expect(result.id).toBe('INV-RUN-01');
  });
});

describe('INV-RUN-02: checkManifestHash', () => {
  it('PASS with correct hash', () => {
    const manifest = makeSampleManifest();
    const correctHash = hashString(canonicalJSON(manifest));

    const result = checkManifestHash(manifest, correctHash);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-02');
  });

  it('FAIL with wrong hash', () => {
    const manifest = makeSampleManifest();
    const wrongHash = 'x'.repeat(64);

    const result = checkManifestHash(manifest, wrongHash);
    expect(result.status).toBe('FAIL');
    expect(result.id).toBe('INV-RUN-02');
  });
});

describe('INV-RUN-03: checkNoPhantomFiles', () => {
  it('PASS no extra files', () => {
    const manifest = makeSampleManifest();
    const actualFiles = manifest.artifacts.map((a) => a.path);

    const result = checkNoPhantomFiles(manifest.artifacts, actualFiles);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-03');
  });

  it('FAIL with phantom file', () => {
    const manifest = makeSampleManifest();
    const actualFiles = [...manifest.artifacts.map((a) => a.path), 'phantom/unknown.txt'];

    const result = checkNoPhantomFiles(manifest.artifacts, actualFiles);
    expect(result.status).toBe('FAIL');
    expect(result.id).toBe('INV-RUN-03');
    expect(result.message).toContain('phantom/unknown.txt');
  });
});

describe('INV-RUN-04: checkArtifactHashed', () => {
  it('PASS all 64-char hashes', () => {
    const artifacts = [
      { stage: '00-intent', sha256: 'a'.repeat(64) },
      { stage: '10-genesis', sha256: 'b'.repeat(64) },
    ] as const;

    const result = checkArtifactHashed(artifacts);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-04');
  });

  it('FAIL short hash', () => {
    const artifacts = [
      { stage: '00-intent', sha256: 'a'.repeat(64) },
      { stage: '10-genesis', sha256: 'short' },
    ] as const;

    const result = checkArtifactHashed(artifacts);
    expect(result.status).toBe('FAIL');
    expect(result.id).toBe('INV-RUN-04');
  });
});

describe('INV-RUN-05: checkOrderIndependent', () => {
  it('uses buildMerkleTree with sorted leaves', () => {
    const leaves = [
      { hash: 'c'.repeat(64), label: 'c-file' },
      { hash: 'a'.repeat(64), label: 'a-file' },
      { hash: 'b'.repeat(64), label: 'b-file' },
    ];
    // buildMerkleTree sorts by label internally, so order should not matter
    const tree = buildMerkleTree(leaves);
    const reversedTree = buildMerkleTree([...leaves].reverse());

    expect(tree.root_hash).toBe(reversedTree.root_hash);

    const result = checkOrderIndependent(leaves, tree.root_hash);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-05');
  });
});

describe('INV-RUN-06: checkReportDerived', () => {
  it('PASS with valid report', () => {
    const manifest = makeSampleManifest();
    const reportJson = canonicalJSON({ verdict: 'PASS', run_id: manifest.run_id });

    const result = checkReportDerived(reportJson, manifest);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-06');
  });
});

describe('INV-RUN-07: checkStageComplete', () => {
  it('PASS all present', () => {
    const expected = ['00-intent', '10-genesis', '20-scribe'];
    const actual = ['00-intent', '10-genesis', '20-scribe', '30-style'];

    const result = checkStageComplete(expected, actual);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-07');
  });

  it('FAIL missing stage', () => {
    const expected = ['00-intent', '10-genesis', '20-scribe'];
    const actual = ['00-intent', '10-genesis'];

    const result = checkStageComplete(expected, actual);
    expect(result.status).toBe('FAIL');
    expect(result.id).toBe('INV-RUN-07');
    expect(result.message).toContain('20-scribe');
  });
});

describe('INV-RUN-08: checkSeedDefault', () => {
  it('PASS empty seed normalizes', () => {
    const result = checkSeedDefault(undefined, '');
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-08');
  });

  it('PASS with explicit seed', () => {
    const result = checkSeedDefault('my-seed', 'my-seed');
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-08');
  });
});

describe('INV-RUN-09: checkCrlfImmune', () => {
  it('PASS LF vs CRLF produce same hash', () => {
    const contentLF = '{"key":"value"}\n{"second":"line"}\n';
    const contentCRLF = '{"key":"value"}\r\n{"second":"line"}\r\n';

    const result = checkCrlfImmune(contentLF, contentCRLF);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-09');
  });
});

describe('INV-RUN-10: checkNoUndeclaredDeps', () => {
  it('always PASS (static check)', () => {
    const result = checkNoUndeclaredDeps();
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-10');
    expect(result.evidence).toBe('static');
  });
});

describe('INV-RUN-11: checkMerkleValid', () => {
  it('PASS correct root', () => {
    const leaves = [
      { hash: 'a'.repeat(64), label: 'file-a' },
      { hash: 'b'.repeat(64), label: 'file-b' },
    ];
    const tree = buildMerkleTree(leaves);

    const result = checkMerkleValid(leaves, tree.root_hash);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-11');
  });

  it('FAIL tampered root', () => {
    const leaves = [
      { hash: 'a'.repeat(64), label: 'file-a' },
      { hash: 'b'.repeat(64), label: 'file-b' },
    ];

    const result = checkMerkleValid(leaves, 'tampered'.padEnd(64, '0'));
    expect(result.status).toBe('FAIL');
    expect(result.id).toBe('INV-RUN-11');
  });
});

describe('INV-RUN-12: checkVerifyIdempotent', () => {
  it('PASS with matching results', () => {
    const verifyResult = {
      run_id: 'test-run-id-0001',
      valid: true,
      checks: [
        { artifact: 'manifest.json', expected_hash: 'a'.repeat(64), actual_hash: 'a'.repeat(64), valid: true },
      ],
      manifest_hash: 'a'.repeat(64),
    };

    const result = checkVerifyIdempotent(verifyResult, verifyResult);
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-RUN-12');
  });
});

describe('Edge: invariant id prefixes', () => {
  it('all invariants return correct id prefix INV-RUN-', () => {
    const manifest = makeSampleManifest();
    const correctHash = hashString(canonicalJSON(manifest));
    const leaves = manifest.artifacts.map((a) => ({ hash: a.sha256, label: a.path }));
    const tree = buildMerkleTree(leaves);

    const results = [
      checkManifestHash(manifest, correctHash),
      checkNoPhantomFiles(manifest.artifacts, manifest.artifacts.map((a) => a.path)),
      checkArtifactHashed(manifest.artifacts),
      checkOrderIndependent(leaves, tree.root_hash),
      checkReportDerived(canonicalJSON({ verdict: 'PASS' }), manifest),
      checkStageComplete(['00-intent'], ['00-intent']),
      checkSeedDefault('', ''),
      checkCrlfImmune('test\n', 'test\r\n'),
      checkNoUndeclaredDeps(),
      checkMerkleValid(leaves, tree.root_hash),
    ];

    for (const r of results) {
      expect(r.id).toMatch(/^INV-RUN-\d{2}$/);
    }
  });
});
