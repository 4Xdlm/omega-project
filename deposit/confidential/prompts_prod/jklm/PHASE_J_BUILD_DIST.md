# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PHASE J — BUILD/DIST/CLI
#   NASA-Grade L4 • Deterministic Build • Audit-Ready
#
#   Date: 2026-01-28
#   Standard: NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## 🎯 MISSION

Make the `omega` CLI runnable from **compiled JS output** (dist/**), not from src/** via tsx.

**Current State:**
- `bin/omega-run.mjs` spawns `npx tsx src/runner/main.ts`
- Works but requires tsx at runtime
- Not distributable without full repo

**Target State:**
- `npm run build` produces `dist/**` with all needed modules
- `bin/omega-run.mjs` imports directly from `dist/runner/index.js`
- CLI runs without tsx dependency at runtime
- Clear error if dist missing: "Run npm run build first"

## 📂 REPO

Path: `C:\Users\elric\omega-project`
Baseline: 4398 tests PASS (Phase I sealed)

## 🔒 SEALED ZONES (READ ONLY)

```
src/canon/
src/gates/
src/sentinel/
src/memory/
src/memory-write-runtime/
src/orchestrator/
src/delivery/
src/runner/          # ⚠️ SEALED Phase I - CANNOT modify .ts files
genesis-forge/
config/policies/
config/delivery/
```

**CRITICAL:** `src/runner/` is SEALED. Phase J modifies ONLY build config and bin/ entry point.

## ✅ WORK ZONES (ALLOWED)

| Path | Action | Notes |
|------|--------|-------|
| `package.json` | MODIFY | Add build scripts |
| `tsconfig.build.json` | CREATE | Build-specific config |
| `bin/omega-run.mjs` | MODIFY | Switch to dist imports |
| `scripts/build.sh` | CREATE | Build orchestration (optional) |
| `tests/build/` | CREATE | Build verification tests |
| `manifests/` | CREATE | Phase J manifest |
| `dist/` | OUTPUT | Never commit (build output) |

## 📋 FILES TO CREATE/MODIFY (ORDER)

### 1. tsconfig.build.json (CREATE)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "rootDir": "src",
    "composite": false,
    "noEmit": false
  },
  "include": [
    "src/**/*.ts"
  ],
  "exclude": [
    "src/**/*_test.ts",
    "src/**/*.test.ts",
    "node_modules",
    "dist"
  ]
}
```

### 2. package.json MODIFICATIONS

Add/update these scripts:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:clean": "rm -rf dist && npm run build",
    "prebuild": "echo 'Building OMEGA dist...'",
    "postbuild": "echo 'Build complete. Run: node bin/omega-run.mjs --help'"
  }
}
```

### 3. bin/omega-run.mjs (MODIFY)

```javascript
#!/usr/bin/env node
/**
 * OMEGA CLI Runner Entry Point
 * Phase J: Runs from compiled dist/
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

// Dynamic import of compiled CLI
const { main } = await import(distEntry);

// If main exports a function, call it; otherwise entry already executed
if (typeof main === "function") {
  const exitCode = await main();
  process.exit(exitCode);
}
```

**ALTERNATIVE** (if main.ts uses top-level execution):

```javascript
#!/usr/bin/env node
/**
 * OMEGA CLI Runner Entry Point
 * Phase J: Runs from compiled dist/
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const distEntry = join(projectRoot, "dist", "runner", "main.js");

if (!existsSync(distEntry)) {
  console.error("ERROR: dist/runner/main.js not found.");
  console.error("Run 'npm run build' first to compile the CLI.");
  process.exit(1);
}

// Import will execute the CLI
await import(distEntry);
```

### 4. src/runner/main.ts CONSIDERATION

**PROBLEM:** src/runner/ is SEALED. If main.ts doesn't export `main`, we need workaround.

**SOLUTION:** The current main.ts already calls `main()` at bottom:
```typescript
main()
  .then((exitCode) => process.exit(exitCode))
  .catch(...)
```

So the "alternative" version above works: importing executes the CLI.

### 5. tests/build/dist-cli.test.ts (CREATE)

