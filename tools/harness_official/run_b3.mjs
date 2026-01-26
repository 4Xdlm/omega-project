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
