/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CERTIFICATION REGIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module regions/definitions
 * @version 2.0.0
 * @license MIT
 * 
 * REGIONS — THE 7 CERTIFICATION LEVELS
 * =====================================
 * 
 * Defines the certification landscape with 7 distinct regions:
 * 
 *   VOID          → Uncertifiable (fundamental flaw)
 *   THEORETICAL   → Conceptually valid, no implementation
 *   EXPLORATORY   → Early testing, insufficient coverage
 *   PROVISIONAL   → Passing tests, incomplete falsification
 *   PROVEN        → Survived sincere falsification effort
 *   FOUNDATIONAL  → Multi-dimensional proof, high confidence
 *   TRANSCENDENT  → External certifier attestation required
 * 
 * INVARIANTS:
 * - INV-REG-01: Regions form a total order (VOID < ... < TRANSCENDENT)
 * - INV-REG-02: Each region has concrete entry/exit thresholds
 * - INV-REG-03: TRANSCENDENT requires external certifier (R3)
 * - INV-REG-04: Containment is deterministic
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CERTIFICATION_LEVELS, type CertificationLevel } from '../foundation/constants.js';
import { type ProofStrength } from '../foundation/proof_strength.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Certification region identifier
 */
export type RegionId = CertificationLevel;

/**
 * Region color for visualization
 */
export type RegionColor = 
  | '#000000'   // VOID - Black
  | '#9E9E9E'   // THEORETICAL - Gray
  | '#FF9800'   // EXPLORATORY - Orange
  | '#FFC107'   // PROVISIONAL - Amber
  | '#4CAF50'   // PROVEN - Green
  | '#2196F3'   // FOUNDATIONAL - Blue
  | '#9C27B0';  // TRANSCENDENT - Purple

/**
 * Thresholds required to enter a region
 */
export interface RegionThresholds {
  /** Minimum proof strength required */
  readonly minProofStrength: ProofStrength;
  
  /** Minimum survival rate [0, 1] */
  readonly minSurvivalRate: number;
  
  /** Minimum corpus coverage [0, 1] */
  readonly minCoverage: number;
  
  /** Minimum number of proofs */
  readonly minProofCount: number;
  
  /** Minimum mandatory attack coverage [0, 1] */
  readonly minMandatoryCoverage: number;
  
  /** Requires external certifier? (R3) */
  readonly requiresExternalCertifier: boolean;
}

/**
 * Complete region definition
 */
export interface RegionDefinition {
  /** Region identifier */
  readonly id: RegionId;
  
  /** Numeric order (0 = lowest, 6 = highest) */
  readonly order: number;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Short description */
  readonly description: string;
  
  /** Color for visualization */
  readonly color: RegionColor;
  
  /** Entry thresholds */
  readonly thresholds: RegionThresholds;
  
  /** What this region means */
  readonly meaning: string;
  
