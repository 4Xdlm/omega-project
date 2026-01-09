/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — REFUSAL MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module refusal
 * @version 2.0.0
 * 
 * REFUSAL — Explicit Certification Refusal
 * 
 * The refusal module provides:
 * - Explicit refusal with documented reasons
 * - Refusal codes by category
 * - Link to violated axioms
 * - Remediation suggestions
 * 
 * Philosophy: An explicit refusal is more valuable than a silent failure.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type RefusalSeverity,
  type RefusalCategory,
  type RefusalCode,
  type RefusalDefinition,
  type Refusal,
  type RefusalResult,
  
  // Creation
  createRefusal,
  createAxiomRefusal,
  createCustomRefusal,
  
  // Queries
  getRefusalDefinition,
  getAllRefusalDefinitions,
  getRefusalsByCategory,
  getRefusalsBySeverity,
  getCriticalRefusals,
  countRefusalDefinitions,
  
  // Analysis
  hasBlockingRefusals,
  allRecoverable,
  getHighestSeverity,
  groupRefusalsByCategory,
  getAllRemediations,
  
  // Result helpers
  success,
  failure,
  refuseWith,
  
  // Type guards
  isRefusalCode,
  isRefusalCategory,
  isRefusalSeverity,
  
  // Documentation
  formatRefusal,
  generateRefusalSummary
} from './engine.js';
