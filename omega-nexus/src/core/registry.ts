/**
 * OMEGA NEXUS - Invariant Registry
 * 
 * Phase 24
 * 
 * Complete catalog of all OMEGA invariants across all modules.
 * This is the authoritative source for invariant definitions.
 */

import {
  Invariant,
  InvariantId,
  InvariantRegistry,
  InvariantCategory,
  InvariantSeverity,
  ProofStatus,
  OmegaModule,
  invariantId,
  testId,
  confidenceLevel,
} from './types.js';
import { hashInvariant } from './crypto.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an invariant definition
 */
function defineInvariant(
  id: string,
  name: string,
  description: string,
  module: OmegaModule,
  category: InvariantCategory,
  severity: InvariantSeverity,
  status: ProofStatus,
  formula?: string,
  testIds: string[] = [],
  confidence: number = 1.0
): Invariant {
  const inv = {
    id: invariantId(id),
    name,
    description,
    module,
    category,
    severity,
    formula,
    status,
    testIds: testIds.map(t => testId(t)),
    confidence: confidenceLevel(confidence),
  };
  
  return {
    ...inv,
    hash: hashInvariant({
      id: inv.id,
      name: inv.name,
      module: inv.module,
      category: inv.category,
      severity: inv.severity,
      status: inv.status,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONICLE INVARIANTS (Phase 9-12)
// ═══════════════════════════════════════════════════════════════════════════════

const CHRONICLE_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-CHRON-01',
    'Append-Only Log',
    'Chronicle entries can only be appended, never modified or deleted',
    OmegaModule.CHRONICLE,
    InvariantCategory.IMMUTABILITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '□(written(e) → □¬modified(e))'
  ),
  defineInvariant(
    'INV-CHRON-02',
    'Total Order',
    'All chronicle entries have a strict total ordering',
    OmegaModule.CHRONICLE,
    InvariantCategory.CAUSALITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀e1,e2: e1 < e2 ∨ e2 < e1 ∨ e1 = e2'
  ),
  defineInvariant(
    'INV-CHRON-03',
    'Hash Chain Integrity',
    'Each entry hash includes previous entry hash',
    OmegaModule.CHRONICLE,
    InvariantCategory.INTEGRITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    'hash(e_n) = H(e_n.data || hash(e_{n-1}))'
  ),
  defineInvariant(
    'INV-CHRON-04',
    'Monotonic Sequence',
    'Entry sequence numbers are strictly increasing',
    OmegaModule.CHRONICLE,
    InvariantCategory.CAUSALITY,
    InvariantSeverity.HIGH,
    ProofStatus.PROVEN,
    '∀e_i,e_j: i < j → seq(e_i) < seq(e_j)'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE INVARIANTS (Phase 13-15)
// ═══════════════════════════════════════════════════════════════════════════════

const ENVELOPE_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-ENV-01',
    'Schema Validation',
    'All envelopes must conform to schema',
    OmegaModule.ENVELOPE,
    InvariantCategory.SOUNDNESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀e: valid(e) ↔ schema(e)'
  ),
  defineInvariant(
    'INV-ENV-02',
    'Hash Binding',
    'Envelope hash uniquely binds content',
    OmegaModule.ENVELOPE,
    InvariantCategory.INTEGRITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀e1,e2: hash(e1) = hash(e2) → content(e1) = content(e2)'
  ),
  defineInvariant(
    'INV-ENV-03',
    'Timestamp Validity',
    'Envelope timestamps are within acceptable bounds',
    OmegaModule.ENVELOPE,
    InvariantCategory.SAFETY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '|timestamp(e) - now| < TTL'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY INVARIANTS (Phase 16-17)
// ═══════════════════════════════════════════════════════════════════════════════

const POLICY_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-POL-01',
    'Policy Completeness',
    'Every request has a policy decision',
    OmegaModule.POLICY,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀r: decide(r) ∈ {ALLOW, DENY}'
  ),
  defineInvariant(
    'INV-POL-02',
    'Policy Determinism',
    'Same request always yields same decision',
    OmegaModule.POLICY,
    InvariantCategory.DETERMINISM,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀r,t1,t2: decide(r,t1) = decide(r,t2)'
  ),
  defineInvariant(
    'INV-POL-03',
    'Deny by Default',
    'Requests without matching rules are denied',
    OmegaModule.POLICY,
    InvariantCategory.ACCESS_CONTROL,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '¬∃rule(r) → decide(r) = DENY'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY INVARIANTS (Phase 18-19)
// ═══════════════════════════════════════════════════════════════════════════════

const MEMORY_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-MEM-01',
    'Read Consistency',
    'Reads return the last written value',
    OmegaModule.MEMORY,
    InvariantCategory.SOUNDNESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    'read(k) = last_write(k)'
  ),
  defineInvariant(
    'INV-MEM-02',
    'Write Durability',
    'Writes persist across restarts',
    OmegaModule.MEMORY,
    InvariantCategory.INTEGRITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.VERIFIED,
    '□(write(k,v) → ◇□(read(k) = v))'
  ),
  defineInvariant(
    'INV-MEM-03',
    'Bounded Memory',
    'Memory usage stays within limits',
    OmegaModule.MEMORY,
    InvariantCategory.MEMORY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '□(memory_used < MAX_MEMORY)'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY GUARD INVARIANTS (Phase 20-21)
// ═══════════════════════════════════════════════════════════════════════════════

const REPLAY_GUARD_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-REPLAY-01',
    'Duplicate Detection',
    'Duplicate requests are detected and rejected',
    OmegaModule.REPLAY_GUARD,
    InvariantCategory.REPLAY_PROTECTION,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀r: seen(r) → reject(r)'
  ),
  defineInvariant(
    'INV-REPLAY-02',
    'Nonce Uniqueness',
    'Each nonce is used exactly once',
    OmegaModule.REPLAY_GUARD,
    InvariantCategory.INTEGRITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀n: count(n) ≤ 1'
  ),
  defineInvariant(
    'INV-REPLAY-03',
    'Window Expiration',
    'Old nonces are eventually pruned',
    OmegaModule.REPLAY_GUARD,
    InvariantCategory.MEMORY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '□(age(n) > TTL → ◇¬stored(n))'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// WIRING INVARIANTS (Phase 22)
// ═══════════════════════════════════════════════════════════════════════════════

const WIRING_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-WIRE-01',
    'Handler Execution',
    'Valid requests reach handlers',
    OmegaModule.WIRING,
    InvariantCategory.LIVENESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '□(valid(r) ∧ allowed(r) → ◇handled(r))'
  ),
  defineInvariant(
    'INV-WIRE-02',
    'Gate Sequencing',
    'Gates execute in correct order',
    OmegaModule.WIRING,
    InvariantCategory.CAUSALITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    'truth_gate < emotion_gate < canon_gate'
  ),
  defineInvariant(
    'INV-WIRE-03',
    'Circuit Breaker Safety',
    'Circuit breaker prevents cascade failures',
    OmegaModule.WIRING,
    InvariantCategory.SAFETY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '□(failures > threshold → circuit_open)'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS INVARIANTS (Phase 23.0)
// ═══════════════════════════════════════════════════════════════════════════════

const CHAOS_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-CHAOS-01',
    'Algebraic Closure',
    'Perturbation composition is closed',
    OmegaModule.CHAOS,
    InvariantCategory.CLOSURE,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀p1,p2 ∈ P: compose(p1,p2) ∈ P'
  ),
  defineInvariant(
    'INV-CHAOS-02',
    'Effect Boundedness',
    'Perturbation effects are bounded',
    OmegaModule.CHAOS,
    InvariantCategory.BOUNDEDNESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀p ∈ P: ||effect(p)|| ≤ K'
  ),
  defineInvariant(
    'INV-CHAOS-03',
    'Perturbation Determinism',
    'Same seed produces same perturbation',
    OmegaModule.CHAOS,
    InvariantCategory.DETERMINISM,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀s: perturb(s,t1) = perturb(s,t2)'
  ),
  defineInvariant(
    'INV-CHAOS-04',
    'Module Isolation',
    'Perturbations are isolated to target module',
    OmegaModule.CHAOS,
    InvariantCategory.ISOLATION,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    'effect(p,A) ∩ state(B) = ∅'
  ),
  defineInvariant(
    'INV-CHAOS-05',
    'System Recovery',
    'System eventually recovers from perturbations',
    OmegaModule.CHAOS,
    InvariantCategory.RECOVERY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '∀p: ◇(system = nominal)'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// ADVERSARIAL INVARIANTS (Phase 23.1)
// ═══════════════════════════════════════════════════════════════════════════════

const ADVERSARIAL_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-ADV-01',
    'Attack Coverage',
    'Grammar covers 100% of known attack surface',
    OmegaModule.ADVERSARIAL,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀a ∈ KnownAttacks: a ∈ Grammar'
  ),
  defineInvariant(
    'INV-ADV-02',
    'Grammar Completeness',
    'Attacks outside grammar are impossible',
    OmegaModule.ADVERSARIAL,
    InvariantCategory.SOUNDNESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀a ∉ Grammar: ¬possible(a)'
  ),
  defineInvariant(
    'INV-ADV-03',
    'Response Classification',
    'Every attack has a defined response',
    OmegaModule.ADVERSARIAL,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀a: response(a) ∈ {REJECT, ABSORB}'
  ),
  defineInvariant(
    'INV-ADV-04',
    'State Preservation',
    'Rejected attacks preserve system state',
    OmegaModule.ADVERSARIAL,
    InvariantCategory.SAFETY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    'reject(a) → state\' = state'
  ),
  defineInvariant(
    'INV-ADV-05',
    'Severity Classification',
    'Every attack has defined severity',
    OmegaModule.ADVERSARIAL,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.MEDIUM,
    ProofStatus.PROVEN,
    '∀a: severity(a) ∈ {CRITICAL,HIGH,MEDIUM,LOW}'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL INVARIANTS (Phase 23.2)
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPORAL_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-TEMP-01',
    'Input-Output Safety',
    'Valid inputs produce valid outputs',
    OmegaModule.TEMPORAL,
    InvariantCategory.SAFETY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '□(valid_input → valid_output)'
  ),
  defineInvariant(
    'INV-TEMP-02',
    'Request-Response Liveness',
    'Every request eventually gets a response',
    OmegaModule.TEMPORAL,
    InvariantCategory.LIVENESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '□(request → ◇response)'
  ),
  defineInvariant(
    'INV-TEMP-03',
    'Handler Fairness',
    'Handlers are executed infinitely often',
    OmegaModule.TEMPORAL,
    InvariantCategory.FAIRNESS,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '□◇handler_executed'
  ),
  defineInvariant(
    'INV-TEMP-04',
    'Chronicle Causality',
    'Chronicle maintains causal order',
    OmegaModule.TEMPORAL,
    InvariantCategory.CAUSALITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '□chronicle_ordered'
  ),
  defineInvariant(
    'INV-TEMP-05',
    'Circuit Recovery',
    'Open circuit eventually transitions to half-open',
    OmegaModule.TEMPORAL,
    InvariantCategory.RECOVERY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '□(circuit_open → ◇circuit_half_open)'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS INVARIANTS (Phase 23.3)
// ═══════════════════════════════════════════════════════════════════════════════

const STRESS_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-STRESS-01',
    'Hash Stability',
    'Same seed produces same hash across runs',
    OmegaModule.STRESS,
    InvariantCategory.DETERMINISM,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀s,n: hash(run(s,n)) = hash(run(s,n))'
  ),
  defineInvariant(
    'INV-STRESS-02',
    'Latency Bound',
    'P99 latency under 100ms',
    OmegaModule.STRESS,
    InvariantCategory.LATENCY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    'P99(latency) < 100ms'
  ),
  defineInvariant(
    'INV-STRESS-03',
    'Memory Bound',
    'Heap stays under 512MB',
    OmegaModule.STRESS,
    InvariantCategory.MEMORY,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    'heap_used < 512MB'
  ),
  defineInvariant(
    'INV-STRESS-04',
    'Throughput Minimum',
    'Throughput exceeds 1000 RPS',
    OmegaModule.STRESS,
    InvariantCategory.THROUGHPUT,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    'throughput > 1000 RPS'
  ),
  defineInvariant(
    'INV-STRESS-05',
    'Zero Drift',
    'No variance in hash across identical runs',
    OmegaModule.STRESS,
    InvariantCategory.DETERMINISM,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    'variance(hash) = 0'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTAL INVARIANTS (Phase 23.4)
// ═══════════════════════════════════════════════════════════════════════════════

const CRYSTAL_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-CRYSTAL-01',
    'Proof Completeness',
    'Crystal covers 100% of attack surface',
    OmegaModule.CRYSTAL,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀attack: ∃proof(attack) ∈ Crystal'
  ),
  defineInvariant(
    'INV-CRYSTAL-02',
    'Proof Soundness',
    'All proofs are mathematically valid',
    OmegaModule.CRYSTAL,
    InvariantCategory.SOUNDNESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀proof ∈ Crystal: valid(proof)'
  ),
  defineInvariant(
    'INV-CRYSTAL-03',
    'Crystal Immutability',
    'Sealed crystal hash never changes',
    OmegaModule.CRYSTAL,
    InvariantCategory.IMMUTABILITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '□(sealed(c) → □(hash(c) = h))'
  ),
  defineInvariant(
    'INV-CRYSTAL-04',
    'Coverage Matrix',
    'Full cross-product coverage',
    OmegaModule.CRYSTAL,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    'chaos × adversarial × temporal = complete'
  ),
  defineInvariant(
    'INV-CRYSTAL-05',
    'Reproducibility',
    'Same inputs produce same crystal',
    OmegaModule.CRYSTAL,
    InvariantCategory.REPRODUCIBILITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    '∀i: crystal(i) = crystal(i)'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS INVARIANTS (Phase 24)
// ═══════════════════════════════════════════════════════════════════════════════

const NEXUS_INVARIANTS: Invariant[] = [
  defineInvariant(
    'INV-NEXUS-01',
    'Module Integration',
    'All modules correctly integrated',
    OmegaModule.NEXUS,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.VERIFIED,
    '∀m ∈ Modules: integrated(m)'
  ),
  defineInvariant(
    'INV-NEXUS-02',
    'Certification Consistency',
    'Certification reflects actual state',
    OmegaModule.CERTIFICATION,
    InvariantCategory.SOUNDNESS,
    InvariantSeverity.CRITICAL,
    ProofStatus.VERIFIED,
    'cert(m) ↔ tests_pass(m) ∧ invariants_hold(m)'
  ),
  defineInvariant(
    'INV-NEXUS-03',
    'Observatory Accuracy',
    'Metrics reflect actual system state',
    OmegaModule.OBSERVATORY,
    InvariantCategory.SOUNDNESS,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '∀metric: observed(metric) = actual(metric)'
  ),
  defineInvariant(
    'INV-NEXUS-04',
    'Merkle Integrity',
    'Merkle tree correctly computed',
    OmegaModule.NEXUS,
    InvariantCategory.INTEGRITY,
    InvariantSeverity.CRITICAL,
    ProofStatus.PROVEN,
    'verify_merkle(root, proofs) = true'
  ),
  defineInvariant(
    'INV-NEXUS-05',
    'Audit Trail',
    'Complete audit trail maintained',
    OmegaModule.NEXUS,
    InvariantCategory.COMPLETENESS,
    InvariantSeverity.HIGH,
    ProofStatus.VERIFIED,
    '∀action: ∃log(action)'
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All invariants combined
 */
const ALL_INVARIANTS: Invariant[] = [
  ...CHRONICLE_INVARIANTS,
  ...ENVELOPE_INVARIANTS,
  ...POLICY_INVARIANTS,
  ...MEMORY_INVARIANTS,
  ...REPLAY_GUARD_INVARIANTS,
  ...WIRING_INVARIANTS,
  ...CHAOS_INVARIANTS,
  ...ADVERSARIAL_INVARIANTS,
  ...TEMPORAL_INVARIANTS,
  ...STRESS_INVARIANTS,
  ...CRYSTAL_INVARIANTS,
  ...NEXUS_INVARIANTS,
];

/**
 * Build the invariant registry
 */
export function buildInvariantRegistry(): InvariantRegistry {
  const invariants = new Map<InvariantId, Invariant>();
  const byModule = new Map<OmegaModule, InvariantId[]>();
  const byCategory = new Map<InvariantCategory, InvariantId[]>();
  const bySeverity = new Map<InvariantSeverity, InvariantId[]>();
  const critical: InvariantId[] = [];

  for (const inv of ALL_INVARIANTS) {
    invariants.set(inv.id, inv);

    // By module
    if (!byModule.has(inv.module)) {
      byModule.set(inv.module, []);
    }
    byModule.get(inv.module)!.push(inv.id);

    // By category
    if (!byCategory.has(inv.category)) {
      byCategory.set(inv.category, []);
    }
    byCategory.get(inv.category)!.push(inv.id);

    // By severity
    if (!bySeverity.has(inv.severity)) {
      bySeverity.set(inv.severity, []);
    }
    bySeverity.get(inv.severity)!.push(inv.id);

    // Critical
    if (inv.severity === InvariantSeverity.CRITICAL) {
      critical.push(inv.id);
    }
  }

  return {
    invariants,
    byModule,
    byCategory,
    bySeverity,
    critical,
  };
}

/**
 * Get invariant by ID
 */
export function getInvariant(registry: InvariantRegistry, id: InvariantId): Invariant | undefined {
  return registry.invariants.get(id);
}

/**
 * Get all invariants for a module
 */
export function getModuleInvariants(registry: InvariantRegistry, module: OmegaModule): Invariant[] {
  const ids = registry.byModule.get(module) ?? [];
  return ids.map(id => registry.invariants.get(id)!).filter(Boolean);
}

/**
 * Get all critical invariants
 */
export function getCriticalInvariants(registry: InvariantRegistry): Invariant[] {
  return registry.critical.map(id => registry.invariants.get(id)!).filter(Boolean);
}

/**
 * Count invariants by status
 */
export function countByStatus(registry: InvariantRegistry): Record<ProofStatus, number> {
  const counts: Record<ProofStatus, number> = {
    [ProofStatus.PROVEN]: 0,
    [ProofStatus.VERIFIED]: 0,
    [ProofStatus.PARTIAL]: 0,
    [ProofStatus.PENDING]: 0,
    [ProofStatus.FAILED]: 0,
  };

  for (const inv of registry.invariants.values()) {
    counts[inv.status]++;
  }

  return counts;
}

/**
 * Get registry statistics
 */
export function getRegistryStats(registry: InvariantRegistry) {
  const total = registry.invariants.size;
  const byStatus = countByStatus(registry);
  const proven = byStatus[ProofStatus.PROVEN];
  const verified = proven + byStatus[ProofStatus.VERIFIED];
  const critical = registry.critical.length;
  const criticalProven = registry.critical.filter(
    id => registry.invariants.get(id)?.status === ProofStatus.PROVEN
  ).length;

  return {
    total,
    proven,
    verified,
    pending: byStatus[ProofStatus.PENDING],
    failed: byStatus[ProofStatus.FAILED],
    critical,
    criticalProven,
    provenPercent: (proven / total) * 100,
    verifiedPercent: (verified / total) * 100,
    criticalPercent: (criticalProven / critical) * 100,
  };
}

// Export singleton registry
export const INVARIANT_REGISTRY = buildInvariantRegistry();
export { ALL_INVARIANTS };
