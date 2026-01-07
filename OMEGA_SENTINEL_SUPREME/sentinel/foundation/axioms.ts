/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FOUNDATIONAL AXIOMS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module foundation/axioms
 * @version 3.26.0
 * @license MIT
 * 
 * BOOTSTRAP AXIOMATIQUE EXPLICITE
 * ================================
 * 
 * Ces axiomes sont DÉCLARÉS, pas prouvés.
 * Leur rejet invalide le système — et c'est EXPLICITE.
 * 
 * "Un système qui déclare ses axiomes ne peut être accusé de circularité."
 * 
 * INVARIANTS:
 * - INV-AX-01: All axioms have explicit rejection consequences
 * - INV-AX-02: Axiom set is complete and minimal (5 axioms)
 * - INV-AX-03: Axioms are immutable once declared
 * - INV-AX-04: Each axiom has formal and natural language statements
 * - INV-AX-05: Rejection impact is categorized (TOTAL/PARTIAL)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  AXIOM_IDS, 
  type AxiomId,
  PROOF_STRENGTH_WEIGHTS 
} from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Impact level if an axiom is rejected
 * - TOTAL: Entire certification system becomes invalid
 * - PARTIAL: Specific features become invalid, core survives
 */
export type RejectionImpact = 'TOTAL' | 'PARTIAL';

/**
 * An axiom is a foundational statement that is DECLARED, not proven.
 * It forms the bedrock upon which all proofs are built.
 */
export interface Axiom {
  /** Unique identifier (AX-Ω, AX-Λ, etc.) */
  readonly id: AxiomId;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Natural language statement */
  readonly statement: string;
  
  /** Formal logical statement */
  readonly formal: string;
  
  /** Philosophical/practical justification (not a proof) */
  readonly justification: string;
  
  /** What happens if this axiom is rejected */
  readonly ifRejected: string;
  
  /** Impact level of rejection */
  readonly rejectionImpact: RejectionImpact;
  
  /** Which system features depend on this axiom */
  readonly dependentFeatures: readonly string[];
}

/**
 * Complete axiom registry
 */
export interface AxiomRegistry {
  readonly version: string;
  readonly axioms: ReadonlyMap<AxiomId, Axiom>;
  readonly declaredAt: string;
}

/**
 * Result of validating axioms
 */
export interface AxiomValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly axiomCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIOM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AX-Ω — AXIOME DE FALSIFIABILITÉ (Popper Computationnel)
 * 
 * "Un système est certifiable ssi il existe une méthode pour le falsifier"
 * 
 * This is the CORE axiom. Without it, certification becomes opinion.
 */
const AXIOM_OMEGA: Axiom = Object.freeze({
  id: 'AX-Ω',
  name: 'Falsifiability Axiom',
  
  statement: 
    'A system is certifiable if and only if there exists a method to falsify it. ' +
    'Certification is the documented failure to falsify despite sincere attempts.',
  
  formal: 
    '∀S: certifiable(S) ⟺ ∃M: falsification_method(M, S) ∧ ' +
    'certification(S) ≡ ¬∃attack ∈ executed(M): success(attack)',
  
  justification:
    'Karl Popper\'s falsifiability principle adapted to software certification. ' +
    'A claim that cannot be tested for falsehood cannot be proven true. ' +
    'We don\'t prove systems work; we fail to prove they don\'t work.',
  
  ifRejected:
    'Certification becomes mere opinion without objective foundation. ' +
    'Any system could claim certification without testable criteria. ' +
    'The entire verification framework collapses into subjectivity.',
  
  rejectionImpact: 'TOTAL',
  
  dependentFeatures: Object.freeze([
    'Falsification Engine',
    'Adversarial Verification',
    'Survival Certification',
    'Attack Coverage Metrics',
    'UNFALSIFIED Verdict'
  ])
});

/**
 * AX-Λ — AXIOME DE DÉTERMINISME
 * 
 * "Même entrée + même environnement = même sortie"
 * 
 * Without this, reproducibility is impossible.
 */
