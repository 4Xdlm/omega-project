/**
 * OMEGA Canon Segment Manifest Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-MANIFEST-01, INV-E-MANIFEST-02, INV-E-SEG-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  createEmptyManifest,
  computeManifestHash,
  verifyManifest,
  addSegmentToManifest,
  sealSegment,
  getSegment,
  getCurrentSegment,
  getSealedSegments,
  loadManifest,
  saveManifest,
  loadOrCreateManifest,
  getManifestStats,
  SegmentEntry,
  SegmentManifest,
} from '../../src/canon/segment-manifest';
import type { ClaimId, ChainHash, MonoNs } from '../../src/canon/types';

const TEST_DIR = join(process.cwd(), '.test_segment_manifest');

function createTestSegmentEntry(id: string, sealed: boolean = false): SegmentEntry {
  return {
    id,
    path: `/test/${id}.ndjson`,
    firstClaimId: `CLM-first-${id}` as ClaimId,
    lastClaimId: `CLM-last-${id}` as ClaimId,
    claimCount: 10,
    byteSize: 1000,
    hash: `hash-${id}` as ChainHash,
    createdAt: 1000000000000000000n as MonoNs,
    sealed,
  };
}

describe('CANON Segment Manifest — Phase E', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  describe('createEmptyManifest', () => {
    it('creates manifest with correct structure', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = createEmptyManifest(timestamp);

      expect(manifest.version).toBe(1);
      expect(manifest.segments).toHaveLength(0);
      expect(manifest.lastModified).toBe(timestamp);
      expect(manifest.totalClaims).toBe(0);
      expect(manifest.totalBytes).toBe(0);
      expect(manifest.manifestHash).toBeDefined();
    });
  });

  describe('computeManifestHash (INV-E-MANIFEST-01)', () => {
    it('produces deterministic hash', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest1 = createEmptyManifest(timestamp);
      const manifest2 = createEmptyManifest(timestamp);

      expect(manifest1.manifestHash).toBe(manifest2.manifestHash);
    });

    it('different segments produce different hash', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest1 = createEmptyManifest(timestamp);
      const manifest2 = addSegmentToManifest(manifest1, createTestSegmentEntry('seg-1'), timestamp);

      expect(manifest1.manifestHash).not.toBe(manifest2.manifestHash);
    });
  });

  describe('verifyManifest', () => {
    it('E3-MANIFEST-03: returns true for valid manifest', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = createEmptyManifest(timestamp);

      expect(verifyManifest(manifest)).toBe(true);
    });

    it('E3-MANIFEST-03: returns false for corrupted manifest', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = createEmptyManifest(timestamp);

      // Corrupt the hash
      const corrupted = { ...manifest, manifestHash: 'corrupted' as ChainHash };

      expect(verifyManifest(corrupted)).toBe(false);
    });
  });

  describe('addSegmentToManifest (INV-E-MANIFEST-02)', () => {
    it('E3-MANIFEST-04: adds segment and updates hash', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = createEmptyManifest(timestamp);
      const entry = createTestSegmentEntry('seg-1');

      const updated = addSegmentToManifest(manifest, entry, timestamp);

      expect(updated.segments).toHaveLength(1);
      expect(updated.segments[0].id).toBe('seg-1');
      expect(updated.totalClaims).toBe(10);
      expect(updated.totalBytes).toBe(1000);
      expect(updated.manifestHash).not.toBe(manifest.manifestHash);
    });

    it('preserves segment order', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);

      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1'), timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-2'), timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-3'), timestamp);

      expect(manifest.segments[0].id).toBe('seg-1');
      expect(manifest.segments[1].id).toBe('seg-2');
      expect(manifest.segments[2].id).toBe('seg-3');
    });
  });

  describe('sealSegment (INV-E-SEG-03)', () => {
    it('seals segment and updates hash', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1', false), timestamp);

      const sealed = sealSegment(
        manifest,
        'seg-1',
        'final-hash' as ChainHash,
        2000,
        20,
        timestamp
      );

      expect(sealed.segments[0].sealed).toBe(true);
      expect(sealed.segments[0].hash).toBe('final-hash');
      expect(sealed.segments[0].byteSize).toBe(2000);
      expect(sealed.segments[0].claimCount).toBe(20);
    });

    it('throws if segment not found', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = createEmptyManifest(timestamp);

      expect(() =>
        sealSegment(manifest, 'nonexistent', 'hash' as ChainHash, 0, 0, timestamp)
      ).toThrow('Segment not found');
    });

    it('throws if segment already sealed', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1', true), timestamp);

      expect(() =>
        sealSegment(manifest, 'seg-1', 'hash' as ChainHash, 0, 0, timestamp)
      ).toThrow('already sealed');
    });
  });

  describe('getSegment', () => {
    it('returns segment by ID', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1'), timestamp);

      const segment = getSegment(manifest, 'seg-1');
      expect(segment?.id).toBe('seg-1');
    });

    it('returns undefined for unknown ID', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = createEmptyManifest(timestamp);

      expect(getSegment(manifest, 'unknown')).toBeUndefined();
    });
  });

  describe('getCurrentSegment', () => {
    it('returns unsealed segment', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1', true), timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-2', false), timestamp);

      const current = getCurrentSegment(manifest);
      expect(current?.id).toBe('seg-2');
    });
  });

  describe('getSealedSegments', () => {
    it('returns only sealed segments', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1', true), timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-2', false), timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-3', true), timestamp);

      const sealed = getSealedSegments(manifest);
      expect(sealed).toHaveLength(2);
      expect(sealed.map((s) => s.id)).toEqual(['seg-1', 'seg-3']);
    });
  });

  describe('File Operations', () => {
    it('E3-MANIFEST-01: loadManifest reads manifest file', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1'), timestamp);

      await saveManifest(TEST_DIR, manifest);

      const loaded = await loadManifest(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded!.segments).toHaveLength(1);
      expect(loaded!.segments[0].id).toBe('seg-1');
    });

    it('E3-MANIFEST-02: saveManifest writes manifest file', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = createEmptyManifest(timestamp);

      await saveManifest(TEST_DIR, manifest);

      expect(existsSync(join(TEST_DIR, 'manifest.json'))).toBe(true);
    });

    it('loadManifest returns null for missing file', async () => {
      const loaded = await loadManifest(TEST_DIR);
      expect(loaded).toBeNull();
    });

    it('loadOrCreateManifest creates if missing', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const manifest = await loadOrCreateManifest(TEST_DIR, timestamp);

      expect(manifest).not.toBeNull();
      expect(manifest.segments).toHaveLength(0);
    });
  });

  describe('getManifestStats', () => {
    it('computes correct stats', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      let manifest = createEmptyManifest(timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-1', true), timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-2', true), timestamp);
      manifest = addSegmentToManifest(manifest, createTestSegmentEntry('seg-3', false), timestamp);

      const stats = getManifestStats(manifest);

      expect(stats.segmentCount).toBe(3);
      expect(stats.sealedSegmentCount).toBe(2);
      expect(stats.totalClaims).toBe(30);
      expect(stats.totalBytes).toBe(3000);
      expect(stats.averageClaimsPerSegment).toBe(10);
    });
  });
});
