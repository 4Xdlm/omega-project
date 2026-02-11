/**
 * OMEGA Metrics — Hasher
 * Deterministic SHA-256 hashing of artifacts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Import from canon-kernel - exported via index
// @ts-ignore - type resolution issue with file: protocol
import { sha256, canonicalize } from '@omega/canon-kernel';

/**
 * Compute SHA-256 hash of intent and genesis plan artifacts
 * Uses canonical JSON to ensure determinism
 *
 * @param runDir - Path to run directory
 * @param runId - Run ID
 * @returns SHA-256 hash (64-char lowercase hex)
 */
export function hashArtifacts(runDir: string, runId: string): string {
  const intentPath = join(runDir, 'runs', runId, '00-intent', 'intent.json');
  const planPath = join(runDir, 'runs', runId, '10-genesis', 'genesis-plan.json');

  const intentContent = readFileSync(intentPath, 'utf8');
  const planContent = readFileSync(planPath, 'utf8');

  // Parse to objects, then canonicalize for determinism
  const intentObj = JSON.parse(intentContent);
  const planObj = JSON.parse(planContent);

  const intentCanonical = canonicalize(intentObj);
  const planCanonical = canonicalize(planObj);

  // Combine with null-byte separator
  const combined = intentCanonical + '\0' + planCanonical;

  return sha256(combined);
}

/**
 * Compute hash of a MetricsReport (excluding the report_hash field itself)
 *
 * @param report - Metrics report object
 * @returns SHA-256 hash (64-char lowercase hex)
 */
export function hashReport(report: Record<string, unknown>): string {
  // Create a copy without report_hash field
  const reportCopy = { ...report };
  delete reportCopy.report_hash;

  const canonical = canonicalize(reportCopy);
  return sha256(canonical);
}

/**
 * Compute hash of genesis plan only
 *
 * @param runDir - Path to run directory
 * @param runId - Run ID
 * @returns SHA-256 hash of genesis plan
 */
export function hashGenesisPlan(runDir: string, runId: string): string {
  const planPath = join(runDir, 'runs', runId, '10-genesis', 'genesis-plan.json');
  const planContent = readFileSync(planPath, 'utf8');
  const planObj = JSON.parse(planContent);
  const planCanonical = canonicalize(planObj);

  return sha256(planCanonical);
}
