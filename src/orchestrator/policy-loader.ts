/**
 * OMEGA Orchestrator Policy Loader v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Loads and validates policies from fixed path
 *
 * INVARIANTS:
 * - G-INV-08: Policies from versioned config + lock hash
 * - G-INV-13: Fixed policies path (no ENV var)
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G4
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import type { PolicyId, Sha256, PatternId, VocabularyId, StructureId } from './types';
import { isPolicyId, isSha256 } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED PATH (G-INV-13)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed policies path - NEVER from environment variable.
 * G-INV-13: Fixed policies path (no ENV var)
 */
export const POLICIES_PATH = 'config/policies/policies.v1.json';

/**
 * Fixed lock file path
 */
export const POLICIES_LOCK_PATH = 'config/policies/policies.lock';

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pattern definition for forbidden patterns
 */
export interface PatternDefinition {
  readonly id: PatternId;
  readonly regex: string;
  readonly description: string;
}

/**
 * Vocabulary definition for forbidden words
 */
export interface VocabularyDefinition {
  readonly id: VocabularyId;
  readonly words: readonly string[];
  readonly description: string;
}

/**
 * Structure definition for forbidden structures
 */
export interface StructureDefinition {
  readonly id: StructureId;
  readonly pattern: string;
  readonly description: string;
}

/**
 * Policy rules
 */
export interface PolicyRules {
  readonly allowedGoals: readonly string[];
  readonly allowedTones: readonly string[];
  readonly maxRequestsPerActor: number;
}

/**
 * Policy forbidden definitions
 */
export interface PolicyForbidden {
  readonly patterns: readonly PatternDefinition[];
  readonly vocabularies: readonly VocabularyDefinition[];
  readonly structures: readonly StructureDefinition[];
}

/**
 * Policy limits
 */
export interface PolicyLimits {
  readonly maxLength: number;
  readonly minLength: number;
  readonly maxPayloadSize: number;
}

/**
 * Complete policy configuration
 */
export interface PolicyConfig {
  readonly version: string;
  readonly policyId: PolicyId;
  readonly rules: PolicyRules;
  readonly forbidden: PolicyForbidden;
  readonly limits: PolicyLimits;
  readonly metadata?: {
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly author?: string;
  };
}

/**
 * Loaded policy with integrity info
 */
