// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — VALIDATORS
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod';
import {
  SceneSpec,
  SceneSpecSchema,
  ScribeRequest,
  ScribeRequestSchema,
  ScribeMode,
  Tense,
  Warning,
  SCRIBE_SCHEMA_VERSION
} from './types';
import {
  ScribeError,
  invalidRequest,
  missingPov,
  missingTense,
  emptyCanonScope,
  invalidLengthSpec,
  missingVoiceRef,
  invalidEntityId,
  invalidSchemaVersion,
  invalidMode,
  providerMissing
} from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// SCENESPEC VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a SceneSpec before execution
 * 
 * @invariant SCRIBE-I01: No critical field is optional
 * @invariant SCRIBE-I03: Canon read scope must be explicit
 * 
 * @param spec SceneSpec to validate
 * @throws ScribeError on validation failure
 */
export function validateSceneSpec(spec: unknown): SceneSpec {
  // First, Zod schema validation
  let parsed: SceneSpec;
  
  try {
    parsed = SceneSpecSchema.parse(spec);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const path = firstIssue.path.join('.');
      
      // Map Zod errors to specific ScribeErrors
      if (path.includes('pov')) {
        throw missingPov();
      }
      if (path.includes('tense')) {
        throw missingTense();
      }
      if (path.includes('canon_read_scope')) {
        throw emptyCanonScope();
      }
      if (path.includes('target_length')) {
        const target = (spec as any)?.target_length;
        throw invalidLengthSpec(
          target?.min_words ?? 0,
          target?.max_words ?? 0
        );
      }
      if (path.includes('voice_profile_ref')) {
        throw missingVoiceRef();
      }
      
      throw invalidRequest(`Schema validation failed: ${firstIssue.message} at ${path}`);
    }
    throw error;
  }
  
  // Additional business rule validations
  
  // 1. scene_id must not be empty
  if (!parsed.scene_id || parsed.scene_id.trim() === '') {
    throw invalidRequest('scene_id cannot be empty', { field: 'scene_id' });
  }
  
  // 2. POV entity_id format
  if (!isValidEntityId(parsed.pov.entity_id)) {
    throw invalidEntityId(parsed.pov.entity_id);
  }
  
  // 3. All entities in canon_read_scope must be valid
  for (const entityId of parsed.canon_read_scope) {
    if (!isValidEntityId(entityId)) {
      throw invalidEntityId(entityId);
    }
  }
  
  // 4. Schema version must match
  if (parsed.metadata.schema_version !== SCRIBE_SCHEMA_VERSION) {
    throw invalidSchemaVersion(
      parsed.metadata.schema_version,
      SCRIBE_SCHEMA_VERSION
    );
  }
  
  // 5. Length spec coherence (already in Zod, but double-check)
  if (parsed.target_length.min_words > parsed.target_length.max_words) {
    throw invalidLengthSpec(
      parsed.target_length.min_words,
      parsed.target_length.max_words
    );
  }
  
  // 6. Voice profile ref must be valid SHA-256
  if (!isValidSHA256(parsed.voice_profile_ref)) {
    throw invalidRequest(
      'voice_profile_ref must be a valid SHA-256 hash (64 hex characters)',
      { field: 'voice_profile_ref', actual: parsed.voice_profile_ref }
    );
  }
  
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRIBE REQUEST VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a ScribeRequest before execution
 * 
 * @param request Request to validate
 * @throws ScribeError on validation failure
 */
