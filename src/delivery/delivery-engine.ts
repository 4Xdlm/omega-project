/**
 * OMEGA Delivery Engine v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Main delivery engine coordinating all delivery operations.
 *
 * INVARIANTS:
 * - H-INV-01: Body bytes preserved EXACTLY
 * - H-INV-02: No network operations
 * - H-INV-03: No dynamic imports
 * - H-INV-04: Profiles locked by SHA256
 * - H-INV-05: Stable hashes
 * - H-INV-06: UTF-8 BOM-less output
 * - H-INV-07: LF line endings only
 * - H-INV-08: No path traversal
 * - H-INV-09: Hash chain continuity
 * - H-INV-10: Manifest sealed by root hash
 *
 * SPEC: DELIVERY_SPEC v1.0 §H2
 */

import type {
  DeliveryProfile,
  DeliveryArtifact,
  DeliveryManifest,
  DeliveryBundle,
  DeliveryInput,
  DeliveryFormat,
  ProfileId,
  Sha256,
  ISO8601,
} from './types';
import { isValidFilename } from './types';
import {
  loadProfiles,
  getProfile,
  getDefaultProfile,
  computeProfilesHash,
} from './profile-loader';
import type { LoadedProfiles } from './profile-loader';
import { validateBody } from './normalizer';
import { render, buildArtifact, getDefaultFilename, isRenderableFormat } from './renderer';
import { hashString, createChain, addToChain, verifyChain, serializeChain } from './hasher';
import type { HashChain } from './hasher';
import { createManifest, createBundle, verifyBundle, serializeManifest } from './manifest';
import { buildProofPack, verifyProofPack } from './proof-pack';
import type { ProofPack } from './proof-pack';

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE STATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delivery engine state.
 */
export interface EngineState {
  readonly profiles: LoadedProfiles;
  readonly chain: HashChain;
  readonly artifacts: readonly DeliveryArtifact[];
  readonly initialized: boolean;
}

/**
 * Engine configuration options.
 */
export interface EngineConfig {
  readonly basePath?: string;
  readonly defaultProfileId?: ProfileId;
  readonly timestamp?: ISO8601;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY REQUEST/RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request to deliver content.
 */
export interface DeliveryRequest {
  readonly body: string;
  readonly profileId?: ProfileId;
  readonly filename?: string;
  readonly timestamp?: ISO8601;
}

/**
 * Result of delivery operation.
 */
export interface DeliveryResult {
  readonly artifact: DeliveryArtifact;
  readonly chainEntry: {
    readonly index: number;
    readonly hash: Sha256;
  };
  readonly valid: boolean;
  readonly violations: readonly string[];
}

/**
 * Bundle request for multiple deliveries.
 */
export interface BundleRequest {
  readonly name?: string;
  readonly description?: string;
  readonly includeChain?: boolean;
  readonly includeProofPack?: boolean;
}

/**
 * Bundle result with all deliverables.
 */
export interface BundleResult {
  readonly bundle: DeliveryBundle;
  readonly chain?: HashChain;
  readonly chainText?: string;
  readonly proofPack?: ProofPack;
  readonly valid: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OMEGA Delivery Engine.
 * Coordinates delivery operations with full traceability.
 */
export class DeliveryEngine {
  private readonly _profiles: LoadedProfiles;
  private readonly _config: EngineConfig;
  private _chain: HashChain;
  private _artifacts: DeliveryArtifact[];

  /**
   * Creates a new delivery engine instance.
   *
   * @param config - Engine configuration
   */
  constructor(config: EngineConfig = {}) {
    this._config = Object.freeze({ ...config });

    // Load and verify profiles (H-INV-04)
    this._profiles = loadProfiles(config.basePath);

    // Initialize hash chain
    const timestamp = config.timestamp ?? (new Date().toISOString() as ISO8601);
    this._chain = createChain(timestamp);

    // Initialize artifacts list
    this._artifacts = [];
  }

