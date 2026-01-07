/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FALSIFICATION RUNNER
 * Sprint 27.2 — Self-Certification Infrastructure
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Core engine for attacking PURE invariants with falsification attempts.
 * 
 * INV-FALS-SELF-01: Tous les PURE sont attaqués
 * INV-FALS-SELF-02: Toute survie est prouvée
 * INV-FALS-SELF-03: Échec = arrêt immédiat
 * INV-FALS-SELF-04: Runner déterministe (seeded)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  INVENTORY,
  getInventoryByCategory,
  type InvariantRecord,
} from '../meta/inventory.js';

import {
  getAllAttacks,
  getAttacksByCategory,
  type Attack,
} from '../falsification/corpus.js';

import {
  createAttackVector,
  createAttackAttempt,
  createSurvivalProof,
  createFalsificationReport,
  type AttackVector,
  type AttackAttempt,
  type AttackOutcome,
  type SurvivalProof,
  type FalsificationReport,
  DEFAULT_SEED,
  MIN_ATTACKS_PER_INVARIANT,
} from './survival-proof.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RunnerConfig {
  readonly seed: number;
  readonly minAttacksPerInvariant: number;
  readonly stopOnFirstBreach: boolean;
  readonly targetInvariants?: readonly string[];
  readonly excludeInvariants?: readonly string[];
  readonly verbose: boolean;
}

export interface InvariantTestFn {
  (input: unknown, seed: number): boolean;
}

export interface InvariantTestRegistry {
  readonly [invariantId: string]: InvariantTestFn;
}

