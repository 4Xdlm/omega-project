/**
 * B3 Cross-Run Consistency - Harness Runner
 * Status: SKELETON (no execution logic)
 * Phase: B-REARM (not B-EXEC)
 *
 * HARD RULES:
 * - Read PHASE_A_ROOT from docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256 (NEVER hardcode)
 * - Read calibration from tools/calibration/B123_calibration.json (NEVER hardcode)
 * - FAIL if calibration contains "REQUIRED" values
 * - REQUIRE B1 and B2 completion before running
 * - NO magic numbers anywhere
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '../../..');
const PHASE_A_ROOT_PATH = resolve(ROOT_DIR, 'docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256');
const CALIBRATION_PATH = resolve(ROOT_DIR, 'tools/calibration/B123_calibration.json');
const B1_REPORT_PATH = resolve(ROOT_DIR, 'out/b1/B1_RUN_REPORT.md');
const B2_REPORT_PATH = resolve(ROOT_DIR, 'out/b2/B2_COLLISION_REPORT.md');

interface Calibration {
  crossrun: {
    CROSSRUN_ITERATIONS: number | string;
    DIVERGENCE_THRESHOLD: number | string;
  };
}

function loadPhaseARoot(): string {
  if (!existsSync(PHASE_A_ROOT_PATH)) {
    throw new Error(`FATAL: Phase A root manifest not found: ${PHASE_A_ROOT_PATH}`);
  }
  return readFileSync(PHASE_A_ROOT_PATH, 'utf-8').trim();
}

function loadCalibration(): Calibration {
  if (!existsSync(CALIBRATION_PATH)) {
    throw new Error(`FATAL: Calibration file not found: ${CALIBRATION_PATH}`);
  }

  const raw = JSON.parse(readFileSync(CALIBRATION_PATH, 'utf-8'));

  const checkRequired = (obj: Record<string, unknown>, path: string): void => {
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('_')) continue;
      if (value === 'REQUIRED') {
        throw new Error(`FATAL: Calibration "${path}.${key}" = REQUIRED (must be set before execution)`);
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        checkRequired(value as Record<string, unknown>, `${path}.${key}`);
      }
    }
  };

  checkRequired(raw, 'calibration');
  return raw as Calibration;
}

function checkPrerequisites(): void {
  if (!existsSync(B1_REPORT_PATH)) {
    throw new Error(`FATAL: B1 must complete before B3. Missing: ${B1_REPORT_PATH}`);
  }
  if (!existsSync(B2_REPORT_PATH)) {
    throw new Error(`FATAL: B2 must complete before B3. Missing: ${B2_REPORT_PATH}`);
  }
}

export async function runB3(): Promise<void> {
  console.log('[B3] === CROSS-RUN CONSISTENCY ===');
  console.log('[B3] Status: B-REARM (skeleton only, no execution)');

  checkPrerequisites();

  const phaseARoot = loadPhaseARoot();
  console.log(`[B3] Phase A Root: ${phaseARoot}`);

  const calibration = loadCalibration();
  console.log('[B3] Calibration: LOADED');

  throw new Error('[B3] SKELETON ONLY - no execution logic implemented. Awaiting B-EXEC phase.');
}

if (require.main === module) {
  runB3().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
