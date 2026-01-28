/**
 * OMEGA Orchestrator Forge Adapter v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Adapter for Genesis Forge - MOCK_ONLY mode.
 * No actual LLM calls, deterministic mock generation.
 *
 * INVARIANTS:
 * - G-INV-02: All generation routed through Truth Gate
 * - G-INV-04: Deterministic seed for reproducible generation
 * - G-INV-10: Generation mode MOCK_ONLY
 * - G-INV-11: No network calls (mock mode)
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G6
 */

import { createHash } from 'crypto';
import type {
  GenerationContract,
  SealedContract,
  GenerationMode,
} from './generation-contract';
import {
  markContractExecuting,
  markContractCompleted,
  markContractFailed,
  markContractRejected,
  canExecuteContract,
  isContractExpired,
} from './generation-contract';

// ═══════════════════════════════════════════════════════════════════════════════
// FORGE ADAPTER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generation result from forge
 */
export interface ForgeResult {
  readonly contractId: string;
  readonly content: string;
  readonly generatedAt: string;
  readonly seed: number;
  readonly mockGenerated: boolean;
  readonly metadata: Readonly<{
    readonly tokenCount: number;
    readonly processingMs: number;
  }>;
}

/**
 * Forge adapter error
 */
export interface ForgeError {
  readonly code: string;
  readonly message: string;
  readonly contractId: string;
}

/**
 * Forge adapter response
 */
export type ForgeResponse =
  | { readonly success: true; readonly result: ForgeResult; readonly contract: SealedContract }
  | { readonly success: false; readonly error: ForgeError; readonly contract: SealedContract };

/**
 * Forge adapter interface
 */
export interface ForgeAdapter {
  readonly mode: GenerationMode;
  execute(contract: GenerationContract): Promise<ForgeResponse>;
  executeSync(contract: GenerationContract): ForgeResponse;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC MOCK GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple seeded random number generator (Mulberry32)
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mock text templates for deterministic generation
 */
const MOCK_TEMPLATES = Object.freeze([
  'This is a deterministically generated response based on the provided prompt.',
  'The following content was generated using mock mode with a fixed seed.',
  'Generated text: The narrative unfolds with careful consideration of the input.',
  'Mock generation complete. This output is reproducible given the same seed.',
  'Processing complete. The text was created in mock-only mode for testing.',
]);

/**
 * Generates deterministic mock content.
 * G-INV-04: Same seed = same output
 * G-INV-11: No network calls
 *
 * @param seed - Deterministic seed
 * @param maxLength - Maximum content length
 * @param prompt - Original prompt for context
 * @returns Generated mock content
 */
function generateMockContent(seed: number, maxLength: number, prompt: string): string {
  const random = createSeededRandom(seed);

  // Select template deterministically
  const templateIndex = Math.floor(random() * MOCK_TEMPLATES.length);
  const template = MOCK_TEMPLATES[templateIndex];

  // Generate content hash for uniqueness
  const contentHash = createHash('sha256')
    .update(String(seed))
    .update(prompt)
    .digest('hex')
    .slice(0, 8);

  // Build response
  const parts: string[] = [
    template,
    '',
    `[Mock Content ID: ${contentHash}]`,
    '',
    `Original prompt summary: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
    '',
    'Generated content follows the specified tone and constraints.',
  ];

  // Add padding to approach maxLength if needed (but stay under)
  const baseContent = parts.join('\n');
  if (baseContent.length < maxLength && maxLength > baseContent.length + 100) {
    const paddingNeeded = Math.min(maxLength - baseContent.length - 50, 500);
    if (paddingNeeded > 0) {
      parts.push('');
      parts.push('Additional mock content: ' + '.'.repeat(paddingNeeded));
    }
  }

  const content = parts.join('\n');

  // Ensure we don't exceed maxLength
  if (content.length > maxLength) {
    return content.slice(0, maxLength);
  }

  return content;
}

/**
 * Estimates token count from content (simple approximation)
 */
function estimateTokenCount(content: string): number {
  // Rough approximation: ~4 chars per token
  return Math.ceil(content.length / 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORGE ADAPTER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a mock-only forge adapter.
 *
 * G-INV-10: Always MOCK_ONLY mode
 * G-INV-11: No network calls
 *
 * @returns Forge adapter instance
 */
export function createForgeAdapter(): ForgeAdapter {
  return Object.freeze({
    mode: 'MOCK_ONLY' as GenerationMode,

    async execute(contract: GenerationContract): Promise<ForgeResponse> {
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 1));
      return this.executeSync(contract);
    },

    executeSync(contract: GenerationContract): ForgeResponse {
      const startTime = Date.now();

      // Validate contract can be executed
      if (!canExecuteContract(contract)) {
        const error: ForgeError = {
          code: 'CONTRACT_NOT_EXECUTABLE',
          message: isContractExpired(contract)
            ? 'Contract has expired'
            : `Contract status ${contract.status} is not executable`,
          contractId: contract.contractId,
        };

        // Return contract with REJECTED status (can't transition through EXECUTING)
        return Object.freeze({
          success: false,
          error: Object.freeze(error),
          contract: markContractRejected(contract),
        });
      }

      // G-INV-10: Verify MOCK_ONLY mode
      if (contract.mode !== 'MOCK_ONLY') {
        const error: ForgeError = {
          code: 'G-INV-10_VIOLATION',
          message: `Mode ${contract.mode} is not allowed. Only MOCK_ONLY is permitted.`,
          contractId: contract.contractId,
        };

        return Object.freeze({
          success: false,
          error: Object.freeze(error),
          contract: markContractFailed(markContractExecuting(contract)),
        });
      }

      // Mark as executing
      let executingContract = markContractExecuting(contract);

      try {
        // G-INV-04: Use deterministic seed
        const content = generateMockContent(
          contract.seed,
          contract.params.maxLength,
          contract.params.prompt
        );

        const processingMs = Date.now() - startTime;

        const result: ForgeResult = Object.freeze({
          contractId: contract.contractId,
          content,
          generatedAt: new Date().toISOString(),
          seed: contract.seed,
          mockGenerated: true,
          metadata: Object.freeze({
            tokenCount: estimateTokenCount(content),
            processingMs,
          }),
        });

        return Object.freeze({
          success: true,
          result,
          contract: markContractCompleted(executingContract),
        });
      } catch (error) {
        const forgeError: ForgeError = {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          contractId: contract.contractId,
        };

        return Object.freeze({
          success: false,
          error: Object.freeze(forgeError),
          contract: markContractFailed(executingContract),
        });
      }
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifies a forge result is deterministic.
 * Re-generates with same seed and compares.
 *
 * @param result - Result to verify
 * @param prompt - Original prompt
 * @param maxLength - Original maxLength
 * @returns true if deterministic
 */
export function verifyDeterministicResult(
  result: ForgeResult,
  prompt: string,
  maxLength: number
): boolean {
  const regenerated = generateMockContent(result.seed, maxLength, prompt);
  return regenerated === result.content;
}

/**
 * Verifies result was generated in mock mode.
 *
 * @param result - Result to check
 * @returns true if mock generated
 */
export function isMockGenerated(result: ForgeResult): boolean {
  return result.mockGenerated === true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ForgeResult,
  ForgeError,
  ForgeResponse,
  ForgeAdapter,
};
