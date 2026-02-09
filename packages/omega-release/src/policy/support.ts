/**
 * OMEGA Release — Support Policy
 * Phase G.0 — Version support status management
 */

import type { SupportPolicy, SupportStatus } from './types.js';

/** Default support durations in days */
const CURRENT_DURATION_DAYS = 365;
const MAINTENANCE_DURATION_DAYS = 180;

/** Calculate support status from release date */
export function calculateSupportStatus(releaseDate: string, now?: Date): SupportStatus {
  const release = new Date(releaseDate);
  const current = now ?? new Date();
  const daysSinceRelease = Math.floor((current.getTime() - release.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceRelease < CURRENT_DURATION_DAYS) {
    return 'CURRENT';
  }
  if (daysSinceRelease < CURRENT_DURATION_DAYS + MAINTENANCE_DURATION_DAYS) {
    return 'MAINTENANCE';
  }
  return 'EOL';
}

/** Create a support policy for a version */
export function createSupportPolicy(version: string, releaseDate: string, now?: Date): SupportPolicy {
  const status = calculateSupportStatus(releaseDate, now);
  const release = new Date(releaseDate);

  const maintenanceDate = new Date(release);
  maintenanceDate.setDate(maintenanceDate.getDate() + CURRENT_DURATION_DAYS);

  const eolDate = new Date(maintenanceDate);
  eolDate.setDate(eolDate.getDate() + MAINTENANCE_DURATION_DAYS);

  return {
    version,
    status,
    releaseDate,
    maintenanceDate: maintenanceDate.toISOString().split('T')[0],
    eolDate: eolDate.toISOString().split('T')[0],
  };
}

/** Check if a version is still supported */
export function isSupported(policy: SupportPolicy): boolean {
  return policy.status !== 'EOL';
}

/** Format support status for display */
export function formatSupportStatus(policy: SupportPolicy): string {
  return `${policy.version}: ${policy.status} (released ${policy.releaseDate})`;
}
