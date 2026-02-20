/**
 * OMEGA Orchestrator Generation Contract v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Defines the contract between Orchestrator and Genesis Forge.
 * Generation requests are immutable, signed with deterministic seed.
 *
 * INVARIANTS:
 * - G-INV-01: No fact injection via Intent (allowFacts: false enforced)
 * - G-INV-04: Deterministic seed for reproducible generation
 * - G-INV-10: Generation mode MOCK_ONLY
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G5
 */

import { createHash } from 'crypto';
import type {
  Intent,
  IntentId,
  ActorId,
  PolicyId,
  ChainHash,
  ISO8601,
  ToneProfile,
} from './types';
import { isChainHash } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATION CONTRACT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generation mode - MOCK_ONLY for Phase G
 * G-INV-10: No actual LLM calls
 */
export type GenerationMode = 'MOCK_ONLY';

/**
 * Contract status
 */
export type ContractStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

/**
 * Contract ID - deterministic from intent + policy
 */
export type ContractId = string & { readonly __brand: 'ContractId' };

/**
 * Validates ContractId format
 */
export function isContractId(value: unknown): value is ContractId {
  return (
    typeof value === 'string' &&
    /^CON-[a-f0-9]{16}$/.test(value)
  );
}

/**
 * Generation parameters extracted from Intent
 */
export interface GenerationParams {
  readonly maxLength: number;
  readonly tone: ToneProfile;
  readonly prompt: string;
}

/**
 * Generation contract between orchestrator and forge
 */
export interface GenerationContract {
  readonly contractId: ContractId;
  readonly intentId: IntentId;
  readonly actorId: ActorId;
  readonly policyId: PolicyId;
  readonly mode: GenerationMode;
  readonly seed: number;
  readonly params: GenerationParams;
  readonly createdAt: ISO8601;
  readonly expiresAt: ISO8601;
  readonly status: ContractStatus;
  readonly chainHash: ChainHash;
}

/**
 * Sealed contract - immutable after creation
 */
export type SealedContract = Readonly<GenerationContract>;

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC SEED
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes deterministic seed from intent.
 * G-INV-04: Seed is reproducible from intent content.
 *
 * @param intent - Intent to compute seed from
 * @returns Deterministic seed number
 */
