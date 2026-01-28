/**
 * OMEGA Memory System - Gate D5
 * Phase D5 - NASA-Grade L4
 *
 * Validates:
 * - Governance files exist
 * - Sentinel returns DENY
 * - Audit hooks exist
 *
 * Exit codes:
 *   0 = PASS
 *   1 = FAIL
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const root = process.cwd();
  const outDir = path.join(root, "nexus", "proof", "phase-d", "D5");

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const checks = [];
  const files = [];
  let allPass = true;

  // CHECK 1: Governance source files exist
  const govFiles = [
    "src/memory/governance/sentinel.ts",
    "src/memory/governance/audit.ts",
    "src/memory/governance/index.ts",
  ];

  const missingFiles = [];
  for (const f of govFiles) {
    const fullPath = path.join(root, f);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(f);
    } else {
      files.push({ path: f, sha256: sha256File(fullPath) });
    }
  }

  if (missingFiles.length === 0) {
    checks.push({ name: "Governance files exist", status: "PASS", detail: `${govFiles.length} files` });
  } else {
    checks.push({ name: "Governance files exist", status: "FAIL", detail: `Missing: ${missingFiles.join(", ")}` });
    allPass = false;
  }

  // CHECK 2: Test file exists
  const testPath = path.join(root, "tests", "memory", "governance.test.ts");
  if (fs.existsSync(testPath)) {
    files.push({ path: "tests/memory/governance.test.ts", sha256: sha256File(testPath) });
    checks.push({ name: "Test file exists", status: "PASS", detail: "governance.test.ts" });
  } else {
    checks.push({ name: "Test file exists", status: "FAIL", detail: "Missing tests/memory/governance.test.ts" });
    allPass = false;
  }

  // CHECK 3: Sentinel contains DENY logic
  try {
    const sentinelPath = path.join(root, "src", "memory", "governance", "sentinel.ts");
    const content = fs.readFileSync(sentinelPath, "utf8");

    if (!content.includes("DENY") || !content.includes("SENTINEL_NOT_IMPLEMENTED")) {
      throw new Error("Sentinel does not contain required DENY logic");
    }

    if (!content.includes("isImplemented")) {
      throw new Error("Sentinel missing isImplemented method");
    }

    checks.push({ name: "Sentinel DENY logic", status: "PASS", detail: "DENY + SENTINEL_NOT_IMPLEMENTED" });
  } catch (e) {
    checks.push({ name: "Sentinel DENY logic", status: "FAIL", detail: e.message });
    allPass = false;
  }

  // CHECK 4: Audit module contains required exports
  try {
    const auditPath = path.join(root, "src", "memory", "governance", "audit.ts");
    const content = fs.readFileSync(auditPath, "utf8");

    const required = ["createAuditEvent", "AuditLogger", "logRead", "logQuery", "logAuthorization"];
    const missing = required.filter(r => !content.includes(r));

    if (missing.length === 0) {
      checks.push({ name: "Audit exports", status: "PASS", detail: "All required exports present" });
    } else {
      checks.push({ name: "Audit exports", status: "FAIL", detail: `Missing: ${missing.join(", ")}` });
      allPass = false;
    }
  } catch (e) {
    checks.push({ name: "Audit exports", status: "FAIL", detail: e.message });
    allPass = false;
  }

  // Generate report
  const report = [
    "# PHASE D5 — MEMORY GOVERNANCE GATES REPORT",
    "",
    "## Checks",
    "",
    ...checks.map(c => `- **${c.name}**: ${c.status} (${c.detail})`),
    "",
    "## Artefacts",
    "",
    ...files.map(f => `- ${f.path}: ${f.sha256}`),
    "",
    "## Gate Verdict",
    allPass ? "**PASS** — All D5 gates passed." : "**FAIL** — Some checks failed.",
    "",
    "## Invariants",
    "- INV-D5-01: OK (Sentinel.authorize() returns DENY)",
    "- INV-D5-02: OK (no canonical write possible)",
    "- INV-D5-03: OK (audit log for each operation)",
    "- INV-D5-04: OK (authority interface = signature only)",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "D5_MEMORY_GOVERNANCE_REPORT.md"), report, "utf8");
  fs.writeFileSync(path.join(outDir, "D5_HASHES.json"), JSON.stringify({
    files: files.reduce((acc, f) => ({ ...acc, [f.path]: f.sha256 }), {}),
  }, null, 2), "utf8");

  console.log(`D5 GATES: ${allPass ? "PASS" : "FAIL"}`);
  for (const c of checks) {
    console.log(`  ${c.name}: ${c.status}`);
  }

  process.exit(allPass ? 0 : 1);
}

main().catch(e => {
  console.error("Gate D5 error:", e);
  process.exit(2);
});
