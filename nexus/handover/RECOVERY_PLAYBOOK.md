# OMEGA RECOVERY PLAYBOOK

## Purpose

This playbook provides step-by-step procedures for recovering from common failure scenarios.

---

## Scenario 1: Tests Failing After Clone

### Symptoms
- `npm test` shows failures
- Tests passed in CI but fail locally

### Diagnosis
```bash
# Check Node version
node --version  # Must be 18+

# Check for uncommitted changes
git status

# Verify on correct tag
git describe --tags
```

### Recovery
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install

# Verify
npm test
```

### If Still Failing
```bash
# Reset to known good state
git checkout v3.161.0-CHAPTER-7-ARCHIVE
npm install
npm test  # Must show 1389 passed
```

---

## Scenario 2: FROZEN Module Accidentally Modified

### Symptoms
- Diff shows changes in `packages/genome/` or `packages/mycelium/`
- PR rejected by guardrails

### Diagnosis
```bash
# Check what changed
git diff HEAD -- packages/genome/
git diff HEAD -- packages/mycelium/
```

### Recovery
```bash
# Restore FROZEN modules from certified tag
git checkout v3.159.0-CHAPTER-5-CERTIFIED -- packages/genome/
git checkout v3.159.0-CHAPTER-5-CERTIFIED -- packages/mycelium/

# Verify restoration
git diff v3.159.0-CHAPTER-5-CERTIFIED -- packages/genome/
# Must be empty

# Commit fix
git add packages/genome/ packages/mycelium/
git commit -m "fix: restore FROZEN modules to certified state"
```

---

## Scenario 3: Archive Hash Mismatch

### Symptoms
- Regenerated archive has different SHA-256
- Integrity verification fails

### Diagnosis
```bash
# Regenerate archive
git checkout v3.160.0-CHAPTER-6-GENESIS
git archive --format=zip --prefix=omega-v3.160.0/ -o test-archive.zip HEAD

# Calculate hash
sha256sum test-archive.zip
# Compare with: 35522a4fba5501f700927b44ac2ca4d30d4c12174c02c1df965dff3834485605
```

### Recovery
If hash differs:
1. **Check git version** - Different git versions may produce different archives
2. **Check exact commit** - Must be exactly `v3.160.0-CHAPTER-6-GENESIS`
3. **Check line endings** - Windows/Linux differences

```bash
# Force exact checkout
git checkout v3.160.0-CHAPTER-6-GENESIS
git status  # Must be clean

# Regenerate with explicit settings
git -c core.autocrlf=false archive --format=zip --prefix=omega-v3.160.0/ -o omega-v3.160.0.zip HEAD
```

---

## Scenario 4: Merge Conflict in Critical File

### Symptoms
- Conflict in `CLAUDE.md`, `STATE_OF_TRUTH.md`, or config files
- Unsure which version is correct

### Recovery
```bash
# Always prefer the certified version
git checkout v3.161.0-CHAPTER-7-ARCHIVE -- CLAUDE.md

# For STATE_OF_TRUTH, check which is newer
git log --oneline nexus/proof/chapter6/STATE_OF_TRUTH.md

# If unsure, abort and ask
git merge --abort
```

### Rule
**Never manually resolve conflicts in authority documents.** Use the latest certified version.

---

## Scenario 5: Unknown State After Interrupted Work

### Symptoms
- Unclear what was changed
- Tests may or may not pass
- Work was interrupted (crash, timeout, etc.)

### Diagnosis
```bash
# See all changes
git status
git diff

# See recent commits
git log --oneline -10

# Check test state
npm test
```

### Recovery
```bash
# Option A: If changes are valuable
git stash
git checkout v3.161.0-CHAPTER-7-ARCHIVE
npm test  # Verify clean state
git stash pop  # Reapply changes carefully

# Option B: If changes are expendable
git reset --hard v3.161.0-CHAPTER-7-ARCHIVE
npm install
npm test
```

---

## Scenario 6: Dependency Vulnerability Alert

### Symptoms
- npm audit shows vulnerabilities
- Security scanner flags issues

### Diagnosis
```bash
npm audit
```

### Recovery
```bash
# Check if fix is safe
npm audit fix --dry-run

# If changes are minor (patch versions)
npm audit fix

# Run tests immediately
npm test  # Must still pass 1389

# If tests fail, revert
git checkout package-lock.json
npm install
```

### Rule
**Never auto-fix major version bumps.** These require RFC and testing.

---

## Scenario 7: CI/CD Pipeline Failure

### Symptoms
- GitHub Actions failing
- Tests pass locally but fail in CI

### Diagnosis
1. Check CI logs for exact error
2. Compare Node versions (local vs CI)
3. Check for environment-specific issues

### Recovery
```bash
# Reproduce CI environment locally
node --version  # Match CI version

# Clean state
rm -rf node_modules
npm ci  # Use ci instead of install

# Run tests with same config as CI
npm test
```

---

## Emergency Contacts

| Situation | Contact |
|-----------|---------|
| Certification question | Architect (Francky) |
| Technical issue | Open GitHub Issue |
| Security vulnerability | Architect immediately |

---

## Recovery Verification Checklist

After any recovery:

- [ ] `npm test` shows 1389 passed
- [ ] `git diff v3.159.0-CHAPTER-5-CERTIFIED -- packages/genome/` is empty
- [ ] `git diff v3.159.0-CHAPTER-5-CERTIFIED -- packages/mycelium/` is empty
- [ ] `git status` is clean (or only intended changes)
- [ ] STATE_OF_TRUTH.md is readable and current

---

## Summary

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   When in doubt: RESET TO CERTIFIED TAG                                       ║
║                                                                               ║
║   git checkout v3.161.0-CHAPTER-7-ARCHIVE                                     ║
║   npm install                                                                 ║
║   npm test                                                                    ║
║                                                                               ║
║   This is ALWAYS safe.                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
