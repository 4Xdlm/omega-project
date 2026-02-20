/**
 * OMEGA Orchestrator v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Main orchestrator that coordinates the intent processing pipeline:
 * validate → normalize → policy → contract → forge-adapter → (truth-gate)
 *
 * INVARIANTS:
 * - G-INV-01: No fact injection via Intent
 * - G-INV-02: All generation routed through Truth Gate
 * - G-INV-03: Intent ≠ Truth (segregation)
 * - G-INV-04: Deterministic seed
 * - G-INV-05: Deterministic pipeline order
 * - G-INV-06: Append-only ledger
 * - G-INV-07: IntentId = SHA256(normalized_intent_content)
 * - G-INV-08: Policies from versioned config + lock hash
 * - G-INV-09: Forbidden patterns rejection
 * - G-INV-10: Generation mode MOCK_ONLY
 * - G-INV-11: No network calls
 * - G-INV-12: No dynamic imports
 * - G-INV-13: Fixed policies path
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G8
 */

import type {
  Intent,
  IntentId,
  ActorId,
  PolicyId,
  OrchestratorResult,
} from './types';
import type { RawIntentInput } from './intent-schema';
import { validateIntent, detectFactInjection } from './intent-validator';
import { normalizeRawIntent, type NormalizationResult } from './intent-normalizer';
import {
  createPolicyEngine,
  type PolicyEngine,
  type PolicyCheckResult,
} from './policy-engine';
import {
  createGenerationContract,
  type SealedContract,
  type GenerationContract,
} from './generation-contract';
import {
  createForgeAdapter,
  type ForgeAdapter,
  type ForgeResult,
  type ForgeResponse,
} from './forge-adapter';
import {
  createIntentLedger,
  type IntentLedger,
  type LedgerEntry,
} from './intent-ledger';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline stage
 */
export type PipelineStage =
  | 'VALIDATION'
  | 'NORMALIZATION'
  | 'POLICY_CHECK'
  | 'CONTRACT_CREATION'
  | 'GENERATION'
  | 'COMPLETED';

/**
 * Processing result with full details
 */
export interface ProcessingResult {
  readonly success: boolean;
  readonly stage: PipelineStage;
  readonly intentId: IntentId;
  readonly actorId: ActorId;
  readonly content?: string;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
  };
  readonly metadata: {
    readonly normalizedChanges?: readonly string[];
    readonly policyId?: PolicyId;
    readonly contractId?: string;
    readonly seed?: number;
    readonly processingMs: number;
  };
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  readonly basePath?: string;
}

/**
 * Orchestrator interface
 */
