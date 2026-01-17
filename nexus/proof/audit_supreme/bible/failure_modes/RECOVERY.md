# OMEGA Recovery Procedures

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

This document provides step-by-step recovery procedures for common failure scenarios.

---

## Recovery Procedures

### REC-01: Failed Validation Recovery

**Scenario:** User input is rejected by mycelium

**Steps:**
1. Examine rejection code and message
2. Based on code:
   - `INVALID_UTF8`: Re-encode input as UTF-8
   - `BINARY_DETECTED`: Extract text from binary format
   - `TEXT_TOO_LONG`: Split input into smaller chunks
   - `TEXT_TOO_SHORT`: Combine with additional text
   - `HTML_DETECTED`: Strip HTML tags, extract text
   - `JSON_DETECTED`: Parse JSON, extract string values
3. Retry validation
4. If still failing, examine input more closely

**Commands:**
```typescript
// Check rejection reason
const result = validate(input);
if (!result.accepted) {
  console.log('Code:', result.rejection.code);
  console.log('Message:', result.rejection.message);
}
```

---

### REC-02: Determinism Failure Recovery

**Scenario:** Same input produces different output

**Steps:**
1. Verify input is byte-for-byte identical
   - Check line endings (CRLF vs LF)
   - Check encoding (UTF-8)
2. Verify seed is consistent
3. Verify OMEGA version is consistent
4. Check for uninjected dependencies:
   - Time: `Date.now()` calls
   - Random: `Math.random()` calls
5. Run canonical serialization comparison
6. If genome differs, check float quantization

**Commands:**
```powershell
# Compare inputs
$hash1 = (Get-FileHash -Algorithm SHA256 input1.txt).Hash
$hash2 = (Get-FileHash -Algorithm SHA256 input2.txt).Hash
if ($hash1 -ne $hash2) { Write-Output "Inputs differ" }

# Compare outputs
$genome1Hash = (Get-FileHash -Algorithm SHA256 genome1.json).Hash
$genome2Hash = (Get-FileHash -Algorithm SHA256 genome2.json).Hash
```

---

### REC-03: Oracle Failure Recovery

**Scenario:** Oracle query fails

**Steps by Error Code:**

**AUTH_FAILED:**
1. Verify API key is set in environment
2. Check API key is valid (not expired)
3. Verify correct backend is configured
4. Test with mock backend to isolate

**RATE_LIMITED:**
1. Wait for rate limit window to reset
2. Implement exponential backoff
3. Enable caching to reduce calls
4. Consider upgrading API tier

**CONTEXT_EXCEEDED:**
1. Reduce input size
2. Summarize input before sending
3. Use model with larger context
4. Split into multiple queries

**NETWORK_ERROR:**
1. Check internet connection
2. Verify service status
3. Retry with backoff
4. Fall back to alternative backend

**Commands:**
```typescript
try {
  const response = await oracle.query(prompt);
} catch (error) {
  if (error instanceof OracleError) {
    switch (error.code) {
      case 'AUTH_FAILED':
        // Check API key
        break;
      case 'RATE_LIMITED':
        // Implement backoff
        await sleep(error.retryAfter || 60000);
        break;
      case 'NETWORK_ERROR':
        // Retry or fallback
        break;
    }
  }
}
```

---

### REC-04: Test Failure Recovery

**Scenario:** Tests fail during certification

**Steps:**
1. Identify failing tests from log
2. Run failing tests in isolation
3. Examine test output and assertion messages
4. Check for:
   - Environment differences
   - Missing dependencies
   - Stale test data
   - Non-deterministic behavior
5. Fix underlying issue
6. Re-run full test suite
7. Generate new evidence pack

**Commands:**
```powershell
# Run specific test file
npm test -- --testNamePattern="failing test name"

# Run with verbose output
npm test -- --reporter=verbose

# Clean and reinstall
Remove-Item -Recurse -Force node_modules
npm install
npm test
```

---

### REC-05: Hash Mismatch Recovery

**Scenario:** Bundle verification fails with hash mismatch

**Steps:**
1. Identify mismatched file(s)
2. Check if file was modified after bundling
3. Check for line ending issues (CRLF/LF)
4. Check for encoding issues
5. Regenerate bundle from source
6. Verify new bundle

**Commands:**
```powershell
# Check file hash
$actualHash = (Get-FileHash -Algorithm SHA256 file.ts).Hash
$expectedHash = "abc123..."
if ($actualHash -ne $expectedHash) {
  Write-Output "Mismatch: $actualHash vs $expectedHash"
}

# Regenerate bundle
npm run bundle
npm run verify
```

---

### REC-06: Frozen Module Violation Recovery

**Scenario:** Attempt to modify frozen module

**Steps:**
1. STOP immediately
2. Do NOT commit changes
3. Identify what change was needed
4. Determine alternatives:
   - Create extension module
   - Create wrapper function
   - Open NCR for new version
5. Revert changes to frozen module
6. Implement via alternative approach

**Commands:**
```powershell
# Revert changes to frozen module
git checkout -- packages/genome/
git checkout -- packages/mycelium/

# Verify frozen modules unchanged
git diff packages/genome/
git diff packages/mycelium/
```

---

### REC-07: Corrupted State Recovery

**Scenario:** Node modules or build artifacts corrupted

**Steps:**
1. Clean all generated files
2. Remove node_modules
3. Clear npm cache
4. Reinstall dependencies
5. Rebuild
6. Run tests

**Commands:**
```powershell
# Full clean
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
Remove-Item -Recurse -Force .turbo
Remove-Item -Force package-lock.json

# Reinstall
npm cache clean --force
npm install

# Verify
npm run build
npm test
```

---

### REC-08: Git State Recovery

**Scenario:** Git repository in bad state

**Steps:**
1. Check current status
2. Identify uncommitted changes
3. Stash or discard as appropriate
4. Reset to known good state
5. Verify HEAD is correct

**Commands:**
```powershell
# Check status
git status
git log -5 --oneline

# Stash changes if needed
git stash

# Reset to last known good
git reset --hard origin/master

# Restore stash if needed
git stash pop
```

---

## Emergency Procedures

### EMERG-01: Complete Repository Recovery

**When:** All other recovery fails

**Steps:**
1. Clone fresh repository
2. Copy over local changes (if any)
3. Install dependencies
4. Run tests to verify
5. Resume work

```powershell
# Clone fresh
git clone https://github.com/4Xdlm/omega-project.git omega-fresh
cd omega-fresh
npm install
npm test
```

### EMERG-02: Archive Restoration

**When:** Need to restore to specific phase

**Steps:**
1. Locate archive in `archives/`
2. Verify hash
3. Extract to new location
4. Replace corrupted files
5. Reinstall dependencies

```powershell
# Find archive
Get-ChildItem archives/ -Filter "*.zip"

# Verify hash
$expected = "..."
$actual = (Get-FileHash archives/OMEGA_PHASE155_*.zip).Hash
if ($expected -eq $actual) { Write-Output "Valid" }

# Extract
Expand-Archive -Path archives/OMEGA_PHASE155_*.zip -DestinationPath restore/
```

---

## Escalation Path

| Severity | Time Limit | Escalate To |
|----------|------------|-------------|
| LOW | 4 hours | Senior Developer |
| MEDIUM | 2 hours | Tech Lead |
| HIGH | 30 minutes | Architect |
| CRITICAL | Immediate | Architect + Stakeholders |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
