/**
 * OMEGA Canon Module v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Public API barrel file.
 */

// Config
export {
  ConfigSymbol,
  ConfigResolver,
  ConfigResolutionError,
  JsonConfigResolver,
  createTestConfigResolver,
  loadJsonConfig,
  loadJsonConfigSync,
  mergeConfigResolvers,
  configSymbol,
  // Config symbols
  ID_RNG_HEX_LEN,
  ID_FORMAT_REGEX_CLM,
  ID_FORMAT_REGEX_ENT,
  ID_FORMAT_REGEX_EVD,
  SEGMENT_MAX_BYTES,
  SEGMENT_TARGET_BYTES,
  SEGMENT_ROTATE_STRATEGY,
  SEGMENT_PREFIX,
  SEGMENT_EXTENSION,
  P95_GETBYID_TARGET_MS,
  P95_QUERY_TARGET_MS,
  PERF_SEED_CLAIMS_COUNT,
} from './config-symbol';

// Types
export {
  // Branded types
  ClaimId,
  EntityId,
  EvidenceId,
  RefId,
  PredicateType,
  CanonVersion,
  ChainHash,
  MonoNs,
  // Enums
  ClaimStatus,
  EvidenceType,
  LineageSource,
  // Interfaces
  EvidenceRef,
  Lineage,
  PrimitiveValue,
  ClaimValue,
  CanonClaim,
  CreateClaimParams,
  // Errors
  CanonError,
  CanonErrorCode,
  // Type guards
  isClaimStatus,
  isEvidenceType,
  isLineageSource,
  isValidConfidence,
} from './types';

// ID Factory
export {
  DeterministicRng,
  SeededRng,
  IdFactory,
  DeterministicIdFactory,
  createTestIdFactory,
  createTestClaimId,
  createTestEntityId,
  createTestEvidenceId,
  TEST_ID_CONFIG,
} from './id-factory';

// Semantic Equals
export {
  containsNaN,
  normalizeUndefined,
  semanticEquals,
  assertNoNaN,
  normalizeForCanon,
  canonicalizeWithUndefined,
} from './semantic-equals';

// Predicate Catalog
export {
  SubjectType,
  ObjectType,
  PredicateCatalogEntry,
  PredicateCatalog,
  BUILT_IN_CATALOG,
  loadCatalog,
  getCatalog,
  resetCatalog,
  validatePredicate,
  getPredicateDefinition,
  asPredicateType,
  getAllPredicateIds,
  getCatalogHash,
  getCatalogVersion,
  hasSupersedesPredicate,
} from './predicate-catalog';

// Lineage
export {
  GENESIS_HASH,
  CreateLineageParams,
  createLineage,
  computePrevHash,
  computeLineageHash,
  ChainVerificationResult,
  verifyLineageChain,
  getParentClaim,
  buildHashIndex,
  verifyClaimHash,
  verifyAllClaimHashes,
} from './lineage';

// Guard
export {
  ConflictType,
  ConflictResult,
  ValidationResult,
  ValidationError,
  ClaimStore,
  CanonGuard,
  guard,
} from './guard';

// Segment Writer
export {
  SegmentWriter,
  SegmentWriterOptions,
  SegmentInfo,
  FileSegmentWriter,
  InMemorySegmentWriter,
  createSegmentWriter,
  computeSegmentHash,
  readSegmentClaims,
} from './segment-writer';

// Segment Manifest
export {
  SegmentEntry,
  SegmentManifest,
  ManifestStats,
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
} from './segment-manifest';

// Index Builder
export {
  CanonIndex,
  ClaimOffset,
  buildIndex,
  mergeIndexes,
  createEmptyIndex,
  verifyIndex,
  saveIndex,
  loadIndex,
  getClaimIdsBySubject,
  getClaimIdsByPredicate,
  getClaimIdsByStatus,
  getClaimIdsBySubjectAndPredicate,
  getClaimOffset,
  hasClaimId,
} from './index-builder';

// Query Engine
export {
  QueryOptions,
  QueryResult,
  ClaimRetriever,
  query,
  getById,
  getByHash,
  getClaimsForSubject,
  getActiveClaimsForSubject,
  getClaimsBySubjectAndPredicate,
  getActiveClaimsBySubjectAndPredicate,
  InMemoryClaimRetriever,
} from './query';

// Canon API
export {
  CanonConfig,
  CanonStats,
  Result,
  CanonAPI,
  DefaultCanonAPI,
  createCanonAPI,
  createTestCanonAPI,
} from './canon-api';