  /**
   * Gets current engine state.
   */
  get state(): EngineState {
    return Object.freeze({
      profiles: this._profiles,
      chain: this._chain,
      artifacts: Object.freeze([...this._artifacts]),
      initialized: true,
    });
  }

  /**
   * Gets loaded profiles.
   */
  get profiles(): LoadedProfiles {
    return this._profiles;
  }

  /**
   * Gets current hash chain.
   */
  get chain(): HashChain {
    return this._chain;
  }

  /**
   * Gets all artifacts.
   */
  get artifacts(): readonly DeliveryArtifact[] {
    return Object.freeze([...this._artifacts]);
  }

  /**
   * Gets profile by ID.
   *
   * @param profileId - Profile ID
   * @returns Profile or undefined
   */
  getProfile(profileId: ProfileId): DeliveryProfile | undefined {
    return getProfile(this._profiles, profileId);
  }

  /**
   * Gets default profile.
   *
   * @returns Default profile
   */
  getDefaultProfile(): DeliveryProfile {
    return getDefaultProfile(this._profiles);
  }

  /**
   * Validates body for delivery.
   * H-INV-06: UTF-8 BOM-less
   * H-INV-07: LF only
   *
   * @param body - Body to validate
   * @returns Validation result
   */
  validateBody(body: string): { valid: boolean; violations: string[] } {
    return validateBody(body);
  }

  /**
   * Delivers content using specified profile.
   * H-INV-01: Body bytes preserved EXACTLY
   *
   * @param request - Delivery request
   * @returns Delivery result
   */
  deliver(request: DeliveryRequest): DeliveryResult {
    const {
      body,
      profileId = this._config.defaultProfileId ?? ('OMEGA_STD' as ProfileId),
      timestamp = new Date().toISOString() as ISO8601,
    } = request;

    // Get profile
    const profile = this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Validate body
    const validation = this.validateBody(body);
    if (!validation.valid) {
      return Object.freeze({
        artifact: null as unknown as DeliveryArtifact,
        chainEntry: { index: -1, hash: '' as Sha256 },
        valid: false,
        violations: Object.freeze(validation.violations),
      });
    }

    // Check if format is renderable
    if (!isRenderableFormat(profile.format)) {
      throw new Error(`Format ${profile.format} requires specialized handler`);
    }

    // Create input
    const input: DeliveryInput = { body, profile };

    // Render artifact
    const renderResult = render(input, { timestamp });

    // Determine filename
    const filename = request.filename ?? getDefaultFilename(profile, 'delivery');

    // Validate filename (H-INV-08)
    if (!isValidFilename(filename)) {
      throw new Error(`H-INV-08 VIOLATION: Invalid filename: ${filename}`);
    }

    // Build artifact
    const artifact = buildArtifact(renderResult, filename, timestamp);

    // Add to chain (H-INV-09)
    this._chain = addToChain(
      this._chain,
      artifact.hash,
      profile.format,
      timestamp
    );

    // Store artifact
    this._artifacts.push(artifact);

    return Object.freeze({
      artifact,
      chainEntry: {
        index: this._chain.entries.length - 1,
        hash: this._chain.entries[this._chain.entries.length - 1].hash,
      },
      valid: true,
      violations: Object.freeze([]),
    });
  }

  /**
   * Delivers multiple contents.
   *
   * @param requests - Array of delivery requests
   * @returns Array of delivery results
   */
  deliverBatch(requests: readonly DeliveryRequest[]): readonly DeliveryResult[] {
    return Object.freeze(requests.map(r => this.deliver(r)));
  }

