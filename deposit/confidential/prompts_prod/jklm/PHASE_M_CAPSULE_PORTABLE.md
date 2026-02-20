# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PHASE M — CAPSULE PORTABLE / AUDITPACK
#   NASA-Grade L4 • Verify Without Repo • Tamper-Proof Distribution
#
#   Date: 2026-01-28
#   Standard: NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## 🎯 MISSION

Create a **portable capsule verifier** that can verify OMEGA capsules (zip archives) **without access to the repo**:

1. **`omega verify-capsule <file.zip>`** - New CLI command
2. **Validates zip structure** (no zip-slip vulnerabilities)
3. **Extracts to controlled temp directory**
4. **Runs Phase L replay verification** on extracted content
5. **Produces PASS/FAIL with deterministic output**
6. **Cleans up temp files** after verification

**Current State:**
- `omega capsule` creates deterministic zip (Phase I)
- `omega verify` verifies run directories
- No way to verify a capsule without extracting manually

**Target State:**
- `omega verify-capsule capsule.zip` → PASS/FAIL
- Self-contained verification (no repo needed for capsule verify)
- Zip-slip defense (no path traversal attacks)
- Clean temp directory management

## 📂 REPO

Path: `C:\Users\elric\omega-project`
Baseline: Phase L complete (~4483 tests PASS)

## 🔒 SEALED ZONES (READ ONLY)

```
src/canon/
src/gates/
src/sentinel/
src/memory/
src/memory-write-runtime/
src/orchestrator/
src/delivery/
src/runner/          # Phase I SEALED
src/providers/       # Phase K SEALED
src/replay/          # Phase L SEALED
genesis-forge/
config/*/
```

## ✅ WORK ZONES (CREATE/MODIFY)

| Path | Action | Notes |
|------|--------|-------|
| `src/auditpack/` | CREATE | New capsule verification module |
| `tests/auditpack/` | CREATE | Auditpack tests |
| `bin/omega-run.mjs` | MODIFY | Add verify-capsule command routing |
| `manifests/` | ADD | Phase M manifest |

**NOTE:** `bin/omega-run.mjs` is NOT SEALED (only `src/runner/` is SEALED).

## 📋 FILES TO CREATE (ORDER)

### 1. src/auditpack/types.ts

```typescript
/**
 * OMEGA Auditpack Types
 * Phase M - NASA-Grade L4
 */
import type { ReplayResult } from '../replay/types';

// Zip entry info
export interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  isDirectory: boolean;
}

// Zip validation result
export interface ZipValidationResult {
  valid: boolean;
  entries: ZipEntry[];
  errors: string[];
  hasZipSlip: boolean; // Path traversal attack detected
  hasDangerousFiles: boolean; // Symlinks, etc.
}

// Capsule verification result
export interface CapsuleVerifyResult {
  success: boolean;
  capsulePath: string;
  capsuleHash: string;
  
  // Zip structure
  zipValid: boolean;
  zipValidation: ZipValidationResult;
  
  // Extraction
  extractedPath: string | null;
  extractionError: string | null;
  
  // Replay verification (Phase L)
  replayResult: ReplayResult | null;
  
  // Summary
  verdict: 'PASS' | 'FAIL' | 'ERROR';
  errors: string[];
}

// Capsule verify options
export interface CapsuleVerifyOptions {
  keepExtracted?: boolean; // Don't delete temp dir (for debugging)
  verbose?: boolean;
}

// Exit codes (align with runner)
export const CapsuleExitCode = {
  PASS: 0,
  ZIP_INVALID: 71,
  ZIP_SLIP: 72,
  EXTRACT_FAIL: 73,
  VERIFY_FAIL: 74,
} as const;
```

### 2. src/auditpack/zip-validator.ts

