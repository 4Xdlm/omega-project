import { mustReadUtf8, fileExists } from "./io.js";
import { sha256 } from "./hash.js";

const ROOT_A_PATH = "docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256";
const CALIBRATION_PATH = "tools/calibration/B123_calibration.json";

export interface GateResult {
  gate: string;
  passed: boolean;
  message: string;
}

export function checkAllGates(): GateResult[] {
  const results: GateResult[] = [];

  const rootAExists = fileExists(ROOT_A_PATH);
  results.push({
    gate: "GATE_1_ROOT_A_EXISTS",
    passed: rootAExists,
    message: rootAExists ? `Found: ${ROOT_A_PATH}` : `Missing: ${ROOT_A_PATH}`,
  });

  const calibExists = fileExists(CALIBRATION_PATH);
  results.push({
    gate: "GATE_2_CALIBRATION_EXISTS",
    passed: calibExists,
    message: calibExists ? `Found: ${CALIBRATION_PATH}` : `Missing: ${CALIBRATION_PATH}`,
  });

  if (calibExists) {
    const calibContent = mustReadUtf8(CALIBRATION_PATH);
    const hasRequired = calibContent.includes('"REQUIRED"');
    results.push({
      gate: "GATE_3_NO_REQUIRED_LITERALS",
      passed: !hasRequired,
      message: hasRequired ? "Found REQUIRED literal" : "No REQUIRED literals",
    });
  }

  return results;
}

export function loadRootA(): string {
  const content = mustReadUtf8(ROOT_A_PATH);
  const match = content.trim().match(/^([a-f0-9]{64})/);
  if (!match) {
    throw new Error(`Invalid root A format in ${ROOT_A_PATH}`);
  }
  return match[1];
}

export function loadCalibration(): { N_LONG_REPEAT: number; sha256: string } {
  const content = mustReadUtf8(CALIBRATION_PATH);
  const calib = JSON.parse(content);
  return {
    N_LONG_REPEAT: calib.N_LONG_REPEAT ?? 3,
    sha256: sha256(content),
  };
}