export interface LoadedPolicy {
  readonly config: PolicyConfig;
  readonly hash: Sha256;
  readonly lockHash: Sha256;
  readonly verified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes SHA256 hash of file contents.
 */
function computeFileHash(content: string): Sha256 {
  return createHash('sha256').update(content).digest('hex') as Sha256;
}

/**
 * Loads raw policy file from fixed path.
 * G-INV-13: Path is fixed, not from ENV
 *
 * @param basePath - Base directory for relative path resolution
 * @returns Raw policy file content
 */
export function loadPolicyFile(basePath: string = process.cwd()): string {
  const fullPath = join(basePath, POLICIES_PATH);
  return readFileSync(fullPath, 'utf-8');
}

/**
 * Loads lock file content.
 *
 * @param basePath - Base directory
 * @returns Lock hash
 */
export function loadLockFile(basePath: string = process.cwd()): Sha256 {
  const fullPath = join(basePath, POLICIES_LOCK_PATH);
  const content = readFileSync(fullPath, 'utf-8').trim();

  if (!isSha256(content)) {
    throw new Error('Invalid lock file: not a valid SHA256 hash');
  }

  return content;
}

/**
 * Parses policy JSON.
 */
export function parsePolicy(content: string): PolicyConfig {
  const parsed = JSON.parse(content);

  // Validate required fields
  if (!parsed.version || typeof parsed.version !== 'string') {
    throw new Error('Invalid policy: missing or invalid version');
  }

  if (!isPolicyId(parsed.policyId)) {
    throw new Error('Invalid policy: invalid policyId format');
  }

  if (!parsed.rules || typeof parsed.rules !== 'object') {
    throw new Error('Invalid policy: missing or invalid rules');
  }

  if (!parsed.forbidden || typeof parsed.forbidden !== 'object') {
    throw new Error('Invalid policy: missing or invalid forbidden');
  }

  if (!parsed.limits || typeof parsed.limits !== 'object') {
    throw new Error('Invalid policy: missing or invalid limits');
  }

  return Object.freeze({
    version: parsed.version,
    policyId: parsed.policyId as PolicyId,
    rules: Object.freeze({
      allowedGoals: Object.freeze([...parsed.rules.allowedGoals]),
      allowedTones: Object.freeze([...parsed.rules.allowedTones]),
      maxRequestsPerActor: parsed.rules.maxRequestsPerActor,
    }),
    forbidden: Object.freeze({
      patterns: Object.freeze(parsed.forbidden.patterns.map((p: any) =>
        Object.freeze({
          id: p.id as PatternId,
          regex: p.regex,
          description: p.description,
        })
      )),
      vocabularies: Object.freeze(parsed.forbidden.vocabularies.map((v: any) =>
        Object.freeze({
          id: v.id as VocabularyId,
          words: Object.freeze([...v.words]),
          description: v.description,
        })
      )),
      structures: Object.freeze(parsed.forbidden.structures.map((s: any) =>
        Object.freeze({
          id: s.id as StructureId,
          pattern: s.pattern,
          description: s.description,
        })
      )),
    }),
    limits: Object.freeze({
      maxLength: parsed.limits.maxLength,
      minLength: parsed.limits.minLength,
      maxPayloadSize: parsed.limits.maxPayloadSize,
    }),
    metadata: parsed.metadata ? Object.freeze({ ...parsed.metadata }) : undefined,
  });
}

/**
 * Verifies policy hash against lock file.
 * G-INV-08: Policies from versioned config + lock hash
 *
 * @param policyHash - Computed hash of policy file
 * @param lockHash - Hash from lock file
 * @returns true if hashes match
 */
export function verifyPolicyHash(policyHash: Sha256, lockHash: Sha256): boolean {
  return policyHash === lockHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LOADER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Loads and validates policy from fixed path.
 *
 * G-INV-08: Verifies against lock hash
 * G-INV-13: Uses fixed path
 *
 * @param basePath - Base directory for relative paths
 * @returns Loaded policy with verification status
 * @throws Error if policy file invalid or lock mismatch
 */
export function loadPolicy(basePath: string = process.cwd()): LoadedPolicy {
  // Load policy file
  const content = loadPolicyFile(basePath);
  const hash = computeFileHash(content);

  // Load lock file
  const lockHash = loadLockFile(basePath);

  // Verify hash (G-INV-08)
  const verified = verifyPolicyHash(hash, lockHash);

  if (!verified) {
    throw new Error(
      `G-INV-08 VIOLATION: Policy hash mismatch. Expected ${lockHash}, got ${hash}. ` +
      `Policy file may have been tampered with.`
    );
  }

  // Parse and validate
  const config = parsePolicy(content);

  return Object.freeze({
    config,
    hash,
    lockHash,
    verified,
  });
}

/**
 * Loads policy without verification (for testing only).
 * Returns unverified policy.
 */
export function loadPolicyUnsafe(basePath: string = process.cwd()): LoadedPolicy {
  const content = loadPolicyFile(basePath);
  const hash = computeFileHash(content);

  let lockHash: Sha256;
  try {
    lockHash = loadLockFile(basePath);
  } catch {
    lockHash = hash; // Use policy hash as lock if lock file missing
  }

  const verified = verifyPolicyHash(hash, lockHash);
  const config = parsePolicy(content);

  return Object.freeze({
    config,
    hash,
    lockHash,
    verified,
  });
}

/**
 * Gets the expected policy hash from lock file.
 */
export function getExpectedPolicyHash(basePath: string = process.cwd()): Sha256 {
  return loadLockFile(basePath);
}

/**
 * Computes current policy hash.
 */
export function computePolicyHash(basePath: string = process.cwd()): Sha256 {
  const content = loadPolicyFile(basePath);
  return computeFileHash(content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// (POLICIES_PATH and POLICIES_LOCK_PATH are already exported at declaration)
// ═══════════════════════════════════════════════════════════════════════════════
