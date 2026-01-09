/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — DEFAULT BOUNDARY LEDGER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/boundary_ledger.default
 * @version 3.27.0
 * @license MIT
 * 
 * Ce fichier contient les boundaries OBLIGATOIRES de SENTINEL SUPREME.
 * Chaque boundary déclare explicitement ce qui N'EST PAS garanti.
 * 
 * RÈGLE: Si ce n'est pas dans ce ledger, ce n'est pas garanti.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  BoundaryEntry, 
  BoundaryLedger,
  createBoundaryLedger 
} from './boundary_ledger.js';
import { SENTINEL_VERSION } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MANDATORY BOUNDARIES — EXTERNAL DEPENDENCIES
// ═══════════════════════════════════════════════════════════════════════════════

const BOUND_001: BoundaryEntry = Object.freeze({
  id: 'BOUND-001',
  title: 'Node.js Runtime Trust',
  description: 'SENTINEL assumes Node.js runtime behaves correctly. We cannot certify the Node.js implementation itself.',
  category: 'EXTERNAL_DEPENDENCY',
  severity: 'HARD',
  risk: 'CRITICAL',
  reason: 'Node.js is external software. Certifying it would require access to V8 source code and kernel interactions.',
  mitigation: 'Pin Node.js version in engines field. Document tested versions.',
  affectedInvariants: ['INV-META-01', 'INV-META-02', 'INV-META-08'],
  affectedModules: ['foundation', 'crystal', 'meta']
});

const BOUND_002: BoundaryEntry = Object.freeze({
  id: 'BOUND-002',
  title: 'V8 JavaScript Engine Trust',
  description: 'SENTINEL assumes V8 engine executes JavaScript correctly per ECMAScript specification.',
  category: 'EXTERNAL_DEPENDENCY',
  severity: 'HARD',
  risk: 'CRITICAL',
  reason: 'V8 is external. JIT compilation, garbage collection, and optimization passes are opaque.',
  mitigation: null, // Explicitly accepted as-is
  affectedInvariants: ['INV-PROOF-03', 'INV-CONST-01'],
  affectedModules: ['foundation']
});

const BOUND_003: BoundaryEntry = Object.freeze({
  id: 'BOUND-003',
  title: 'Operating System Trust',
  description: 'SENTINEL assumes the OS provides correct filesystem, memory, and process management.',
  category: 'EXTERNAL_DEPENDENCY',
  severity: 'HARD',
  risk: 'CRITICAL',
  reason: 'OS kernel is external. We cannot certify syscall implementations.',
  mitigation: 'Document supported OS versions. Test on Windows + Linux.',
  affectedInvariants: ['INV-META-08'],
  affectedModules: ['meta']
});

