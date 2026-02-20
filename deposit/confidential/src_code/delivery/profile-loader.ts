/**
 * OMEGA Delivery Profile Loader v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Loads and validates delivery profiles from fixed path with lock verification.
 *
 * INVARIANTS:
 * - H-INV-04: Profiles locked by SHA256 (lock mismatch => FAIL)
 *
 * SPEC: DELIVERY_SPEC v1.0 §H2
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import type { ProfileId, Sha256, DeliveryProfile, DeliveryFormat } from './types';
import { isProfileId, isSha256, isDeliveryFormat } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED PATHS (NO ENV OVERRIDE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed profiles path - NEVER from environment variable.
 */
export const PROFILES_PATH = 'config/delivery/profiles.v1.json';

/**
 * Fixed lock file path
 */
export const PROFILES_LOCK_PATH = 'config/delivery/profiles.lock';

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE CONFIG TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Profiles configuration file structure
 */
export interface ProfilesConfig {
  readonly version: string;
  readonly profiles: readonly DeliveryProfile[];
}

/**
 * Loaded profiles with integrity info
 */
export interface LoadedProfiles {
  readonly config: ProfilesConfig;
  readonly hash: Sha256;
  readonly lockHash: Sha256;
  readonly verified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes SHA256 hash of content.
 */
function computeHash(content: string): Sha256 {
  return createHash('sha256').update(content).digest('hex') as Sha256;
}

/**
 * Loads raw profiles file from fixed path.
 *
 * @param basePath - Base directory for relative path resolution
 * @returns Raw profiles file content
 */
export function loadProfilesFile(basePath: string = process.cwd()): string {
  const fullPath = join(basePath, PROFILES_PATH);
  return readFileSync(fullPath, 'utf-8');
}

/**
 * Loads lock file content.
 *
 * @param basePath - Base directory
 * @returns Lock hash
 */
export function loadLockFile(basePath: string = process.cwd()): Sha256 {
  const fullPath = join(basePath, PROFILES_LOCK_PATH);
  const content = readFileSync(fullPath, 'utf-8').trim();

  if (!isSha256(content)) {
    throw new Error('Invalid lock file: not a valid SHA256 hash');
  }

  return content;
}

/**
 * Parses and validates a profile from JSON.
 */
function parseProfile(raw: unknown): DeliveryProfile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid profile: must be an object');
  }

  const obj = raw as Record<string, unknown>;

  if (!isProfileId(obj.profileId)) {
    throw new Error(`Invalid profile: invalid profileId format: ${obj.profileId}`);
  }

  if (!isDeliveryFormat(obj.format)) {
    throw new Error(`Invalid profile: invalid format: ${obj.format}`);
  }

  if (typeof obj.extension !== 'string' || !obj.extension.startsWith('.')) {
    throw new Error(`Invalid profile: invalid extension: ${obj.extension}`);
  }

  if (obj.encoding !== 'UTF-8') {
    throw new Error(`Invalid profile: encoding must be UTF-8, got: ${obj.encoding}`);
  }

  if (obj.lineEnding !== 'LF') {
    throw new Error(`Invalid profile: lineEnding must be LF, got: ${obj.lineEnding}`);
  }

  return Object.freeze({
    profileId: obj.profileId as ProfileId,
    format: obj.format as DeliveryFormat,
    extension: obj.extension,
    encoding: 'UTF-8' as const,
    lineEnding: 'LF' as const,
    wrapWidth: typeof obj.wrapWidth === 'number' ? obj.wrapWidth : undefined,
    headers: Array.isArray(obj.headers) ? Object.freeze([...obj.headers]) : undefined,
    footers: Array.isArray(obj.footers) ? Object.freeze([...obj.footers]) : undefined,
  });
}

/**
 * Parses profiles configuration JSON.
 */