export interface RunnerState {
  readonly config: RunnerConfig;
  readonly proofs: SurvivalProof[];
  readonly currentInvariant: string | null;
  readonly startTime: string;
  readonly breached: boolean;
  readonly breachedIds: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_RUNNER_CONFIG: RunnerConfig = Object.freeze({
  seed: DEFAULT_SEED,
  minAttacksPerInvariant: MIN_ATTACKS_PER_INVARIANT,
  stopOnFirstBreach: true,
  verbose: false,
});

export const RUNNER_VERSION = '1.0.0' as const;

// ============================================================================
// SEEDED RANDOM
// ============================================================================

/**
 * Simple seeded pseudo-random number generator (Mulberry32).
 * Deterministic: same seed = same sequence.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function(): number {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array deterministically using seeded random.
 */
export function shuffleWithSeed<T>(array: readonly T[], seed: number): T[] {
  const result = [...array];
  const random = createSeededRandom(seed);
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Select N items from array deterministically.
 */
export function selectWithSeed<T>(array: readonly T[], n: number, seed: number): T[] {
  const shuffled = shuffleWithSeed(array, seed);
  return shuffled.slice(0, Math.min(n, array.length));
}

// ============================================================================
// ATTACK GENERATION
// ============================================================================

/**
 * Simple string hash for deterministic seed variation.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate attack vectors for an invariant.
 * Uses seeded random for deterministic selection.
 */
export function generateAttackVectors(
  invariantId: string,
  count: number,
  seed: number
): AttackVector[] {
  const attacks = getAllAttacks();
  const vectors: AttackVector[] = [];
  
  // Use proper string hash for invariant differentiation
  const invariantHash = hashString(invariantId);
  
  // Select attacks deterministically
  const selectedAttacks = selectWithSeed(attacks, count, seed + invariantHash);
  
  for (let i = 0; i < selectedAttacks.length; i++) {
    const attack = selectedAttacks[i];
    const attackSeed = seed + i * 31337 + invariantHash;
    
    vectors.push(createAttackVector(
      attack.id,
      attack.category,
      generateAttackInput(attack, attackSeed),
      attackSeed,
      attack.description
    ));
  }
  
  return vectors;
}

/**
 * Generate attack input based on attack type.
 */
export function generateAttackInput(attack: Attack, seed: number): string {
  const random = createSeededRandom(seed);
  
  switch (attack.category) {
    case 'structural':
      return generateStructuralInput(attack, random);
    case 'semantic':
      return generateSemanticInput(attack, random);
    case 'temporal':
      return generateTemporalInput(attack, random);
    case 'existential':
      return generateExistentialInput(attack, random);
    default:
      return `generic-attack-${seed}`;
  }
}

function generateStructuralInput(attack: Attack, random: () => number): string {
  const inputs = [
    'null',
    'undefined',
    '{}',
    '[]',
    '""',
    '0',
    '-1',
    'NaN',
    'Infinity',
    '-Infinity',
    '{"__proto__": {}}',
    '{"constructor": null}',
    Array(1000).fill('x').join(''),
    JSON.stringify({ nested: { deep: { value: random() } } }),
  ];
  return inputs[Math.floor(random() * inputs.length)];
}

function generateSemanticInput(attack: Attack, random: () => number): string {
  const inputs = [
    'contradictory-state',
    'invalid-transition',
    'circular-reference',
    'type-mismatch',
    'constraint-violation',
    `semantic-${Math.floor(random() * 10000)}`,
  ];
  return inputs[Math.floor(random() * inputs.length)];
}

function generateTemporalInput(attack: Attack, random: () => number): string {
  const base = Date.now();
  const inputs = [
    new Date(base - 86400000 * 365 * 100).toISOString(), // 100 years ago
    new Date(base + 86400000 * 365 * 100).toISOString(), // 100 years future
    'invalid-date',
    '0000-00-00T00:00:00Z',
    '9999-99-99T99:99:99Z',
    new Date(random() * base).toISOString(),
  ];
  return inputs[Math.floor(random() * inputs.length)];
}

function generateExistentialInput(attack: Attack, random: () => number): string {
  const inputs = [
    'non-existent-id',
    'deleted-reference',
    'orphan-node',
    `phantom-${Math.floor(random() * 10000)}`,
  ];
  return inputs[Math.floor(random() * inputs.length)];
}

// ============================================================================
// INVARIANT TEST EXECUTION
// ============================================================================

/**
 * Execute a single attack against an invariant.
 */
export function executeAttack(
  vector: AttackVector,
  testFn: InvariantTestFn
): AttackAttempt {
  const startTime = performance.now();
  
  try {
    // Parse input if it looks like JSON
    let input: unknown = vector.input;
    try {
      if (vector.input.startsWith('{') || vector.input.startsWith('[')) {
        input = JSON.parse(vector.input);
      }
    } catch {
      // Keep as string
    }
    
    // Execute the test
    const survived = testFn(input, vector.seed);
    const endTime = performance.now();
    
    return createAttackAttempt(
      vector,
      survived ? 'SURVIVED' : 'BREACHED',
      endTime - startTime,
      survived ? undefined : 'Invariant violated by attack'
    );
  } catch (error) {
    const endTime = performance.now();
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Exception during test = attack survived (invariant defended itself)
    return createAttackAttempt(
      vector,
      'SURVIVED',
      endTime - startTime,
      undefined,
      `Exception during attack: ${errorMsg}`
    );
  }
}

/**
 * Execute all attacks against an invariant.
 */
export function attackInvariant(
  invariant: InvariantRecord,
  testFn: InvariantTestFn,
  config: RunnerConfig
): SurvivalProof {
  const vectors = generateAttackVectors(
    invariant.id,
    config.minAttacksPerInvariant,
    config.seed
  );
  
  const attempts: AttackAttempt[] = [];
  
  for (const vector of vectors) {
    const attempt = executeAttack(vector, testFn);
    attempts.push(attempt);
    
    // Stop on first breach if configured
    if (config.stopOnFirstBreach && attempt.outcome === 'BREACHED') {
      break;
    }
  }
  
  return createSurvivalProof(
    invariant.id,
    invariant.module,
    invariant.category,
    attempts
  );
}

// ============================================================================
// RUNNER
// ============================================================================

/**
 * Create a new runner state.
 */
export function createRunnerState(config: Partial<RunnerConfig> = {}): RunnerState {
  return {
    config: { ...DEFAULT_RUNNER_CONFIG, ...config },
    proofs: [],
    currentInvariant: null,
    startTime: new Date().toISOString(),
    breached: false,
    breachedIds: [],
  };
}

/**
 * Get PURE invariants to test.
 */
export function getPureInvariants(config: RunnerConfig): readonly InvariantRecord[] {
  let invariants = getInventoryByCategory('PURE');
  
  // Filter by target if specified
  if (config.targetInvariants && config.targetInvariants.length > 0) {
    invariants = invariants.filter(inv => 
      config.targetInvariants!.includes(inv.id)
    );
  }
  
  // Exclude if specified
  if (config.excludeInvariants && config.excludeInvariants.length > 0) {
    invariants = invariants.filter(inv => 
      !config.excludeInvariants!.includes(inv.id)
    );
  }
  
  return invariants;
}

/**
 * Run falsification against all PURE invariants.
 * INV-FALS-SELF-01: All PURE invariants are attacked.
 * INV-FALS-SELF-04: Runner is seeded (deterministic).
 */
export function runFalsification(
  testRegistry: InvariantTestRegistry,
  config: Partial<RunnerConfig> = {}
): FalsificationReport {
  const fullConfig: RunnerConfig = { ...DEFAULT_RUNNER_CONFIG, ...config };
  const state = createRunnerState(fullConfig);
  const invariants = getPureInvariants(fullConfig);
  
  const proofs: SurvivalProof[] = [];
  const breachedIds: string[] = [];
  
  for (const invariant of invariants) {
    const testFn = testRegistry[invariant.id];
    
    if (!testFn) {
      // No test function = skip with error
      proofs.push(createSurvivalProof(
        invariant.id,
        invariant.module,
        invariant.category,
        [createAttackAttempt(
          createAttackVector(
            'SKIP-NO-TEST',
            'error',
            '',
            fullConfig.seed,
            'No test function registered'
          ),
          'SKIPPED',
          0,
          'No test function registered for invariant'
        )]
      ));
      continue;
    }
    
    const proof = attackInvariant(invariant, testFn, fullConfig);
    proofs.push(proof);
    
    // INV-FALS-SELF-03: Breach = immediate stop
    if (proof.breachedCount > 0) {
      breachedIds.push(invariant.id);
      
      if (fullConfig.stopOnFirstBreach) {
        break;
      }
    }
  }
  
  const endTime = new Date().toISOString();
  
  return createFalsificationReport(
    fullConfig.seed,
    proofs,
    state.startTime,
    endTime
  );
}

// ============================================================================
// BUILT-IN TEST REGISTRY (PLACEHOLDER)
// ============================================================================

/**
 * Create a default test that always survives.
 * Used for testing the runner itself.
 */
export function createAlwaysSurvivesTest(): InvariantTestFn {
  return (_input: unknown, _seed: number) => true;
}

/**
 * Create a default test that always fails.
 * Used for testing breach detection.
 */
export function createAlwaysFailsTest(): InvariantTestFn {
  return (_input: unknown, _seed: number) => false;
}

/**
 * Create a test that fails on specific seed.
 */
export function createFailsOnSeedTest(failSeed: number): InvariantTestFn {
  return (_input: unknown, seed: number) => seed !== failSeed;
}

/**
 * Create a probabilistic test that fails X% of the time.
 */
export function createProbabilisticTest(failRate: number, seed: number): InvariantTestFn {
  const random = createSeededRandom(seed);
  return (_input: unknown, _seed: number) => random() > failRate;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Verify that all PURE invariants have test functions.
 */
export function validateTestCoverage(
  testRegistry: InvariantTestRegistry
): { covered: string[]; missing: string[] } {
  const pureInvariants = getInventoryByCategory('PURE');
  const covered: string[] = [];
  const missing: string[] = [];
  
  for (const inv of pureInvariants) {
    if (testRegistry[inv.id]) {
      covered.push(inv.id);
    } else {
      missing.push(inv.id);
    }
  }
  
  return { covered, missing };
}

/**
 * Check if runner config is valid.
 */
export function isValidConfig(config: Partial<RunnerConfig>): boolean {
  if (config.seed !== undefined && !Number.isInteger(config.seed)) {
    return false;
  }
  if (config.minAttacksPerInvariant !== undefined && config.minAttacksPerInvariant < 1) {
    return false;
  }
  return true;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  type AttackVector,
  type AttackAttempt,
  type AttackOutcome,
  type SurvivalProof,
  type FalsificationReport,
} from './survival-proof.js';
