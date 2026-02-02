/**
 * @fileoverview Storage implementations for INCIDENT_LOG.
 * @module @omega/decision-engine/incident/storage
 *
 * INV-INCIDENT-01: Append-only storage
 */

import type { IncidentEntry } from '../types/index.js';
import type { IncidentStorage } from './types.js';

/**
 * In-memory storage implementation.
 * Suitable for testing and ephemeral use.
 */
export class InMemoryIncidentStorage implements IncidentStorage {
  private readonly entries: IncidentEntry[] = [];

  /**
   * Saves an incident entry.
   * INV-INCIDENT-01: Append-only.
   */
  save(entry: IncidentEntry): void {
    // Freeze entry to prevent modification
    this.entries.push(Object.freeze({ ...entry }));
  }

  /**
   * Loads all entries.
   */
  loadAll(): IncidentEntry[] {
    return [...this.entries];
  }

  /**
   * Clears all entries (testing only).
   */
  clear(): void {
    this.entries.length = 0;
  }

  /**
   * Gets entry count.
   */
  count(): number {
    return this.entries.length;
  }
}

/**
 * Creates an in-memory storage instance.
 * @returns IncidentStorage instance
 */
export function createInMemoryStorage(): IncidentStorage {
  return new InMemoryIncidentStorage();
}

/**
 * Validates storage integrity.
 * Checks that entries are properly ordered.
 * INV-INCIDENT-03: Strict chronology.
 * @param storage - Storage to validate
 * @returns True if valid
 */
export function validateStorageIntegrity(storage: IncidentStorage): boolean {
  const entries = storage.loadAll();

  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];
    if (prev && curr && prev.loggedAt > curr.loggedAt) {
      return false; // Chronology violation
    }
  }

  return true;
}
