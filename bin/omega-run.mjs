#!/usr/bin/env node
/**
 * OMEGA CLI Runner Entry Point
 * Phase J: Runs from compiled dist/
 * Phase M: Added verify-capsule command
 *
 * INVARIANTS:
 * - J-INV-01: CLI loads from dist (no src imports at runtime)
 * - J-INV-02: Clear error if dist missing
 * - M-INV-01: verify-capsule uses auditpack module
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const distEntry = join(projectRoot, "dist", "runner", "main.js");

// Check if dist exists
if (!existsSync(distEntry)) {
  console.error("ERROR: dist/runner/main.js not found.");
  console.error("Run 'npm run build' first to compile the CLI.");
  process.exit(1);
}

// Check for verify-capsule command (handled by auditpack module)
const args = process.argv.slice(2);
if (args[0] === 'verify-capsule') {
  const auditpackEntry = join(projectRoot, "dist", "auditpack", "index.js");

  if (!existsSync(auditpackEntry)) {
    console.error("ERROR: dist/auditpack/index.js not found.");
    console.error("Run 'npm run build' first to compile the CLI.");
    process.exit(1);
  }

  const auditpackUrl = pathToFileURL(auditpackEntry).href;
  const { verifyCapsule, generateCapsuleReport, CapsuleExitCode } = await import(auditpackUrl);

  const capsulePath = args[1];
  if (!capsulePath) {
    console.error("Usage: omega verify-capsule <capsule.zip>");
    process.exit(1);
  }

  const result = await verifyCapsule(capsulePath);
  console.log(generateCapsuleReport(result));

  if (result.verdict === 'PASS') {
    process.exit(0);
  } else if (result.verdict === 'ERROR') {
    process.exit(CapsuleExitCode.EXTRACT_FAIL);
  } else {
    process.exit(CapsuleExitCode.VERIFY_FAIL);
  }
}

// Default: run main CLI
const distEntryUrl = pathToFileURL(distEntry).href;
await import(distEntryUrl);
