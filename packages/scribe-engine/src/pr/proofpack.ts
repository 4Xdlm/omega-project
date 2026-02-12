/**
 * OMEGA — PROOFPACK EXPORTABLE ARCHIVE
 * Phase: PR-5 | Invariant: INV-PROOFPACK-EXPORT-01
 *
 * Generates portable, deterministic proof packages for E2E runs.
 * Features:
 * - SHA256SUMS.txt manifest (GAP-5A)
 * - Toolchain version snapshot (GAP-5B)
 * - Stable ZIP ordering (GAP-5C)
 * - No absolute paths validation (GAP-5D)
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface ProofPackManifest {
  pack_id: string;
  timestamp: string;
  run_type: string; // e.g., 'e2e', 'stress100', 'concurrency10'
  files: string[];
  sha256_manifest: string; // Path to SHA256SUMS.txt
  toolchain: string; // Path to toolchain.json
  verdict: string;
}

export interface ToolchainInfo {
  node_version: string;
  npm_version: string;
  os_platform: string;
  os_arch: string;
  typescript_version: string;
  timestamp: string;
}

export interface ProofPackConfig {
  sourceDir: string;
  outputDir: string;
  runType: string;
  verdict: string;
}

// ============================================================================
// TOOLCHAIN CAPTURE (GAP-5B)
// ============================================================================

export function captureToolchainInfo(): ToolchainInfo {
  try {
    const nodeVersion = process.version;
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();

    let typescriptVersion = 'unknown';
    try {
      typescriptVersion = execSync('npx tsc --version', { encoding: 'utf8' })
        .trim()
        .replace('Version ', '');
    } catch {
      // Ignore if tsc not available
    }

    return {
      node_version: nodeVersion,
      npm_version: npmVersion,
      os_platform: process.platform,
      os_arch: process.arch,
      typescript_version: typescriptVersion,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[proofpack] Failed to capture toolchain info: ${err}`);
    return {
      node_version: process.version,
      npm_version: 'unknown',
      os_platform: process.platform,
      os_arch: process.arch,
      typescript_version: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// SHA256 HASH
// ============================================================================

function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

// ============================================================================
// ABSOLUTE PATH DETECTION (GAP-5D)
// ============================================================================

const ABSOLUTE_PATH_PATTERNS = [
  /[A-Z]:\\/i, // Windows drive letters (C:\, D:\, etc.)
  /\/(?:home|usr|var|opt|root|tmp|etc)\//i, // Unix absolute paths
  /\\Users\\/i, // Windows user paths
  /\/Users\//i, // macOS user paths
];

export function detectAbsolutePaths(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf8');
    const violations: string[] = [];

    for (const pattern of ABSOLUTE_PATH_PATTERNS) {
      if (pattern.test(content)) {
        violations.push(`Absolute path pattern ${pattern} found in ${filePath}`);
      }
    }

    return violations;
  } catch {
    // Binary file or read error → skip
    return [];
  }
}

// ============================================================================
// FILE COLLECTION (GAP-5C: stable ordering)
// ============================================================================

function collectFiles(dir: string, baseDir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relativePath = relative(baseDir, fullPath);
        files.push(relativePath);
      }
    }
  }

  walk(dir);

  // GAP-5C: Sort alphabetically for deterministic ZIP ordering
  return files.sort((a, b) => a.localeCompare(b));
}

// ============================================================================
// SHA256SUMS.txt GENERATION (GAP-5A)
// ============================================================================

export function generateSHA256Sums(files: string[], baseDir: string): string {
  const lines: string[] = [];

  for (const file of files) {
    const fullPath = join(baseDir, file);
    const hash = sha256File(fullPath);
    // Format: <hash>  <relative_path> (two spaces, standard sha256sum format)
    lines.push(`${hash}  ${file.replace(/\\/g, '/')}`);
  }

  return lines.join('\n') + '\n';
}

// ============================================================================
// PROOFPACK BUILDER
// ============================================================================

export function buildProofPack(config: ProofPackConfig): ProofPackManifest {
  const { sourceDir, outputDir, runType, verdict } = config;

  if (!existsSync(sourceDir)) {
    throw new Error(`[proofpack] Source directory not found: ${sourceDir}`);
  }

  mkdirSync(outputDir, { recursive: true });

  // Collect files with stable ordering (GAP-5C)
  const files = collectFiles(sourceDir, sourceDir);

  if (files.length === 0) {
    throw new Error(`[proofpack] No files found in ${sourceDir}`);
  }

  // GAP-5D: Check for absolute paths
  const absolutePathViolations: string[] = [];
  for (const file of files) {
    const fullPath = join(sourceDir, file);
    const violations = detectAbsolutePaths(fullPath);
    absolutePathViolations.push(...violations);
  }

  if (absolutePathViolations.length > 0) {
    throw new Error(
      `[proofpack] Absolute path violations detected:\n` +
        absolutePathViolations.join('\n')
    );
  }

  // GAP-5B: Capture toolchain info
  const toolchainInfo = captureToolchainInfo();
  const toolchainPath = join(outputDir, 'toolchain.json');
  writeFileSync(
    toolchainPath,
    JSON.stringify(toolchainInfo, null, 2),
    'utf8'
  );

  // GAP-5A: Generate SHA256SUMS.txt
  const sha256Sums = generateSHA256Sums(files, sourceDir);
  const sha256SumsPath = join(outputDir, 'SHA256SUMS.txt');
  writeFileSync(sha256SumsPath, sha256Sums, 'utf8');

  // Generate manifest
  const packId = `${runType}-${Date.now()}`;
  const manifest: ProofPackManifest = {
    pack_id: packId,
    timestamp: new Date().toISOString(),
    run_type: runType,
    files,
    sha256_manifest: 'SHA256SUMS.txt',
    toolchain: 'toolchain.json',
    verdict,
  };

  const manifestPath = join(outputDir, 'MANIFEST.json');
  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  return manifest;
}

// ============================================================================
// REPLAY SCRIPT GENERATION
// ============================================================================

export function generateReplayScript(manifest: ProofPackManifest): string {
  return `#!/usr/bin/env bash
# OMEGA Proof Pack Replay Script
# Pack ID: ${manifest.pack_id}
# Generated: ${manifest.timestamp}

set -euo pipefail

echo "=== OMEGA Proof Pack Replay ==="
echo "Pack ID: ${manifest.pack_id}"
echo "Run Type: ${manifest.run_type}"
echo "Verdict: ${manifest.verdict}"
echo ""

# Verify SHA256SUMS
if command -v sha256sum &> /dev/null; then
  echo "Verifying file integrity..."
  sha256sum -c SHA256SUMS.txt
  echo "✓ All files verified"
else
  echo "⚠ sha256sum not available, skipping verification"
fi

# Display toolchain
echo ""
echo "=== Toolchain ==="
cat toolchain.json

echo ""
echo "=== Files in Pack ==="
cat MANIFEST.json | grep -A 1000 '\\"files\\"'

echo ""
echo "Replay script completed."
`;
}

/**
 * Generate PowerShell verification script for Windows.
 */
