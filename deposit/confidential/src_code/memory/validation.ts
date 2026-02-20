/**
 * OMEGA Memory System - Schema Validation
 * Phase D2 - NASA-Grade L4
 * 
 * Runtime validation against JSON schema.
 * No AJV dependency - inline validation for determinism.
 */

import type { 
  MemoryEntry, 
  EntryClass, 
  EvidenceType,
  Result,
  EntryId,
} from './types.js';
import { 
  ok, 
  err,
  isValidEntryId,
  isValidTimestamp,
  isValidEntryClass,
  isValidEvidenceType,
  ENTRY_CLASSES,
  EVIDENCE_TYPES,
  toEntryId,
  toTimestamp,
} from './types.js';
import { MemoryError } from './errors.js';
import * as Errors from './errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

function validateString(value: unknown, field: string, minLength = 1): ValidationError | null {
  if (typeof value !== 'string') {
    return { field, message: `must be a string`, value };
  }
  if (value.length < minLength) {
    return { field, message: `must have at least ${minLength} character(s)`, value };
  }
  return null;
}

function validateBoolean(value: unknown, field: string): ValidationError | null {
  if (typeof value !== 'boolean') {
    return { field, message: `must be a boolean`, value };
  }
  return null;
}

function validateArray(value: unknown, field: string): ValidationError | null {
  if (!Array.isArray(value)) {
    return { field, message: `must be an array`, value };
  }
  return null;
}

function validateObject(value: unknown, field: string): ValidationError | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { field, message: `must be an object`, value };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate raw object against MemoryEntry schema.
 * Returns typed MemoryEntry on success, validation errors on failure.
 */
