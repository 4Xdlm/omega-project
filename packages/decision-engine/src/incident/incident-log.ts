/**
 * @fileoverview INCIDENT_LOG implementation - append-only incident journal.
 * @module @omega/decision-engine/incident/incident-log
 *
 * INVARIANTS:
 * - INV-INCIDENT-01: Append-only (never modify)
 * - INV-INCIDENT-02: Hash verifiable
 * - INV-INCIDENT-03: Strict chronology
 */

import { hashJson } from '../util/hash.js';
import type { RuntimeEvent, IncidentEntry, IncidentFilter } from '../types/index.js';
import type { IncidentLog, IncidentLogOptions, IncidentStorage } from './types.js';
import { InMemoryIncidentStorage } from './storage.js';

/**
 * Generates an incident ID.
 */
function generateIncidentId(clock: () => number): string {
  const timestamp = clock();
  const random = Math.floor(Math.random() * 1e9).toString(36);
  return `inc_${timestamp}_${random}`;
}

/**
 * Computes hash for an incident entry.
 * @param entry - Entry without hash
 * @returns SHA-256 hash
 */
function computeIncidentHash(entry: Omit<IncidentEntry, 'hash'>): string {
  return hashJson({
    id: entry.id,
    event: entry.event,
    reason: entry.reason,
    loggedAt: entry.loggedAt,
  });
}

/**
 * Default IncidentLog implementation.
 * Append-only journal with hash verification.
 */
export class DefaultIncidentLog implements IncidentLog {
  private readonly clock: () => number;
  private readonly idGenerator: () => string;
  private readonly storage: IncidentStorage;
  private readonly entryMap: Map<string, IncidentEntry> = new Map();
  private lastTimestamp = 0;

  constructor(options: IncidentLogOptions = {}, storage?: IncidentStorage) {
    this.clock = options.clock ?? (() => Date.now());
    this.idGenerator = options.idGenerator ?? (() => generateIncidentId(this.clock));
    this.storage = storage ?? new InMemoryIncidentStorage();

    // Load existing entries
    for (const entry of this.storage.loadAll()) {
      this.entryMap.set(entry.id, entry);
      if (entry.loggedAt > this.lastTimestamp) {
        this.lastTimestamp = entry.loggedAt;
      }
    }
  }

  /**
   * Logs an incident.
   * INV-INCIDENT-01: Append only.
   * INV-INCIDENT-03: Strict chronology.
   */
  logIncident(event: RuntimeEvent, reason: string): IncidentEntry {
    const now = this.clock();

    // INV-INCIDENT-03: Ensure chronological order
    const loggedAt = Math.max(now, this.lastTimestamp + 1);
    this.lastTimestamp = loggedAt;

    const id = this.idGenerator();

    const entryWithoutHash: Omit<IncidentEntry, 'hash'> = {
      id,
      event,
      reason,
      loggedAt,
    };

    // INV-INCIDENT-02: Compute verifiable hash
    const hash = computeIncidentHash(entryWithoutHash);

    const entry: IncidentEntry = Object.freeze({
      ...entryWithoutHash,
      hash,
    });

    // INV-INCIDENT-01: Append to storage
    this.storage.save(entry);
    this.entryMap.set(id, entry);

    return entry;
  }

  /**
   * Gets an incident by ID.
   */
  getIncident(id: string): IncidentEntry | null {
    return this.entryMap.get(id) ?? null;
  }

  /**
   * Gets incidents matching filter.
   */
  getIncidents(filter?: IncidentFilter): readonly IncidentEntry[] {
    let entries = [...this.entryMap.values()];

    if (filter) {
      if (filter.since !== undefined) {
        entries = entries.filter(e => e.loggedAt >= filter.since!);
      }
      if (filter.until !== undefined) {
        entries = entries.filter(e => e.loggedAt <= filter.until!);
      }
      if (filter.sourceType !== undefined) {
        entries = entries.filter(e => e.event.verdict.source === filter.sourceType);
      }
    }

    // INV-INCIDENT-03: Return in chronological order
    entries.sort((a, b) => a.loggedAt - b.loggedAt);

    return Object.freeze(entries);
  }

  /**
   * Counts incidents matching filter.
   */
  count(filter?: IncidentFilter): number {
    return this.getIncidents(filter).length;
  }

  /**
   * Gets all incidents.
   */
  getAll(): readonly IncidentEntry[] {
    const entries = [...this.entryMap.values()];
    entries.sort((a, b) => a.loggedAt - b.loggedAt);
    return Object.freeze(entries);
  }

  /**
   * Verifies integrity of all entries.
   * INV-INCIDENT-02: Hash verification.
   */
  verifyIntegrity(): boolean {
    for (const entry of this.entryMap.values()) {
      const expectedHash = computeIncidentHash({
        id: entry.id,
        event: entry.event,
        reason: entry.reason,
        loggedAt: entry.loggedAt,
      });

      if (entry.hash !== expectedHash) {
        return false; // Hash mismatch
      }
    }
    return true;
  }

  /**
   * Gets entry count.
   */
  size(): number {
    return this.entryMap.size;
  }
}

/**
 * Creates a new IncidentLog instance.
 * @param options - Configuration options
 * @param storage - Optional storage backend
 * @returns IncidentLog instance
 */
export function createIncidentLog(
  options: IncidentLogOptions = {},
  storage?: IncidentStorage
): IncidentLog {
  return new DefaultIncidentLog(options, storage);
}
