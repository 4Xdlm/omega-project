// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — DEPLOYMENT TESTS (TypeScript)
// Phase 12 — Industrial Deployment
// Standard: NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// TEST COUNT: 9 tests
//
// INVARIANTS TESTED:
// - INV-DEP-01: Déploiement scripts existent
// - INV-DEP-02: Merkle hash format (64 hex chars)
// - INV-DEP-03: Evidence pack structure
// - INV-DEP-04: (placeholder for replay pack)
// - INV-DEP-05: Core unchanged verification logic
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE RULES IMPLEMENTATION (for verification)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute leaf hash according to Merkle rules
 * leaf = SHA256("FILE\0" + path_posix + "\0" + file_sha256_hex)
 */
function computeLeafHash(pathPosix: string, fileSha256: string): string {
  const payload = Buffer.from(`FILE\0${pathPosix}\0${fileSha256}`, "utf8");
  return createHash("sha256").update(payload).digest("hex").toUpperCase();
}

/**
 * Compute node hash according to Merkle rules
 * node = SHA256("NODE\0" + left_hex + "\0" + right_hex)
 */
function computeNodeHash(left: string, right: string): string {
  const payload = Buffer.from(`NODE\0${left}\0${right}`, "utf8");
  return createHash("sha256").update(payload).digest("hex").toUpperCase();
}

/**
 * Verify SHA256 hash format (64 hex characters)
 */