export function computeDeterministicSeed(intent: Intent): number {
  // Hash intent ID for deterministic seed
  const hash = createHash('sha256')
    .update(intent.intentId)
    .digest();

  // Use first 4 bytes as seed (32-bit integer)
  const seed = hash.readUInt32BE(0);

  return seed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contract creation options
 */
export interface ContractCreationOptions {
  readonly intent: Intent;
  readonly policyId: PolicyId;
  readonly previousChainHash?: ChainHash;
  readonly ttlMs?: number;
}

/**
 * Default TTL for contracts (1 hour)
 */
export const DEFAULT_CONTRACT_TTL_MS = 3600000;

/**
 * Extracts generation prompt from intent payload.
 */
function extractPrompt(payload: Readonly<Record<string, unknown>>): string {
  // Look for common prompt fields
  if (typeof payload.text === 'string') {
    return payload.text;
  }
  if (typeof payload.prompt === 'string') {
    return payload.prompt;
  }
  if (typeof payload.content === 'string') {
    return payload.content;
  }
  // Fallback to JSON representation
  return JSON.stringify(payload);
}

/**
 * Computes contract ID from intent and policy.
 */
function computeContractId(intentId: IntentId, policyId: PolicyId): ContractId {
  const hash = createHash('sha256')
    .update(intentId)
    .update(policyId)
    .digest('hex')
    .slice(0, 16);

  return `CON-${hash}` as ContractId;
}

/**
 * Computes chain hash for contract.
 */
function computeContractChainHash(
  contract: Omit<GenerationContract, 'chainHash'>,
  previousHash?: ChainHash
): ChainHash {
  const data = {
    contractId: contract.contractId,
    intentId: contract.intentId,
    policyId: contract.policyId,
    seed: contract.seed,
    previous: previousHash ?? null,
  };

  const hash = createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');

  return hash as ChainHash;
}

/**
 * Creates a new generation contract.
 *
 * G-INV-01: Validates allowFacts is false
 * G-INV-04: Uses deterministic seed
 * G-INV-10: Mode is MOCK_ONLY
 *
 * @param options - Contract creation options
 * @returns Sealed generation contract
 * @throws Error if intent allows facts
 */
export function createGenerationContract(options: ContractCreationOptions): SealedContract {
  const { intent, policyId, previousChainHash, ttlMs = DEFAULT_CONTRACT_TTL_MS } = options;

  // G-INV-01: Reject if allowFacts is true
  if (intent.constraints.allowFacts) {
    throw new Error('G-INV-01 VIOLATION: Intent allowFacts must be false');
  }

  const contractId = computeContractId(intent.intentId, policyId);
  const seed = computeDeterministicSeed(intent);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  const params: GenerationParams = Object.freeze({
    maxLength: intent.constraints.maxLength,
    tone: intent.tone,
    prompt: extractPrompt(intent.payload),
  });

  const contractWithoutHash: Omit<GenerationContract, 'chainHash'> = {
    contractId,
    intentId: intent.intentId,
    actorId: intent.actorId,
    policyId,
    mode: 'MOCK_ONLY', // G-INV-10
    seed,
    params,
    createdAt: now.toISOString() as ISO8601,
    expiresAt: expiresAt.toISOString() as ISO8601,
    status: 'PENDING',
  };

  const chainHash = computeContractChainHash(contractWithoutHash, previousChainHash);

  return Object.freeze({
    ...contractWithoutHash,
    chainHash,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates contract integrity.
 *
 * @param contract - Contract to validate
 * @returns true if valid
 */
export function validateContract(contract: GenerationContract): boolean {
  // Check ID format
  if (!isContractId(contract.contractId)) {
    return false;
  }

  // Check mode is MOCK_ONLY (G-INV-10)
  if (contract.mode !== 'MOCK_ONLY') {
    return false;
  }

  // Check chain hash format
  if (!isChainHash(contract.chainHash)) {
    return false;
  }

  // Check status is valid
  const validStatuses: ContractStatus[] = ['PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'REJECTED'];
  if (!validStatuses.includes(contract.status)) {
    return false;
  }

  // Check timestamps are valid ISO8601
  if (isNaN(Date.parse(contract.createdAt))) {
    return false;
  }
  if (isNaN(Date.parse(contract.expiresAt))) {
    return false;
  }

  return true;
}

/**
 * Checks if contract is expired.
 *
 * @param contract - Contract to check
 * @param now - Current time (defaults to now)
 * @returns true if expired
 */
export function isContractExpired(
  contract: GenerationContract,
  now: Date = new Date()
): boolean {
  const expiresAt = new Date(contract.expiresAt);
  return now > expiresAt;
}

/**
 * Checks if contract can be executed.
 *
 * @param contract - Contract to check
 * @returns true if can be executed
 */
export function canExecuteContract(contract: GenerationContract): boolean {
  if (contract.status !== 'PENDING') {
    return false;
  }
  if (isContractExpired(contract)) {
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT STATUS UPDATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new contract with updated status.
 * Contracts are immutable - this creates a new copy.
 *
 * @param contract - Original contract
 * @param status - New status
 * @returns New contract with updated status
 */
export function updateContractStatus(
  contract: GenerationContract,
  status: ContractStatus
): SealedContract {
  return Object.freeze({
    ...contract,
    status,
  });
}

/**
 * Marks contract as executing.
 */
export function markContractExecuting(contract: GenerationContract): SealedContract {
  if (contract.status !== 'PENDING') {
    throw new Error(`Cannot execute contract in ${contract.status} status`);
  }
  return updateContractStatus(contract, 'EXECUTING');
}

/**
 * Marks contract as completed.
 */
export function markContractCompleted(contract: GenerationContract): SealedContract {
  if (contract.status !== 'EXECUTING') {
    throw new Error(`Cannot complete contract in ${contract.status} status`);
  }
  return updateContractStatus(contract, 'COMPLETED');
}

/**
 * Marks contract as failed.
 */
export function markContractFailed(contract: GenerationContract): SealedContract {
  if (contract.status !== 'EXECUTING') {
    throw new Error(`Cannot fail contract in ${contract.status} status`);
  }
  return updateContractStatus(contract, 'FAILED');
}

/**
 * Marks contract as rejected (e.g., policy violation discovered late).
 */
export function markContractRejected(contract: GenerationContract): SealedContract {
  return updateContractStatus(contract, 'REJECTED');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ContractId,
  GenerationParams,
  GenerationContract,
  SealedContract,
  ContractCreationOptions,
};
