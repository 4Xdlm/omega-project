/**
 * OMEGA Metrics — Reader
 * Reads run artifacts from disk (offline only)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { RunArtifacts, GenesisPlan, IntentPack } from './types.js';

/**
 * Discover run_id from runs directory
 * @param runDir - Path to run directory (e.g., golden/h2/run_001)
 * @returns run_id (e.g., 69b752ce50eaedac)
 */
export function discoverRunId(runDir: string): string {
  const runsPath = join(runDir, 'runs');

  if (!existsSync(runsPath)) {
    throw new Error(`Runs directory not found: ${runsPath}`);
  }

  const entries = readdirSync(runsPath, { withFileTypes: true });
  const runDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  if (runDirs.length === 0) {
    throw new Error(`No run directories found in: ${runsPath}`);
  }

  if (runDirs.length > 1) {
    // Take first alphabetically for determinism
    runDirs.sort();
  }

  return runDirs[0];
}

/**
 * Read genesis plan from run directory
 * @param runDir - Path to run directory
 * @param runId - Run ID
 * @returns Parsed genesis plan
 */
export function readGenesisPlan(runDir: string, runId: string): GenesisPlan {
  const planPath = join(runDir, 'runs', runId, '10-genesis', 'genesis-plan.json');

  if (!existsSync(planPath)) {
    throw new Error(`Genesis plan not found: ${planPath}`);
  }

  const content = readFileSync(planPath, 'utf8');
  const plan = JSON.parse(content) as GenesisPlan;

  // Validate basic structure
  if (!plan.arcs || !Array.isArray(plan.arcs)) {
    throw new Error(`Invalid genesis plan: missing or invalid arcs array`);
  }

  return plan;
}

/**
 * Read intent pack from run directory
 * @param runDir - Path to run directory
 * @param runId - Run ID
 * @returns Parsed intent pack
 */
export function readIntentPack(runDir: string, runId: string): IntentPack {
  const intentPath = join(runDir, 'runs', runId, '00-intent', 'intent.json');

  if (!existsSync(intentPath)) {
    throw new Error(`Intent pack not found: ${intentPath}`);
  }

  const content = readFileSync(intentPath, 'utf8');
  const intent = JSON.parse(content) as IntentPack;

  // Validate basic structure
  if (!intent.intent || !intent.canon || !intent.constraints) {
    throw new Error(`Invalid intent pack: missing required sections`);
  }

  return intent;
}

/**
 * Read all artifacts for a run
 * @param runDir - Path to run directory (e.g., golden/h2/run_001)
 * @returns Complete run artifacts
 */
export function readRunArtifacts(runDir: string): RunArtifacts {
  const runId = discoverRunId(runDir);
  const plan = readGenesisPlan(runDir, runId);
  const intent = readIntentPack(runDir, runId);

  return {
    run_id: runId,
    intent,
    plan,
  };
}

/**
 * Check if a run directory contains complete artifacts
 * @param runDir - Path to run directory
 * @returns true if all required files exist
 */
export function hasCompleteArtifacts(runDir: string): boolean {
  try {
    const runId = discoverRunId(runDir);
    const planPath = join(runDir, 'runs', runId, '10-genesis', 'genesis-plan.json');
    const intentPath = join(runDir, 'runs', runId, '00-intent', 'intent.json');

    return existsSync(planPath) && existsSync(intentPath);
  } catch {
    return false;
  }
}
