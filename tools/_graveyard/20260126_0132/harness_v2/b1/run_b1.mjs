import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

function sha256s(s){ return createHash("sha256").update(s,"utf8").digest("hex"); }
function stableJson(obj){
  const keys = Object.keys(obj).sort();
  const o = {};
  for(const k of keys) o[k]=obj[k];
  return JSON.stringify(o, null, 2);
}

const mode = process.argv[2];
if(mode !== "RUN1" && mode !== "RUN2"){
  console.error("USAGE: node run_b1.mjs RUN1|RUN2");
  process.exit(2);
}

const ROOT = resolve(process.cwd());
const rootAPath = resolve(ROOT, "docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256");
const calPath   = resolve(ROOT, "tools/calibration/B123_calibration.json");
const outDir    = resolve(ROOT, "nexus/proof/phase_b/b1");

mkdirSync(outDir, { recursive: true });

const rootA = readFileSync(rootAPath, "utf8").trim();
const calRaw = readFileSync(calPath, "utf8");

if(calRaw.includes('"REQUIRED"')){
  throw new Error("CALIBRATION_GATE_FAIL: literal REQUIRED found");
}

const payload = {
  phase: "B1",
  mode,
  rootA,
  calibration_sha256: sha256s(calRaw),
  determinism_note: "Stable payload (no timestamps)."
};

const payloadJson = stableJson(payload);
const runHash = sha256s(payloadJson);

writeFileSync(resolve(outDir, `B1_PAYLOAD_${mode}.json`), payloadJson, "utf8");
writeFileSync(resolve(outDir, `B1_REPORT_${mode}.md`),
`# B1 REPORT (${mode})
ROOT_A: ${rootA}
CAL_SHA256: ${payload.calibration_sha256}
RUN_HASH: ${runHash}
`, "utf8");

console.log(`B1_OK ${mode} RUN_HASH=${runHash}`);
