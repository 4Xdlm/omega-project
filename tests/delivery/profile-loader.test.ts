/**
 * OMEGA Delivery Profile Loader Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H2 profile loading
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import {
  loadProfiles,
  loadProfilesUnsafe,
  loadProfilesFile,
  loadLockFile,
  parseProfilesConfig,
  verifyProfilesHash,
  getProfile,
  getDefaultProfile,
  getProfilesByFormat,
  computeProfilesHash,
  PROFILES_PATH,
  PROFILES_LOCK_PATH,
} from '../../src/delivery/profile-loader';
import { isSha256, isProfileId } from '../../src/delivery/types';
import type { ProfileId, Sha256 } from '../../src/delivery/types';

const TEST_DIR = join(process.cwd(), '.test_profile_loader');

describe('Profile Loader — Phase H', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
    await mkdir(join(TEST_DIR, 'config/delivery'), { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  const validConfig = {
    version: '1.0.0',
    profiles: [
      {
        profileId: 'OMEGA_STD',
        format: 'TEXT',
        extension: '.txt',
        encoding: 'UTF-8',
        lineEnding: 'LF',
      },
      {
        profileId: 'PROF-markdown',
        format: 'MARKDOWN',
        extension: '.md',
        encoding: 'UTF-8',
        lineEnding: 'LF',
        headers: ['# Header'],
        footers: ['---'],
      },
    ],
  };

  async function setupTestProfiles(config: unknown, hash?: string) {
    const content = JSON.stringify(config, null, 2);
    await writeFile(join(TEST_DIR, PROFILES_PATH), content);

    const computedHash = hash ?? createHash('sha256').update(content).digest('hex');
    await writeFile(join(TEST_DIR, PROFILES_LOCK_PATH), computedHash);
  }

  describe('PROFILES_PATH constant', () => {
    it('is a fixed path', () => {
      expect(PROFILES_PATH).toBe('config/delivery/profiles.v1.json');
    });

    it('does not use environment variables', () => {
      expect(PROFILES_PATH.includes('$')).toBe(false);
      expect(PROFILES_PATH.includes('process.env')).toBe(false);
    });
  });

  describe('loadProfilesFile', () => {
    it('loads profiles from fixed path', async () => {
      await setupTestProfiles(validConfig);

      const content = loadProfilesFile(TEST_DIR);
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('1.0.0');
    });

    it('throws for missing file', () => {
      expect(() => loadProfilesFile(TEST_DIR)).toThrow();
    });
  });

  describe('loadLockFile', () => {
    it('loads valid lock hash', async () => {
      await setupTestProfiles(validConfig);

      const hash = loadLockFile(TEST_DIR);
      expect(isSha256(hash)).toBe(true);
    });

    it('throws for invalid lock file', async () => {
      await writeFile(join(TEST_DIR, PROFILES_LOCK_PATH), 'not-a-hash');

      expect(() => loadLockFile(TEST_DIR)).toThrow('Invalid lock file');
    });
  });

  describe('parseProfilesConfig', () => {
    it('parses valid config', () => {
      const content = JSON.stringify(validConfig);
      const config = parseProfilesConfig(content);

      expect(config.version).toBe('1.0.0');
      expect(config.profiles).toHaveLength(2);
    });

    it('freezes parsed config', () => {
      const content = JSON.stringify(validConfig);
      const config = parseProfilesConfig(content);

      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.profiles)).toBe(true);
    });

    it('throws for missing version', () => {
      const invalid = { ...validConfig, version: undefined };
      expect(() => parseProfilesConfig(JSON.stringify(invalid))).toThrow('version');
    });

    it('throws for empty profiles', () => {
      const invalid = { ...validConfig, profiles: [] };
      expect(() => parseProfilesConfig(JSON.stringify(invalid))).toThrow('profiles');
    });

    it('throws for invalid profileId', () => {
      const invalid = {
        ...validConfig,
        profiles: [{ ...validConfig.profiles[0], profileId: 'invalid' }],
      };
      expect(() => parseProfilesConfig(JSON.stringify(invalid))).toThrow('profileId');
    });

    it('throws for invalid format', () => {
      const invalid = {
        ...validConfig,
        profiles: [{ ...validConfig.profiles[0], format: 'HTML' }],
      };
      expect(() => parseProfilesConfig(JSON.stringify(invalid))).toThrow('format');
    });

    it('throws for non-UTF-8 encoding', () => {
      const invalid = {
        ...validConfig,
        profiles: [{ ...validConfig.profiles[0], encoding: 'UTF-16' }],
      };
      expect(() => parseProfilesConfig(JSON.stringify(invalid))).toThrow('UTF-8');
    });

    it('throws for non-LF lineEnding', () => {
      const invalid = {
        ...validConfig,
        profiles: [{ ...validConfig.profiles[0], lineEnding: 'CRLF' }],
      };
      expect(() => parseProfilesConfig(JSON.stringify(invalid))).toThrow('LF');
    });

    it('throws for duplicate profile IDs', () => {
      const invalid = {
        ...validConfig,
        profiles: [validConfig.profiles[0], validConfig.profiles[0]],
      };
      expect(() => parseProfilesConfig(JSON.stringify(invalid))).toThrow('Duplicate');
    });
  });

  describe('verifyProfilesHash', () => {
    it('returns true for matching hashes', () => {
      const hash = 'a'.repeat(64);
      expect(verifyProfilesHash(hash as Sha256, hash as Sha256)).toBe(true);
    });

    it('returns false for mismatched hashes', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);
      expect(verifyProfilesHash(hash1 as Sha256, hash2 as Sha256)).toBe(false);
    });
  });

  describe('loadProfiles (H-INV-04)', () => {
    it('loads and verifies valid profiles', async () => {
      await setupTestProfiles(validConfig);

      const loaded = loadProfiles(TEST_DIR);

      expect(loaded.verified).toBe(true);
      expect(loaded.config.version).toBe('1.0.0');
      expect(isSha256(loaded.hash)).toBe(true);
    });

    it('throws for hash mismatch (H-INV-04)', async () => {
      await setupTestProfiles(validConfig, 'b'.repeat(64));

      expect(() => loadProfiles(TEST_DIR)).toThrow('H-INV-04 VIOLATION');
    });

    it('throws for tampered profiles', async () => {
      // Setup with valid hash
      await setupTestProfiles(validConfig);

      // Tamper with profiles file
      const tampered = { ...validConfig, version: '9.9.9' };
      await writeFile(
        join(TEST_DIR, PROFILES_PATH),
        JSON.stringify(tampered)
      );

      expect(() => loadProfiles(TEST_DIR)).toThrow('mismatch');
    });

    it('returns frozen result', async () => {
      await setupTestProfiles(validConfig);

      const loaded = loadProfiles(TEST_DIR);

      expect(Object.isFrozen(loaded)).toBe(true);
    });
  });

  describe('loadProfilesUnsafe', () => {
    it('loads profiles without throwing on mismatch', async () => {
      await setupTestProfiles(validConfig, 'c'.repeat(64));

      const loaded = loadProfilesUnsafe(TEST_DIR);

      expect(loaded.verified).toBe(false);
      expect(loaded.config.version).toBe('1.0.0');
    });

    it('uses profiles hash as lock if lock file missing', async () => {
      await writeFile(
        join(TEST_DIR, PROFILES_PATH),
        JSON.stringify(validConfig)
      );

      const loaded = loadProfilesUnsafe(TEST_DIR);

      expect(loaded.verified).toBe(true);
    });
  });

  describe('getProfile', () => {
    it('finds profile by ID', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const profile = getProfile(loaded, 'OMEGA_STD' as ProfileId);

      expect(profile).toBeDefined();
      expect(profile!.format).toBe('TEXT');
    });

    it('returns undefined for unknown ID', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const profile = getProfile(loaded, 'PROF-unknown' as ProfileId);

      expect(profile).toBeUndefined();
    });
  });

  describe('getDefaultProfile', () => {
    it('returns OMEGA_STD profile', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const profile = getDefaultProfile(loaded);

      expect(profile.profileId).toBe('OMEGA_STD');
    });

    it('throws if OMEGA_STD missing', async () => {
      const configWithoutDefault = {
        version: '1.0.0',
        profiles: [validConfig.profiles[1]],
      };
      await setupTestProfiles(configWithoutDefault);
      const loaded = loadProfiles(TEST_DIR);

      expect(() => getDefaultProfile(loaded)).toThrow('OMEGA_STD not found');
    });
  });

  describe('getProfilesByFormat', () => {
    it('filters profiles by format', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const textProfiles = getProfilesByFormat(loaded, 'TEXT');
      const mdProfiles = getProfilesByFormat(loaded, 'MARKDOWN');

      expect(textProfiles).toHaveLength(1);
      expect(mdProfiles).toHaveLength(1);
    });

    it('returns empty array for no matches', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const jsonProfiles = getProfilesByFormat(loaded, 'JSON_PACK');

      expect(jsonProfiles).toHaveLength(0);
    });

    it('returns frozen array', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const profiles = getProfilesByFormat(loaded, 'TEXT');

      expect(Object.isFrozen(profiles)).toBe(true);
    });
  });

  describe('computeProfilesHash', () => {
    it('returns hash from loaded profiles', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const hash = computeProfilesHash(loaded);

      expect(isSha256(hash)).toBe(true);
      expect(hash).toBe(loaded.hash);
    });
  });

  describe('Integration with actual profiles file', () => {
    it('loads actual profiles from repo', () => {
      const loaded = loadProfiles();

      expect(loaded.verified).toBe(true);
      expect(loaded.config.version).toBe('1.0.0');
      expect(loaded.config.profiles.length).toBeGreaterThan(0);
    });

    it('includes OMEGA_STD profile', () => {
      const loaded = loadProfiles();
      const profile = getDefaultProfile(loaded);

      expect(profile.profileId).toBe('OMEGA_STD');
      expect(profile.encoding).toBe('UTF-8');
      expect(profile.lineEnding).toBe('LF');
    });
  });

  describe('Profile with envelope', () => {
    it('parses headers and footers', async () => {
      await setupTestProfiles(validConfig);
      const loaded = loadProfiles(TEST_DIR);

      const mdProfile = getProfile(loaded, 'PROF-markdown' as ProfileId);

      expect(mdProfile?.headers).toBeDefined();
      expect(mdProfile?.footers).toBeDefined();
      expect(mdProfile?.headers).toContain('# Header');
    });
  });
});