const BOUND_004: BoundaryEntry = Object.freeze({
  id: 'BOUND-004',
  title: 'npm Package Integrity',
  description: 'SENTINEL trusts that npm packages are not tampered with during install.',
  category: 'EXTERNAL_DEPENDENCY',
  severity: 'HARD',
  risk: 'HIGH',
  reason: 'Supply chain attacks are possible. npm registry is external.',
  mitigation: 'Use package-lock.json. Verify checksums. Minimal dependencies.',
  affectedInvariants: [],
  affectedModules: ['foundation', 'crystal', 'falsification']
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANDATORY BOUNDARIES — CRYPTOGRAPHIC
// ═══════════════════════════════════════════════════════════════════════════════

const BOUND_005: BoundaryEntry = Object.freeze({
  id: 'BOUND-005',
  title: 'SHA-256 Implementation Trust',
  description: 'SENTINEL assumes Node.js crypto.createHash("sha256") is a correct SHA-256 implementation.',
  category: 'CRYPTOGRAPHIC',
  severity: 'HARD',
  risk: 'CRITICAL',
  reason: 'We use the native crypto module. Certifying OpenSSL would require auditing millions of lines.',
  mitigation: 'Use only Node.js built-in crypto. No third-party hash libraries.',
  affectedInvariants: ['INV-CRYST-01', 'INV-ART-01', 'INV-META-04'],
  affectedModules: ['crystal', 'artifact', 'meta']
});

const BOUND_006: BoundaryEntry = Object.freeze({
  id: 'BOUND-006',
  title: 'Hash Collision Probability',
  description: 'SHA-256 collisions are theoretically possible but computationally infeasible.',
  category: 'CRYPTOGRAPHIC',
  severity: 'INFORMATIONAL',
  risk: 'LOW',
  reason: 'Birthday attack on SHA-256 requires 2^128 operations. Accepted industry standard.',
  mitigation: null, // Accepted as-is per industry standard
  affectedInvariants: ['INV-CRYST-01'],
  affectedModules: ['crystal']
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANDATORY BOUNDARIES — TOOLING
// ═══════════════════════════════════════════════════════════════════════════════

const BOUND_007: BoundaryEntry = Object.freeze({
  id: 'BOUND-007',
  title: 'TypeScript Compiler Trust',
  description: 'SENTINEL assumes tsc correctly transpiles TypeScript to JavaScript.',
  category: 'TOOLING',
  severity: 'HARD',
  risk: 'MEDIUM',
  reason: 'TypeScript compiler is external. Type erasure and emit are opaque.',
  mitigation: 'Pin TypeScript version. Run all tests on transpiled output.',
  affectedInvariants: [],
  affectedModules: ['foundation', 'crystal', 'meta']
});

const BOUND_008: BoundaryEntry = Object.freeze({
  id: 'BOUND-008',
  title: 'Vitest Test Runner Trust',
  description: 'SENTINEL assumes vitest correctly executes tests and reports results.',
  category: 'TOOLING',
  severity: 'SOFT',
  risk: 'MEDIUM',
  reason: 'Test runner is external. Could theoretically misreport results.',
  mitigation: 'Cross-verify critical tests manually. Check exit codes.',
  affectedInvariants: [],
  affectedModules: ['tests']
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANDATORY BOUNDARIES — TEMPORAL
// ═══════════════════════════════════════════════════════════════════════════════

const BOUND_009: BoundaryEntry = Object.freeze({
  id: 'BOUND-009',
  title: 'System Clock Accuracy',
  description: 'Timestamps depend on system clock which may drift or be manually changed.',
  category: 'TEMPORAL',
  severity: 'SOFT',
  risk: 'LOW',
  reason: 'System clock is controlled by OS. NTP sync is not guaranteed.',
  mitigation: 'Timestamps are EXCLUDED from core hash. Only used in meta section.',
  affectedInvariants: ['INV-META-04'],
  affectedModules: ['meta']
});

const BOUND_010: BoundaryEntry = Object.freeze({
  id: 'BOUND-010',
  title: 'Execution Timing Non-Determinism',
  description: 'Execution time varies based on CPU load, GC pauses, and system state.',
  category: 'TEMPORAL',
  severity: 'SOFT',
  risk: 'LOW',
  reason: 'Performance is not certifiable to exact milliseconds.',
  mitigation: 'Performance metrics are informational only, not part of certification.',
  affectedInvariants: [],
  affectedModules: ['falsification']
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANDATORY BOUNDARIES — SELF-REFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

const BOUND_011: BoundaryEntry = Object.freeze({
  id: 'BOUND-011',
  title: 'Bootstrapping Circularity',
  description: 'SENTINEL cannot fully certify the code that runs the certification.',
  category: 'SELF_REFERENCE',
  severity: 'HARD',
  risk: 'HIGH',
  reason: 'Self-certification has inherent limits. The verifier cannot verify itself completely.',
  mitigation: 'Declare explicit scope. Split into "certified core" and "uncertified bootstrap".',
  affectedInvariants: ['INV-META-01', 'INV-META-02'],
  affectedModules: ['meta']
});

const BOUND_012: BoundaryEntry = Object.freeze({
  id: 'BOUND-012',
  title: 'Test Infrastructure Trust',
  description: 'Tests that prove invariants use the same codebase being tested.',
  category: 'SELF_REFERENCE',
  severity: 'SOFT',
  risk: 'MEDIUM',
  reason: 'Circular dependency: tests use SENTINEL modules to test SENTINEL.',
  mitigation: 'Minimize shared code between test infrastructure and core logic.',
  affectedInvariants: [],
  affectedModules: ['tests']
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANDATORY BOUNDARIES — SEMANTIC
// ═══════════════════════════════════════════════════════════════════════════════

const BOUND_013: BoundaryEntry = Object.freeze({
  id: 'BOUND-013',
  title: 'Natural Language Interpretation',
  description: 'Invariant descriptions in natural language may be ambiguous.',
  category: 'SEMANTIC',
  severity: 'SOFT',
  risk: 'LOW',
  reason: 'Human language is inherently ambiguous. Formal statements are preferred.',
  mitigation: 'Each invariant has both natural AND formal statement. Formal is authoritative.',
  affectedInvariants: ['INV-AX-04'],
  affectedModules: ['foundation']
});

const BOUND_014: BoundaryEntry = Object.freeze({
  id: 'BOUND-014',
  title: 'Specification Completeness',
  description: 'The invariant registry may not cover all possible failure modes.',
  category: 'SEMANTIC',
  severity: 'SOFT',
  risk: 'MEDIUM',
  reason: 'Unknown unknowns exist. We cannot enumerate what we do not know.',
  mitigation: 'Continuous falsification. Boundary Ledger is living document.',
  affectedInvariants: [],
  affectedModules: ['foundation', 'meta']
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANDATORY BOUNDARIES — COMPUTATIONAL
// ═══════════════════════════════════════════════════════════════════════════════

const BOUND_015: BoundaryEntry = Object.freeze({
  id: 'BOUND-015',
  title: 'Halting Problem Limitation',
  description: 'SENTINEL cannot prove arbitrary code terminates.',
  category: 'COMPUTATIONAL',
  severity: 'HARD',
  risk: 'LOW',
  reason: 'Halting problem is undecidable (Turing, 1936). Fundamental limit.',
  mitigation: 'Only certify bounded computations with explicit termination.',
  affectedInvariants: [],
  affectedModules: ['falsification']
});

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATE — ALL MANDATORY BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All mandatory boundary entries
 */
export const MANDATORY_BOUNDARIES: readonly BoundaryEntry[] = Object.freeze([
  BOUND_001,
  BOUND_002,
  BOUND_003,
  BOUND_004,
  BOUND_005,
  BOUND_006,
  BOUND_007,
  BOUND_008,
  BOUND_009,
  BOUND_010,
  BOUND_011,
  BOUND_012,
  BOUND_013,
  BOUND_014,
  BOUND_015
]);

/**
 * Expected boundary count (for validation)
 */
export const EXPECTED_BOUNDARY_COUNT = 15 as const;

/**
 * Create the default Boundary Ledger
 */
export function createDefaultBoundaryLedger(): BoundaryLedger {
  return createBoundaryLedger(SENTINEL_VERSION, [...MANDATORY_BOUNDARIES]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  BOUND_001,
  BOUND_002,
  BOUND_003,
  BOUND_004,
  BOUND_005,
  BOUND_006,
  BOUND_007,
  BOUND_008,
  BOUND_009,
  BOUND_010,
  BOUND_011,
  BOUND_012,
  BOUND_013,
  BOUND_014,
  BOUND_015
};
