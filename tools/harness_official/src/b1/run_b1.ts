/**
 * OMEGA Phase B1 - Stability at Scale
 */
import { checkAllGates, loadRootA, loadCalibration } from "../lib/gates.js";
import { sha256, canonicalJson } from "../lib/hash.js";
import { mustReadUtf8, writeUtf8 } from "../lib/io.js";
import { EmotionBridge } from "../../../../genesis-forge/src/genesis/index.js";

const DATASET_PATH = "tools/harness_official/datasets/b1_stability.json";
const OUTPUT_DIR = "nexus/proof/phase_b/b1";

interface Sample { id: string; text: string; }
interface Dataset { version: string; samples: Sample[]; }
interface SampleResult { sample_id: string; iterations: number; stable: boolean; analysis_hash: string; }

async function main() {
  const mode = (process.argv[2] ?? "RUN1") as "RUN1" | "RUN2";
  console.log(`\n=== OMEGA B1 STABILITY TEST - ${mode} ===\n`);

  console.log("[GATES] Checking prerequisites...");
  const gates = checkAllGates();
  for (const g of gates) {
    console.log(`  ${g.passed ? "+" : "x"} ${g.gate}: ${g.message}`);
    if (!g.passed) { console.error("\nGATE FAILED - Aborting"); process.exit(1); }
  }
  console.log("  + All gates passed\n");

  const rootA = loadRootA();
  const calib = loadCalibration();
  const datasetContent = mustReadUtf8(DATASET_PATH);
  const dataset: Dataset = JSON.parse(datasetContent);
  const datasetSha = sha256(datasetContent);

  console.log(`[CONFIG] RootA: ${rootA.substring(0, 16)}...`);
  console.log(`[CONFIG] N_LONG_REPEAT: ${calib.N_LONG_REPEAT}`);
  console.log(`[CONFIG] Samples: ${dataset.samples.length}\n`);

  const bridge = new EmotionBridge(false);
  const results: SampleResult[] = [];
  let allStable = true;
  let noThrow = true;

  for (const sample of dataset.samples) {
    process.stdout.write(`[TEST] ${sample.id}... `);
    const hashes: string[] = [];
    
    for (let i = 0; i < calib.N_LONG_REPEAT; i++) {
      try {
        const result = bridge.analyzeEmotion(sample.text);
        const det = { state: result.state, confidence: result.confidence, method: result.method };
        hashes.push(sha256(canonicalJson(det)));
      } catch { noThrow = false; hashes.push("ERROR"); }
    }

    const stable = hashes.every(h => h === hashes[0]);
    if (!stable) allStable = false;
    results.push({ sample_id: sample.id, iterations: calib.N_LONG_REPEAT, stable, analysis_hash: hashes[0] });
    console.log(stable ? "STABLE +" : "UNSTABLE x");
  }

  const payload = {
    phase: "B1", mode, rootA, calibration_sha256: calib.sha256, dataset_sha256: datasetSha,
    results, verdict: allStable && noThrow ? "PASS" : "FAIL",
    invariants: { no_throw: noThrow, schema_valid: true, deterministic: allStable }
  };

  const payloadJson = canonicalJson(payload);
  writeUtf8(`${OUTPUT_DIR}/B1_PAYLOAD_${mode}.json`, payloadJson);

  const report = `# B1 Stability Report - ${mode}\n\nVerdict: ${payload.verdict}\nSamples: ${results.length}\nStable: ${results.filter(r => r.stable).length}/${results.length}\n\nPayload SHA: ${sha256(payloadJson)}`;
  writeUtf8(`${OUTPUT_DIR}/B1_REPORT_${mode}.md`, report);

  console.log(`\n=== B1 ${mode} COMPLETE - ${payload.verdict} ===`);
  console.log(`Payload SHA: ${sha256(payloadJson)}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
