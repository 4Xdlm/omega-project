// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — RUNNER (Main Orchestrator)
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import {
  ScribeRequest,
  ScribeResult,
  ScribeProof,
  ScribeMode,
  HashHex,
  Violation,
  Warning,
  StagedFact
} from './types';
import {
  ScribeError,
  replayProviderCall,
  providerError,
  invariantViolated,
  wrapError
} from './errors';
import { validateScribeRequest, validateOutput } from './validators';
import { buildPrompt, PromptBuildResult } from './prompt_builder';
import { 
  sha256, 
  hashJson, 
  canonicalizeOutput 
} from './canonicalize';
import {
  ScribeRecordStore,
  computeRequestHash,
  getDefaultRecordStore
} from './record_replay';
import { analyzeCompliance, ComplianceResult, type VoiceGuidance } from './scoring';
import { extractStagedFacts, CanonSnapshot } from './staging';
import { ScribeProvider, MockScribeProvider } from './mock_provider';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runner configuration
 */
export interface ScribeRunnerConfig {
  recordStore?: ScribeRecordStore;
  defaultProvider?: ScribeProvider;
}

/**
 * Internal execution context
 */
interface ExecutionContext {
  request: ScribeRequest;
  scene_spec_hash: HashHex;
  canon_snapshot_hash: HashHex;
  guidance_hash: HashHex;
  request_hash: HashHex;
  prompt_result: PromptBuildResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRIBE RUNNER CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ScribeRunner — Main orchestrator for SCRIBE execution
 * 
 * Pipeline:
 * 1. Validate request
 * 2. Compute hashes (deterministic proof)
 * 3. Build prompt
 * 4. Generate or Replay
 * 5. Canonicalize output
 * 6. Score compliance
 * 7. Extract staged facts
 * 8. Build result with proof
 * 
 * @invariant SCRIBE-I01 to SCRIBE-I14: All invariants enforced
 */
export class ScribeRunner {
  private readonly recordStore: ScribeRecordStore;
  private readonly defaultProvider: ScribeProvider | null;
  
  constructor(config: ScribeRunnerConfig = {}) {
    this.recordStore = config.recordStore || getDefaultRecordStore();
    this.defaultProvider = config.defaultProvider || null;
  }
  
