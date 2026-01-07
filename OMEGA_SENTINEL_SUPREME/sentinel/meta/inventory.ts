/**
 * OMEGA SENTINEL SUPREME — Invariant Inventory
 * Sprint 27.1 — Mechanical Discovery + Classification
 * 
 * INV-INV-01: inventory_ids == discovered_ids (set equality)
 * INV-INV-02: Each record has {id, module, category, criticality, source}
 * INV-INV-03: Missing invariant = build fail
 * INV-INV-04: Canonical ordering (module, then id)
 * INV-INV-05: Category justification (CONTEXTUAL requires BOUND-xxx)
 */

// ============================================================================
// TYPES
// ============================================================================

export type InvariantCategory = 'PURE' | 'SYSTEM' | 'CONTEXTUAL';

export type Criticality = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SourceKind = 'CODE' | 'DOC' | 'TEST';

export interface InvariantSource {
  readonly kind: SourceKind;
  readonly ref: string;
}

export interface InvariantRecord {
  readonly id: string;
  readonly module: string;
  readonly category: InvariantCategory;
  readonly criticality: Criticality;
  readonly source: InvariantSource;
  readonly rationale: string;
}

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

export const INVARIANT_ID_PATTERN = /^INV-[A-Z]+-\d{2}$/;

export function isValidInvariantId(id: string): boolean {
  return INVARIANT_ID_PATTERN.test(id);
}

// ============================================================================
// INVENTORY — CANONICAL ORDER (module, then id)
// ============================================================================