export function validateEntry(
  raw: unknown,
  lineNumber?: number
): Result<MemoryEntry, MemoryError> {
  const errors: ValidationError[] = [];
  
  // Must be object
  const objError = validateObject(raw, 'entry');
  if (objError) {
    return err(Errors.schemaViolation(objError.message, undefined, lineNumber));
  }
  
  const obj = raw as Record<string, unknown>;
  
  // Required fields check
  const requiredFields = ['id', 'ts_utc', 'author', 'class', 'scope', 'payload', 'meta'];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      return err(Errors.missingField(field, lineNumber));
    }
  }
  
  // id validation
  const idStr = obj.id;
  const idError = validateString(idStr, 'id');
  if (idError) {
    errors.push(idError);
  } else if (!isValidEntryId(idStr as string)) {
    return err(Errors.invalidIdFormat(idStr as string, lineNumber));
  }
  
  // ts_utc validation
  const tsStr = obj.ts_utc;
  const tsError = validateString(tsStr, 'ts_utc');
  if (tsError) {
    errors.push(tsError);
  } else if (!isValidTimestamp(tsStr as string)) {
    return err(Errors.invalidTimestamp(tsStr as string, lineNumber));
  }
  
  // author validation
  const authorError = validateString(obj.author, 'author');
  if (authorError) {
    errors.push(authorError);
  }
  
  // class validation
  const classStr = obj.class;
  const classError = validateString(classStr, 'class');
  if (classError) {
    errors.push(classError);
  } else if (!isValidEntryClass(classStr as string)) {
    return err(Errors.invalidClass(classStr as string, lineNumber));
  }
  
  // scope validation
  const scopeError = validateString(obj.scope, 'scope');
  if (scopeError) {
    errors.push(scopeError);
  }
  
  // payload validation
  const payloadError = validateObject(obj.payload, 'payload');
  if (payloadError) {
    errors.push(payloadError);
  } else {
    const payload = obj.payload as Record<string, unknown>;
    
    // payload.title required
    const titleError = validateString(payload.title, 'payload.title');
    if (titleError) {
      errors.push(titleError);
    }
    
    // payload.body required
    const bodyError = validateString(payload.body, 'payload.body');
    if (bodyError) {
      errors.push(bodyError);
    }
    
    // payload.evidence optional but must be array if present
    if ('evidence' in payload && payload.evidence !== undefined) {
      const evidenceError = validateArray(payload.evidence, 'payload.evidence');
      if (evidenceError) {
        errors.push(evidenceError);
      } else {
        const evidence = payload.evidence as unknown[];
        for (let i = 0; i < evidence.length; i++) {
          const ev = evidence[i];
          const evObjError = validateObject(ev, `payload.evidence[${i}]`);
          if (evObjError) {
            errors.push(evObjError);
            continue;
          }
          
          const evObj = ev as Record<string, unknown>;
          if (!('type' in evObj) || !('ref' in evObj)) {
            errors.push({ 
              field: `payload.evidence[${i}]`, 
              message: 'must have type and ref fields' 
            });
            continue;
          }
          
          if (!isValidEvidenceType(evObj.type as string)) {
            errors.push({ 
              field: `payload.evidence[${i}].type`, 
              message: `must be one of: ${EVIDENCE_TYPES.join(', ')}`,
              value: evObj.type
            });
          }
          
          const refError = validateString(evObj.ref, `payload.evidence[${i}].ref`);
          if (refError) {
            errors.push(refError);
          }
        }
      }
    }
  }
  
  // meta validation
  const metaError = validateObject(obj.meta, 'meta');
  if (metaError) {
    errors.push(metaError);
  } else {
    const meta = obj.meta as Record<string, unknown>;
    
    // meta.schema_version required
    const svError = validateString(meta.schema_version, 'meta.schema_version');
    if (svError) {
      errors.push(svError);
    }
    
    // meta.sealed required
    const sealedError = validateBoolean(meta.sealed, 'meta.sealed');
    if (sealedError) {
      errors.push(sealedError);
    }
    
    // meta.tags optional but must be array of strings if present
    if ('tags' in meta && meta.tags !== undefined) {
      const tagsError = validateArray(meta.tags, 'meta.tags');
      if (tagsError) {
        errors.push(tagsError);
      } else {
        const tags = meta.tags as unknown[];
        for (let i = 0; i < tags.length; i++) {
          const tagError = validateString(tags[i], `meta.tags[${i}]`);
          if (tagError) {
            errors.push(tagError);
          }
        }
      }
    }
    
    // meta.supersedes optional but must be string if present
    if ('supersedes' in meta && meta.supersedes !== undefined) {
      const supersedesError = validateString(meta.supersedes, 'meta.supersedes');
      if (supersedesError) {
        errors.push(supersedesError);
      }
    }
  }
  
  // Check for additional properties (strict mode)
  const allowedTopLevel = new Set(['id', 'ts_utc', 'author', 'class', 'scope', 'payload', 'meta']);
  for (const key of Object.keys(obj)) {
    if (!allowedTopLevel.has(key)) {
      errors.push({ field: key, message: 'additional property not allowed' });
    }
  }
  
  // Return errors if any
  if (errors.length > 0) {
    const message = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    return err(Errors.schemaViolation(message, undefined, lineNumber));
  }
  
  // Construct validated entry with proper types
  const validEntry: MemoryEntry = {
    id: toEntryId(obj.id as string),
    ts_utc: toTimestamp(obj.ts_utc as string),
    author: obj.author as string,
    class: obj.class as EntryClass,
    scope: obj.scope as string,
    payload: {
      title: (obj.payload as Record<string, unknown>).title as string,
      body: (obj.payload as Record<string, unknown>).body as string,
      evidence: (obj.payload as Record<string, unknown>).evidence as readonly {
        type: EvidenceType;
        ref: string;
      }[] | undefined,
    },
    meta: {
      schema_version: (obj.meta as Record<string, unknown>).schema_version as string,
      sealed: (obj.meta as Record<string, unknown>).sealed as boolean,
      tags: (obj.meta as Record<string, unknown>).tags as readonly string[] | undefined,
      supersedes: (obj.meta as Record<string, unknown>).supersedes as string | undefined,
    },
  };
  
  return ok(validEntry);
}

/**
 * Parse and validate JSON string as MemoryEntry
 */
export function parseAndValidateEntry(
  jsonStr: string,
  lineNumber?: number
): Result<MemoryEntry, MemoryError> {
  let parsed: unknown;
  
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return err(Errors.invalidJson(jsonStr, lineNumber, e instanceof Error ? e : undefined));
  }
  
  return validateEntry(parsed, lineNumber);
}