  /**
   * Execute SCRIBE pipeline
   * 
   * @param request ScribeRequest
   * @param provider Optional provider (required for DRAFT/RECORD if no default)
   * @returns ScribeResult with text, proof, and metadata
   * @throws ScribeError on failure
   */
  async run(
    request: ScribeRequest,
    provider?: ScribeProvider
  ): Promise<ScribeResult> {
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: VALIDATION
    // ═══════════════════════════════════════════════════════════════════════
    
    const validatedRequest = validateScribeRequest(request);
    
    // Resolve provider
    const resolvedProvider = provider || this.defaultProvider;
    
    // Validate mode-specific requirements
    if (validatedRequest.mode === 'REPLAY' && resolvedProvider) {
      // Warning: provider provided but will be ignored in REPLAY
    }
    
    if ((validatedRequest.mode === 'DRAFT' || validatedRequest.mode === 'RECORD') && !resolvedProvider) {
      throw invariantViolated(
        'SCRIBE-PROVIDER',
        `Provider required for ${validatedRequest.mode} mode`
      );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: COMPUTE HASHES (Deterministic Proof)
    // ═══════════════════════════════════════════════════════════════════════
    
    const context = this.buildExecutionContext(validatedRequest);
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3-4: GENERATE OR REPLAY
    // ═══════════════════════════════════════════════════════════════════════
    
    let raw_output: string;
    let record_hash: HashHex | undefined;
    let provider_id: string;
    
    switch (validatedRequest.mode) {
      case 'REPLAY':
        const replayResult = await this.executeReplay(context);
        raw_output = replayResult.raw_output;
        record_hash = replayResult.record_hash;
        provider_id = 'replay';
        break;
        
      case 'RECORD':
        const recordResult = await this.executeRecord(context, resolvedProvider!);
        raw_output = recordResult.raw_output;
        record_hash = recordResult.record_hash;
        provider_id = validatedRequest.provider_id!;
        break;
        
      case 'DRAFT':
      default:
        const draftResult = await this.executeDraft(context, resolvedProvider!);
        raw_output = draftResult.raw_output;
        record_hash = undefined;
        provider_id = resolvedProvider?.providerId || 'unknown';
        break;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 5: CANONICALIZE OUTPUT
    // ═══════════════════════════════════════════════════════════════════════
    
    const canonical_output = canonicalizeOutput(raw_output);
    const output_hash = sha256(canonical_output);
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 6: SCORE COMPLIANCE
    // ═══════════════════════════════════════════════════════════════════════
    
    const compliance = analyzeCompliance(
      canonical_output,
      validatedRequest.scene_spec,
      validatedRequest.voice_guidance as VoiceGuidance
    );
    
    // Validate score bounds — INVARIANT SCRIBE-I10
    if (compliance.score < 0 || compliance.score > 1) {
      throw invariantViolated(
        'SCRIBE-I10',
        `Score ${compliance.score} out of bounds [0, 1]`
      );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 7: EXTRACT STAGED FACTS
    // ═══════════════════════════════════════════════════════════════════════
    
    const extraction = extractStagedFacts(
      canonical_output,
      validatedRequest.scene_spec,
      validatedRequest.canon_snapshot as CanonSnapshot
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 8: BUILD RESULT
    // ═══════════════════════════════════════════════════════════════════════
    
    // Validate output (non-blocking warnings)
    const outputWarnings = validateOutput(canonical_output, validatedRequest.scene_spec);
    
    // Merge all warnings
    const allWarnings: Warning[] = [
      ...compliance.warnings,
      ...extraction.warnings,
      ...outputWarnings
    ];
    
    // Build proof
    const proof: ScribeProof = {
      run_id: validatedRequest.run_id,
      scene_spec_hash: context.scene_spec_hash,
      canon_snapshot_hash: context.canon_snapshot_hash,
      guidance_hash: context.guidance_hash,
      constraint_hash: context.prompt_result.constraint_hash,
      prompt_hash: context.prompt_result.prompt_hash,
      record_hash,
      output_hash,
      mode: validatedRequest.mode,
      provider_id
    };
    
    // Build result
    const result: ScribeResult = {
      text: canonical_output,
      compliance_score: compliance.score,
      violations: compliance.violations,
      warnings: allWarnings,
      staged_facts: extraction.staged_facts,
      proof
    };
    
    return result;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL: Context Building
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Build execution context with all hashes
   */
  private buildExecutionContext(request: ScribeRequest): ExecutionContext {
    // Compute input hashes
    const scene_spec_hash = hashJson(request.scene_spec);
    const canon_snapshot_hash = hashJson(request.canon_snapshot);
    const guidance_hash = hashJson(request.voice_guidance);
    
    // Build prompt
    const prompt_result = buildPrompt(request);
    
    // Compute request hash
    const request_hash = computeRequestHash(
      scene_spec_hash,
      canon_snapshot_hash,
      guidance_hash,
      prompt_result.constraint_hash,
      request.seed
    );
    
    return {
      request,
      scene_spec_hash,
      canon_snapshot_hash,
      guidance_hash,
      request_hash,
      prompt_result
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL: Mode Executors
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Execute in DRAFT mode
   */
  private async executeDraft(
    context: ExecutionContext,
    provider: ScribeProvider
  ): Promise<{ raw_output: string }> {
    try {
      const raw_output = await provider.generate(context.prompt_result.prompt);
      return { raw_output };
    } catch (error) {
      throw wrapError(error);
    }
  }
  
  /**
   * Execute in RECORD mode
   */
  private async executeRecord(
    context: ExecutionContext,
    provider: ScribeProvider
  ): Promise<{ raw_output: string; record_hash: HashHex }> {
    // Generate
    let raw_output: string;
    try {
      raw_output = await provider.generate(context.prompt_result.prompt);
    } catch (error) {
      throw providerError(provider.providerId, (error as Error).message, error as Error);
    }
    
    // Write record
    const recordResult = await this.recordStore.writeRecord({
      run_id: context.request.run_id,
      request_hash: context.request_hash,
      prompt_hash: context.prompt_result.prompt_hash,
      provider_id: context.request.provider_id!,
      raw_output
    });
    
    return {
      raw_output,
      record_hash: recordResult.record_hash
    };
  }
  
  /**
   * Execute in REPLAY mode
   * 
   * @invariant SCRIBE-I09: Provider call forbidden in REPLAY
   */
  private async executeReplay(
    context: ExecutionContext
  ): Promise<{ raw_output: string; record_hash: HashHex }> {
    // Read and verify record
    const replayResult = await this.recordStore.readAndVerify({
      run_id: context.request.run_id,
      expected_request_hash: context.request_hash,
      expected_prompt_hash: context.prompt_result.prompt_hash
    });
    
    return {
      raw_output: replayResult.raw_output,
      record_hash: replayResult.record_hash
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a ScribeRunner with default configuration
 */
export function createScribeRunner(config?: ScribeRunnerConfig): ScribeRunner {
  return new ScribeRunner(config);
}

/**
 * Create a ScribeRunner with mock provider (for testing)
 */
export function createMockScribeRunner(seed: number = 42): ScribeRunner {
  return new ScribeRunner({
    defaultProvider: new MockScribeProvider({ seed })
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE: Run once
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run SCRIBE once with a request and provider
 */
export async function runScribe(
  request: ScribeRequest,
  provider: ScribeProvider
): Promise<ScribeResult> {
  const runner = createScribeRunner();
  return runner.run(request, provider);
}

/**
 * Run SCRIBE in mock mode (for testing)
 */
export async function runScribeMock(
  request: ScribeRequest,
  seed: number = 42
): Promise<ScribeResult> {
  const runner = createMockScribeRunner(seed);
  return runner.run(request);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Runner = {
  ScribeRunner,
  createScribeRunner,
  createMockScribeRunner,
  runScribe,
  runScribeMock
};

export default Runner;