const INVENTORY_RAW: InvariantRecord[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: artifact
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-ART-01',
    module: 'artifact',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/artifact.test.ts' },
    rationale: 'Hash determinism is foundation of integrity chain'
  },
  {
    id: 'INV-ART-02',
    module: 'artifact',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/artifact.test.ts' },
    rationale: 'Immutability prevents tampering after creation'
  },
  {
    id: 'INV-ART-03',
    module: 'artifact',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/artifact.test.ts' },
    rationale: 'Hash-linked chain ensures audit trail integrity'
  },
  {
    id: 'INV-ART-04',
    module: 'artifact',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/artifact.test.ts' },
    rationale: 'Valid references prevent dangling pointers'
  },
  {
    id: 'INV-SER-01',
    module: 'artifact',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/artifact.test.ts' },
    rationale: 'Reversible serialization ensures data preservation'
  },
  {
    id: 'INV-SER-02',
    module: 'artifact',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/artifact.test.ts' },
    rationale: 'Hash must survive serialization round-trip'
  },
  {
    id: 'INV-SER-03',
    module: 'artifact',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/artifact.test.ts' },
    rationale: 'Invalid format rejection prevents corruption'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: axioms
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-AX-01',
    module: 'axioms',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/axioms.test.ts' },
    rationale: 'Rejection consequences define system failure modes'
  },
  {
    id: 'INV-AX-02',
    module: 'axioms',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/axioms.test.ts' },
    rationale: 'Exactly 5 axioms - no more, no less'
  },
  {
    id: 'INV-AX-03',
    module: 'axioms',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/axioms.test.ts' },
    rationale: 'Axiom immutability prevents runtime tampering'
  },
  {
    id: 'INV-AX-04',
    module: 'axioms',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/axioms.test.ts' },
    rationale: 'Dual statement ensures human + machine readability'
  },
  {
    id: 'INV-AX-05',
    module: 'axioms',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/axioms.test.ts' },
    rationale: 'Impact classification guides failure response'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: boundary
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-BND-01',
    module: 'boundary',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/boundary_ledger.test.ts' },
    rationale: 'Ledger exhaustivity defines certification scope'
  },
  {
    id: 'INV-BND-02',
    module: 'boundary',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/boundary_ledger.test.ts' },
    rationale: 'HARD boundaries require explicit justification'
  },
  {
    id: 'INV-BND-03',
    module: 'boundary',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/boundary_ledger.test.ts' },
    rationale: 'Seal reference ensures boundary traceability'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: constants
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-CONST-01',
    module: 'constants',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/constants.test.ts' },
    rationale: 'Frozen constants prevent runtime mutation'
  },
  {
    id: 'INV-CONST-02',
    module: 'constants',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/constants.test.ts' },
    rationale: 'SemVer compliance ensures version comparability'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: containment
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-CONT-01',
    module: 'containment',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/regions.test.ts' },
    rationale: 'Deterministic containment ensures reproducibility'
  },
  {
    id: 'INV-CONT-02',
    module: 'containment',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/regions.test.ts' },
    rationale: 'Unique region mapping prevents ambiguity'
  },
  {
    id: 'INV-CONT-03',
    module: 'containment',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/regions.test.ts' },
    rationale: 'Monotonicity ensures better metrics = better region'
  },
  {
    id: 'INV-CONT-04',
    module: 'containment',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/regions.test.ts' },
    rationale: 'VOID default prevents false positives'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: corpus
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-CORP-01',
    module: 'corpus',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Versioned corpus enables attack evolution tracking'
  },
  {
    id: 'INV-CORP-02',
    module: 'corpus',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Unique attack IDs prevent confusion'
  },
  {
    id: 'INV-CORP-03',
    module: 'corpus',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Single category assignment enables clean metrics'
  },
  {
    id: 'INV-CORP-04',
    module: 'corpus',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Category partition ensures complete coverage'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: coverage
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-COV-01',
    module: 'coverage',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Bounded coverage prevents overflow/underflow'
  },
  {
    id: 'INV-COV-02',
    module: 'coverage',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Deterministic coverage ensures reproducibility'
  },
  {
    id: 'INV-COV-03',
    module: 'coverage',
    category: 'PURE',
    criticality: 'LOW',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Empty set = 0 coverage is logical base case'
  },
  {
    id: 'INV-COV-04',
    module: 'coverage',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Full corpus = 1.0 coverage is logical maximum'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: crystal
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-CRYST-01',
    module: 'crystal',
    category: 'CONTEXTUAL',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'BOUND-005: SHA-256 impl trust required for hash'
  },
  {
    id: 'INV-CRYST-02',
    module: 'crystal',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Computed fields derive from input deterministically'
  },
  {
    id: 'INV-CRYST-03',
    module: 'crystal',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Append-only preserves immutability guarantee'
  },
  {
    id: 'INV-CRYST-04',
    module: 'crystal',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'DOC', ref: 'sentinel/tests/crystal.test.ts:header' },
    rationale: 'Crystallization is idempotent - same input = same output'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: engine
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-ENG-01',
    module: 'engine',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification.test.ts' },
    rationale: 'Survival rate formula is core certification metric'
  },
  {
    id: 'INV-ENG-02',
    module: 'engine',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'DOC', ref: 'sentinel/tests/falsification.test.ts:header' },
    rationale: 'Coverage formula tracks falsification completeness'
  },
  {
    id: 'INV-ENG-03',
    module: 'engine',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'DOC', ref: 'sentinel/tests/falsification.test.ts:header' },
    rationale: 'Determinism ensures reproducible results'
  },
  {
    id: 'INV-ENG-04',
    module: 'engine',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'DOC', ref: 'sentinel/tests/falsification.test.ts:header' },
    rationale: 'Tracker state is isolated per invariant'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: grammar
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-IDL-01',
    module: 'grammar',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Grammar version immutability ensures compatibility'
  },
  {
    id: 'INV-IDL-02',
    module: 'grammar',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Required field validation prevents incomplete data'
  },
  {
    id: 'INV-IDL-03',
    module: 'grammar',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'ID pattern ensures machine parseability'
  },
  {
    id: 'INV-IDL-04',
    module: 'grammar',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'DOC', ref: 'sentinel/tests/crystal.test.ts:header' },
    rationale: 'Valid proof set prevents type confusion'
  },
  {
    id: 'INV-IDL-05',
    module: 'grammar',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'DOC', ref: 'sentinel/tests/crystal.test.ts:header' },
    rationale: 'DAG lineage prevents circular dependencies'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: gravity
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-GRAV-01',
    module: 'gravity',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/gravity.test.ts' },
    rationale: 'Bounded gravity prevents score explosion'
  },
  {
    id: 'INV-GRAV-02',
    module: 'gravity',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/gravity.test.ts' },
    rationale: 'Decay monotonicity models evidence aging'
  },
  {
    id: 'INV-GRAV-03',
    module: 'gravity',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/gravity.test.ts' },
    rationale: 'Confidence monotonicity aligns with intuition'
  },
  {
    id: 'INV-GRAV-04',
    module: 'gravity',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/gravity.test.ts' },
    rationale: 'Computation determinism ensures reproducibility'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: inventory (this sprint)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-INV-01',
    module: 'inventory',
    category: 'SYSTEM',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/inventory.test.ts' },
    rationale: 'Completeness via mechanical discovery equality'
  },
  {
    id: 'INV-INV-02',
    module: 'inventory',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/inventory.test.ts' },
    rationale: 'Minimal record structure ensures consistency'
  },
  {
    id: 'INV-INV-03',
    module: 'inventory',
    category: 'SYSTEM',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/inventory.test.ts' },
    rationale: 'Missing invariant = test failure = no silent gaps'
  },
  {
    id: 'INV-INV-04',
    module: 'inventory',
    category: 'PURE',
    criticality: 'LOW',
    source: { kind: 'TEST', ref: 'sentinel/tests/inventory.test.ts' },
    rationale: 'Canonical order prevents merge conflicts'
  },
  {
    id: 'INV-INV-05',
    module: 'inventory',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/inventory.test.ts' },
    rationale: 'CONTEXTUAL requires BOUND-xxx justification'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: lineage
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-LIN-01',
    module: 'lineage',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'DAG structure prevents infinite loops'
  },
  {
    id: 'INV-LIN-02',
    module: 'lineage',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Generation formula ensures consistent depth'
  },
  {
    id: 'INV-LIN-03',
    module: 'lineage',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Root generation 0 is base case definition'
  },
  {
    id: 'INV-LIN-04',
    module: 'lineage',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'DOC', ref: 'sentinel/tests/crystal.test.ts:header' },
    rationale: 'Lineage graph supports topological traversal'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: negative
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-NEG-01',
    module: 'negative',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/negative.test.ts' },
    rationale: 'Explicit conditions define testable boundaries'
  },
  {
    id: 'INV-NEG-02',
    module: 'negative',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/negative.test.ts' },
    rationale: 'Score determinism ensures reproducibility'
  },
  {
    id: 'INV-NEG-03',
    module: 'negative',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/negative.test.ts' },
    rationale: 'Evidence tracking enables audit trail'
  },
  {
    id: 'INV-NEG-04',
    module: 'negative',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/negative.test.ts' },
    rationale: 'Immutability prevents post-hoc tampering'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: proof
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-PROOF-01',
    module: 'proof',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/proof_strength.test.ts' },
    rationale: 'Total order Ω>Λ>Σ>Δ>Ε enables comparison'
  },
  {
    id: 'INV-PROOF-02',
    module: 'proof',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/proof_strength.test.ts' },
    rationale: 'Explicit criteria prevent subjective classification'
  },
  {
    id: 'INV-PROOF-03',
    module: 'proof',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/proof_strength.test.ts' },
    rationale: 'Comparison determinism ensures consistency'
  },
  {
    id: 'INV-PROOF-04',
    module: 'proof',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/proof_strength.test.ts' },
    rationale: 'Weakest link rule prevents false confidence'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: refusal
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-REF-01',
    module: 'refusal',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/refusal.test.ts' },
    rationale: 'Code+reason enables actionable diagnostics'
  },
  {
    id: 'INV-REF-02',
    module: 'refusal',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/refusal.test.ts' },
    rationale: 'Unique codes prevent confusion in logs'
  },
  {
    id: 'INV-REF-03',
    module: 'refusal',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/refusal.test.ts' },
    rationale: 'Axiom violations must be CRITICAL severity'
  },
  {
    id: 'INV-REF-04',
    module: 'refusal',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/refusal.test.ts' },
    rationale: 'Immutability prevents post-creation tampering'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: regions
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-REG-01',
    module: 'regions',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/regions.test.ts' },
    rationale: 'Total order enables region comparison'
  },
  {
    id: 'INV-REG-02',
    module: 'regions',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/regions.test.ts' },
    rationale: 'Concrete thresholds enable objective classification'
  },
  {
    id: 'INV-REG-03',
    module: 'regions',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/regions.test.ts' },
    rationale: 'TRANSCENDENT requires external certifier (R3)'
  },
  {
    id: 'INV-REG-04',
    module: 'regions',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'DOC', ref: 'sentinel/tests/regions.test.ts:header' },
    rationale: 'Deterministic containment ensures reproducibility'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: self (Sprint 27.2 — Falsification Runner + Sprint 27.3 — Self Seal)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-SEAL-01',
    module: 'self',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/seal.test.ts' },
    rationale: 'sealHash = SHA256(canonicalSerialize(core)) for integrity'
  },
  {
    id: 'INV-SEAL-02',
    module: 'self',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/seal.test.ts' },
    rationale: 'Referenced hashes must exist (ledger, inventory, proofs)'
  },
  {
    id: 'INV-SEAL-03',
    module: 'self',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/seal.test.ts' },
    rationale: 'SEALED ssi all PURE attacked AND survived AND no breach'
  },
  {
    id: 'INV-SEAL-04',
    module: 'self',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/seal.test.ts' },
    rationale: 'At least 1 limitation required (epistemic honesty)'
  },
  {
    id: 'INV-SEAL-05',
    module: 'self',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/seal.test.ts' },
    rationale: 'Each limitation boundaryId must exist in BoundaryLedger'
  },
  {
    id: 'INV-SEAL-06',
    module: 'self',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/seal.test.ts' },
    rationale: 'Seal contains references only, not full copies'
  },
  {
    id: 'INV-SEAL-07',
    module: 'self',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/seal.test.ts' },
    rationale: 'Cross-run determinism: same inputs = same sealHash'
  },
  {
    id: 'INV-SELF-01',
    module: 'self',
    category: 'SYSTEM',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification-runner.test.ts' },
    rationale: 'All PURE invariants attacked via inventory query'
  },
  {
    id: 'INV-SELF-02',
    module: 'self',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification-runner.test.ts' },
    rationale: 'Survival proof has hash + attempt count + outcome'
  },
  {
    id: 'INV-SELF-03',
    module: 'self',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification-runner.test.ts' },
    rationale: 'Breach detection triggers immediate stop'
  },
  {
    id: 'INV-SELF-04',
    module: 'self',
    category: 'PURE',
    criticality: 'CRITICAL',
    source: { kind: 'TEST', ref: 'sentinel/tests/falsification-runner.test.ts' },
    rationale: 'Seeded random ensures reproducible attack sequences'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE: validator
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INV-VAL-01',
    module: 'validator',
    category: 'PURE',
    criticality: 'HIGH',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Required fields prevent incomplete invariants'
  },
  {
    id: 'INV-VAL-02',
    module: 'validator',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'TEST', ref: 'sentinel/tests/crystal.test.ts' },
    rationale: 'Pattern validation ensures format compliance'
  },
  {
    id: 'INV-VAL-03',
    module: 'validator',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'DOC', ref: 'sentinel/tests/crystal.test.ts:header' },
    rationale: 'Type validation ensures correct data types'
  },
  {
    id: 'INV-VAL-04',
    module: 'validator',
    category: 'PURE',
    criticality: 'MEDIUM',
    source: { kind: 'DOC', ref: 'sentinel/tests/crystal.test.ts:header' },
    rationale: 'Range validation ensures bounded values'
  },
  {
    id: 'INV-VAL-05',
    module: 'validator',
    category: 'PURE',
    criticality: 'LOW',
    source: { kind: 'DOC', ref: 'sentinel/tests/crystal.test.ts:header' },
    rationale: 'Validation result includes all errors found'
  },
];

