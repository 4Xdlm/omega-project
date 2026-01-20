/**
 * API Surface Snapshot Tests
 * Standard: NASA-Grade L4
 *
 * These tests ensure public API surface remains stable.
 * Any change to exports will cause snapshot failure, requiring explicit approval.
 *
 * @see docs/API_STABILITY_POLICY.md
 */

import { describe, test, expect } from 'vitest';

describe('API Surface — Snapshot', () => {
  describe('nexus/atlas', () => {
    test('public exports snapshot', async () => {
      const atlasModule = await import('../nexus/atlas/src/index.js');
      const exports = Object.keys(atlasModule).sort();

      expect(exports).toMatchSnapshot('atlas-public-exports');
    });

    test('ATLAS_VERSION is defined', async () => {
      const { ATLAS_VERSION } = await import('../nexus/atlas/src/index.js');
      expect(ATLAS_VERSION).toBeDefined();
      expect(typeof ATLAS_VERSION).toBe('string');
    });

    test('AtlasStore is exported', async () => {
      const { AtlasStore } = await import('../nexus/atlas/src/index.js');
      expect(AtlasStore).toBeDefined();
      expect(typeof AtlasStore).toBe('function');
    });

    test('executeQuery is exported', async () => {
      const { executeQuery } = await import('../nexus/atlas/src/index.js');
      expect(executeQuery).toBeDefined();
      expect(typeof executeQuery).toBe('function');
    });

    test('IndexManager is exported', async () => {
      const { IndexManager } = await import('../nexus/atlas/src/index.js');
      expect(IndexManager).toBeDefined();
      expect(typeof IndexManager).toBe('function');
    });

    test('SubscriptionManager is exported', async () => {
      const { SubscriptionManager } = await import('../nexus/atlas/src/index.js');
      expect(SubscriptionManager).toBeDefined();
      expect(typeof SubscriptionManager).toBe('function');
    });
  });

  describe('nexus/raw', () => {
    test('public exports snapshot', async () => {
      const rawModule = await import('../nexus/raw/src/index.js');
      const exports = Object.keys(rawModule).sort();

      expect(exports).toMatchSnapshot('raw-public-exports');
    });

    test('RAW_VERSION is defined', async () => {
      const { RAW_VERSION } = await import('../nexus/raw/src/index.js');
      expect(RAW_VERSION).toBeDefined();
      expect(typeof RAW_VERSION).toBe('string');
    });

    test('RawStorage is exported', async () => {
      const { RawStorage } = await import('../nexus/raw/src/index.js');
      expect(RawStorage).toBeDefined();
      expect(typeof RawStorage).toBe('function');
    });

    test('FileBackend is exported', async () => {
      const { FileBackend } = await import('../nexus/raw/src/index.js');
      expect(FileBackend).toBeDefined();
      expect(typeof FileBackend).toBe('function');
    });

    test('MemoryBackend is exported', async () => {
      const { MemoryBackend } = await import('../nexus/raw/src/index.js');
      expect(MemoryBackend).toBeDefined();
      expect(typeof MemoryBackend).toBe('function');
    });
  });

  describe('nexus/proof-utils', () => {
    test('public exports snapshot', async () => {
      const proofModule = await import('../nexus/proof-utils/src/index.js');
      const exports = Object.keys(proofModule).sort();

      expect(exports).toMatchSnapshot('proof-utils-public-exports');
    });

    test('PROOF_UTILS_VERSION is defined', async () => {
      const { PROOF_UTILS_VERSION } = await import('../nexus/proof-utils/src/index.js');
      expect(PROOF_UTILS_VERSION).toBeDefined();
      expect(typeof PROOF_UTILS_VERSION).toBe('string');
    });

    test('buildManifest is exported', async () => {
      const { buildManifest } = await import('../nexus/proof-utils/src/index.js');
      expect(buildManifest).toBeDefined();
      expect(typeof buildManifest).toBe('function');
    });

    test('verifyManifest is exported', async () => {
      const { verifyManifest } = await import('../nexus/proof-utils/src/index.js');
      expect(verifyManifest).toBeDefined();
      expect(typeof verifyManifest).toBe('function');
    });
  });

  describe('nexus/ledger', () => {
    test('public exports snapshot', async () => {
      const ledgerModule = await import('../nexus/ledger/src/index.js');
      const exports = Object.keys(ledgerModule).sort();

      expect(exports).toMatchSnapshot('ledger-public-exports');
    });

    test('LEDGER_VERSION is defined', async () => {
      const { LEDGER_VERSION } = await import('../nexus/ledger/src/index.js');
      expect(LEDGER_VERSION).toBeDefined();
      expect(typeof LEDGER_VERSION).toBe('string');
    });
  });
});

describe('API Surface — Version Consistency', () => {
  test('all modules have version exports', async () => {
    const atlas = await import('../nexus/atlas/src/index.js');
    const raw = await import('../nexus/raw/src/index.js');
    const proof = await import('../nexus/proof-utils/src/index.js');
    const ledger = await import('../nexus/ledger/src/index.js');

    expect(atlas.ATLAS_VERSION).toBeDefined();
    expect(raw.RAW_VERSION).toBeDefined();
    expect(proof.PROOF_UTILS_VERSION).toBeDefined();
    expect(ledger.LEDGER_VERSION).toBeDefined();
  });

  test('all versions follow semver format', async () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;

    const atlas = await import('../nexus/atlas/src/index.js');
    const raw = await import('../nexus/raw/src/index.js');
    const proof = await import('../nexus/proof-utils/src/index.js');
    const ledger = await import('../nexus/ledger/src/index.js');

    expect(atlas.ATLAS_VERSION).toMatch(semverRegex);
    expect(raw.RAW_VERSION).toMatch(semverRegex);
    expect(proof.PROOF_UTILS_VERSION).toMatch(semverRegex);
    expect(ledger.LEDGER_VERSION).toMatch(semverRegex);
  });
});
