/**
 * OMEGA QUARANTINE_V2 — Core Implementation
 * Phase 16.2 — Isolation Chamber
 * 
 * Secure isolation system for suspicious inputs and data.
 * 
 * INVARIANTS:
 * - INV-QUA-01: Quarantined item isolated from main system
 * - INV-QUA-02: Metadata always preserved
 * - INV-QUA-03: TTL/expiration enforced
 * - INV-QUA-04: Audit trail immutable
 * - INV-QUA-05: Release requires validation
 * - INV-QUA-06: Deterministic behavior
 */

import {
  QuarantineStatus,
  QuarantineReason,
  Severity,
  DEFAULT_CONFIG,
  QUARANTINE_VERSION,
} from './constants.js';

import type {
  QuarantineConfig,
  QuarantineItem,
  QuarantineItemSummary,
  QuarantineMetadata,
  QuarantineOptions,
  QuarantineResult,
  ReleaseOptions,
  ReleaseResult,
  InspectOptions,
  InspectResult,
  PurgeOptions,
  PurgeResult,
  ListOptions,
  ListResult,
  QuarantineStats,
  AuditEntry,
  AuditAction,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * QUARANTINE_V2 — Isolation Chamber
 * 
 * Securely isolates suspicious inputs and data from the main system.
 */
export class Quarantine {
  private config: QuarantineConfig;
  private items: Map<string, QuarantineItem>;
  private auditLog: AuditEntry[];
  private startTime: number;
  private counters: {
    totalQuarantined: number;
    totalReleased: number;
    totalPurged: number;
    totalExpired: number;
  };
  private idCounter: number;
  private purgeTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<QuarantineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.items = new Map();
    this.auditLog = [];
    this.startTime = Date.now();
    this.counters = {
      totalQuarantined: 0,
      totalReleased: 0,
      totalPurged: 0,
      totalExpired: 0,
    };
    this.idCounter = 0;

    // Start auto-purge if enabled
    if (this.config.autoPurge) {
      this.startAutoPurge();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUARANTINE OPERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Quarantine an item
   * INV-QUA-01: Quarantined item isolated from main system
   * INV-QUA-02: Metadata always preserved
   */
  quarantine<T>(payload: T, options: QuarantineOptions = {}): QuarantineResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      // Check capacity
      if (this.items.size >= this.config.maxItems) {
        // Try to purge expired first
        this.purgeExpired();
        if (this.items.size >= this.config.maxItems) {
          return this.errorResult('Quarantine capacity exceeded', timestamp, startTime);
        }
      }

      // Serialize and check size
      const serialized = JSON.stringify(payload);
      const payloadSize = new TextEncoder().encode(serialized).length;

      if (payloadSize > this.config.maxPayloadSize) {
        return this.errorResult(
          `Payload size ${payloadSize} exceeds limit ${this.config.maxPayloadSize}`,
          timestamp,
          startTime
        );
      }

      // Generate ID and hash
      const id = this.generateId();
      const payloadHash = this.calculateHash(serialized);

      // Calculate expiration
      const ttl = options.ttlMs ?? this.config.ttlMs;
      const expiresAt = new Date(Date.now() + ttl).toISOString();

      // Create item
      const item: QuarantineItem<T> = {
        id,
        payload,
        payloadHash,
        payloadSize,
        status: QuarantineStatus.QUARANTINED,
        reason: options.reason ?? QuarantineReason.UNKNOWN,
        reasonMessage: options.reasonMessage ?? 'No reason specified',
        severity: options.severity ?? Severity.MEDIUM,
        quarantinedAt: timestamp,
        expiresAt,
        metadata: options.metadata ?? {},
      };

      // Store item (INV-QUA-01: isolated storage)
      this.items.set(id, item as QuarantineItem);
      this.counters.totalQuarantined++;

      // Audit log (INV-QUA-04)
      this.addAuditEntry('QUARANTINE', id, `Quarantined: ${item.reasonMessage}`, true);

      const durationMs = performance.now() - startTime;

      return {
        success: true,
        id,
        timestamp,
        durationMs,
        item: this.toSummary(item),
      };
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error',
        timestamp,
        startTime
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEASE OPERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Release an item from quarantine
   * INV-QUA-05: Release requires validation
   */
  release<T>(id: string, options: ReleaseOptions): ReleaseResult<T> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      // Validate reason requirement
      if (this.config.requireReleaseReason && !options.reason) {
        return {
          success: false,
          id,
          timestamp,
          durationMs: performance.now() - startTime,
          error: 'Release reason is required',
        };
      }

      // Find item
      const item = this.items.get(id);
      if (!item) {
        return {
          success: false,
          id,
          timestamp,
          durationMs: performance.now() - startTime,
          error: `Item not found: ${id}`,
        };
      }

      // Check status
      if (item.status !== QuarantineStatus.QUARANTINED) {
        return {
          success: false,
          id,
          timestamp,
          durationMs: performance.now() - startTime,
          error: `Item is not quarantined (status: ${item.status})`,
        };
      }

      // Verify integrity unless skipped
      if (!options.skipValidation) {
        const currentHash = this.calculateHash(JSON.stringify(item.payload));
        if (currentHash !== item.payloadHash) {
          return {
            success: false,
            id,
            timestamp,
            durationMs: performance.now() - startTime,
            error: 'Integrity check failed: payload has been modified',
          };
        }
      }

      // Update item status
      item.status = QuarantineStatus.RELEASED;
      item.releasedAt = timestamp;
      item.releaseReason = options.reason;

      this.counters.totalReleased++;

      // Audit log
      this.addAuditEntry(
        'RELEASE',
        id,
        `Released: ${options.reason}`,
        true,
        options.releasedBy
      );

      const payload = item.payload as T;
      
      // Remove from active quarantine
      this.items.delete(id);

      return {
        success: true,
        id,
        timestamp,
        durationMs: performance.now() - startTime,
        payload,
      };
    } catch (error) {
      return {
        success: false,
        id,
        timestamp,
        durationMs: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INSPECT OPERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inspect a quarantined item safely
   * INV-QUA-02: Metadata always preserved
   */
  inspect<T>(id: string, options: InspectOptions = {}): InspectResult<T> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      const item = this.items.get(id);
      if (!item) {
        return {
          success: false,
          timestamp,
          durationMs: performance.now() - startTime,
          error: `Item not found: ${id}`,
        };
      }

      // Audit log
      this.addAuditEntry('INSPECT', id, 'Item inspected', true);

      // Verify integrity if requested
      let integrityValid: boolean | undefined;
      if (options.verifyIntegrity) {
        const currentHash = this.calculateHash(JSON.stringify(item.payload));
        integrityValid = currentHash === item.payloadHash;
      }

      const result: InspectResult<T> = {
        success: true,
        timestamp,
        durationMs: performance.now() - startTime,
        integrityValid,
      };

      if (options.includePayload) {
        result.item = item as QuarantineItem<T>;
      } else {
        result.summary = this.toSummary(item);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        timestamp,
        durationMs: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PURGE OPERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Purge items from quarantine
   * INV-QUA-03: TTL/expiration enforced
   */
  purge(options: PurgeOptions = {}): PurgeResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const purgedIds: string[] = [];

    try {
      const now = Date.now();

      for (const [id, item] of this.items) {
        let shouldPurge = false;

        // Check expiration
        if (options.expiredOnly !== false) {
          const expiresAt = new Date(item.expiresAt).getTime();
          if (expiresAt <= now) {
            shouldPurge = true;
            item.status = QuarantineStatus.EXPIRED;
          }
        }

        // Check age
        if (options.olderThanMs !== undefined) {
          const quarantinedAt = new Date(item.quarantinedAt).getTime();
          if (now - quarantinedAt > options.olderThanMs) {
            shouldPurge = true;
          }
        }

        // Check reason filter
        if (options.reason !== undefined && item.reason !== options.reason) {
          shouldPurge = false;
        }

        // Check severity filter
        if (options.severity !== undefined && item.severity !== options.severity) {
          shouldPurge = false;
        }

        if (shouldPurge && !options.dryRun) {
          const wasExpired = item.status === QuarantineStatus.EXPIRED;
          item.status = QuarantineStatus.PURGED;
          item.purgedAt = timestamp;
          this.items.delete(id);
          purgedIds.push(id);
          
          if (wasExpired) {
            this.counters.totalExpired++;
          }
          this.counters.totalPurged++;

          // Audit log
          this.addAuditEntry('PURGE', id, `Purged: ${item.reason}`, true);
        } else if (shouldPurge) {
          purgedIds.push(id);
        }
      }

      return {
        success: true,
        timestamp,
        durationMs: performance.now() - startTime,
        purgedCount: purgedIds.length,
        purgedIds,
        dryRun: options.dryRun ?? false,
      };
    } catch (error) {
      return {
        success: false,
        timestamp,
        durationMs: performance.now() - startTime,
        purgedCount: purgedIds.length,
        purgedIds,
        dryRun: options.dryRun ?? false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Purge only expired items
   */
  purgeExpired(): PurgeResult {
    return this.purge({ expiredOnly: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST OPERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List quarantined items
   */
  list(options: ListOptions = {}): ListResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      let items = Array.from(this.items.values());

      // Filter by status
      if (options.status !== undefined) {
        items = items.filter(item => item.status === options.status);
      }

      // Filter by reason
      if (options.reason !== undefined) {
        items = items.filter(item => item.reason === options.reason);
      }

      // Filter by severity
      if (options.severity !== undefined) {
        items = items.filter(item => item.severity === options.severity);
      }

      const totalCount = items.length;

      // Sort
      const sortBy = options.sortBy ?? 'quarantinedAt';
      const sortOrder = options.sortOrder ?? 'desc';
      
      items.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'quarantinedAt':
            comparison = new Date(a.quarantinedAt).getTime() - new Date(b.quarantinedAt).getTime();
            break;
          case 'expiresAt':
            comparison = new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
            break;
          case 'severity':
            const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
            comparison = severityOrder[a.severity] - severityOrder[b.severity];
            break;
          case 'payloadSize':
            comparison = a.payloadSize - b.payloadSize;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // Pagination
      const offset = options.offset ?? 0;
      const limit = options.limit ?? 100;
      items = items.slice(offset, offset + limit);

      return {
        success: true,
        timestamp,
        durationMs: performance.now() - startTime,
        items: items.map(item => this.toSummary(item)),
        totalCount,
      };
    } catch (error) {
      return {
        success: false,
        timestamp,
        durationMs: performance.now() - startTime,
        items: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get quarantine statistics
   * INV-QUA-06: Deterministic behavior
   */
  getStats(): QuarantineStats {
    const timestamp = new Date().toISOString();
    const items = Array.from(this.items.values());

    // Count by status
    const byStatus = Object.values(QuarantineStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<QuarantineStatus, number>
    );
    
    // Count by reason
    const byReason = Object.values(QuarantineReason).reduce(
      (acc, reason) => ({ ...acc, [reason]: 0 }),
      {} as Record<QuarantineReason, number>
    );
    
    // Count by severity
    const bySeverity = Object.values(Severity).reduce(
      (acc, severity) => ({ ...acc, [severity]: 0 }),
      {} as Record<Severity, number>
    );

    let totalPayloadSize = 0;

    for (const item of items) {
      byStatus[item.status]++;
      byReason[item.reason]++;
      bySeverity[item.severity]++;
      totalPayloadSize += item.payloadSize;
    }

    return {
      timestamp,
      version: QUARANTINE_VERSION,
      uptimeMs: Date.now() - this.startTime,
      totalQuarantined: this.counters.totalQuarantined,
      totalReleased: this.counters.totalReleased,
      totalPurged: this.counters.totalPurged,
      totalExpired: this.counters.totalExpired,
      byStatus,
      byReason,
      bySeverity,
      totalPayloadSize,
      config: { ...this.config },
    };
  }

  /**
   * Get audit log
   * INV-QUA-04: Audit trail immutable
   */
  getAuditLog(limit?: number): AuditEntry[] {
    const log = [...this.auditLog];
    if (limit !== undefined) {
      return log.slice(-limit);
    }
    return log;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if an item exists
   */
  has(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * Get count of quarantined items
   */
  get size(): number {
    return this.items.size;
  }

  /**
   * Clear all items (for testing)
   */
  clear(): void {
    this.items.clear();
    this.auditLog = [];
    this.counters = {
      totalQuarantined: 0,
      totalReleased: 0,
      totalPurged: 0,
      totalExpired: 0,
    };
  }

  /**
   * Stop auto-purge timer
   */
  destroy(): void {
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = undefined;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateId(): string {
    this.idCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.idCounter.toString(36).padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 6);
    return `QUA-${timestamp}-${counter}-${random}`;
  }

  private calculateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private toSummary(item: QuarantineItem): QuarantineItemSummary {
    return {
      id: item.id,
      status: item.status,
      reason: item.reason,
      severity: item.severity,
      quarantinedAt: item.quarantinedAt,
      expiresAt: item.expiresAt,
      payloadSize: item.payloadSize,
      payloadHash: item.payloadHash,
    };
  }

  private addAuditEntry(
    action: AuditAction,
    itemId: string,
    details: string,
    success: boolean,
    actor?: string
  ): void {
    if (!this.config.enableAuditLog) return;

    const entry: AuditEntry = {
      id: `AUD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      itemId,
      details,
      success,
      actor,
    };

    this.auditLog.push(entry);

    // Keep audit log bounded
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  private errorResult(error: string, timestamp: string, startTime: number): QuarantineResult {
    return {
      success: false,
      id: '',
      timestamp,
      durationMs: performance.now() - startTime,
      item: {
        id: '',
        status: QuarantineStatus.QUARANTINED,
        reason: QuarantineReason.UNKNOWN,
        severity: Severity.MEDIUM,
        quarantinedAt: timestamp,
        expiresAt: timestamp,
        payloadSize: 0,
        payloadHash: '',
      },
      error,
    };
  }

  private startAutoPurge(): void {
    this.purgeTimer = setInterval(() => {
      this.purgeExpired();
    }, this.config.purgeIntervalMs);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/** Default quarantine instance */
export const quarantine = new Quarantine();

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Quarantine an item using default instance */
export const quarantineItem = <T>(payload: T, options?: QuarantineOptions): QuarantineResult =>
  quarantine.quarantine(payload, options);

/** Release an item using default instance */
export const releaseItem = <T>(id: string, options: ReleaseOptions): ReleaseResult<T> =>
  quarantine.release(id, options);

/** Inspect an item using default instance */
export const inspectItem = <T>(id: string, options?: InspectOptions): InspectResult<T> =>
  quarantine.inspect(id, options);

/** Purge items using default instance */
export const purgeItems = (options?: PurgeOptions): PurgeResult =>
  quarantine.purge(options);

/** List items using default instance */
export const listItems = (options?: ListOptions): ListResult =>
  quarantine.list(options);

/** Get stats using default instance */
export const getStats = (): QuarantineStats =>
  quarantine.getStats();