// ============================================================================
// FREEZE & EXPORT
// ============================================================================

// Deep freeze all records
INVENTORY_RAW.forEach(record => {
  Object.freeze(record.source);
  Object.freeze(record);
});

export const INVENTORY: readonly InvariantRecord[] = Object.freeze(INVENTORY_RAW);

// ============================================================================
// COMPUTED CONSTANTS
// ============================================================================

export const INVENTORY_COUNT = INVENTORY.length;

export const EXPECTED_MODULES = Object.freeze([
  'artifact',
  'axioms',
  'boundary',
  'constants',
  'containment',
  'corpus',
  'coverage',
  'crystal',
  'engine',
  'grammar',
  'gravity',
  'inventory',
  'lineage',
  'negative',
  'proof',
  'refusal',
  'regions',
  'self',
  'validator',
] as const);

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

export function getInventoryIds(): readonly string[] {
  return INVENTORY.map(r => r.id);
}

export function getInventoryByModule(module: string): readonly InvariantRecord[] {
  return INVENTORY.filter(r => r.module === module);
}

export function getInventoryByCategory(category: InvariantCategory): readonly InvariantRecord[] {
  return INVENTORY.filter(r => r.category === category);
}

export function getInventoryByCriticality(criticality: Criticality): readonly InvariantRecord[] {
  return INVENTORY.filter(r => r.criticality === criticality);
}

