/**
 * OMEGA Governance — Core Types
 * Phase D.2 — Central type definitions
 */

/** Stage identifier (matches D.1 ProofPack stages) */
export type StageId = '00-intent' | '10-genesis' | '20-scribe' | '30-style' | '40-creation' | '50-forge';

/** All stages in order */
export const ALL_STAGES: readonly StageId[] = [
  '00-intent', '10-genesis', '20-scribe', '30-style', '40-creation', '50-forge',
];

/** ProofPack artifact entry (from manifest) */
export interface ArtifactEntry {
  readonly stage: StageId;
  readonly filename: string;
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
}

/** Version map (from manifest) */
export interface VersionMap {
  readonly runner: string;
  readonly genesis: string;
  readonly scribe: string;
  readonly style: string;
  readonly creation: string;
  readonly forge: string;
}

/** Manifest structure (from D.1 ProofPack) */
export interface Manifest {
  readonly run_id: string;
  readonly seed: string;
  readonly versions: VersionMap;
  readonly artifacts: readonly ArtifactEntry[];
  readonly merkle_root: string;
  readonly intent_hash: string;
  readonly final_hash: string;
  readonly verdict: string;
  readonly stages_completed: readonly StageId[];
}

/** Serialized Merkle tree (from merkle-tree.json) */
export interface SerializedMerkleTree {
  readonly root_hash: string;
  readonly leaf_count: number;
  readonly leaves: readonly MerkleLeaf[];
  readonly tree: MerkleNodeSerialized;
}

export interface MerkleLeaf {
  readonly hash: string;
  readonly label: string;
}

export interface MerkleNodeSerialized {
  readonly hash: string;
  readonly label?: string;
  readonly left?: MerkleNodeSerialized;
  readonly right?: MerkleNodeSerialized;
}

/** ForgeReport metrics (from 50-forge/forge-report.json) */
export interface ForgeMetrics {
  readonly total_paragraphs: number;
  readonly emotion_coverage: number;
  readonly trajectory_compliance: number;
  readonly avg_cosine_distance: number;
  readonly avg_euclidean_distance: number;
  readonly forced_transitions: number;
  readonly feasibility_failures: number;
  readonly law4_violations: number;
  readonly flux_balance_error: number;
  readonly M1: number;
  readonly M2: number;
  readonly M3: number;
  readonly M4: number;
  readonly M5: number;
  readonly M6: number;
  readonly M7: number;
  readonly M8: number;
  readonly M9: number;
  readonly M10: number;
  readonly M11: number;
  readonly M12: number;
  readonly emotion_score: number;
  readonly quality_score: number;
  readonly composite_score: number;
  readonly dead_zones_count: number;
  readonly prescriptions_count: number;
  readonly critical_prescriptions: number;
}

/** ForgeReport structure (from 50-forge/forge-report.json) */
export interface ForgeReport {
  readonly forge_id: string;
  readonly input_hash: string;
  readonly verdict: string;
  readonly metrics: ForgeMetrics;
  readonly config_hash: string;
  readonly report_hash: string;
  readonly timestamp_deterministic: string;
}

/** Invariant result (governance level) */
export interface GovInvariantResult {
  readonly id: string;
  readonly status: 'PASS' | 'FAIL';
  readonly message?: string;
  readonly evidence?: string;
}

/** Exit codes for CLI */
export const EXIT_SUCCESS = 0;
export const EXIT_GENERIC_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;
export const EXIT_PROOFPACK_INVALID = 3;
export const EXIT_IO_ERROR = 4;
export const EXIT_INVARIANT_BREACH = 5;
export const EXIT_DRIFT_DETECTED = 6;
export const EXIT_CERTIFICATION_FAIL = 7;

/** Read result wrapping a parsed ProofPack */
export interface ProofPackData {
  readonly runDir: string;
  readonly runId: string;
  readonly manifest: Manifest;
  readonly manifestHash: string;
  readonly merkleTree: SerializedMerkleTree;
  readonly forgeReport: ForgeReport | null;
}

/** File stat for read-only verification */
export interface FileStat {
  readonly mtime: number;
  readonly size: number;
}
