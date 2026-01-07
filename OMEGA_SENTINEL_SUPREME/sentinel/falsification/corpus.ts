/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FALSIFICATION CORPUS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module falsification/corpus
 * @version 2.0.0
 * @license MIT
 * 
 * CORPUS — VERSIONED ATTACK REGISTRY
 * ====================================
 * 
 * Manages the corpus of falsification attacks:
 * - Versioned and immutable attack definitions
 * - Categorized by type (structural, semantic, temporal, existential)
 * - Each attack has clear success/failure criteria
 * 
 * INVARIANTS:
 * - INV-CORP-01: Corpus is versioned and immutable
 * - INV-CORP-02: Each attack has a unique ID
 * - INV-CORP-03: Each attack belongs to exactly one category
 * - INV-CORP-04: Categories partition the attack space
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CORPUS_VERSION, FALSIFICATION_WEIGHTS } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attack category — partitions the falsification space
 * Based on the 4 dimensions of falsification
 */
export type AttackCategory = 
  | 'structural'    // Data shape, types, boundaries
  | 'semantic'      // Meaning, logic, business rules
  | 'temporal'      // Time, ordering, concurrency
  | 'existential';  // Resource limits, edge cases, chaos

/**
 * Attack severity level
 */
export type AttackSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Definition of a single attack in the corpus
 */
export interface AttackDefinition {
  /** Unique attack ID (ATK-CAT-NNN format) */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Attack category */
  readonly category: AttackCategory;
  
  /** Description of what the attack tests */
  readonly description: string;
  
  /** What indicates successful defense (survival) */
  readonly successCriteria: string;
  
  /** What indicates failed defense (breach) */
  readonly failureCriteria: string;
  
  /** Severity if attack succeeds (breaches defenses) */
  readonly severity: AttackSeverity;
  
  /** Tags for filtering */
  readonly tags: readonly string[];
  
  /** Is this attack mandatory for certification? */
  readonly mandatory: boolean;
}

/**
 * Versioned corpus containing all attacks
 */
export interface AttackCorpus {
  /** Corpus version */
  readonly version: string;
  
  /** When the corpus was created */
  readonly createdAt: string;
  
  /** All attacks indexed by ID */
  readonly attacks: ReadonlyMap<string, AttackDefinition>;
  
  /** Attacks by category */
  readonly byCategory: ReadonlyMap<AttackCategory, readonly string[]>;
  