export function getInventoryRecord(id: string): InvariantRecord | undefined {
  return INVENTORY.find(r => r.id === id);
}

export function hasInventoryRecord(id: string): boolean {
  return INVENTORY.some(r => r.id === id);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface InventoryValidationResult {
  valid: boolean;
  errors: string[];
  stats: {
    total: number;
    byCategory: Record<InvariantCategory, number>;
    byCriticality: Record<Criticality, number>;
    byModule: Record<string, number>;
  };
}

export function validateInventory(): InventoryValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  
  // Check duplicates and format
  for (const record of INVENTORY) {
    if (ids.has(record.id)) {
      errors.push(`Duplicate ID: ${record.id}`);
    }
    ids.add(record.id);
    
    if (!isValidInvariantId(record.id)) {
      errors.push(`Invalid ID format: ${record.id}`);
    }
    
    if (!record.module || record.module.trim() === '') {
      errors.push(`Missing module for: ${record.id}`);
    }
    
    if (!record.rationale || record.rationale.trim() === '') {
      errors.push(`Missing rationale for: ${record.id}`);
    }
    
    // INV-INV-05: CONTEXTUAL requires BOUND-xxx
    if (record.category === 'CONTEXTUAL' && !/BOUND-\d{3}/.test(record.rationale)) {
      errors.push(`CONTEXTUAL ${record.id} must reference BOUND-xxx in rationale`);
    }
    
    // Rationale length check (non-CONTEXTUAL)
    if (record.category !== 'CONTEXTUAL' && record.rationale.length > 120) {
      errors.push(`Rationale too long for ${record.id}: ${record.rationale.length} chars (max 120)`);
    }
  }
  
  // Check canonical ordering (module, then id)
  for (let i = 1; i < INVENTORY.length; i++) {
    const prev = INVENTORY[i - 1];
    const curr = INVENTORY[i];
    if (prev.module > curr.module || 
        (prev.module === curr.module && prev.id > curr.id)) {
      errors.push(`Not canonical order: ${prev.id} before ${curr.id}`);
    }
  }
  
  // Compute stats
  const byCategory: Record<InvariantCategory, number> = { PURE: 0, SYSTEM: 0, CONTEXTUAL: 0 };
  const byCriticality: Record<Criticality, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byModule: Record<string, number> = {};
  
  for (const record of INVENTORY) {
    byCategory[record.category]++;
    byCriticality[record.criticality]++;
    byModule[record.module] = (byModule[record.module] || 0) + 1;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    stats: {
      total: INVENTORY.length,
      byCategory,
      byCriticality,
      byModule,
    },
  };
}