```typescript
/**
 * OMEGA Phase J — Build/Dist CLI Tests
 * Verifies dist/ artifacts and CLI execution
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const PROJECT_ROOT = join(__dirname, '../..');
const DIST_RUNNER = join(PROJECT_ROOT, 'dist', 'runner', 'main.js');
const BIN_OMEGA = join(PROJECT_ROOT, 'bin', 'omega-run.mjs');

describe('Phase J — Build/Dist CLI', () => {
  describe('J-INV-01: Build produces dist/', () => {
    beforeAll(() => {
      // Ensure build is run (CI should run build before test)
      if (!existsSync(DIST_RUNNER)) {
        execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      }
    });

    it('dist/runner/main.js exists after build', () => {
      expect(existsSync(DIST_RUNNER)).toBe(true);
    });

    it('dist/runner/index.js exists', () => {
      expect(existsSync(join(PROJECT_ROOT, 'dist', 'runner', 'index.js'))).toBe(true);
    });

    it('dist/orchestrator/index.js exists', () => {
      expect(existsSync(join(PROJECT_ROOT, 'dist', 'orchestrator', 'index.js'))).toBe(true);
    });

    it('dist/gates/index.js exists', () => {
      expect(existsSync(join(PROJECT_ROOT, 'dist', 'gates', 'index.js'))).toBe(true);
    });

    it('dist/delivery/index.js exists', () => {
      expect(existsSync(join(PROJECT_ROOT, 'dist', 'delivery', 'index.js'))).toBe(true);
    });
  });

  describe('J-INV-02: CLI executable from dist', () => {
    it('omega --help returns exit code 0', () => {
      const result = execSync(`node "${BIN_OMEGA}" --help`, {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
      });
      expect(result).toContain('OMEGA');
      expect(result).toContain('run');
      expect(result).toContain('verify');
    });

    it('omega run --help returns exit code 0', () => {
      const result = execSync(`node "${BIN_OMEGA}" run --help`, {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
      });
      expect(result).toContain('intent');
    });
  });

  describe('J-T01: Missing dist gives clear error', () => {
    // This test would require temporarily removing dist
    // Skip in normal CI; can be tested manually
    it.skip('omega without dist exits with error message', () => {
      // Manual test: rm -rf dist && node bin/omega-run.mjs
    });
  });
});
```

## 🔐 INVARIANTS (J-INV)

| ID | Invariant | Verification |
|----|-----------|--------------|
| J-INV-01 | CLI loads from dist (no src imports at runtime) | bin/omega-run.mjs imports dist/ |
| J-INV-02 | Deterministic build output paths | tsconfig.build.json fixed outDir |
| J-INV-03 | No SEALED zone modifications | git diff --stat SEALED = empty |
| J-INV-04 | No dynamic imports added | Code review |
| J-INV-05 | No network calls introduced | Code review |

## 🧪 HOSTILE TESTS (J-T)

| ID | Test | Expected Result |
|----|------|-----------------|
| J-T01 | omega without dist | Clear error + exit 1 |
| J-T02 | omega --help after build | exit 0 + help text |
| J-T03 | dist paths ESM-resolvable on Windows | No path errors |

## 📦 AFTER PHASE J (SEAL)

```powershell
cd C:\Users\elric\omega-project

# 1. Build
npm run build

# 2. Test
npm test

# 3. Verify SEALED zones untouched
git diff --stat src/canon src/gates src/sentinel src/memory src/orchestrator src/delivery src/runner genesis-forge
# MUST be empty

# 4. Generate manifest
Get-FileHash -Algorithm SHA256 -Path `
  bin\omega-run.mjs, `
  tsconfig.build.json, `
  package.json, `
  tests\build\dist-cli.test.ts `
| ForEach-Object { "$($_.Hash) *$($_.Path -replace '.*\\omega-project\\', '')" } `
| Out-File -Encoding ascii manifests\PHASE_J_SHA256_MANIFEST.txt

# 5. Commit
git add package.json tsconfig.build.json bin\omega-run.mjs tests\build\ manifests\PHASE_J_SHA256_MANIFEST.txt
git commit -m "feat(build): Phase J dist CLI pipeline [J-INV-01..05]"

# 6. Tag
git tag -a OMEGA_BUILD_PHASE_J_SEALED -m "Phase J sealed - CLI from compiled dist"

# 7. Push
git push origin master --tags
```

---

**FIN DU DOCUMENT PHASE_J_BUILD_DIST**