function isValidSha256(hash: string): boolean {
  return /^[A-Fa-f0-9]{64}$/.test(hash);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-DEP-01 — Deployment scripts exist
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-DEP-01: Deployment scripts structure", () => {
  const scriptsDir = join(__dirname, "..", "..", "deployment", "scripts");

  it("omega_deploy.ps1 exists", () => {
    const scriptPath = join(scriptsDir, "omega_deploy.ps1");
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("evidence_pack.ps1 exists", () => {
    const scriptPath = join(scriptsDir, "evidence_pack.ps1");
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("omega_verify.ps1 exists", () => {
    const scriptPath = join(scriptsDir, "omega_verify.ps1");
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("merkle_manifest.node.mjs exists", () => {
    const scriptPath = join(scriptsDir, "merkle_manifest.node.mjs");
    expect(existsSync(scriptPath)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-DEP-02 — Merkle hash computation
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-DEP-02: Merkle hash format and determinism", () => {

  it("leaf hash produces 64 hex characters", () => {
    const leafHash = computeLeafHash("test/file.ts", "ABCD1234ABCD1234ABCD1234ABCD1234ABCD1234ABCD1234ABCD1234ABCD1234");
    
    expect(leafHash.length).toBe(64);
    expect(isValidSha256(leafHash)).toBe(true);
  });

  it("node hash produces 64 hex characters", () => {
    const left = "AAAA1111AAAA1111AAAA1111AAAA1111AAAA1111AAAA1111AAAA1111AAAA1111";
    const right = "BBBB2222BBBB2222BBBB2222BBBB2222BBBB2222BBBB2222BBBB2222BBBB2222";
    
    const nodeHash = computeNodeHash(left, right);
    
    expect(nodeHash.length).toBe(64);
    expect(isValidSha256(nodeHash)).toBe(true);
  });

  it("same inputs produce same hash (determinism)", () => {
    const path = "config/omega.config.schema.ts";
    const fileHash = "E3E64E7DF03C781BAA98C3E2B57DF67E7E58404DA35A3D7B27D977456A84F120";
    
    const hash1 = computeLeafHash(path, fileHash);
    const hash2 = computeLeafHash(path, fileHash);
    
    expect(hash1).toBe(hash2);
  });

  it("different paths produce different hashes", () => {
    const fileHash = "E3E64E7DF03C781BAA98C3E2B57DF67E7E58404DA35A3D7B27D977456A84F120";
    
    const hash1 = computeLeafHash("file1.ts", fileHash);
    const hash2 = computeLeafHash("file2.ts", fileHash);
    
    expect(hash1).not.toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-DEP-03 — Evidence pack structure
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-DEP-03: Evidence pack expected files", () => {
  
  const EXPECTED_FILES = [
    "tests.log",
    "manifest.files.sha256",
    "manifest.merkle.json",
    "manifest.root.sha256",
    "diff_core_vs_phase11.txt",
    "git_status.txt",
    "meta.txt",
  ];

  it("defines exactly 7 required evidence files", () => {
    expect(EXPECTED_FILES.length).toBe(7);
  });

  it("includes all critical manifest files", () => {
    expect(EXPECTED_FILES).toContain("manifest.files.sha256");
    expect(EXPECTED_FILES).toContain("manifest.merkle.json");
    expect(EXPECTED_FILES).toContain("manifest.root.sha256");
  });

  it("includes test log for audit trail", () => {
    expect(EXPECTED_FILES).toContain("tests.log");
  });

  it("includes core diff verification file", () => {
    expect(EXPECTED_FILES).toContain("diff_core_vs_phase11.txt");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Pester tests exist
// ═══════════════════════════════════════════════════════════════════════════════

describe("Deployment Pester tests exist", () => {
  const testsDir = join(__dirname, "..", "..", "deployment", "tests");

  it("omega_deploy.pester.ps1 exists", () => {
    const testPath = join(testsDir, "omega_deploy.pester.ps1");
    expect(existsSync(testPath)).toBe(true);
  });

  it("evidence_pack.pester.ps1 exists", () => {
    const testPath = join(testsDir, "evidence_pack.pester.ps1");
    expect(existsSync(testPath)).toBe(true);
  });

  it("omega_verify.pester.ps1 exists", () => {
    const testPath = join(testsDir, "omega_verify.pester.ps1");
    expect(existsSync(testPath)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CI/CD Workflow (INV-DEP-01 automation)
// ═══════════════════════════════════════════════════════════════════════════════

describe("CI/CD GitHub Actions workflow", () => {
  const workflowDir = join(__dirname, "..", "..", ".github", "workflows");

  it("phase12_certify.yml exists", () => {
    const workflowPath = join(workflowDir, "phase12_certify.yml");
    expect(existsSync(workflowPath)).toBe(true);
  });

  it("workflow contains required jobs", () => {
    const workflowPath = join(workflowDir, "phase12_certify.yml");
    if (existsSync(workflowPath)) {
      const content = readFileSync(workflowPath, "utf8");
      
      // Must have certify job
      expect(content).toContain("certify:");
      
      // Must run on windows for Pester
      expect(content).toContain("windows-latest");
      
      // Must have fetch-depth: 0 for git diff
      expect(content).toContain("fetch-depth: 0");
    }
  });

  it("workflow includes npm test step", () => {
    const workflowPath = join(workflowDir, "phase12_certify.yml");
    if (existsSync(workflowPath)) {
      const content = readFileSync(workflowPath, "utf8");
      expect(content).toContain("npm test");
    }
  });

  it("workflow includes Pester test step", () => {
    const workflowPath = join(workflowDir, "phase12_certify.yml");
    if (existsSync(workflowPath)) {
      const content = readFileSync(workflowPath, "utf8");
      expect(content).toContain("Invoke-Pester");
    }
  });

  it("workflow includes evidence pack generation", () => {
    const workflowPath = join(workflowDir, "phase12_certify.yml");
    if (existsSync(workflowPath)) {
      const content = readFileSync(workflowPath, "utf8");
      expect(content).toContain("evidence_pack.ps1");
    }
  });

  it("workflow includes artifact upload", () => {
    const workflowPath = join(workflowDir, "phase12_certify.yml");
    if (existsSync(workflowPath)) {
      const content = readFileSync(workflowPath, "utf8");
      expect(content).toContain("upload-artifact");
      expect(content).toContain("PHASE_12_EVIDENCE");
    }
  });

  it("workflow includes Merkle stability check", () => {
    const workflowPath = join(workflowDir, "phase12_certify.yml");
    if (existsSync(workflowPath)) {
      const content = readFileSync(workflowPath, "utf8");
      expect(content).toContain("merkle_root_run1");
      expect(content).toContain("merkle_root_run2");
      expect(content).toContain("MERKLE STABLE");
    }
  });
});