export function parseProfilesConfig(content: string): ProfilesConfig {
  const parsed = JSON.parse(content);

  if (!parsed.version || typeof parsed.version !== 'string') {
    throw new Error('Invalid profiles config: missing or invalid version');
  }

  if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
    throw new Error('Invalid profiles config: missing or empty profiles array');
  }

  const profiles = parsed.profiles.map((p: unknown) => parseProfile(p));

  // Verify no duplicate profile IDs
  const ids = new Set<string>();
  for (const profile of profiles) {
    if (ids.has(profile.profileId)) {
      throw new Error(`Duplicate profile ID: ${profile.profileId}`);
    }
    ids.add(profile.profileId);
  }

  return Object.freeze({
    version: parsed.version,
    profiles: Object.freeze(profiles),
  });
}

/**
 * Verifies profiles hash against lock file.
 * H-INV-04: Profiles locked by SHA256
 *
 * @param profilesHash - Computed hash of profiles file
 * @param lockHash - Hash from lock file
 * @returns true if hashes match
 */
export function verifyProfilesHash(profilesHash: Sha256, lockHash: Sha256): boolean {
  return profilesHash === lockHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LOADER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Loads and validates profiles from fixed path.
 *
 * H-INV-04: Verifies against lock hash
 *
 * @param basePath - Base directory for relative paths
 * @returns Loaded profiles with verification status
 * @throws Error if profiles file invalid or lock mismatch
 */
export function loadProfiles(basePath: string = process.cwd()): LoadedProfiles {
  // Load profiles file
  const content = loadProfilesFile(basePath);
  const hash = computeHash(content);

  // Load lock file
  const lockHash = loadLockFile(basePath);

  // Verify hash (H-INV-04)
  const verified = verifyProfilesHash(hash, lockHash);

  if (!verified) {
    throw new Error(
      `H-INV-04 VIOLATION: Profiles hash mismatch. Expected ${lockHash}, got ${hash}. ` +
      `Profiles file may have been tampered with.`
    );
  }

  // Parse and validate
  const config = parseProfilesConfig(content);

  return Object.freeze({
    config,
    hash,
    lockHash,
    verified,
  });
}

/**
 * Loads profiles without verification (for testing only).
 */
export function loadProfilesUnsafe(basePath: string = process.cwd()): LoadedProfiles {
  const content = loadProfilesFile(basePath);
  const hash = computeHash(content);

  let lockHash: Sha256;
  try {
    lockHash = loadLockFile(basePath);
  } catch {
    lockHash = hash; // Use profiles hash as lock if lock file missing
  }

  const verified = verifyProfilesHash(hash, lockHash);
  const config = parseProfilesConfig(content);

  return Object.freeze({
    config,
    hash,
    lockHash,
    verified,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets a profile by ID.
 *
 * @param profiles - Loaded profiles
 * @param profileId - Profile ID to find
 * @returns Profile or undefined if not found
 */
export function getProfile(
  profiles: LoadedProfiles,
  profileId: ProfileId
): DeliveryProfile | undefined {
  return profiles.config.profiles.find(p => p.profileId === profileId);
}

/**
 * Gets the default profile (OMEGA_STD).
 *
 * @param profiles - Loaded profiles
 * @returns Default profile
 * @throws Error if default profile not found
 */
export function getDefaultProfile(profiles: LoadedProfiles): DeliveryProfile {
  const profile = getProfile(profiles, 'OMEGA_STD' as ProfileId);
  if (!profile) {
    throw new Error('Default profile OMEGA_STD not found');
  }
  return profile;
}

/**
 * Gets all profiles for a specific format.
 *
 * @param profiles - Loaded profiles
 * @param format - Format to filter by
 * @returns Array of matching profiles
 */
export function getProfilesByFormat(
  profiles: LoadedProfiles,
  format: DeliveryFormat
): readonly DeliveryProfile[] {
  return Object.freeze(
    profiles.config.profiles.filter(p => p.format === format)
  );
}

/**
 * Computes hash of profiles configuration (for manifest).
 *
 * @param profiles - Loaded profiles
 * @returns Profile hash
 */
export function computeProfilesHash(profiles: LoadedProfiles): Sha256 {
  return profiles.hash;
}
