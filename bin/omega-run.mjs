#!/usr/bin/env node
/**
 * OMEGA CLI Runner Entry Point
 * Phase J: Runs from compiled dist/
 *
 * INVARIANTS:
 * - J-INV-01: CLI loads from dist (no src imports at runtime)
 * - J-INV-02: Clear error if dist missing
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Check if dist exists
const distEntry = join(projectRoot, "dist", "runner", "main.js");

if (!existsSync(distEntry)) {
  console.error("ERROR: dist/runner/main.js not found.");
  console.error("Run 'npm run build' first to compile the CLI.");
  process.exit(1);
}

// Convert path to file URL for Windows compatibility
const distEntryUrl = pathToFileURL(distEntry).href;

// Import will execute the CLI (main.ts calls main() at bottom)
await import(distEntryUrl);
