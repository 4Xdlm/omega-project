/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FOUNDATION CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module foundation/constants
 * @version 3.26.0
 * @license MIT
 * 
 * INVARIANT: INV-CONST-01 — All constants are immutable (Object.freeze)
 * INVARIANT: INV-CONST-02 — Version follows SemVer strictly
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SENTINEL SUPREME version following Semantic Versioning
 * Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes to certification semantics
 * - MINOR: New features, backward compatible
 * - PATCH: Bug fixes, no semantic changes
 */
export const SENTINEL_VERSION = '3.28.0' as const;

/**
 * IDL (Invariant Descriptor Language) version
 * Crystalline: structure immutable, instances append-only
 */
export const IDL_VERSION = '2.0.0' as const;

/**
 * Corpus adversarial version
 */
export const CORPUS_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash algorithm used throughout SENTINEL
 * SHA-256 is the canonical choice per AX-Δ axiom
 */
export const HASH_ALGORITHM = 'SHA-256' as const;

/**
 * Signature algorithm for certificates
 * ED25519 for speed and security
 */
export const SIGNATURE_ALGORITHM = 'ED25519' as const;

/**
 * Hash output length in bytes (SHA-256 = 32 bytes = 256 bits)
 */
export const HASH_LENGTH_BYTES = 32 as const;

/**
 * Hash output length in hex characters
 */
export const HASH_LENGTH_HEX = 64 as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF STRENGTH WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Proof strength hierarchy (Ω > Λ > Σ > Δ > Ε)
 * Higher value = stronger proof
 */
export const PROOF_STRENGTH_WEIGHTS = Object.freeze({
  OMEGA: 5,      // Ω — Formal impossibility proof
  LAMBDA: 4,     // Λ — Mathematical/logical proof
  SIGMA: 3,      // Σ — Exhaustive enumeration (finite space)
  DELTA: 2,      // Δ — Statistical sampling (bounded confidence)
  EPSILON: 1     // Ε — Empirical observation (heuristic)
} as const);

// ═══════════════════════════════════════════════════════════════════════════════
// FALSIFICATION COVERAGE WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Coverage weights for falsification categories
 * Sum must equal 1.0
 */
export const FALSIFICATION_WEIGHTS = Object.freeze({
  STRUCTURAL: 0.30,    // Fuzzing, boundary attacks
  SEMANTIC: 0.25,      // Type confusion, encoding attacks
  TEMPORAL: 0.25,      // Race conditions, timing attacks
  EXISTENTIAL: 0.20    // Resource exhaustion, DoS
} as const);

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SPACE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Impact weights for impossibilities
 */
export const IMPOSSIBILITY_IMPACT_WEIGHTS = Object.freeze({
  CATASTROPHIC: 3,
  SEVERE: 2,
  MODERATE: 1
} as const);

/**
 * Maximum negative space score before normalization
 * Used for: normalized_score = min(1, raw_score / MAX_NEGATIVE_SCORE)
 */
export const MAX_NEGATIVE_SCORE = 30 as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL DECAY CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default decay lambda (daily confidence retention)
 * 0.997 = lose 0.3% confidence per day
 */
export const DEFAULT_DECAY_LAMBDA = 0.997 as const;

/**
 * Confidence thresholds for living certificates
 */
export const CONFIDENCE_THRESHOLDS = Object.freeze({
  WARNING: 0.95,     // Re-prove recommended
  REPROVE: 0.90,     // Re-prove required
  EXPIRED: 0.80      // Certification expired
} as const);

/**
 * Threat factor multipliers
 */
export const THREAT_FACTORS = Object.freeze({
  NORMAL: 1.0,
  CVE_MINOR: 0.9,
  CVE_MAJOR: 0.7,
  CVE_CRITICAL: 0.5
} as const);

// ═══════════════════════════════════════════════════════════════════════════════
// SCRUTINY GRAVITY CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base values for scrutiny requirements
 */
export const SCRUTINY_BASE = Object.freeze({
  MIN_ADVERSARIAL_HOURS: 1,
  BASE_COVERAGE: 0.70,
  MAX_COVERAGE: 0.99,
  MAX_REPROVE_DAYS: 180,
  MIN_REPROVE_DAYS: 7
} as const);

/**
 * Scrutiny multipliers per unit of mass
 */
export const SCRUTINY_MULTIPLIERS = Object.freeze({
  HOURS_PER_MASS: 10,
  COVERAGE_PER_MASS: 0.05
} as const);

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION REGION NAMES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Certification levels in ascending order
 */
export const CERTIFICATION_LEVELS = Object.freeze([
  'VOID',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'OMEGA',
  'TRANSCENDENT'
] as const);

export type CertificationLevel = typeof CERTIFICATION_LEVELS[number];

// ═══════════════════════════════════════════════════════════════════════════════
// AXIOM IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The 5 foundational axioms of SENTINEL SUPREME
 */
export const AXIOM_IDS = Object.freeze([
  'AX-Ω',  // Falsifiability (Popper)
  'AX-Λ',  // Determinism
  'AX-Σ',  // Bounded Attack Space
  'AX-Δ',  // Cryptographic Integrity
  'AX-Ε'   // Impossibility Strength
] as const);

export type AxiomId = typeof AXIOM_IDS[number];

