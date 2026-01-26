/**
 * OMEGA Phase B - Common Utilities
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export function sha256(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function canonicalJson(obj) {
  return JSON.stringify(sortKeys(obj), null, 2);
}

function sortKeys(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeys(obj[key]);
  }
  return sorted;
}

export function mustReadUtf8(path) {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  return readFileSync(path, "utf8");
}

export function writeUtf8(path, content) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, "utf8");
}

export function fileExists(path) {
  return existsSync(path);
}

export function checkGates() {
  const ROOT_A = "docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256";
  const CALIB = "tools/calibration/B123_calibration.json";
  
  const results = [];
  
  const rootExists = fileExists(ROOT_A);
  results.push({ gate: "GATE_1_ROOT_A", passed: rootExists, msg: rootExists ? "OK" : "Missing" });
  
  const calibExists = fileExists(CALIB);
  results.push({ gate: "GATE_2_CALIBRATION", passed: calibExists, msg: calibExists ? "OK" : "Missing" });
  
  if (calibExists) {
    const calibContent = mustReadUtf8(CALIB);
    const hasRequired = calibContent.includes('"REQUIRED"');
    results.push({ gate: "GATE_3_NO_REQUIRED", passed: !hasRequired, msg: hasRequired ? "Found REQUIRED" : "OK" });
  }
  
  return results;
}

export function loadRootA() {
  const content = mustReadUtf8("docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256");
  const match = content.trim().match(/^([a-f0-9]{64})/);
  if (!match) throw new Error("Invalid root A format");
  return match[1];
}

export function loadCalibration() {
  const content = mustReadUtf8("tools/calibration/B123_calibration.json");
  const calib = JSON.parse(content);
  return { N_LONG_REPEAT: calib.N_LONG_REPEAT ?? 3, sha256: sha256(content) };
}