  /**
   * Creates bundle from all delivered artifacts.
   * H-INV-10: Manifest sealed by root hash
   *
   * @param request - Bundle request
   * @returns Bundle result
   */
  createBundle(request: BundleRequest = {}): BundleResult {
    const timestamp = new Date().toISOString() as ISO8601;

    // Create manifest
    const manifest = createManifest(this._artifacts, timestamp, {
      name: request.name,
      description: request.description,
      profilesHash: computeProfilesHash(this._profiles),
    });

    // Create bundle
    const bundle = createBundle(manifest, this._artifacts);

    // Verify bundle
    const verification = verifyBundle(bundle);

    let chainResult: HashChain | undefined;
    let chainText: string | undefined;
    let proofPackResult: ProofPack | undefined;

    // Include chain if requested
    if (request.includeChain) {
      chainResult = this._chain;
      chainText = serializeChain(this._chain);
    }

    // Include proof pack if requested
    if (request.includeProofPack) {
      proofPackResult = buildProofPack(this._artifacts, timestamp, {
        name: request.name,
        description: request.description,
      });
    }

    return Object.freeze({
      bundle,
      chain: chainResult,
      chainText,
      proofPack: proofPackResult,
      valid: verification.valid,
    });
  }

  /**
   * Verifies current chain integrity.
   * H-INV-09: Hash chain continuity
   *
   * @returns Verification result
   */
  verifyChain(): { valid: boolean; errors: string[] } {
    return verifyChain(this._chain);
  }

  /**
   * Gets chain as text.
   *
   * @returns Serialized chain
   */
  getChainText(): string {
    return serializeChain(this._chain);
  }

  /**
   * Gets manifest for current artifacts.
   *
   * @param name - Optional manifest name
   * @returns Delivery manifest
   */
  getManifest(name?: string): DeliveryManifest {
    const timestamp = new Date().toISOString() as ISO8601;
    return createManifest(this._artifacts, timestamp, {
      name,
      profilesHash: computeProfilesHash(this._profiles),
    });
  }

  /**
   * Gets manifest as JSON.
   *
   * @param name - Optional manifest name
   * @returns JSON string
   */
  getManifestJson(name?: string): string {
    return serializeManifest(this.getManifest(name));
  }

  /**
   * Resets engine state (clears artifacts and chain).
   */
  reset(): void {
    const timestamp = new Date().toISOString() as ISO8601;
    this._chain = createChain(timestamp);
    this._artifacts = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new delivery engine with default configuration.
 *
 * @returns Delivery engine
 */
export function createEngine(): DeliveryEngine {
  return new DeliveryEngine();
}

/**
 * Creates a delivery engine with custom configuration.
 *
 * @param config - Engine configuration
 * @returns Delivery engine
 */
export function createEngineWithConfig(config: EngineConfig): DeliveryEngine {
  return new DeliveryEngine(config);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delivers a single body with default profile.
 * Convenience function for simple use cases.
 *
 * @param body - Content to deliver
 * @param filename - Output filename
 * @returns Delivery artifact
 */
export function deliverBody(body: string, filename: string): DeliveryArtifact {
  const engine = createEngine();
  const result = engine.deliver({ body, filename });

  if (!result.valid) {
    throw new Error(`Delivery failed: ${result.violations.join('; ')}`);
  }

  return result.artifact;
}

/**
 * Delivers content with specific profile.
 *
 * @param body - Content to deliver
 * @param profileId - Profile ID to use
 * @param filename - Output filename
 * @returns Delivery artifact
 */
export function deliverWithProfile(
  body: string,
  profileId: ProfileId,
  filename: string
): DeliveryArtifact {
  const engine = createEngine();
  const result = engine.deliver({ body, profileId, filename });

  if (!result.valid) {
    throw new Error(`Delivery failed: ${result.violations.join('; ')}`);
  }

  return result.artifact;
}

/**
 * Creates a complete delivery bundle from multiple bodies.
 *
 * @param items - Array of body/filename pairs
 * @param bundleName - Bundle name
 * @returns Delivery bundle
 */
export function createDeliveryBundle(
  items: readonly { body: string; filename: string }[],
  bundleName: string
): DeliveryBundle {
  const engine = createEngine();

  for (const item of items) {
    engine.deliver({ body: item.body, filename: item.filename });
  }

  const result = engine.createBundle({ name: bundleName });

  if (!result.valid) {
    throw new Error('Bundle verification failed');
  }

  return result.bundle;
}