// ============================================================================
// DISCOVERY SUPPORT
// ============================================================================

/**
 * Pattern to discover invariants in source files.
 * Used by tests to verify completeness.
 */
export const DISCOVERY_PATTERN = /INV-[A-Z]+-\d{2}/g;

/**
 * IDs to exclude from discovery (test examples, placeholders).
 * These appear in code but are not real invariants.
 */
export const DISCOVERY_EXCLUSIONS = Object.freeze([
  // Test examples / wrong format
  'INV-A-1',           // Example in test
  'INV-AUTH-00',       // Test placeholder (wrong format)
  'INV-AUTH-001',      // Placeholder
  'INV-CHILD-01',      // Lineage test example
  'INV-CHILD-02',      // Lineage test example
  'INV-CONST-12',      // Typo/example
  'INV-FAKE-01',       // Mock breached ID in seal tests
  'INV-FAKE-99',       // Test negative case (wrong format)
  'INV-NONEXISTENT-01', // Test negative case
  'INV-ORPHAN-01',     // Test example
  'INV-OTHER-00',      // Test placeholder (wrong format)
  'INV-OTHER-001',     // Placeholder
  'INV-PROOF-00',      // Test example (wrong format)
  'INV-PROOF-0001',    // Wrong format example
  'INV-PROOF-001',     // Wrong format example
  'INV-ROOT-01',       // Lineage test example
  'INV-ROOT-02',       // Lineage test example
  'INV-TEST-00',       // Test placeholder (wrong format)
  'INV-TEST-001',      // Test placeholder
  'INV-TEST-002',      // Test placeholder
  'INV-TEST-01',       // Test placeholder
  'INV-TEST-02',       // Test placeholder
  'INV-UNKNOWN-99',    // Test negative case
  
  // Future sprint invariants (not yet implemented)
  'INV-META-01',       // Future sprint
  'INV-META-02',       // Future sprint
  'INV-META-03',       // Future sprint (orphan Windows)
  'INV-META-04',       // Future sprint
  'INV-META-05',       // Future sprint (orphan Windows)
  'INV-META-06',       // Future sprint (orphan Windows)
  'INV-META-07',       // Future sprint (orphan Windows)
  'INV-META-08',       // Future sprint
  'INV-META-09',       // Future sprint (orphan Windows)
  'INV-META-10',       // Future sprint (orphan Windows)
  'INV-CAN-01',        // Future canonical module (orphan Windows)
  'INV-CAN-02',        // Future canonical module (orphan Windows)
]);

/**
 * Check if an ID should be excluded from discovery.
 */
export function isExcludedFromDiscovery(id: string): boolean {
  return DISCOVERY_EXCLUSIONS.includes(id);
}
