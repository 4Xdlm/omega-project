/**
 * OMEGA Memory System - Audit Hooks
 * Phase D5 - NASA-Grade L4
 *
 * Audit logging for memory operations.
 * Part of the DERIVED PLANE - non-canonical, rebuildable.
 *
 * INV-D5-03: Audit log créé pour chaque opération
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type {
  AuditEvent,
  EntryId,
  AuthorityVerdict,
  Timestamp,
} from '../types.js';
import { nowTimestamp } from '../types.js';
import { getAuditLogPath } from '../constants.js';
import { canonicalJSON } from '../hash.js';
import { randomBytes } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT EVENT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate unique audit event ID.
 */
function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `AUD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Create an audit event.
 */
export function createAuditEvent(options: {
  action: string;
  actor: string;
  entryId?: EntryId;
  verdict?: AuthorityVerdict;
  trace?: string;
}): AuditEvent {
  return {
    id: generateAuditId(),
    ts_utc: nowTimestamp(),
    action: options.action,
    actor: options.actor,
    entryId: options.entryId ?? null,
    verdict: options.verdict ?? null,
    trace: options.trace ?? '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Audit logger interface.
 */
export interface AuditLogger {
  /**
   * Log an audit event.
   */
  log(event: AuditEvent): void;

  /**
   * Log a read operation.
   */
  logRead(actor: string, entryId: EntryId): void;

  /**
   * Log a query operation.
   */
  logQuery(actor: string, query: string): void;

  /**
   * Log an authorization request.
   */
  logAuthorization(
    actor: string,
    entryId: EntryId,
    verdict: AuthorityVerdict,
    reason: string
  ): void;

  /**
   * Log an integrity check.
   */
  logIntegrityCheck(actor: string, result: 'PASS' | 'FAIL', details: string): void;

  /**
   * Flush pending events to storage.
   */
  flush(): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE-BASED AUDIT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create file-based audit logger.
 * Writes to DERIVED PLANE (non-canonical, can be deleted).
 *
 * @param logPath - Path to audit log file
 */
export function createFileAuditLogger(
  logPath: string = getAuditLogPath()
): AuditLogger {
  // Buffer for batched writes
  const buffer: AuditEvent[] = [];
  const BUFFER_SIZE = 10;

  function ensureDir(): void {
    const dir = dirname(logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  function writeEvent(event: AuditEvent): void {
    ensureDir();
    const line = canonicalJSON(event) + '\n';
    appendFileSync(logPath, line, 'utf8');
  }

  function flushBuffer(): void {
    for (const event of buffer) {
      writeEvent(event);
    }
    buffer.length = 0;
  }

  return {
    log(event: AuditEvent): void {
      buffer.push(event);
      if (buffer.length >= BUFFER_SIZE) {
        flushBuffer();
      }
    },

    logRead(actor: string, entryId: EntryId): void {
      this.log(createAuditEvent({
        action: 'READ',
        actor,
        entryId,
        trace: `Read entry ${entryId}`,
      }));
    },

    logQuery(actor: string, query: string): void {
      this.log(createAuditEvent({
        action: 'QUERY',
        actor,
        trace: `Query: ${query}`,
      }));
    },

    logAuthorization(
      actor: string,
      entryId: EntryId,
      verdict: AuthorityVerdict,
      reason: string
    ): void {
      this.log(createAuditEvent({
        action: 'AUTHORIZATION',
        actor,
        entryId,
        verdict,
        trace: reason,
      }));
    },

    logIntegrityCheck(actor: string, result: 'PASS' | 'FAIL', details: string): void {
      this.log(createAuditEvent({
        action: 'INTEGRITY_CHECK',
        actor,
        trace: `Result: ${result}. ${details}`,
      }));
    },

    flush(): void {
      flushBuffer();
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY AUDIT LOGGER (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create in-memory audit logger (for testing).
 * Events are stored in memory, not persisted.
 */
export function createMemoryAuditLogger(): AuditLogger & { getEvents(): readonly AuditEvent[] } {
  const events: AuditEvent[] = [];

  const logger: AuditLogger = {
    log(event: AuditEvent): void {
      events.push(event);
    },

    logRead(actor: string, entryId: EntryId): void {
      this.log(createAuditEvent({
        action: 'READ',
        actor,
        entryId,
        trace: `Read entry ${entryId}`,
      }));
    },

    logQuery(actor: string, query: string): void {
      this.log(createAuditEvent({
        action: 'QUERY',
        actor,
        trace: `Query: ${query}`,
      }));
    },

    logAuthorization(
      actor: string,
      entryId: EntryId,
      verdict: AuthorityVerdict,
      reason: string
    ): void {
      this.log(createAuditEvent({
        action: 'AUTHORIZATION',
        actor,
        entryId,
        verdict,
        trace: reason,
      }));
    },

    logIntegrityCheck(actor: string, result: 'PASS' | 'FAIL', details: string): void {
      this.log(createAuditEvent({
        action: 'INTEGRITY_CHECK',
        actor,
        trace: `Result: ${result}. ${details}`,
      }));
    },

    flush(): void {
      // No-op for memory logger
    },
  };

  return {
    ...logger,
    getEvents(): readonly AuditEvent[] {
      return events;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NO-OP AUDIT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create no-op audit logger (for performance-critical paths).
 */
export function createNoOpAuditLogger(): AuditLogger {
  return {
    log(): void {},
    logRead(): void {},
    logQuery(): void {},
    logAuthorization(): void {},
    logIntegrityCheck(): void {},
    flush(): void {},
  };
}
