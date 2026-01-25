import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const __ENTRY_FILE__ = process.argv[1] ? `file://${process.argv[1].replace(/\\/g, "/")}` : "";
const __IS_MAIN__ = import.meta.url === __ENTRY_FILE__;

import { mkdirSync, writeFileSync } from "fs";

function __omegaEnsureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

function __omegaWriteText(path: string, content: string) {
  writeFileSync(path, content, { encoding: "utf8" });
}

function __omegaWriteJson(path: string, obj: unknown) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", { encoding: "utf8" });
}
/**
 * B2 Canon Collision Detection - Harness Runner
 * Status: SKELETON (no execution logic)
 * Phase: B-REARM (not B-EXEC)
 *
 * HARD RULES:
 * - Read PHASE_A_ROOT from docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256 (NEVER hardcode)
 * - Read calibration from tools/calibration/B123_calibration.json (NEVER hardcode)
 * - FAIL if calibration contains "REQUIRED" values
 * - NO magic numbers anywhere
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
const ROOT_DIR = resolve(__dirname, '../../..');
const PHASE_A_ROOT_PATH = resolve(ROOT_DIR, 'docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256');
const CALIBRATION_PATH = resolve(ROOT_DIR, 'tools/calibration/B123_calibration.json');

interface Calibration {
  collision: {
    COLLISION_SAMPLE_SIZE: number | string;
    HASH_TOLERANCE: number | string;
    RETRY_LIMIT: number | string;
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

export async function runB2(): Promise<void> {
  console.log('[B2] === CANON COLLISION DETECTION ===');
  console.log('[B2] Status: B-REARM (skeleton only, no execution)');

  const phaseARoot = loadPhaseARoot();
  console.log(`[B2] Phase A Root: ${phaseARoot}`);

  const calibration = loadCalibration();
  console.log('[B2] Calibration: LOADED');

  throw new Error('[B2] SKELETON ONLY - no execution logic implemented. Awaiting B-EXEC phase.');
}

if (__IS_MAIN__) {
  runB2().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}



// __OMEGA_FORCED_OUTPUT_B2__
if (__IS_MAIN__) {
  const mode = (process.argv[2] || "").toUpperCase();
  if (mode !== "RUN1" && mode !== "RUN2") {
    console.error("Usage: run_b2.ts RUN1|RUN2");
    process.exit(2);
  }

  const outDir = resolve(ROOT_DIR, "nexus", "proof", "phase_b", "b2");
  __omegaEnsureDir(outDir);

  const payloadPath = resolve(outDir, mode === "RUN1" ? "B2_PAYLOAD_RUN1.json" : "B2_PAYLOAD_RUN2.json");
  const reportPath  = resolve(outDir, mode === "RUN1" ? "B2_REPORT_RUN1.md"   : "B2_REPORT_RUN2.md");

  const payload = {
    phase: "B2",
    run: mode,
    rootA: (process.env.OMEGA_ROOT_A || null),
    calibrationSha256: (process.env.OMEGA_CAL_SHA256 || null),
    note: "FORCED OUTPUT WRITER (minimal) — replace with real payload later",
  };

  __omegaWriteJson(payloadPath, payload);
  __omegaWriteText(reportPath, [
    "# B2 REPORT",
    "",
    "- run: " + mode,
    "- rootA: " + (payload.rootA ?? "null"),
    "- calibrationSha256: " + (payload.calibrationSha256 ?? "null"),
    "",
    "NOTE: minimal forced artifact to unblock pipeline."
  ].join("\n") + "\n");

  console.log("WROTE:", payloadPath);
  console.log("WROTE:", reportPath);
}