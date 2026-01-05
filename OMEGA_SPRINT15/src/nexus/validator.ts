/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — VALIDATOR
 * Multi-layer validation (L1-L3)
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Validation Layers:
 * - L1: Syntaxe (JSON valid, types corrects)
 * - L2: Schéma (structure conforme au contrat)
 * - L3: Sémantique (valeurs cohérentes)
 */

import { ZodError } from 'zod';
import {
  NexusRequest,
  NexusRequestSchema,
  ValidationResult,
  ValidationError,
  NexusErrorCode,
  MAX_PAYLOAD_SIZE,
  ModuleTarget,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: SYNTAXE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * L1 Validation: Check if input is valid JSON and basic types
 * @param raw - Raw input (could be string or object)
 * @returns Parsed object or null if invalid
 */
export function validateL1(raw: unknown): { valid: boolean; parsed?: unknown; error?: ValidationError } {
  // If it's a string, try to parse as JSON
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return { valid: true, parsed };
    } catch {
      return {
        valid: false,
        error: {
          layer: 'L1',
          path: '',
          message: 'Invalid JSON syntax',
          code: NexusErrorCode.INVALID_JSON,
        },
      };
    }
  }
  
  // If it's an object, it's valid for L1
  if (typeof raw === 'object' && raw !== null) {
    return { valid: true, parsed: raw };
  }
  
  // Anything else is invalid
  return {
    valid: false,
    error: {
      layer: 'L1',
      path: '',
      message: `Expected object or JSON string, got ${typeof raw}`,
      code: NexusErrorCode.INVALID_JSON,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: SCHÉMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * L2 Validation: Check if object matches NexusRequest schema
 * @param parsed - Parsed object from L1
 * @returns Validation result with errors if any
 */
export function validateL2(parsed: unknown): { valid: boolean; request?: NexusRequest; errors: ValidationError[] } {
  const result = NexusRequestSchema.safeParse(parsed);
  
  if (result.success) {
    return { valid: true, request: result.data as NexusRequest, errors: [] };
  }
  
  // Convert Zod errors to ValidationErrors
  const errors: ValidationError[] = result.error.errors.map((zodError) => ({
    layer: 'L2' as const,
    path: zodError.path.join('.'),
    message: zodError.message,
    code: mapZodErrorToCode(zodError),
  }));
  
  return { valid: false, errors };
}

/**
 * Map Zod error to NexusErrorCode
 */
function mapZodErrorToCode(zodError: ZodError['errors'][0]): NexusErrorCode {
  const path = zodError.path.join('.');
  
  if (path.includes('request_id') || path.includes('session_id')) {
    return NexusErrorCode.INVALID_SCHEMA;
  }
  if (path.includes('module') || path.includes('action')) {
    return NexusErrorCode.INVALID_SCHEMA;
  }
  if (path.includes('seed')) {
    return NexusErrorCode.INVALID_SEED;
  }
  if (path.includes('timeout')) {
    return NexusErrorCode.INVALID_TIMEOUT;
  }
  if (path.includes('version_pin')) {
    return NexusErrorCode.INVALID_VERSION;
  }
  
  return NexusErrorCode.INVALID_SCHEMA;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: SÉMANTIQUE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * L3 Validation: Check semantic coherence
 * @param request - Validated NexusRequest from L2
 * @returns Validation result with errors if any
 */
export function validateL3(request: NexusRequest): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  // Rule 1: MUSE requires seed
  if (request.module === 'MUSE' && request.seed === undefined) {
    errors.push({
      layer: 'L3',
      path: 'seed',
      message: 'MUSE module requires seed parameter',
      code: NexusErrorCode.MISSING_REQUIRED,
    });
  }
  
  // Rule 2: Payload size check
  const payloadSize = getPayloadSize(request.payload);
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    errors.push({
      layer: 'L3',
      path: 'payload',
      message: `Payload size (${payloadSize} bytes) exceeds maximum (${MAX_PAYLOAD_SIZE} bytes)`,
      code: NexusErrorCode.PAYLOAD_TOO_LARGE,
    });
  }
  
  // Rule 3: Action must be valid for module
  const validActions = getValidActionsForModule(request.module);
  if (!validActions.includes(request.action)) {
    errors.push({
      layer: 'L3',
      path: 'action',
      message: `Invalid action '${request.action}' for module '${request.module}'. Valid actions: ${validActions.join(', ')}`,
      code: NexusErrorCode.INVALID_SCHEMA,
    });
  }
  
  // Rule 4: ORACLE requires text in payload
  if (request.module === 'ORACLE' && request.action === 'analyze') {
    if (!hasTextPayload(request.payload)) {
      errors.push({
        layer: 'L3',
        path: 'payload',
        message: 'ORACLE analyze action requires payload with text field',
        code: NexusErrorCode.INVALID_PAYLOAD,
      });
    }
  }
  
  // Rule 5: MUSE requires context in payload
  if (request.module === 'MUSE') {
    if (!hasContextPayload(request.payload)) {
      errors.push({
        layer: 'L3',
        path: 'payload',
        message: 'MUSE module requires payload with context field',
        code: NexusErrorCode.INVALID_PAYLOAD,
      });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get valid actions for a module
 */
function getValidActionsForModule(module: ModuleTarget): string[] {
  switch (module) {
    case 'ORACLE':
      return ['analyze'];
    case 'MUSE':
      return ['suggest', 'assess', 'project'];
    case 'PIPELINE':
      return ['run', 'segment', 'aggregate'];
    default:
      return [];
  }
}

/**
 * Calculate payload size in bytes
 */
function getPayloadSize(payload: unknown): number {
  if (payload === undefined || payload === null) {
    return 0;
  }
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

/**
 * Check if payload has text field
 */
function hasTextPayload(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  return 'text' in payload && typeof (payload as Record<string, unknown>).text === 'string';
}

/**
 * Check if payload has context field
 */
function hasContextPayload(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  return 'context' in payload;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full validation through all layers (L1 → L2 → L3)
 * @param raw - Raw input to validate
 * @returns Complete validation result
 */
export function validate(raw: unknown): ValidationResult {
  const allErrors: ValidationError[] = [];
  
  // L1: Syntaxe
  const l1Result = validateL1(raw);
  if (!l1Result.valid) {
    return {
      valid: false,
      errors: l1Result.error ? [l1Result.error] : [],
    };
  }
  
  // L2: Schéma
  const l2Result = validateL2(l1Result.parsed);
  if (!l2Result.valid) {
    return {
      valid: false,
      errors: l2Result.errors,
    };
  }
  
  // L3: Sémantique
  const l3Result = validateL3(l2Result.request!);
  if (!l3Result.valid) {
    return {
      valid: false,
      errors: l3Result.errors,
    };
  }
  
  // All layers passed
  return {
    valid: true,
    errors: [],
    request: l2Result.request,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Create validation error response
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format validation errors for response
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((e) => `[${e.layer}] ${e.path ? e.path + ': ' : ''}${e.message}`)
    .join('; ');
}

/**
 * Get primary error code from validation errors
 */
export function getPrimaryErrorCode(errors: ValidationError[]): NexusErrorCode {
  if (errors.length === 0) {
    return NexusErrorCode.INVALID_SCHEMA;
  }
  return errors[0].code;
}
