/**
 * OMEGA Truth Gate v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Main gate implementation: INPUT → F2 → F3 → F4 → F5 → F6 → OUTPUT
 *
 * INVARIANTS:
 * - F1-INV-01: All types immutable
 * - F1-INV-02: IDs deterministic
 * - F1-INV-03: No probabilistic logic
 * - F1-INV-04: Enums exhaustive
 *
 * SPEC: TRUTH_GATE_SPEC v1.0
 */

import type { ChainHash } from '../canon';
import { hashCanonical, sha256 } from '../shared/canonical';
import type {
  GateInput,
  GateOutput,
  ClassifiedFact,
  CanonViolation,
  VerdictResult,
  ProofManifest,
  QuarantineResult,
} from './types';
import { Verdict } from './types';
import { extractFacts } from './fact-extractor';
import { classifyFacts, getStrictFacts } from './fact-classifier';
import { matchAgainstCanon, type CanonReader } from './canon-matcher';
import { createVerdictResult, isPassed } from './verdict-engine';
import { createProofManifest, computeInputHash } from './proof-manifest';
import { createQuarantineResult } from './quarantine';

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH GATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Truth Gate configuration.
 */
export interface TruthGateConfig {
  /** CANON reader for validation */
  readonly canonReader: CanonReader;
  /** Optional CANON state hash (computed if not provided) */
  readonly canonStateHash?: ChainHash;
}

/**
 * Normalizes config to ensure canonReader is available.
 * Supports passing CanonReader directly or wrapped in config object.
 *
 * @param config - Config object or CanonReader directly
 * @returns Normalized config with canonReader
 */
function normalizeConfig(config: TruthGateConfig | CanonReader): TruthGateConfig {
  // Check if config is already a TruthGateConfig (has canonReader property)
  if ('canonReader' in config && config.canonReader !== undefined) {
    return config as TruthGateConfig;
  }
  // Otherwise, treat config as a CanonReader directly
  return { canonReader: config as CanonReader };
}

/**
 * Executes the truth gate pipeline.
 *
 * Pipeline: INPUT → F2 EXTRACT → F3 CLASSIFY → F4 MATCH → F5 VERDICT → F6 PROOF → OUTPUT
 *
 * F1-INV-01: All outputs are immutable
 * F1-INV-02: All IDs are deterministic
 * F1-INV-03: No probabilistic logic used
 *
 * @param input - Gate input (text to validate)
 * @param config - Gate configuration
 * @returns Gate output (PASS with text or FAIL with quarantine)
 */
export async function executeTruthGate(
  input: GateInput,
  config: TruthGateConfig | CanonReader
): Promise<GateOutput> {
  // Normalize config to handle both TruthGateConfig and direct CanonReader
  const normalizedConfig = normalizeConfig(config);

  // Step 1: Get CANON state hash
  const canonStateHash = normalizedConfig.canonStateHash ?? await computeCanonStateHash(normalizedConfig.canonReader);

  // Step 2: F2 - Extract facts from input
  const extractedFacts = extractFacts(input.text, input.context);

  // Step 3: F3 - Classify facts
  const classifiedFacts = classifyFacts(extractedFacts);

  // Step 4: F4 - Match FACT_STRICT against CANON
  const violations = await matchAgainstCanon(classifiedFacts, normalizedConfig.canonReader);

  // Step 5: F5 - Compute verdict
  const verdictResult = createVerdictResult(violations, classifiedFacts);

  // Step 6: F6 - Create proof manifest
  const proofManifest = createProofManifest(
    input.text,
    verdictResult,
    classifiedFacts,
    canonStateHash
  );

  // Step 7: Return output based on verdict
  if (isPassed(verdictResult)) {
    // PASS: Return validated text with proof
    return Object.freeze({
      passed: true,
      output: input.text,
      proof: proofManifest,
    });
  } else {
    // FAIL: Quarantine (no text output)
    const quarantine = createQuarantineResult(
      proofManifest,
      computeInputHash(input.text)
    );

    return Object.freeze({
      passed: false,
      quarantine,
    });
  }
}

/**
 * Computes CANON state hash from all claims.
 *
 * @param reader - CANON reader
 * @returns Hash of CANON state
 */
export async function computeCanonStateHash(reader: CanonReader): Promise<ChainHash> {
  const claims = await reader.getAllClaims();
  const claimIds = claims.map(c => c.id).sort();
  return sha256(claimIds.join(',')) as ChainHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STEPS (for testing/debugging)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline step results for debugging.
 */
export interface PipelineSteps {
  readonly input: GateInput;
  readonly extractedFacts: readonly ClassifiedFact[];
  readonly classifiedFacts: readonly ClassifiedFact[];
  readonly strictFacts: readonly ClassifiedFact[];
  readonly violations: readonly CanonViolation[];
  readonly verdict: VerdictResult;
  readonly proof: ProofManifest;
  readonly output: GateOutput;
}

/**
 * Executes the pipeline with intermediate results for debugging.
 *
 * @param input - Gate input
 * @param config - Gate configuration
 * @returns All pipeline steps
 */
export async function executePipelineWithSteps(
  input: GateInput,
  config: TruthGateConfig | CanonReader
): Promise<PipelineSteps> {
  // Normalize config to handle both TruthGateConfig and direct CanonReader
  const normalizedConfig = normalizeConfig(config);

  const canonStateHash = normalizedConfig.canonStateHash ?? await computeCanonStateHash(normalizedConfig.canonReader);

  // F2: Extract
  const extractedFacts = extractFacts(input.text, input.context);

  // F3: Classify
  const classifiedFacts = classifyFacts(extractedFacts);
  const strictFacts = getStrictFacts(classifiedFacts);

  // F4: Match
  const violations = await matchAgainstCanon(classifiedFacts, normalizedConfig.canonReader);

  // F5: Verdict
  const verdict = createVerdictResult(violations, classifiedFacts);

  // F6: Proof
  const proof = createProofManifest(input.text, verdict, classifiedFacts, canonStateHash);

  // Output
  const output = isPassed(verdict)
    ? Object.freeze({ passed: true as const, output: input.text, proof })
    : Object.freeze({
        passed: false as const,
        quarantine: createQuarantineResult(proof, computeInputHash(input.text)),
      });

  return Object.freeze({
    input,
    extractedFacts: classifiedFacts, // After classification
    classifiedFacts,
    strictFacts,
    violations,
    verdict,
    proof,
    output,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates text without full pipeline (quick check).
 *
 * @param text - Text to validate
 * @param reader - CANON reader
 * @returns true if text would pass, false if it would fail
 */
export async function quickValidate(
  text: string,
  reader: CanonReader
): Promise<boolean> {
  const facts = extractFacts(text);
  const classified = classifyFacts(facts);
  const violations = await matchAgainstCanon(classified, reader);
  return violations.length === 0;
}

/**
 * Gets potential violations without full pipeline.
 *
 * @param text - Text to check
 * @param reader - CANON reader
 * @returns Array of potential violations
 */
export async function getViolations(
  text: string,
  reader: CanonReader
): Promise<readonly CanonViolation[]> {
  const facts = extractFacts(text);
  const classified = classifyFacts(facts);
  return matchAgainstCanon(classified, reader);
}

/**
 * Checks if text contains any strict facts.
 *
 * @param text - Text to check
 * @returns true if strict facts found
 */
export function hasStrictFacts(text: string): boolean {
  const facts = extractFacts(text);
  const classified = classifyFacts(facts);
  return getStrictFacts(classified).length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (computeCanonStateHash is already exported inline)
// ═══════════════════════════════════════════════════════════════════════════════
