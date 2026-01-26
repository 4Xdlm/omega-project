import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

function sha256s(s){ return createHash("sha256").update(s,"utf8").digest("hex"); }
function stableJson(obj){
  const keys = Object.keys(obj).sort();
  const o = {};
  for(const k of keys) o[k]=obj[k];
  return JSON.stringify(o, null, 2);
}

const ROOT = resolve(process.cwd());
const outDir = resolve(ROOT, "nexus/proof/phase_b/b3");
mkdirSync(outDir, { recursive: true });

function must(path){
  if(!existsSync(path)) throw new Error("MISSING_INPUT: " + path);
  return readFileSync(path, "utf8");
}

const b1r1 = must(resolve(ROOT,"nexus/proof/phase_b/b1/B1_PAYLOAD_RUN1.json"));
const b1r2 = must(resolve(ROOT,"nexus/proof/phase_b/b1/B1_PAYLOAD_RUN2.json"));
const b2r1 = must(resolve(ROOT,"nexus/proof/phase_b/b2/B2_PAYLOAD_RUN1.json"));
const b2r2 = must(resolve(ROOT,"nexus/proof/phase_b/b2/B2_PAYLOAD_RUN2.json"));

const h_b1r1 = sha256s(b1r1), h_b1r2 = sha256s(b1r2);
const h_b2r1 = sha256s(b2r1), h_b2r2 = sha256s(b2r2);

const report = {
  phase: "B3",
  inputs: {
    B1_RUN1_sha256: h_b1r1,
    B1_RUN2_sha256: h_b1r2,
    B2_RUN1_sha256: h_b2r1,
    B2_RUN2_sha256: h_b2r2
  },
  determinism: {
    B1_match: h_b1r1 === h_b1r2,
    B2_match: h_b2r1 === h_b2r2
  }
};

const reportJson = stableJson(report);
writeFileSync(resolve(outDir,"B3_CROSSRUN_REPORT.json"), reportJson, "utf8");

const signatureBase = stableJson({
  B1: [h_b1r1, h_b1r2],
  B2: [h_b2r1, h_b2r2],
  verdict: (report.determinism.B1_match && report.determinism.B2_match) ? "PASS" : "FAIL"
});
const sig = sha256s(signatureBase);

writeFileSync(resolve(outDir,"B3_SIGNATURE_DIGEST.txt"),
`B3_SIGNATURE_SHA256 ${sig}
`, "utf8");

writeFileSync(resolve(outDir,"B3_CROSSRUN_REPORT.md"),
`# B3 CROSSRUN REPORT
B1_RUN1_SHA256: ${h_b1r1}
B1_RUN2_SHA256: ${h_b1r2}
B2_RUN1_SHA256: ${h_b2r1}
B2_RUN2_SHA256: ${h_b2r2}

B1_DETERMINISM: ${report.determinism.B1_match ? "PASS" : "FAIL"}
B2_DETERMINISM: ${report.determinism.B2_match ? "PASS" : "FAIL"}

B3_SIGNATURE_SHA256: ${sig}
`, "utf8");

console.log(`B3_OK SIGNATURE=${sig}`);