const AXIOM_LAMBDA: Axiom = Object.freeze({
  id: 'AX-Λ',
  name: 'Determinism Axiom',
  
  statement:
    'Given identical inputs and identical environment state, ' +
    'a deterministic computation always produces identical outputs. ' +
    'All SENTINEL operations must be deterministic.',
  
  formal:
    '∀(x, env, f): deterministic(f) → f(x, env) ≡ f(x, env)',
  
  justification:
    'Reproducibility is the foundation of scientific verification. ' +
    'A certification that cannot be reproduced by an independent party ' +
    'has no credibility. Determinism ensures that proofs are verifiable.',
  
  ifRejected:
    'No certification can be independently verified. ' +
    'Different verifiers could reach different conclusions for the same system. ' +
    'Audit trails become meaningless as results cannot be reproduced.',
  
  rejectionImpact: 'TOTAL',
  
  dependentFeatures: Object.freeze([
    'Hash Verification',
    'Proof Reproducibility',
    'Certificate Verification',
    'Corpus Execution',
    'IDL Parsing'
  ])
});

/**
 * AX-Σ — AXIOME D'ESPACE D'ATTAQUE BORNÉ
 * 
 * CORRECTION R1 INTÉGRÉE:
 * L'espace d'attaque est fini OU bornable par approximation mesurable.
 * 
 * This allows coverage metrics to be meaningful.
 */
const AXIOM_SIGMA: Axiom = Object.freeze({
  id: 'AX-Σ',
  name: 'Bounded Attack Space Axiom',
  
  statement:
    'The attack space of a finite system is either finite or boundable ' +
    'by measurable approximation sufficient to define meaningful coverage. ' +
    'For continuous or parametric inputs, a discretization with known ' +
    'approximation bounds is acceptable.',
  
  formal:
    '∀S: finite(S) → (|AttackSpace(S)| < ∞ ∨ ' +
    '∃approx: measurable(approx) ∧ coverage(approx, AttackSpace(S)) ∈ [0,1])',
  
  justification:
    'To measure coverage of an attack space, the space must be enumerable ' +
    'or approximable. Infinite, unbounded spaces make coverage meaningless. ' +
    'Practical systems have finite code, finite states, and thus their ' +
    'attack surfaces can be characterized even if not fully enumerated. ' +
    'For continuous inputs (time, real numbers), standard discretization ' +
    'techniques (boundary analysis, equivalence partitioning) provide ' +
    'measurable approximations with known precision.',
  
  ifRejected:
    'Falsification coverage becomes undefined. ' +
    'Claims of "X% attack space covered" are meaningless. ' +
    'Adversarial verification loses quantitative foundation.',
  
  rejectionImpact: 'PARTIAL',
  
  dependentFeatures: Object.freeze([
    'Coverage Metrics',
    'Corpus Completeness',
    'Attack Space Enumeration',
    'Statistical Sampling Bounds'
  ])
});

/**
 * AX-Δ — AXIOME D'INTÉGRITÉ CRYPTOGRAPHIQUE
 * 
 * "SHA-256 est résistant aux collisions"
 * 
 * This is a consensus axiom, not a mathematical proof.
 */
const AXIOM_DELTA: Axiom = Object.freeze({
  id: 'AX-Δ',
  name: 'Cryptographic Integrity Axiom',
  
  statement:
    'SHA-256 is collision-resistant with probability bound P(collision) < 2⁻²⁵⁶. ' +
    'Hash equality implies content equality for all practical purposes.',
  
  formal:
    'P(∃x,y: x ≠ y ∧ SHA256(x) = SHA256(y)) < 2⁻²⁵⁶ ≈ 0',
  
  justification:
    'Global cryptographic consensus. SHA-256 has been analyzed by thousands ' +
    'of cryptographers worldwide. No collision has ever been found. ' +
    'It underpins Bitcoin, TLS, and critical infrastructure. ' +
    'If SHA-256 were broken, far larger problems than SENTINEL would emerge.',
  
  ifRejected:
    'All hash-based integrity proofs become invalid. ' +
    'Certificates can be forged. Evidence chains are unreliable. ' +
    'The entire cryptographic foundation of SENTINEL collapses.',
  
  rejectionImpact: 'TOTAL',
  
  dependentFeatures: Object.freeze([
    'Certificate Signing',
    'Evidence Hashing',
    'IDL Hash Verification',
    'Corpus Integrity',
    'Merkle Proofs'
  ])
});

/**
 * AX-Ε — AXIOME DE FORCE DES IMPOSSIBILITÉS
 * 
 * "Prouver qu'un comportement est impossible est plus fort que prouver qu'il fonctionne"
 * 
 * This justifies the Negative Space pillar.
 */
