# CHANGELOG — OMEGA CORE

## [5.1.1] - 2026-01-18

### NCR-CLI-TESTS-001 — Fix 7 Pre-existing Test Failures

**Status:** ✅ COMPLETE — 1532/1532 tests PASS (100%)

**Fixes Applied:**

- **FIX-01:** Update command count test (7→8) — `schema` command was added in Chapter 23
- **FIX-02:** Fix `calculateSimilarity()` to return 1.0 for identical emotion arrays
- **FIX-03:** Correct required args test to use `compareCommand`
- **FIX-04:** Fix `analyzeText()` function signature in tests
- **FIX-05:** Implement verbose output display for test fixtures

**Context:**

These 7 test failures were pre-existing but hidden by vitest config issue (fixed in v5.1.0 CORR-03). They were discovered when `gateway/cli-runner/tests/` was included in test suite.

**Commits:**

- 264bec7 — fix(test): update command count 7→8
- cb02c05 — fix(compare): identical emotion arrays return similarity=1
- 65358e2 — fix(test): use compareCommand for required args test
- 418c463 — fix(test): correct analyzeText signature
- 54449a5 — fix(analyze): show verbose output for test fixtures
- 22d0a86 — docs(proof): test-fixes-v5.1.1 history

**Metrics:**

- Tests: 1525/1532 → 1532/1532 PASS (+7 fixed)
- Fixes: 5 atomic commits
- Duration: 17m 28s (Claude Code Full Auto)

**Proof Pack:** `nexus/proof/test-fixes-v5.1.1/`

---

## [5.1.0] - 2026-01-18

### Chapter 24 — Events Filter + CLI Audit

**Features:**

#### CHAPTER 24 — NDJSON Events Filter

- **NEW:** `--events <types>` option for NDJSON streaming
- **NEW:** Filter specific event types (e.g., `--events summary,stats`)
- **NEW:** Support `--events all` for no filtering (default behavior)
- Implementation: `filterNDJSONLines()` helper function
- 10 new tests for NDJSON streaming and event filtering

**Usage:**
```bash
# Filter to specific events only
omega analyze file.txt --stream --events summary,stats

# Stream all events (default)
omega analyze file.txt --stream --events all
```

#### AUDIT v5.1.0 — CLI Gateway Corrections

**CORR-01:** Usage string fixed
- Added `--events <types>` to analyze command usage documentation
- File: `gateway/cli-runner/src/cli/commands/analyze.ts`

**CORR-02:** Test coverage added
- 10 new tests for NDJSON streaming and `--events` filter
- File: `gateway/cli-runner/tests/commands/analyze.test.ts` (+166 lines)
- Coverage: streaming (4 tests) + filter (6 tests)

**CORR-03:** Vitest config fixed
- **CRITICAL:** Included `gateway/cli-runner/tests/` in vitest config
- **Impact:** Discovered +143 tests that were never running
- **Discovery:** Exposed 7 pre-existing test failures (fixed in v5.1.1)
- File: `vitest.config.ts`

**Commits:**

- a12fc33 — merge(chapter24): events filter to master
- 5f29d61 — fix(audit-v5.1.0): CLI gateway corrections - 3 fixes

**Metrics:**

- Tests: 1389/1389 → 1525/1532 (99.5%)
- New tests: +10 (CORR-02)
- Discovered tests: +143 (CORR-03)
- Pre-existing failures: 7 (to be fixed in v5.1.1)
- Duration: 11m 37s (Claude Code Full Auto)

**Proof Pack:** `nexus/proof/audit-fixes-v5.1.0/`

---

## [5.0.1] - 2026-01-XX

### Hygiene Corrections

**Fixes:**

- Fixed `.gitignore` rules for `.claude/` directory
- Untracked `.claude/settings.local.json` (was causing merge conflicts)
- Added ignore rule for `*.bak` files
- Cleaned up backup artifacts from repository

**Motivation:**

Prevent Git conflicts and pollution from local configuration files and backup files.

---

## [5.0.0] - 2026-01-XX

### Chapter 23 — JSON Schema Export

**Features:**

- **NEW:** `omega schema` command to export NDJSON JSON Schema
- **NEW:** Schema version v1.2.0 with `tagExact` support
- Export format: JSON Schema 2020-12 specification
- 12 NDJSON event types documented and validated

**Breaking Changes:** None (additive only)

---

**Note:** For complete session history including all proofs and certifications, see `SESSION_SAVE_2026-01-18.md`


# Changelog

## v5.0.0 - 2026-01-18

### Consolidation release
- Post-v4.13.0 cleanup: ignore local settings; stop tracking .claude/settings.local.json
- Stability: 1389/1389 tests passing

### Recent changes (last 20 commits)

- 1ad5371 merge: corrections (CORR-01 local settings ignore)
- 52f4a22 fix(CORR-01b): stop tracking .claude/settings.local.json (keep local)
- 01c878c fix(CORR-01): ignore local settings (settings.local.* / .claude settings.local.*)
- f24cd64 feat(chapter23): schema v1.2.0 + omega schema command + test fix
- 869d706 chore(milestone): add v4.12.0-ndjson-schema-v1.1 tag info + hashes
- b69c588 feat(chapter22): NDJSON schema v1.1.0 (headCommit + tagRef; remove capabilityCommit)
- b9ba067 chore(milestone): add v4.11.0-ndjson-schema tag info + hashes
- 06ff362 fix(chapter21): schema capabilityCommit uses runtime HEAD (git) fallback env
- 136c0bc feat(chapter21): NDJSON schema event v1.0.0 (stream contract)
- adde194 chore(milestone): add v4.10.0-progress-stats-excerpt tag info + hashes
- 20c699a chore(chapter20): proof + NDJSON sample (post-commit verification)
- 98f91b8 feat(chapter20): NDJSON progress + stats + excerpt events (stream-only)
- aa26f05 feat(bin): add omega-pipe.mjs for pipeline-safe CLI entry point
- 80dd7ae fix(runner): use process.stdout.write for reliable pipe behavior
- a09a221 chore(milestone): add v4.9.0-stdin-pipe tag info + hashes
- 303d4bf feat(chapter19): add --stdin option for Unix-style piping
- 8781968 chore(milestone): add v4.8.0-stream-both-artifacts tag info + hashes
- 0bc6ae9 feat(chapter18): stream NDJSON supports --output both via --artifacts dir
- b0bc6c7 chore(milestone): add v4.7.0-stream-ndjson tag info + hashes
- 29f6916 docs(chapter17): add PROOF.txt + RUNBOOK.md