  /** Total attack count */
  readonly totalCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All valid attack categories
 */
export const ATTACK_CATEGORIES: readonly AttackCategory[] = Object.freeze([
  'structural',
  'semantic',
  'temporal',
  'existential'
]);

/**
 * Category descriptions
 */
export const CATEGORY_DESCRIPTIONS: Record<AttackCategory, string> = Object.freeze({
  structural: 'Data shape, type safety, boundary conditions, format validation',
  semantic: 'Business logic, invariant violations, state transitions, authorization',
  temporal: 'Race conditions, ordering, timeouts, concurrency, replay attacks',
  existential: 'Resource exhaustion, chaos engineering, edge cases, impossible states'
});

/**
 * Category weights for scoring (from constants)
 */
export const CATEGORY_WEIGHTS: Record<AttackCategory, number> = Object.freeze({
  structural: FALSIFICATION_WEIGHTS.STRUCTURAL,
  semantic: FALSIFICATION_WEIGHTS.SEMANTIC,
  temporal: FALSIFICATION_WEIGHTS.TEMPORAL,
  existential: FALSIFICATION_WEIGHTS.EXISTENTIAL
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUILT-IN ATTACKS — STRUCTURAL
// ═══════════════════════════════════════════════════════════════════════════════

const STRUCTURAL_ATTACKS: readonly AttackDefinition[] = Object.freeze([
  {
    id: 'ATK-STR-001',
    name: 'Null Input Injection',
    category: 'structural',
    description: 'Send null/undefined values where objects are expected',
    successCriteria: 'System rejects with clear error, no crash',
    failureCriteria: 'System crashes, undefined behavior, or accepts silently',
    severity: 'HIGH',
    tags: ['null', 'type-safety', 'input-validation'],
    mandatory: true
  },
  {
    id: 'ATK-STR-002',
    name: 'Empty Collection Attack',
    category: 'structural',
    description: 'Send empty arrays/objects where non-empty expected',
    successCriteria: 'System handles gracefully or rejects explicitly',
    failureCriteria: 'Index out of bounds, silent failure',
    severity: 'MEDIUM',
    tags: ['empty', 'boundary', 'collection'],
    mandatory: true
  },
  {
    id: 'ATK-STR-003',
    name: 'Oversized Payload',
    category: 'structural',
    description: 'Send data exceeding expected size limits',
    successCriteria: 'System rejects with size limit error',
    failureCriteria: 'Memory exhaustion, buffer overflow',
    severity: 'CRITICAL',
    tags: ['size', 'boundary', 'dos'],
    mandatory: true
  },
  {
    id: 'ATK-STR-004',
    name: 'Type Confusion',
    category: 'structural',
    description: 'Send wrong types (string for number, etc.)',
    successCriteria: 'Type error reported, operation refused',
    failureCriteria: 'Silent coercion, unexpected behavior',
    severity: 'HIGH',
    tags: ['type', 'coercion', 'input-validation'],
    mandatory: true
  },
  {
    id: 'ATK-STR-005',
    name: 'Negative Number Injection',
    category: 'structural',
    description: 'Send negative values where positive expected',
    successCriteria: 'Validation error or correct handling',
    failureCriteria: 'Integer underflow, logic errors',
    severity: 'MEDIUM',
    tags: ['number', 'boundary', 'sign'],
    mandatory: true
  },
  {
    id: 'ATK-STR-006',
    name: 'Unicode Boundary Attack',
    category: 'structural',
    description: 'Send edge-case Unicode (surrogate pairs, RTL, zero-width)',
    successCriteria: 'Proper Unicode handling or safe rejection',
    failureCriteria: 'Display corruption, injection, bypass',
    severity: 'MEDIUM',
    tags: ['unicode', 'encoding', 'string'],
    mandatory: false
  },
  {
    id: 'ATK-STR-007',
    name: 'JSON Depth Bomb',
    category: 'structural',
    description: 'Send deeply nested JSON structures',
    successCriteria: 'Depth limit enforced, safe rejection',
    failureCriteria: 'Stack overflow, DoS',
    severity: 'HIGH',
    tags: ['json', 'nested', 'dos'],
    mandatory: true
  },
  {
    id: 'ATK-STR-008',
    name: 'Array Index Boundary',
    category: 'structural',
    description: 'Access arrays at negative or overflow indices',
    successCriteria: 'Bounds checking prevents access',
    failureCriteria: 'Out-of-bounds read/write',
    severity: 'CRITICAL',
    tags: ['array', 'boundary', 'index'],
    mandatory: true
  }
]);

// ═══════════════════════════════════════════════════════════════════════════════
// BUILT-IN ATTACKS — SEMANTIC
// ═══════════════════════════════════════════════════════════════════════════════

const SEMANTIC_ATTACKS: readonly AttackDefinition[] = Object.freeze([
  {
    id: 'ATK-SEM-001',
    name: 'Invalid State Transition',
    category: 'semantic',
    description: 'Attempt impossible state machine transitions',
    successCriteria: 'Transition rejected, state unchanged',
    failureCriteria: 'Invalid state reached, invariant broken',
    severity: 'CRITICAL',
    tags: ['state', 'fsm', 'invariant'],
    mandatory: true
  },
  {
    id: 'ATK-SEM-002',
    name: 'Authorization Bypass',
    category: 'semantic',
    description: 'Access resources without proper permissions',
    successCriteria: 'Access denied with proper error',
    failureCriteria: 'Unauthorized access granted',
    severity: 'CRITICAL',
    tags: ['auth', 'access-control', 'security'],
    mandatory: true
  },
  {
    id: 'ATK-SEM-003',
    name: 'Business Rule Violation',
    category: 'semantic',
    description: 'Create data violating business constraints',
    successCriteria: 'Constraint violation reported',
    failureCriteria: 'Invalid data persisted',
    severity: 'HIGH',
    tags: ['business-rule', 'validation', 'constraint'],
    mandatory: true
  },
  {
    id: 'ATK-SEM-004',
    name: 'Double Submit Attack',
    category: 'semantic',
    description: 'Submit the same operation twice rapidly',
    successCriteria: 'Idempotent handling or duplicate rejection',
    failureCriteria: 'Double processing, data corruption',
    severity: 'HIGH',
    tags: ['idempotency', 'duplicate', 'transaction'],
    mandatory: true
  },
  {
    id: 'ATK-SEM-005',
    name: 'Reference Integrity Violation',
    category: 'semantic',
    description: 'Create orphan references or dangling pointers',
    successCriteria: 'Referential integrity maintained',
    failureCriteria: 'Orphan data, broken references',
    severity: 'HIGH',
    tags: ['reference', 'integrity', 'foreign-key'],
    mandatory: true
  },
  {
    id: 'ATK-SEM-006',
    name: 'Invariant Assertion Attack',
    category: 'semantic',
    description: 'Force system into state where invariant is false',
    successCriteria: 'Invariant preserved, attack rejected',
    failureCriteria: 'Invariant violated',
    severity: 'CRITICAL',
    tags: ['invariant', 'consistency', 'assertion'],
    mandatory: true
  },
  {
    id: 'ATK-SEM-007',
    name: 'Privilege Escalation',
    category: 'semantic',
    description: 'Attempt to gain higher privileges than granted',
    successCriteria: 'Escalation prevented',
    failureCriteria: 'Elevated access obtained',
    severity: 'CRITICAL',
    tags: ['privilege', 'escalation', 'security'],
    mandatory: true
  }
]);

// ═══════════════════════════════════════════════════════════════════════════════
// BUILT-IN ATTACKS — TEMPORAL
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPORAL_ATTACKS: readonly AttackDefinition[] = Object.freeze([
  {
    id: 'ATK-TMP-001',
    name: 'Race Condition Probe',
    category: 'temporal',
    description: 'Concurrent operations competing for same resource',
    successCriteria: 'Proper synchronization, no data corruption',
    failureCriteria: 'Race condition, inconsistent state',
    severity: 'CRITICAL',
    tags: ['race', 'concurrency', 'sync'],
    mandatory: true
  },
  {
    id: 'ATK-TMP-002',
    name: 'Replay Attack',
    category: 'temporal',
    description: 'Resend valid past requests',
    successCriteria: 'Replay detected and rejected',
    failureCriteria: 'Request processed again',
    severity: 'HIGH',
    tags: ['replay', 'nonce', 'security'],
    mandatory: true
  },
  {
    id: 'ATK-TMP-003',
    name: 'Clock Skew Injection',
    category: 'temporal',
    description: 'Send requests with manipulated timestamps',
    successCriteria: 'Timestamp validation or tolerance handling',
    failureCriteria: 'Time-based bypass, cache poisoning',
    severity: 'MEDIUM',
    tags: ['clock', 'timestamp', 'time'],
    mandatory: true
  },
  {
    id: 'ATK-TMP-004',
    name: 'Timeout Exploitation',
    category: 'temporal',
    description: 'Operations that exceed timeout boundaries',
    successCriteria: 'Clean timeout with proper cleanup',
    failureCriteria: 'Resource leak, zombie processes',
    severity: 'HIGH',
    tags: ['timeout', 'cleanup', 'resource'],
    mandatory: true
  },
  {
    id: 'ATK-TMP-005',
    name: 'Order Violation',
    category: 'temporal',
    description: 'Send operations in wrong sequence',
    successCriteria: 'Sequence enforced or reordered correctly',
    failureCriteria: 'Out-of-order processing accepted',
    severity: 'MEDIUM',
    tags: ['order', 'sequence', 'protocol'],
    mandatory: true
  },
  {
    id: 'ATK-TMP-006',
    name: 'Deadlock Induction',
    category: 'temporal',
    description: 'Create circular wait conditions',
    successCriteria: 'Deadlock prevention or detection',
    failureCriteria: 'System hangs in deadlock',
    severity: 'CRITICAL',
    tags: ['deadlock', 'circular-wait', 'locking'],
    mandatory: true
  },
  {
    id: 'ATK-TMP-007',
    name: 'TTL Bypass',
    category: 'temporal',
    description: 'Use expired tokens/sessions/data',
    successCriteria: 'Expired items rejected',
    failureCriteria: 'Stale data accepted',
    severity: 'HIGH',
    tags: ['ttl', 'expiry', 'cache'],
    mandatory: true
  }
]);

// ═══════════════════════════════════════════════════════════════════════════════
// BUILT-IN ATTACKS — EXISTENTIAL
// ═══════════════════════════════════════════════════════════════════════════════

const EXISTENTIAL_ATTACKS: readonly AttackDefinition[] = Object.freeze([
  {
    id: 'ATK-EXT-001',
    name: 'Memory Exhaustion',
    category: 'existential',
    description: 'Consume all available memory',
    successCriteria: 'Memory limits enforced, graceful degradation',
    failureCriteria: 'OOM crash, system instability',
    severity: 'CRITICAL',
    tags: ['memory', 'resource', 'dos'],
    mandatory: true
  },
  {
    id: 'ATK-EXT-002',
    name: 'File Handle Exhaustion',
    category: 'existential',
    description: 'Open files until limit reached',
    successCriteria: 'Handle limits enforced, proper cleanup',
    failureCriteria: 'Handle leak, system failure',
    severity: 'HIGH',
    tags: ['file', 'handle', 'resource'],
    mandatory: true
  },
  {
    id: 'ATK-EXT-003',
    name: 'Connection Pool Exhaustion',
    category: 'existential',
    description: 'Exhaust database/network connection pools',
    successCriteria: 'Pool limits enforced, queuing',
    failureCriteria: 'Connection starvation, deadlock',
    severity: 'HIGH',
    tags: ['connection', 'pool', 'resource'],
    mandatory: true
  },
  {
    id: 'ATK-EXT-004',
    name: 'Disk Space Exhaustion',
    category: 'existential',
    description: 'Fill disk with logs/data/temp files',
    successCriteria: 'Disk quotas enforced, rotation',
    failureCriteria: 'Disk full crash',
    severity: 'HIGH',
    tags: ['disk', 'storage', 'resource'],
    mandatory: true
  },
  {
    id: 'ATK-EXT-005',
    name: 'Chaos Network Partition',
    category: 'existential',
    description: 'Simulate network splits between components',
    successCriteria: 'Graceful handling, eventual consistency',
    failureCriteria: 'Split brain, data loss',
    severity: 'CRITICAL',
    tags: ['network', 'partition', 'chaos'],
    mandatory: true
  },
  {
    id: 'ATK-EXT-006',
    name: 'Dependency Failure',
    category: 'existential',
    description: 'External service becomes unavailable',
    successCriteria: 'Circuit breaker, fallback',
    failureCriteria: 'Cascade failure',
    severity: 'HIGH',
    tags: ['dependency', 'circuit-breaker', 'resilience'],
    mandatory: true
  },
  {
    id: 'ATK-EXT-007',
    name: 'Impossible Input',
    category: 'existential',
    description: 'Inputs that should be mathematically impossible',
    successCriteria: 'Rejection or safe handling',
    failureCriteria: 'Undefined behavior',
    severity: 'MEDIUM',
    tags: ['impossible', 'edge-case', 'validation'],
    mandatory: false
  },
  {
    id: 'ATK-EXT-008',
    name: 'Maximum Integer Overflow',
    category: 'existential',
    description: 'Integer values at MAX_SAFE_INTEGER and beyond',
    successCriteria: 'Overflow prevented or BigInt used',
    failureCriteria: 'Silent overflow, wrong calculations',
    severity: 'HIGH',
    tags: ['integer', 'overflow', 'math'],
    mandatory: true
  }
]);

// ═══════════════════════════════════════════════════════════════════════════════
// CORPUS CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All built-in attacks
 */
const ALL_ATTACKS: readonly AttackDefinition[] = Object.freeze([
  ...STRUCTURAL_ATTACKS,
  ...SEMANTIC_ATTACKS,
  ...TEMPORAL_ATTACKS,
  ...EXISTENTIAL_ATTACKS
]);

/**
 * Build the attack corpus
 */
function buildCorpus(): AttackCorpus {
  const attacks = new Map<string, AttackDefinition>();
  const byCategory = new Map<AttackCategory, string[]>();
  
  // Initialize category lists
  for (const cat of ATTACK_CATEGORIES) {
    byCategory.set(cat, []);
  }
  
  // Add all attacks
  for (const attack of ALL_ATTACKS) {
    attacks.set(attack.id, attack);
    byCategory.get(attack.category)!.push(attack.id);
  }
  
  // Freeze category lists
  const frozenByCategory = new Map<AttackCategory, readonly string[]>();
  for (const [cat, ids] of byCategory) {
    frozenByCategory.set(cat, Object.freeze(ids));
  }
  
  return Object.freeze({
    version: CORPUS_VERSION,
    createdAt: '2026-01-06T00:00:00Z',
    attacks,
    byCategory: frozenByCategory,
    totalCount: attacks.size
  });
}

/**
 * The default corpus instance
 */
export const DEFAULT_CORPUS: AttackCorpus = buildCorpus();

// ═══════════════════════════════════════════════════════════════════════════════
// CORPUS QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get an attack by ID
 */
export function getAttack(id: string): AttackDefinition | undefined {
  return DEFAULT_CORPUS.attacks.get(id);
}

/**
 * Get all attacks
 */
export function getAllAttacks(): readonly AttackDefinition[] {
  return ALL_ATTACKS;
}

/**
 * Get attacks by category
 */
export function getAttacksByCategory(category: AttackCategory): readonly AttackDefinition[] {
  const ids = DEFAULT_CORPUS.byCategory.get(category) ?? [];
  return ids.map(id => DEFAULT_CORPUS.attacks.get(id)!);
}

/**
 * Get mandatory attacks only
 */
export function getMandatoryAttacks(): readonly AttackDefinition[] {
  return ALL_ATTACKS.filter(a => a.mandatory);
}

/**
 * Get attacks by severity
 */
export function getAttacksBySeverity(severity: AttackSeverity): readonly AttackDefinition[] {
  return ALL_ATTACKS.filter(a => a.severity === severity);
}

/**
 * Get attacks by tag
 */
export function getAttacksByTag(tag: string): readonly AttackDefinition[] {
  return ALL_ATTACKS.filter(a => a.tags.includes(tag));
}

/**
 * Get attack count by category
 */
export function getAttackCountByCategory(): Record<AttackCategory, number> {
  const counts: Record<AttackCategory, number> = {
    structural: 0,
    semantic: 0,
    temporal: 0,
    existential: 0
  };
  
  for (const [cat, ids] of DEFAULT_CORPUS.byCategory) {
    counts[cat] = ids.length;
  }
  
  return Object.freeze(counts);
}

/**
 * Check if an attack ID exists
 */
export function hasAttack(id: string): boolean {
  return DEFAULT_CORPUS.attacks.has(id);
}

/**
 * Get corpus statistics
 */
export function getCorpusStats(): {
  readonly version: string;
  readonly totalAttacks: number;
  readonly mandatoryAttacks: number;
  readonly byCategory: Record<AttackCategory, number>;
  readonly bySeverity: Record<AttackSeverity, number>;
} {
  const bySeverity: Record<AttackSeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0
  };
  
  for (const attack of ALL_ATTACKS) {
    bySeverity[attack.severity]++;
  }
  
  return Object.freeze({
    version: DEFAULT_CORPUS.version,
    totalAttacks: DEFAULT_CORPUS.totalCount,
    mandatoryAttacks: getMandatoryAttacks().length,
    byCategory: getAttackCountByCategory(),
    bySeverity: Object.freeze(bySeverity)
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a string is a valid attack category
 */
export function isAttackCategory(value: unknown): value is AttackCategory {
  return typeof value === 'string' && ATTACK_CATEGORIES.includes(value as AttackCategory);
}

/**
 * Check if a string is a valid attack severity
 */
export function isAttackSeverity(value: unknown): value is AttackSeverity {
  return typeof value === 'string' && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(value);
}

/**
 * Validate attack ID format (ATK-CAT-NNN)
 */
export function isValidAttackId(id: unknown): id is string {
  return typeof id === 'string' && /^ATK-[A-Z]{3}-\d{3}$/.test(id);
}
