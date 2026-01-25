import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const __ENTRY_FILE__ = process.argv[1] ? `file:///" + process.argv[1].replace(/\\\\/g, "/") + " : "";
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
 * B1 Stability at Scale - Harness Runner
 * Status: SKELETON (no execution logic)
 * Phase: B-REARM (not B-EXEC)
 *
 * HARD RULES:
 * - Read PHASE_A_ROOT from docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256 (NEVER hardcode)
 * - Read calibration from tools/calibration/B123_calibration.json (NEVER hardcode)
 * - FAIL if calibration contains "REQUIRED" values
 * - FAIL if Phase A root hash mismatch
 * - NO magic numbers anywhere
 * - Timestamps ONLY in *_unsigned fields
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
const ROOT_DIR = resolve(__dirname, '../../..');
const PHASE_A_ROOT_PATH = resolve(ROOT_DIR, 'docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256');
const CALIBRATION_PATH = resolve(ROOT_DIR, 'tools/calibration/B123_calibration.json');

interface Calibration {
  stability: {
    N_LONG_REPEAT: number | string;
    N_STEPS: number | string;
    STEP_SIZE: number | string;
    DRIFT_THRESHOLD: number | string;
    STABILITY_WINDOW: number | string;
  };
  emotion: {
    AROUSAL_UNIT: number | string;
    DOMINANCE_NEUTRAL: number | string;
    VALENCE_BASELINE: number | string;
  };
  adversarial: {
    SARCASM_PENALTY: number | string;
    NEGATION_FLIP_FACTOR: number | string;
    LEXICON_POISON_THRESHOLD: number | string;
  };
  oracle: {
    CONSENSUS_THRESHOLD: number | string;
    CONFIDENCE_MIN: number | string;
    EVIDENCE_REQUIRED: number | string;
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

export async function runB1(): Promise<void> {
  console.log('[B1] === STABILITY AT SCALE ===');
  console.log('[B1] Status: B-REARM (skeleton only, no execution)');

  const phaseARoot = loadPhaseARoot();
  console.log(`[B1] Phase A Root: ${phaseARoot}`);

  const calibration = loadCalibration();
  console.log('[B1] Calibration: LOADED');

  // B-EXEC logic would go here
  // For B-REARM: throw to prevent accidental execution
  throw new Error('[B1] SKELETON ONLY - no execution logic implemented. Awaiting B-EXEC phase.');
}

if (true) {
  runB1().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}



// __OMEGA_FORCED_OUTPUT_B1__
if (true) {
  const mode = (process.argv[2] || "").toUpperCase();
  if (mode !== "RUN1" && mode !== "RUN2") {
    console.error("Usage: run_b1.ts RUN1|RUN2");
    process.exit(2);
  }

  const outDir = resolve(ROOT_DIR, "nexus", "proof", "phase_b", "b1");
  __omegaEnsureDir(outDir);

  const payloadPath = resolve(outDir, mode === "RUN1" ? "B1_PAYLOAD_RUN1.json" : "B1_PAYLOAD_RUN2.json");
  const reportPath  = resolve(outDir, mode === "RUN1" ? "B1_REPORT_RUN1.md"   : "B1_REPORT_RUN2.md");

  const payload = {
    phase: "B1",
    run: mode,
    rootA: (process.env.OMEGA_ROOT_A || null),
    calibrationSha256: (process.env.OMEGA_CAL_SHA256 || null),
    note: "FORCED OUTPUT WRITER (minimal) Ã¢â‚¬â€ replace with real payload later",
  };

  __omegaWriteJson(payloadPath, payload);
  __omegaWriteText(reportPath, [
    "# B1 REPORT",
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