// ═══════════════════════════════════════════════════════════════════════════════
// IMPOSSIBILITY CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Taxonomy of provable impossibilities
 */
export const IMPOSSIBILITY_CLASSES = Object.freeze([
  'CANNOT_LEAK',        // Confidentiality
  'CANNOT_CORRUPT',     // Integrity
  'CANNOT_DEADLOCK',    // Liveness
  'CANNOT_OVERFLOW',    // Memory safety
  'CANNOT_TIMEOUT',     // Performance bounds
  'CANNOT_REGRESS',     // Temporal monotonicity
  'CANNOT_BYPASS',      // Security enforcement
  'CANNOT_VIOLATE'      // Business logic invariants
] as const);

export type ImpossibilityClass = typeof IMPOSSIBILITY_CLASSES[number];

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Regex patterns for validation
 */
export const VALIDATION_PATTERNS = Object.freeze({
  // Invariant ID: INV-XXX-NNN or INV-XXX-NNNN
  INVARIANT_ID: /^INV-[A-Z]{2,6}-\d{2,4}$/,
  
  // Axiom ID: AX-X (Greek letter)
  AXIOM_ID: /^AX-[ΩΛΣΔΕ]$/,
  
  // SHA-256 hash: 64 hex characters
  SHA256_HASH: /^[a-f0-9]{64}$/,
  
  // ISO 8601 timestamp
  ISO_TIMESTAMP: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
  
  // SemVer version
  SEMVER: /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/,
  
  // Certificate ID: UUID v4
  UUID_V4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const);

// ═══════════════════════════════════════════════════════════════════════════════
// SENTINEL SUPREME BANNER
// ═══════════════════════════════════════════════════════════════════════════════

export const SENTINEL_BANNER = `
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   ░██████╗███████╗███╗░░██╗████████╗██╗███╗░░██╗███████╗██╗░░░░░                       ║
║   ██╔════╝██╔════╝████╗░██║╚══██╔══╝██║████╗░██║██╔════╝██║░░░░░                       ║
║   ╚█████╗░█████╗░░██╔██╗██║░░░██║░░░██║██╔██╗██║█████╗░░██║░░░░░                       ║
║   ░╚═══██╗██╔══╝░░██║╚████║░░░██║░░░██║██║╚████║██╔══╝░░██║░░░░░                       ║
║   ██████╔╝███████╗██║░╚███║░░░██║░░░██║██║░╚███║███████╗███████╗                       ║
║   ╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░╚═╝╚═╝░░╚══╝╚══════╝╚══════╝                       ║
║                                                                                       ║
║   ░██████╗██╗░░░██╗██████╗░██████╗░███████╗███╗░░░███╗███████╗                         ║
║   ██╔════╝██║░░░██║██╔══██╗██╔══██╗██╔════╝████╗░████║██╔════╝                         ║
║   ╚█████╗░██║░░░██║██████╔╝██████╔╝█████╗░░██╔████╔██║█████╗░░                         ║
║   ░╚═══██╗██║░░░██║██╔═══╝░██╔══██╗██╔══╝░░██║╚██╔╝██║██╔══╝░░                         ║
║   ██████╔╝╚██████╔╝██║░░░░░██║░░██║███████╗██║░╚═╝░██║███████╗                         ║
║   ╚═════╝░░╚═════╝░╚═╝░░░░░╚═╝░░╚═╝╚══════╝╚═╝░░░░░╚═╝╚══════╝                         ║
║                                                                                       ║
║   Version: ${SENTINEL_VERSION}                                                              ║
║   Standard: POST-SINGULARITY CERTIFICATION                                            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
` as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard for CertificationLevel
 */
export function isCertificationLevel(value: unknown): value is CertificationLevel {
  return typeof value === 'string' && 
    (CERTIFICATION_LEVELS as readonly string[]).includes(value);
}

/**
 * Type guard for AxiomId
 */
export function isAxiomId(value: unknown): value is AxiomId {
  return typeof value === 'string' && 
    (AXIOM_IDS as readonly string[]).includes(value);
}

/**
 * Type guard for ImpossibilityClass
 */
export function isImpossibilityClass(value: unknown): value is ImpossibilityClass {
  return typeof value === 'string' && 
    (IMPOSSIBILITY_CLASSES as readonly string[]).includes(value);
}

/**
 * Validate SHA-256 hash format
 */
export function isValidSHA256(hash: string): boolean {
  return VALIDATION_PATTERNS.SHA256_HASH.test(hash);
}

/**
 * Validate invariant ID format
 */
export function isValidInvariantId(id: string): boolean {
  return VALIDATION_PATTERNS.INVARIANT_ID.test(id);
}

/**
 * Validate SemVer version format
 */
export function isValidSemVer(version: string): boolean {
  return VALIDATION_PATTERNS.SEMVER.test(version);
}

/**
 * Validate ISO 8601 timestamp format
 */
export function isValidISO8601(timestamp: string): boolean {
  return VALIDATION_PATTERNS.ISO_TIMESTAMP.test(timestamp);
}

/**
 * Validate UUID v4 format
 */
export function isValidUUIDv4(uuid: string): boolean {
  return VALIDATION_PATTERNS.UUID_V4.test(uuid);
}
