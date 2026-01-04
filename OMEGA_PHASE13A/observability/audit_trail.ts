/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Audit Trail
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-Grade audit trail with cryptographic integrity:
 * - INV-ATR-01: Append-only (no modify/delete)
 * - INV-ATR-02: Hash chain (prev_hash + hash)
 * - INV-ATR-03: Deterministic serialization
 * - INV-ATR-04: Export forensic (JSONL + root_hash)
 * 
 * @module audit_trail
 * @version 3.13.0
 */

import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Event types for audit trail */
export type AuditEventType = 
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'CONFIG_CHANGE'
  | 'ERROR'
  | 'SYSTEM';

/** Actor roles */
export type ActorRole = 
  | 'USER'
  | 'ADMIN'
  | 'SYSTEM'
  | 'API'
  | 'SCHEDULER';

/** Raw event input (before enrichment) */
export interface AuditEventInput {
  type: AuditEventType;
  actor_role: ActorRole;
  actor_id?: string;
  action: string;
  resource?: string;
  data?: Record<string, unknown>;
}

/** Canonical payload for hashing - INV-ATR-03 */
export interface CanonicalPayload {
  seq: number;
  utc: string;
  type: AuditEventType;
  actor_role: ActorRole;
  actor_id: string;
  action: string;
  resource: string;
  data: Record<string, unknown>;
  prev_hash: string;
}

/** Complete audit event (enriched) */
export interface AuditEvent extends CanonicalPayload {
  hash: string;
}

/** Verification result */
export interface VerifyResult {
  valid: boolean;
  error?: string;
  broken_at_seq?: number;
}

/** Export result */
export interface ExportResult {
  jsonl: string;
  root_hash: string;
  event_count: number;
  first_seq: number;
  last_seq: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Genesis hash for first event */
export const GENESIS_HASH = '0'.repeat(64);

/** Required fields for event input */
export const REQUIRED_FIELDS: (keyof AuditEventInput)[] = ['type', 'actor_role', 'action'];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS - INV-ATR-03 (Deterministic Serialization)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sort object keys recursively for deterministic serialization
 * INV-ATR-03: Same input → same output
 */
export function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  
  return obj;
}

/**
 * Canonical JSON serialization - INV-ATR-03
 * Deterministic: sorted keys, no extra whitespace
 */
export function canonicalJSON(obj: unknown): string {
  return JSON.stringify(sortObjectKeys(obj));
}

/**
 * Compute SHA256 hash of canonical payload - INV-ATR-02
 */