const AXIOM_EPSILON: Axiom = Object.freeze({
  id: 'AX-Ε',
  name: 'Impossibility Strength Axiom',
  
  statement:
    'Proving that a behavior is impossible provides stronger assurance ' +
    'than proving that desired behavior occurs in tested cases. ' +
    'A single counterexample destroys a positive proof; ' +
    'no amount of examples destroys a negative proof.',
  
  formal:
    'strength(¬∃x: bad(x)) > strength(∀x_tested: good(x)) ' +
    'because ∃x_untested: bad(x) is always possible for positive proofs',
  
  justification:
    'Security vulnerabilities are unwanted POSSIBILITIES. ' +
    'The safest system is one where bad behaviors are proven impossible, ' +
    'not merely where good behaviors have been observed. ' +
    'Absence of evidence (no bugs found) is not evidence of absence (no bugs exist). ' +
    'But proof of impossibility IS evidence of absence.',
  
  ifRejected:
    'Negative Space certification loses its privileged status. ' +
    'Positive and negative proofs are valued equally, ' +
    'which undervalues the stronger assurance of impossibility proofs.',
  
  rejectionImpact: 'PARTIAL',
  
  dependentFeatures: Object.freeze([
    'Negative Space Certification',
    'Impossibility Proofs',
    'CANNOT_* Classes',
    'Proof Strength Ordering'
  ])
});

// ═══════════════════════════════════════════════════════════════════════════════
// AXIOM REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All axioms indexed by ID
 */
const AXIOM_MAP: ReadonlyMap<AxiomId, Axiom> = new Map([
  ['AX-Ω', AXIOM_OMEGA],
  ['AX-Λ', AXIOM_LAMBDA],
  ['AX-Σ', AXIOM_SIGMA],
  ['AX-Δ', AXIOM_DELTA],
  ['AX-Ε', AXIOM_EPSILON]
]);

/**
 * The complete axiom registry
 */