export function validateScribeRequest(request: unknown): ScribeRequest {
  // First, Zod schema validation
  let parsed: ScribeRequest;
  
  try {
    parsed = ScribeRequestSchema.parse(request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const path = firstIssue.path.join('.');
      
      throw invalidRequest(
        `Request validation failed: ${firstIssue.message} at ${path}`,
        { field: path }
      );
    }
    throw error;
  }
  
  // Validate nested SceneSpec
  validateSceneSpec(parsed.scene_spec);
  
  // Mode-specific validations
  switch (parsed.mode) {
    case 'RECORD':
      if (!parsed.provider_id) {
        throw providerMissing('RECORD');
      }
      break;
      
    case 'REPLAY':
      if (parsed.provider_id !== undefined) {
        throw invalidMode('REPLAY', 'provider_id must be absent in REPLAY mode');
      }
      break;
      
    case 'DRAFT':
      // provider_id is optional in DRAFT mode
      break;
  }
  
  // run_id must not be empty
  if (!parsed.run_id || parsed.run_id.trim() === '') {
    throw invalidRequest('run_id cannot be empty', { field: 'run_id' });
  }
  
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate generated output text
 * 
 * @param text Output text
 * @param sceneSpec Scene specification
 * @returns Array of warnings (non-blocking)
 */
export function validateOutput(
  text: string,
  sceneSpec: SceneSpec
): Warning[] {
  const warnings: Warning[] = [];
  
  // 1. Check for empty output
  if (!text || text.trim() === '') {
    warnings.push({
      code: 'EMPTY_OUTPUT',
      message: 'Generated output is empty',
      details: {}
    });
    return warnings;
  }
  
  // 2. Validate POV consistency (heuristic)
  const povWarnings = validatePovInText(text, sceneSpec.pov.entity_id);
  warnings.push(...povWarnings);
  
  // 3. Validate tense consistency
  const tenseWarnings = validateTenseInText(text, sceneSpec.tense);
  warnings.push(...tenseWarnings);
  
  return warnings;
}

/**
 * Validate POV consistency in text
 */
function validatePovInText(text: string, povEntityId: string): Warning[] {
  const warnings: Warning[] = [];
  
  // Extract name from entity_id (format: TYPE:NAME)
  const parts = povEntityId.split(':');
  if (parts.length !== 2) return warnings;
  
  const povName = parts[1].toLowerCase();
  const textLower = text.toLowerCase();
  
  // Check if POV character is mentioned (basic heuristic)
  // If POV is mentioned in first person, it's likely wrong for 3rd person narrative
  const firstPersonIndicators = ['je ', 'j\'', 'mon ', 'ma ', 'mes ', 'moi '];
  
  let firstPersonCount = 0;
  for (const indicator of firstPersonIndicators) {
    firstPersonCount += (textLower.match(new RegExp(indicator, 'g')) || []).length;
  }
  
  if (firstPersonCount > 5) {
    warnings.push({
      code: 'POV_FIRST_PERSON_DETECTED',
      message: 'Text appears to use first person narrative (je/moi) - expected third person',
      details: {
        expected_pov: povEntityId,
        first_person_count: String(firstPersonCount)
      }
    });
  }
  
  return warnings;
}

/**
 * Validate tense consistency in text
 */
function validateTenseInText(text: string, expectedTense: Tense): Warning[] {
  const warnings: Warning[] = [];
  const textLower = text.toLowerCase();
  
  // Tense indicators (French)
  const pastIndicators = [
    'était', 'avait', 'fut', 'alla', 'dit', 'vit', 'prit', 'fit',
    'étaient', 'avaient', 'furent', 'allèrent'
  ];
  
  const presentIndicators = [
    'est', 'a', 'va', 'dit', 'voit', 'prend', 'fait',
    'sont', 'ont', 'vont', 'disent'
  ];
  
  let pastCount = 0;
  let presentCount = 0;
  
  for (const indicator of pastIndicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    pastCount += (textLower.match(regex) || []).length;
  }
  
  for (const indicator of presentIndicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    presentCount += (textLower.match(regex) || []).length;
  }
  
  const total = pastCount + presentCount;
  if (total < 3) return warnings; // Not enough indicators
  
  const expectedCount = expectedTense === 'PAST' ? pastCount : presentCount;
  const unexpectedCount = expectedTense === 'PAST' ? presentCount : pastCount;
  
  const consistency = total > 0 ? expectedCount / total : 1;
  
  if (consistency < 0.6) {
    warnings.push({
      code: 'TENSE_INCONSISTENT',
      message: `Text appears to use wrong tense. Expected ${expectedTense}, found ${(consistency * 100).toFixed(0)}% consistency`,
      details: {
        expected: expectedTense,
        past_indicators: String(pastCount),
        present_indicators: String(presentCount),
        consistency: (consistency * 100).toFixed(1) + '%'
      }
    });
  }
  
  return warnings;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if string is a valid EntityId format
 */
function isValidEntityId(entityId: string): boolean {
  // Format: TYPE:ID (e.g., CHAR:VICK, LOC:PARIS)
  const regex = /^[A-Z_]+:[A-Z0-9_]+$/i;
  return regex.test(entityId);
}

/**
 * Check if string is a valid SHA-256 hash
 */
function isValidSHA256(hash: string): boolean {
  const regex = /^[a-f0-9]{64}$/i;
  return regex.test(hash);
}

/**
 * Sanitize string for safe use
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

/**
 * Validate mode string
 */
export function isValidMode(mode: string): mode is ScribeMode {
  return mode === 'DRAFT' || mode === 'RECORD' || mode === 'REPLAY';
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate multiple SceneSpecs
 * 
 * @param specs Array of SceneSpecs to validate
 * @returns Validation result for each
 */
export function validateSceneSpecs(
  specs: unknown[]
): Array<{ index: number; valid: boolean; error?: string }> {
  return specs.map((spec, index) => {
    try {
      validateSceneSpec(spec);
      return { index, valid: true };
    } catch (error) {
      return {
        index,
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Validators = {
  validateSceneSpec,
  validateScribeRequest,
  validateOutput,
  validateSceneSpecs,
  isValidEntityId,
  isValidSHA256,
  isValidMode,
  sanitizeString
};

export default Validators;