export function computeEventHash(payload: CanonicalPayload): string {
  const canonical = canonicalJSON(payload);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Generate UTC timestamp in ISO format - INV-ATR-03
 * Controlled format, no milliseconds variance issues
 */
export function utcTimestamp(date?: Date): string {
  const d = date || new Date();
  return d.toISOString();
}

/**
 * Validate event input has required fields
 */
export function validateEventInput(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be an object'] };
  }
  
  const e = input as Record<string, unknown>;
  
  for (const field of REQUIRED_FIELDS) {
    if (!(field in e) || e[field] === undefined || e[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate type enum
  const validTypes: AuditEventType[] = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'LOGIN', 'LOGOUT', 'CONFIG_CHANGE', 'ERROR', 'SYSTEM'];
  if (e.type && !validTypes.includes(e.type as AuditEventType)) {
    errors.push(`Invalid type: ${e.type}`);
  }
  
  // Validate actor_role enum
  const validRoles: ActorRole[] = ['USER', 'ADMIN', 'SYSTEM', 'API', 'SCHEDULER'];
  if (e.actor_role && !validRoles.includes(e.actor_role as ActorRole)) {
    errors.push(`Invalid actor_role: ${e.actor_role}`);
  }
  
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Audit Trail - Append-only event log with cryptographic integrity
 * 
 * Invariants:
 * - INV-ATR-01: Append-only (no modify/delete)
 * - INV-ATR-02: Hash chain (each event links to previous)
 * - INV-ATR-03: Deterministic serialization (same input = same hash)
 * - INV-ATR-04: Export forensic (JSONL + root_hash)
 */
export class AuditTrail {
  private events: AuditEvent[] = [];
  private frozen: boolean = false;
  
  /**
   * Get current sequence number (next event will have this seq)
   */
  getNextSeq(): number {
    return this.events.length;
  }
  
  /**
   * Get last hash (or genesis if empty)
   */
  getLastHash(): string {
    if (this.events.length === 0) {
      return GENESIS_HASH;
    }
    return this.events[this.events.length - 1].hash;
  }
  
  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }
  
  /**
   * Check if trail is frozen (no more appends allowed)
   */
  isFrozen(): boolean {
    return this.frozen;
  }
  
  /**
   * Freeze the trail - no more events can be appended
   * INV-ATR-01: Once frozen, trail is immutable
   */
  freeze(): void {
    this.frozen = true;
  }
  
  /**
   * Append event to trail - INV-ATR-01, INV-ATR-02
   * @throws Error if trail is frozen or input is invalid
   */
  append(input: AuditEventInput, timestamp?: Date): AuditEvent {
    // INV-ATR-01: Cannot modify frozen trail
    if (this.frozen) {
      throw new Error('Cannot append to frozen audit trail');
    }
    
    // Validate input
    const validation = validateEventInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid event input: ${validation.errors.join(', ')}`);
    }
    
    const seq = this.getNextSeq();
    const prev_hash = this.getLastHash();
    const utc = utcTimestamp(timestamp);
    
    // Build canonical payload - INV-ATR-03
    const payload: CanonicalPayload = {
      seq,
      utc,
      type: input.type,
      actor_role: input.actor_role,
      actor_id: input.actor_id || '',
      action: input.action,
      resource: input.resource || '',
      data: input.data || {},
      prev_hash
    };
    
    // Compute hash - INV-ATR-02
    const hash = computeEventHash(payload);
    
    const event: AuditEvent = {
      ...payload,
      hash
    };
    
    // INV-ATR-01: Append only
    this.events.push(event);
    
    return event;
  }
  
  /**
   * Get event by sequence number (read-only)
   */
  getEvent(seq: number): AuditEvent | undefined {
    return this.events[seq] ? { ...this.events[seq] } : undefined;
  }
  
  /**
   * Get all events (read-only copies)
   */
  getAllEvents(): AuditEvent[] {
    return this.events.map(e => ({ ...e }));
  }
  
  /**
   * Verify chain integrity - INV-ATR-02
   * Checks that each event's hash is correct and links to previous
   */
  verify(): VerifyResult {
    if (this.events.length === 0) {
      return { valid: true };
    }
    
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      
      // Check sequence
      if (event.seq !== i) {
        return {
          valid: false,
          error: `Sequence mismatch at index ${i}: expected ${i}, got ${event.seq}`,
          broken_at_seq: i
        };
      }
      
      // Check prev_hash
      const expectedPrevHash = i === 0 ? GENESIS_HASH : this.events[i - 1].hash;
      if (event.prev_hash !== expectedPrevHash) {
        return {
          valid: false,
          error: `Previous hash mismatch at seq ${i}`,
          broken_at_seq: i
        };
      }
      
      // Recompute and verify hash - INV-ATR-02
      const { hash, ...payload } = event;
      const computedHash = computeEventHash(payload as CanonicalPayload);
      if (computedHash !== hash) {
        return {
          valid: false,
          error: `Hash mismatch at seq ${i}: event may have been tampered`,
          broken_at_seq: i
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Verify external chain (for imported data)
   */
  static verifyChain(events: AuditEvent[]): VerifyResult {
    if (events.length === 0) {
      return { valid: true };
    }
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Check sequence
      if (event.seq !== i) {
        return {
          valid: false,
          error: `Sequence mismatch at index ${i}`,
          broken_at_seq: i
        };
      }
      
      // Check prev_hash
      const expectedPrevHash = i === 0 ? GENESIS_HASH : events[i - 1].hash;
      if (event.prev_hash !== expectedPrevHash) {
        return {
          valid: false,
          error: `Previous hash mismatch at seq ${i}`,
          broken_at_seq: i
        };
      }
      
      // Verify hash
      const { hash, ...payload } = event;
      const computedHash = computeEventHash(payload as CanonicalPayload);
      if (computedHash !== hash) {
        return {
          valid: false,
          error: `Hash mismatch at seq ${i}`,
          broken_at_seq: i
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Export to JSONL format - INV-ATR-04
   * One event per line, plus root_hash for verification
   */
  exportJSONL(): ExportResult {
    if (this.events.length === 0) {
      return {
        jsonl: '',
        root_hash: GENESIS_HASH,
        event_count: 0,
        first_seq: 0,
        last_seq: -1
      };
    }
    
    // INV-ATR-03: Deterministic serialization
    const lines = this.events.map(e => canonicalJSON(e));
    const jsonl = lines.join('\n');
    
    // Root hash = hash of last event (chain tip)
    const root_hash = this.events[this.events.length - 1].hash;
    
    return {
      jsonl,
      root_hash,
      event_count: this.events.length,
      first_seq: 0,
      last_seq: this.events.length - 1
    };
  }
  
  /**
   * Import from JSONL - validates chain before accepting
   */
  static importJSONL(jsonl: string): { trail: AuditTrail; result: VerifyResult } {
    const trail = new AuditTrail();
    
    if (!jsonl || jsonl.trim() === '') {
      return { trail, result: { valid: true } };
    }
    
    const lines = jsonl.trim().split('\n');
    const events: AuditEvent[] = [];
    
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as AuditEvent;
        events.push(event);
      } catch {
        return {
          trail,
          result: { valid: false, error: 'Invalid JSON in JSONL' }
        };
      }
    }
    
    // Verify before accepting
    const result = AuditTrail.verifyChain(events);
    if (result.valid) {
      trail.events = events;
    }
    
    return { trail, result };
  }
  
  /**
   * Compute root hash (hash of entire chain state)
   * This is the chain tip hash
   */
  getRootHash(): string {
    return this.getLastHash();
  }
  
  /**
   * Clear trail (for testing only)
   * @internal
   */
  _clear(): void {
    this.events = [];
    this.frozen = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let defaultTrail: AuditTrail | null = null;

/**
 * Get or create the default audit trail instance
 */
export function getDefaultAuditTrail(): AuditTrail {
  if (!defaultTrail) {
    defaultTrail = new AuditTrail();
  }
  return defaultTrail;
}

/**
 * Reset the default audit trail (for testing)
 */
export function resetDefaultAuditTrail(): void {
  defaultTrail = null;
}
