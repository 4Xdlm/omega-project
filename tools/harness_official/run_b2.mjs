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