export const AXIOM_REGISTRY: AxiomRegistry = Object.freeze({
  version: '1.0.0',
  axioms: AXIOM_MAP,
  declaredAt: '2026-01-06T00:00:00Z'
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get an axiom by its ID
 * @param id Axiom identifier
 * @returns The axiom or undefined if not found
 */
export function getAxiom(id: AxiomId): Axiom | undefined {
  return AXIOM_MAP.get(id);
}

/**
 * Get all axioms as an array
 * @returns Array of all axioms in canonical order
 */
export function getAllAxioms(): readonly Axiom[] {
  return Object.freeze(AXIOM_IDS.map(id => {
    const axiom = AXIOM_MAP.get(id);
    if (!axiom) {
      throw new Error(`Axiom ${id} not found in registry`);
    }
    return axiom;
  }));
}

/**
 * Get axioms with TOTAL rejection impact
 * These are the core axioms that cannot be partially rejected
 */
export function getCriticalAxioms(): readonly Axiom[] {
  return getAllAxioms().filter(a => a.rejectionImpact === 'TOTAL');
}

/**
 * Get axioms with PARTIAL rejection impact
 * These axioms can be rejected without completely invalidating the system
 */
export function getNonCriticalAxioms(): readonly Axiom[] {
  return getAllAxioms().filter(a => a.rejectionImpact === 'PARTIAL');
}

/**
 * Get the list of axiom IDs assumed by a certification
 * In standard mode, all axioms are assumed
 */
export function getAssumedAxiomIds(): readonly AxiomId[] {
  return AXIOM_IDS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that the axiom registry is complete and well-formed
 */
export function validateAxiomRegistry(): AxiomValidationResult {
  const errors: string[] = [];
  
  // Check all expected axioms are present
  for (const id of AXIOM_IDS) {
    if (!AXIOM_MAP.has(id)) {
      errors.push(`Missing axiom: ${id}`);
    }
  }
  
  // Check no extra axioms
  for (const id of AXIOM_MAP.keys()) {
    if (!AXIOM_IDS.includes(id)) {
      errors.push(`Unexpected axiom: ${id}`);
    }
  }
  
  // Check each axiom has all required fields
  for (const [id, axiom] of AXIOM_MAP) {
    if (!axiom.statement || axiom.statement.length < 10) {
      errors.push(`Axiom ${id}: statement too short or missing`);
    }
    if (!axiom.formal || axiom.formal.length < 5) {
      errors.push(`Axiom ${id}: formal statement too short or missing`);
    }
    if (!axiom.justification || axiom.justification.length < 10) {
      errors.push(`Axiom ${id}: justification too short or missing`);
    }
    if (!axiom.ifRejected || axiom.ifRejected.length < 10) {
      errors.push(`Axiom ${id}: rejection consequence too short or missing`);
    }
    if (!axiom.dependentFeatures || axiom.dependentFeatures.length === 0) {
      errors.push(`Axiom ${id}: no dependent features listed`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    axiomCount: AXIOM_MAP.size
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSEQUENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute what features are lost if a set of axioms is rejected
 * @param rejectedAxioms Set of axiom IDs being rejected
 * @returns List of features that become invalid
 */
export function computeRejectionConsequences(
  rejectedAxioms: ReadonlySet<AxiomId>
): readonly string[] {
  const lostFeatures = new Set<string>();
  
  for (const id of rejectedAxioms) {
    const axiom = AXIOM_MAP.get(id);
    if (axiom) {
      for (const feature of axiom.dependentFeatures) {
        lostFeatures.add(feature);
      }
    }
  }
  
  return Array.from(lostFeatures).sort();
}

/**
 * Check if a set of rejections causes TOTAL system invalidity
 * @param rejectedAxioms Set of axiom IDs being rejected
 * @returns true if any TOTAL-impact axiom is rejected
 */
export function isSystemInvalidated(
  rejectedAxioms: ReadonlySet<AxiomId>
): boolean {
  for (const id of rejectedAxioms) {
    const axiom = AXIOM_MAP.get(id);
    if (axiom && axiom.rejectionImpact === 'TOTAL') {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a human-readable summary of all axioms
 * Suitable for documentation or audit reports
 */
export function generateAxiomSummary(): string {
  const lines: string[] = [
    '╔═══════════════════════════════════════════════════════════════════════════════╗',
    '║                    SENTINEL SUPREME — FOUNDATIONAL AXIOMS                     ║',
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    '║                                                                               ║',
    '║  These axioms are DECLARED, not proven. Their rejection invalidates           ║',
    '║  the certification system. This is EXPLICIT TRANSPARENCY, not circularity.    ║',
    '║                                                                               ║',
    '╚═══════════════════════════════════════════════════════════════════════════════╝',
    ''
  ];
  
  for (const axiom of getAllAxioms()) {
    lines.push(`┌─────────────────────────────────────────────────────────────────────────────┐`);
    lines.push(`│ ${axiom.id} — ${axiom.name.padEnd(65)}│`);
    lines.push(`├─────────────────────────────────────────────────────────────────────────────┤`);
    lines.push(`│ Statement:                                                                  │`);
    
    // Word-wrap statement to fit in box
    const statementLines = wrapText(axiom.statement, 73);
    for (const line of statementLines) {
      lines.push(`│   ${line.padEnd(73)}│`);
    }
    
    lines.push(`│                                                                             │`);
    lines.push(`│ Formal: ${axiom.formal.substring(0, 64).padEnd(66)}│`);
    lines.push(`│                                                                             │`);
    lines.push(`│ Impact if Rejected: ${axiom.rejectionImpact.padEnd(53)}│`);
    lines.push(`└─────────────────────────────────────────────────────────────────────────────┘`);
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate axiom rejection consequence table
 */
export function generateRejectionTable(): string {
  const lines: string[] = [
    '| Axiom | Name | Impact | Consequence |',
    '|-------|------|--------|-------------|'
  ];
  
  for (const axiom of getAllAxioms()) {
    const shortConsequence = axiom.ifRejected.split('.')[0] ?? axiom.ifRejected;
    lines.push(`| ${axiom.id} | ${axiom.name} | ${axiom.rejectionImpact} | ${shortConsequence} |`);
  }
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrap text to fit within a maximum width
 */
function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT INDIVIDUAL AXIOMS (for direct access)
// ═══════════════════════════════════════════════════════════════════════════════

export { 
  AXIOM_OMEGA,
  AXIOM_LAMBDA,
  AXIOM_SIGMA,
  AXIOM_DELTA,
  AXIOM_EPSILON
};