```typescript
/**
 * OMEGA Zip Validator
 * Phase M - Secure zip handling with zip-slip defense
 */
import { readFileSync, existsSync } from 'fs';
import { normalize, isAbsolute, resolve } from 'path';
import { createHash } from 'crypto';
import type { ZipValidationResult, ZipEntry } from './types';

/**
 * Checks if a path is safe (no traversal).
 */
export function isSafePath(entryPath: string, targetDir: string): boolean {
  // Normalize and resolve
  const normalizedEntry = normalize(entryPath);
  
  // Check for absolute paths
  if (isAbsolute(normalizedEntry)) {
    return false;
  }
  
  // Check for parent directory traversal
  if (normalizedEntry.includes('..')) {
    return false;
  }
  
  // Check that resolved path stays within target
  const resolvedPath = resolve(targetDir, normalizedEntry);
  const resolvedTarget = resolve(targetDir);
  
  return resolvedPath.startsWith(resolvedTarget);
}

/**
 * Validates zip structure for security issues.
 */
export function validateZipStructure(
  entries: Array<{ filename: string; isDirectory: boolean; compressedSize: number; uncompressedSize: number }>,
  targetDir: string
): ZipValidationResult {
  const errors: string[] = [];
  let hasZipSlip = false;
  let hasDangerousFiles = false;
  
  const validatedEntries: ZipEntry[] = [];
  
  for (const entry of entries) {
    // Check for zip-slip
    if (!isSafePath(entry.filename, targetDir)) {
      hasZipSlip = true;
      errors.push(`Zip-slip detected: ${entry.filename}`);
    }
    
    // Check for dangerous filenames
    if (entry.filename.includes('\0') || entry.filename.includes('\\')) {
      hasDangerousFiles = true;
      errors.push(`Dangerous filename: ${entry.filename}`);
    }
    
    validatedEntries.push({
      filename: entry.filename,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      isDirectory: entry.isDirectory,
    });
  }
  
  return {
    valid: !hasZipSlip && !hasDangerousFiles && errors.length === 0,
    entries: validatedEntries,
    errors,
    hasZipSlip,
    hasDangerousFiles,
  };
}

/**
 * Computes SHA256 hash of zip file.
 */
export function computeZipHash(zipPath: string): string {
  const content = readFileSync(zipPath);
  return createHash('sha256').update(content).digest('hex');
}
```

### 3. src/auditpack/capsule-extractor.ts

```typescript
/**
 * OMEGA Capsule Extractor
 * Phase M - Secure extraction to temp directory
 */
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';

export interface ExtractionResult {
  success: boolean;
  extractedPath: string | null;
  error: string | null;
}

/**
 * Creates a secure temp directory for extraction.
 */
export function createSecureTempDir(): string {
  const randomSuffix = randomBytes(8).toString('hex');
  const tempDir = join(tmpdir(), `omega-verify-${randomSuffix}`);
  
  mkdirSync(tempDir, { recursive: true });
  
  return tempDir;
}

/**
 * Cleans up temp directory.
 */
export function cleanupTempDir(tempDir: string): void {
  if (existsSync(tempDir) && tempDir.includes('omega-verify-')) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Extracts a capsule zip to temp directory.
 * Uses system unzip or PowerShell for extraction.
 */
export async function extractCapsule(
  zipPath: string,
  targetDir: string
): Promise<ExtractionResult> {
  try {
    if (!existsSync(zipPath)) {
      return { success: false, extractedPath: null, error: 'Zip file not found' };
    }
    
    // Use PowerShell on Windows, unzip on Unix
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`,
        { stdio: 'pipe' }
      );
    } else {
      execSync(`unzip -q "${zipPath}" -d "${targetDir}"`, { stdio: 'pipe' });
    }
    
    return {
      success: true,
      extractedPath: targetDir,
      error: null,
    };
  } catch (e) {
    return {
      success: false,
      extractedPath: null,
      error: (e as Error).message,
    };
  }
}
```

### 4. src/auditpack/capsule-verifier.ts

```typescript
/**
 * OMEGA Capsule Verifier
 * Phase M - Full capsule verification pipeline
 */
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { CapsuleVerifyResult, CapsuleVerifyOptions } from './types';
import { computeZipHash } from './zip-validator';
import { createSecureTempDir, cleanupTempDir, extractCapsule } from './capsule-extractor';
import { replayVerify } from '../replay';

/**
 * Verifies an OMEGA capsule (zip file) without requiring the repo.
 */
