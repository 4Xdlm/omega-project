/**
 * OMEGA Canon Segment Writer Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-01, INV-E-SEG-01 to INV-E-SEG-04
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  FileSegmentWriter,
  InMemorySegmentWriter,
  createSegmentWriter,
  computeSegmentHash,
  readSegmentClaims,
} from '../../src/canon/segment-writer';
import { createTestClock } from '../../src/shared/clock';
import { createTestConfigResolver } from '../../src/canon/config-symbol';
import type { CanonClaim, ClaimId, EntityId, PredicateType, MonoNs, CanonVersion, ChainHash } from '../../src/canon/types';
import { ClaimStatus, LineageSource } from '../../src/canon/types';
import { GENESIS_HASH } from '../../src/canon/lineage';
import { hashCanonical } from '../../src/shared/canonical';

const TEST_DIR = join(process.cwd(), '.test_segment_writer');

// Test config with small segment size for easy rotation testing
const TEST_CONFIG = {
  SEGMENT_MAX_BYTES: 500, // Small for testing
  SEGMENT_TARGET_BYTES: 400,
  SEGMENT_ROTATE_STRATEGY: 'AT_MAX',
  SEGMENT_PREFIX: 'seg-',
  SEGMENT_EXTENSION: '.ndjson',
};

// Test config with large segment size for tests that don't test rotation
const TEST_CONFIG_LARGE = {
  SEGMENT_MAX_BYTES: 100000, // Large - no rotation
  SEGMENT_TARGET_BYTES: 80000,
  SEGMENT_ROTATE_STRATEGY: 'AT_MAX',
  SEGMENT_PREFIX: 'seg-',
  SEGMENT_EXTENSION: '.ndjson',
};

function createTestClaim(id: string, value: string): CanonClaim {
  const baseClaim = {
    id: `CLM-${id}-12345678` as ClaimId,
    subject: 'ENT-subject-87654321' as EntityId,
    predicate: 'HAS_NAME' as PredicateType,
    value,
    mono_ns: 1000000000000000000n as MonoNs,
    version: 1 as CanonVersion,
    lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
    evidence: [],
    status: ClaimStatus.ACTIVE,
    prevHash: GENESIS_HASH,
    hash: '' as ChainHash,
  };
  const { hash, ...claimWithoutHash } = baseClaim;
  const computedHash = hashCanonical(claimWithoutHash) as ChainHash;
  return { ...baseClaim, hash: computedHash };
}

describe('CANON Segment Writer — Phase E', () => {
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

  describe('InMemorySegmentWriter', () => {
    it('E3-APPEND-01: append adds claim to segment', async () => {
      const writer = new InMemorySegmentWriter(10);
      const claim = createTestClaim('001', 'Test Value');

      await writer.append(claim);

      const claims = writer.getAllClaims();
      expect(claims).toHaveLength(1);
      expect(claims[0].id).toBe(claim.id);
    });

    it('E3-APPEND-02: append preserves order', async () => {
      const writer = new InMemorySegmentWriter(10);

      await writer.append(createTestClaim('001', 'First'));
      await writer.append(createTestClaim('002', 'Second'));
      await writer.append(createTestClaim('003', 'Third'));

      const claims = writer.getAllClaims();
      expect(claims).toHaveLength(3);
      expect(claims[0].value).toBe('First');
      expect(claims[1].value).toBe('Second');
      expect(claims[2].value).toBe('Third');
    });

    it('E3-ROTATE-01: rotates when size limit reached', async () => {
      const writer = new InMemorySegmentWriter(2); // 2 claims per segment

      const initialSegmentId = writer.getCurrentSegmentId();

      await writer.append(createTestClaim('001', 'First'));
      await writer.append(createTestClaim('002', 'Second'));

      // This should trigger rotation
      await writer.append(createTestClaim('003', 'Third'));

      const newSegmentId = writer.getCurrentSegmentId();
      expect(newSegmentId).not.toBe(initialSegmentId);
    });

    it('E3-ROTATE-02: rotation creates new segment', async () => {
      const writer = new InMemorySegmentWriter(2);

      await writer.append(createTestClaim('001', 'First'));
      await writer.append(createTestClaim('002', 'Second'));
      await writer.append(createTestClaim('003', 'Third'));

      const segments = writer.getAllSegments();
      expect(segments.size).toBe(2);
    });

    it('getSegmentInfo returns correct info', async () => {
      const writer = new InMemorySegmentWriter(10);

      await writer.append(createTestClaim('001', 'First'));
      await writer.append(createTestClaim('002', 'Second'));

      const info = writer.getSegmentInfo();
      expect(info.claimCount).toBe(2);
      expect(info.firstClaimId).toBe('CLM-001-12345678');
      expect(info.lastClaimId).toBe('CLM-002-12345678');
    });
  });

  describe('FileSegmentWriter', () => {
    it('E3-APPEND-01: append writes claim to file', async () => {
      const clock = createTestClock();
      const config = createTestConfigResolver(TEST_CONFIG);
      const writer = await createSegmentWriter({
        storageDir: TEST_DIR,
        clock,
        config,
      });

      const claim = createTestClaim('001', 'Test Value');
      await writer.append(claim);
      await writer.flush();

      const segmentPath = join(TEST_DIR, `${writer.getCurrentSegmentId()}.ndjson`);
      expect(existsSync(segmentPath)).toBe(true);

      const claims = await readSegmentClaims(segmentPath);
      expect(claims).toHaveLength(1);

      await writer.close();
    });

    it('E3-FLUSH-01: flush writes buffer to disk', async () => {
      const clock = createTestClock();
      const config = createTestConfigResolver(TEST_CONFIG_LARGE);
      const writer = await createSegmentWriter({
        storageDir: TEST_DIR,
        clock,
        config,
      });

      await writer.append(createTestClaim('001', 'First'));
      await writer.append(createTestClaim('002', 'Second'));

      // Before flush, file might be empty or partial
      await writer.flush();

      const segmentPath = join(TEST_DIR, `${writer.getCurrentSegmentId()}.ndjson`);
      const claims = await readSegmentClaims(segmentPath);
      expect(claims).toHaveLength(2);

      await writer.close();
    });

    it('E3-CLOSE-01: close flushes and releases resources', async () => {
      const clock = createTestClock();
      const config = createTestConfigResolver(TEST_CONFIG);
      const writer = await createSegmentWriter({
        storageDir: TEST_DIR,
        clock,
        config,
      });

      await writer.append(createTestClaim('001', 'Test'));
      await writer.close();

      const segmentPath = join(TEST_DIR, `${writer.getCurrentSegmentId()}.ndjson`);
      const claims = await readSegmentClaims(segmentPath);
      expect(claims).toHaveLength(1);
    });

    it('E3-DET-01: same claims produce same segment hash', async () => {
      // First run
      const clock1 = createTestClock();
      const config1 = createTestConfigResolver(TEST_CONFIG);
      const dir1 = join(TEST_DIR, 'run1');
      await mkdir(dir1);
      const writer1 = await createSegmentWriter({
        storageDir: dir1,
        clock: clock1,
        config: config1,
        segmentId: 'seg-fixed',
      });
      await writer1.append(createTestClaim('001', 'Same Value'));
      await writer1.close();
      const hash1 = await computeSegmentHash(join(dir1, 'seg-fixed.ndjson'));

      // Second run with same inputs
      const clock2 = createTestClock();
      const config2 = createTestConfigResolver(TEST_CONFIG);
      const dir2 = join(TEST_DIR, 'run2');
      await mkdir(dir2);
      const writer2 = await createSegmentWriter({
        storageDir: dir2,
        clock: clock2,
        config: config2,
        segmentId: 'seg-fixed',
      });
      await writer2.append(createTestClaim('001', 'Same Value'));
      await writer2.close();
      const hash2 = await computeSegmentHash(join(dir2, 'seg-fixed.ndjson'));

      expect(hash1).toBe(hash2);
    });
  });

  describe('readSegmentClaims', () => {
    it('reads claims from segment file', async () => {
      const clock = createTestClock();
      const config = createTestConfigResolver(TEST_CONFIG_LARGE);
      const writer = await createSegmentWriter({
        storageDir: TEST_DIR,
        clock,
        config,
      });

      await writer.append(createTestClaim('001', 'First'));
      await writer.append(createTestClaim('002', 'Second'));
      await writer.close();

      const segmentPath = join(TEST_DIR, `${writer.getCurrentSegmentId()}.ndjson`);
      const claims = await readSegmentClaims(segmentPath);

      expect(claims).toHaveLength(2);
      expect(claims[0].value).toBe('First');
      expect(claims[1].value).toBe('Second');
    });

    it('returns empty array for non-existent file', async () => {
      const claims = await readSegmentClaims(join(TEST_DIR, 'nonexistent.ndjson'));
      expect(claims).toHaveLength(0);
    });
  });
});
