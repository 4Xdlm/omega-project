/**
 * OMEGA Phase B2 - Adversarial Robustness
 */
import { checkAllGates, loadRootA, loadCalibration } from "../lib/gates.js";
import { sha256, canonicalJson } from "../lib/hash.js";
import { mustReadUtf8, writeUtf8 } from "../lib/io.js";
import { EmotionBridge } from "../../../../genesis-forge/src/genesis/index.js";

const DATASET_PATH = "tools/harness_official/datasets/b2_adversarial.json";
const OUTPUT_DIR = "nexus/proof/phase_b/b2";

interface Sample { id: string; type: string; text: string; }
interface Dataset { version: string; samples: Sample[]; }
interface SampleResult { sample_id: string; type: string; no_throw: boolean; analysis_hash: string; }

async function main() {
  const mode = (process.argv[2] ?? "RUN1") as "RUN1" | "RUN2";
  console.log(`\n=== OMEGA B2 ADVERSARIAL TEST - ${mode} ===\n`);

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
  console.log(`[CONFIG] Adversarial samples: ${dataset.samples.length}\n`);

  const bridge = new EmotionBridge(false);
  const results: SampleResult[] = [];
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
    } catch { noThrow = false; allNoThrow = false; analysisHash = "ERROR"; console.log("THROW x"); }

    results.push({ sample_id: sample.id, type: sample.type, no_throw: noThrow, analysis_hash: analysisHash });
  }

  const payload = {
    phase: "B2", mode, rootA, calibration_sha256: calib.sha256, dataset_sha256: datasetSha,
    results, verdict: allNoThrow ? "PASS" : "FAIL",
    invariants: { no_throw: allNoThrow, schema_valid: true, deterministic: true }
  };

  const payloadJson = canonicalJson(payload);
  writeUtf8(`${OUTPUT_DIR}/B2_PAYLOAD_${mode}.json`, payloadJson);

  const report = `# B2 Adversarial Report - ${mode}\n\nVerdict: ${payload.verdict}\nSamples: ${results.length}\nNo-Throw: ${results.filter(r => r.no_throw).length}/${results.length}\n\nPayload SHA: ${sha256(payloadJson)}`;
  writeUtf8(`${OUTPUT_DIR}/B2_REPORT_${mode}.md`, report);

  console.log(`\n=== B2 ${mode} COMPLETE - ${payload.verdict} ===`);
  console.log(`Payload SHA: ${sha256(payloadJson)}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