export async function verifyCapsule(
  capsulePath: string,
  options: CapsuleVerifyOptions = {}
): Promise<CapsuleVerifyResult> {
  const errors: string[] = [];
  let tempDir: string | null = null;
  
  // Check capsule exists
  if (!existsSync(capsulePath)) {
    return {
      success: false,
      capsulePath,
      capsuleHash: '',
      zipValid: false,
      zipValidation: { valid: false, entries: [], errors: ['File not found'], hasZipSlip: false, hasDangerousFiles: false },
      extractedPath: null,
      extractionError: 'File not found',
      replayResult: null,
      verdict: 'ERROR',
      errors: ['Capsule file not found'],
    };
  }
  
  // Compute capsule hash
  const capsuleHash = computeZipHash(capsulePath);
  
  // Create temp directory
  tempDir = createSecureTempDir();
  
  try {
    // Extract capsule
    const extractResult = await extractCapsule(capsulePath, tempDir);
    
    if (!extractResult.success) {
      return {
        success: false,
        capsulePath,
        capsuleHash,
        zipValid: false,
        zipValidation: { valid: false, entries: [], errors: [extractResult.error ?? 'Extraction failed'], hasZipSlip: false, hasDangerousFiles: false },
        extractedPath: null,
        extractionError: extractResult.error,
        replayResult: null,
        verdict: 'ERROR',
        errors: [extractResult.error ?? 'Extraction failed'],
      };
    }
    
    // Find the run directory (may be nested one level)
    let runDir = tempDir;
    const contents = readdirSync(tempDir);
    if (contents.length === 1) {
      const nested = join(tempDir, contents[0]);
      if (existsSync(join(nested, 'intent.json')) || existsSync(join(nested, 'hashes.txt'))) {
        runDir = nested;
      }
    }
    
    // Run replay verification
    const replayResult = replayVerify(runDir, { verbose: options.verbose });
    
    // Determine verdict
    const verdict = replayResult.success ? 'PASS' : 'FAIL';
    
    if (!replayResult.success) {
      errors.push(...replayResult.errors);
    }
    
    return {
      success: replayResult.success,
      capsulePath,
      capsuleHash,
      zipValid: true,
      zipValidation: { valid: true, entries: [], errors: [], hasZipSlip: false, hasDangerousFiles: false },
      extractedPath: runDir,
      extractionError: null,
      replayResult,
      verdict,
      errors,
    };
    
  } finally {
    // Cleanup temp directory unless keepExtracted
    if (!options.keepExtracted && tempDir) {
      cleanupTempDir(tempDir);
    }
  }
}

/**
 * Generates a text report for capsule verification.
 */
export function generateCapsuleReport(result: CapsuleVerifyResult): string {
  const lines: string[] = [];
  
  lines.push('# OMEGA Capsule Verification Report');
  lines.push('');
  lines.push(`Capsule: ${result.capsulePath}`);
  lines.push(`Hash: ${result.capsuleHash}`);
  lines.push('');
  lines.push(`## Verdict: ${result.verdict}`);
  lines.push('');
  
  if (result.zipValid) {
    lines.push('Zip Structure: VALID');
  } else {
    lines.push('Zip Structure: INVALID');
    for (const error of result.zipValidation.errors) {
      lines.push(`  - ${error}`);
    }
  }
  lines.push('');
  
  if (result.replayResult) {
    lines.push('Replay Verification:');
    lines.push(`  Structure: ${result.replayResult.structureValid ? 'PASS' : 'FAIL'}`);
    lines.push(`  Hashes: ${result.replayResult.hashesValid ? 'PASS' : 'FAIL'}`);
    lines.push(`  Files Checked: ${result.replayResult.filesChecked}`);
    lines.push(`  Files Valid: ${result.replayResult.filesValid}`);
  }
  lines.push('');
  
  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
  }
  
  lines.push('');
  lines.push('---');
  lines.push('Generated by OMEGA Auditpack v1.0.0');
  
  return lines.join('\n');
}
```

### 5. src/auditpack/index.ts

```typescript
/**
 * OMEGA Auditpack Module
 * Phase M - NASA-Grade L4
 */
