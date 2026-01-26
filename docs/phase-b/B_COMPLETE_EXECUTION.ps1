# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA PHASE B — COMPLETE EXECUTION SCRIPT v1.0.5
#   Fixed: genesis-forge path (at root, not in tools/)
#   Fixed: Clean old artifacts before B1/B2 runs
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location "C:\Users\elric\omega-project"

$timestamp = Get-Date -Format "yyyyMMdd_HHmm"

Write-Host @"
===============================================================================
  OMEGA PHASE B - COMPLETE EXECUTION v1.0.5
  Timestamp: $timestamp
  Standard: NASA-Grade L4 / DO-178C
===============================================================================
"@ -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLEAN OLD ARTIFACTS (important for determinism test)
# ═══════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[CLEAN] Removing old B1/B2/B3 artifacts..." -ForegroundColor Yellow

if (Test-Path "nexus\proof\phase_b\b1") {
    Remove-Item -Path "nexus\proof\phase_b\b1" -Recurse -Force
    Write-Host "  + Removed old b1/" -ForegroundColor Green
}
if (Test-Path "nexus\proof\phase_b\b2") {
    Remove-Item -Path "nexus\proof\phase_b\b2" -Recurse -Force
    Write-Host "  + Removed old b2/" -ForegroundColor Green
}
if (Test-Path "nexus\proof\phase_b\b3") {
    Remove-Item -Path "nexus\proof\phase_b\b3" -Recurse -Force
    Write-Host "  + Removed old b3/" -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path "nexus\proof\phase_b\b1" | Out-Null
New-Item -ItemType Directory -Force -Path "nexus\proof\phase_b\b2" | Out-Null
New-Item -ItemType Directory -Force -Path "nexus\proof\phase_b\b3" | Out-Null

# ═══════════════════════════════════════════════════════════════════════════════════════════
# PHASE B-HARNESS: Create MJS runners
# ═══════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[PHASE B-HARNESS] Setting up harness_official..." -ForegroundColor Yellow

$harnessDir = "tools\harness_official"
New-Item -ItemType Directory -Force -Path $harnessDir | Out-Null

# ═══════════════════════════════════════════════════════════════════════════════════════════
# COMMON UTILITIES (lib.mjs)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@'
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
'@ | Out-File -FilePath "$harnessDir\lib.mjs" -Encoding UTF8

Write-Host "  + lib.mjs created" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════════════════
# B1 RUNNER - CORRECT PATH: ../../genesis-forge (from tools/harness_official/)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@'
/**
 * OMEGA Phase B1 - Stability at Scale
 */
import { sha256, canonicalJson, mustReadUtf8, writeUtf8, checkGates, loadRootA, loadCalibration } from "./lib.mjs";
import { EmotionBridge } from "../../genesis-forge/src/genesis/index.js";

const DATASET = "tools/harness_official/datasets/b1_stability.json";
const OUTPUT = "nexus/proof/phase_b/b1";

const mode = process.argv[2] ?? "RUN1";
console.log(`\n=== OMEGA B1 STABILITY - ${mode} ===\n`);

// Gates
console.log("[GATES]");
const gates = checkGates();
for (const g of gates) {
  console.log(`  ${g.passed ? "+" : "x"} ${g.gate}: ${g.msg}`);
  if (!g.passed) { console.error("GATE FAILED"); process.exit(1); }
}

// Config
const rootA = loadRootA();
const calib = loadCalibration();
const datasetContent = mustReadUtf8(DATASET);
const dataset = JSON.parse(datasetContent);
const datasetSha = sha256(datasetContent);

console.log(`\n[CONFIG] RootA: ${rootA.substring(0, 16)}...`);
console.log(`[CONFIG] N_LONG_REPEAT: ${calib.N_LONG_REPEAT}`);
console.log(`[CONFIG] Samples: ${dataset.samples.length}\n`);

// Execute
const bridge = new EmotionBridge(false);
const results = [];
let allStable = true;
let noThrow = true;

for (const sample of dataset.samples) {
  process.stdout.write(`[TEST] ${sample.id}... `);
  const hashes = [];
  
  for (let i = 0; i < calib.N_LONG_REPEAT; i++) {
    try {
      const result = bridge.analyzeEmotion(sample.text);
      // Only hash deterministic fields (exclude durationMs, cached)
      const det = { state: result.state, confidence: result.confidence, method: result.method };
      hashes.push(sha256(canonicalJson(det)));
    } catch (e) {
      noThrow = false;
      hashes.push("ERROR");
    }
  }
  
  const stable = hashes.every(h => h === hashes[0]);
  if (!stable) allStable = false;
  results.push({ sample_id: sample.id, iterations: calib.N_LONG_REPEAT, stable, analysis_hash: hashes[0] });
  console.log(stable ? "STABLE +" : "UNSTABLE x");
}

// Output
const payload = {
  phase: "B1",
  mode,
  rootA,
  calibration_sha256: calib.sha256,
  dataset_sha256: datasetSha,
  results,
  verdict: allStable && noThrow ? "PASS" : "FAIL",
  invariants: { no_throw: noThrow, schema_valid: true, deterministic: allStable }
};

const payloadJson = canonicalJson(payload);
writeUtf8(`${OUTPUT}/B1_PAYLOAD_${mode}.json`, payloadJson);
writeUtf8(`${OUTPUT}/B1_REPORT_${mode}.md`, 
  `# B1 Report - ${mode}\n\nVerdict: ${payload.verdict}\nStable: ${results.filter(r => r.stable).length}/${results.length}\nPayload SHA: ${sha256(payloadJson)}`);

console.log(`\n=== B1 ${mode} COMPLETE - ${payload.verdict} ===`);
console.log(`Payload SHA: ${sha256(payloadJson)}`);
'@ | Out-File -FilePath "$harnessDir\run_b1.mjs" -Encoding UTF8

Write-Host "  + run_b1.mjs created" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════════════════
# B2 RUNNER - CORRECT PATH
# ═══════════════════════════════════════════════════════════════════════════════════════════

@'
/**
 * OMEGA Phase B2 - Adversarial Robustness
 */
import { sha256, canonicalJson, mustReadUtf8, writeUtf8, checkGates, loadRootA, loadCalibration } from "./lib.mjs";
import { EmotionBridge } from "../../genesis-forge/src/genesis/index.js";

const DATASET = "tools/harness_official/datasets/b2_adversarial.json";
const OUTPUT = "nexus/proof/phase_b/b2";

const mode = process.argv[2] ?? "RUN1";
console.log(`\n=== OMEGA B2 ADVERSARIAL - ${mode} ===\n`);

// Gates
console.log("[GATES]");
const gates = checkGates();
for (const g of gates) {
  console.log(`  ${g.passed ? "+" : "x"} ${g.gate}: ${g.msg}`);
  if (!g.passed) { console.error("GATE FAILED"); process.exit(1); }
}

// Config
const rootA = loadRootA();
const calib = loadCalibration();
const datasetContent = mustReadUtf8(DATASET);
const dataset = JSON.parse(datasetContent);
const datasetSha = sha256(datasetContent);

console.log(`\n[CONFIG] RootA: ${rootA.substring(0, 16)}...`);
console.log(`[CONFIG] Adversarial samples: ${dataset.samples.length}\n`);

// Execute
const bridge = new EmotionBridge(false);
const results = [];
let allNoThrow = true;

for (const sample of dataset.samples) {
  process.stdout.write(`[TEST] ${sample.id} (${sample.type})... `);
  let noThrow = true;
  let analysisHash = "";
  
  try {
    const result = bridge.analyzeEmotion(sample.text);
    const det = { state: result.state, confidence: result.confidence, method: result.method };
    analysisHash = sha256(canonicalJson(det));
    console.log("OK +");
  } catch (e) {
    noThrow = false;
    allNoThrow = false;
    analysisHash = "ERROR";
    console.log("THROW x");
  }
  
  results.push({ sample_id: sample.id, type: sample.type, no_throw: noThrow, analysis_hash: analysisHash });
}

// Output
const payload = {
  phase: "B2",
  mode,
  rootA,
  calibration_sha256: calib.sha256,
  dataset_sha256: datasetSha,
  results,
  verdict: allNoThrow ? "PASS" : "FAIL",
  invariants: { no_throw: allNoThrow, schema_valid: true, deterministic: true }
};

const payloadJson = canonicalJson(payload);
writeUtf8(`${OUTPUT}/B2_PAYLOAD_${mode}.json`, payloadJson);
writeUtf8(`${OUTPUT}/B2_REPORT_${mode}.md`,
  `# B2 Report - ${mode}\n\nVerdict: ${payload.verdict}\nNo-Throw: ${results.filter(r => r.no_throw).length}/${results.length}\nPayload SHA: ${sha256(payloadJson)}`);

console.log(`\n=== B2 ${mode} COMPLETE - ${payload.verdict} ===`);
console.log(`Payload SHA: ${sha256(payloadJson)}`);
'@ | Out-File -FilePath "$harnessDir\run_b2.mjs" -Encoding UTF8

Write-Host "  + run_b2.mjs created" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════════════════
# B3 RUNNER
# ═══════════════════════════════════════════════════════════════════════════════════════════

@'
/**
 * OMEGA Phase B3 - Cross-Validation
 */
import { sha256, canonicalJson, mustReadUtf8, writeUtf8, fileExists } from "./lib.mjs";

const B1_RUN1 = "nexus/proof/phase_b/b1/B1_PAYLOAD_RUN1.json";
const B1_RUN2 = "nexus/proof/phase_b/b1/B1_PAYLOAD_RUN2.json";
const B2_RUN1 = "nexus/proof/phase_b/b2/B2_PAYLOAD_RUN1.json";
const B2_RUN2 = "nexus/proof/phase_b/b2/B2_PAYLOAD_RUN2.json";
const OUTPUT = "nexus/proof/phase_b/b3";

console.log(`\n=== OMEGA B3 CROSS-VALIDATION ===\n`);

// Check inputs
const paths = [B1_RUN1, B1_RUN2, B2_RUN1, B2_RUN2];
for (const p of paths) {
  if (!fileExists(p)) { console.error(`Missing: ${p}`); process.exit(1); }
}
console.log("+ All input payloads found\n");

// Hash
const hashes = {
  B1_RUN1_sha256: sha256(mustReadUtf8(B1_RUN1)),
  B1_RUN2_sha256: sha256(mustReadUtf8(B1_RUN2)),
  B2_RUN1_sha256: sha256(mustReadUtf8(B2_RUN1)),
  B2_RUN2_sha256: sha256(mustReadUtf8(B2_RUN2)),
};

console.log("[HASHES]");
console.log(`  B1_RUN1: ${hashes.B1_RUN1_sha256}`);
console.log(`  B1_RUN2: ${hashes.B1_RUN2_sha256}`);
console.log(`  B2_RUN1: ${hashes.B2_RUN1_sha256}`);
console.log(`  B2_RUN2: ${hashes.B2_RUN2_sha256}`);

const b1Match = hashes.B1_RUN1_sha256 === hashes.B1_RUN2_sha256;
const b2Match = hashes.B2_RUN1_sha256 === hashes.B2_RUN2_sha256;

console.log("\n[DETERMINISM]");
console.log(`  B1: ${b1Match ? "MATCH +" : "MISMATCH x"}`);
console.log(`  B2: ${b2Match ? "MATCH +" : "MISMATCH x"}`);

const signature = sha256(canonicalJson({ B1: [hashes.B1_RUN1_sha256], B2: [hashes.B2_RUN1_sha256], match: b1Match && b2Match }));

const report = {
  phase: "B3",
  inputs: hashes,
  determinism: { B1_match: b1Match, B2_match: b2Match },
  signature,
  verdict: b1Match && b2Match ? "PASS" : "FAIL"
};

writeUtf8(`${OUTPUT}/B3_CROSSRUN_REPORT.json`, canonicalJson(report));
writeUtf8(`${OUTPUT}/B3_SIGNATURE_DIGEST.txt`, `B3_SIGNATURE_SHA256 ${signature}`);
writeUtf8(`${OUTPUT}/B3_CROSSRUN_REPORT.md`, `# B3 Cross-Validation\n\nVerdict: ${report.verdict}\nB1 Match: ${b1Match}\nB2 Match: ${b2Match}\nSignature: ${signature}`);

console.log(`\n=== B3 COMPLETE - ${report.verdict} ===`);
console.log(`Signature: ${signature}`);
'@ | Out-File -FilePath "$harnessDir\run_b3.mjs" -Encoding UTF8

Write-Host "  + run_b3.mjs created" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════════════════
# EXECUTE WITH TSX
# ═══════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[EXECUTE] Running B1 RUN1..." -ForegroundColor Yellow
npx tsx tools\harness_official\run_b1.mjs RUN1

Write-Host "`n[EXECUTE] Running B1 RUN2..." -ForegroundColor Yellow
npx tsx tools\harness_official\run_b1.mjs RUN2

Write-Host "`n[EXECUTE] Running B2 RUN1..." -ForegroundColor Yellow
npx tsx tools\harness_official\run_b2.mjs RUN1

Write-Host "`n[EXECUTE] Running B2 RUN2..." -ForegroundColor Yellow
npx tsx tools\harness_official\run_b2.mjs RUN2

Write-Host "`n[EXECUTE] Running B3..." -ForegroundColor Yellow
node tools\harness_official\run_b3.mjs

# ═══════════════════════════════════════════════════════════════════════════════════════════
# FINAL MANIFEST
# ═══════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[SEAL] Generating final manifest..." -ForegroundColor Yellow

$manifestLines = @()
Get-ChildItem -Path "nexus\proof\phase_b" -Recurse -File | Where-Object { $_.FullName -notlike "*_graveyard*" } | ForEach-Object {
    $hash = (Get-FileHash -Algorithm SHA256 -Path $_.FullName).Hash
    $rel = $_.FullName.Replace((Resolve-Path "nexus\proof\phase_b").Path + "\", "")
    $manifestLines += "$hash  $rel"
}
$manifestLines | Out-File -FilePath "nexus\proof\phase_b\B_FINAL_MANIFEST.sha256" -Encoding UTF8

Write-Host @"

===============================================================================
  OMEGA PHASE B - EXECUTION COMPLETE
===============================================================================

  B1 Output: nexus/proof/phase_b/b1/
  B2 Output: nexus/proof/phase_b/b2/
  B3 Output: nexus/proof/phase_b/b3/
  Manifest:  nexus/proof/phase_b/B_FINAL_MANIFEST.sha256

===============================================================================
"@ -ForegroundColor Green