export interface Orchestrator {
  readonly policyEngine: PolicyEngine;
  readonly forgeAdapter: ForgeAdapter;
  readonly ledger: IntentLedger;
  process(input: RawIntentInput): Promise<ProcessingResult>;
  processSync(input: RawIntentInput): ProcessingResult;
  getIntentStatus(intentId: IntentId): string | undefined;
  getLedgerSnapshot(): readonly LedgerEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates the main orchestrator.
 *
 * G-INV-05: Pipeline stages execute in deterministic order
 * G-INV-08: Policy loaded with lock verification
 * G-INV-10: Forge adapter is MOCK_ONLY
 *
 * @param config - Orchestrator configuration
 * @returns Orchestrator instance
 */
export function createOrchestrator(config: OrchestratorConfig = {}): Orchestrator {
  // G-INV-08, G-INV-13: Load policy from fixed path with verification
  const policyEngine = createPolicyEngine(config.basePath);

  // G-INV-10, G-INV-11: Create mock-only forge adapter
  const forgeAdapter = createForgeAdapter();

  // G-INV-06: Create append-only ledger
  const ledger = createIntentLedger();

  return Object.freeze({
    policyEngine,
    forgeAdapter,
    ledger,

    async process(input: RawIntentInput): Promise<ProcessingResult> {
      // Simulate async behavior
      await new Promise(resolve => setTimeout(resolve, 1));
      return this.processSync(input);
    },

    processSync(input: RawIntentInput): ProcessingResult {
      const startTime = Date.now();

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 1: VALIDATION (G-INV-01, G-INV-07)
      // ─────────────────────────────────────────────────────────────────────

      // G-INV-01: Check for fact injection in raw input
      const hasFactInjection = detectFactInjection(input.payload);
      if (hasFactInjection) {
        // Create temporary intent for ledger tracking
        const tempIntent = normalizeRawIntent(input).normalized;

        ledger.append(tempIntent, 'RECEIVED');
        ledger.append(tempIntent, 'REJECTED', {
          reason: 'FACT_INJECTION',
        });

        return Object.freeze({
          success: false,
          stage: 'VALIDATION',
          intentId: tempIntent.intentId,
          actorId: tempIntent.actorId,
          error: Object.freeze({
            code: 'G-INV-01_VIOLATION',
            message: 'Fact injection detected in payload',
          }),
          metadata: Object.freeze({
            processingMs: Date.now() - startTime,
          }),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 2: NORMALIZATION (G-INV-05, G-INV-07)
      // ─────────────────────────────────────────────────────────────────────

      let normResult: NormalizationResult;
      try {
        normResult = normalizeRawIntent(input);
      } catch (error) {
        return Object.freeze({
          success: false,
          stage: 'NORMALIZATION',
          intentId: 'INT-error' as IntentId,
          actorId: input.actorId as ActorId,
          error: Object.freeze({
            code: 'NORMALIZATION_FAILED',
            message: error instanceof Error ? error.message : 'Normalization failed',
          }),
          metadata: Object.freeze({
            processingMs: Date.now() - startTime,
          }),
        });
      }

      const intent = normResult.normalized;

      // Log to ledger
      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');

      // G-INV-07: Validate intent ID matches content hash
      const validationResult = validateIntent(intent);
      if (!validationResult.valid) {
        ledger.append(intent, 'REJECTED', {
          reason: 'VALIDATION_FAILED',
          errors: validationResult.errors,
        });

        return Object.freeze({
          success: false,
          stage: 'VALIDATION',
          intentId: intent.intentId,
          actorId: intent.actorId,
          error: Object.freeze({
            code: 'VALIDATION_FAILED',
            message: validationResult.errors.join('; '),
          }),
          metadata: Object.freeze({
            normalizedChanges: normResult.changes,
            processingMs: Date.now() - startTime,
          }),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 3: POLICY CHECK (G-INV-08, G-INV-09)
      // ─────────────────────────────────────────────────────────────────────

      const policyResult = policyEngine.checkIntent(intent);

      if (!policyResult.allowed) {
        ledger.append(intent, 'REJECTED', {
          reason: 'POLICY_VIOLATION',
          violations: policyResult.violations,
        });

        return Object.freeze({
          success: false,
          stage: 'POLICY_CHECK',
          intentId: intent.intentId,
          actorId: intent.actorId,
          error: Object.freeze({
            code: 'POLICY_VIOLATION',
            message: `Policy violations: ${policyResult.violations.map(v => v.code).join(', ')}`,
            details: Object.freeze({
              violations: policyResult.violations,
            }),
          }),
          metadata: Object.freeze({
            normalizedChanges: normResult.changes,
            policyId: policyResult.policyId,
            processingMs: Date.now() - startTime,
          }),
        });
      }

      ledger.append(intent, 'POLICY_CHECKED');

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 4: CONTRACT CREATION (G-INV-04, G-INV-10)
      // ─────────────────────────────────────────────────────────────────────

      let contract: SealedContract;
      try {
        contract = createGenerationContract({
          intent,
          policyId: policyResult.policyId,
          previousChainHash: ledger.lastChainHash ?? undefined,
        });
      } catch (error) {
        ledger.append(intent, 'FAILED', {
          reason: 'CONTRACT_CREATION_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return Object.freeze({
          success: false,
          stage: 'CONTRACT_CREATION',
          intentId: intent.intentId,
          actorId: intent.actorId,
          error: Object.freeze({
            code: 'CONTRACT_CREATION_FAILED',
            message: error instanceof Error ? error.message : 'Contract creation failed',
          }),
          metadata: Object.freeze({
            normalizedChanges: normResult.changes,
            policyId: policyResult.policyId,
            processingMs: Date.now() - startTime,
          }),
        });
      }

      ledger.append(intent, 'CONTRACT_CREATED', {
        contractId: contract.contractId,
        seed: contract.seed,
      });

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 5: GENERATION (G-INV-10, G-INV-11)
      // ─────────────────────────────────────────────────────────────────────

      ledger.append(intent, 'GENERATING');

      const forgeResponse = forgeAdapter.executeSync(contract);

      if (!forgeResponse.success) {
        ledger.append(intent, 'FAILED', {
          reason: 'GENERATION_FAILED',
          error: forgeResponse.error,
        });

        return Object.freeze({
          success: false,
          stage: 'GENERATION',
          intentId: intent.intentId,
          actorId: intent.actorId,
          error: Object.freeze({
            code: forgeResponse.error.code,
            message: forgeResponse.error.message,
          }),
          metadata: Object.freeze({
            normalizedChanges: normResult.changes,
            policyId: policyResult.policyId,
            contractId: contract.contractId,
            seed: contract.seed,
            processingMs: Date.now() - startTime,
          }),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 6: COMPLETED
      // ─────────────────────────────────────────────────────────────────────

      ledger.append(intent, 'COMPLETED', {
        contentLength: forgeResponse.result.content.length,
        tokenCount: forgeResponse.result.metadata.tokenCount,
      });

      // G-INV-02, G-INV-03: Content goes through Truth Gate (not implemented in Phase G)
      // In production, this would route to Truth Gate for canon validation

      return Object.freeze({
        success: true,
        stage: 'COMPLETED',
        intentId: intent.intentId,
        actorId: intent.actorId,
        content: forgeResponse.result.content,
        metadata: Object.freeze({
          normalizedChanges: normResult.changes,
          policyId: policyResult.policyId,
          contractId: contract.contractId,
          seed: contract.seed,
          processingMs: Date.now() - startTime,
        }),
      });
    },

    getIntentStatus(intentId: IntentId): string | undefined {
      const entries = ledger.getEntriesByIntentId(intentId);
      if (entries.length === 0) {
        return undefined;
      }
      return entries[entries.length - 1].status;
    },

    getLedgerSnapshot(): readonly LedgerEntry[] {
      return ledger.getAllEntries();
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Processes a single intent through the full pipeline.
 * Convenience function for one-off processing.
 *
 * @param input - Raw intent input
 * @param basePath - Optional base path for policy files
 * @returns Processing result
 */
export function processIntent(
  input: RawIntentInput,
  basePath?: string
): ProcessingResult {
  const orchestrator = createOrchestrator({ basePath });
  return orchestrator.processSync(input);
}

/**
 * Validates and normalizes an intent without processing.
 * Useful for pre-flight checks.
 *
 * @param input - Raw intent input
 * @returns Normalized intent and validation info
 */
export function preflightIntent(input: RawIntentInput): {
  valid: boolean;
  intent?: Intent;
  errors?: string[];
} {
  // Check for fact injection
  const factInjection = detectFactInjection(input.payload);
  if (factInjection.detected) {
    return {
      valid: false,
      errors: ['Fact injection detected in payload'],
    };
  }

  // Normalize
  const { normalized } = normalizeRawIntent(input);

  // Validate
  const validation = validateIntent(normalized);

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  return {
    valid: true,
    intent: normalized,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  PipelineStage,
  ProcessingResult,
  OrchestratorConfig,
  Orchestrator,
};
