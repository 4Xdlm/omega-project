/**
 * @fileoverview INCIDENT module type definitions.
 * @module @omega/decision-engine/incident/types
 */

import type { RuntimeEvent, IncidentEntry, IncidentFilter } from '../types/index.js';

/**
 * INCIDENT_LOG interface - append-only journal for BLOCK events.
 * INV-INCIDENT-01: Append-only (no modification).
 * INV-INCIDENT-02: Hash verifiable.
 * INV-INCIDENT-03: Strict chronology.
 */
export interface IncidentLog {
  /**
   * Logs an incident.
   * INV-INCIDENT-01: Appends without modifying existing.
   * @param event - The blocked event
   * @param reason - Reason for blocking
   * @returns Created incident entry
   */
  logIncident(event: RuntimeEvent, reason: string): IncidentEntry;

  /**
   * Gets an incident by ID.
   * @param id - Incident ID
   * @returns Incident entry or null
   */
  getIncident(id: string): IncidentEntry | null;

  /**
   * Gets incidents matching filter.
   * @param filter - Optional filter criteria
   * @returns Array of matching incidents
   */
  getIncidents(filter?: IncidentFilter): readonly IncidentEntry[];

  /**
   * Counts incidents matching filter.
   * @param filter - Optional filter criteria
   * @returns Count of matching incidents
   */
  count(filter?: IncidentFilter): number;

  /**
   * Gets all incidents.
   * @returns All incident entries
   */
  getAll(): readonly IncidentEntry[];

  /**
   * Verifies integrity of all entries.
   * INV-INCIDENT-02: Hash verification.
   * @returns True if all hashes valid
   */
  verifyIntegrity(): boolean;
}

/**
 * Options for creating an IncidentLog.
 */
export interface IncidentLogOptions {
  /** Clock function for timestamps */
  readonly clock?: () => number;
  /** ID generator function */
  readonly idGenerator?: () => string;
}

/**
 * Storage backend for incident persistence.
 */
export interface IncidentStorage {
  /**
   * Saves an incident entry.
   * @param entry - Entry to save
   */
  save(entry: IncidentEntry): void;

  /**
   * Loads all entries.
   * @returns All stored entries
   */
  loadAll(): IncidentEntry[];

  /**
   * Clears all entries (for testing only).
   */
  clear(): void;
}
