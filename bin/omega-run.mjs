#!/usr/bin/env node
/**
 * OMEGA CLI Runner Entry Point
 * Executes TypeScript directly via tsx
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const entry = path.join(projectRoot, "src", "runner", "main.ts");

// Resolve npx path for Windows
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

// Build full command for shell execution on Windows (avoids arg escaping issues)
if (process.platform === "win32") {
  const args = process.argv.slice(2).map(arg => {
    // Escape args that contain spaces
    return arg.includes(" ") ? `"${arg}"` : arg;
  }).join(" ");
  
  const fullCommand = `npx tsx "${entry}" ${args}`;
  
  const child = spawn(fullCommand, [], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });

  child.on("close", (code) => {
    process.exit(code ?? 1);
  });

  child.on("error", (err) => {
    console.error("Failed to start CLI:", err.message);
    process.exit(1);
  });
} else {
  // Unix: use spawn without shell
  const child = spawn(npxCmd, ["tsx", entry, ...process.argv.slice(2)], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  child.on("close", (code) => {
    process.exit(code ?? 1);
  });

  child.on("error", (err) => {
    console.error("Failed to start CLI:", err.message);
    process.exit(1);
  });
}
