/**
 * OMEGA Phase C — JSON Schema Validator
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * Purpose:
 * - Runtime validation against JSON schemas
 * - Typed validation errors
 * - No external dependencies (manual validation)
 */

import { loadSchema, SchemaId } from './index.js';
import { SentinelJudgeError, ERROR_CODES, PATTERNS } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationError {
  path: string;
  message: string;
  expected?: string;
  actual?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA REFERENCE RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolves a $ref to the actual schema definition.
 * Supports local references like "#/definitions/Proof"
 */
function resolveRef(
  ref: string,
  rootSchema: Record<string, unknown>
): Record<string, unknown> | null {
  if (!ref.startsWith('#/')) {
    // Only local refs supported
    return null;
  }
  
  const path = ref.slice(2).split('/');
  let current: unknown = rootSchema;
  
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in (current as object)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  
  return current as Record<string, unknown> | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE VALIDATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates a value against a JSON schema.
 * Implements subset of JSON Schema Draft-07.
 * 
 * @param value - Value to validate
 * @param schema - JSON Schema object
 * @param rootSchema - Root schema (for $ref resolution)
 * @param path - Current path (for error messages)
 * @returns ValidationResult
 */
function validateAgainstSchema(
  value: unknown,
  schema: Record<string, unknown>,
  rootSchema: Record<string, unknown>,
  path: string = '$'
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Resolve $ref if present
  if (schema.$ref && typeof schema.$ref === 'string') {
    const resolvedSchema = resolveRef(schema.$ref, rootSchema);
    if (!resolvedSchema) {
      errors.push({
        path,
        message: `Cannot resolve $ref: ${schema.$ref}`,
        expected: 'valid $ref',
        actual: String(schema.$ref),
      });
      return { valid: false, errors };
    }
    return validateAgainstSchema(value, resolvedSchema, rootSchema, path);
  }
  
  // Handle null
  if (value === null) {
    if (schema.type && schema.type !== 'null') {
      errors.push({
        path,
        message: 'Value is null but schema does not allow null',
        expected: String(schema.type),
        actual: 'null',
      });
    }
    return { valid: errors.length === 0, errors };
  }
  
  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const expectedType = schema.type as string;
    
    if (actualType !== expectedType) {
      errors.push({
        path,
        message: `Expected type '${expectedType}', got '${actualType}'`,
        expected: expectedType,
        actual: actualType,
      });
      return { valid: false, errors };
    }
  }
  
  // String validation
  if (typeof value === 'string') {
    // Pattern
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern as string);
      if (!regex.test(value)) {
        errors.push({
          path,
          message: `String does not match pattern: ${schema.pattern}`,
          expected: String(schema.pattern),
          actual: value,
        });
      }
    }
    
    // MinLength
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push({
        path,
        message: `String length ${value.length} is less than minimum ${schema.minLength}`,
        expected: `minLength: ${schema.minLength}`,
        actual: String(value.length),
      });
    }
    
    // Enum
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      errors.push({
        path,
        message: `Value '${value}' is not in enum: [${schema.enum.join(', ')}]`,
        expected: schema.enum.join(' | '),
        actual: value,
      });
    }
    
    // Format (basic support)
    if (schema.format === 'date-time') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push({
          path,
          message: 'Invalid date-time format',
          expected: 'ISO 8601 date-time',
          actual: value,
        });
      }
    }
  }
  
  // Number validation
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push({
        path,
        message: `Number ${value} is less than minimum ${schema.minimum}`,
        expected: `>= ${schema.minimum}`,
        actual: String(value),
      });
    }
  }
  
  // Array validation
  if (Array.isArray(value)) {
    // MinItems
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push({
        path,
        message: `Array length ${value.length} is less than minimum ${schema.minItems}`,
        expected: `minItems: ${schema.minItems}`,
        actual: String(value.length),
      });
    }
    
    // Items validation
    if (schema.items && typeof schema.items === 'object') {
      const itemsSchema = schema.items as Record<string, unknown>;
      for (let i = 0; i < value.length; i++) {
        const itemResult = validateAgainstSchema(
          value[i],
          itemsSchema,
          rootSchema,
          `${path}[${i}]`
        );
        errors.push(...itemResult.errors);
      }
    }
  }
  
  // Object validation
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    
    // Required fields
    if (Array.isArray(schema.required)) {
      for (const field of schema.required as string[]) {
        if (!(field in obj)) {
          errors.push({
            path: `${path}.${field}`,
            message: `Missing required field: ${field}`,
            expected: 'field to exist',
            actual: 'undefined',
          });
        }
      }
    }
    
    // Properties validation
    if (schema.properties && typeof schema.properties === 'object') {
      const props = schema.properties as Record<string, Record<string, unknown>>;
      
      for (const [key, propSchema] of Object.entries(props)) {
        if (key in obj) {
          const propResult = validateAgainstSchema(
            obj[key],
            propSchema,
            rootSchema,
            `${path}.${key}`
          );
          errors.push(...propResult.errors);
        }
      }
    }
    
    // AdditionalProperties
    if (schema.additionalProperties === false) {
      const allowedKeys = new Set(
        Object.keys((schema.properties as Record<string, unknown>) || {})
      );
      for (const key of Object.keys(obj)) {
        if (!allowedKeys.has(key)) {
          errors.push({
            path: `${path}.${key}`,
            message: `Additional property not allowed: ${key}`,
            expected: 'no additional properties',
            actual: key,
          });
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates a value against a schema by ID.
 * 
 * @param value - Value to validate
 * @param schemaId - Schema identifier
 * @returns ValidationResult
 * @throws SentinelJudgeError if schema cannot be loaded
 */
export function validate(
  value: unknown,
  schemaId: SchemaId
): ValidationResult {
  const schema = loadSchema(schemaId) as Record<string, unknown>;
  return validateAgainstSchema(value, schema, schema);
}

/**
 * Validates and throws if invalid.
 * 
 * @param value - Value to validate
 * @param schemaId - Schema identifier
 * @throws SentinelJudgeError if validation fails
 */
export function validateOrThrow(
  value: unknown,
  schemaId: SchemaId
): void {
  const result = validate(value, schemaId);
  
  if (!result.valid) {
    throw new SentinelJudgeError(
      ERROR_CODES.SCHEMA_01,
      `Schema validation failed for ${schemaId}`,
      {
        schemaId,
        errorCount: result.errors.length,
        errors: result.errors,
      }
    );
  }
}

/**
 * Type guard that validates a value is a DecisionRequest.
 */
export function isValidDecisionRequest(value: unknown): boolean {
  return validate(value, 'decision_request').valid;
}

/**
 * Type guard that validates a value is an EvidencePack.
 */
export function isValidEvidencePack(value: unknown): boolean {
  return validate(value, 'evidence_pack').valid;
}

/**
 * Type guard that validates a value is a Judgement.
 */
export function isValidJudgement(value: unknown): boolean {
  return validate(value, 'judgement').valid;
}

/**
 * Type guard that validates a value is a PolicyRef.
 */
export function isValidPolicyRef(value: unknown): boolean {
  return validate(value, 'policy_ref').valid;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN VALIDATORS (Direct, no schema needed)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates a traceId format.
 */
export function isValidTraceId(value: string): boolean {
  return PATTERNS.TRACE_ID.test(value);
}

/**
 * Validates a judgementId format.
 */
export function isValidJudgementId(value: string): boolean {
  return PATTERNS.JUDGEMENT_ID.test(value);
}

/**
 * Validates a SHA-256 hash format.
 */
export function isValidSha256(value: string): boolean {
  return PATTERNS.SHA256.test(value);
}

/**
 * Validates an invariant ID format.
 */
export function isValidInvariantId(value: string): boolean {
  return PATTERNS.INVARIANT_ID.test(value);
}

/**
 * Validates a reason code format.
 */
export function isValidReasonCode(value: string): boolean {
  return PATTERNS.REASON_CODE.test(value);
}
