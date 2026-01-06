// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — PROOF MODULE INDEX
// Version: 1.0.0
// Date: 06 janvier 2026
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Crystal Types ────────────────────────────────────────────────────────────
export type {
  MerkleNode,
  CausalityMatrix,
  CausalityVerification,
  DeterminismFingerprint,
  StatisticalProfile,
  ProofCrystal,
} from './crystal.js';

export {
  sha256,
  hashObject,
  MerkleTreeBuilder,
  CausalityMatrixBuilder,
  StatisticalProfiler,
  DeterminismProver,
} from './crystal.js';

// ─── Crystallizer ─────────────────────────────────────────────────────────────
export type {
  CrystallizerConfig,
  CrystalScenario,
  CrystallizeOptions,
} from './crystallizer.js';

export {
  ProofCrystallizer,
  createCrystallizer,
} from './crystallizer.js';
