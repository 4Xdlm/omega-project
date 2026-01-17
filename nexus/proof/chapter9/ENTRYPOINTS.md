# OMEGA USER ENTRYPOINTS — DISCOVERY REPORT
**Chapter 9 — User Reality Test**
**Date**: 2026-01-17

---

## 1. DOCUMENTED ENTRYPOINTS (from README/GENESIS)

### Official Quick Start
```bash
git clone https://github.com/4Xdlm/omega-project.git
cd omega-project
npm install
npm test  # Expected: 1389 tests passed
```

**Result**: Tests pass (1389+). No analysis command documented.

---

## 2. CLI TOOLS DISCOVERED

### 2.1 omega (gateway/cli-runner)
**Package**: @omega/cli-runner v3.16.0
**Description**: "Command Line Interface for Emotional Analysis"
**Commands**: analyze, compare, export, batch, health, version, info

**STATUS**: NOT WORKING
- Missing ts-node dependency
- `npm run cli -- --help` fails with `ERR_MODULE_NOT_FOUND: Cannot find package 'ts-node'`
- No dist/ folder (not compiled)

**CRITICAL FINDING**: `analyze.ts:253-275` uses `simulateFileRead()` which returns HARDCODED test fixtures, not actual file contents:
```typescript
async function simulateFileRead(filePath: string): Promise<string> {
  if (filePath.includes('sample_text.txt')) {
    return `The happy warrior...`; // HARDCODED
  }
  // Default: return the path as content (for testing)
  return `Sample text from ${filePath}...`;
}
```

### 2.2 omega-gold (packages/gold-cli)
**Package**: @omega/gold-cli v0.1.0
**Description**: "Command-line certification runner"
**Commands**: certify, validate, report

**STATUS**: NOT TESTED (certification tool, not analysis)

### 2.3 omega-run (packages/headless-runner)
**Package**: @omega/headless-runner v0.1.0
**Description**: "CLI for deterministic plan execution"
**Commands**: run, verify

**STATUS**: NOT TESTED (plan execution, not text analysis)

### 2.4 omega-nexus (nexus/tooling)
**Package**: @omega/nexus-tooling v1.0.0
**Description**: "Coffre-fort technique"
**Commands**: init, seal, verify, atlas, export, status, hooks, backup, where

**STATUS**: WORKING
```
$ node scripts/cli.js status --dir "C:/Users/elric/omega-project"
Ledger: Entities: 5, Events: 9, Links: 2, Seals: 22
```

**Purpose**: Nexus management (seals, integrity), NOT text analysis

---

## 3. MODULES NOT EXPOSED TO USERS

### genome (FROZEN v1.2.0)
- Path: packages/genome/
- Purpose: Emotional DNA extraction
- 14 canonical emotions: anger, anticipation, disgust, envy, fear, guilt, hope, joy, love, pride, sadness, shame, surprise, trust
- **USER ACCESS**: NONE - No CLI or API exposed

### mycelium (FROZEN v1.0.0)
- Path: packages/mycelium/
- Purpose: Input validation
- **USER ACCESS**: NONE - Internal only

---

## 4. SUMMARY: WHAT IS NOT EXPOSED

| Feature | Status | Gap |
|---------|--------|-----|
| Analyze text file | NOT AVAILABLE | omega CLI not working, uses fake file read |
| Get emotional profile | NOT AVAILABLE | genome not exposed |
| Split text into chapters | NOT AVAILABLE | No segmentation CLI |
| Compare texts | NOT AVAILABLE | omega CLI not working |
| Export analysis | NOT AVAILABLE | omega CLI not working |

---

## 5. COMMAND EVIDENCE

### Attempted Commands
```powershell
# omega CLI (FAILED)
cd gateway/cli-runner
npm run cli -- --help
# Error: Cannot find package 'ts-node'

# omega-nexus CLI (SUCCESS - but not for analysis)
cd nexus/tooling
node scripts/cli.js status --dir "C:/Users/elric/omega-project"
# Shows: Ledger with 5 entities, 9 events, 22 seals
```

---

**VERDICT**: No user-facing CLI exists for text/novel emotional analysis.
