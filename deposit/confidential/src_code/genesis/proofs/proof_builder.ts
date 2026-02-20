// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Proof Builder
// ═══════════════════════════════════════════════════════════════════════════════
// Construit le ProofPack avec chaine de hashes et logs de tracabilite
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  TruthBundle,
  EmotionTrajectoryContract,
  GenesisConfig,
  ProofPack,
  ParetoCandidate,
  IterationLogEntry,
  TimingLogEntry,
  KillLogEntry,
} from '../core/types';
import { sha256, hashObject, combineHashes } from './hash_utils';

/**
 * Contexte de construction du proof pack
 */
export interface ProofContext {
  truthBundle: TruthBundle;
  contract: EmotionTrajectoryContract;
  config: GenesisConfig;

  // Logs accumules
  iterationLog: IterationLogEntry[];
  timingLog: TimingLogEntry[];
  killLog: KillLogEntry[];

  // Seeds utilises
  drafterSeeds: number[];
  prismSeed?: number;
  mutatorSeeds: number[];

  // LLM trace (si utilise)
  llmTrace?: {
    modelId: string;
    promptHashes: string[];
  };
}

/**
 * Cree un contexte de proof vide
 */
export function createProofContext(
  truthBundle: TruthBundle,
  contract: EmotionTrajectoryContract,
  config: GenesisConfig
): ProofContext {
  return {
    truthBundle,
    contract,
    config,
    iterationLog: [],
    timingLog: [],
    killLog: [],
    drafterSeeds: [],
    mutatorSeeds: [],
  };
}

/**
 * Ajoute une entree de log d'iteration
 */
export function logIteration(
  ctx: ProofContext,
  entry: Omit<IterationLogEntry, 'timestamp'>
): void {
  ctx.iterationLog.push(entry as IterationLogEntry);
}

/**
 * Ajoute une entree de log de timing
 */
export function logTiming(
  ctx: ProofContext,
  module: string,
  operation: string,
  durationMs: number
): void {
  ctx.timingLog.push({
    module,
    operation,
    durationMs,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Ajoute une entree de log de kill
 */
export function logKill(
  ctx: ProofContext,
  draftId: string,
  stage: 'FAST_GATE' | 'SENTINEL',
  reason: string,
  failedJudge?: string,
  metrics?: Record<string, number>
): void {
  ctx.killLog.push({
    draftId,
    stage,
    reason,
    failedJudge,
    metrics,
  });
}

/**
 * Enregistre un seed de drafter
 */
export function recordDrafterSeed(ctx: ProofContext, seed: number): void {
  ctx.drafterSeeds.push(seed);
}

/**
 * Enregistre un seed de mutator
 */
export function recordMutatorSeed(ctx: ProofContext, seed: number): void {
  ctx.mutatorSeeds.push(seed);
}

/**
 * Enregistre le seed PRISM
 */
export function recordPrismSeed(ctx: ProofContext, seed: number): void {
  ctx.prismSeed = seed;
}

/**
 * Construit le ProofPack final
 */
export function buildProofPack(
  ctx: ProofContext,
  outputText: string,
  paretoFrontier: ParetoCandidate[]
): ProofPack {
  // Calculer les hashes
  const truthHash = ctx.truthBundle.bundleHash;
  const contractHash = hashObject(ctx.contract);
  const configHash = hashObject(ctx.config);
  const outputTextHash = sha256(outputText);
  const combinedHash = combineHashes(truthHash, contractHash, configHash, outputTextHash);

  return {
    hashes: {
      truthHash,
      contractHash,
      configHash,
      outputTextHash,
      combinedHash,
    },
    seeds: {
      drafterSeeds: [...ctx.drafterSeeds],
      prismSeed: ctx.prismSeed,
      mutatorSeeds: [...ctx.mutatorSeeds],
    },
    logs: {
      iterationLog: [...ctx.iterationLog],
      timingLog: [...ctx.timingLog],
      killLog: [...ctx.killLog],
    },
    paretoFrontier,
    llmTrace: ctx.llmTrace,
  };
}

/**
 * Verifie l'integrite d'un ProofPack
 */
export function verifyProofPack(
  proofPack: ProofPack,
  truthBundle: TruthBundle,
  contract: EmotionTrajectoryContract,
  config: GenesisConfig,
  outputText: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verifier truth hash
  if (proofPack.hashes.truthHash !== truthBundle.bundleHash) {
    errors.push(`Truth hash mismatch: expected ${truthBundle.bundleHash}, got ${proofPack.hashes.truthHash}`);
  }

  // Verifier contract hash
  const expectedContractHash = hashObject(contract);
  if (proofPack.hashes.contractHash !== expectedContractHash) {
    errors.push(`Contract hash mismatch: expected ${expectedContractHash}, got ${proofPack.hashes.contractHash}`);
  }

  // Verifier config hash
  const expectedConfigHash = hashObject(config);
  if (proofPack.hashes.configHash !== expectedConfigHash) {
    errors.push(`Config hash mismatch: expected ${expectedConfigHash}, got ${proofPack.hashes.configHash}`);
  }

  // Verifier output text hash
  const expectedOutputHash = sha256(outputText);
  if (proofPack.hashes.outputTextHash !== expectedOutputHash) {
    errors.push(`Output text hash mismatch: expected ${expectedOutputHash}, got ${proofPack.hashes.outputTextHash}`);
  }

  // Verifier combined hash
  const expectedCombined = combineHashes(
    proofPack.hashes.truthHash,
    proofPack.hashes.contractHash,
    proofPack.hashes.configHash,
    proofPack.hashes.outputTextHash
  );
  if (proofPack.hashes.combinedHash !== expectedCombined) {
    errors.push(`Combined hash mismatch: expected ${expectedCombined}, got ${proofPack.hashes.combinedHash}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Serialise un ProofPack en JSON
 */
export function serializeProofPack(proofPack: ProofPack): string {
  return JSON.stringify(proofPack, null, 2);
}

/**
 * Deserialise un ProofPack depuis JSON
 */
export function deserializeProofPack(json: string): ProofPack {
  return JSON.parse(json) as ProofPack;
}

export default {
  createProofContext,
  logIteration,
  logTiming,
  logKill,
  recordDrafterSeed,
  recordMutatorSeed,
  recordPrismSeed,
  buildProofPack,
  verifyProofPack,
  serializeProofPack,
  deserializeProofPack,
};
