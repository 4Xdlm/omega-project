/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — AUDIT
 * Traçabilité complète
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Audit responsibilities:
 * - Compute deterministic hashes for input/output
 * - Create audit entries for every call
 * - Ensure immutability of audit data
 * - Provide verification functions
 */

import {
  NexusRequest,
  NexusResponse,
  AuditEntry,
  AuditSummary,
  NexusErrorCode,
  NEXUS_VERSION,
} from './types';
import { formatRoute } from './router';

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA-256 hash of any data
 * Uses a deterministic JSON serialization
 */
export async function computeHash(data: unknown): Promise<string> {
  const normalized = normalizeForHash(data);
  const json = JSON.stringify(normalized);
  const buffer = new TextEncoder().encode(json);
  
  // Use Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Synchronous hash computation for environments without Web Crypto
 * Falls back to a simple hash for testing
 */
export function computeHashSync(data: unknown): string {
  const normalized = normalizeForHash(data);
  const json = JSON.stringify(normalized);
  
  // Simple hash for sync operation (use proper crypto in production)
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to hex and pad to 64 chars
  const hex = Math.abs(hash).toString(16);
  return hex.padStart(64, '0');
}

/**
 * Normalize data for deterministic hashing
 * - Sort object keys
 * - Remove undefined values
 * - Handle special types
 */
function normalizeForHash(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(normalizeForHash);
  }
  
  // Sort object keys for deterministic serialization
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(data as Record<string, unknown>).sort();
  
  for (const key of keys) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== undefined) {
      sorted[key] = normalizeForHash(value);
    }
  }
  
  return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ENTRY CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an audit entry from request and response
 */
export function createAuditEntry(
  request: NexusRequest,
  response: NexusResponse<unknown>,
  moduleVersion: string
): AuditEntry {
  const inputHash = computeHashSync(request);
  const outputHash = computeHashSync(response.data ?? response.error);
  
  return {
    // From AuditSummary
    input_hash: inputHash,
    output_hash: outputHash,
    route: formatRoute(request.module, request.action),
    duration_ms: response.audit.duration_ms,
    timestamp: response.audit.timestamp,
    module_version: moduleVersion,
    
    // Additional fields
    request_id: request.request_id,
    response_id: response.response_id,
    session_id: request.session_id,
    caller_id: request.caller_id,
    seed: request.seed,
    success: response.success,
    error_code: response.error?.code,
  };
}

/**
 * Create audit summary for response
 */
export function createAuditSummary(
  request: NexusRequest,
  result: unknown,
  duration_ms: number,
  moduleVersion: string
): AuditSummary {
  return {
    input_hash: computeHashSync(request),
    output_hash: computeHashSync(result),
    route: formatRoute(request.module, request.action),
    duration_ms,
    timestamp: new Date().toISOString(),
    module_version: moduleVersion,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ENTRY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate an audit entry has all required fields
 */
export function validateAuditEntry(entry: AuditEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required string fields (64 hex chars for hashes)
  if (!entry.input_hash || entry.input_hash.length !== 64) {
    errors.push('input_hash must be 64 hex characters');
  }
  
  if (!entry.output_hash || entry.output_hash.length !== 64) {
    errors.push('output_hash must be 64 hex characters');
  }
  
  // Required identifiers
  if (!entry.request_id) {
    errors.push('request_id is required');
  }
  
  if (!entry.response_id) {
    errors.push('response_id is required');
  }
  
  if (!entry.session_id) {
    errors.push('session_id is required');
  }
  
  // Route format
  if (!entry.route || !entry.route.includes('.')) {
    errors.push('route must be in format MODULE.action');
  }
  
  // Timestamp
  if (!entry.timestamp) {
    errors.push('timestamp is required');
  } else {
    const date = new Date(entry.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('timestamp must be valid ISO 8601');
    }
  }
  
  // Duration
  if (typeof entry.duration_ms !== 'number' || entry.duration_ms < 0) {
    errors.push('duration_ms must be a non-negative number');
  }
  
  // Success/error consistency
  if (!entry.success && !entry.error_code) {
    errors.push('error_code required when success is false');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verify hash integrity of an audit entry
 */
export function verifyAuditHash(
  entry: AuditEntry,
  originalRequest: NexusRequest,
  originalResult: unknown
): { valid: boolean; mismatch?: 'input' | 'output' | 'both' } {
  const computedInputHash = computeHashSync(originalRequest);
  const computedOutputHash = computeHashSync(originalResult);
  
  const inputMatch = entry.input_hash === computedInputHash;
  const outputMatch = entry.output_hash === computedOutputHash;
  
  if (inputMatch && outputMatch) {
    return { valid: true };
  }
  
  if (!inputMatch && !outputMatch) {
    return { valid: false, mismatch: 'both' };
  }
  
  return {
    valid: false,
    mismatch: inputMatch ? 'output' : 'input',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT IMMUTABILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Freeze an audit entry to prevent modifications
 */
export function freezeAuditEntry(entry: AuditEntry): Readonly<AuditEntry> {
  return Object.freeze({ ...entry });
}

/**
 * Check if an audit entry is frozen
 */
export function isAuditFrozen(entry: AuditEntry): boolean {
  return Object.isFrozen(entry);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current NEXUS version for audit
 */
export function getNexusVersion(): string {
  return NEXUS_VERSION;
}

/**
 * Create a deterministic request ID (for replay)
 */
export function createDeterministicId(seed: number, index: number): string {
  const base = `deterministic-id-seed-${seed}-index-${index}`;
  
  // Better string hash
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  
  for (let i = 0; i < base.length; i++) {
    const ch = base.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hash = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  const fullHash = hash.repeat(4).substring(0, 32);
  
  // Format as UUID-like string
  return [
    fullHash.substring(0, 8),
    fullHash.substring(8, 12),
    '4' + fullHash.substring(13, 16),  // Version 4
    '8' + fullHash.substring(17, 20),  // Variant
    fullHash.substring(20, 32),
  ].join('-');
}
