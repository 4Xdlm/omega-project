/**
 * OMEGA Orchestrator Policy Loader Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G4 policy loading
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  loadPolicy,
  loadPolicyUnsafe,
  loadPolicyFile,
  loadLockFile,
  parsePolicy,
  verifyPolicyHash,
  computePolicyHash,
  getExpectedPolicyHash,
  POLICIES_PATH,
  POLICIES_LOCK_PATH,
  type PolicyConfig,
  type LoadedPolicy,
} from '../../src/orchestrator/policy-loader';
import { isSha256, isPolicyId } from '../../src/orchestrator/types';
import { createHash } from 'crypto';

const TEST_DIR = join(process.cwd(), '.test_policy_loader');

describe('Policy Loader — Phase G', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
    await mkdir(join(TEST_DIR, 'config/policies'), { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  const validPolicy = {
    version: '1.0.0',
    policyId: 'POL-v1-abcd1234',
    rules: {
      allowedGoals: ['DRAFT', 'REWRITE'],
      allowedTones: ['NEUTRAL', 'NARRATIVE'],
      maxRequestsPerActor: 100,
    },
    forbidden: {
      patterns: [
        { id: 'PAT-test', regex: 'test', description: 'Test pattern' },
      ],
      vocabularies: [
        { id: 'VOC-test', words: ['bad'], description: 'Test vocabulary' },
      ],
      structures: [
        { id: 'STR-test', pattern: 'test', description: 'Test structure' },
      ],
    },
    limits: {
      maxLength: 50000,
      minLength: 1,
      maxPayloadSize: 102400,
    },
  };

  async function setupTestPolicy(policy: unknown, hash?: string) {
    const content = JSON.stringify(policy, null, 2);
    await writeFile(join(TEST_DIR, POLICIES_PATH), content);

    const computedHash = hash ?? createHash('sha256').update(content).digest('hex');
    await writeFile(join(TEST_DIR, POLICIES_LOCK_PATH), computedHash);
  }

  describe('POLICIES_PATH constant', () => {
    it('is a fixed path (G-INV-13)', () => {
      expect(POLICIES_PATH).toBe('config/policies/policies.v1.json');
    });

    it('does not use environment variables', () => {
      expect(POLICIES_PATH.includes('$')).toBe(false);
      expect(POLICIES_PATH.includes('process.env')).toBe(false);
    });
  });

  describe('loadPolicyFile', () => {
    it('loads policy from fixed path', async () => {
      await setupTestPolicy(validPolicy);

      const content = loadPolicyFile(TEST_DIR);
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('1.0.0');
    });

    it('throws for missing file', () => {
      expect(() => loadPolicyFile(TEST_DIR)).toThrow();
    });
  });

  describe('loadLockFile', () => {
    it('loads valid lock hash', async () => {
      await setupTestPolicy(validPolicy);

      const hash = loadLockFile(TEST_DIR);
      expect(isSha256(hash)).toBe(true);
    });

    it('throws for invalid lock file', async () => {
      await writeFile(join(TEST_DIR, POLICIES_LOCK_PATH), 'not-a-hash');

      expect(() => loadLockFile(TEST_DIR)).toThrow('Invalid lock file');
    });
  });

  describe('parsePolicy', () => {
    it('parses valid policy', () => {
      const content = JSON.stringify(validPolicy);
      const config = parsePolicy(content);

      expect(config.version).toBe('1.0.0');
      expect(isPolicyId(config.policyId)).toBe(true);
      expect(config.rules.allowedGoals).toContain('DRAFT');
    });

    it('freezes parsed config', () => {
      const content = JSON.stringify(validPolicy);
      const config = parsePolicy(content);

      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.rules)).toBe(true);
      expect(Object.isFrozen(config.forbidden)).toBe(true);
    });

    it('throws for missing version', () => {
      const invalid = { ...validPolicy, version: undefined };
      expect(() => parsePolicy(JSON.stringify(invalid))).toThrow('version');
    });

    it('throws for invalid policyId', () => {
      const invalid = { ...validPolicy, policyId: 'invalid' };
      expect(() => parsePolicy(JSON.stringify(invalid))).toThrow('policyId');
    });
  });

  describe('verifyPolicyHash', () => {
    it('returns true for matching hashes', () => {
      const hash = 'a'.repeat(64);
      expect(verifyPolicyHash(hash as any, hash as any)).toBe(true);
    });

    it('returns false for mismatched hashes', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);
      expect(verifyPolicyHash(hash1 as any, hash2 as any)).toBe(false);
    });
  });

  describe('loadPolicy (G-INV-08)', () => {
    it('loads and verifies valid policy', async () => {
      await setupTestPolicy(validPolicy);

      const loaded = loadPolicy(TEST_DIR);

      expect(loaded.verified).toBe(true);
      expect(loaded.config.version).toBe('1.0.0');
      expect(isSha256(loaded.hash)).toBe(true);
    });

    it('throws for hash mismatch (G-INV-08)', async () => {
      // Use a valid SHA256 format that doesn't match the actual hash
      await setupTestPolicy(validPolicy, 'b'.repeat(64));

      expect(() => loadPolicy(TEST_DIR)).toThrow('G-INV-08 VIOLATION');
    });

    it('throws for tampered policy', async () => {
      // Setup with valid hash
      await setupTestPolicy(validPolicy);

      // Tamper with policy file
      const tampered = { ...validPolicy, version: '9.9.9' };
      await writeFile(
        join(TEST_DIR, POLICIES_PATH),
        JSON.stringify(tampered)
      );

      expect(() => loadPolicy(TEST_DIR)).toThrow('mismatch');
    });

    it('returns frozen result', async () => {
      await setupTestPolicy(validPolicy);

      const loaded = loadPolicy(TEST_DIR);

      expect(Object.isFrozen(loaded)).toBe(true);
    });
  });

  describe('loadPolicyUnsafe', () => {
    it('loads policy without throwing on mismatch', async () => {
      // Use a valid SHA256 format that doesn't match the actual hash
      await setupTestPolicy(validPolicy, 'c'.repeat(64));

      const loaded = loadPolicyUnsafe(TEST_DIR);

      expect(loaded.verified).toBe(false);
      expect(loaded.config.version).toBe('1.0.0');
    });

    it('uses policy hash as lock if lock file missing', async () => {
      await writeFile(
        join(TEST_DIR, POLICIES_PATH),
        JSON.stringify(validPolicy)
      );
      // Don't create lock file

      const loaded = loadPolicyUnsafe(TEST_DIR);

      expect(loaded.verified).toBe(true); // Hash matches itself
    });
  });

  describe('computePolicyHash', () => {
    it('computes SHA256 of policy file', async () => {
      await setupTestPolicy(validPolicy);

      const hash = computePolicyHash(TEST_DIR);

      expect(isSha256(hash)).toBe(true);
    });

    it('is deterministic', async () => {
      await setupTestPolicy(validPolicy);

      const hash1 = computePolicyHash(TEST_DIR);
      const hash2 = computePolicyHash(TEST_DIR);

      expect(hash1).toBe(hash2);
    });
  });

  describe('getExpectedPolicyHash', () => {
    it('returns hash from lock file', async () => {
      const expectedHash = 'a'.repeat(64);
      await writeFile(join(TEST_DIR, POLICIES_PATH), '{}');
      await writeFile(join(TEST_DIR, POLICIES_LOCK_PATH), expectedHash);

      const hash = getExpectedPolicyHash(TEST_DIR);

      expect(hash).toBe(expectedHash);
    });
  });

  describe('Integration with actual policy file', () => {
    it('loads actual policy file from repo', () => {
      // This test uses the actual policy files in the repo
      const loaded = loadPolicy();

      expect(loaded.verified).toBe(true);
      expect(loaded.config.version).toBe('1.0.0');
      expect(loaded.config.policyId).toMatch(/^POL-v\d+-[a-f0-9]{8}$/);
    });
  });

  describe('G-INV-13: No ENV var for policy path', () => {
    it('POLICIES_PATH is constant, not from env', () => {
      // Set env var that would be used if code was vulnerable
      process.env.OMEGA_POLICY_PATH = '/malicious/path';

      // Path should still be the fixed value
      expect(POLICIES_PATH).toBe('config/policies/policies.v1.json');

      delete process.env.OMEGA_POLICY_PATH;
    });
  });
});