  /** Typical use cases */
  readonly useCases: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGION ORDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical order of regions (lowest to highest)
 */
export const REGION_ORDER: readonly RegionId[] = Object.freeze([
  'VOID',
  'THEORETICAL',
  'EXPLORATORY',
  'PROVISIONAL',
  'PROVEN',
  'FOUNDATIONAL',
  'TRANSCENDENT'
]);

/**
 * Get numeric order for a region (0-6)
 */
export function getRegionOrder(region: RegionId): number {
  const index = REGION_ORDER.indexOf(region);
  return index >= 0 ? index : -1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * VOID — Uncertifiable
 * Fundamental flaw prevents any certification
 */
const VOID_REGION: RegionDefinition = Object.freeze({
  id: 'VOID',
  order: 0,
  name: 'Void',
  description: 'Uncertifiable due to fundamental flaw',
  color: '#000000',
  thresholds: Object.freeze({
    minProofStrength: 'Ε',
    minSurvivalRate: 0,
    minCoverage: 0,
    minProofCount: 0,
    minMandatoryCoverage: 0,
    requiresExternalCertifier: false
  }),
  meaning: 'The system has a fundamental flaw that prevents any certification. This could be a violated axiom, logical inconsistency, or unprovable claim.',
  useCases: Object.freeze([
    'Rejected axiom detected',
    'Logical contradiction found',
    'System invalidated by breach'
  ])
});

/**
 * THEORETICAL — Conceptually Valid
 * No implementation or testing yet
 */
const THEORETICAL_REGION: RegionDefinition = Object.freeze({
  id: 'THEORETICAL',
  order: 1,
  name: 'Theoretical',
  description: 'Conceptually valid, awaiting implementation',
  color: '#9E9E9E',
  thresholds: Object.freeze({
    minProofStrength: 'Ε',
    minSurvivalRate: 0,
    minCoverage: 0,
    minProofCount: 0,
    minMandatoryCoverage: 0,
    requiresExternalCertifier: false
  }),
  meaning: 'The invariant is conceptually defined but has no proofs or tests attached. It exists in theory only.',
  useCases: Object.freeze([
    'New invariant definition',
    'Design phase invariant',
    'Pending implementation'
  ])
});

/**
 * EXPLORATORY — Early Testing
 * Some testing, insufficient coverage
 */
const EXPLORATORY_REGION: RegionDefinition = Object.freeze({
  id: 'EXPLORATORY',
  order: 2,
  name: 'Exploratory',
  description: 'Early testing phase, insufficient coverage',
  color: '#FF9800',
  thresholds: Object.freeze({
    minProofStrength: 'Ε',
    minSurvivalRate: 0.5,       // 50% survival
    minCoverage: 0.2,           // 20% corpus coverage
    minProofCount: 1,
    minMandatoryCoverage: 0.1,  // 10% mandatory
    requiresExternalCertifier: false
  }),
  meaning: 'Initial testing has begun with at least one proof. Coverage is limited and more falsification effort is needed.',
  useCases: Object.freeze([
    'Initial unit tests written',
    'Proof of concept verified',
    'Basic happy path tested'
  ])
});

/**
 * PROVISIONAL — Passing Tests
 * Decent testing, incomplete falsification
 */
const PROVISIONAL_REGION: RegionDefinition = Object.freeze({
  id: 'PROVISIONAL',
  order: 3,
  name: 'Provisional',
  description: 'Passing tests, incomplete falsification effort',
  color: '#FFC107',
  thresholds: Object.freeze({
    minProofStrength: 'Δ',      // At least Statistical
    minSurvivalRate: 0.8,       // 80% survival
    minCoverage: 0.5,           // 50% corpus coverage
    minProofCount: 3,
    minMandatoryCoverage: 0.5,  // 50% mandatory
    requiresExternalCertifier: false
  }),
  meaning: 'Reasonable testing with good survival rate. Falsification effort is partial - more edge cases and attack categories needed.',
  useCases: Object.freeze([
    'Beta release quality',
    'Internal deployment ready',
    'Conditional approval'
  ])
});

/**
 * PROVEN — Survived Falsification
 * Sincere falsification effort survived
 */
const PROVEN_REGION: RegionDefinition = Object.freeze({
  id: 'PROVEN',
  order: 4,
  name: 'Proven',
  description: 'Survived sincere falsification effort',
  color: '#4CAF50',
  thresholds: Object.freeze({
    minProofStrength: 'Σ',      // At least Exhaustive
    minSurvivalRate: 0.95,      // 95% survival
    minCoverage: 0.7,           // 70% corpus coverage
    minProofCount: 5,
    minMandatoryCoverage: 1.0,  // 100% mandatory
    requiresExternalCertifier: false
  }),
  meaning: 'The system has survived a sincere falsification effort. All mandatory attacks tested, high coverage, excellent survival rate.',
  useCases: Object.freeze([
    'Production deployment',
    'External API release',
    'Customer-facing features'
  ])
});

/**
 * FOUNDATIONAL — Multi-Dimensional Proof
 * High confidence, multiple proof types
 */
const FOUNDATIONAL_REGION: RegionDefinition = Object.freeze({
  id: 'FOUNDATIONAL',
  order: 5,
  name: 'Foundational',
  description: 'Multi-dimensional proof, high confidence',
  color: '#2196F3',
  thresholds: Object.freeze({
    minProofStrength: 'Λ',      // At least Mathematical
    minSurvivalRate: 0.99,      // 99% survival
    minCoverage: 0.9,           // 90% corpus coverage
    minProofCount: 10,
    minMandatoryCoverage: 1.0,  // 100% mandatory
    requiresExternalCertifier: false
  }),
  meaning: 'Very high confidence with mathematical or formal proofs. Near-complete coverage, excellent survival. Ready for critical systems.',
  useCases: Object.freeze([
    'Core system components',
    'Security-critical paths',
    'Financial calculations'
  ])
});

/**
 * TRANSCENDENT — External Certification
 * Requires external certifier attestation (R3)
 */
const TRANSCENDENT_REGION: RegionDefinition = Object.freeze({
  id: 'TRANSCENDENT',
  order: 6,
  name: 'Transcendent',
  description: 'External certifier attestation required',
  color: '#9C27B0',
  thresholds: Object.freeze({
    minProofStrength: 'Ω',      // Impossibility proof
    minSurvivalRate: 1.0,       // 100% survival
    minCoverage: 0.95,          // 95% corpus coverage
    minProofCount: 15,
    minMandatoryCoverage: 1.0,  // 100% mandatory
    requiresExternalCertifier: true  // R3 CORRECTION
  }),
  meaning: 'The highest certification level. Requires external independent certifier to attest. Reserved for life-critical, aerospace-grade systems.',
  useCases: Object.freeze([
    'Aerospace systems (DO-178C)',
    'Medical devices (IEC 62304)',
    'Nuclear control systems',
    'Automotive safety (ISO 26262)'
  ])
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All region definitions indexed by ID
 */
export const REGION_DEFINITIONS: ReadonlyMap<RegionId, RegionDefinition> = new Map([
  ['VOID', VOID_REGION],
  ['THEORETICAL', THEORETICAL_REGION],
  ['EXPLORATORY', EXPLORATORY_REGION],
  ['PROVISIONAL', PROVISIONAL_REGION],
  ['PROVEN', PROVEN_REGION],
  ['FOUNDATIONAL', FOUNDATIONAL_REGION],
  ['TRANSCENDENT', TRANSCENDENT_REGION]
]);

/**
 * All regions in order
 */
export const ALL_REGIONS: readonly RegionDefinition[] = Object.freeze([
  VOID_REGION,
  THEORETICAL_REGION,
  EXPLORATORY_REGION,
  PROVISIONAL_REGION,
  PROVEN_REGION,
  FOUNDATIONAL_REGION,
  TRANSCENDENT_REGION
]);

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get region definition by ID
 */
export function getRegion(id: RegionId): RegionDefinition | undefined {
  return REGION_DEFINITIONS.get(id);
}

/**
 * Get all region definitions in order
 */
export function getAllRegions(): readonly RegionDefinition[] {
  return ALL_REGIONS;
}

/**
 * Get thresholds for a region
 */
export function getThresholds(id: RegionId): RegionThresholds | undefined {
  const region = REGION_DEFINITIONS.get(id);
  return region?.thresholds;
}

/**
 * Get region name
 */
export function getRegionName(id: RegionId): string {
  const region = REGION_DEFINITIONS.get(id);
  return region?.name ?? 'Unknown';
}

/**
 * Get region color
 */
export function getRegionColor(id: RegionId): RegionColor {
  const region = REGION_DEFINITIONS.get(id);
  return region?.color ?? '#000000';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare two regions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareRegions(a: RegionId, b: RegionId): -1 | 0 | 1 {
  const orderA = getRegionOrder(a);
  const orderB = getRegionOrder(b);
  
  if (orderA < orderB) return -1;
  if (orderA > orderB) return 1;
  return 0;
}

/**
 * Check if region A is at least as high as region B
 */
export function isAtLeastRegion(a: RegionId, b: RegionId): boolean {
  return getRegionOrder(a) >= getRegionOrder(b);
}

/**
 * Check if region A is strictly higher than region B
 */
export function isHigherThan(a: RegionId, b: RegionId): boolean {
  return getRegionOrder(a) > getRegionOrder(b);
}

/**
 * Get the higher of two regions
 */
export function maxRegion(a: RegionId, b: RegionId): RegionId {
  return getRegionOrder(a) >= getRegionOrder(b) ? a : b;
}

/**
 * Get the lower of two regions
 */
export function minRegion(a: RegionId, b: RegionId): RegionId {
  return getRegionOrder(a) <= getRegionOrder(b) ? a : b;
}

/**
 * Get the next higher region (or null if at TRANSCENDENT)
 */
export function getNextRegion(current: RegionId): RegionId | null {
  const currentOrder = getRegionOrder(current);
  if (currentOrder < 0 || currentOrder >= REGION_ORDER.length - 1) {
    return null;
  }
  return REGION_ORDER[currentOrder + 1];
}

/**
 * Get the previous lower region (or null if at VOID)
 */
export function getPreviousRegion(current: RegionId): RegionId | null {
  const currentOrder = getRegionOrder(current);
  if (currentOrder <= 0) {
    return null;
  }
  return REGION_ORDER[currentOrder - 1];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a value is a valid region ID
 */
export function isRegionId(value: unknown): value is RegionId {
  return typeof value === 'string' && REGION_ORDER.includes(value as RegionId);
}

/**
 * Check if a region requires external certification (R3)
 */
export function requiresExternalCertifier(id: RegionId): boolean {
  const region = REGION_DEFINITIONS.get(id);
  return region?.thresholds.requiresExternalCertifier ?? false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate region hierarchy documentation
 */
export function generateRegionHierarchy(): string {
  const lines: string[] = [
    '╔═══════════════════════════════════════════════════════════════════════════════╗',
    '║                     CERTIFICATION REGIONS HIERARCHY                          ║',
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    '║                                                                               ║'
  ];
  
  for (const region of ALL_REGIONS) {
    const bar = '█'.repeat(region.order + 1);
    const pad = ' '.repeat(6 - region.order);
    lines.push(`║  ${region.order}. ${region.id.padEnd(14)} ${bar}${pad} ${region.description.substring(0, 35).padEnd(35)}║`);
  }
  
  lines.push('║                                                                               ║');
  lines.push('╚═══════════════════════════════════════════════════════════════════════════════╝');
  
  return lines.join('\n');
}

/**
 * Generate threshold table
 */
export function generateThresholdTable(): string {
  const lines: string[] = [
    '| Region | Strength | Survival | Coverage | Proofs | Mandatory | External |',
    '|--------|----------|----------|----------|--------|-----------|----------|'
  ];
  
  for (const region of ALL_REGIONS) {
    const t = region.thresholds;
    lines.push(
      `| ${region.id.padEnd(14)} | ${t.minProofStrength.padEnd(8)} | ${(t.minSurvivalRate * 100).toFixed(0).padStart(6)}% | ${(t.minCoverage * 100).toFixed(0).padStart(6)}% | ${String(t.minProofCount).padStart(6)} | ${(t.minMandatoryCoverage * 100).toFixed(0).padStart(8)}% | ${t.requiresExternalCertifier ? 'Yes' : 'No'.padEnd(8)} |`
    );
  }
  
  return lines.join('\n');
}
