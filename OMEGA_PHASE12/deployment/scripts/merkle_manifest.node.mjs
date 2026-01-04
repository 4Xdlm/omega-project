// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — MERKLE MANIFEST GENERATOR
// Phase 12 — Industrial Deployment
// Standard: NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS COVERED:
// - INV-DEP-02: Merkle root stable (POSIX paths, UTF-8, deterministic)
// - INV-DEP-03: Evidence pack includes manifest files
//
// MERKLE RULES (deterministic):
// - leaf = SHA256("FILE\0" + path_posix + "\0" + file_sha256_hex)
// - node = SHA256("NODE\0" + left_hex + "\0" + right_hex)
// - odd nodes: duplicate last
// - paths: POSIX style (forward slashes), sorted lexicographically
// - encoding: UTF-8 strict
//
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const OUT_DIR = "evidence/PHASE_12_EVIDENCE";

// Directories to include in Merkle manifest
// These are the Phase 12 deliverables (not touching Phase 11 core)
const TARGET_DIRS = [
  "OMEGA_PHASE12/config",
  "OMEGA_PHASE12/docs",
];

// Also include specific files at root if they exist
const TARGET_FILES = [
  "OMEGA_PHASE12/package.json",
  "OMEGA_PHASE12/tsconfig.json",
  "OMEGA_PHASE12/vitest.config.ts",
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert path to POSIX style (forward slashes)
 * Critical for cross-platform Merkle stability (INV-DEP-02)
 */
function toPosix(p) {
  return p.split(sep).join("/");
}

/**
 * List all files in directory recursively
 */
async function listFiles(root) {
  const out = [];
  
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // Directory doesn't exist or not accessible
    }
    
    for (const e of entries) {
      // Skip node_modules and hidden files
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else {
        out.push(p);
      }
    }
  }
  
  await walk(root);
  return out;
}

/**
 * Compute SHA256 of a buffer
 */
function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

/**
 * Compute SHA256 of a file
 */
function sha256File(path) {
  return new Promise((resolve, reject) => {
    const h = createHash("sha256");
    const s = createReadStream(path);
    s.on("data", (d) => h.update(d));
    s.on("error", reject);
    s.on("end", () => resolve(h.digest("hex").toUpperCase()));
  });
}

/**
 * Compute leaf hash according to Merkle rules
 * leaf = SHA256("FILE\0" + path_posix + "\0" + file_sha256_hex)
 */
function computeLeafHash(pathPosix, fileSha256) {
  const payload = Buffer.from(`FILE\0${pathPosix}\0${fileSha256}`, "utf8");
  return sha256Hex(payload);
}

/**
 * Compute node hash according to Merkle rules
 * node = SHA256("NODE\0" + left_hex + "\0" + right_hex)
 */
function computeNodeHash(left, right) {
  const payload = Buffer.from(`NODE\0${left}\0${right}`, "utf8");
  return sha256Hex(payload);
}

/**
 * Build Merkle tree from leaves
 * Returns { root, levels }
 */
function buildMerkleTree(leaves) {
  if (leaves.length === 0) {
    return { root: null, levels: [] };
  }
  
  // Start with leaf hashes
  let level = leaves.map((leaf) => leaf.leafHash);
  const levels = [level.slice()];
  
  // Build tree bottom-up
  while (level.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      // If odd, duplicate last node
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      nextLevel.push(computeNodeHash(left, right));
    }
    
    level = nextLevel;
    levels.push(level.slice());
  }
  
  return {
    root: level[0],
    levels,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("OMEGA MERKLE MANIFEST GENERATOR");
  console.log("================================");
  console.log("");
  
  // Create output directory
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
  
  // Collect all files
  const allFiles = [];
  
  // Add files from target directories
  for (const dir of TARGET_DIRS) {
    if (existsSync(dir)) {
      const files = await listFiles(dir);
      allFiles.push(...files);
    } else {
      console.log(`WARN: Directory not found: ${dir}`);
    }
  }
  
  // Add specific target files
  for (const file of TARGET_FILES) {
    if (existsSync(file)) {
      allFiles.push(file);
    }
  }
  
  if (allFiles.length === 0) {
    console.error("ERROR: No files found to hash");
    process.exit(1);
  }
  
  // Convert to POSIX and sort (deterministic ordering)
  const posixPaths = allFiles.map(toPosix).sort();
  
  console.log(`Files to hash: ${posixPaths.length}`);
  
  // Compute hashes for each file
  const entries = [];
  
  for (const pathPosix of posixPaths) {
    // Convert back to native path for file reading
    const nativePath = pathPosix.split("/").join(sep);
    
    try {
      const fileHash = await sha256File(nativePath);
      const leafHash = computeLeafHash(pathPosix, fileHash);
      
      entries.push({
        path: pathPosix,
        fileHash,
        leafHash,
      });
    } catch (err) {
      console.error(`ERROR hashing ${pathPosix}: ${err.message}`);
      process.exit(1);
    }
  }
  
  // Build Merkle tree
  const { root, levels } = buildMerkleTree(entries);
  
  if (!root) {
    console.error("ERROR: Failed to compute Merkle root");
    process.exit(1);
  }
  
  console.log(`Merkle root: ${root}`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Output: manifest.files.sha256
  // ─────────────────────────────────────────────────────────────────────────
  const filesContent = [
    "# OMEGA PHASE 12 — FILE HASH MANIFEST",
    `# Generated: ${new Date().toISOString()}`,
    "# Format: <SHA256>  <path>",
    "#",
    ...entries.map((e) => `${e.fileHash}  ${e.path}`),
    "",
  ].join("\n");
  
  await writeFile(join(OUT_DIR, "manifest.files.sha256"), filesContent, "utf8");
  console.log(`OK: ${OUT_DIR}/manifest.files.sha256`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Output: manifest.merkle.json
  // ─────────────────────────────────────────────────────────────────────────
  const merkleDoc = {
    schema: "OMEGA_MERKLE_MANIFEST_V1",
    generated_utc: new Date().toISOString(),
    target_dirs: TARGET_DIRS,
    target_files: TARGET_FILES,
    rules: {
      leaf: 'SHA256("FILE\\0" + path_posix + "\\0" + file_sha256_hex)',
      node: 'SHA256("NODE\\0" + left_hex + "\\0" + right_hex)',
      odd_handling: "duplicate_last",
      path_style: "POSIX (forward slashes)",
      sort: "lexicographic",
      encoding: "UTF-8",
    },
    file_count: entries.length,
    root_sha256: root,
    tree_depth: levels.length,
    leaves: entries.map((e) => ({
      path: e.path,
      file_sha256: e.fileHash,
      leaf_sha256: e.leafHash,
    })),
  };
  
  await writeFile(
    join(OUT_DIR, "manifest.merkle.json"),
    JSON.stringify(merkleDoc, null, 2),
    "utf8"
  );
  console.log(`OK: ${OUT_DIR}/manifest.merkle.json`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Output: manifest.root.sha256
  // ─────────────────────────────────────────────────────────────────────────
  await writeFile(join(OUT_DIR, "manifest.root.sha256"), root + "\n", "utf8");
  console.log(`OK: ${OUT_DIR}/manifest.root.sha256`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log("");
  console.log("================================");
  console.log(`MERKLE ROOT: ${root}`);
  console.log(`FILES: ${entries.length}`);
  console.log(`TREE DEPTH: ${levels.length}`);
  console.log("================================");
}

main().catch((err) => {
  console.error("MERKLE_MANIFEST_FAIL");
  console.error(err.stack || String(err));
  process.exit(1);
});