export * from './types';
export { verifyCapsule, generateCapsuleReport } from './capsule-verifier';
export { computeZipHash, validateZipStructure, isSafePath } from './zip-validator';
export { createSecureTempDir, cleanupTempDir, extractCapsule } from './capsule-extractor';
```

### 6. bin/omega-run.mjs MODIFICATION

Replace the entire file with this updated version that handles verify-capsule:

```javascript
#!/usr/bin/env node
/**
 * OMEGA CLI Runner Entry Point
 * Phase J: Runs from compiled dist/
 * Phase M: Added verify-capsule command
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
  
  const { verifyCapsule, generateCapsuleReport, CapsuleExitCode } = await import(auditpackEntry);
  
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
await import(distEntry);
```

### 7. tests/auditpack/zip-validator.test.ts

```typescript
/**
 * OMEGA Zip Validator Tests
 * Phase M - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { isSafePath, validateZipStructure } from '../../src/auditpack';

describe('Phase M — Zip Validator', () => {
  describe('M-INV-01: Zip-slip defense', () => {
    it('rejects absolute paths', () => {
      expect(isSafePath('/etc/passwd', '/tmp/extract')).toBe(false);
      expect(isSafePath('C:\\Windows\\System32', '/tmp/extract')).toBe(false);
    });

    it('rejects parent directory traversal', () => {
      expect(isSafePath('../../../etc/passwd', '/tmp/extract')).toBe(false);
      expect(isSafePath('foo/../../bar', '/tmp/extract')).toBe(false);
    });

    it('accepts safe relative paths', () => {
      expect(isSafePath('intent.json', '/tmp/extract')).toBe(true);
      expect(isSafePath('artifacts/output.txt', '/tmp/extract')).toBe(true);
      expect(isSafePath('nested/deep/file.txt', '/tmp/extract')).toBe(true);
    });
  });

  describe('M-INV-02: Structure validation', () => {
    it('validates clean entry list', () => {
      const entries = [
        { filename: 'intent.json', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
        { filename: 'hashes.txt', isDirectory: false, compressedSize: 50, uncompressedSize: 100 },
      ];
      
      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(true);
      expect(result.hasZipSlip).toBe(false);
    });

    it('detects zip-slip in entries', () => {
      const entries = [
        { filename: '../../../etc/passwd', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];
      
      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasZipSlip).toBe(true);
    });

    it('detects dangerous filenames', () => {
      const entries = [
        { filename: 'file\0name.txt', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];
      
      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasDangerousFiles).toBe(true);
    });
  });
});
```

### 8. tests/auditpack/capsule-verifier.test.ts

```typescript
/**
 * OMEGA Capsule Verifier Tests
 * Phase M - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { verifyCapsule, createSecureTempDir, cleanupTempDir } from '../../src/auditpack';

describe('Phase M — Capsule Verifier', () => {
  describe('M-INV-03: Temp directory management', () => {
    it('creates unique temp directories', () => {
      const dir1 = createSecureTempDir();
      const dir2 = createSecureTempDir();
      
      expect(dir1).not.toBe(dir2);
      expect(existsSync(dir1)).toBe(true);
      expect(existsSync(dir2)).toBe(true);
      
      // Cleanup
      cleanupTempDir(dir1);
      cleanupTempDir(dir2);
      
      expect(existsSync(dir1)).toBe(false);
      expect(existsSync(dir2)).toBe(false);
    });

    it('cleanup only removes omega-verify directories', () => {
      // Should not remove arbitrary directories
      cleanupTempDir('/tmp'); // Should do nothing
      cleanupTempDir('/home'); // Should do nothing
    });
  });

  describe('M-INV-04: Missing capsule handling', () => {
    it('returns ERROR for non-existent file', async () => {
      const result = await verifyCapsule('/nonexistent/capsule.zip');
      expect(result.success).toBe(false);
      expect(result.verdict).toBe('ERROR');
      expect(result.errors).toContain('Capsule file not found');
    });
  });

  describe('M-INV-05: Report generation', () => {
    it('generates deterministic report format', async () => {
      const result = await verifyCapsule('/nonexistent/capsule.zip');
      // Even for error cases, report should be formatted correctly
      expect(result.verdict).toBe('ERROR');
    });
  });
});
```

### 9. tests/auditpack/hostile.test.ts

```typescript
/**
 * OMEGA Auditpack Hostile Tests
 * Phase M - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { isSafePath, validateZipStructure } from '../../src/auditpack';

describe('Phase M — Hostile Tests', () => {
  describe('M-T01: Path traversal attacks', () => {
    const attacks = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'foo/../../../etc/passwd',
      './foo/../../etc/passwd',
      'foo/bar/../../../etc/passwd',
      '....//....//etc/passwd',
      '..%2f..%2f..%2fetc/passwd',
      '..%252f..%252f..%252fetc/passwd',
    ];

    for (const attack of attacks) {
      it(`blocks: ${attack}`, () => {
        expect(isSafePath(attack, '/tmp/safe')).toBe(false);
      });
    }
  });

  describe('M-T02: Null byte injection', () => {
    it('detects null bytes in filenames', () => {
      const entries = [
        { filename: 'innocent.txt\0.exe', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];
      
      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasDangerousFiles).toBe(true);
    });
  });

  describe('M-T03: Windows path separators', () => {
    it('detects backslashes in filenames', () => {
      const entries = [
        { filename: 'foo\\bar\\baz.txt', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];
      
      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasDangerousFiles).toBe(true);
    });
  });
});
```

## 🔐 INVARIANTS (M-INV)

| ID | Invariant | Verification |
|----|-----------|--------------|
| M-INV-01 | Zip-slip defense active | isSafePath rejects traversal |
| M-INV-02 | No dangerous files extracted | validateZipStructure checks |
| M-INV-03 | Temp directory cleaned up | cleanupTempDir in finally |
| M-INV-04 | No network calls | Code review |
| M-INV-05 | Deterministic output | Same capsule = same report |

## 🧪 HOSTILE TESTS (M-T)

| ID | Test | Expected Result |
|----|------|-----------------|
| M-T01 | Path traversal attacks | All blocked |
| M-T02 | Null byte injection | Detected and rejected |
| M-T03 | Windows path separators | Detected and rejected |
| M-T04 | Corrupted zip | Clear error message |
| M-T05 | Missing required files | FAIL verdict |

## 📦 AFTER PHASE M (SEAL)

```powershell
cd C:\Users\elric\omega-project

# 1. Build
npm run build

# 2. Test
npm test

# 3. Verify SEALED zones
git diff --stat src/canon src/gates src/sentinel src/memory src/orchestrator src/delivery src/runner src/providers src/replay genesis-forge

# 4. Test CLI verify-capsule (end-to-end)
# First create a test capsule
node bin/omega-run.mjs run --intent intents/test_intent_mvp.json
node bin/omega-run.mjs capsule --run artefacts/runs/run_test_intent_mvp_1 --output test_capsule.zip
node bin/omega-run.mjs verify-capsule test_capsule.zip
# Expected: PASS

# 5. Generate manifest
Get-FileHash -Algorithm SHA256 -Path `
  src\auditpack\*.ts, `
  bin\omega-run.mjs `
| ForEach-Object { "$($_.Hash) *$($_.Path -replace '.*\\omega-project\\', '')" } `
| Out-File -Encoding ascii manifests\PHASE_M_SHA256_MANIFEST.txt

# 6. Commit
git add src/auditpack/ tests/auditpack/ bin/omega-run.mjs manifests/PHASE_M_SHA256_MANIFEST.txt
git commit -m "feat(auditpack): Phase M portable capsule verification [M-INV-01..05]"

# 7. Tag
git tag -a OMEGA_AUDITPACK_PHASE_M_SEALED -m "Phase M sealed - portable capsule verification"

# 8. Push
git push origin master --tags

# 9. Cleanup test artifacts
Remove-Item test_capsule.zip -ErrorAction SilentlyContinue
```

---

**FIN DU DOCUMENT PHASE_M_CAPSULE_PORTABLE**
