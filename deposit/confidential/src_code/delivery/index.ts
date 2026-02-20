/**
 * OMEGA Delivery Engine v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Public API for delivery operations.
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

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Branded types
  ProfileId,
  Sha256,
  ISO8601,
  // Delivery types
  DeliveryFormat,
  DeliveryProfile,
  DeliveryArtifact,
  DeliveryManifest,
  DeliveryBundle,
  DeliveryInput,
} from './types';

export {
  // Constants
  DELIVERY_FORMATS,
  DEFAULT_PROFILE_ID,
  DEFAULT_ENCODING,
  DEFAULT_LINE_ENDING,
  // Type guards
  isProfileId,
  isSha256,
  isISO8601,
  isDeliveryFormat,
  isValidFilename,
  hasBOM,
  hasCRLF,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE LOADER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ProfilesConfig,
  LoadedProfiles,
} from './profile-loader';

export {
  PROFILES_PATH,
  PROFILES_LOCK_PATH,
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
} from './profile-loader';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  LF,
  CRLF,
  UTF8_BOM,
  normalizeEnvelopeLineEndings,
  removeEnvelopeBOM,
  normalizeEnvelopeText,
  buildHeaderBlock,
  buildFooterBlock,
  validateBodyNoBOM,
  validateBodyLFOnly,
  validateBody,
  assembleArtifact,
  assembleWithProfile,
  ensureString,
  getByteLength,
  extractBody,
  verifyBodyPreserved,
} from './normalizer';

// ═══════════════════════════════════════════════════════════════════════════════
// RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  RenderResult,
  RenderOptions,
} from './renderer';

export {
  render,
  buildArtifact,
  getDefaultFilename,
  isRenderableFormat,
  getSpecializedFormats,
} from './renderer';

// ═══════════════════════════════════════════════════════════════════════════════
// HASHER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  HashChainEntry,
  HashChain,
} from './hasher';

export {
  hashString,
  hashBuffer,
  hashConcat,
  hashObject,
  verifyHash,
  hashesMatch,
  GENESIS_HASH,
  computeChainLink,
  createChainEntry,
  createChain,
  addToChain,
  verifyChain,
  serializeChain,
  parseChain,
  computeMerkleRoot,
} from './hasher';

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ManifestEntry,
  ManifestOptions,
  ManifestVerification,
} from './manifest';

export {
  createManifestEntry,
  createManifest,
  verifyManifest,
  verifyArtifactsAgainstManifest,
  createBundle,
  verifyBundle,
  serializeManifest,
  parseManifest,
  getManifestEntry,
  getEntriesByFormat,
  getEntriesByProfile,
} from './manifest';

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ProofPackMeta,
  ProofPackEntry,
  ProofPack,
  ProofPackOptions,
  ProofPackVerification,
  ZipEntry,
} from './proof-pack';

export {
  isValidPath,
  normalizePath,
  createEntries,
  buildProofPack,
  verifyProofPack,
  toZipEntries,
  getPackSize,
  listPackPaths,
  getPackEntry,
} from './proof-pack';

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  EngineState,
  EngineConfig,
  DeliveryRequest,
  DeliveryResult,
  BundleRequest,
  BundleResult,
} from './delivery-engine';

export {
  DeliveryEngine,
  createEngine,
  createEngineWithConfig,
  deliverBody,
  deliverWithProfile,
  createDeliveryBundle,
} from './delivery-engine';