export function generateVerifyPowershell(manifest: ProofPackManifest): string {
  return `# OMEGA Proof Pack Verification Script (PowerShell)
# Pack ID: ${manifest.pack_id}
# Generated: ${manifest.timestamp}

Write-Host "=== OMEGA Proof Pack Verification ===" -ForegroundColor Cyan
Write-Host "Pack ID: ${manifest.pack_id}"
Write-Host "Run Type: ${manifest.run_type}"
Write-Host "Verdict: ${manifest.verdict}"
Write-Host ""

# Verify SHA256SUMS
Write-Host "Verifying file integrity..." -ForegroundColor Yellow
$sums = Get-Content SHA256SUMS.txt

foreach ($line in $sums) {
  if ($line -match '^([a-f0-9]{64})  (.+)$') {
    $expectedHash = $matches[1]
    $file = $matches[2]

    if (Test-Path $file) {
      $actualHash = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()

      if ($actualHash -eq $expectedHash) {
        Write-Host "✓ $file" -ForegroundColor Green
      } else {
        Write-Host "✗ $file (hash mismatch)" -ForegroundColor Red
        exit 1
      }
    } else {
      Write-Host "✗ $file (not found)" -ForegroundColor Red
      exit 1
    }
  }
}

Write-Host ""
Write-Host "✓ All files verified successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=== Toolchain ===" -ForegroundColor Cyan
Get-Content toolchain.json | ConvertFrom-Json | Format-List

Write-Host "Verification complete." -ForegroundColor Green
`;
}
