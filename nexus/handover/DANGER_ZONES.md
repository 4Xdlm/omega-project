# OMEGA DANGER ZONES

## Purpose

This document maps areas of the codebase that require extreme caution. Violations here can invalidate certification.

---

## LEVEL 1: FORBIDDEN (Never Touch)

### FROZEN Modules

| Path | Status | Consequence if Modified |
|------|--------|------------------------|
| `packages/genome/` | FROZEN v1.2.0 | Certification VOID |
| `packages/mycelium/` | FROZEN v1.0.0 | Certification VOID |

**Why**: These modules passed certification. Any change invalidates all proofs.

**Verification**:
```bash
git diff v3.159.0-CHAPTER-5-CERTIFIED -- packages/genome/
git diff v3.159.0-CHAPTER-5-CERTIFIED -- packages/mycelium/
# MUST be empty
```

### Core Invariants

| File | Invariant | Risk |
|------|-----------|------|
| `packages/sentinel/foundation/` | Axioms | System corruption |
| `packages/sentinel/crystal/` | Crystallization | Trust chain break |

---

## LEVEL 2: RESTRICTED (RFC Required)

### Public APIs

| Module | Exports | Risk if Changed |
|--------|---------|-----------------|
| genome | `analyze()`, `fingerprint()` | Breaking change |
| sentinel | `verify()`, `certify()` | Trust violation |
| search | `SearchEngine` | Consumer breakage |

**Rule**: API changes require:
1. RFC document
2. Architect approval
3. Migration notes
4. Version bump

### Configuration Files

| File | Risk |
|------|------|
| `vitest.config.ts` | Tests may fail silently |
| `tsconfig.json` | Build breakage |
| `package.json` (dependencies) | Version conflicts |

---

## LEVEL 3: CAUTION (Document Changes)

### Test Files

| Pattern | Risk |
|---------|------|
| `*.test.ts` | False positives/negatives |
| `*.spec.ts` | Coverage gaps |

**Rule**: Test changes must:
1. Not reduce coverage
2. Not weaken assertions
3. Be documented in commit

### Documentation with Code Impact

| File | Risk |
|------|------|
| `CLAUDE.md` | AI behavior change |
| `STATE_OF_TRUTH.md` | Authority confusion |

---

## Anti-Patterns to Avoid

### In FROZEN Modules

| Anti-Pattern | Why Dangerous |
|--------------|---------------|
| "Just a typo fix" | Opens door to more |
| "Performance improvement" | Behavior change risk |
| "Better comments" | Diff pollution |
| "Modernization" | Certification loss |

### In Public APIs

| Anti-Pattern | Why Dangerous |
|--------------|---------------|
| Adding optional params | Signature change |
| Changing return type | Consumer breakage |
| Renaming for clarity | Breaking change |
| "Deprecation" without plan | Confusion |

### In Tests

| Anti-Pattern | Why Dangerous |
|--------------|---------------|
| Skipping flaky tests | Hidden failures |
| Loosening assertions | False confidence |
| Mocking too much | Reality gap |
| Deleting "old" tests | Coverage loss |

---

## Escalation Matrix

| Situation | Action |
|-----------|--------|
| Want to modify FROZEN | STOP. Open NCR. Wait for Architect. |
| API change needed | Write RFC. Get approval. Then implement. |
| Test failing unexpectedly | Investigate root cause. Never skip. |
| Uncertainty about impact | Ask before acting. |

---

## Emergency Rollback

If a dangerous change was made:

```bash
# 1. Identify last known good state
git log --oneline | head -20

# 2. Revert to certified tag
git checkout v3.161.0-CHAPTER-7-ARCHIVE

# 3. Create fix branch
git checkout -b fix/rollback-dangerous-change

# 4. Cherry-pick only safe commits
git cherry-pick <safe-commit-hash>

# 5. Verify
npm test  # Must pass 1389
```

---

## Summary

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   LEVEL 1 (FORBIDDEN)  →  genome/, mycelium/, sentinel/foundation/            ║
║   LEVEL 2 (RFC NEEDED) →  Public APIs, config files                           ║
║   LEVEL 3 (DOCUMENT)   →  Tests, docs with code impact                        ║
║                                                                               ║
║   When in doubt: STOP and ASK                                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
