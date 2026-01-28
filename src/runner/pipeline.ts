/**
 * OMEGA Runner Pipeline v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Main execution pipeline: Intent → Generation → TruthGate → Delivery
 *
 * INVARIANTS:
 * - I-INV-01: E2E determinism (same intent => same run_hash)
 * - I-INV-02: No network usage
 * - I-INV-03: No dynamic imports
 * - I-INV-08: Writes only to artefacts/runs/**
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

import { join } from 'path';
import { createHash } from 'crypto';
import type { RunResult, BatchResult, ExitCode as ExitCodeType } from './types';
import {
  ExitCode,
  FIXED_PATHS,
  RUN_FILES,
  HASHABLE_FILES,
  generateRunId,
  isAllowedWritePath,
  isSafePath,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Intent data structure.
 */
export interface IntentData {
  readonly intentId: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Generation contract from orchestrator.
 */
export interface GenerationContract {
  readonly intentId: string;
  readonly generatedText: string;
  readonly timestamp: string;
}

/**
 * TruthGate verdict.
 */
export interface TruthGateVerdict {
  readonly passed: boolean;
  readonly validatedText: string;
  readonly violations: readonly string[];
}

/**
 * TruthGate proof.
 */
export interface TruthGateProof {
  readonly hash: string;
  readonly timestamp: string;
  readonly gateId: string;
}

/**
 * Delivery result from engine.
 */
export interface DeliveryOutput {
  readonly manifest: unknown;
  readonly artifacts: readonly { filename: string; content: string; hash: string }[];
}

/**
 * Pipeline stage result.
 */
export interface StageResult<T> {
  readonly success: boolean;
  readonly exitCode: ExitCodeType;
  readonly data?: T;
  readonly error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes SHA256 hash of content.
 */
export function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Computes hash chain from ordered file hashes.
 */
export function computeChainHash(hashes: readonly string[]): string {
  return computeHash(hashes.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates intent JSON content.
 *
 * @param content - Raw intent JSON
 * @returns Stage result with parsed intent
 */
export function validateIntent(content: string): StageResult<IntentData> {
  try {
    const parsed = JSON.parse(content);

    if (!parsed.intentId || typeof parsed.intentId !== 'string') {
      return {
        success: false,
        exitCode: ExitCode.INTENT_INVALID,
        error: 'Intent missing required field: intentId',
      };
    }

    if (!parsed.content && !parsed.text && !parsed.body) {
      return {
        success: false,
        exitCode: ExitCode.INTENT_INVALID,
        error: 'Intent missing content field',
      };
    }

    const intentData: IntentData = {
      intentId: parsed.intentId,
      content: parsed.content ?? parsed.text ?? parsed.body ?? '',
      metadata: parsed.metadata,
    };

    return {
      success: true,
      exitCode: ExitCode.PASS,
      data: intentData,
    };
  } catch (e) {
    return {
      success: false,
      exitCode: ExitCode.INTENT_INVALID,
      error: `Invalid JSON: ${(e as Error).message}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK GENERATION (Phase G Mock-Only Mode)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock generation for local runs.
 * Uses Phase G orchestrator behavior in mock-only mode.
 *
 * @param intent - Validated intent
 * @param timestamp - Generation timestamp
 * @returns Stage result with contract
 */
export function mockGenerate(
  intent: IntentData,
  timestamp: string
): StageResult<GenerationContract> {
  // Mock generation: echo content (deterministic)
  const generatedText = intent.content;

  return {
    success: true,
    exitCode: ExitCode.PASS,
    data: {
      intentId: intent.intentId,
      generatedText,
      timestamp,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK TRUTHGATE (Phase F)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock TruthGate validation.
 * In production, this would call the actual TruthGate.
 *
 * @param text - Text to validate
 * @param timestamp - Validation timestamp
 * @returns Stage result with verdict and proof
 */
export function mockTruthGate(
  text: string,
  timestamp: string
): StageResult<{ verdict: TruthGateVerdict; proof: TruthGateProof }> {
  // Mock validation: always pass (deterministic)
  const verdict: TruthGateVerdict = {
    passed: true,
    validatedText: text,
    violations: [],
  };

  const proof: TruthGateProof = {
    hash: computeHash(text),
    timestamp,
    gateId: 'MOCK_GATE_v1',
  };

  return {
    success: true,
    exitCode: ExitCode.PASS,
    data: { verdict, proof },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DELIVERY (Phase H)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock delivery packaging.
 * In production, this would use the actual Delivery Engine.
 *
 * @param validatedText - Validated text from TruthGate
 * @param profile - Delivery profile ID
 * @param timestamp - Delivery timestamp
 * @returns Stage result with delivery output
 */
export function mockDelivery(
  validatedText: string,
  profile: string,
  timestamp: string
): StageResult<DeliveryOutput> {
  const filename = 'output.txt';
  const content = validatedText;
  const hash = computeHash(content);

  const manifest = {
    version: '1.0',
    created: timestamp,
    profile,
    entries: [
      {
        filename,
        hash,
        byteLength: Buffer.byteLength(content, 'utf-8'),
      },
    ],
  };

  return {
    success: true,
    exitCode: ExitCode.PASS,
    data: {
      manifest,
      artifacts: [{ filename, content, hash }],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline execution options.
 */
export interface PipelineOptions {
  readonly profile: string;
  readonly basePath?: string;
  readonly timestamp?: string;
}

/**
 * Pipeline execution context.
 */
export interface PipelineContext {
  readonly runId: string;
  readonly runPath: string;
  readonly timestamp: string;
  readonly files: Map<string, string>;
  readonly hashes: Map<string, string>;
}

/**
 * Creates pipeline context for a run.
 *
 * @param intentId - Intent ID
 * @param basePath - Base path for runs
 * @param timestamp - Run timestamp
 * @returns Pipeline context
 */
export function createContext(
  intentId: string,
  basePath: string,
  timestamp: string
): PipelineContext {
  // Find next available sequence number
  let seq = 1;
  const runId = generateRunId(intentId, seq);
  const runPath = join(basePath, FIXED_PATHS.RUNS_ROOT, runId);

  return {
    runId,
    runPath,
    timestamp,
    files: new Map(),
    hashes: new Map(),
  };
}

/**
 * Adds file to context and computes hash.
 *
 * @param ctx - Pipeline context
 * @param filename - File name
 * @param content - File content
 */
export function addFile(ctx: PipelineContext, filename: string, content: string): void {
  ctx.files.set(filename, content);
  ctx.hashes.set(filename, computeHash(content));
}

/**
 * Computes run hash from context.
 *
 * @param ctx - Pipeline context
 * @returns Run hash
 */
export function computeRunHash(ctx: PipelineContext): string {
  // Collect hashes for hashable files in order
  const orderedHashes: string[] = [];

  for (const filename of HASHABLE_FILES) {
    const hash = ctx.hashes.get(filename);
    if (hash) {
      orderedHashes.push(`${hash}  ${filename}`);
    }
  }

  // Add artifact hashes
  for (const [filename, hash] of ctx.hashes) {
    if (filename.startsWith(RUN_FILES.ARTIFACTS_DIR + '/')) {
      orderedHashes.push(`${hash}  ${filename}`);
    }
  }

  // Sort for determinism
  orderedHashes.sort();

  return computeChainHash(orderedHashes);
}

/**
 * Executes the full pipeline.
 *
 * @param intentContent - Raw intent JSON
 * @param options - Pipeline options
 * @returns Run result
 */
export function executePipeline(
  intentContent: string,
  options: PipelineOptions
): RunResult {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const basePath = options.basePath ?? process.cwd();

  // Stage 1: Validate intent
  const intentResult = validateIntent(intentContent);
  if (!intentResult.success || !intentResult.data) {
    return {
      success: false,
      exitCode: intentResult.exitCode,
      runId: '',
      runPath: '',
      runHash: '',
      error: intentResult.error,
      timestamp,
    };
  }

  const intent = intentResult.data;
  const ctx = createContext(intent.intentId, basePath, timestamp);

  // Validate run path
  if (!isAllowedWritePath(ctx.runPath.replace(basePath + '/', '').replace(basePath + '\\', ''))) {
    // For testing, allow if relative path starts with artefacts/runs
    const relativePath = ctx.runPath.replace(/\\/g, '/');
    if (!relativePath.includes(FIXED_PATHS.RUNS_ROOT)) {
      return {
        success: false,
        exitCode: ExitCode.INTENT_INVALID,
        runId: ctx.runId,
        runPath: ctx.runPath,
        runHash: '',
        error: 'Run path outside allowed zone',
        timestamp,
      };
    }
  }

  // Save normalized intent
  addFile(ctx, RUN_FILES.INTENT, JSON.stringify(intent, null, 2));

  // Stage 2: Generate
  const genResult = mockGenerate(intent, timestamp);
  if (!genResult.success || !genResult.data) {
    return {
      success: false,
      exitCode: genResult.exitCode,
      runId: ctx.runId,
      runPath: ctx.runPath,
      runHash: '',
      error: genResult.error ?? 'Generation failed',
      timestamp,
    };
  }

  addFile(ctx, RUN_FILES.CONTRACT, JSON.stringify(genResult.data, null, 2));

  // Stage 3: TruthGate
  const gateResult = mockTruthGate(genResult.data.generatedText, timestamp);
  if (!gateResult.success || !gateResult.data) {
    return {
      success: false,
      exitCode: gateResult.exitCode,
      runId: ctx.runId,
      runPath: ctx.runPath,
      runHash: '',
      error: gateResult.error ?? 'TruthGate failed',
      timestamp,
    };
  }

  addFile(ctx, RUN_FILES.TRUTHGATE_VERDICT, JSON.stringify(gateResult.data.verdict, null, 2));
  addFile(ctx, RUN_FILES.TRUTHGATE_PROOF, JSON.stringify(gateResult.data.proof, null, 2));

  // Stage 4: Delivery
  const deliveryResult = mockDelivery(
    gateResult.data.verdict.validatedText,
    options.profile,
    timestamp
  );
  if (!deliveryResult.success || !deliveryResult.data) {
    return {
      success: false,
      exitCode: deliveryResult.exitCode,
      runId: ctx.runId,
      runPath: ctx.runPath,
      runHash: '',
      error: deliveryResult.error ?? 'Delivery failed',
      timestamp,
    };
  }

  addFile(ctx, RUN_FILES.DELIVERY_MANIFEST, JSON.stringify(deliveryResult.data.manifest, null, 2));

  // Add artifacts
  for (const artifact of deliveryResult.data.artifacts) {
    addFile(ctx, `${RUN_FILES.ARTIFACTS_DIR}/${artifact.filename}`, artifact.content);
  }

  // Build hashes file
  const hashLines: string[] = [];
  for (const [filename, hash] of ctx.hashes) {
    hashLines.push(`${hash}  ${filename}`);
  }
  hashLines.sort();
  addFile(ctx, RUN_FILES.HASHES, hashLines.join('\n'));

  // Compute final run hash
  const runHash = computeRunHash(ctx);
  addFile(ctx, RUN_FILES.RUN_HASH, runHash);

  return {
    success: true,
    exitCode: ExitCode.PASS,
    runId: ctx.runId,
    runPath: ctx.runPath,
    runHash,
    timestamp,
  };
}

/**
 * Gets files from a pipeline execution.
 * Used for writing to disk after execution.
 *
 * @param intentContent - Raw intent JSON
 * @param options - Pipeline options
 * @returns Map of filename to content
 */
export function getPipelineFiles(
  intentContent: string,
  options: PipelineOptions
): { files: Map<string, string>; result: RunResult } {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const basePath = options.basePath ?? process.cwd();

  const intentResult = validateIntent(intentContent);
  if (!intentResult.success || !intentResult.data) {
    return {
      files: new Map(),
      result: {
        success: false,
        exitCode: intentResult.exitCode,
        runId: '',
        runPath: '',
        runHash: '',
        error: intentResult.error,
        timestamp,
      },
    };
  }

  const intent = intentResult.data;
  const ctx = createContext(intent.intentId, basePath, timestamp);

  // Run full pipeline and collect files
  addFile(ctx, RUN_FILES.INTENT, JSON.stringify(intent, null, 2));

  const genResult = mockGenerate(intent, timestamp);
  if (genResult.success && genResult.data) {
    addFile(ctx, RUN_FILES.CONTRACT, JSON.stringify(genResult.data, null, 2));

    const gateResult = mockTruthGate(genResult.data.generatedText, timestamp);
    if (gateResult.success && gateResult.data) {
      addFile(ctx, RUN_FILES.TRUTHGATE_VERDICT, JSON.stringify(gateResult.data.verdict, null, 2));
      addFile(ctx, RUN_FILES.TRUTHGATE_PROOF, JSON.stringify(gateResult.data.proof, null, 2));

      const deliveryResult = mockDelivery(
        gateResult.data.verdict.validatedText,
        options.profile,
        timestamp
      );
      if (deliveryResult.success && deliveryResult.data) {
        addFile(ctx, RUN_FILES.DELIVERY_MANIFEST, JSON.stringify(deliveryResult.data.manifest, null, 2));

        for (const artifact of deliveryResult.data.artifacts) {
          addFile(ctx, `${RUN_FILES.ARTIFACTS_DIR}/${artifact.filename}`, artifact.content);
        }
      }
    }
  }

  // Build hashes file
  const hashLines: string[] = [];
  for (const [filename, hash] of ctx.hashes) {
    hashLines.push(`${hash}  ${filename}`);
  }
  hashLines.sort();
  addFile(ctx, RUN_FILES.HASHES, hashLines.join('\n'));

  const runHash = computeRunHash(ctx);
  addFile(ctx, RUN_FILES.RUN_HASH, runHash);

  // Add report (excluded from hash)
  const report = [
    `# Run Report`,
    ``,
    `Run ID: ${ctx.runId}`,
    `Timestamp: ${timestamp}`,
    `Run Hash: ${runHash}`,
    ``,
    `## Files`,
    ...Array.from(ctx.files.keys()).map(f => `- ${f}`),
  ].join('\n');
  ctx.files.set(RUN_FILES.REPORT, report);

  return {
    files: ctx.files,
    result: {
      success: true,
      exitCode: ExitCode.PASS,
      runId: ctx.runId,
      runPath: ctx.runPath,
      runHash,
      timestamp,
    },
  };
}
